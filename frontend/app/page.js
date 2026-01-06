"use client";

import { useEffect, useMemo, useState } from "react";

async function apiPost(path, body) {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Error");
  return data;
}

function isAdminHost() {
  if (typeof window === "undefined") return false;
  return window.location.hostname.toLowerCase().startsWith("admin.");
}

export default function LoginPage() {
  const [host, setHost] = useState("");
  const adminHost = useMemo(() => isAdminHost(), []);

  const [mode, setMode] = useState("student"); // student | admin
  const [email, setEmail] = useState("admin@escuela1.com");
  const [matricula, setMatricula] = useState("A001");
  const [password, setPassword] = useState("Alumno123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHost(window.location.host);

    if (isAdminHost()) {
      setMode("admin");
      setEmail("admin@saas.com");
      setPassword("Admin123!");
    } else {
      setMode("student");
      setPassword("Alumno123!");
    }
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token =
        mode === "admin"
          ? await apiPost("/auth/login-admin", { email, password })
          : await apiPost("/auth/login-student", { matricula, password });

      localStorage.setItem("token", token.access_token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h1 className="h1">Acceso al sistema</h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Host: <b>{host || "(cargando...)"}</b>
        </p>

        {!adminHost && (
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className={`btn ${mode === "student" ? "btn-primary" : ""}`}
              onClick={() => {
                setMode("student");
                setPassword("Alumno123!");
              }}
            >
              Alumno (matrícula)
            </button>

            <button
              type="button"
              className={`btn ${mode === "admin" ? "btn-primary" : ""}`}
              onClick={() => {
                setMode("admin");
                setEmail("admin@escuela1.com");
                setPassword("Admin123!");
              }}
            >
              Admin / Revisor (email)
            </button>
          </div>
        )}

        {adminHost && (
          <div className="alert" style={{ marginTop: 12 }}>
            Estás en <b>admin.*</b> → acceso de <b>SUPER_ADMIN</b>.
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {mode === "admin" ? (
            <div>
              <span className="label">Email</span>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          ) : (
            <div>
              <span className="label">Matrícula</span>
              <input className="input" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
            </div>
          )}

          <div>
            <span className="label">Contraseña</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div style={{ marginTop: 16, color: "var(--muted)", fontSize: 13 }}>
          <b>Credenciales demo:</b>
          <ul>
            <li>
              <b>SUPER_ADMIN:</b> admin@saas.com / Admin123! (en <code>admin.localtest.me</code>)
            </li>
            <li>
              <b>Admin escuela1:</b> admin@escuela1.com / Admin123! (en <code>escuela1.localtest.me</code>)
            </li>
            <li>
              <b>Revisor escuela1:</b> revisor@escuela1.com / Admin123! (en <code>escuela1.localtest.me</code>)
            </li>
            <li>
              <b>Alumno escuela1:</b> A001 / Alumno123! (en <code>escuela1.localtest.me</code>)
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
