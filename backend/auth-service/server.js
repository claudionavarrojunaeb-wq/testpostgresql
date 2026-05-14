//D:\_ReactU\ReactU\00_testpostgresql\backend\auth-service\server.js
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import cors from "cors";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
// =======================
// 🔧 __dirname (ES MODULES)
// =======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, ".env")
});

// DEBUG: indicar si variables críticas están presentes (no imprimir valores)
console.log('ENV LOADED:', {
  JWT_SECRET_defined: !!process.env.JWT_SECRET,
  TURNSTILE_SECRET_defined: !!process.env.TURNSTILE_SECRET,
  PORT: process.env.PORT || '3002'
});

// =======================
// 🚀 APP
// =======================
const app = express();

// =======================
// 🔑 CONFIG (.env)
// =======================
const PORT = process.env.PORT || 3002;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const HTTPS_ENABLED = process.env.HTTPS_ENABLED === "true";
const HTTPS_KEY = process.env.HTTPS_KEY;
const HTTPS_CERT = process.env.HTTPS_CERT;

// =======================
// 🔐 MIDDLEWARES
// =======================
app.use(express.json());

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

// =======================
// 📡 ROUTES
// =======================
app.use("/auth", authRoutes);

// =======================
// 🔒 HTTPS / HTTP START
// =======================
function startServer() {
  if (HTTPS_ENABLED) {
    if (!HTTPS_KEY || !HTTPS_CERT) {
      throw new Error("❌ HTTPS_KEY o HTTPS_CERT no definidos en .env");
    }

    const keyPath = path.join(__dirname, HTTPS_KEY);
    const certPath = path.join(__dirname, HTTPS_CERT);

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.warn("⚠️ Certificados no encontrados, fallback a HTTP");
      return startHttp();
    }

    https.createServer(
      {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
      app
    ).listen(PORT, () => {
      console.log(`🔒 Auth service en https://localhost:${PORT}`);
    });

  } else {
    startHttp();
  }
}

function startHttp() {
  app.listen(PORT, () => {
    console.log(`🌐 Auth service en http://localhost:${PORT}`);
  });
}

// =======================
// 🚀 START
// =======================
startServer();