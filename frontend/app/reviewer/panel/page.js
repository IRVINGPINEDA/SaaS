"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiUpload } from "../../lib/api";
import { clearToken, getToken } from "../../lib/token";

function logout() {
  clearToken("admin");
  window.location.href = "/";
}

const statusMap = {
  PENDING: { label: "Pendiente", pill: "pill-gray" },
  OBSERVED: { label: "Observado", pill: "pill-blue" },
  APPROVED: { label: "Aprobado", pill: "pill-green" },
  REJECTED: { label: "Rechazado", pill: "pill-red" },
};

function IconButton({ children, badge, onClick }) {
  return (
    <button className="icon-btn" onClick={onClick} type="button">
      {children}
      {badge ? <span className="badge-dot">{badge}</span> : null}
    </button>
  );
}

function TopbarReviewer({
  title = "Panel del Revisor",
  onLogout,
  photoUrl,
  userName = "Revisor",
  roleLabel = "Area de revision",
}) {
  const initial = (userName || "R").trim().charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-left">
          <div className="brand-icon" aria-hidden="true">
            {photoUrl ? <img src={photoUrl} alt="" /> : "R"}
          </div>
          <div>
            <div className="brand-title">{title}</div>
            <div className="brand-subtitle">Area de practicas / servicio social</div>
          </div>
        </div>

        <div className="topbar-center">
          <label className="topbar-search">
            <span className="topbar-search-icon" aria-hidden="true" />
            <input type="search" aria-label="Buscar en el panel" placeholder="Buscar alumnos o documentos" />
          </label>
        </div>

        <div className="topbar-actions">
          <IconButton onClick={() => {}}>Noti</IconButton>
          <IconButton onClick={() => {}}>Perfil</IconButton>
          <IconButton onClick={onLogout}>Salir</IconButton>
          <div className="topbar-user">
            {photoUrl ? <img className="topbar-avatar-photo" src={photoUrl} alt="" /> : <span className="topbar-avatar">{initial}</span>}
            <div className="topbar-user-meta">
              <div className="topbar-user-name">{userName}</div>
              <div className="topbar-user-role">{roleLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Tabs({ value, onChange, items, variant = "top", header = null }) {
  const cls = `tabs ${variant === "side" ? "tabs-side" : ""}`;
  return (
    <div className={cls}>
      {variant === "side" && header ? <div className="sidebar-head">{header}</div> : null}
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

function normalizeTabName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default function ReviewerPanel() {
  const [tab, setTab] = useState("Resumen");
  const tabs = useMemo(() => ["Resumen", "Pendientes", "Grupos", "Reportes", "Configuración"], []);

  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [docs, setDocs] = useState([]);
  const [studentsOverview, setStudentsOverview] = useState([]);
  const [careerQuery, setCareerQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [selectedCareer, setSelectedCareer] = useState(null); // string | null
  const [selectedGroup, setSelectedGroup] = useState(null); // string | null

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [viewer, setViewer] = useState(null); // { url, title }
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [comment, setComment] = useState("");
  const [filters, setFilters] = useState({ type: "", student: "", status: "" });

  const [photoInfo, setPhotoInfo] = useState(null); // { status, url?, created_at?, reviewed_at?, review_comment? }
  const [photoFile, setPhotoFile] = useState(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const [progressByStudent, setProgressByStudent] = useState({}); // { [id]: { practicas_percent, servicio_percent } }
  const [progressGroupError, setProgressGroupError] = useState("");

  const showToast = (message, variant = "success") => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (!requestedTab) return;

    const requestedNorm = normalizeTabName(requestedTab);
    const match = tabs.find((it) => normalizeTabName(it) === requestedNorm);
    if (match && match !== tab) setTab(match);
  }, [tabs, tab]);

  const loadStats = async ({ silent = false } = {}) => {
    const token = getToken("admin");
    if (!token) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await apiGet("/documents/stats", token);
      setStats(data);
    } catch (e) {
      setError(e.message || "Error al cargar resumen.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadDocs = async ({ silent = false } = {}) => {
    const token = getToken("admin");
    if (!token) return;
    if (!silent) setIsLoading(true);
    try {
      const items = await apiGet("/documents/pending", token);
      setDocs(items || []);
    } catch (e) {
      setError(e.message || "Error al cargar documentos.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadStudentsOverview = async ({ silent = false } = {}) => {
    const token = getToken("admin");
    if (!token) return;
    if (!silent) setIsLoading(true);
    try {
      const items = await apiGet("/users/students/overview", token);
      setStudentsOverview(items || []);
    } catch (e) {
      setError(e.message || "Error al cargar grupos.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadAll = async ({ silent = false } = {}) => {
    await Promise.all([loadStats({ silent }), loadDocs({ silent })]);
  };

  const loadPhoto = async () => {
    const token = getToken("admin");
    if (!token) return;
    setPhotoError("");
    try {
      const info = await apiGet("/users/me/photo", token);
      setPhotoInfo(info);
    } catch (e) {
      setPhotoError(e.message || "Error al cargar foto.");
    }
  };

  useEffect(() => {
    const token = getToken("admin");
    if (!token) { window.location.href = "/"; return; }

    apiGet("/auth/me", token)
      .then((m) => {
        if (m.role !== "REVIEWER" && m.role !== "TENANT_ADMIN") {
          throw new Error("Acceso solo para REVISOR / Área de prácticas.");
        }
        setMe(m);
        return Promise.all([
          loadAll(),
          m.role === "REVIEWER" ? loadPhoto() : Promise.resolve(),
        ]);
      })
      .catch((e) => setError(e.message || "Error"));
  }, []);

  useEffect(() => {
    if (tab !== "Configuración") return;
    if (me?.role !== "REVIEWER") return;
    loadPhoto();
  }, [tab, me]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      loadAll({ silent: true });
      if (tab === "Grupos") loadStudentsOverview({ silent: true });
    };
    const intervalId = window.setInterval(tick, 6000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "Grupos") return;
    loadStudentsOverview();
  }, [tab]);

  useEffect(() => {
    if (tab !== "Grupos") return;
    if (!selectedCareer || !selectedGroup) return;
    const ids = studentsOverview
      .filter((s) => {
        const c = String(s.category || "Sin carrera").trim() || "Sin carrera";
        const g = String(s.group_name || "Sin grupo").trim() || "Sin grupo";
        return c === selectedCareer && g === selectedGroup;
      })
      .map((s) => s.id);
    if (ids.length === 0) { setProgressByStudent({}); return; }
    loadGroupProgress(ids);
  }, [tab, selectedCareer, selectedGroup, studentsOverview]);

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      const matchesType = !filters.type || doc.doc_type === filters.type;
      const studentName = `${doc.student?.full_name || ""} ${doc.student?.matricula || ""}`.toLowerCase();
      const matchesStudent = !filters.student || studentName.includes(filters.student.toLowerCase());
      const matchesStatus = !filters.status || doc.status === filters.status;
      return matchesType && matchesStudent && matchesStatus;
    });
  }, [docs, filters]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(docs.map((doc) => doc.doc_type))).sort();
  }, [docs]);

  const careers = useMemo(() => {
    const map = new Map();
    for (const s of studentsOverview) {
      const c = String(s.category || "Sin carrera").trim() || "Sin carrera";
      if (!map.has(c)) {
        map.set(c, { name: c, counts: { total: 0, pending: 0, observed: 0, approved: 0, rejected: 0 } });
      }
      const entry = map.get(c);
      entry.counts.total += 1;
      entry.counts.pending += Number(s.pending || 0);
      entry.counts.observed += Number(s.observed || 0);
      entry.counts.approved += Number(s.approved || 0);
      entry.counts.rejected += Number(s.rejected || 0);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [studentsOverview]);

  const filteredCareers = useMemo(() => {
    const q = (careerQuery || "").trim().toLowerCase();
    if (!q) return careers;
    return careers.filter((c) => c.name.toLowerCase().includes(q));
  }, [careers, careerQuery]);

  const groupsInCareer = useMemo(() => {
    if (!selectedCareer) return [];
    const map = new Map();
    for (const s of studentsOverview) {
      const c = String(s.category || "Sin carrera").trim() || "Sin carrera";
      if (c !== selectedCareer) continue;
      const g = String(s.group_name || "Sin grupo").trim() || "Sin grupo";
      if (!map.has(g)) {
        map.set(g, { name: g, counts: { total: 0, pending: 0, observed: 0, approved: 0, rejected: 0 } });
      }
      const entry = map.get(g);
      entry.counts.total += 1;
      entry.counts.pending += Number(s.pending || 0);
      entry.counts.observed += Number(s.observed || 0);
      entry.counts.approved += Number(s.approved || 0);
      entry.counts.rejected += Number(s.rejected || 0);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [studentsOverview, selectedCareer]);

  const filteredGroups = useMemo(() => {
    const q = (groupQuery || "").trim().toLowerCase();
    if (!q) return groupsInCareer;
    return groupsInCareer.filter((g) => g.name.toLowerCase().includes(q));
  }, [groupsInCareer, groupQuery]);

  const currentStudents = useMemo(() => {
    if (!selectedCareer || !selectedGroup) return [];
    return studentsOverview.filter((s) => {
      const c = String(s.category || "Sin carrera").trim() || "Sin carrera";
      const g = String(s.group_name || "Sin grupo").trim() || "Sin grupo";
      return c === selectedCareer && g === selectedGroup;
    });
  }, [studentsOverview, selectedCareer, selectedGroup]);

  const loadGroupProgress = async (ids) => {
    const token = getToken("admin");
    if (!token) return;
    setProgressGroupError("");
    try {
      const data = await apiPost("/progress/students/batch", { student_ids: ids }, token);
      const next = {};
      for (const it of (data?.items || [])) {
        next[it.student_user_id] = {
          practicas_percent: it.practicas_percent,
          servicio_percent: it.servicio_percent,
        };
      }
      setProgressByStudent(next);
    } catch (e) {
      setProgressGroupError(e.message || "No se pudo cargar el progreso del grupo.");
    }
  };

  const overviewStatusInfo = (s) => {
    const st = s?.platform_status || "NONE";
    if (st === "PENDING") return { label: "Pendiente", pill: "pill-gray" };
    if (st === "OBSERVED") return { label: "Observado", pill: "pill-blue" };
    if (st === "APPROVED") return { label: "Aprobado", pill: "pill-green" };
    if (st === "REJECTED") return { label: "Rechazado", pill: "pill-red" };
    return { label: "Sin documentos", pill: "pill-gray" };
  };

  const handleOpen = async (docId, title = "Documento") => {
    const token = getToken("admin");
    if (!token) return;
    try {
      const { url } = await apiGet(`/documents/${docId}/download`, token);
      setViewer({ url, title });
    } catch (e) {
      showToast(e.message || "No se pudo abrir el documento.", "error");
    }
  };

  const handleDecision = async (decision) => {
    if (!selectedDoc) return;
    const token = getToken("admin");
    if (!token) return;
    try {
      await apiPost(`/documents/${selectedDoc.id}/review`, { decision, comment: comment || null }, token);
      showToast("Revisión guardada.");
      setSelectedDoc(null);
      setComment("");
      await loadAll({ silent: true });
    } catch (e) {
      showToast(e.message || "No se pudo guardar la decisión.", "error");
    }
  };

  const approvedPhotoUrl = photoInfo?.status === "APPROVED" ? photoInfo.url : null;

  return (
    <>
      <TopbarReviewer
        onLogout={logout}
        photoUrl={approvedPhotoUrl}
        userName={me?.full_name || "Revisor"}
        roleLabel={me?.role === "TENANT_ADMIN" ? "Admin del tenant" : "Revisor"}
      />
      <main className="container">
        <h1 className="h1">Panel</h1>
        <p className="p-muted">Gestiona documentos del alumnado en tu institución.</p>

        <div className="tabs-shell">
          <Tabs
            value={tab}
            onChange={setTab}
            items={tabs}
            variant="side"
            header={(
              <div className="sidebar-brand" aria-label="Panel del revisor">
                <div className="sidebar-brand-icon" aria-hidden="true">R</div>
                <div>
                  <div className="sidebar-brand-title">Panel del Revisor</div>
                  <div className="sidebar-brand-sub">Revision</div>
                </div>
              </div>
            )}
          />
          <div className="tabs-panel">
            {error && <div className="alert alert-error" style={{ marginTop: 0 }}>{error}</div>}

            {tab === "Resumen" && (
              <>
            {!me ? (
              <div style={{ color: "var(--muted)", marginTop: 12 }}>Cargando...</div>
            ) : (
              <div className="card card-pad" style={{ marginTop: 16 }}>
                <div className="row" style={{ alignItems: "center" }}>
                  <div>
                    <p className="card-title" style={{ marginBottom: 6 }}>Tu sesión</p>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{me.full_name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>{me.role}</div>
                  </div>
                  <div className="btn-row">
                    <button className="btn" type="button" onClick={() => setTab("Pendientes")}>Ir a Pendientes</button>
                    <button className="btn btn-primary" type="button" onClick={() => loadAll()} disabled={isLoading}>
                      {isLoading ? "Cargando..." : "Recargar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid-3">
              <div className="card card-pad">
                <p className="card-title">Pendientes</p>
                <div className="divider" />
                <div style={{ fontSize: 28, fontWeight: 900 }}>{stats?.pending ?? "-"}</div>
                <div className="card-sub">Por revisar</div>
              </div>
              <div className="card card-pad">
                <p className="card-title">Observados</p>
                <div className="divider" />
                <div style={{ fontSize: 28, fontWeight: 900 }}>{stats?.observed ?? "-"}</div>
                <div className="card-sub">Con correcciones</div>
              </div>
              <div className="card card-pad">
                <p className="card-title">Aprobados hoy</p>
                <div className="divider" />
                <div style={{ fontSize: 28, fontWeight: 900 }}>{stats?.approved_today ?? "-"}</div>
                <div className="card-sub">Revisados hoy</div>
              </div>
            </div>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <div className="row" style={{ alignItems: "center" }}>
                <div>
                  <p className="card-title">Bandeja rápida</p>
                  <p className="card-sub">Últimos pendientes/observados.</p>
                </div>
                <button className="btn" type="button" onClick={() => setTab("Pendientes")}>Ver todo</button>
              </div>

              {docs.length === 0 ? (
                <div style={{ color: "var(--muted)", marginTop: 12 }}>No hay documentos por revisar.</div>
              ) : (
                <div className="table-wrap"><table className="table">
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Documento</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.slice(0, 5).map((doc) => {
                      const info = statusMap[doc.status] || statusMap.PENDING;
                      return (
                        <tr key={doc.id}>
                          <td>
                            <div style={{ fontWeight: 800 }}>{doc.student?.full_name || "Alumno"}</div>
                            <div style={{ color: "var(--muted)", fontSize: 12 }}>{doc.student?.matricula || "-"}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 800 }}>{doc.doc_type}</div>
                            <div style={{ color: "var(--muted)", fontSize: 12 }}>{doc.filename}</div>
                          </td>
                          <td><span className={`pill ${info.pill}`}>{info.label}</span></td>
                          <td>
                            <div className="btn-row">
                              <button className="btn" type="button" onClick={() => handleOpen(doc.id, doc.filename)}>Ver</button>
                              <button className="btn btn-primary" type="button" onClick={() => { setSelectedDoc(doc); setComment(doc.comment || ""); }}>Revisar</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              )}
            </div>
          </>
        )}

        {tab === "Pendientes" && (
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div className="row" style={{ alignItems: "center" }}>
              <div>
                <p className="card-title">Pendientes / Observados</p>
                <p className="card-sub">Revisa y decide en el mismo panel.</p>
              </div>
              <button className="btn" type="button" onClick={() => loadAll()} disabled={isLoading}>
                {isLoading ? "Cargando..." : "Recargar"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
              <div>
                <span className="label">Tipo</span>
                <select
                  className="select"
                  value={filters.type}
                  onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
                >
                  <option value="">Todos</option>
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="label">Alumno</span>
                <input
                  className="input"
                  placeholder="Nombre o matrícula"
                  value={filters.student}
                  onChange={(event) => setFilters((prev) => ({ ...prev, student: event.target.value }))}
                />
              </div>
              <div>
                <span className="label">Estado</span>
                <select
                  className="select"
                  value={filters.status}
                  onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="OBSERVED">Observado</option>
                </select>
              </div>
            </div>

            {filteredDocs.length === 0 ? (
              <div style={{ color: "var(--muted)", marginTop: 12 }}>No hay documentos con esos filtros.</div>
            ) : (
              <div className="table-wrap"><table className="table">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Documento</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => {
                    const info = statusMap[doc.status] || statusMap.PENDING;
                    return (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ fontWeight: 800 }}>{doc.student?.full_name || "Alumno"}</div>
                          <div style={{ color: "var(--muted)", fontSize: 12 }}>{doc.student?.matricula || "-"}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800 }}>{doc.doc_type}</div>
                          <div style={{ color: "var(--muted)", fontSize: 12 }}>{doc.filename}</div>
                        </td>
                        <td><span className={`pill ${info.pill}`}>{info.label}</span></td>
                        <td>{new Date(doc.created_at).toLocaleString()}</td>
                        <td>
                          <div className="btn-row">
                            <button className="btn" type="button" onClick={() => handleOpen(doc.id, doc.filename)}>Ver</button>
                            <button className="btn btn-primary" type="button" onClick={() => { setSelectedDoc(doc); setComment(doc.comment || ""); }}>Revisar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            )}
          </div>
        )}

        {tab === "Grupos" && (
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div className="row" style={{ alignItems: "center" }}>
              <div>
                <p className="card-title">Carreras y grupos</p>
                <p className="card-sub">Explora por carrera ? grupo ? alumnos y su estatus.</p>
              </div>
              <div className="btn-row">
                {selectedGroup ? (
                  <button className="btn" type="button" onClick={() => setSelectedGroup(null)}>
                    Volver a grupos
                  </button>
                ) : null}
                {selectedCareer ? (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setSelectedGroup(null);
                      setSelectedCareer(null);
                      setGroupQuery("");
                    }}
                  >
                    Volver a carreras
                  </button>
                ) : null}
                <button className="btn btn-primary" type="button" onClick={() => loadStudentsOverview()} disabled={isLoading}>
                  {isLoading ? "Cargando..." : "Recargar"}
                </button>
              </div>
            </div>

            {!selectedCareer ? (
              <>
                <div className="divider" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  <div>
                    <span className="label">Buscar carrera</span>
                    <input className="input" value={careerQuery} onChange={(e) => setCareerQuery(e.target.value)} placeholder="Ej. Ciencias de Datos" />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {filteredCareers.length === 0 ? (
                    <div style={{ color: "var(--muted)" }}>No hay carreras.</div>
                  ) : (
                    filteredCareers.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        className="card card-pad"
                        style={{ textAlign: "left", cursor: "pointer" }}
                        onClick={() => {
                          setSelectedCareer(c.name);
                          setSelectedGroup(null);
                          setGroupQuery("");
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: 16 }}>{c.name}</div>
                        <div className="card-sub" style={{ marginTop: 6 }}>
                          Alumnos: <b>{c.counts.total}</b>
                        </div>
                        <div className="btn-row" style={{ marginTop: 10 }}>
                          <span className="pill pill-gray">Pendientes: {c.counts.pending}</span>
                          <span className="pill pill-blue">Observados: {c.counts.observed}</span>
                          <span className="pill pill-green">Aprobados: {c.counts.approved}</span>
                          <span className="pill pill-red">Rechazados: {c.counts.rejected}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : !selectedGroup ? (
              <>
                <div className="divider" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  <div>
                    <span className="label">Carrera seleccionada</span>
                    <div style={{ fontWeight: 900 }}>{selectedCareer}</div>
                  </div>
                  <div>
                    <span className="label">Buscar grupo</span>
                    <input className="input" value={groupQuery} onChange={(e) => setGroupQuery(e.target.value)} placeholder="Ej. 5A, Grupo A..." />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {filteredGroups.length === 0 ? (
                    <div style={{ color: "var(--muted)" }}>No hay grupos en esta carrera.</div>
                  ) : (
                    filteredGroups.map((g) => (
                      <button
                        key={g.name}
                        type="button"
                        className="card card-pad"
                        style={{ textAlign: "left", cursor: "pointer" }}
                        onClick={() => setSelectedGroup(g.name)}
                      >
                        <div style={{ fontWeight: 900, fontSize: 16 }}>{g.name}</div>
                        <div className="card-sub" style={{ marginTop: 6 }}>
                          Alumnos: <b>{g.counts.total}</b>
                        </div>
                        <div className="btn-row" style={{ marginTop: 10 }}>
                          <span className="pill pill-gray">Pendientes: {g.counts.pending}</span>
                          <span className="pill pill-blue">Observados: {g.counts.observed}</span>
                          <span className="pill pill-green">Aprobados: {g.counts.approved}</span>
                          <span className="pill pill-red">Rechazados: {g.counts.rejected}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="divider" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  <div>
                    <span className="label">Carrera</span>
                    <div style={{ fontWeight: 900 }}>{selectedCareer}</div>
                  </div>
                  <div>
                    <span className="label">Grupo</span>
                    <div style={{ fontWeight: 900 }}>{selectedGroup}</div>
                  </div>
                </div>

                {currentStudents.length === 0 ? (
                  <div style={{ color: "var(--muted)", marginTop: 12 }}>No hay alumnos en este grupo.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="table" style={{ minWidth: 980 }}>
                      <thead>
                        <tr>
                          <th>Alumno</th>
                          <th>Matricula</th>
                          <th>Estatus</th>
                          <th>Docs</th>
                          <th>Progreso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentStudents
                          .slice()
                          .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
                          .map((s) => {
                            const info = overviewStatusInfo(s);
                            const pr = progressByStudent?.[s.id] || null;
                            const pPct = typeof pr?.practicas_percent === "number" ? pr.practicas_percent : null;
                            const sPct = typeof pr?.servicio_percent === "number" ? pr.servicio_percent : null;
                            return (
                              <tr key={s.id}>
                                <td>
                                  <div style={{ fontWeight: 800 }}>{s.full_name}</div>
                                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                                    {s.is_active ? "Activo" : "Inactivo"}
                                  </div>
                                </td>
                                <td style={{ color: "var(--muted)" }}>{s.matricula || "-"}</td>
                                <td>
                                  <span className={`pill ${info.pill}`}>{info.label}</span>
                                </td>
                                <td style={{ color: "var(--muted)", fontSize: 13 }}>
                                  Total: <b>{s.docs_total}</b> ? P: <b>{s.pending}</b> ? O: <b>{s.observed}</b> ? A: <b>{s.approved}</b> ? R: <b>{s.rejected}</b>
                                </td>
                                <td style={{ minWidth: 220 }}>
                                  {progressGroupError ? (
                                    <span style={{ color: "#b91c1c" }}>Error</span>
                                  ) : (
                                    <div style={{ display: "grid", gap: 8 }}>
                                      <div>
                                        <div className="progress-row">
                                          <span style={{ color: "var(--muted)", fontSize: 12 }}>Prácticas</span>
                                          <span style={{ color: "var(--muted)", fontSize: 12 }}>{pPct === null ? "-" : `${pPct}%`}</span>
                                        </div>
                                        <div className="progress" style={{ marginTop: 6, height: 10 }}>
                                          <span style={{ width: `${pPct === null ? 0 : pPct}%` }} />
                                        </div>
                                      </div>
                                      <div>
                                        <div className="progress-row">
                                          <span style={{ color: "var(--muted)", fontSize: 12 }}>Servicio</span>
                                          <span style={{ color: "var(--muted)", fontSize: 12 }}>{sPct === null ? "-" : `${sPct}%`}</span>
                                        </div>
                                        <div className="progress" style={{ marginTop: 6, height: 10 }}>
                                          <span style={{ width: `${sPct === null ? 0 : sPct}%` }} />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "Reportes" && (
          <div className="card card-pad" style={{ marginTop: 0 }}>
            <p className="card-title">Reportes</p>
            <p className="card-sub">Sprint siguiente: exportación y estadísticas avanzadas.</p>
          </div>
        )}

        {tab === "Configuración" && (
          <div className="card card-pad" style={{ marginTop: 0 }}>
            <p className="card-title">Configuración</p>
            <p className="card-sub">Sube tu foto. Queda pendiente hasta aprobación del administrador.</p>

            {me && me.role !== "REVIEWER" ? (
              <div style={{ color: "var(--muted)", marginTop: 12 }}>
                Solo los revisores pueden subir foto.
              </div>
            ) : (
              <>
                {photoError ? <div className="alert alert-error" style={{ marginTop: 12 }}>{photoError}</div> : null}

                <div style={{ display: "grid", gap: 12, marginTop: 12, maxWidth: 560 }}>
                  <div className="row">
                    <span>Estado:</span>
                    {(() => {
                      const info = photoInfo?.status && statusMap[photoInfo.status]
                        ? statusMap[photoInfo.status]
                        : { label: "Sin foto", pill: "pill-gray" };
                      return <span className={`pill ${info.pill}`}>{info.label}</span>;
                    })()}
                  </div>

                  {photoInfo?.url ? (
                    <div className="card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
                      <img
                        src={photoInfo.url}
                        alt="Foto del revisor"
                        style={{ width: 72, height: 72, borderRadius: 14, objectFit: "cover", border: "1px solid var(--border)", background: "#fff" }}
                      />
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>
                        {photoInfo?.status === "PENDING" ? "En revisión por el administrador." : null}
                        {photoInfo?.status === "APPROVED" ? "Aprobada." : null}
                        {photoInfo?.status === "REJECTED" ? "Rechazada. Puedes subir una nueva." : null}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>Aún no has subido una foto.</div>
                  )}

                  <div>
                    <span className="label">Nueva foto</span>
                    <input
                      className="input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    />
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                      Formatos: JPG/PNG/WebP. Recomendado: 512x512.
                    </div>
                  </div>

                  <div className="btn-row">
                    <button className="btn" type="button" onClick={loadPhoto} disabled={isSavingPhoto}>
                      Recargar
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={!photoFile || isSavingPhoto}
                      onClick={async () => {
                        const token = getToken("admin");
                        if (!token) return;
                        if (!photoFile) return;
                        setIsSavingPhoto(true);
                        setPhotoError("");
                        try {
                          const fd = new FormData();
                          fd.append("file", photoFile);
                          await apiUpload("/users/me/photo", fd, token);
                          setPhotoFile(null);
                          await loadPhoto();
                          showToast("Foto enviada para aprobación.");
                        } catch (e) {
                          setPhotoError(e.message || "No se pudo subir la foto.");
                        } finally {
                          setIsSavingPhoto(false);
                        }
                      }}
                    >
                      {isSavingPhoto ? "Subiendo..." : "Subir para aprobación"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
          </div>
        </div>
      </main>

      {selectedDoc && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="row" style={{ alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>Revisión</h2>
              <button className="btn btn-primary" type="button" onClick={() => { setSelectedDoc(null); setComment(""); }}>
                Cerrar
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800 }}>{selectedDoc.doc_type}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{selectedDoc.filename}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {selectedDoc.student?.full_name} · {selectedDoc.student?.matricula}
              </div>
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button className="btn" type="button" onClick={() => handleOpen(selectedDoc.id, selectedDoc.filename)}>Ver PDF</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <span className="label">Comentario</span>
              <textarea
                className="textarea"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Agrega observaciones para el alumno"
              />
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={() => handleDecision("APPROVED")}>Aprobar</button>
              <button className="btn" onClick={() => handleDecision("REJECTED")}>Rechazar</button>
              <button className="btn" onClick={() => handleDecision("OBSERVED")}>Observar</button>
            </div>
          </div>
        </div>
      )}

      {viewer && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-lg">
            <div className="row" style={{ alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>Vista previa</h2>
              <div className="btn-row">
                <a className="btn" href={viewer.url} target="_blank" rel="noreferrer">Abrir en pestaña</a>
                <button className="btn btn-primary" onClick={() => setViewer(null)}>Cerrar</button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700 }}>{viewer.title}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                Si no carga aquí, abre en pestaña.
              </div>
            </div>

            <iframe
              title={viewer.title}
              src={viewer.url}
              style={{
                width: "100%",
                height: "70vh",
                border: "1px solid var(--border)",
                borderRadius: 12,
                marginTop: 12,
                background: "#fff",
              }}
            />
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.variant === "error" ? "toast-error" : "toast-success"}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}


