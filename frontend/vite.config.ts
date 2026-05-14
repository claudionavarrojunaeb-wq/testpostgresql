import { defineConfig, type ServerOptions } from 'vite'
import react from '@vitejs/plugin-react'
import fs from "fs"
import path from "path"
import https from "https" // 👈 IMPORTANTE

// Permitir controlar HTTPS desde la variable de entorno `HTTPS_ENABLED`.
// Por defecto se desactiva para forzar HTTP en desarrollo.
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === 'true';

function getAgentFor(target: string) {
  try {
    const url = new URL(target);
    if (url.protocol === 'https:') {
      return new https.Agent({ rejectUnauthorized: false });
    }
    // For http targets, no TLS agent is needed.
    return undefined;
  } catch {
    return undefined;
  }
}

const proxyConfig = {
  "/auth": {
    target: "http://localhost:3002",
    changeOrigin: true,
    secure: false,
    agent: getAgentFor("http://localhost:3002")
  },
  "/usuarios": {
    target: "http://localhost:3001",
    changeOrigin: true,
    secure: false,
    agent: getAgentFor("http://localhost:3001")
  }
};

function buildServerOptions() {
  const serverOptions: ServerOptions = {
    proxy: proxyConfig
  };

  if (HTTPS_ENABLED) {
    try {
      const keyPath = path.resolve(__dirname, "../backend/api-gateway/certs/localhost-key.pem");
      const certPath = path.resolve(__dirname, "../backend/api-gateway/certs/localhost.pem");

      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        serverOptions.https = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath)
        };
      } else {
        console.warn('HTTPS_ENABLED=true pero certificados no encontrados. Arrancando en HTTP.');
      }
    } catch (err) {
      console.warn('Error al leer certificados, arrancando en HTTP.', err);
    }
  }

  return serverOptions;
}

export default defineConfig({
  plugins: [react()],
  server: buildServerOptions()
})