"use client";

import { useEffect, useState } from "react";

async function apiGet(path, token) {
  const res = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Error");
  return data;
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

export default function DashboardPage() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
      return;
    }

    apiGet("/auth/me", token)
      .then((m) => {
        setMe(m);

        // Redirecciones por rol (para que se vea "sistema completo")
        if (m.role === "SUPER_ADMIN") window.location.href = "/admin/tenants";
        if (m.role === "TENANT_ADMIN") window.location.href = "/admin/settings";
        if (m.role === "REVIEWER") window.location.href = "/review/panel";
        if (m.role === "STUDENT") window.location.href = "/student/portal";
      })
      .catch((e) => setError(e.message || "Error"));
  }, []);

  return (
    <main className="container">
      <div className="card">
        <h1 className="h1">Dashboard</h1>

        {error && <div className="alert alert-error">{error}</div>}

        {!me ? (
          <p style={{ color: "var(--muted)" }}>Cargando perfil...</p>
        ) : (
          <>
            <div className="card" style={{ marginTop: 12 }}>
              <h2 className="h2">Tu sesión</h2>
              <p><b>Nombre:</b> {me.full_name}</p>
              <p><b>Rol:</b> {me.role}</p>
              <p><b>Tenant ID:</b> {me.tenant_id ?? "GLOBAL"}</p>
              <p><b>Email:</b> {me.email ?? "-"}</p>
              <p><b>Matrícula:</b> {me.matricula ?? "-"}</p>
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button className="btn" onClick={logout}>Cerrar sesión</button>
            </div>

            <p style={{ color: "var(--muted)", marginTop: 12 }}>
              Si no te redirige automáticamente, revisa tu rol o abre el menú superior.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
