#!/usr/bin/env bash
set -euo pipefail
# Le backend Spring Boot (docker-compose, service `api`) doit tourner sur :8081
npx openapi-typescript http://localhost:8081/v3/api-docs -o src/api/schema.d.ts

# Fichier genere : ne jamais l'editer a la main. Pour le resynchroniser : npm run gen:api
tmpfile="$(mktemp)"
{
  echo "// Fichier genere -- ne pas editer a la main. Pour resynchroniser : npm run gen:api"
  cat src/api/schema.d.ts
} > "$tmpfile"
mv "$tmpfile" src/api/schema.d.ts

echo "src/api/schema.d.ts regenere depuis /v3/api-docs"
