"use client";

import { useMemo, useState } from "react";

export function computeApexHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host) return null;
  const parts = host.split(".").filter(Boolean);

  // Special-case: sslip.io/nip.io embeds the IP as 4 labels.
  // Base should be "<ip>.sslip.io" (6 labels total: a.b.c.d.sslip.io).
  const last2 = parts.slice(-2).join(".");
  if (last2 === "sslip.io" || last2 === "nip.io") {
    if (parts.length >= 6) return parts.slice(-6).join(".");
    return host;
  }

  // Best-effort: for <sub>.<apex> return <apex>.
  if (parts.length >= 3) return parts.slice(1).join(".");
  return host;
}

function AboutIllustration() {
  return (
    <div className="about-illus" aria-hidden="true">
      <svg viewBox="0 0 640 520" className="about-illus-svg" role="img" aria-label="">
        <defs>
          <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--brand-rgb) / 0.95)" />
            <stop offset="1" stopColor="rgb(var(--brand2-rgb) / 0.85)" />
          </linearGradient>
          <linearGradient id="g2" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0" stopColor="rgb(var(--brand2-rgb) / 0.20)" />
            <stop offset="1" stopColor="rgb(var(--brand-rgb) / 0.10)" />
          </linearGradient>
          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <path
          d="M112,292 C90,206 118,120 190,82 C270,40 350,54 424,92 C490,125 548,186 545,260 C542,347 482,412 402,442 C316,474 134,462 112,292 Z"
          fill="url(#g2)"
          filter="url(#soft)"
          opacity="0.9"
        />

        <path
          d="M124,284 C98,214 120,134 190,98 C262,61 346,70 426,112 C500,151 548,215 538,286 C528,360 468,418 390,444 C304,472 150,450 124,284 Z"
          fill="rgba(255,255,255,0.82)"
          stroke="rgb(var(--brand-rgb) / 0.16)"
        />

        <g transform="translate(194 150)">
          <rect x="0" y="0" width="254" height="168" rx="18" fill="#fff" stroke="rgb(var(--brand-rgb) / 0.22)" />
          <rect x="18" y="18" width="96" height="16" rx="8" fill="rgb(var(--brand-rgb) / 0.16)" />
          <rect x="18" y="46" width="168" height="10" rx="5" fill="rgba(148,163,184,0.32)" />
          <rect x="18" y="66" width="142" height="10" rx="5" fill="rgba(148,163,184,0.26)" />
          <rect x="18" y="92" width="212" height="12" rx="6" fill="rgba(148,163,184,0.22)" />
          <rect x="18" y="114" width="192" height="12" rx="6" fill="rgba(148,163,184,0.18)" />
          <g transform="translate(190 20)">
            <circle cx="16" cy="16" r="16" fill="url(#g1)" opacity="0.92" />
            <path
              d="M13 21 l-4 -4 a2 2 0 0 1 3 -3 l2 2 l6 -7 a2 2 0 0 1 3 3 l-7 9 a2 2 0 0 1 -3 0 z"
              fill="#fff"
            />
          </g>
        </g>

        <g transform="translate(126 116) rotate(-8)">
          <rect x="0" y="0" width="150" height="96" rx="18" fill="#fff" stroke="rgba(15,23,42,0.10)" />
          <rect x="16" y="18" width="76" height="12" rx="6" fill="rgba(148,163,184,0.32)" />
          <rect x="16" y="40" width="110" height="10" rx="5" fill="rgba(148,163,184,0.22)" />
          <rect x="16" y="58" width="92" height="10" rx="5" fill="rgba(148,163,184,0.18)" />
          <circle cx="118" cy="22" r="10" fill="rgb(var(--brand-rgb) / 0.20)" />
          <path d="M118 16 v12" stroke="rgb(var(--brand-rgb) / 0.70)" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M112 22 h12" stroke="rgb(var(--brand-rgb) / 0.70)" strokeWidth="2.6" strokeLinecap="round" />
        </g>

        <g transform="translate(408 328) rotate(10)">
          <rect x="0" y="0" width="168" height="104" rx="18" fill="#fff" stroke="rgba(15,23,42,0.10)" />
          <rect x="16" y="18" width="102" height="12" rx="6" fill="rgba(148,163,184,0.30)" />
          <rect x="16" y="44" width="132" height="10" rx="5" fill="rgba(148,163,184,0.20)" />
          <rect x="16" y="64" width="114" height="10" rx="5" fill="rgba(148,163,184,0.16)" />
          <g transform="translate(122 22)">
            <rect x="0" y="0" width="30" height="30" rx="12" fill="rgb(var(--brand2-rgb) / 0.16)" />
            <path
              d="M9 16 a6 6 0 1 1 6 6 h-6"
              fill="none"
              stroke="rgb(var(--brand2-rgb) / 0.78)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>

      <div className="about-illus-shadow" />
    </div>
  );
}

function HeroMedia() {
  const sources = ["/landing/hero.png", "/landing/hero.jpg", "/landing/hero.jpeg", "/landing/hero.webp"];
  const [srcIndex, setSrcIndex] = useState(0);

  if (srcIndex >= sources.length) return <AboutIllustration />;

  return (
    <div className="about-hero-media" aria-hidden="true">
      <img
        className="about-hero-img"
        src={sources[srcIndex]}
        alt=""
        onError={() => setSrcIndex((i) => i + 1)}
      />
      <div className="about-hero-img-glow" />
    </div>
  );
}

function buildAbsoluteUrl({ host, port, path }) {
  if (typeof window === "undefined") return path;
  const p = port ? `:${port}` : "";
  return `${window.location.protocol}//${host}${p}${path}`;
}

function buildTenantHost({ slug, apexHost }) {
  const s = String(slug || "").trim().toLowerCase();
  if (!s) return null;
  // slug could be "escuela1" or already a full hostname.
  if (s.includes(".")) return s;
  return `${s}.${apexHost}`;
}

export function AboutLanding({ title = "SaaS Docs" }) {
  const apex = useMemo(() => {
    if (typeof window === "undefined") return { apexHost: null, port: "" };
    const apexHost = computeApexHost(window.location.hostname);
    return { apexHost, port: window.location.port || "" };
  }, []);

  const [schoolSlug, setSchoolSlug] = useState("");

  const adminHref = useMemo(() => {
    if (!apex.apexHost) return "/";
    return buildAbsoluteUrl({ host: `admin.${apex.apexHost}`, port: apex.port, path: "/" });
  }, [apex.apexHost, apex.port]);

  const contactHref = useMemo(() => {
    if (!apex.apexHost) return "/contact";
    return buildAbsoluteUrl({ host: apex.apexHost, port: apex.port, path: "/contact" });
  }, [apex.apexHost, apex.port]);

  const openSchool = () => {
    if (!apex.apexHost) return;
    const h = buildTenantHost({ slug: schoolSlug, apexHost: apex.apexHost });
    if (!h) return;
    const url = buildAbsoluteUrl({ host: h, port: apex.port, path: "/" });
    window.location.href = url;
  };

  const schoolLauncher = (
    <div className="about-launcher">
      <div className="about-launcher-title">Entrar a mi escuela</div>
      <div className="about-launcher-sub">Escribe tu subdominio (ej. <b>escuela1</b>).</div>
      <div className="about-launcher-row">
        <input
          className="input"
          value={schoolSlug}
          onChange={(e) => setSchoolSlug(e.target.value)}
          placeholder="escuela1"
          aria-label="Subdominio de escuela"
        />
        <button className="btn btn-primary" type="button" onClick={openSchool} disabled={!schoolSlug.trim()}>
          Entrar
        </button>
      </div>
    </div>
  );

  return (
    <main className="landing-page">
      <header className="landing-nav" role="banner">
        <div className="landing-nav-inner">
          <div className="landing-cta">
            <a className="btn" href={adminHref}>Admin global</a>
            <a className="btn btn-primary" href={contactHref}>Contactanos</a>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="about-hero">
          <div className="about-hero-bg" aria-hidden="true" />
          <div className="about-hero-grid">
            <HeroMedia />
            <div className="about-hero-copy">
              <h1 className="landing-title">Un SaaS para practicas y servicio social</h1>
            </div>
          </div>
        </section>

        <section className="about-section" style={{ marginBottom: 16 }}>
          <div className="card card-pad">
            <div className="row row-wrap" style={{ alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>Entrar a mi escuela</div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                  Si ya tienes tu subdominio, entra directo desde aqui.
                </div>
              </div>
              <div className="btn-row">
                <a className="btn" href={adminHref}>Admin global</a>
                <a className="btn btn-primary" href={contactHref}>Contactanos</a>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {schoolLauncher}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
