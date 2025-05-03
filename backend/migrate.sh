#!/bin/bash

# migrate.sh — Applies a raw SQL migration and syncs Prisma
# Usage: ./migrate.sh database/migrations/2025-05-02-migration.sql

set -e

# Load environment variables from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ .env file not found in root directory."
  exit 1
fi

if [ -z "$1" ]; then
  echo "❌ Please provide a SQL migration file (e.g., ./migrate.sh database/migrations/2025-05-02-add-table.sql)"
  exit 1
fi

MIGRATION_FILE=$1
export PGPASSWORD=$DB_PASSWORD

echo "🔍 Applying SQL migration: $MIGRATION_FILE"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"

echo "📥 Pulling latest schema into Prisma"
npx prisma db pull

echo "⚙️ Generating Prisma client"
npx prisma generate

echo "✅ Migration and Prisma sync complete."
