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

function TopbarReviewer() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-left">
          <div className="brand-icon">🏫</div>
          <div>
            <div className="brand-title">Panel Administrativo</div>
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

export default function ReviewPanel() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("Resumen");
  const tabs = useMemo(() => ["Resumen","Estudiantes","Documentos","Reportes","Configuración"], []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href="/"; return; }

    apiGet("/auth/me", token)
      .then((m) => {
        if (m.role !== "REVIEWER" && m.role !== "TENANT_ADMIN") {
          throw new Error("Acceso solo para Revisor / Área.");
        }
        setMe(m);
      })
      .catch(() => window.location.href="/");
  }, []);

  const mock = {
    kpis: [
      { title:"Total Estudiantes", value:"156", sub:"+12% desde el mes pasado", icon:"👥" },
      { title:"Prácticas Activas", value:"89", sub:"+5% desde el mes pasado", icon:"🗓" },
      { title:"Documentos Pendientes", value:"23", sub:"-8% desde la semana pasada", icon:"📄" },
      { title:"Prácticas Completadas", value:"67", sub:"+23% desde el mes pasado", icon:"✅" },
    ],
    pendientes: [
      { title:"Reporte Semanal #12", alumno:"María González Pérez", meta:"Reporte • 5 Nov 2024", urgent:true },
      { title:"Evaluación Mensual", alumno:"Carlos Rodríguez López", meta:"Evaluación • 3 Nov 2024" },
      { title:"Carta de Presentación", alumno:"Ana Martínez Silva", meta:"Documento • 1 Nov 2024" },
    ],
    estudiantes: [
      { initials:"MGP", name:"María González Pérez", meta:"2021030456 • Ing. Sistemas", pct:"67% completado", docs:"2 documentos pendientes" },
      { initials:"CRL", name:"Carlos Rodríguez López", meta:"2021030457 • Ing. Industrial", pct:"45% completado", docs:"1 documento pendiente" },
      { initials:"AMS", name:"Ana Martínez Silva", meta:"2021030458 • Ing. Civil", pct:"89% completado", docs:"0 documentos pendientes" },
    ]
  };

  return (
    <>
      <TopbarReviewer />
      <main className="container">
        <h1 className="h1">Panel de Control</h1>
        <p className="p-muted">Gestiona estudiantes, prácticas y documentos</p>

        <Tabs value={tab} onChange={setTab} items={tabs} />

        {tab === "Resumen" && (
          <>
            <div className="grid-3" style={{ gridTemplateColumns:"repeat(4, 1fr)" }}>
              {mock.kpis.map((k, i) => (
                <div key={i} className="card card-pad">
                  <div className="row">
                    <div style={{ fontWeight:800 }}>{k.title}</div>
                    <div style={{ color:"var(--muted)" }}>{k.icon}</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, marginTop: 10 }}>{k.value}</div>
                  <div className="card-sub">{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 16, marginTop: 16 }}>
              <div className="card card-pad">
                <p className="card-title">📌 Documentos Pendientes de Revisión</p>
                <p className="card-sub">Documentos que requieren tu atención</p>
                <div className="list">
                  {mock.pendientes.map((p, i) => (
                    <div key={i} className="list-item">
                      <div className="item-left">
                        <div className="doc-icon">📄</div>
                        <div>
                          <div className="item-title">{p.title}</div>
                          <div className="item-meta">{p.alumno} • {p.meta}</div>
                        </div>
                      </div>
                      <div className="actions">
                        {p.urgent ? <span className="pill pill-red">Urgente</span> : null}
                        <button className="btn" type="button">👁 Ver</button>
                        <button className="btn btn-primary" type="button">✓ Aprobar</button>
                        <button className="btn" type="button">✕ Rechazar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card card-pad">
                <p className="card-title">🧑‍🎓 Estudiantes Recientes</p>
                <p className="card-sub">Últimos estudiantes registrados</p>
                <div className="list">
                  {mock.estudiantes.slice(0,2).map((s, i) => (
                    <div key={i} className="list-item">
                      <div className="item-left">
                        <div style={{ width:36, height:36, borderRadius:"999px", background:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900 }}>
                          {s.initials}
                        </div>
                        <div>
                          <div className="item-title">{s.name}</div>
                          <div className="item-meta">{s.meta}</div>
                        </div>
                      </div>
                      <span className="pill pill-blue">Activo</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "Estudiantes" && (
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div className="row">
              <div>
                <p className="card-title">Gestión de Estudiantes</p>
                <p className="card-sub">Administra los estudiantes y sus prácticas</p>
              </div>
              <button className="btn btn-primary" type="button">＋ Nuevo Estudiante</button>
            </div>

            <div className="row" style={{ marginTop: 14 }}>
              <input className="input" placeholder="Buscar estudiantes..." />
              <div className="actions">
                <button className="btn" type="button">🔎 Filtros</button>
                <button className="btn" type="button">⬇ Exportar</button>
              </div>
            </div>

            <div className="list" style={{ marginTop: 14 }}>
              {mock.estudiantes.map((s, i) => (
                <div key={i} className="list-item">
                  <div className="item-left">
                    <div style={{ width:36, height:36, borderRadius:"999px", background:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900 }}>
                      {s.initials}
                    </div>
                    <div>
                      <div className="item-title">{s.name}</div>
                      <div className="item-meta">{s.meta}</div>
                    </div>
                  </div>
                  <div className="actions">
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:900 }}>{s.pct}</div>
                      <div className="item-meta">{s.docs}</div>
                    </div>
                    <span className="pill pill-blue">Activo</span>
                    <button className="icon-btn" type="button">👁</button>
                    <button className="icon-btn" type="button">✎</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Documentos" && (
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <p className="card-title">Revisión de Documentos</p>
            <p className="card-sub">Revisa y aprueba documentos de estudiantes</p>

            <div className="list" style={{ marginTop: 14 }}>
              {mock.pendientes.map((p, i) => (
                <div key={i} className="list-item">
                  <div className="item-left">
                    <div className="doc-icon">📄</div>
                    <div>
                      <div className="item-title">{p.title}</div>
                      <div className="item-meta">{p.alumno} • {p.meta}</div>
                    </div>
                  </div>
                  <div className="actions">
                    {p.urgent ? <span className="pill pill-red">Urgente</span> : null}
                    <button className="btn" type="button">👁 Ver</button>
                    <button className="btn btn-primary" type="button">✓ Aprobar</button>
                    <button className="btn" type="button">✕ Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Reportes" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 16, marginTop: 16 }}>
            <div className="card card-pad">
              <p className="card-title">Generar Reportes</p>

              <div style={{ marginTop: 12 }}>
                <span className="label">Tipo de Reporte</span>
                <select className="select">
                  <option>Reporte General de Estudiantes</option>
                  <option>Documentos procesados</option>
                  <option>Prácticas activas</option>
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
                📊 Generar Reporte
              </button>
            </div>

            <div className="card card-pad">
              <p className="card-title">Estadísticas del Sistema</p>
              <div className="divider" />
              <div className="row"><span>Estudiantes Activos:</span><b>89</b></div>
              <div className="row" style={{ marginTop: 10 }}><span>Documentos Procesados:</span><b>1,247</b></div>
              <div className="row" style={{ marginTop: 10 }}><span>Empresas Colaboradoras:</span><b>45</b></div>
              <div className="row" style={{ marginTop: 10 }}><span>Tasa de Aprobación:</span><b>94.2%</b></div>
            </div>
          </div>
        )}

        {tab === "Configuración" && (
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <p className="card-title">Configuración del Sistema</p>
            <p className="card-sub">Administra la configuración general del sistema</p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 14, marginTop: 14 }}>
              <div>
                <span className="label">Nombre de la Institución</span>
                <input className="input" defaultValue="Universidad Tecnológica" />
              </div>
              <div>
                <span className="label">Año Académico</span>
                <input className="input" defaultValue="2024-2025" />
              </div>
              <div>
                <span className="label">Horas mínimas de prácticas</span>
                <input className="input" defaultValue="480" />
              </div>
              <div>
                <span className="label">Duración Máxima (meses)</span>
                <input className="input" defaultValue="6" />
              </div>
            </div>

            <div className="divider" />

            <p className="card-title">Notificaciones</p>
            <div style={{ display:"grid", gap: 12, marginTop: 10 }}>
              <label className="row" style={{ justifyContent:"flex-start", gap: 10 }}>
                <input type="checkbox" defaultChecked />
                <div>
                  <b>Recordatorios de documentos</b>
                  <div className="item-meta">Enviar recordatorios automáticos</div>
                </div>
              </label>
              <label className="row" style={{ justifyContent:"flex-start", gap: 10 }}>
                <input type="checkbox" defaultChecked />
                <div>
                  <b>Notificaciones por email</b>
                  <div className="item-meta">Enviar notificaciones por correo</div>
                </div>
              </label>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 14 }}>
              Guardar Configuración
            </button>
          </div>
        )}
      </main>
    </>
  );
}
