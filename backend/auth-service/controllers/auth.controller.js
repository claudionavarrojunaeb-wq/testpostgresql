//D:\_ReactU\ReactU\00_testpostgresql\backend\auth-service\controllers\auth.controller.js
import jwt from 'jsonwebtoken';
import axios from 'axios'; // 👈 NUEVO
import { authenticate } from '../services/ldap.service.js';

const DEBUG_TURNSTILE = process.env.DEBUG_TURNSTILE === 'true';

export const login = async (req, res) => {
  try {
    const { username, password, turnstileToken } = req.body;
    console.log("TURNSTILE TOKEN FROM FRONT:", turnstileToken);
    console.log("TURNSTILE_SECRET defined:", !!process.env.TURNSTILE_SECRET);
    console.log("LOGIN:", username);

    // ✅ validar campos
    if (!username || !password) {
      return res.status(400).json({
        error: 'username y password requeridos'
      });
    }

    // 🔐 VALIDAR TURNSTILE
    if (!turnstileToken) {
      return res.status(400).json({ error: 'Turnstile token requerido' });
    }

    try {
      const params = new URLSearchParams();
      params.append('secret', process.env.TURNSTILE_SECRET);
      params.append('response', turnstileToken);

      const verify = await axios.post(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      console.log('TURNSTILE RESPONSE:', verify.data);

      // Cloudflare Turnstile returns a boolean `success`.
      if (!verify.data.success) {
        if (DEBUG_TURNSTILE) {
          return res.status(403).json({ error: 'Turnstile inválido', debug: verify.data });
        }
        return res.status(403).json({ error: 'Turnstile inválido' });
      }

    } catch (err) {
      console.error("ERROR TURNSTILE:", err);
      return res.status(500).json({ error: 'Error validando Turnstile' });
    }

    // Read JWT secret at request time (dotenv is loaded in server.js after imports)
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error('JWT_SECRET no definido en el entorno');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    await authenticate(username, password);

    const role = username === 'admin' ? 'admin' : 'user';

    const token = jwt.sign({ user: username, role }, SECRET, { expiresIn: '1h' });

    res.json({ token, user: username, role });

  } catch (err) {
    console.error("ERROR EN LOGIN:", err);

    res.status(401).json({
      error: 'Credenciales inválidas'
    });
  }
};