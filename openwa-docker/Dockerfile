# open-wa con Google Chrome. La versión va fijada: otras han dejado de funcionar con WhatsApp Web.
FROM node:24-bookworm-slim

ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && curl -fsSL -o /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
  && apt-get install -y --no-install-recommends /tmp/chrome.deb fonts-liberation fonts-noto-color-emoji \
  && rm -rf /tmp/chrome.deb /var/lib/apt/lists/*

RUN npm install -g @open-wa/wa-automate@5.10.0

WORKDIR /app
COPY wa.config.json ./
RUN mkdir -p /data && chown -R node:node /app /data

USER node

EXPOSE 8080

# --host 0.0.0.0 es necesario para que el bot alcance la API desde su contenedor.
CMD ["wa-automate", "--use-chrome", "--host", "0.0.0.0", "--qr-timeout", "0", "--port", "8080"]
