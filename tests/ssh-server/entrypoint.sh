#!/bin/sh
set -eu

: "${TEST_USER_PASSWORD:?TEST_USER_PASSWORD must be supplied}"

install -d -m 0700 /etc/ssh/host-keys /home/termforge/.ssh

if [ ! -f /etc/ssh/host-keys/ssh_host_ed25519_key ]; then
  ssh-keygen -q -t ed25519 -N '' -f /etc/ssh/host-keys/ssh_host_ed25519_key
fi
if [ ! -f /etc/ssh/host-keys/ssh_host_rsa_key ]; then
  ssh-keygen -q -t rsa -b 3072 -N '' -f /etc/ssh/host-keys/ssh_host_rsa_key
fi

install -m 0600 /run/termforge-credentials/authorized_keys /home/termforge/.ssh/authorized_keys
chown -R termforge:termforge /home/termforge/.ssh
printf '%s:%s\n' termforge "$TEST_USER_PASSWORD" | chpasswd

cp -R /opt/termforge/fixtures/. /home/termforge/fixtures/
chown -R termforge:termforge /home/termforge/fixtures

# A loopback-only TCP target gives local/remote/jump forwarding tests a stable endpoint.
python3 -m http.server 8080 --bind 127.0.0.1 --directory /home/termforge/fixtures &

exec /usr/sbin/sshd -D -e
