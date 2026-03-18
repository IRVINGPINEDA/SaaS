"use client";

import { useEffect, useState } from "react";
import { clearToken, getAnyToken } from "../lib/token";

async function apiGet(path, token) {
  const res = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Error");
  return data;
}

function logout() {
  clearToken("student");
  clearToken("admin");
  window.location.href = "/";
}

export default function DashboardPage() {
  const [error, setError] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    const token = getAnyToken();
    if (!token) {
      window.location.href = "/";
      return;
    }

    apiGet("/auth/me", token)
      .then((me) => {
        if (me.role === "SUPER_ADMIN") setTarget("/admin/super/panel");
        if (me.role === "TENANT_ADMIN") setTarget("/admin/panel");
        if (me.role === "REVIEWER") setTarget("/reviewer/panel");
        if (me.role === "STUDENT") setTarget("/student/portal");
      })
      .catch((e) => setError(e.message || "No se pudo cargar tu sesion."));
  }, []);

  useEffect(() => {
    if (!target) return;
    window.location.href = target;
  }, [target]);

  return (
    <main className="container redirect-shell">
      <div className="card card-pad redirect-card">
        <div className="redirect-spinner" aria-hidden="true" />
        <h1 className="h1">Preparando tu panel</h1>
        <p className="p-muted">
          Estamos redirigiendo segun tu rol de acceso.
        </p>

        {error ? <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div> : null}

        <div className="btn-row" style={{ justifyContent: "center", marginTop: 14 }}>
          <button className="btn" type="button" onClick={() => window.location.reload()}>
            Reintentar
          </button>
          <button className="btn btn-primary" type="button" onClick={logout}>
            Cerrar sesion
          </button>
        </div>
      </div>
    </main>
  );
}
