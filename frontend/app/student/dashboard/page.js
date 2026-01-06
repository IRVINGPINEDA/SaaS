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

export default function StudentDashboard() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/"; return; }

    apiGet("/auth/me", token)
      .then((m) => {
        if (m.role !== "STUDENT") throw new Error("Acceso solo para alumno.");
        setMe(m);
      })
      .catch((e) => setError(e.message || "Error"));
  }, []);

  return (
    <main className="container">
      <div className="card">
        <h1 className="h1">Portal del Alumno</h1>

        <div className="btn-row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={logout}>Cerrar sesión</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

        {!me ? (
          <p style={{ color: "var(--muted)" }}>Cargando...</p>
        ) : (
          <>
            <div className="card" style={{ marginTop: 16 }}>
              <h2 className="h2">Mi expediente (estructura)</h2>
              <p style={{ color: "var(--muted)" }}>
                Sprint 3: aquí se crean expedientes de Prácticas/Servicio Social, checklist y carga de documentos.
              </p>

              <table className="table">
                <thead>
                  <tr>
                    <th>Requisito</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Carta de presentación</td>
                    <td>Pendiente</td>
                    <td><button className="btn btn-primary">Subir</button></td>
                  </tr>
                  <tr>
                    <td>Formato de aceptación</td>
                    <td>Observado</td>
                    <td><button className="btn">Ver observación</button></td>
                  </tr>
                  <tr>
                    <td>Reporte parcial</td>
                    <td>Aprobado</td>
                    <td><button className="btn">Descargar</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
