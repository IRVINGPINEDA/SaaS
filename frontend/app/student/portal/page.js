"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiUpload } from "../../lib/api";
import { clearToken, getToken } from "../../lib/token";

function logout() {
  clearToken("student");
  window.location.href = "/";
}

function IconButton({ children, badge, onClick, abbr = null, ariaLabel = null }) {
  const label = typeof children === "string" ? children : null;
  return (
    <button className="icon-btn" onClick={onClick} type="button" aria-label={ariaLabel || label || undefined}>
      {abbr ? <span className="icon-btn-abbr" aria-hidden="true">{abbr}</span> : null}
      {label ? <span className="icon-btn-label">{label}</span> : children}
      {badge ? <span className="badge-dot">{badge}</span> : null}
    </button>
  );
}

function TopbarStudent({ title = "Portal del Estudiante", userName = "Alumno", roleLabel = "Alumno", photoUrl = null }) {
  const initial = (userName || "A").trim().charAt(0).toUpperCase();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-left">
          <div className="brand-icon">E</div>
          <div>
            <div className="brand-title">{title}</div>
            <div className="brand-subtitle">Alumno</div>
          </div>
        </div>

        <div className="topbar-center">
          <label className="topbar-search">
            <span className="topbar-search-icon" aria-hidden="true" />
            <input type="search" aria-label="Buscar en el portal" placeholder="Buscar en tu panel" />
          </label>
        </div>

        <div className="topbar-actions">
          <IconButton badge={0} onClick={() => {}} abbr="N" ariaLabel="Notificaciones">Noti</IconButton>
          <IconButton onClick={() => {}} abbr="P" ariaLabel="Perfil">Perfil</IconButton>
          <IconButton onClick={logout} abbr="S" ariaLabel="Salir">Salir</IconButton>
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
      {items.map((item) => {
        const key = typeof item === "string" ? item : item.key;
        const label = typeof item === "string" ? item : (item.label ?? item.key);
        const disabled = typeof item === "string" ? false : !!item.disabled;
        return (
          <button
            key={key}
            className={`tab ${value === key ? "active" : ""} ${disabled ? "disabled" : ""}`}
            onClick={() => { if (!disabled) onChange(key); }}
            type="button"
            disabled={disabled}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function buildConicGradient(segments) {
  const safe = (segments || []).filter((s) => (s?.value ?? 0) > 0);
  const total = safe.reduce((sum, s) => sum + (s.value || 0), 0);
  if (!total) return "conic-gradient(rgba(148,163,184,0.28) 0% 100%)";

  let acc = 0;
  const stops = safe.map((s) => {
    const start = acc;
    acc += (s.value / total) * 100;
    const end = acc;
    return `${s.color} ${start.toFixed(3)}% ${end.toFixed(3)}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function PieChart({ title, centerMain, centerSub, segments, size = 140 }) {
  const safe = (segments || []).filter((s) => (s?.value ?? 0) > 0);
  const total = safe.reduce((sum, s) => sum + (s.value || 0), 0);
  const gradient = buildConicGradient(segments);

  return (
    <div className="card card-pad">
      <p className="card-title">{title}</p>
      <div className="pie-card" style={{ marginTop: 12 }}>
        <div
          className="pie"
          aria-label={title}
          role="img"
          style={{ "--pie-size": `${size}px`, backgroundImage: gradient }}
        >
          <div className="pie-center">
            <div className="pie-center-main">{centerMain}</div>
            {centerSub ? <div className="pie-center-sub">{centerSub}</div> : null}
          </div>
        </div>

        <div style={{ width: "100%" }}>
          <div className="pie-legend">
            {safe.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Sin datos.</div>
            ) : (
              safe.map((s) => (
                <div key={s.label} className="pie-legend-item">
                  <div className="pie-legend-left">
                    <span className="pie-dot" style={{ "--dot": s.color }} />
                    <span className="pie-legend-label">{s.label}</span>
                  </div>
                  <span className="pie-legend-value">
                    {s.value}{total ? ` (${Math.round((s.value / total) * 100)}%)` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const statusMap = {
  PENDING: { label: "Pendiente", pill: "pill-gray" },
  OBSERVED: { label: "Observado", pill: "pill-blue" },
  APPROVED: { label: "Aprobado", pill: "pill-green" },
  REJECTED: { label: "Rechazado", pill: "pill-red" },
};

export default function StudentPortal() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("Resumen");
  const tabs = useMemo(() => ["Resumen", "Documentos", "Estadísticas", "Perfil"], []);
  const [progress, setProgress] = useState(null); // { practicas, servicio }
  const [progressRules, setProgressRules] = useState([]); // [{ program, document_type_id, ... }]
  const [progressError, setProgressError] = useState("");

  const [docTypes, setDocTypes] = useState([]);
  const [myDocs, setMyDocs] = useState([]);
  const [docsProgram, setDocsProgram] = useState("PRACTICAS"); // PRACTICAS | SERVICIO
  const [uploadTypeId, setUploadTypeId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState("");
  const [toast, setToast] = useState(null);
  const [viewer, setViewer] = useState(null); // { url, title }
  const [detailsDoc, setDetailsDoc] = useState(null); // document row
  const [showRequirements, setShowRequirements] = useState(false);
  const [docFilters, setDocFilters] = useState({ type: "", status: "" });
  const [photoInfo, setPhotoInfo] = useState(null); // { status, url?, created_at?, reviewed_at?, review_comment? }
  const [photoFile, setPhotoFile] = useState(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const showToast = (message, variant = "success") => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const token = getToken("student");
    if (!token) { window.location.href = "/"; return; }

    apiGet("/auth/me", token)
      .then((m) => {
        if (m.role !== "STUDENT") throw new Error("Acceso solo para alumno.");
        setMe(m);
        Promise.all([
          apiGet("/progress/me", token).then((p) => setProgress(p)),
          apiGet("/progress/rules/public", token).then((r) => setProgressRules(r || [])),
          apiGet("/users/me/photo", token).then((info) => setPhotoInfo(info)).catch(() => setPhotoInfo({ status: "NONE" })),
        ]).catch((e) => setProgressError(e.message || "No se pudo cargar el progreso."));
      })
      .catch(() => window.location.href = "/");
  }, []);

  const loadPhoto = async () => {
    const token = getToken("student");
    if (!token) return;
    setPhotoError("");
    try {
      const info = await apiGet("/users/me/photo", token);
      setPhotoInfo(info);
    } catch (e) {
      setPhotoError(e.message || "No se pudo cargar la foto.");
    }
  };

  const approvedPhotoUrl = photoInfo?.status === "APPROVED" ? photoInfo.url : null;

  const loadDocs = async ({ silent = false } = {}) => {
    const token = getToken("student");
    if (!token) return;
    setDocsError("");
    if (!silent) setIsLoadingDocs(true);
    try {
      const [types, mine] = await Promise.all([
        apiGet("/documents/types", token),
        apiGet("/documents/my", token),
      ]);
      setDocTypes(types || []);
      setMyDocs(mine || []);
      if (!uploadTypeId && (types || []).length > 0) setUploadTypeId(String(types[0].id));
    } catch (e) {
      setDocsError(e.message || "No se pudieron cargar los documentos.");
    } finally {
      if (!silent) setIsLoadingDocs(false);
    }
  };

  const reloadProgress = async () => {
    const token = getToken("student");
    if (!token) return;
    setProgressError("");
    try {
      const [p, r] = await Promise.all([
        apiGet("/progress/me", token),
        apiGet("/progress/rules/public", token),
      ]);
      setProgress(p);
      setProgressRules(r || []);
    } catch (e) {
      setProgressError(e.message || "No se pudo cargar el progreso.");
    }
  };

  useEffect(() => {
    if (!me) return;
    loadDocs();
  }, [me]);

  useEffect(() => {
    if (!me) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      loadDocs({ silent: true });
    };
    const intervalId = window.setInterval(tick, 8000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [me]);

  const handleUpload = async (event) => {
    event.preventDefault();
    const token = getToken("student");
    if (!token) return;

    if (!uploadTypeId) { setDocsError("Selecciona un tipo de documento."); return; }
    if (!uploadFile) { setDocsError("Selecciona un archivo."); return; }
    if (uploadLocked.locked) {
      const msg = uploadLocked.message || "No puedes subir este documento por ahora.";
      setDocsError(msg);
      showToast(msg, "error");
      return;
    }

    setDocsError("");
    try {
      const fd = new FormData();
      fd.append("document_type_id", uploadTypeId);
      fd.append("file", uploadFile);
      await apiUpload("/documents/upload", fd, token);
      showToast("Documento subido.");
      setUploadFile(null);
      await loadDocs();
    } catch (e) {
      setDocsError(e.message || "No se pudo subir el documento.");
    }
  };

  const handleOpen = async (docId, title = "Documento") => {
    const token = getToken("student");
    if (!token) return;
    try {
      const { url } = await apiGet(`/documents/${docId}/download`, token);
      setViewer({ url, title });
    } catch (e) {
      showToast(e.message || "No se pudo abrir el documento.", "error");
    }
  };

  const kpis = useMemo(() => {
    const total = myDocs.length;
    const pending = myDocs.filter((d) => d.status === "PENDING").length;
    const observed = myDocs.filter((d) => d.status === "OBSERVED").length;
    const approved = myDocs.filter((d) => d.status === "APPROVED").length;
    const rejected = myDocs.filter((d) => d.status === "REJECTED").length;
    return { total, pending, observed, approved, rejected };
  }, [myDocs]);

  const practicasDone = useMemo(() => {
    const p = progress?.practicas;
    if (!p) return false;
    if (p.percent == null) return false;
    if ((p.total_points ?? 0) <= 0) return false;
    return (p.completed_points ?? 0) >= (p.total_points ?? 0) || (p.percent ?? 0) >= 100;
  }, [progress]);

  const practicasTypeIds = useMemo(() => {
    const set = new Set();
    for (const r of progressRules || []) {
      if (r?.program === "PRACTICAS" && r?.is_active !== false) set.add(Number(r.document_type_id));
    }
    return set;
  }, [progressRules]);

  const serviceTypeIds = useMemo(() => {
    const set = new Set();
    for (const r of progressRules || []) {
      if (r?.program === "SERVICIO" && r?.is_active !== false) set.add(Number(r.document_type_id));
    }
    return set;
  }, [progressRules]);

  const serviceTypeIdsAll = useMemo(() => {
    const set = new Set(serviceTypeIds);
    for (const t of docTypes || []) {
      if (String(t?.program || "").toUpperCase() === "SERVICIO") set.add(Number(t.id));
    }
    return set;
  }, [serviceTypeIds, docTypes]);

  const practicasTypeIdsAll = useMemo(() => {
    const set = new Set(practicasTypeIds);
    for (const t of docTypes || []) {
      if (String(t?.program || "").toUpperCase() !== "SERVICIO") set.add(Number(t.id));
    }
    return set;
  }, [practicasTypeIds, docTypes]);

  useEffect(() => {
    if (practicasDone) return;
    if (docsProgram === "SERVICIO") setDocsProgram("PRACTICAS");
  }, [practicasDone, docsProgram]);

  const docsProgramTabs = useMemo(() => {
    return [
      { key: "PRACTICAS", label: "Practicas" },
      { key: "SERVICIO", label: "Servicio social", disabled: !practicasDone },
    ];
  }, [practicasDone]);

  const docTypesForProgram = useMemo(() => {
    const types = docTypes || [];
    if (docsProgram === "SERVICIO") {
      return types.filter((t) => String(t?.program || "").toUpperCase() === "SERVICIO");
    }
    // PRACTICAS: incluye legacy (program null) y excluye Servicio.
    return types.filter((t) => String(t?.program || "").toUpperCase() !== "SERVICIO");
  }, [docTypes, docsProgram]);

  useEffect(() => {
    if (docsProgram === "SERVICIO" && !practicasDone) return;
    if (!docTypesForProgram || docTypesForProgram.length === 0) { setUploadTypeId(""); return; }
    const ok = docTypesForProgram.some((t) => String(t.id) === String(uploadTypeId));
    if (!ok) setUploadTypeId(String(docTypesForProgram[0].id));
  }, [docsProgram, practicasDone, docTypesForProgram, uploadTypeId]);

  const uploadLocked = useMemo(() => {
    const dtid = Number(uploadTypeId || 0);
    const isServiceType = dtid > 0 && serviceTypeIdsAll.has(dtid);
    const isPracticasType = dtid > 0 && practicasTypeIdsAll.has(dtid);
    const programLocked = docsProgram === "SERVICIO" && !practicasDone;
    const mismatch =
      (docsProgram === "PRACTICAS" && isServiceType) ||
      (docsProgram === "SERVICIO" && isPracticasType);

    const locked = programLocked || mismatch || (!practicasDone && isServiceType);
    let message = "";
    if (programLocked) message = "Servicio social esta bloqueado hasta concluir Practicas profesionales.";
    else if (docsProgram === "PRACTICAS" && mismatch) message = "Este tipo pertenece a Servicio social. Cambia a la pestana Servicio social.";
    else if (docsProgram === "SERVICIO" && mismatch) message = "Este tipo pertenece a Practicas. Cambia a la pestana Practicas.";
    else if (!practicasDone && isServiceType) message = "Servicio social esta bloqueado hasta concluir Practicas profesionales.";

    return { locked, message };
  }, [docsProgram, practicasDone, serviceTypeIdsAll, practicasTypeIdsAll, uploadTypeId]);

  const docsForProgram = useMemo(() => {
    const list = myDocs || [];
    if (docsProgram === "SERVICIO") {
      return list.filter((d) => serviceTypeIdsAll.has(Number(d.document_type_id)));
    }
    return list.filter((d) => !serviceTypeIdsAll.has(Number(d.document_type_id)));
  }, [myDocs, docsProgram, serviceTypeIdsAll]);

  const filteredDocs = useMemo(() => {
    return docsForProgram.filter((d) => {
      const matchesType = !docFilters.type || d.document_type_name === docFilters.type;
      const matchesStatus = !docFilters.status || d.status === docFilters.status;
      return matchesType && matchesStatus;
    });
  }, [docsForProgram, docFilters]);

  const uniqueDocTypes = useMemo(() => {
    return Array.from(new Set(docsForProgram.map((d) => d.document_type_name))).sort();
  }, [docsForProgram]);

  useEffect(() => {
    setDocFilters((p) => ({ ...p, type: "" }));
  }, [docsProgram]);

  const checklist = useMemo(() => {
    const byType = new Map();
    for (const d of myDocs) {
      const prev = byType.get(d.document_type_id);
      if (!prev) {
        byType.set(d.document_type_id, d);
        continue;
      }
      const prevTime = new Date(prev.created_at).getTime();
      const curTime = new Date(d.created_at).getTime();
      if (curTime >= prevTime) byType.set(d.document_type_id, d);
    }

    return (docTypes || []).map((t) => {
      const latest = byType.get(t.id) || null;
      return {
        type: t,
        latest,
      };
    });
  }, [docTypes, myDocs]);

  const latestDocByTypeId = useMemo(() => {
    const byType = new Map();
    for (const d of myDocs || []) {
      const prev = byType.get(d.document_type_id);
      if (!prev) { byType.set(d.document_type_id, d); continue; }
      const prevTime = new Date(prev.created_at).getTime();
      const curTime = new Date(d.created_at).getTime();
      if (curTime >= prevTime) byType.set(d.document_type_id, d);
    }
    return byType;
  }, [myDocs]);

  return (
    <>
      <TopbarStudent userName={me?.full_name || "Alumno"} roleLabel="Alumno" photoUrl={approvedPhotoUrl} />
      <main className="container">
        <h1 className="h1">Portal del Alumno</h1>
        <p className="p-muted">Sube documentos y revisa su estatus.</p>

        <div className="tabs-shell">
          <Tabs
            value={tab}
            onChange={setTab}
            items={tabs}
            variant="side"
            header={(
              <div className="sidebar-brand" aria-label="Portal del estudiante">
                <div className="sidebar-brand-icon" aria-hidden="true">E</div>
                <div>
                  <div className="sidebar-brand-title">Portal del Estudiante</div>
                  <div className="sidebar-brand-sub">Alumno</div>
                </div>
              </div>
            )}
          />
          <div className="tabs-panel">
            {tab === "Resumen" && (
              <>
                <div className="card card-pad" style={{ marginTop: 0 }}>
                  <div className="row" style={{ alignItems: "center" }}>
                    <div>
                      <p className="card-title">Progreso</p>
                      <p className="card-sub">Seguimiento de Prácticas y Servicio Social.</p>
                    </div>
                    <div className="btn-row">
                      <button className="btn" type="button" onClick={reloadProgress}>
                        Recargar
                      </button>
                      <button className="btn btn-primary" type="button" onClick={() => setTab("Estadísticas")}>
                        Estadísticas
                      </button>
                    </div>
                  </div>

                  {progressError ? <div className="alert alert-error" style={{ marginTop: 12 }}>{progressError}</div> : null}

                  {!progress ? (
                    <div style={{ color: "var(--muted)", marginTop: 12 }}>Cargando...</div>
                  ) : (
                    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                      {["practicas", "servicio"].map((k) => {
                        const item = progress?.[k];
                        const label = k === "practicas" ? "Prácticas profesionales" : "Servicio social";
                        const pct = typeof item?.percent === "number" ? item.percent : null;
                        const program = k === "practicas" ? "PRACTICAS" : "SERVICIO";
                        const isLocked = k === "servicio" && !practicasDone;
                        const steps = (progressRules || [])
                          .filter((r) => r.program === program && r.is_active !== false)
                          .slice()
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id ?? 0) - (b.id ?? 0));
                        return (
                          <div key={k} className="card" style={{ padding: 12 }}>
                            <div className="progress-row">
                              <div style={{ fontWeight: 900 }}>{label}</div>
                              <div className="progress-meta">
                                {isLocked ? "Bloqueado" : (pct === null ? "Sin reglas" : `${pct}%`)} · {item?.completed_points ?? 0}/{item?.total_points ?? 0}
                              </div>
                            </div>

                            {isLocked ? (
                              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
                                Se habilitara cuando concluyas <b>Practicas profesionales</b>.
                              </div>
                            ) : pct === null ? (
                              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
                                El administrador debe configurar las reglas de progreso.
                              </div>
                            ) : steps.length === 0 ? (
                              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
                                Sin pasos configurados.
                              </div>
                            ) : (
                              <div className="list" style={{ marginTop: 10 }}>
                                {steps.map((r) => {
                                  const latest = latestDocByTypeId.get(r.document_type_id) || null;
                                  const info = latest ? (statusMap[latest.status] || statusMap.PENDING) : null;
                                  return (
                                    <div key={r.id} className="list-item" style={{ padding: 12 }}>
                                      <div style={{ width: "100%" }}>
                                        <div className="row" style={{ alignItems: "center" }}>
                                          <div>
                                            <div className="item-title">{r.document_type_name || `Tipo ${r.document_type_id}`}</div>
                                            <div className="item-meta">{r.document_type_code || ""}</div>
                                          </div>
                                          <div className="btn-row">
                                            {latest ? (
                                              <span className={`pill ${info.pill}`}>{info.label}</span>
                                            ) : (
                                              <span className="pill pill-gray">No subido</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="card card-pad" style={{ marginTop: 0 }}>
              {!me ? (
                <div style={{ color: "var(--muted)" }}>Cargando...</div>
              ) : (
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div>
                    <p className="card-title" style={{ marginBottom: 6 }}>Tu sesion</p>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{me.full_name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>
                      Matricula: <b>{me.matricula}</b>
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>
                      Tenant: <b>{me.tenant_id}</b>
                    </div>
                  </div>

                  <div className="btn-row">
                    <button className="btn" type="button" onClick={() => setTab("Documentos")}>
                      Ir a Documentos
                    </button>
                    <button className="btn btn-primary" type="button" onClick={loadDocs}>
                      Recargar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid-3">
              <div className="card card-pad">
                <p className="card-title">Documentos</p>
                <div className="divider" />
                <div style={{ fontSize: 28, fontWeight: 900 }}>{kpis.total}</div>
                <div className="card-sub">Total subidos</div>
              </div>
              <div className="card card-pad">
                <p className="card-title">En revision</p>
                <div className="divider" />
                <div style={{ fontSize: 28, fontWeight: 900 }}>{kpis.pending + kpis.observed}</div>
                <div className="card-sub">Pendiente / Observado</div>
              </div>
              <div className="card card-pad">
                <p className="card-title">Aprobados</p>
                <div className="divider" />
                <div style={{ fontSize: 28, fontWeight: 900 }}>{kpis.approved}</div>
                <div className="card-sub">Listos</div>
              </div>
            </div>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <div className="row" style={{ alignItems: "center" }}>
                <div>
                  <p className="card-title">Recientes</p>
                  <p className="card-sub">Ultimos movimientos en tus documentos.</p>
                </div>
                <button className="btn" type="button" onClick={() => setTab("Documentos")}>Ver todos</button>
              </div>

              {isLoadingDocs && <div style={{ color: "var(--muted)", marginTop: 12 }}>Cargando...</div>}
              {!isLoadingDocs && myDocs.length === 0 && (
                <div style={{ color: "var(--muted)", marginTop: 12 }}>Aun no has subido documentos.</div>
              )}

              {!isLoadingDocs && myDocs.length > 0 && (
                <div className="table-wrap"><table className="table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Archivo</th>
                      <th>Estado</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myDocs.slice(0, 5).map((d) => {
                      const info = statusMap[d.status] || statusMap.PENDING;
                      return (
                        <tr key={d.id}>
                          <td>{d.document_type_name}</td>
                          <td>{d.filename}</td>
                          <td><span className={`pill ${info.pill}`}>{info.label}</span></td>
                          <td>
                            <button className="btn" type="button" onClick={() => handleOpen(d.id, d.filename)}>
                              Ver
                            </button>
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

        {tab === "Documentos" && (
          <div className="docs-grid">
            <div className="card card-pad" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
              <div className="row row-wrap" style={{ alignItems: "center" }}>
                <div>
                  <p className="card-title">Documentos</p>
                  <p className="card-sub">
                    Sube y revisa tu documentacion de <b>Practicas</b> y <b>Servicio social</b>.
                  </p>
                </div>
              </div>
              <Tabs value={docsProgram} onChange={setDocsProgram} items={docsProgramTabs} />
              {!practicasDone ? (
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 10 }}>
                  Servicio social se habilita al concluir <b>Practicas profesionales</b>.
                </div>
              ) : null}
            </div>

            <div className="card card-pad">
              <p className="card-title">Subir documento</p>
              <p className="card-sub">Al subir, aparecera en el tablero del revisor.</p>

              {docsError && <div className="alert alert-error" style={{ marginTop: 12 }}>{docsError}</div>}
              {docsProgram === "SERVICIO" && practicasDone && docTypesForProgram.length === 0 ? (
                <div className="alert alert-info" style={{ marginTop: 12 }}>
                  No hay tipos configurados para <b>Servicio social</b>. Pide al administrador que los agregue en <b>Tipos de documento</b>.
                </div>
              ) : null}

              <form onSubmit={handleUpload} style={{ display: "grid", gap: 12, marginTop: 12 }}>
                <div>
                  <span className="label">Tipo</span>
                  <select
                    className="select"
                    value={uploadTypeId}
                    onChange={(e) => setUploadTypeId(e.target.value)}
                    disabled={isLoadingDocs || docTypesForProgram.length === 0 || (docsProgram === "SERVICIO" && !practicasDone)}
                  >
                    {docTypesForProgram.length === 0 ? (
                      <option value="">No hay tipos configurados</option>
                    ) : (
                      docTypesForProgram.map((t) => (
                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                      ))
                    )}
                  </select>
                  {uploadLocked.locked ? (
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                      {uploadLocked.message || "No puedes subir este documento por ahora."}
                    </div>
                  ) : null}
                </div>

                <div>
                  <span className="label">Archivo</span>
                  <input
                    className="input"
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                    PDF o imagen.
                  </div>
                </div>

                <div className="btn-row">
                  <button className="btn btn-primary" type="submit" disabled={isLoadingDocs || uploadLocked.locked}>
                    Subir
                  </button>
                  <button className="btn" type="button" onClick={loadDocs} disabled={isLoadingDocs}>
                    {isLoadingDocs ? "Cargando..." : "Recargar"}
                  </button>
                </div>
              </form>
            </div>

            <div className="card card-pad">
                <div className="row row-wrap" style={{ alignItems: "center" }}>
                  <div>
                    <p className="card-title">Mis documentos ({docsProgram === "SERVICIO" ? "Servicio social" : "Practicas"})</p>
                    <p className="card-sub">Filtra por tipo/estado y abre el PDF en modal.</p>
                  </div>
                  <div className="btn-row">
                    <button className="btn" type="button" onClick={() => setShowRequirements(true)} disabled={isLoadingDocs}>
                    Ver requisitos
                  </button>
                  <button className="btn" type="button" onClick={loadDocs} disabled={isLoadingDocs}>Recargar</button>
                </div>
              </div>

              <div className="docs-filters">
                <div>
                  <span className="label">Tipo</span>
                  <select
                    className="select"
                    value={docFilters.type}
                    onChange={(e) => setDocFilters((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    {uniqueDocTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="label">Estado</span>
                  <select
                    className="select"
                    value={docFilters.status}
                    onChange={(e) => setDocFilters((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="">Todos</option>
                    <option value="PENDING">Pendiente</option>
                    <option value="OBSERVED">Observado</option>
                    <option value="APPROVED">Aprobado</option>
                    <option value="REJECTED">Rechazado</option>
                  </select>
                </div>
              </div>

              {isLoadingDocs && <div style={{ color: "var(--muted)", marginTop: 12 }}>Cargando...</div>}
              {!isLoadingDocs && filteredDocs.length === 0 && (
                <div style={{ color: "var(--muted)", marginTop: 12 }}>No hay documentos con esos filtros.</div>
              )}

              {!isLoadingDocs && filteredDocs.length > 0 && (
                <div className="table-wrap"><table className="table docs-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Archivo</th>
                      <th>Estado</th>
                      <th className="nowrap">Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((d) => {
                      const info = statusMap[d.status] || statusMap.PENDING;
                      return (
                        <tr key={d.id}>
                          <td>{d.document_type_name}</td>
                          <td>
                            <div className="doc-filename" title={d.filename}>{d.filename}</div>
                            {d.reviewer_comment ? (
                              <div style={{ color: "var(--muted)", fontSize: 12 }}>{d.reviewer_comment}</div>
                            ) : null}
                          </td>
                          <td><span className={`pill ${info.pill}`}>{info.label}</span></td>
                          <td className="nowrap">{new Date(d.created_at).toLocaleString()}</td>
                          <td className="td-actions">
                            <div className="btn-row">
                              <button className="btn" type="button" onClick={() => handleOpen(d.id, d.filename)}>Ver</button>
                              <button className="btn" type="button" onClick={() => setDetailsDoc(d)}>Detalles</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              )}
            </div>
          </div>
        )}

        {tab === "Estadísticas" && (
          <div className="card card-pad" style={{ marginTop: 0 }}>
            <div className="row row-wrap" style={{ alignItems: "center" }}>
              <div>
                <p className="card-title">Estadísticas</p>
                <p className="card-sub">Gráficas de pastel de tu progreso y tus documentos.</p>
              </div>
              <div className="btn-row">
                <button className="btn" type="button" onClick={reloadProgress}>
                  Recargar progreso
                </button>
                <button className="btn" type="button" onClick={() => loadDocs()} disabled={isLoadingDocs}>
                  {isLoadingDocs ? "Cargando..." : "Recargar documentos"}
                </button>
              </div>
            </div>

            {progressError ? <div className="alert alert-error" style={{ marginTop: 12 }}>{progressError}</div> : null}

            <div className="stats-grid">
              {(() => {
                const p = progress?.practicas || null;
                const total = p?.total_points ?? 0;
                const done = p?.completed_points ?? 0;
                const pct = typeof p?.percent === "number" ? p.percent : null;
                const segments = total > 0 ? [
                  { label: "Completado", value: done, color: "var(--brand)" },
                  { label: "Restante", value: Math.max(0, total - done), color: "rgba(148,163,184,0.28)" },
                ] : [];
                return (
                  <PieChart
                    title="Prácticas profesionales"
                    centerMain={pct === null ? "Sin reglas" : `${pct}%`}
                    centerSub={pct === null ? "" : `${done}/${total} pts`}
                    segments={segments}
                  />
                );
              })()}

              {(() => {
                const s = progress?.servicio || null;
                const total = s?.total_points ?? 0;
                const done = s?.completed_points ?? 0;
                const pct = typeof s?.percent === "number" ? s.percent : null;
                if (!practicasDone) {
                  return (
                    <PieChart
                      title="Servicio social"
                      centerMain="Bloqueado"
                      centerSub="Concluye practicas primero"
                      segments={[{ label: "Bloqueado", value: 1, color: "rgba(148,163,184,0.40)" }]}
                    />
                  );
                }
                const segments = total > 0 ? [
                  { label: "Completado", value: done, color: "var(--brand2)" },
                  { label: "Restante", value: Math.max(0, total - done), color: "rgba(148,163,184,0.28)" },
                ] : [];
                return (
                  <PieChart
                    title="Servicio social"
                    centerMain={pct === null ? "Sin reglas" : `${pct}%`}
                    centerSub={pct === null ? "" : `${done}/${total} pts`}
                    segments={segments}
                  />
                );
              })()}

              <PieChart
                title="Mis documentos (estatus)"
                centerMain={`${kpis.total}`}
                centerSub={kpis.total === 1 ? "documento" : "documentos"}
                segments={[
                  { label: "Aprobado", value: kpis.approved, color: "rgba(16,185,129,0.95)" },
                  { label: "Observado", value: kpis.observed, color: "var(--brand)" },
                  { label: "Pendiente", value: kpis.pending, color: "rgba(148,163,184,0.85)" },
                  { label: "Rechazado", value: kpis.rejected, color: "rgba(239,68,68,0.90)" },
                ]}
              />
            </div>
          </div>
        )}

        {tab === "Perfil" && (
          <div className="card card-pad" style={{ marginTop: 0 }}>
            <p className="card-title">Perfil</p>
            {!me ? (
              <div style={{ color: "var(--muted)" }}>Cargando...</div>
            ) : (
              <>
                <div className="row"><span>Nombre:</span><b>{me.full_name}</b></div>
                <div className="row" style={{ marginTop: 10 }}><span>Matricula:</span><b>{me.matricula || "-"}</b></div>
                <div className="row" style={{ marginTop: 10 }}><span>Tenant ID:</span><b>{me.tenant_id}</b></div>

                <div className="divider" />

                <p className="card-title">Foto de perfil</p>
                <p className="card-sub">Se envia a aprobacion del administrador.</p>

                {photoError ? <div className="alert alert-error" style={{ marginTop: 12 }}>{photoError}</div> : null}

                <div style={{ display: "grid", gap: 12, marginTop: 12, maxWidth: 560 }}>
                  <div className="row">
                    <span>Estado:</span>
                    {(() => {
                      const st = photoInfo?.status || "NONE";
                      const map = {
                        PENDING: { label: "Pendiente", pill: "pill-gray" },
                        APPROVED: { label: "Aprobada", pill: "pill-green" },
                        REJECTED: { label: "Rechazada", pill: "pill-red" },
                        NONE: { label: "Sin foto", pill: "pill-gray" },
                      };
                      const info = map[st] || map.NONE;
                      return <span className={`pill ${info.pill}`}>{info.label}</span>;
                    })()}
                  </div>

                  {photoInfo?.url ? (
                    <div className="card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
                      <img
                        src={photoInfo.url}
                        alt="Foto del alumno"
                        style={{ width: 72, height: 72, borderRadius: 14, objectFit: "cover", border: "1px solid var(--border)", background: "#fff" }}
                      />
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>
                        {photoInfo?.status === "PENDING" ? "En revision por el administrador." : null}
                        {photoInfo?.status === "APPROVED" ? "Aprobada." : null}
                        {photoInfo?.status === "REJECTED" ? "Rechazada. Puedes subir una nueva." : null}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>Aun no has subido una foto.</div>
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
                        const token = getToken("student");
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
                          showToast("Foto enviada para aprobacion.");
                        } catch (e) {
                          setPhotoError(e.message || "No se pudo subir la foto.");
                        } finally {
                          setIsSavingPhoto(false);
                        }
                      }}
                    >
                      {isSavingPhoto ? "Subiendo..." : "Subir para aprobacion"}
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

      {toast && (
        <div className={`toast ${toast.variant === "error" ? "toast-error" : "toast-success"}`}>
          {toast.message}
        </div>
      )}

      {viewer && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-lg">
            <div className="row" style={{ alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>Vista previa</h2>
              <div className="btn-row">
                <a className="btn" href={viewer.url} target="_blank" rel="noreferrer">Abrir en pestana</a>
                <button className="btn btn-primary" onClick={() => setViewer(null)}>Cerrar</button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700 }}>{viewer.title}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                Si no carga aqui, abre en pestana.
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

      {detailsDoc && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="row" style={{ alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>Detalles del documento</h2>
              <button className="btn btn-primary" onClick={() => setDetailsDoc(null)}>Cerrar</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 900 }}>{detailsDoc.filename}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{detailsDoc.document_type_name}</div>
            </div>

            <div className="divider" />

            <div className="row"><span>Estatus:</span>
              <span className={`pill ${(statusMap[detailsDoc.status] || statusMap.PENDING).pill}`}>
                {(statusMap[detailsDoc.status] || statusMap.PENDING).label}
              </span>
            </div>
            <div className="row" style={{ marginTop: 10 }}><span>Creado:</span><b>{new Date(detailsDoc.created_at).toLocaleString()}</b></div>
            {detailsDoc.reviewed_at ? (
              <div className="row" style={{ marginTop: 10 }}><span>Revisado:</span><b>{new Date(detailsDoc.reviewed_at).toLocaleString()}</b></div>
            ) : null}

            <div style={{ marginTop: 12 }}>
              <span className="label">Comentario del revisor</span>
              <div className="card" style={{ padding: 12 }}>
                {detailsDoc.reviewer_comment ? detailsDoc.reviewer_comment : <span style={{ color: "var(--muted)" }}>Sin comentario.</span>}
              </div>
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => { const d = detailsDoc; setDetailsDoc(null); handleOpen(d.id, d.filename); }}
              >
                Ver PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequirements && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal-lg">
            <div className="row" style={{ alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>Requisitos de documentacion</h2>
              <div className="btn-row">
                <button className="btn" type="button" onClick={loadDocs} disabled={isLoadingDocs}>Recargar</button>
                <button className="btn btn-primary" type="button" onClick={() => setShowRequirements(false)}>Cerrar</button>
              </div>
            </div>

            <p className="card-sub" style={{ marginTop: 10 }}>
              Lista de tipos requeridos y tu ultimo estatus por tipo.
            </p>

            {docTypes.length === 0 ? (
              <div style={{ color: "var(--muted)", marginTop: 12 }}>No hay tipos configurados para este tenant.</div>
            ) : (
              <div className="table-wrap"><table className="table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Ultimo archivo</th>
                    <th>Estatus</th>
                    <th>Fecha</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {checklist.map(({ type, latest }) => {
                    const info = latest ? (statusMap[latest.status] || statusMap.PENDING) : null;
                    return (
                      <tr key={type.id}>
                        <td><b>{type.name}</b></td>
                        <td style={{ color: "var(--muted)" }}>{latest ? latest.filename : "No subido"}</td>
                        <td>
                          {latest ? (
                            <span className={`pill ${info.pill}`}>{info.label}</span>
                          ) : (
                            <span className="pill pill-gray">Pendiente</span>
                          )}
                        </td>
                        <td style={{ color: "var(--muted)" }}>
                          {latest ? new Date(latest.created_at).toLocaleString() : "-"}
                        </td>
                        <td>
                          <div className="btn-row">
                            {latest ? (
                              <>
                                <button className="btn" type="button" onClick={() => handleOpen(latest.id, latest.filename)}>Ver</button>
                                <button className="btn" type="button" onClick={() => setDetailsDoc(latest)}>Detalles</button>
                              </>
                            ) : (
                               <button
                                 className="btn btn-primary"
                                 type="button"
                                 onClick={() => {
                                   const prog = String(type.program || "").toUpperCase();
                                   if (prog === "SERVICIO") {
                                     if (!practicasDone) {
                                       setDocsProgram("PRACTICAS");
                                       showToast("Servicio social aun esta bloqueado.", "error");
                                     } else {
                                       setDocsProgram("SERVICIO");
                                     }
                                   } else {
                                     setDocsProgram("PRACTICAS");
                                   }
                                   setUploadTypeId(String(type.id));
                                   setShowRequirements(false);
                                   showToast("Tipo seleccionado.");
                                 }}
                               >
                                 Subir
                               </button>
                             )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
