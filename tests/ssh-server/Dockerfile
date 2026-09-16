FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates curl htop iproute2 less nano netcat-openbsd openssh-server \
        python3 tmux vim \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/sshd /opt/termforge/fixtures \
    && useradd --create-home --shell /bin/bash termforge \
    && mkdir -p /home/termforge/.ssh \
    && chmod 700 /home/termforge/.ssh

COPY sshd_config /etc/ssh/sshd_config
COPY entrypoint.sh /usr/local/bin/termforge-ssh-entrypoint
COPY fixtures/ /opt/termforge/fixtures/

RUN chmod 0755 /usr/local/bin/termforge-ssh-entrypoint \
    && chown -R termforge:termforge /home/termforge /opt/termforge/fixtures

EXPOSE 22 8080

ENTRYPOINT ["/usr/local/bin/termforge-ssh-entrypoint"]
