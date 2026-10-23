#!/usr/bin/env bash
# Startet einen lokalen, Supabase-kompatiblen Test-Stack ohne Docker:
# PostgreSQL (vorhanden) + GoTrue (Auth) + PostgREST + SMTP-Sink + stripe-mock.
# Jede Ausführung beginnt mit einer frischen Datenbank. Nur für Tests!
#
# Voraussetzungen: psql, curl, node, python3 mit aiosmtpd (pip install aiosmtpd)
# E2E_PG_URL: Superuser-Verbindung, z.B. postgres://postgres:postgres@127.0.0.1:5432/postgres
set -euo pipefail
STACK="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$STACK/../.." && pwd)"
RUN="$STACK/../.run"
mkdir -p "$RUN/bin" "$RUN/mail/tmp" "$RUN/mail/new" "$RUN/mail/cur" "$RUN/logs"
RUN="$(cd "$RUN" && pwd)"

PG_URL="${E2E_PG_URL:-postgres://postgres:postgres@127.0.0.1:5432/postgres}"
DB="${E2E_DB:-flp_e2e}"
APP_URL="${E2E_BASE_URL:-http://localhost:3100}"
JWT_SECRET="e2e-only-jwt-secret-with-at-least-32-characters"
read -r PG_HOST PG_PORT DB_URL < <(node -e '
  const u = new URL(process.argv[1]); const host = u.hostname, port = u.port || "5432";
  u.pathname = "/" + process.argv[2]; console.log(host, port, u.toString());' "$PG_URL" "$DB")

# --- Binärdateien (feste Versionen, SHA-256 geprüft) ----------------------------
fetch() { # name url sha256 archive-member
  local name=$1 url=$2 sha=$3
  [ -x "$RUN/bin/$name" ] && return
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/archive" "$url"
  echo "$sha  $tmp/archive" | sha256sum -c - >/dev/null
  tar -xf "$tmp/archive" -C "$tmp"
  mv "$tmp/$4" "$RUN/bin/$name"
  rm -rf "$tmp"
}
fetch postgrest https://github.com/PostgREST/postgrest/releases/download/v12.2.12/postgrest-v12.2.12-linux-static-x86-64.tar.xz \
  5de4092f1719da3353c40bf96c8dec6913f2254a7cd0b61cc05f233153b557d5 postgrest
fetch gotrue https://github.com/supabase/auth/releases/download/v2.177.0/auth-v2.177.0-x86.tar.gz \
  fa48b1c1df11576c87b23e7f189ac6f01cd95265244eed7ff8a4e647858a0428 auth
fetch stripe-mock https://github.com/stripe/stripe-mock/releases/download/v0.197.0/stripe-mock_0.197.0_linux_amd64.tar.gz \
  9e0a74e9d5fbab3d94ab0f32ab62f48e3f541a4c4b4e4ed27b156ac0e4e831cc stripe-mock
if [ ! -d "$RUN/bin/gotrue-migrations" ]; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/a" https://github.com/supabase/auth/releases/download/v2.177.0/auth-v2.177.0-x86.tar.gz
  echo "fa48b1c1df11576c87b23e7f189ac6f01cd95265244eed7ff8a4e647858a0428  $tmp/a" | sha256sum -c - >/dev/null
  tar -xzf "$tmp/a" -C "$tmp" && mv "$tmp/migrations" "$RUN/bin/gotrue-migrations" && rm -rf "$tmp"
fi

# --- Frischer Start -------------------------------------------------------------
"$STACK/down.sh"
sleep 1
PSQL=(psql -X -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" "$PG_URL" -c "drop database if exists $DB with (force)" -c "create database $DB"
"${PSQL[@]}" "$DB_URL" -f "$STACK/setup.sql" >/dev/null

start() { # name command...
  local name=$1; shift
  nohup "$@" >"$RUN/logs/$name.log" 2>&1 &
  echo $! >>"$RUN/pids"
}
wait_for() { # url
  for _ in $(seq 1 60); do curl -fs "$1" >/dev/null 2>&1 && return 0; sleep 0.5; done
  echo "Dienst nicht erreichbar: $1" >&2; return 1
}

start smtp python3 -m aiosmtpd -n -l 127.0.0.1:2525 -c aiosmtpd.handlers.Mailbox "$RUN/mail"
start proxy node "$STACK/proxy.mjs"
(
  cd "$RUN/bin"
  ln -sfn gotrue-migrations migrations
  GOTRUE_DB_DRIVER=postgres \
  DATABASE_URL="postgres://supabase_auth_admin:authadmin@$PG_HOST:$PG_PORT/$DB?search_path=auth" \
  GOTRUE_JWT_SECRET="$JWT_SECRET" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated GOTRUE_JWT_ADMIN_ROLES=service_role GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated \
  GOTRUE_SITE_URL="$APP_URL" GOTRUE_URI_ALLOW_LIST="$APP_URL/**" \
  API_EXTERNAL_URL=http://localhost:54321/auth/v1 GOTRUE_API_HOST=127.0.0.1 PORT=9999 \
  GOTRUE_SMTP_HOST=127.0.0.1 GOTRUE_SMTP_PORT=2525 GOTRUE_SMTP_ADMIN_EMAIL=noreply@flp.test GOTRUE_SMTP_SENDER_NAME=FLP \
  GOTRUE_MAILER_AUTOCONFIRM=false GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 \
  GOTRUE_PASSWORD_MIN_LENGTH=10 \
  nohup ./gotrue >"$RUN/logs/gotrue.log" 2>&1 &
  echo $! >>"$RUN/pids"
)
wait_for http://127.0.0.1:9999/health

"${PSQL[@]}" "$DB_URL" -f "$STACK/storage-stub.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" "$DB_URL" -f "$f" >/dev/null; done

cat >"$RUN/postgrest.conf" <<CONF
db-uri = "postgres://authenticator:authpw@$PG_HOST:$PG_PORT/$DB"
db-schemas = "public"
db-anon-role = "anon"
server-port = 3001
server-host = "127.0.0.1"
jwt-secret = "$JWT_SECRET"
CONF
start postgrest "$RUN/bin/postgrest" "$RUN/postgrest.conf"
start stripe-mock "$RUN/bin/stripe-mock" -http-port 12111 -https-port 12112
wait_for http://127.0.0.1:3001/
wait_for http://localhost:54321/auth/v1/health

KEYS="$(node "$STACK/keys.mjs" "$JWT_SECRET")"
ANON=$(echo "$KEYS" | sed -n 's/^E2E_ANON_KEY=//p')
SERVICE=$(echo "$KEYS" | sed -n 's/^E2E_SERVICE_KEY=//p')
cat >"$RUN/e2e.env" <<ENV
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON
SUPABASE_SECRET_KEY=$SERVICE
NEXT_PUBLIC_SITE_URL=$APP_URL
STRIPE_SECRET_KEY=sk_test_e2e
STRIPE_WEBHOOK_SECRET=whsec_e2e_local_secret
STRIPE_API_BASE=http://localhost:12111
E2E_BASE_URL=$APP_URL
E2E_DB_URL=$DB_URL
E2E_MAILDIR=$RUN/mail/new
E2E_ANON_KEY=$ANON
ENV
echo "E2E-Stack bereit · Konfiguration: $RUN/e2e.env"
