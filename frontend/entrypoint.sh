#!/usr/bin/env sh
set -e
cd /app

if [ ! -d node_modules ] || [ ! -f node_modules/.installed ]; then
  echo "[frontend] Installing dependencies..."
  npm ci

  touch node_modules/.installed
fi

exec npm run dev -- --host 0.0.0.0
