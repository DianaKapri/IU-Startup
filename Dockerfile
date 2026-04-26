FROM node:20-bookworm-slim

WORKDIR /app

# Python 3 + pip для CP-SAT solver (or-tools wheels требуют glibc, поэтому Debian slim).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Изолированный venv для Python-зависимостей (Debian запрещает global pip с PEP 668).
RUN python3 -m venv /opt/cp-sat-venv
ENV PATH="/opt/cp-sat-venv/bin:${PATH}"
ENV CP_SAT_PYTHON="/opt/cp-sat-venv/bin/python3"

COPY cp-sat-solver/requirements.txt /tmp/requirements.txt
RUN /opt/cp-sat-venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt

# Node-зависимости
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY projects/sanpin-audit-ui/package.json projects/sanpin-audit-ui/package-lock.json ./projects/sanpin-audit-ui/
RUN cd projects/sanpin-audit-ui && npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
