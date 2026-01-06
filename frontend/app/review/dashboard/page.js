"use client";

import { useEffect, useState } from "react";

async function apiGet(path, token) {
  const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Error");
  return data;
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

export default function ReviewDashboard() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  // Datos de ejemplo (Sprint 3: se vuelven reales)
  const mock = {
    pendientes: 12,
    observados: 5,
    aprobadosHoy: 3,
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/"; return; }

    apiGet("/auth/me", token)
      .then((m) => {
        if (m.role !== "REVIEWER" && m.role !== "TENANT_ADMIN") {
          throw new Error("Acceso solo para REVISOR / Área de prácticas.");
        }
        setMe(m);
      })
      .catch((e) => setError(e.message || "Error"));
  }, []);

  return (
    <main className="container">
      <div className="card">
        <h1 className="h1">Tablero · Área de Prácticas / Servicio Social</h1>

        <div className="btn-row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={logout}>Cerrar sesión</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

        {!me ? (
          <p style={{ color: "var(--muted)" }}>Cargando...</p>
        ) : (
          <>
            <div className="card" style={{ marginTop: 16 }}>
              <h2 className="h2">Resumen</h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div className="card">
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Pendientes</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{mock.pendientes}</div>
                </div>
                <div className="card">
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Observados</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{mock.observados}</div>
                </div>
                <div className="card">
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Aprobados hoy</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{mock.aprobadosHoy}</div>
                </div>
              </div>

              <p style={{ color: "var(--muted)", marginTop: 12 }}>
                En Sprint 3 este tablero se conectará a expedientes y documentos reales.
              </p>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <h2 className="h2">Bandeja de revisión (estructura)</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Trámite</th>
                    <th>Estado</th>
                    <th>Último movimiento</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Juan Pérez (A001)</td>
                    <td>Servicio Social</td>
                    <td>Pendiente</td>
                    <td>Hace 2 horas</td>
                    <td><button className="btn btn-primary">Revisar</button></td>
                  </tr>
                  <tr>
                    <td>Ana López (A010)</td>
                    <td>Prácticas Profesionales</td>
                    <td>Observado</td>
                    <td>Ayer</td>
                    <td><button className="btn">Ver</button></td>
                  </tr>
                </tbody>
              </table>

              <p style={{ color: "var(--muted)", marginTop: 12 }}>
                Sprint 3: esto se alimenta desde la BD (expedientes + documentos + estados).
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
