"use client";

import { useEffect, useState } from "react";

async function apiGet(path, token) {
  const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Error");
  return data;
}

async function apiPatch(path, body, token) {
  const res = await fetch(`/api${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Error");
  return data;
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

export default function TenantSettingsPage() {
  const [me, setMe] = useState(null);
  const [tenant, setTenant] = useState(null);

  const [color, setColor] = useState("#111827");
  const [logo, setLogo] = useState("");

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/"; return; }

    async function load() {
      setError(""); setOk("");
      const meData = await apiGet("/auth/me", token);

      if (meData.role !== "TENANT_ADMIN" && meData.role !== "SUPER_ADMIN") {
        throw new Error("Solo TENANT_ADMIN (o SUPER_ADMIN) puede editar configuración.");
      }

      setMe(meData);

      const cfg = await apiGet("/tenant/public-config", token);
      setTenant(cfg);

      setColor(cfg?.brand?.primary_color || "#111827");
      setLogo(cfg?.brand?.logo_url || "");
    }

    load().catch((e) => setError(e.message || "Error"));
  }, []);

  async function save(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    setError(""); setOk("");

    try {
      await apiPatch(`/tenants/${tenant.tenant_id}/branding`, {
        brand_primary_color: color,
        brand_logo_url: logo || null,
      }, token);

      setOk("Cambios guardados ✅");
      // Actualiza variable CSS sin recargar
      document.documentElement.style.setProperty("--brand", color);
    } catch (e) {
      setError(e.message || "Error");
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h1 className="h1">Configuración de la institución</h1>

        <div className="btn-row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={logout}>Cerrar sesión</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
        {ok && <div className="alert alert-ok" style={{ marginTop: 12 }}>{ok}</div>}

        {!tenant ? (
          <p style={{ color: "var(--muted)" }}>Cargando configuración...</p>
        ) : (
          <>
            <div className="card" style={{ marginTop: 16 }}>
              <h2 className="h2">Branding</h2>

              <form onSubmit={save} style={{ display: "grid", gap: 12, maxWidth: 560 }}>
                <div>
                  <span className="label">Color principal</span>
                  <div className="btn-row">
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                    <code style={{ color: "var(--muted)" }}>{color}</code>
                  </div>
                </div>

                <div>
                  <span className="label">Logo (URL)</span>
                  <input className="input" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
                  <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
                    Para prototipo usamos URL. En Sprint 3/4 podemos subir el archivo al storage (MinIO).
                  </p>
                </div>

                <div className="btn-row">
                  <button className="btn btn-primary" type="submit">Guardar</button>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>
                    Se reflejará en el portal de esta escuela.
                  </span>
                </div>
              </form>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <h2 className="h2">Vista previa</h2>
              <div className="btn-row">
                <div className="logo">
                  {logo ? <img src={logo} alt="logo" /> : <span>🏫</span>}
                </div>
                <div>
                  <div><b>{tenant.display_name}</b></div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Slug: {tenant.slug}</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary">Botón primario</button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
