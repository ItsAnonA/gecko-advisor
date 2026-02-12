#!/bin/sh
set -e

echo "Running Prisma migrations..."
node ./node_modules/prisma/build/index.js migrate deploy --schema=/app/infra/prisma/schema.prisma

echo "Starting backend server..."
exec node dist/apps/backend/src/index.js
