"use client";

import { useEffect, useMemo, useState } from "react";
import { computeApexHost } from "../lib/marketing";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const apexContactHref = useMemo(() => {
    if (typeof window === "undefined") return "/contact";
    const apexHost = computeApexHost(window.location.hostname);
    if (!apexHost) return "/contact";
    const port = window.location.port ? `:${window.location.port}` : "";
    return `${window.location.protocol}//${apexHost}${port}/contact`;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apexHost = computeApexHost(window.location.hostname);
    if (!apexHost) return;
    const current = window.location.hostname.toLowerCase();
    if (current === apexHost) return;
    window.location.href = apexContactHref;
  }, [apexContactHref]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOk(false);
    setLoading(true);
    try {
      const em = (email || "").trim().toLowerCase();
      const msg = (message || "").trim();
      if (!em) throw new Error("Ingresa tu correo.");
      if (!msg) throw new Error("Escribe un mensaje.");

      const res = await fetch("/api/contact/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, message: msg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Error");

      setOk(true);
      setMessage("");
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-inner">
          <div className="landing-kicker">Contactanos</div>
          <h1 className="landing-title">Habla con el Super Admin</h1>
          <p className="landing-sub">
            Si quieres usar el sistema en tu escuela, dejanos tu correo y un mensaje. El super administrador te
            respondera y podra darte de alta en la plataforma.
          </p>

          <div className="card card-pad" style={{ marginTop: 14, maxWidth: 720 }}>
            <p className="card-title">Nueva solicitud</p>
            <p className="card-sub">Tu informacion llega al panel global del SUPER_ADMIN.</p>

            {ok ? (
              <div className="alert alert-ok" style={{ marginTop: 12 }}>
                Mensaje enviado. En breve te contactaremos.
              </div>
            ) : null}
            {error ? (
              <div className="alert alert-error" style={{ marginTop: 12 }}>
                {error}
              </div>
            ) : null}

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div>
                <span className="label">Correo</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contacto@escuela.edu"
                  autoComplete="email"
                />
              </div>
              <div>
                <span className="label">Mensaje</span>
                <textarea
                  className="input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Cuentanos cuantas carreras/alumnos, y que necesitas configurar."
                  rows={6}
                  style={{ resize: "vertical", lineHeight: 1.4 }}
                />
              </div>

              <div className="btn-row" style={{ alignItems: "center" }}>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar"}
                </button>
                <a className="btn" href="/about">Ver que hace</a>
                <a className="btn" href="/">Iniciar sesion</a>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="landing-section">
        <h2 className="h2">Que pasa despues</h2>
        <p className="p-muted">Flujo rapido para darte de alta.</p>

        <div className="steps">
          <div className="card step">
            <div className="step-num">1</div>
            <div>
              <div className="step-title">Recibimos tu mensaje</div>
              <div className="step-sub">El SUPER_ADMIN lo ve en admin.*</div>
            </div>
          </div>
          <div className="card step">
            <div className="step-num">2</div>
            <div>
              <div className="step-title">Alta de escuela</div>
              <div className="step-sub">Creamos tu tenant (subdominio) y un administrador.</div>
            </div>
          </div>
          <div className="card step">
            <div className="step-num">3</div>
            <div>
              <div className="step-title">Personalizacion</div>
              <div className="step-sub">Branding, tipos de documentos y reglas por programa.</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
