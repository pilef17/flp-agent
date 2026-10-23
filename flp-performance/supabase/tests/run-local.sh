#!/usr/bin/env bash
# Führt Migrationen + RLS-Tests gegen eine frische lokale PostgreSQL-Datenbank aus.
# Voraussetzung: psql und Zugriff auf einen PostgreSQL-Server (PGHOST/PGUSER etc.).
# Gegen Supabase lokal (Docker) stattdessen: supabase db reset && psql ... -f rls_test.sql
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${FLP_TEST_DB:-flp_rls_test}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -At)
"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB"
"${PSQL[@]}" -d "$DB" -f tests/supabase_stub.sql
for f in migrations/*.sql; do
  "${PSQL[@]}" -d "$DB" -f "$f"
done
"${PSQL[@]}" -d "$DB" -f tests/rls_test.sql
