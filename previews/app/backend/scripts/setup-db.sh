#!/usr/bin/env bash
# scripts/setup-db.sh — one-shot first-time Postgres setup via Neon.
#
# Requires:
#   - NEON_API_KEY  (from Neon Console → Settings → API keys)
#   - VERCEL_TOKEN  (from Vercel Dashboard → Settings → Tokens, optional)
#
# Does:
#   1. Creates a Neon project + main branch DB
#   2. Prints the DATABASE_URL
#   3. Optionally sets it as a Vercel env var
#   4. Runs `prisma db push` to materialize the schema

set -euo pipefail

if [[ -z "${NEON_API_KEY:-}" ]]; then
  echo "ERROR: NEON_API_KEY env var required"
  echo "Get one at https://console.neon.tech → Account settings → API keys"
  exit 1
fi

PROJECT_NAME="${1:-core-prod}"
echo "→ Creating Neon project: $PROJECT_NAME"

RESPONSE=$(curl -s -X POST 'https://console.neon.tech/api/v2/projects' \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d "{\"project\": {\"name\": \"${PROJECT_NAME}\", \"pg_version\": 16, \"region_id\": \"aws-ap-southeast-2\"}}")

CONNECTION_URI=$(echo "$RESPONSE" | grep -o '"connection_uris":\[{"connection_uri":"[^"]*"' | head -1 | sed 's/.*"connection_uri":"//' | sed 's/"$//')
if [[ -z "$CONNECTION_URI" ]]; then
  echo "ERROR: Failed to create Neon project"
  echo "$RESPONSE"
  exit 1
fi

echo "✓ Neon project created"
echo "DATABASE_URL=$CONNECTION_URI"

# Optionally push to Vercel
if [[ -n "${VERCEL_TOKEN:-}" && -n "${VERCEL_PROJECT_ID:-}" ]]; then
  echo "→ Setting DATABASE_URL in Vercel project $VERCEL_PROJECT_ID"
  curl -s -X POST "https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"DATABASE_URL\",\"value\":\"${CONNECTION_URI}\",\"target\":[\"production\",\"preview\"],\"type\":\"encrypted\"}" > /dev/null
  echo "✓ Set in Vercel"
fi

# Materialize schema
echo "→ Running prisma db push"
DATABASE_URL="$CONNECTION_URI" pnpm prisma db push

echo ""
echo "✓ Setup complete. Save the DATABASE_URL above to your password manager."
echo "  Next: pnpm tsx scripts/setup-owner.ts (or POST /api/setup/owner after deploy)"
