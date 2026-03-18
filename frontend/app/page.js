"use client";

import { useEffect, useMemo, useState } from "react";
import { setToken } from "./lib/token";
import { AboutLanding, computeApexHost } from "./lib/marketing";

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

function computeApexAboutHref() {
  if (typeof window === "undefined") return "/about";
  const apexHost = computeApexHost(window.location.hostname);
  if (!apexHost) return "/about";
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${apexHost}${port}/about`;
}

function computeApexContactHref() {
  if (typeof window === "undefined") return "/contact";
  const apexHost = computeApexHost(window.location.hostname);
  if (!apexHost) return "/contact";
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${apexHost}${port}/contact`;
}

function BrandLogo({ url, fallback }) {
  return (
    <div className="brand-logo-lg">
      {url ? <img src={url} alt="logo" /> : <span style={{ fontWeight: 900 }}>{fallback}</span>}
    </div>
  );
}

function LoginPage() {
  const [host, setHost] = useState("");
  const [adminHost, setAdminHost] = useState(false);
  const [tenantCfg, setTenantCfg] = useState(null);
  const [demoBaseDomain, setDemoBaseDomain] = useState("");

  const [identifier, setIdentifier] = useState("A001"); // email o matrícula
  const [password, setPassword] = useState("Alumno123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHost(window.location.host);
    const isAdmin = isAdminHost();
    setAdminHost(isAdmin);
    setDemoBaseDomain(
      computeApexHost(window.location.hostname) || window.location.hostname.toLowerCase(),
    );

    if (isAdmin) {
      setIdentifier("admin@saas.com");
      setPassword("Admin123!");
      return;
    }

    setIdentifier("A001");
    setPassword("Alumno123!");

    fetch("/api/tenant/public-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => setTenantCfg(cfg))
      .catch(() => {});
  }, []);

  const inferredKind = useMemo(() => {
    const v = (identifier || "").trim();
    if (adminHost) return "admin";
    if (!v) return null;
    return v.includes("@") ? "admin" : "student";
  }, [adminHost, identifier]);

  const loginTheme = useMemo(() => {
    // admin.* siempre usa un layout seguro/neutral
    if (adminHost) return "modern";
    return tenantCfg?.brand?.login_theme || "school";
  }, [adminHost, tenantCfg]);

  const loginCardStyle = useMemo(() => {
    if (adminHost) return "solid";
    return tenantCfg?.ui?.login_card_style || "solid";
  }, [adminHost, tenantCfg]);

  const showDemo = useMemo(() => {
    if (adminHost) return true;
    return tenantCfg?.ui?.login_show_demo !== false;
  }, [adminHost, tenantCfg]);

  const footerText = useMemo(() => {
    if (adminHost) return null;
    return tenantCfg?.ui?.login_footer_text || null;
  }, [adminHost, tenantCfg]);

  const cardClass = loginCardStyle === "glass" ? "auth-card-glass" : "auth-card-solid";

  const title = adminHost
    ? "SaaS Docs"
    : (tenantCfg?.brand?.login_title || tenantCfg?.display_name || "Institución");
  const subtitle = adminHost
    ? "Acceso global (SUPER_ADMIN)"
    : (tenantCfg?.brand?.login_subtitle || "Accede con tu cuenta para continuar");
  const logoUrl = tenantCfg?.brand?.logo_url || null;

  const bgStyle = useMemo(() => {
    if (adminHost) return undefined;

    const modeRaw = tenantCfg?.brand?.login_bg_mode;
    const mode = String(modeRaw || (tenantCfg?.brand?.login_bg_url ? "image" : "default")).toLowerCase();
    const primary = tenantCfg?.brand?.primary_color || "#111827";
    const secondary = tenantCfg?.brand?.secondary_color || primary;
    const bgUrl = tenantCfg?.brand?.login_bg_url || "";
    const bgColor = tenantCfg?.brand?.login_bg_color || "#f8fafc";
    const overlayPct = typeof tenantCfg?.brand?.login_bg_overlay === "number" ? tenantCfg.brand.login_bg_overlay : 78;
    const overlay = Math.min(0.95, Math.max(0, Number(overlayPct) / 100));

    if (mode === "solid") {
      return { backgroundColor: bgColor, backgroundImage: "none" };
    }

    if (mode === "gradient") {
      return { backgroundImage: `linear-gradient(135deg, ${primary}, ${secondary})` };
    }

    if (mode === "image" && bgUrl) {
      return {
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,${overlay}), rgba(255,255,255,0.92)), url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }

    // default
    if (bgUrl) {
      return {
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,${overlay}), rgba(255,255,255,0.92)), url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }

    return undefined;
  }, [tenantCfg]);

  const overlayStyle = useMemo(() => {
    if (adminHost) return undefined;
    const modeRaw = tenantCfg?.brand?.login_bg_mode;
    const mode = String(modeRaw || (tenantCfg?.brand?.login_bg_url ? "image" : "default")).toLowerCase();

    // For solid/gradient we keep the overlay subtle so the background is visible.
    if (mode === "solid" || mode === "gradient") {
      return { backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.22))" };
    }

    const overlayPct = typeof tenantCfg?.brand?.login_bg_overlay === "number" ? tenantCfg.brand.login_bg_overlay : 78;
    const overlay = Math.min(0.95, Math.max(0, Number(overlayPct) / 100));
    return { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,${overlay}), rgba(255,255,255,0.92))` };
  }, [adminHost, tenantCfg]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const v = (identifier || "").trim();
      if (!v) throw new Error(adminHost ? "Ingresa tu email." : "Ingresa tu email o matrícula.");

      const kind = adminHost ? "admin" : (v.includes("@") ? "admin" : "student");
      if (adminHost && kind !== "admin") throw new Error("En admin.* solo se permite acceso por email.");

      const token =
        kind === "admin"
          ? await apiPost("/auth/login-admin", { email: v, password })
          : await apiPost("/auth/login-student", { matricula: v, password });

      setToken(kind, token.access_token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <>
      {adminHost && (
        <div className="alert" style={{ marginTop: 12 }}>
          Estás en <b>admin.*</b> → acceso de <b>SUPER_ADMIN</b>.
        </div>
      )}

      <form onSubmit={onSubmit} className="auth-form">
        <div>
          <span className="label">{adminHost ? "Email" : "Email o Matrícula"}</span>
          <input
            className="input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            placeholder={adminHost ? "admin@saas.com" : "A001 o revisor@escuela1.com"}
          />
          <div className="auth-hint">
            {adminHost
              ? "Ingresa tu email de SUPER_ADMIN."
              : "Matrícula = Alumno · Email = Admin/Revisor."}
            {inferredKind ? (
              <span className={`auth-pill ${inferredKind === "admin" ? "auth-pill-admin" : "auth-pill-student"}`}>
                {inferredKind === "admin" ? "Admin/Revisor" : "Alumno"}
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <span className="label">Contraseña</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {showDemo ? (
        <details className="auth-details">
          <summary>Credenciales demo</summary>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li><b>SUPER_ADMIN:</b> admin@saas.com / Admin123! (admin.{demoBaseDomain || "tu-dominio"})</li>
              <li><b>Admin escuela1:</b> admin@escuela1.com / Admin123! (escuela1.{demoBaseDomain || "tu-dominio"})</li>
              <li><b>Revisor escuela1:</b> revisor@escuela1.com / Admin123! (escuela1.{demoBaseDomain || "tu-dominio"})</li>
              <li><b>Alumno escuela1:</b> A001 / Alumno123! (escuela1.{demoBaseDomain || "tu-dominio"})</li>
            </ul>
          </div>
        </details>
      ) : null}

      {footerText ? <div className="auth-footer">{footerText}</div> : null}

      <div className="auth-footer" style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href={computeApexAboutHref()} style={{ color: "var(--muted)" }}>
            Que hace esta plataforma
          </a>
          <a href={computeApexContactHref()} style={{ color: "var(--muted)" }}>
            Contactanos
          </a>
        </div>
      </div>
    </>
  );

  if (loginTheme === "minimal") {
    return (
      <main className="auth-shell auth-shell-minimal">
        <div className={`auth-card-min ${cardClass}`}>
          <div className="auth-brand-min">
            <BrandLogo url={logoUrl} fallback={adminHost ? "S" : "E"} />
            <div>
              <div className="auth-brand-title">{title}</div>
              <div className="auth-brand-sub">{subtitle}</div>
            </div>
          </div>

          <div className="auth-meta">Host: <b>{host || "(cargando...)"}</b></div>
          {form}
        </div>
      </main>
    );
  }

  if (loginTheme === "modern") {
    return (
      <main className="auth-shell auth-shell-modern">
        <div className="auth-bg auth-bg-modern" style={bgStyle} aria-hidden="true" />
        <div className="auth-overlay" style={overlayStyle} aria-hidden="true" />

        <div className={`auth-card-lg ${cardClass}`}>
          <div className="auth-brand-min">
            <BrandLogo url={logoUrl} fallback={adminHost ? "S" : "E"} />
            <div>
              <div className="auth-brand-title">{title}</div>
              <div className="auth-brand-sub">{subtitle}</div>
            </div>
          </div>

          <div className="auth-meta">Host: <b>{host || "(cargando...)"}</b></div>
          {form}
        </div>
      </main>
    );
  }

  // school (default)
  return (
    <main className="auth-shell auth-shell-school">
      <div className="auth-bg auth-bg-school" style={bgStyle} aria-hidden="true" />

      <div className={`auth-card-split ${cardClass}`}>
        <section className="auth-side">
          <div className="auth-side-top">
            <div className="brand-logo-xl">
              {logoUrl ? <img src={logoUrl} alt="logo" /> : <span style={{ fontWeight: 900 }}>{adminHost ? "S" : "E"}</span>}
            </div>
            <div>
              <div className="auth-side-title">{title}</div>
              <div className="auth-side-sub">{subtitle}</div>
            </div>
          </div>

          <div className="auth-side-card">
            <div style={{ fontWeight: 900 }}>Portal escolar</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
              Documentación de prácticas y servicio social.
            </div>

            <div className="auth-side-badges">
              <span className="pill pill-blue">Prácticas</span>
              <span className="pill pill-green">Servicio social</span>
              <span className="pill pill-gray">Documentos</span>
            </div>
          </div>

          <div className="auth-side-meta">
            Host: <b>{host || "(cargando...)"}</b>
          </div>
        </section>

        <section className="auth-main">
          <div className="auth-main-head">
            <h1 className="auth-title">Acceso</h1>
            <p className="auth-sub">Ingresa tus datos para continuar.</p>
          </div>
          {form}
        </section>
      </div>
    </main>
  );
}

export default function IndexPage() {
  const [mode, setMode] = useState("loading"); // loading | marketing | login

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = String(window.location.hostname || "").toLowerCase();
    const apex = computeApexHost(host);
    if (!apex) { setMode("login"); return; }

    // Mostrar marketing solo en el dominio raiz. En subdominios sigue siendo login.
    setMode(host === apex ? "marketing" : "login");
  }, []);

  if (mode === "marketing") {
    return <AboutLanding title="SaaS Docs" />;
  }

  if (mode === "loading") {
    return (
      <main className="container" style={{ paddingTop: 28 }}>
        <div className="card card-pad redirect-card">
          <div className="redirect-spinner" aria-hidden="true" />
          <div style={{ fontWeight: 950, fontSize: 18 }}>Cargando...</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
            Preparando la pagina.
          </div>
        </div>
      </main>
    );
  }

  return <LoginPage />;
}
