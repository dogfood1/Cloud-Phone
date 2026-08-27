FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    android-tools-adb \
    docker.io \
    ffmpeg \
    python3 \
    python3-pip \
    openssl \
    libusb-1.0-0 \
    util-linux \
    v4l-utils \
  && rm -rf /var/lib/apt/lists/*

COPY backend/node/package*.json ./backend/node/
RUN npm --prefix backend/node ci --omit=dev

COPY backend/assets/ios/requirements.txt ./backend/assets/ios/requirements.txt
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    libffi-dev \
    libssl-dev \
  && python3 -m pip install --no-cache-dir --break-system-packages \
    -r backend/assets/ios/requirements.txt \
  && apt-get purge -y --auto-remove gcc g++ python3-dev libffi-dev libssl-dev \
  && rm -rf /var/lib/apt/lists/*

COPY . .

# Bundled platform-tools may ship without +x on some platforms; fix when present.
RUN set -e; \
  for adb in \
    backend/bin/adb/platform-tools-latest-linux/platform-tools/adb \
    backend/bin/adb/platform-tools-latest-darwin/platform-tools/adb; \
  do \
    if [ -f "$adb" ]; then chmod +x "$adb"; fi; \
  done

ENV NODE_ENV=production
ENV CLOUD_PHONE_PREFER_SYSTEM_ADB=1
ENV CLOUD_PHONE_PYTHON=python3
CMD ["npm", "--prefix", "backend/node", "run", "start"]
