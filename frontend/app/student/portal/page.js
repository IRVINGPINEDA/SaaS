"use client";

import { useEffect, useMemo, useState } from "react";

async function apiGet(path, token) {
  const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Error");
  return data;
}

function IconButton({ children, badge, onClick }) {
  return (
    <button className="icon-btn" onClick={onClick} type="button">
      {children}
      {badge ? <span className="badge-dot">{badge}</span> : null}
    </button>
  );
}

function TopbarStudent({ title="Portal del Estudiante" }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-left">
          <div className="brand-icon">🎓</div>
          <div>
            <div className="brand-title">{title}</div>
          </div>
        </div>

        <div className="topbar-actions">
          <IconButton badge={3} onClick={() => {}}>🔔</IconButton>
          <IconButton onClick={() => {}}>👤</IconButton>
          <IconButton onClick={() => { localStorage.removeItem("token"); window.location.href="/"; }}>↩</IconButton>
        </div>
      </div>
    </header>
  );
}

function Tabs({ value, onChange, items }) {
  return (
    <div className="tabs">
      {items.map((t) => (
        <button
          key={t}
          className={`tab ${value === t ? "active" : ""}`}
          onClick={() => onChange(t)}
          type="button"
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export default function StudentPortal() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("Resumen");
  const tabs = useMemo(() => ["Resumen","Actividades","Documentos","Reportes","Perfil"], []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href="/"; return; }

    apiGet("/auth/me", token)
      .then((m) => {
        if (m.role !== "STUDENT") throw new Error("Acceso solo para alumno.");
        setMe(m);
      })
      .catch(() => window.location.href="/");
  }, []);

  // Mock igual a tus pantallas
  const mock = {
    nombre: "María González Pérez",
    horas: { completadas: 320, total: 480, pct: 67 },
    estado: { status: "En Progreso", empresa: "TechSolutions S.A. de C.V.", supervisor: "Ing. Carlos Ramírez" },
    notifs: [
      { title: "Reporte pendiente", sub: "Vence en 3 días", type: "pill-gray" },
      { title: "Documento aprobado", sub: "Hace 2 días", type: "pill-green" },
    ],
    recientes: [
      { title: "Reporte Semanal #12", sub: "Subido el 5 de Noviembre, 2024", pill: "Pendiente", pillClass: "pill-gray" },
      { title: "Evaluación Mensual", sub: "Subido el 1 de Noviembre, 2024", pill: "Aprobado", pillClass: "pill-green" },
    ],
    docs: [
      { name: "Reporte_Semanal_12.pdf", date: "5 Nov 2024", status: "Pendiente", pillClass: "pill-gray" },
      { name: "Evaluacion_Octubre.pdf", date: "1 Nov 2024", status: "Aprobado", pillClass: "pill-blue" },
      { name: "Carta_Presentacion.pdf", date: "30 Oct 2024", status: "Aprobado", pillClass: "pill-blue" },
    ],
  };

  return (
    <>
      <TopbarStudent />
      <main className="container">
        <h1 className="h1">Bienvenida, {mock.nombre}</h1>
        <p className="p-muted">Gestiona tus prácticas profesionales y servicio social</p>

        <Tabs value={tab} onChange={setTab} items={tabs} />

        {tab === "Resumen" && (
          <>
            <div className="grid-3">
              <div className="card card-pad">
                <p className="card-title">🕒 Progreso de Horas</p>
                <div className="divider" />
                <div className="row">
                  <div style={{ color:"var(--muted)", fontSize:13 }}>Completadas</div>
                  <div style={{ fontWeight:800 }}>{mock.horas.completadas}/{mock.horas.total} hrs</div>
                </div>
                <div style={{ marginTop: 10, background:"#e2e8f0", borderRadius:999, height:10 }}>
                  <div style={{ width:`${mock.horas.pct}%`, height:"100%", background:"var(--brand)", borderRadius:999 }} />
                </div>
                <p className="card-sub">{mock.horas.pct}% completado</p>
              </div>

              <div className="card card-pad">
                <p className="card-title">✅ Estado Actual</p>
                <div className="divider" />
                <span className="pill pill-green">En Progreso</span>
                <p style={{ marginTop: 10 }}><b>Empresa:</b> {mock.estado.empresa}</p>
                <p style={{ marginTop: 6 }}><b>Supervisor:</b> {mock.estado.supervisor}</p>
              </div>

              <div className="card card-pad">
                <p className="card-title">🔔 Notificaciones</p>
                <div className="divider" />
                <div style={{ display:"grid", gap: 10 }}>
                  {mock.notifs.map((n, i) => (
                    <div key={i}>
                      <div style={{ fontWeight:800 }}>{n.title}</div>
                      <div className="item-meta">{n.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">📌 Actividades Recientes</p>
              <div className="list">
                {mock.recientes.map((r, i) => (
                  <div key={i} className="list-item">
                    <div className="item-left">
                      <div className="doc-icon">📄</div>
                      <div>
                        <div className="item-title">{r.title}</div>
                        <div className="item-meta">{r.sub}</div>
                      </div>
                    </div>
                    <span className={`pill ${r.pillClass}`}>{r.pill}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "Actividades" && (
          <>
            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">🧾 Registrar Nueva Actividad</p>
              <p className="card-sub">Registra las actividades realizadas durante tus prácticas</p>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 14, marginTop: 14 }}>
                <div>
                  <span className="label">Fecha</span>
                  <input className="input" placeholder="dd/mm/aaaa" />
                </div>
                <div>
                  <span className="label">Horas Trabajadas</span>
                  <input className="input" defaultValue="8" />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <span className="label">Descripción de Actividades</span>
                <textarea className="textarea" placeholder="Describe las actividades realizadas durante el día..." />
              </div>

              <button className="btn btn-primary" style={{ marginTop: 14 }}>
                Registrar Actividad
              </button>
            </div>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">🗂 Historial de Actividades</p>
              <div className="list">
                {[1,2,3].map((i) => (
                  <div key={i} className="list-item">
                    <div>
                      <div className="item-title">8 de Noviembre, 2024</div>
                      <div className="item-meta">Desarrollo de módulo de reportes - 8 horas</div>
                    </div>
                    <span className="pill pill-blue">Registrado</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "Documentos" && (
          <>
            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">⬆️ Subir Documento</p>
              <p className="card-sub">Sube los documentos requeridos para tus prácticas</p>

              <div style={{ marginTop: 12 }}>
                <span className="label">Tipo de Documento</span>
                <select className="select">
                  <option>Seleccionar tipo...</option>
                  <option>Carta de Presentación</option>
                  <option>Reporte Semanal</option>
                  <option>Evaluación</option>
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <span className="label">Archivo</span>
                <div className="card" style={{ borderStyle:"dashed" }}>
                  <div className="card-pad" style={{ textAlign:"center", color:"var(--muted)" }}>
                    ⬆ Arrastra tu archivo aquí o haz clic para seleccionar
                  </div>
                </div>
              </div>

              <button className="btn btn-primary" style={{ marginTop: 14 }}>
                Subir Documento
              </button>
            </div>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">📚 Documentos Subidos</p>
              <div className="list">
                {mock.docs.map((d, i) => (
                  <div key={i} className="list-item">
                    <div className="item-left">
                      <div className="doc-icon">📄</div>
                      <div>
                        <div className="item-title">{d.name}</div>
                        <div className="item-meta">{d.date}</div>
                      </div>
                    </div>
                    <div className="actions">
                      <span className={`pill ${d.pillClass}`}>{d.status}</span>
                      <button className="icon-btn" type="button">⬇</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "Reportes" && (
          <>
            <div className="grid-3" style={{ gridTemplateColumns:"1fr 1fr", marginTop: 18 }}>
              <div className="card card-pad">
                <p className="card-title">📊 Generar Reporte</p>

                <div style={{ marginTop: 12 }}>
                  <span className="label">Tipo de Reporte</span>
                  <select className="select">
                    <option>Seleccionar tipo...</option>
                    <option>Reporte General</option>
                    <option>Horas</option>
                    <option>Documentos</option>
                  </select>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12, marginTop: 12 }}>
                  <div>
                    <span className="label">Fecha Inicio</span>
                    <input className="input" placeholder="dd/mm/aaaa" />
                  </div>
                  <div>
                    <span className="label">Fecha Fin</span>
                    <input className="input" placeholder="dd/mm/aaaa" />
                  </div>
                </div>

                <button className="btn btn-primary" style={{ marginTop: 14, width:"100%" }}>
                  Generar Reporte
                </button>
              </div>

              <div className="card card-pad">
                <p className="card-title">📈 Estadísticas</p>
                <div className="divider" />
                <div className="row"><span>Total de Horas:</span><b>320 hrs</b></div>
                <div className="row" style={{ marginTop: 10 }}><span>Documentos Subidos:</span><b>15</b></div>
                <div className="row" style={{ marginTop: 10 }}><span>Documentos Aprobados:</span><b>12</b></div>
                <div className="row" style={{ marginTop: 10 }}><span>Promedio Semanal:</span><b>40 hrs</b></div>
              </div>
            </div>
          </>
        )}

        {tab === "Perfil" && (
          <>
            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">👤 Información Personal</p>
              <div style={{ display:"flex", alignItems:"center", gap: 14, marginTop: 12 }}>
                <div style={{ width: 56, height:56, borderRadius:"999px", background:"#e2e8f0" }} />
                <button className="btn" type="button">Cambiar Foto</button>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 14, marginTop: 14 }}>
                <div>
                  <span className="label">Nombre Completo</span>
                  <input className="input" defaultValue={mock.nombre} />
                </div>
                <div>
                  <span className="label">Número de Control</span>
                  <input className="input" defaultValue="2021030456" />
                </div>
                <div>
                  <span className="label">Carrera</span>
                  <input className="input" defaultValue="Ingeniería en Sistemas Computacionales" />
                </div>
                <div>
                  <span className="label">Semestre</span>
                  <input className="input" defaultValue="8vo Semestre" />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <span className="label">Correo Electrónico</span>
                <input className="input" defaultValue="maria.gonzalez@universidad.edu" />
              </div>

              <button className="btn btn-primary" style={{ marginTop: 14 }}>
                Actualizar Información
              </button>
            </div>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">🏢 Información de Prácticas</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 14, marginTop: 14 }}>
                <div>
                  <span className="label">Empresa</span>
                  <input className="input" defaultValue="TechSolutions S.A. de C.V." />
                </div>
                <div>
                  <span className="label">Supervisor</span>
                  <input className="input" defaultValue="Ing. Carlos Ramírez" />
                </div>
                <div>
                  <span className="label">Fecha de Inicio</span>
                  <input className="input" defaultValue="15 de Agosto, 2024" />
                </div>
                <div>
                  <span className="label">Fecha de Término</span>
                  <input className="input" defaultValue="15 de Diciembre, 2024" />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
