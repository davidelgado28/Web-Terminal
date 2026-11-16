FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    bash \
    coreutils \
    curl \
    wget \
    git \
    vim \
    nano \
    python3 \
    gcc \
    make \
    htop \
    tmux \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash sandbox && \
    echo "sandbox:sandbox" | chpasswd

USER sandbox
WORKDIR /home/sandbox

RUN echo 'echo "Bem-vindo ao Web Terminal! Digite help para ver comandos."' >> /home/sandbox/.bashrc

CMD ["/bin/bash"]
