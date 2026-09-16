#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
server_dir="$project_dir/tests/ssh-server"
generated_dir="$server_dir/generated"

if [ -f "$generated_dir/test.env" ]; then
  docker compose --env-file "$generated_dir/test.env" -f "$server_dir/compose.yaml" down --volumes --remove-orphans
else
  docker compose -f "$server_dir/compose.yaml" down --volumes --remove-orphans
fi

echo "Containers and disposable host keys were removed."
echo "Client credentials remain in $generated_dir for repeatable tests; delete that ignored directory to rotate them."
