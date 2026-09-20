#!/bin/bash
# Exécute les migrations après le schéma, au premier démarrage de la base.
set -e
for f in /migrations/*.sql; do
  [ -e "$f" ] || continue
  echo "  migration : $(basename "$f")"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
done
