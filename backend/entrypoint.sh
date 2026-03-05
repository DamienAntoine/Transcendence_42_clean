#!/usr/bin/env sh
set -e
cd /app

if [ ! -f .env ]; then
  echo "[backend] Generating .env file with JWT_SECRET..."
  chmod +x generate-env.sh
  ./generate-env.sh
fi


if [ ! -d node_modules ] || [ ! -f node_modules/.installed ]; then
  echo "[backend] Installing dependencies..."
  npm install

  touch node_modules/.installed
fi

exec npx nodemon --watch src --ext ts --exec "npx ts-node src/index.ts"
