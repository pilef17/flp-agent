#!/usr/bin/env bash
# Stoppt alle Prozesse des E2E-Stacks.
RUN="$(cd "$(dirname "$0")/.." && pwd)/.run"
if [ -f "$RUN/pids" ]; then
  while read -r pid; do kill "$pid" 2>/dev/null || true; done < "$RUN/pids"
  rm -f "$RUN/pids"
fi
