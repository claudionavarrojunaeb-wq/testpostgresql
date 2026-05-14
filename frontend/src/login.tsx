//D:\_ReactU\ReactU\00_testpostgresql\frontend\src\login.tsx
import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

interface LoginProps { onLogin: () => void }

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  type TurnstileType = {
    render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => number;
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const win = window as Window & { turnstile?: TurnstileType };

    const init = () => {
      if (!win.turnstile) return;
      if (!turnstileRef.current) return;
      if (widgetIdRef.current != null) return;
      widgetIdRef.current = win.turnstile.render(turnstileRef.current as HTMLElement, {
        sitekey: '0x4AAAAAADBOvtG73ncxE6hL',
        callback: (token: string) => {
          setTurnstileToken(token);
        },
      });
    };

    if (win.turnstile) {
      init();
    } else {
      timer = setInterval(() => {
        const w = window as Window & { turnstile?: TurnstileType };
        if (w.turnstile) {
          init();
          if (timer !== undefined) clearInterval(timer);
        }
      }, 200);
    }

    return () => { if (timer !== undefined) clearInterval(timer); };
  }, []);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // ✅ validar campos
    if (!username || !password) {
      setMessage('username y password requeridos');
      return;
    }

    // 🔐 validar token Turnstile
    if (!turnstileToken) {
      setMessage('Turnstile token requerido');
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          turnstileToken: turnstileToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Credenciales inválidas");
        return;
      }

      localStorage.setItem("token", data.token);
      onLogin();

    } catch (err) {
      console.error(err);
      setMessage("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#0f172a",
      color: "white",
    }}>
      <form onSubmit={handleLogin} style={{ width: 300, display: "flex", flexDirection: "column" }}>

        <h2 style={{ textAlign: "center", marginBottom: 20 }}>
          Login LDAP
        </h2>

        <input
          type="text"
          placeholder="nombre.apellido"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: 10, marginBottom: 10 }}
        />

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 10, marginBottom: 10, width: "100%" }}
          />

          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
            }}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        {/* Cloudflare Turnstile widget */}
        <div ref={turnstileRef} style={{ marginTop: 10 }} />

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 10,
            padding: 10,
            background: "#2563eb",
            color: "white",
            border: "none",
          }}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <p style={{ marginTop: 10 }}>{message}</p>
      </form>
    </div>
  );
}