//D:\_ReactU\ReactU\00_testpostgresql\backend\api-gateway\server.js
import express from "express";
import https from "https";
import fs from "fs";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
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




// =======================
// 🚀 APP
// =======================
const app = express();

// =======================
// 🔐 SEGURIDAD
// =======================
app.use(helmet());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
}));


// =======================
// 🔑 CONFIG (.env)
// =======================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const USUARIOS_SERVICE_URL = process.env.USUARIOS_SERVICE_URL;
// =======================
// ❗ VALIDACIONES
// =======================
if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET no definido en .env");
}

if (!AUTH_SERVICE_URL || !USUARIOS_SERVICE_URL) {
  throw new Error("❌ URLs de microservicios no definidas en .env");
}

// No forzar certificados aquí: permitimos arrancar en HTTP configurando
// `HTTPS_ENABLED=false` en el .env. Esto hace que el gateway pueda funcionar
// en solo HTTP cuando se desea.

const HTTPS_KEY = process.env.HTTPS_KEY;
const HTTPS_CERT = process.env.HTTPS_CERT;
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === "true";

// =======================
// 🔐 JWT MIDDLEWARE
// =======================
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token inválido" });
  }
}

// =======================
// 👤 ROLES
// =======================
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Solo admin" });
  }
  next();
}

// =======================
// 🔁 PROXIES
// =======================
app.use((req, res, next) => {
  console.log("➡️ REQUEST:", req.method, req.url);
  next();
});
// 🔐 AHORA sí parsear JSON
app.use(express.json());
// 🔓 AUTH (PÚBLICO)
// app.use("/auth", createProxyMiddleware({
//   target: AUTH_SERVICE_URL,
//   changeOrigin: true,
//   // pathRewrite: {
//   //   "^/auth": "/auth"
//   // }
// }));
app.use("/auth", createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  selfHandleResponse: false,
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    }
  }
}));

// 🔐 USUARIOS (PROTEGIDO)
app.use("/usuarios", verifyToken, createProxyMiddleware({
  target: USUARIOS_SERVICE_URL,
  changeOrigin: true,
}));

// 🔐 ADMIN
app.get("/admin", verifyToken, requireAdmin, (req, res) => {
  res.json({
    message: "Zona admin",
    user: req.user
  });
});
// 🔐 GAteway
app.use((req, res, next) => {
  console.log("GATEWAY:", req.method, req.url);
  next();
});

// ❤️ HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// =======================
// 🚀 START SERVER (HTTP o HTTPS según .env)
// =======================
function startHttp() {
  app.listen(PORT, () => {
    console.log(`🌐 Gateway en http://localhost:${PORT}`);
  });
}

function startServer() {
  if (HTTPS_ENABLED && HTTPS_KEY && HTTPS_CERT) {
    const keyPath = path.join(__dirname, HTTPS_KEY);
    const certPath = path.join(__dirname, HTTPS_CERT);

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };

      https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`🔒 Gateway HTTPS en https://localhost:${PORT}`);
      });
      return;
    } else {
      console.warn("⚠️ Certificados no encontrados, arrancando en HTTP");
    }
  }

  startHttp();
}

startServer();