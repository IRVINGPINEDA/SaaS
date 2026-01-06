"use client";

import { useEffect, useState } from "react";

async function apiGet(path, token) {
  const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Error");
  return data;
}

async function apiPost(path, body, token) {
  const res = await fetch(`/api${path}`, {
    method: "POST",
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

export default function TenantsPage() {
  const [me, setMe] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");

  async function load(token) {
    setError(""); setOk("");
    const meData = await apiGet("/auth/me", token);
    if (meData.role !== "SUPER_ADMIN") {
      throw new Error("Solo SUPER_ADMIN puede acceder aquí.");
    }
    setMe(meData);
    const list = await apiGet("/tenants", token);
    setTenants(list);
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/"; return; }
    load(token).catch((e) => setError(e.message || "Error"));
  }, []);

  async function createTenant(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    setError(""); setOk("");

    try {
      await apiPost("/tenants", { slug, name }, token);
      setSlug(""); setName("");
      setOk("Tenant creado ✅");
      await load(token);
    } catch (e) {
      setError(e.message || "Error");
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h1 className="h1">Super Admin · Escuelas (Tenants)</h1>

        <div className="btn-row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={logout}>Cerrar sesión</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
        {ok && <div className="alert alert-ok" style={{ marginTop: 12 }}>{ok}</div>}

        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="h2">Crear nueva escuela</h2>
          <form onSubmit={createTenant} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
            <div>
              <span className="label">Slug (subdominio)</span>
              <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="escuela3" />
            </div>
            <div>
              <span className="label">Nombre</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Escuela 3" />
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" type="submit">Crear</button>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>
                URL: <code>http://{slug || "escuela3"}.localtest.me</code>
              </span>
            </div>
          </form>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="h2">Escuelas registradas</h2>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Slug</th>
                <th>Nombre</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td><b>{t.slug}</b></td>
                  <td>{t.name}</td>
                  <td>
                    <a href={`http://${t.slug}.localtest.me`} target="_blank" rel="noreferrer">
                      {t.slug}.localtest.me
                    </a>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr><td colSpan={4} style={{ color: "var(--muted)" }}>No hay tenants.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
