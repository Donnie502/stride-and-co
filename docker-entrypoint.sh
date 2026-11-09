#!/bin/sh
set -e

for archivo in /etc/secrets/local-*.json; do
  [ -e "$archivo" ] || continue
  cat "$archivo" > "/app/config/$(basename "$archivo")"
  echo "[entrypoint] secreto cargado: $(basename "$archivo")"
done

exec "$@"
