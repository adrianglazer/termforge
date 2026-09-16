#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
server_dir="$project_dir/tests/ssh-server"
generated_dir="$server_dir/generated"
bind_address=127.0.0.1

if [ "${1:-}" = "--lan" ]; then
  bind_address=0.0.0.0
elif [ "$#" -gt 0 ]; then
  echo "Usage: $0 [--lan]" >&2
  exit 2
fi

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
command -v ssh-keygen >/dev/null 2>&1 || { echo "ssh-keygen is required." >&2; exit 1; }

mkdir -p "$generated_dir"
chmod 700 "$generated_dir"

if [ ! -f "$generated_dir/id_ed25519" ]; then
  ssh-keygen -q -t ed25519 -N '' -C termforge-disposable -f "$generated_dir/id_ed25519"
fi
if [ ! -f "$generated_dir/id_ed25519_encrypted" ]; then
  ssh-keygen -q -t ed25519 -N 'termforge-test-passphrase' -C termforge-disposable-encrypted -f "$generated_dir/id_ed25519_encrypted"
fi
cat "$generated_dir/id_ed25519.pub" "$generated_dir/id_ed25519_encrypted.pub" > "$generated_dir/authorized_keys"
chmod 600 "$generated_dir/authorized_keys"

if [ ! -f "$generated_dir/test.env" ]; then
  printf 'TEST_USER_PASSWORD=test\nTARGET_SSH_PORT=2222\nBASTION_SSH_PORT=2223\n' > "$generated_dir/test.env"
  chmod 600 "$generated_dir/test.env"
fi

SSH_BIND_ADDRESS="$bind_address" docker compose --env-file "$generated_dir/test.env" -f "$server_dir/compose.yaml" up --build --detach --wait

echo "Disposable SSH environment is ready."
echo "Connection details and generated credentials: $generated_dir"
echo "Target:   termforge@127.0.0.1:2222"
echo "Bastion:  termforge@127.0.0.1:2223"
echo "Encrypted key passphrase: termforge-test-passphrase"
if [ "$bind_address" = "0.0.0.0" ]; then
  echo "LAN mode is active. Use this computer's private LAN address on the iPhone."
  echo "Stop the fixture after testing; your firewall must block untrusted networks."
fi
