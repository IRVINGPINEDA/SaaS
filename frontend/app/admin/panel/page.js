"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiUpload } from "../../lib/api";
import { applyBrandVars } from "../../lib/brand";
import { clearToken, getToken } from "../../lib/token";

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

async function apiDelete(path, token) {
  const res = await fetch(`/api${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Error");
  return data;
}

function logout() {
  clearToken("admin");
  window.location.href = "/";
}

function IconButton({ children, badge, onClick }) {
  return (
    <button className="icon-btn" onClick={onClick} type="button">
      {children}
      {badge ? <span className="badge-dot">{badge}</span> : null}
    </button>
  );
}

function TopbarTenantAdmin({ tenantName, onLogout, userName = "Administrador", roleLabel = "Admin del tenant" }) {
  const initial = (userName || "A").trim().charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-left">
          <div className="brand-icon">A</div>
          <div>
            <div className="brand-title">Panel Administrativo</div>
            <div className="brand-subtitle">{tenantName || "Institucion"}</div>
          </div>
        </div>

        <div className="topbar-center">
          <label className="topbar-search">
            <span className="topbar-search-icon" aria-hidden="true" />
            <input type="search" aria-label="Buscar en el panel admin" placeholder="Buscar en administracion" />
          </label>
        </div>

        <div className="topbar-actions">
          <IconButton onClick={() => {}}>Noti</IconButton>
          <IconButton onClick={() => {}}>Perfil</IconButton>
          <IconButton onClick={onLogout}>Salir</IconButton>
          <div className="topbar-user">
            <span className="topbar-avatar">{initial}</span>
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

const statusMap = {
  PENDING: { label: "Pendiente", pill: "pill-gray" },
  OBSERVED: { label: "Observado", pill: "pill-blue" },
  APPROVED: { label: "Aprobado", pill: "pill-green" },
  REJECTED: { label: "Rechazado", pill: "pill-red" },
};

export default function TenantAdminPanel() {
  const [tab, setTab] = useState("Resumen");
  const tabs = useMemo(() => ["Resumen", "Documentos", "Tipos", "Usuarios", "Branding"], []);

  const [me, setMe] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [stats, setStats] = useState(null);
  const [pendingDocs, setPendingDocs] = useState([]);

  const [docTypes, setDocTypes] = useState([]);
  const [typeName, setTypeName] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [typeProgram, setTypeProgram] = useState("PRACTICAS"); // PRACTICAS | SERVICIO
  const [typesProgramFilter, setTypesProgramFilter] = useState("PRACTICAS"); // PRACTICAS | SERVICIO | TODOS
  const [editingType, setEditingType] = useState(null); // {id,name,code,program?}

  useEffect(() => {
    if (typesProgramFilter === "TODOS") return;
    setTypeProgram(typesProgramFilter);
  }, [typesProgramFilter]);

  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState("#111827");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [logo, setLogo] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [loginTheme, setLoginTheme] = useState("school");
  const [loginTitle, setLoginTitle] = useState("");
  const [loginSubtitle, setLoginSubtitle] = useState("");
  const [loginBgUrl, setLoginBgUrl] = useState("");
  const [loginBgMode, setLoginBgMode] = useState("default"); // default | image | solid | gradient
  const [loginBgColor, setLoginBgColor] = useState("#f8fafc");
  const [loginBgOverlay, setLoginBgOverlay] = useState(78); // 0..95

  const [uiDensity, setUiDensity] = useState("comfortable");
  const [uiRadius, setUiRadius] = useState(14);
  const [uiShadow, setUiShadow] = useState("soft");
  const [loginCardStyle, setLoginCardStyle] = useState("solid");
  const [loginShowDemo, setLoginShowDemo] = useState(true);
  const [loginFooterText, setLoginFooterText] = useState("");
  const [dashboardHeaderStyle, setDashboardHeaderStyle] = useState("solid");
  const [dashboardBgMode, setDashboardBgMode] = useState("default"); // default | solid
  const [dashboardBgColor, setDashboardBgColor] = useState("#eef1fb");

  const BRAND_PALETTES = useMemo(() => ([
    { id: "royal", name: "Royal", primary: "#4f46e5", secondary: "#7c3aed" },
    { id: "ocean", name: "Ocean", primary: "#0ea5e9", secondary: "#2563eb" },
    { id: "emerald", name: "Emerald", primary: "#10b981", secondary: "#059669" },
    { id: "sunset", name: "Sunset", primary: "#f97316", secondary: "#ef4444" },
    { id: "crimson", name: "Crimson", primary: "#e11d48", secondary: "#db2777" },
    { id: "graphite", name: "Graphite", primary: "#0f172a", secondary: "#334155" },
  ]), []);

  const selectedPaletteId = useMemo(() => {
    const norm = (v) => String(v || "").trim().toLowerCase();
    const p = norm(color);
    const s = norm(secondaryColor || "");
    const match = BRAND_PALETTES.find((it) => norm(it.primary) === p && norm(it.secondary || "") === s);
    return match ? match.id : "custom";
  }, [color, secondaryColor, BRAND_PALETTES]);

  const applyPalette = (palette) => {
    if (!palette) return;
    setColor(palette.primary);
    setSecondaryColor(palette.secondary || "");
    showToast(`Paleta aplicada: ${palette.name}`);
  };

  const [viewer, setViewer] = useState(null); // { url, title }
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [comment, setComment] = useState("");

  const [filters, setFilters] = useState({ type: "", student: "", status: "" });

  const [reviewers, setReviewers] = useState([]);
  const [revEmail, setRevEmail] = useState("");
  const [revFullName, setRevFullName] = useState("");
  const [revPassword, setRevPassword] = useState("");

  const [reviewerPhotoRequests, setReviewerPhotoRequests] = useState([]);
  const [reviewerPhotoError, setReviewerPhotoError] = useState("");
  const [isLoadingReviewerPhotos, setIsLoadingReviewerPhotos] = useState(false);
  const [studentPhotoRequests, setStudentPhotoRequests] = useState([]);
  const [studentPhotoError, setStudentPhotoError] = useState("");
  const [isLoadingStudentPhotos, setIsLoadingStudentPhotos] = useState(false);

  const [progressRules, setProgressRules] = useState([]);
  const [progressRuleError, setProgressRuleError] = useState("");
  const [isSavingProgressRule, setIsSavingProgressRule] = useState(false);
  const [progressAdvanced, setProgressAdvanced] = useState(false);
  const [progressAddPracticasTypeId, setProgressAddPracticasTypeId] = useState("");
  const [progressAddServicioTypeId, setProgressAddServicioTypeId] = useState("");

  const [students, setStudents] = useState([]);
  const [stuMatricula, setStuMatricula] = useState("");
  const [stuFullName, setStuFullName] = useState("");
  const [stuPassword, setStuPassword] = useState("");
  const [stuCareer, setStuCareer] = useState("");
  const [stuGrade, setStuGrade] = useState("");

  const [studentView, setStudentView] = useState("list"); // list | career | grade
  const [studentQuery, setStudentQuery] = useState("");
  const [studentCareerFilter, setStudentCareerFilter] = useState("");
  const [studentGradeFilter, setStudentGradeFilter] = useState("");
  const [studentShowInactive, setStudentShowInactive] = useState(false);

  const [usersTab, setUsersTab] = useState("Alumnos"); // Alumnos | Revisores
  const [uiStuCreateOpen, setUiStuCreateOpen] = useState(false);
  const [uiStuListOpen, setUiStuListOpen] = useState(true);
  const [uiStuImportOpen, setUiStuImportOpen] = useState(false);
  const [uiRevCreateOpen, setUiRevCreateOpen] = useState(false);
  const [uiRevListOpen, setUiRevListOpen] = useState(true);

  const [editingStudent, setEditingStudent] = useState(null); // {id, matricula, full_name, career, grade, is_active}

  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState("skip");
  const [importDefaultPassword, setImportDefaultPassword] = useState("AUTO");
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const [credModal, setCredModal] = useState(null); // { title, userLabel, password }

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadPending = async ({ silent = false } = {}) => {
    const token = getToken("admin");
    if (!token) return;
    if (!silent) setIsLoading(true);
    try {
      const items = await apiGet("/documents/pending", token);
      setPendingDocs(items || []);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadTypes = async ({ silent = false } = {}) => {
    const token = getToken("admin");
    if (!token) return;
    if (!silent) setIsLoading(true);
    try {
      const items = await apiGet("/documents/types", token);
      setDocTypes(items || []);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadReviewers = async ({ silent = false } = {}) => {
    const token = getToken("admin");
    if (!token) return;
    if (!silent) setIsLoading(true);
    try {
      const items = await apiGet("/users/reviewers", token);
      setReviewers(items || []);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadReviewerPhotoRequests = async () => {
    const token = getToken("admin");
    if (!token) return;
    setReviewerPhotoError("");
    setIsLoadingReviewerPhotos(true);
    try {
      const items = await apiGet("/users/reviewers/photo-requests", token);
      setReviewerPhotoRequests(items || []);
    } catch (e) {
      setReviewerPhotoError(e.message || "Error al cargar solicitudes de foto.");
    } finally {
      setIsLoadingReviewerPhotos(false);
    }
  };

  const loadStudentPhotoRequests = async () => {
    const token = getToken("admin");
    if (!token) return;
    setStudentPhotoError("");
    setIsLoadingStudentPhotos(true);
    try {
      const items = await apiGet("/users/students/photo-requests", token);
      setStudentPhotoRequests(items || []);
    } catch (e) {
      setStudentPhotoError(e.message || "Error al cargar solicitudes de foto.");
    } finally {
      setIsLoadingStudentPhotos(false);
    }
  };

  const loadProgressRules = async () => {
    const token = getToken("admin");
    if (!token) return;
    setProgressRuleError("");
    try {
      const items = await apiGet("/progress/rules", token);
      setProgressRules(items || []);
    } catch (e) {
      setProgressRuleError(e.message || "Error al cargar reglas de progreso.");
    }
  };

  const nextProgressOrderFor = (program) => {
    const maxOrder = (progressRules || [])
      .filter((r) => r.program === program)
      .reduce((acc, r) => Math.max(acc, Number(r.order || 0)), 0);
    return maxOrder + 10;
  };

  const addProgressStep = async (program, documentTypeId) => {
    const token = getToken("admin");
    if (!token) return;
    const dtid = Number(documentTypeId || 0);
    if (!dtid) return;
    setProgressRuleError("");
    setIsSavingProgressRule(true);
    try {
      await apiPost("/progress/rules", {
        program,
        document_type_id: dtid,
        points: 1,
        order: nextProgressOrderFor(program),
        is_active: true,
      }, token);
      setOk("Paso agregado.");
      if (program === "PRACTICAS") setProgressAddPracticasTypeId("");
      if (program === "SERVICIO") setProgressAddServicioTypeId("");
      await loadProgressRules();
    } catch (e) {
      setProgressRuleError(e.message || "No se pudo agregar el paso.");
    } finally {
      setIsSavingProgressRule(false);
    }
  };

  const updateProgressRule = async (ruleId, patch) => {
    const token = getToken("admin");
    if (!token) return;
    setProgressRuleError("");
    try {
      await apiPatch(`/progress/rules/${ruleId}`, patch, token);
      await loadProgressRules();
    } catch (e) {
      setProgressRuleError(e.message || "No se pudo actualizar la regla.");
    }
  };

  const deleteProgressRule = async (ruleId) => {
    const token = getToken("admin");
    if (!token) return;
    setProgressRuleError("");
    try {
      await apiDelete(`/progress/rules/${ruleId}`, token);
      await loadProgressRules();
    } catch (e) {
      setProgressRuleError(e.message || "No se pudo eliminar la regla.");
    }
  };

  const swapProgressRuleOrder = async (program, ruleId, direction) => {
    const token = getToken("admin");
    if (!token) return;
    setProgressRuleError("");

    const list = (progressRules || [])
      .filter((r) => r.program === program)
      .slice()
      .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || (a.id - b.id));

    const idx = list.findIndex((r) => r.id === ruleId);
    const cur = list[idx] || null;
    const other = list[idx + direction] || null;
    if (!cur || !other) return;

    try {
      await Promise.all([
        apiPatch(`/progress/rules/${cur.id}`, { order: Number(other.order || 0) }, token),
        apiPatch(`/progress/rules/${other.id}`, { order: Number(cur.order || 0) }, token),
      ]);
      await loadProgressRules();
    } catch (e) {
      setProgressRuleError(e.message || "No se pudo reordenar.");
    }
  };

  const decideReviewerPhoto = async (reviewerId, decision) => {
    const token = getToken("admin");
    if (!token) return;
    try {
      await apiPost(`/users/reviewers/${reviewerId}/photo/decision`, { decision }, token);
      setOk("Decisión guardada.");
      await loadReviewerPhotoRequests();
    } catch (e) {
      setError(e.message || "No se pudo guardar la decisión.");
    }
  };

  const decideStudentPhoto = async (studentId, decision) => {
    const token = getToken("admin");
    if (!token) return;
    try {
      await apiPost(`/users/students/${studentId}/photo/decision`, { decision }, token);
      setOk("Decision guardada.");
      await loadStudentPhotoRequests();
    } catch (e) {
      setError(e.message || "No se pudo guardar la decision.");
    }
  };

  const loadStudents = async ({ silent = false } = {}) => {
    const token = getToken("admin");
    if (!token) return;
    if (!silent) setIsLoading(true);
    try {
      const items = await apiGet("/users/students", token);
      setStudents(items || []);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadTenantConfig = async () => {
    const token = getToken("admin");
    if (!token) return;
    const cfg = await apiGet("/tenant/public-config", token);
    setTenant(cfg);
    setDisplayName(cfg?.display_name || "");
    setColor(cfg?.brand?.primary_color || "#111827");
    setSecondaryColor(cfg?.brand?.secondary_color || "");
    setLogo(cfg?.brand?.logo_url || "");
    setFaviconUrl(cfg?.brand?.favicon_url || "");
    setLoginTheme(cfg?.brand?.login_theme || "school");
    setLoginTitle(cfg?.brand?.login_title || "");
    setLoginSubtitle(cfg?.brand?.login_subtitle || "");
    setLoginBgUrl(cfg?.brand?.login_bg_url || "");
    {
      const mode = (cfg?.brand?.login_bg_mode || (cfg?.brand?.login_bg_url ? "image" : "default")).toString().toLowerCase();
      setLoginBgMode(["default", "image", "solid", "gradient"].includes(mode) ? mode : "default");
    }
    setLoginBgColor(cfg?.brand?.login_bg_color || "#f8fafc");
    setLoginBgOverlay(typeof cfg?.brand?.login_bg_overlay === "number" ? cfg.brand.login_bg_overlay : 78);

    setUiDensity(cfg?.ui?.density || "comfortable");
    setUiRadius(typeof cfg?.ui?.radius === "number" ? cfg.ui.radius : 14);
    setUiShadow(cfg?.ui?.shadow || "soft");
    setLoginCardStyle(cfg?.ui?.login_card_style || "solid");
    setLoginShowDemo(cfg?.ui?.login_show_demo !== false);
    setLoginFooterText(cfg?.ui?.login_footer_text || "");
    setDashboardHeaderStyle(cfg?.ui?.dashboard_header_style || "solid");
    setDashboardBgMode((cfg?.ui?.dashboard_bg_mode || "default").toString().toLowerCase() === "solid" ? "solid" : "default");
    setDashboardBgColor(cfg?.ui?.dashboard_bg_color || "#eef1fb");
  };

  const loadAll = async ({ silent = false } = {}) => {
    const token = getToken("admin");
    if (!token) return;
    if (!silent) { setError(""); setOk(""); }
    try {
      await Promise.all([
        loadStats({ silent }),
        loadPending({ silent }),
        loadTypes({ silent }),
        loadReviewers({ silent }),
        loadStudents({ silent }),
      ]);
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  useEffect(() => {
    const token = getToken("admin");
    if (!token) { window.location.href = "/"; return; }

    (async () => {
      setError(""); setOk("");
      const meData = await apiGet("/auth/me", token);
      if (meData.role !== "TENANT_ADMIN") {
        throw new Error("Acceso solo para TENANT_ADMIN.");
      }
      setMe(meData);
      await loadTenantConfig();
      await loadAll();
    })().catch((e) => setError(e.message || "Error"));
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      loadAll({ silent: true });
    };
    const intervalId = window.setInterval(tick, 8000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  useEffect(() => {
    if (tab !== "Usuarios" || usersTab !== "Revisores") return;
    loadReviewerPhotoRequests();
  }, [tab, usersTab]);

  useEffect(() => {
    if (tab !== "Usuarios" || usersTab !== "Alumnos") return;
    loadStudentPhotoRequests();
  }, [tab, usersTab]);

  useEffect(() => {
    if (tab !== "Tipos") return;
    loadProgressRules();
  }, [tab]);

  useEffect(() => {
    const isPreview = tab === "Branding";

    const nextBrand = isPreview
      ? { primary: color || "#111827", secondary: secondaryColor || "" }
      : {
          primary: tenant?.brand?.primary_color || "#111827",
          secondary: tenant?.brand?.secondary_color || "",
        };

    const nextUi = isPreview
      ? {
          density: uiDensity || "comfortable",
          shadow: uiShadow || "soft",
          header: dashboardHeaderStyle || "solid",
          radius: uiRadius || 14,
          dashboardBgMode: dashboardBgMode || "default",
          dashboardBgColor: dashboardBgColor || "#eef1fb",
        }
      : {
          density: tenant?.ui?.density || "comfortable",
          shadow: tenant?.ui?.shadow || "soft",
          header: tenant?.ui?.dashboard_header_style || "solid",
          radius: (typeof tenant?.ui?.radius === "number" ? tenant.ui.radius : 14),
          dashboardBgMode: tenant?.ui?.dashboard_bg_mode || "default",
          dashboardBgColor: tenant?.ui?.dashboard_bg_color || "#eef1fb",
        };

    applyBrandVars(nextBrand.primary, nextBrand.secondary);

    document.documentElement.dataset.density = nextUi.density;
    document.documentElement.dataset.shadow = nextUi.shadow;
    document.documentElement.dataset.header = nextUi.header;
    document.documentElement.style.setProperty("--radius", `${nextUi.radius}px`);

    const bgm = String(nextUi.dashboardBgMode || "default").toLowerCase();
    document.documentElement.dataset.dashboardBg = (bgm === "solid" ? "solid" : "default");
    if (bgm === "solid") {
      document.documentElement.style.setProperty("--bg", nextUi.dashboardBgColor || "#eef1fb");
    } else {
      document.documentElement.style.removeProperty("--bg");
    }
  }, [tab, tenant, color, secondaryColor, uiDensity, uiShadow, uiRadius, dashboardHeaderStyle, dashboardBgMode, dashboardBgColor]);

  const filteredDocs = useMemo(() => {
    return pendingDocs.filter((doc) => {
      const matchesType = !filters.type || doc.doc_type === filters.type;
      const studentName = `${doc.student?.full_name || ""} ${doc.student?.matricula || ""}`.toLowerCase();
      const matchesStudent = !filters.student || studentName.includes(filters.student.toLowerCase());
      const matchesStatus = !filters.status || doc.status === filters.status;
      return matchesType && matchesStudent && matchesStatus;
    });
  }, [pendingDocs, filters]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(pendingDocs.map((d) => d.doc_type))).sort();
  }, [pendingDocs]);

  const studentCareers = useMemo(() => {
    return Array.from(new Set((students || []).map((s) => (s.category || "").trim()).filter(Boolean))).sort();
  }, [students]);

  const studentGrades = useMemo(() => {
    return Array.from(new Set((students || []).map((s) => (s.group_name || "").trim()).filter(Boolean))).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = (studentQuery || "").trim().toLowerCase();
    return (students || []).filter((s) => {
      if (!studentShowInactive && s.is_active === false) return false;
      const matchesCareer = !studentCareerFilter || (s.category || "") === studentCareerFilter;
      const matchesGrade = !studentGradeFilter || (s.group_name || "") === studentGradeFilter;
      const hay = `${s.full_name || ""} ${s.matricula || ""}`.toLowerCase();
      const matchesQ = !q || hay.includes(q);
      return matchesCareer && matchesGrade && matchesQ;
    });
  }, [students, studentCareerFilter, studentGradeFilter, studentQuery, studentShowInactive]);

  const studentsByCareer = useMemo(() => {
    const map = new Map();
    for (const s of filteredStudents) {
      const key = (s.category || "Sin carrera").trim() || "Sin carrera";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredStudents]);

  const studentsByGrade = useMemo(() => {
    const map = new Map();
    for (const s of filteredStudents) {
      const key = (s.group_name || "Sin grado").trim() || "Sin grado";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredStudents]);

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

  const createReviewer = async (event) => {
    event.preventDefault();
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      const email = (revEmail || "").trim().toLowerCase();
      const fullName = (revFullName || "").trim();
      let password = (revPassword || "").trim();
      if (!password) password = "Reviewer123!";
      if (!email) throw new Error("Ingresa el email del revisor.");
      if (!fullName) throw new Error("Ingresa el nombre completo.");
      if (!password) throw new Error("Ingresa una contraseña.");

      await apiPost("/users/reviewer", { email, full_name: fullName, password }, token);
      setCredModal({ title: "Contraseña del revisor", userLabel: email, password });
      setOk(`Revisor creado: ${email}`);
      setRevEmail(""); setRevFullName(""); setRevPassword("");
      await loadReviewers({ silent: true });
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const createStudent = async (event) => {
    event.preventDefault();
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      const matricula = (stuMatricula || "").trim();
      const fullName = (stuFullName || "").trim();
      let password = (stuPassword || "").trim();
      if (!password) {
        const first = ((fullName || "Alumno").split(" ")[0] || "Alumno").replace(/[^A-Za-z0-9]/g, "").slice(0, 10) || "Alumno";
        const m = (matricula || "").replace(/[^A-Za-z0-9]/g, "") || "0000";
        password = `${first}${m}!`;
        if (password.length < 8) password = (password + "12345678").slice(0, 8);
      }
      const career = (stuCareer || "").trim();
      const grade = (stuGrade || "").trim();
      if (!matricula) throw new Error("Ingresa la matricula del alumno.");
      if (!fullName) throw new Error("Ingresa el nombre completo.");
      if (!password) throw new Error("Ingresa una contraseña.");

      await apiPost("/users/student", { matricula, full_name: fullName, password, category: career || null, group_name: grade || null }, token);
      setCredModal({ title: "Contraseña del alumno", userLabel: matricula, password });
      setOk(`Alumno creado: ${matricula}`);
      setStuMatricula(""); setStuFullName(""); setStuPassword(""); setStuCareer(""); setStuGrade("");
      await loadStudents({ silent: true });
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const importStudents = async () => {
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk(""); setImportResult(null);
    if (!importFile) { setError("Selecciona un archivo."); return; }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("on_duplicate", importMode || "skip");
      fd.append("default_password", importDefaultPassword || "AUTO");

      const res = await apiUpload("/users/students/import", fd, token);
      setImportResult(res);
      setOk("Importación completada.");
      await loadStudents({ silent: true });
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setImporting(false);
    }
  };

  const resetUserPassword = async (targetUserId, label) => {
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      const r = await fetch(`/api/users/${targetUserId}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || "Error");
      setCredModal({ title: "Contraseña restablecida", userLabel: label, password: data.temp_password });
      setOk("Contraseña restablecida.");
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const saveStudent = async (event) => {
    event.preventDefault();
    if (!editingStudent) return;
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      const payload = {
        matricula: (editingStudent.matricula || "").trim(),
        full_name: (editingStudent.full_name || "").trim(),
        category: (editingStudent.career || "").trim() || null,
        group_name: (editingStudent.grade || "").trim() || null,
        is_active: !!editingStudent.is_active,
      };
      if (!payload.matricula) throw new Error("Matrícula requerida.");
      if (!payload.full_name) throw new Error("Nombre requerido.");

      await apiPatch(`/users/students/${editingStudent.id}`, payload, token);
      setOk("Alumno actualizado.");
      setEditingStudent(null);
      await loadStudents({ silent: true });
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const deleteStudent = async (student) => {
    const token = getToken("admin");
    if (!token) return;
    if (!confirm(`Eliminar (desactivar) al alumno ${student.matricula}?`)) return;
    setError(""); setOk("");
    try {
      await apiDelete(`/users/students/${student.id}`, token);
      setOk("Alumno eliminado (desactivado).");
      await loadStudents({ silent: true });
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const toggleStudentActive = async (student, nextActive) => {
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      await apiPatch(`/users/students/${student.id}`, { is_active: nextActive }, token);
      setOk(nextActive ? "Alumno activado." : "Alumno desactivado.");
      await loadStudents({ silent: true });
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const downloadCredentialsCsv = () => {
    const creds = importResult?.credentials || [];
    if (!creds.length) return;
    const lines = ["matricula,password"].concat(
      creds.map((c) => {
        const m = String(c.matricula || "").replaceAll('"', '""');
        const p = String(c.password || "").replaceAll('"', '""');
        return `"${m}","${p}"`;
      })
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "credenciales_alumnos.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const createType = async (event) => {
    event.preventDefault();
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      const created = await apiPost("/documents/types", { name: typeName, code: typeCode, program: typeProgram }, token);
      setTypeName(""); setTypeCode("");
      setDocTypes((prev) => [created, ...prev]);
      setOk("Tipo creado.");
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const saveType = async (event) => {
    event.preventDefault();
    if (!editingType) return;
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      const updated = await apiPatch(`/documents/types/${editingType.id}`, { name: editingType.name, code: editingType.code, program: editingType.program ?? null }, token);
      setDocTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingType(null);
      setOk("Tipo actualizado.");
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const DOC_TYPE_PRESETS = useMemo(() => ({
    PRACTICAS: [
      { name: "Carta de Presentacion", code: "CARTA_PRESENTACION" },
      { name: "Reporte Semanal", code: "REPORTE_SEMANAL" },
      { name: "Evaluacion Mensual", code: "EVALUACION_MENSUAL" },
    ],
    SERVICIO: [
      { name: "Carta de Aceptacion (Servicio social)", code: "SERVICIO_CARTA_ACEPTACION" },
      { name: "Plan de Trabajo (Servicio social)", code: "SERVICIO_PLAN_TRABAJO" },
      { name: "Reporte Mensual (Servicio social)", code: "SERVICIO_REPORTE_MENSUAL" },
      { name: "Informe Final (Servicio social)", code: "SERVICIO_INFORME_FINAL" },
      { name: "Constancia de Liberacion (Servicio social)", code: "SERVICIO_CONSTANCIA_LIBERACION" },
    ],
  }), []);

  const addPresetTypes = async (program) => {
    const token = getToken("admin");
    if (!token) return;
    const presets = (DOC_TYPE_PRESETS[program] || []);
    if (presets.length === 0) return;

    setError(""); setOk("");
    let added = 0;
    let skipped = 0;
    for (const p of presets) {
      try {
        await apiPost("/documents/types", { name: p.name, code: p.code, program }, token);
        added += 1;
      } catch (e) {
        skipped += 1;
      }
    }
    await loadTypes({ silent: true });
    showToast(`Predefinidos: +${added} agregados, ${skipped} omitidos.`);
  };

  const visibleDocTypes = useMemo(() => {
    const list = docTypes || [];
    if (typesProgramFilter === "TODOS") return list;
    if (typesProgramFilter === "SERVICIO") return list.filter((t) => String(t.program || "").toUpperCase() === "SERVICIO");
    // PRACTICAS: incluye legacy (program null)
    return list.filter((t) => String(t.program || "").toUpperCase() !== "SERVICIO");
  }, [docTypes, typesProgramFilter]);

  const removeType = async (typeId) => {
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      await apiDelete(`/documents/types/${typeId}`, token);
      setDocTypes((prev) => prev.filter((t) => t.id !== typeId));
      setOk("Tipo eliminado.");
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const saveBranding = async (event) => {
    event.preventDefault();
    const token = getToken("admin");
    if (!token) return;
    if (!tenant?.tenant_id) { setError("Tenant no disponible."); return; }
    setError(""); setOk("");
    try {
      await apiPatch(`/tenants/${tenant.tenant_id}/branding`, {
        display_name: displayName || null,
        brand_primary_color: color,
        brand_secondary_color: secondaryColor || null,
        brand_logo_url: logo || null,
        brand_favicon_url: faviconUrl || null,
        login_theme: loginTheme || "school",
        login_title: loginTitle || null,
        login_subtitle: loginSubtitle || null,
        login_bg_url: loginBgUrl || null,
        login_bg_mode: loginBgMode || "default",
        login_bg_color: loginBgColor || null,
        login_bg_overlay: Number.isFinite(Number(loginBgOverlay)) ? Number(loginBgOverlay) : 78,
        ui_density: uiDensity || "comfortable",
        ui_radius: uiRadius,
        ui_shadow: uiShadow || "soft",
        login_card_style: loginCardStyle || "solid",
        login_show_demo: !!loginShowDemo,
        login_footer_text: loginFooterText || null,
        dashboard_header_style: dashboardHeaderStyle || "solid",
        dashboard_bg_mode: dashboardBgMode || "default",
        dashboard_bg_color: dashboardBgColor || null,
      }, token);
      setOk("Branding guardado.");
      applyBrandVars(color, secondaryColor);
      document.documentElement.dataset.density = uiDensity || "comfortable";
      document.documentElement.dataset.shadow = uiShadow || "soft";
      document.documentElement.dataset.header = dashboardHeaderStyle || "solid";
      document.documentElement.style.setProperty("--radius", `${uiRadius || 14}px`);
      await loadTenantConfig();
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  return (
    <>
      <TopbarTenantAdmin
        tenantName={tenant?.display_name}
        onLogout={logout}
        userName={me?.full_name || "Administrador"}
        roleLabel="Admin del tenant"
      />
      <main className="container">
        <h1 className="h1">Administración de la escuela</h1>
        <p className="p-muted">Configura requisitos y revisa el flujo de documentos.</p>

        <div className="tabs-shell">
          <Tabs
            value={tab}
            onChange={setTab}
            items={tabs}
            variant="side"
            header={(
              <div className="sidebar-brand" aria-label="Panel administrativo">
                <div className="sidebar-brand-icon" aria-hidden="true">A</div>
                <div>
                  <div className="sidebar-brand-title">Panel Administrativo</div>
                  <div className="sidebar-brand-sub">{tenant?.display_name || "Institucion"}</div>
                </div>
              </div>
            )}
          />
          <div className="tabs-panel">
            {error && <div className="alert alert-error" style={{ marginTop: 0 }}>{error}</div>}
            {ok && <div className="alert alert-ok" style={{ marginTop: 0 }}>{ok}</div>}

            {tab === "Resumen" && (
              <>
            <div className="card card-pad" style={{ marginTop: 0 }}>
              {!me ? (
                <div style={{ color: "var(--muted)" }}>Cargando...</div>
              ) : (
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div>
                    <p className="card-title" style={{ marginBottom: 6 }}>Tu sesión</p>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{me.full_name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>{me.role}</div>
                  </div>
                  <div className="btn-row">
                    <button className="btn" type="button" onClick={() => setTab("Documentos")}>Ir a Documentos</button>
                    <button className="btn" type="button" onClick={() => setTab("Tipos")}>Gestionar Tipos</button>
                    <button className="btn btn-primary" type="button" onClick={() => loadAll()} disabled={isLoading}>
                      {isLoading ? "Cargando..." : "Recargar"}
                    </button>
                  </div>
                </div>
              )}
            </div>

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
                <button className="btn" type="button" onClick={() => setTab("Documentos")}>Ver todo</button>
              </div>

              {pendingDocs.length === 0 ? (
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
                    {pendingDocs.slice(0, 5).map((doc) => {
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

        {tab === "Documentos" && (
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div className="row" style={{ alignItems: "center" }}>
              <div>
                <p className="card-title">Pendientes / Observados</p>
                <p className="card-sub">Como TENANT_ADMIN puedes revisar documentos.</p>
              </div>
              <button className="btn btn-primary" type="button" onClick={() => loadPending()} disabled={isLoading}>
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
                  {uniqueTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
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

        {tab === "Tipos" && (
          <>
            <div className="card card-pad" style={{ marginTop: 16 }}>
              <div className="row" style={{ alignItems: "center" }}>
                <div>
                  <p className="card-title">Tipos de documento</p>
                  <p className="card-sub">Define los requisitos para tu escuela.</p>
                </div>
                <button className="btn" type="button" onClick={() => loadTypes()} disabled={isLoading}>Recargar</button>
              </div>

              
              <div style={{ marginTop: 12 }}>
                <span className="label">Programa</span>
                <div className="btn-row">
                  <select className="select" value={typesProgramFilter} onChange={(e) => setTypesProgramFilter(e.target.value)} style={{ minWidth: 220 }}>
                    <option value="PRACTICAS">Practicas</option>
                    <option value="SERVICIO">Servicio social</option>
                    <option value="TODOS">Todos</option>
                  </select>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => addPresetTypes(typesProgramFilter === "TODOS" ? "PRACTICAS" : typesProgramFilter)}
                    disabled={typesProgramFilter === "TODOS"}
                    title={typesProgramFilter === "TODOS" ? "Selecciona un programa" : "Agrega documentos predefinidos"}
                  >
                    Agregar predefinidos
                  </button>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
                  Tipos de <b>Servicio social</b> no se mezclan con <b>Practicas</b>.
                </div>
              </div>

              <form onSubmit={createType} style={{ display: "grid", gridTemplateColumns: "1.3fr 2fr 1fr auto", gap: 12, marginTop: 12 }}>
                <div>
                  <span className="label">Programa</span>
                  <select className="select" value={typeProgram} onChange={(e) => setTypeProgram(e.target.value)}>
                    <option value="PRACTICAS">Practicas</option>
                    <option value="SERVICIO">Servicio social</option>
                  </select>
                </div>
                <div>
                  <span className="label">Nombre</span>
                  <input className="input" value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="Carta de Presentación" />
                </div>
                <div>
                  <span className="label">Código</span>
                  <input className="input" value={typeCode} onChange={(e) => setTypeCode(e.target.value)} placeholder="CARTA_PRESENTACION" />
                </div>
                <div style={{ display: "flex", alignItems: "end" }}>
                  <button className="btn btn-primary" type="submit">Crear</button>
                </div>
              </form>
            </div>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">Lista</p>
              {visibleDocTypes.length === 0 ? (
                <div style={{ color: "var(--muted)", marginTop: 12 }}>No hay tipos.</div>
              ) : (
                <div className="table-wrap"><table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Programa</th>
                      <th>Nombre</th>
                      <th>Código</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDocTypes.map((t) => (
                      <tr key={t.id}>
                        <td>{t.id}</td>
                        <td style={{ color: "var(--muted)" }}>{t.program || "PRACTICAS"}</td>
                        <td><b>{t.name}</b></td>
                        <td style={{ color: "var(--muted)" }}>{t.code}</td>
                        <td>
                          <div className="btn-row">
                            <button className="btn" type="button" onClick={() => setEditingType({ ...t })}>Editar</button>
                            <button className="btn" type="button" onClick={() => removeType(t.id)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </div>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <div className="row" style={{ alignItems: "center" }}>
                <div>
                  <p className="card-title">Reglas de progreso</p>
                  <p className="card-sub">Configura el seguimiento de Prácticas profesionales y Servicio Social.</p>
                </div>
                <div className="btn-row">
                  <button className="btn" type="button" onClick={() => setProgressAdvanced((v) => !v)}>
                    {progressAdvanced ? "Ocultar avanzado" : "Opciones avanzadas"}
                  </button>
                  <button className="btn" type="button" onClick={loadProgressRules}>Recargar</button>
                </div>
              </div>

              {progressRuleError ? <div className="alert alert-error" style={{ marginTop: 12 }}>{progressRuleError}</div> : null}

              <div className="alert alert-info" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 900 }}>Cómo funciona</div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                  Agrega los <b>pasos</b> (tipos de documento) que debe completar el alumno. Un paso cuenta cuando el documento está <b>Aprobado</b>.
                  El progreso se calcula con el documento más reciente por tipo.
                </div>
              </div>

              {(() => {
                const sorted = (program) => (progressRules || [])
                  .filter((r) => r.program === program)
                  .slice()
                  .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || (a.id - b.id));

                const totalPoints = (list) => list
                  .filter((r) => r.is_active !== false)
                  .reduce((acc, r) => acc + Number(r.points || 0), 0);

                const availableTypes = (program) => {
                  const used = new Set(sorted(program).map((r) => Number(r.document_type_id)));
                  const programTypes = (docTypes || []).filter((t) => {
                    const p = String(t.program || "").toUpperCase();
                    if (program === "SERVICIO") return p === "SERVICIO";
                    // PRACTICAS: incluye legacy (program null)
                    return p !== "SERVICIO";
                  });
                  return programTypes.filter((t) => !used.has(Number(t.id)));
                };

                const ProgramCard = ({ program, title, value, onChange, rules }) => {
                  const activeCount = rules.filter((r) => r.is_active !== false).length;
                  const pts = totalPoints(rules);
                  const opts = availableTypes(program);
                  return (
                    <div className="card" style={{ padding: 14, borderRadius: "var(--radius)" }}>
                      <div className="row" style={{ alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 950, fontSize: 16 }}>{title}</div>
                          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                            Pasos activos: <b>{activeCount}</b> · Total puntos: <b>{pts}</b>
                          </div>
                        </div>
                        <span className="pill pill-blue">{program}</span>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <span className="label">Agregar paso (tipo de documento)</span>
                        <div className="btn-row">
                          <select className="select" value={value} onChange={(e) => onChange(e.target.value)} style={{ minWidth: 260 }}>
                            <option value="">{opts.length === 0 ? "No hay tipos disponibles" : "Selecciona..."}</option>
                            {opts.map((t) => (
                              <option key={t.id} value={String(t.id)}>{t.name} ({t.code})</option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary"
                            type="button"
                            disabled={!value || isSavingProgressRule}
                            onClick={() => addProgressStep(program, value)}
                          >
                            {isSavingProgressRule ? "Agregando..." : "Agregar"}
                          </button>
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
                          Tip: usa <b>↑</b> y <b>↓</b> para ordenar los pasos.
                          {progressAdvanced ? " En avanzado puedes ajustar puntos y orden manualmente." : ""}
                        </div>
                      </div>

                      {rules.length === 0 ? (
                        <div style={{ color: "var(--muted)", marginTop: 12 }}>
                          No hay pasos. Agrega al menos 1 para poder calcular progreso.
                        </div>
                      ) : (
                        <div className="list" style={{ marginTop: 12 }}>
                          {rules.map((r, idx) => {
                            const isActive = r.is_active !== false;
                            return (
                              <div key={r.id} className="list-item" style={{ padding: 12, alignItems: "flex-start" }}>
                                <div style={{ width: "100%" }}>
                                  <div className="row" style={{ alignItems: "center" }}>
                                    <div>
                                      <div className="item-title">
                                        <span className="pill pill-gray" style={{ marginRight: 8 }}>Paso {idx + 1}</span>
                                        {r.document_type_name || `Tipo ${r.document_type_id}`}
                                      </div>
                                      <div className="item-meta">
                                        {r.document_type_code || ""}{isActive ? "" : " · Inactivo"}
                                      </div>
                                    </div>
                                    <div className="btn-row">
                                      <button className="btn" type="button" disabled={idx === 0} onClick={() => swapProgressRuleOrder(program, r.id, -1)}>↑</button>
                                      <button className="btn" type="button" disabled={idx === rules.length - 1} onClick={() => swapProgressRuleOrder(program, r.id, +1)}>↓</button>
                                      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <input
                                          type="checkbox"
                                          checked={isActive}
                                          onChange={(e) => updateProgressRule(r.id, { is_active: e.target.checked })}
                                        />
                                        <span style={{ color: "var(--muted)", fontSize: 12 }}>Activo</span>
                                      </label>
                                      <button className="btn" type="button" onClick={() => deleteProgressRule(r.id)}>
                                        Eliminar
                                      </button>
                                    </div>
                                  </div>

                                  <div className="row" style={{ marginTop: 10, alignItems: "center" }}>
                                    <div style={{ color: "var(--muted)", fontSize: 12 }}>
                                      Puntos: <b>{Number(r.points || 0)}</b> · Orden: <b>{Number(r.order || 0)}</b>
                                    </div>

                                    {progressAdvanced ? (
                                      <div className="btn-row">
                                        <input
                                          className="input"
                                          type="number"
                                          min="1"
                                          max="100"
                                          value={r.points}
                                          onChange={(e) => {
                                            const v = Number(e.target.value || 0);
                                            setProgressRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, points: v } : x)));
                                          }}
                                          style={{ maxWidth: 120 }}
                                        />
                                        <input
                                          className="input"
                                          type="number"
                                          value={r.order}
                                          onChange={(e) => {
                                            const v = Number(e.target.value || 0);
                                            setProgressRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, order: v } : x)));
                                          }}
                                          style={{ maxWidth: 120 }}
                                        />
                                        <button className="btn" type="button" onClick={() => updateProgressRule(r.id, { points: Number(r.points || 1), order: Number(r.order || 0) })}>
                                          Guardar
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginTop: 12 }}>
                    <ProgramCard
                      program="PRACTICAS"
                      title="Prácticas profesionales"
                      value={progressAddPracticasTypeId}
                      onChange={setProgressAddPracticasTypeId}
                      rules={sorted("PRACTICAS")}
                    />
                    <ProgramCard
                      program="SERVICIO"
                      title="Servicio social"
                      value={progressAddServicioTypeId}
                      onChange={setProgressAddServicioTypeId}
                      rules={sorted("SERVICIO")}
                    />
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {tab === "Usuarios" && (
          <>
            <div style={{ marginTop: 16 }}>
              <Tabs value={usersTab} onChange={setUsersTab} items={["Alumnos", "Revisores"]} />
            </div>

            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
              {usersTab === "Alumnos" && (
                <div className="card card-pad">
                <p className="card-title">Crear alumno</p>
                <p className="card-sub">Los alumnos entran por matrícula.</p>

                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button className="btn" type="button" onClick={() => setUiStuCreateOpen((v) => !v)}>
                    {uiStuCreateOpen ? "Minimizar" : "Expandir"}
                  </button>
                </div>

                {uiStuCreateOpen ? (
                  <>
                    <div className="btn-row" style={{ marginTop: 12 }}>
                      <span className="pill pill-gray">Crear alumno</span>
                      <span className="pill pill-gray">Carrera/Grado</span>
                      <span className="pill pill-gray">Password automatico</span>
                    </div>

                    <form onSubmit={createStudent} style={{ display: "grid", gap: 12, marginTop: 12 }}>
                      <div>
                        <span className="label">Matricula</span>
                        <input className="input" value={stuMatricula} onChange={(e) => setStuMatricula(e.target.value)} placeholder="A001" />
                      </div>

                      <div>
                        <span className="label">Nombre completo</span>
                        <input className="input" value={stuFullName} onChange={(e) => setStuFullName(e.target.value)} placeholder="Nombre Apellido" />
                      </div>

                      <div>
                        <span className="label">Carrera (opcional)</span>
                        <input className="input" value={stuCareer} onChange={(e) => setStuCareer(e.target.value)} placeholder="Ej. Ciencias de Datos" />
                      </div>

                      <div>
                        <span className="label">Grado / Grupo (opcional)</span>
                        <input className="input" value={stuGrade} onChange={(e) => setStuGrade(e.target.value)} placeholder="Ej. 5 / Grupo A" />
                      </div>

                      <div>
                        <span className="label">Password (opcional)</span>
                        <input className="input" type="password" value={stuPassword} onChange={(e) => setStuPassword(e.target.value)} placeholder="Deja vacio para generar automatica" />
                        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                          Si lo dejas vacio, se genera una automaticamente.
                        </div>
                      </div>

                      <div className="btn-row">
                        <button className="btn btn-primary" type="submit">Crear</button>
                        <button className="btn" type="button" onClick={() => { setStuMatricula(""); setStuFullName(""); setStuPassword(""); setStuCareer(""); setStuGrade(""); }}>
                          Limpiar
                        </button>
                      </div>
                    </form>
                  </>
                ) : null}
                </div>
              )}

              {usersTab === "Revisores" && (
                <div className="card card-pad">
                <p className="card-title">Crear revisor</p>
                <p className="card-sub">El revisor entra por email y revisa documentos de esta escuela.</p>

                <div className="btn-row" style={{ marginTop: 12 }}>
                  <span className="pill pill-gray">Crear revisor</span>
                  <span className="pill pill-gray">Restablecer password</span>
                </div>

                <form onSubmit={createReviewer} style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  <div>
                    <span className="label">Email</span>
                    <input className="input" value={revEmail} onChange={(e) => setRevEmail(e.target.value)} placeholder="revisor@escuela.com" />
                  </div>

                  <div>
                    <span className="label">Nombre completo</span>
                    <input className="input" value={revFullName} onChange={(e) => setRevFullName(e.target.value)} placeholder="Nombre Apellido" />
                  </div>

                  <div>
                    <span className="label">Contraseña</span>
                    <input className="input" type="password" value={revPassword} onChange={(e) => setRevPassword(e.target.value)} placeholder="Deja vacio para generar automatica" />
                  </div>

                  <div className="btn-row">
                    <button className="btn btn-primary" type="submit">Crear</button>
                    <button className="btn" type="button" onClick={() => { setRevEmail(""); setRevFullName(""); setRevPassword(""); }}>
                      Limpiar
                    </button>
                  </div>
                </form>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
              {usersTab === "Alumnos" && (
                <div className="card card-pad">
                <div className="row" style={{ alignItems: "center" }}>
                  <div>
                    <p className="card-title">Alumnos</p>
                    <p className="card-sub">Total: <b>{students.length}</b></p>
                  </div>
                  <button className="btn" type="button" onClick={() => loadStudents()} disabled={isLoading}>
                    {isLoading ? "Cargando..." : "Recargar"}
                  </button>
                </div>

                <div className="btn-row" style={{ marginTop: 12 }}>
                  <span className="pill pill-gray">Buscar</span>
                  <span className="pill pill-gray">Importar</span>
                  <span className="pill pill-gray">Editar</span>
                  <span className="pill pill-gray">Eliminar/Activar</span>
                  <span className="pill pill-gray">Restablecer password</span>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
                  Usa "Vista" para agrupar por carrera o por grado.
                </div>

                <div className="divider" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  <div>
                    <span className="label">Buscar</span>
                    <input className="input" value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Nombre o matricula" />
                  </div>
                  <div>
                    <span className="label">Vista</span>
                    <select className="select" value={studentView} onChange={(e) => setStudentView(e.target.value)}>
                      <option value="list">Lista</option>
                      <option value="career">Por carrera</option>
                      <option value="grade">Por grado</option>
                    </select>
                  </div>
                  <div>
                    <span className="label">Filtrar carrera</span>
                    <select className="select" value={studentCareerFilter} onChange={(e) => setStudentCareerFilter(e.target.value)}>
                      <option value="">Todas</option>
                      {studentCareers.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  </div>
                  <div>
                    <span className="label">Filtrar grado</span>
                    <select className="select" value={studentGradeFilter} onChange={(e) => setStudentGradeFilter(e.target.value)}>
                      <option value="">Todos</option>
                      {studentGrades.map((g) => (<option key={g} value={g}>{g}</option>))}
                    </select>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" checked={studentShowInactive} onChange={(e) => setStudentShowInactive(e.target.checked)} />
                    <span style={{ fontSize: 13 }}>Mostrar inactivos</span>
                  </label>
                </div>

                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 10 }}>
                  Mostrando: <b>{filteredStudents.length}</b> alumnos · Carreras: <b>{studentCareers.length}</b> · Grados: <b>{studentGrades.length}</b>
                </div>

                <div className="divider" />
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>Importar lista</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    Formatos: <b>CSV</b>, <b>TSV</b>, <b>TXT</b>, <b>XLSX</b>, <b>DOCX</b>, <b>PDF</b>. Columnas sugeridas: <code>matricula</code>, <code>full_name</code>, <code>carrera</code>/<code>categoria</code>, <code>grado</code>/<code>grupo</code>.
                  </div>

                  <input
                    className="input"
                    type="file"
                    accept=".csv,.tsv,.txt,.xlsx,.docx,.pdf"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />

                  <div className="grid-2" style={{ gap: 12 }}>
                    <div>
                      <span className="label">Si la matrícula ya existe</span>
                      <select className="select" value={importMode} onChange={(e) => setImportMode(e.target.value)}>
                        <option value="skip">Omitir</option>
                        <option value="update">Actualizar nombre/categoría</option>
                      </select>
                    </div>
                    <div>
                      <span className="label">Contraseña por defecto</span>
                      <input
                        className="input"
                        type="password"
                        value={importDefaultPassword}
                        onChange={(e) => setImportDefaultPassword(e.target.value)}
                      />
                      <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                        Tip: usa <b>AUTO</b> para generar por alumno (nombre + matricula).
                      </div>
                    </div>
                  </div>

                  <div className="btn-row">
                    <button className="btn btn-primary" type="button" onClick={importStudents} disabled={importing}>
                      {importing ? "Importando..." : "Importar"}
                    </button>
                    {importResult?.credentials?.length ? (
                      <button className="btn" type="button" onClick={downloadCredentialsCsv}>
                        Descargar credenciales (CSV)
                      </button>
                    ) : null}
                    {importResult ? (
                      <span style={{ color: "var(--muted)", fontSize: 13 }}>
                        Filas: <b>{importResult.rows}</b> · Procesadas: <b>{importResult.processed}</b> · Creadas: <b>{importResult.created}</b> · Actualizadas: <b>{importResult.updated}</b> · Omitidas: <b>{importResult.skipped}</b> · Credenciales: <b>{importResult.credentials_count ?? (importResult.credentials?.length || 0)}</b> · Errores: <b>{importResult.errors_count}</b>
                      </span>
                    ) : null}
                  </div>

                  {importResult?.errors?.length ? (
                    <div className="alert" style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Errores (primeros {importResult.errors.length})</div>
                      <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", fontSize: 12 }}>
                        {importResult.errors.map((er, idx) => (
                          <li key={idx}>
                            Fila {er.row}: {er.matricula ? <b>{er.matricula}</b> : null} {er.detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {filteredStudents.length === 0 ? (
                  <div style={{ color: "var(--muted)", marginTop: 12 }}>No hay alumnos.</div>
                ) : studentView === "list" ? (
                  <div className="table-wrap"><table className="table" style={{ minWidth: 920 }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Matrícula</th>
                        <th>Grado</th>
                        <th>Carrera</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td><b>{u.full_name}</b></td>
                          <td style={{ color: "var(--muted)" }}>{u.matricula || "-"}</td>
                          <td style={{ color: "var(--muted)" }}>{u.group_name || "-"}</td>
                          <td style={{ color: "var(--muted)" }}>{u.category || "-"}</td>
                          <td>
                            <span className={`pill ${u.is_active ? "pill-green" : "pill-gray"}`}>
                              {u.is_active ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td>
                            <div className="btn-row">
                              <button
                                className="btn"
                                type="button"
                                onClick={() =>
                                  setEditingStudent({
                                    id: u.id,
                                    matricula: u.matricula || "",
                                    full_name: u.full_name || "",
                                    career: u.category || "",
                                    grade: u.group_name || "",
                                    is_active: u.is_active !== false,
                                  })
                                }
                              >
                                Editar
                              </button>
                              <button className="btn" type="button" onClick={() => resetUserPassword(u.id, u.matricula || `ID ${u.id}`)}>
                                Restablecer password
                              </button>
                              {u.is_active !== false ? (
                                <button className="btn" type="button" onClick={() => deleteStudent(u)}>
                                  Eliminar
                                </button>
                              ) : (
                                <button className="btn" type="button" onClick={() => toggleStudentActive(u, true)}>
                                  Activar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                ) : studentView === "career" ? (
                  <div className="list" style={{ marginTop: 12 }}>
                    {studentsByCareer.map(([career, list]) => (
                      <div key={career} className="list-item" style={{ alignItems: "flex-start" }}>
                        <div style={{ width: "100%" }}>
                          <div className="row" style={{ alignItems: "center" }}>
                            <div>
                              <div className="item-title">{career}</div>
                              <div className="item-meta">Alumnos: {list.length}</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
                            {list.slice(0, 10).map((s) => `${s.matricula} - ${s.full_name}`).join(" · ")}
                            {list.length > 10 ? " · ..." : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="list" style={{ marginTop: 12 }}>
                    {studentsByGrade.map(([grade, list]) => (
                      <div key={grade} className="list-item" style={{ alignItems: "flex-start" }}>
                        <div style={{ width: "100%" }}>
                          <div className="row" style={{ alignItems: "center" }}>
                            <div>
                              <div className="item-title">{grade}</div>
                              <div className="item-meta">Alumnos: {list.length}</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
                            {list.slice(0, 10).map((s) => `${s.matricula} - ${s.full_name}`).join(" · ")}
                            {list.length > 10 ? " · ..." : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              )}

              {usersTab === "Revisores" && (
                <div className="card card-pad">
                <div className="row" style={{ alignItems: "center" }}>
                  <div>
                    <p className="card-title">Revisores</p>
                    <p className="card-sub">Total: <b>{reviewers.length}</b></p>
                  </div>
                  <button className="btn" type="button" onClick={() => loadReviewers()} disabled={isLoading}>
                    {isLoading ? "Cargando..." : "Recargar"}
                  </button>
                </div>
                {reviewers.length === 0 ? (
                  <div style={{ color: "var(--muted)", marginTop: 12 }}>No hay revisores.</div>
                ) : (
                  <div className="table-wrap"><table className="table" style={{ minWidth: 860 }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewers.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td><b>{u.full_name}</b></td>
                          <td style={{ color: "var(--muted)" }}>{u.email || "-"}</td>
                          <td>
                            <span className={`pill ${u.is_active ? "pill-green" : "pill-gray"}`}>
                              {u.is_active ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td>
                            <div className="btn-row">
                              <button className="btn" type="button" onClick={() => resetUserPassword(u.id, u.email || `ID ${u.id}`)}>
                                Restablecer password
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
                </div>
              )}

              {usersTab === "Revisores" && (
                <div className="card card-pad" style={{ marginTop: 16 }}>
                  <div className="row" style={{ alignItems: "center" }}>
                    <div>
                      <p className="card-title">Fotos de revisores</p>
                      <p className="card-sub">Solicitudes pendientes de aprobación.</p>
                    </div>
                    <button
                      className="btn"
                      type="button"
                      onClick={loadReviewerPhotoRequests}
                      disabled={isLoadingReviewerPhotos}
                    >
                      {isLoadingReviewerPhotos ? "Cargando..." : "Recargar"}
                    </button>
                  </div>

                  {reviewerPhotoError ? (
                    <div className="alert alert-error" style={{ marginTop: 12 }}>{reviewerPhotoError}</div>
                  ) : null}

                  {reviewerPhotoRequests.length === 0 ? (
                    <div style={{ color: "var(--muted)", marginTop: 12 }}>No hay solicitudes.</div>
                  ) : (
                    <div className="table-wrap"><table className="table" style={{ minWidth: 860 }}>
                      <thead>
                        <tr>
                          <th>Revisor</th>
                          <th>Foto</th>
                          <th>Fecha</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewerPhotoRequests.map((r) => (
                          <tr key={r.user_id}>
                            <td>
                              <div style={{ fontWeight: 800 }}>{r.full_name}</div>
                              <div style={{ color: "var(--muted)", fontSize: 12 }}>{r.email || "-"}</div>
                            </td>
                            <td>
                              {r.url ? (
                                <img
                                  src={r.url}
                                  alt={`Foto de ${r.full_name}`}
                                  style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: "1px solid var(--border)", background: "#fff" }}
                                />
                              ) : (
                                <span style={{ color: "var(--muted)" }}>-</span>
                              )}
                            </td>
                            <td style={{ color: "var(--muted)" }}>
                              {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                            </td>
                            <td>
                              <div className="btn-row">
                                <button className="btn btn-primary" type="button" onClick={() => decideReviewerPhoto(r.user_id, "APPROVED")}>
                                  Aprobar
                                </button>
                                <button className="btn" type="button" onClick={() => decideReviewerPhoto(r.user_id, "REJECTED")}>
                                  Rechazar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  )}
                </div>
              )}

              {usersTab === "Alumnos" && (
                <div className="card card-pad" style={{ marginTop: 16 }}>
                  <div className="row" style={{ alignItems: "center" }}>
                    <div>
                      <p className="card-title">Fotos de alumnos</p>
                      <p className="card-sub">Solicitudes pendientes de aprobacion.</p>
                    </div>
                    <button
                      className="btn"
                      type="button"
                      onClick={loadStudentPhotoRequests}
                      disabled={isLoadingStudentPhotos}
                    >
                      {isLoadingStudentPhotos ? "Cargando..." : "Recargar"}
                    </button>
                  </div>

                  {studentPhotoError ? (
                    <div className="alert alert-error" style={{ marginTop: 12 }}>{studentPhotoError}</div>
                  ) : null}

                  {studentPhotoRequests.length === 0 ? (
                    <div style={{ color: "var(--muted)", marginTop: 12 }}>No hay solicitudes.</div>
                  ) : (
                    <div className="table-wrap"><table className="table" style={{ minWidth: 860 }}>
                      <thead>
                        <tr>
                          <th>Alumno</th>
                          <th>Foto</th>
                          <th>Fecha</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentPhotoRequests.map((s) => (
                          <tr key={s.user_id}>
                            <td>
                              <div style={{ fontWeight: 800 }}>{s.full_name}</div>
                              <div style={{ color: "var(--muted)", fontSize: 12 }}>{s.matricula || "-"}</div>
                            </td>
                            <td>
                              {s.url ? (
                                <img
                                  src={s.url}
                                  alt={`Foto de ${s.full_name}`}
                                  style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: "1px solid var(--border)", background: "#fff" }}
                                />
                              ) : (
                                <span style={{ color: "var(--muted)" }}>-</span>
                              )}
                            </td>
                            <td style={{ color: "var(--muted)" }}>
                              {s.created_at ? new Date(s.created_at).toLocaleString() : "-"}
                            </td>
                            <td>
                              <div className="btn-row">
                                <button className="btn btn-primary" type="button" onClick={() => decideStudentPhoto(s.user_id, "APPROVED")}>
                                  Aprobar
                                </button>
                                <button className="btn" type="button" onClick={() => decideStudentPhoto(s.user_id, "REJECTED")}>
                                  Rechazar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  )}
                </div>
              )}
            </div>
              </>
            )}

        {tab === "Branding" && (
            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">Branding</p>
              <p className="card-sub">Personaliza identidad, login y estilo general de los dashboards.</p>

              <div className="branding-hero" style={{ marginTop: 12 }}>
                <div
                  className="branding-hero-bg"
                  style={{
                    background: secondaryColor
                      ? `linear-gradient(110deg, ${color} 0%, ${secondaryColor} 100%)`
                      : `linear-gradient(110deg, ${color} 0%, ${color} 100%)`,
                  }}
                />
                <div className="branding-hero-inner">
                  <div className="branding-hero-logo">
                    {logo ? <img src={logo} alt="logo" /> : <span style={{ fontWeight: 900 }}>A</span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="branding-hero-title">{displayName || "Institucion"}</div>
                    <div className="branding-hero-sub">Vista previa rapida de tu marca</div>
                  </div>
                  <div className="branding-hero-actions">
                    <span className="pill pill-gray">Boton</span>
                    <span className="pill pill-gray">Etiqueta</span>
                  </div>
                </div>
              </div>

              <form onSubmit={saveBranding} style={{ display: "grid", gap: 12, maxWidth: 920, marginTop: 14 }}>
              <div style={{ fontWeight: 900, marginTop: 6 }}>Identidad</div>
              <div>
                <span className="label">Nombre para mostrar</span>
                <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nombre de la institución" />
              </div>


              <div>
                <span className="label">Paletas de color</span>
                <div className="palette-grid">
                  {BRAND_PALETTES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`palette-card ${selectedPaletteId === p.id ? "active" : ""}`}
                      onClick={() => applyPalette(p)}
                      title={`${p.primary}${p.secondary ? ` / ${p.secondary}` : ""}`}
                    >
                      <div
                        className="palette-swatch"
                        style={{ background: p.secondary ? `linear-gradient(90deg, ${p.primary}, ${p.secondary})` : p.primary }}
                      />
                      <div className="palette-name">{p.name}</div>
                      <div className="palette-meta">
                        {p.primary}{p.secondary ? ` / ${p.secondary}` : ""}
                      </div>
                    </button>
                  ))}

                  <button
                    type="button"
                    className={`palette-card ${selectedPaletteId === "custom" ? "active" : ""}`}
                    onClick={() => showToast("Edita los colores abajo para personalizar.")}
                    title="Personalizado"
                  >
                    <div
                      className="palette-swatch"
                      style={{ background: secondaryColor ? `linear-gradient(90deg, ${color}, ${secondaryColor})` : color }}
                    />
                    <div className="palette-name">Personalizado</div>
                    <div className="palette-meta">Elige tus colores</div>
                  </button>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
                  Selecciona una paleta y ajusta los colores si lo necesitas.
                </div>
              </div>
              <div>
                <span className="label">Color principal</span>
                <div className="btn-row">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                  <code style={{ color: "var(--muted)" }}>{color}</code>
                </div>
              </div>

              <div>
                <span className="label">Color secundario</span>
                <div className="btn-row">
                  <input type="color" value={secondaryColor || "#111827"} onChange={(e) => setSecondaryColor(e.target.value)} />
                  <code style={{ color: "var(--muted)" }}>{secondaryColor || "-"}</code>
                  <button className="btn" type="button" onClick={() => setSecondaryColor("")}>Quitar</button>
                </div>
              </div>

              <div>
                <span className="label">Logo (URL)</span>
                <input className="input" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
              </div>

              <div>
                <span className="label">Favicon (URL)</span>
                <input className="input" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://..." />
              </div>

              <div className="divider" />
              <div style={{ fontWeight: 900, marginTop: 6 }}>Login</div>

              <div>
                <span className="label">Login titulo</span>
                <input className="input" value={loginTitle} onChange={(e) => setLoginTitle(e.target.value)} placeholder="Ej. Portal del alumno" />
              </div>

              <div>
                <span className="label">Login subtitulo</span>
                <input className="input" value={loginSubtitle} onChange={(e) => setLoginSubtitle(e.target.value)} placeholder="Ej. Gestion de documentos" />
              </div>

              <div>
                <span className="label">Fondo del login</span>
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {["default", "image", "solid", "gradient"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`chip ${loginBgMode === m ? "active" : ""}`}
                      onClick={() => setLoginBgMode(m)}
                    >
                      {m === "default" ? "Por defecto" : m === "image" ? "Imagen" : m === "solid" ? "Color" : "Gradiente"}
                    </button>
                  ))}
                </div>

                {loginBgMode === "image" ? (
                  <div style={{ marginTop: 10 }}>
                    <span className="label">Imagen (URL)</span>
                    <input className="input" value={loginBgUrl} onChange={(e) => setLoginBgUrl(e.target.value)} placeholder="https://..." />
                    <div style={{ marginTop: 10 }}>
                      <span className="label">Overlay (claridad): {loginBgOverlay}%</span>
                      <input
                        className="input"
                        type="range"
                        min="0"
                        max="95"
                        value={loginBgOverlay}
                        onChange={(e) => setLoginBgOverlay(parseInt(e.target.value, 10))}
                      />
                    </div>
                  </div>
                ) : null}

                {loginBgMode === "solid" ? (
                  <div style={{ marginTop: 10 }}>
                    <span className="label">Color de fondo</span>
                    <div className="btn-row">
                      <input type="color" value={loginBgColor || "#f8fafc"} onChange={(e) => setLoginBgColor(e.target.value)} />
                      <code style={{ color: "var(--muted)" }}>{loginBgColor || "-"}</code>
                    </div>
                  </div>
                ) : null}

                {loginBgMode === "gradient" ? (
                  <div style={{ marginTop: 10 }}>
                    <div className="alert alert-info">
                      Gradiente automatico usando tu paleta de marca (color principal y secundario).
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <span className="label">Modelo de login</span>
                <select className="select" value={loginTheme} onChange={(e) => setLoginTheme(e.target.value)}>
                  <option value="school">Escolar</option>
                  <option value="modern">Moderno</option>
                  <option value="minimal">Minimal</option>
                </select>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                  Se aplica al login de esta escuela (no afecta admin.*).
                </div>
              </div>

              <div>
                <span className="label">Estilo de tarjeta (login)</span>
                <select className="select" value={loginCardStyle} onChange={(e) => setLoginCardStyle(e.target.value)}>
                  <option value="solid">Solida</option>
                  <option value="glass">Cristal</option>
                </select>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={loginShowDemo} onChange={(e) => setLoginShowDemo(e.target.checked)} />
                <span style={{ fontSize: 13 }}>Mostrar "Credenciales demo"</span>
              </label>

              <div>
                <span className="label">Texto al pie (login)</span>
                <input className="input" value={loginFooterText} onChange={(e) => setLoginFooterText(e.target.value)} placeholder="Ej. Soporte: soporte@escuela.edu" />
              </div>

              <div className="divider" />
              <div style={{ fontWeight: 900, marginTop: 6 }}>Dashboards</div>

              <div>
                <span className="label">Fondo del dashboard</span>
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {["default", "solid"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`chip ${dashboardBgMode === m ? "active" : ""}`}
                      onClick={() => setDashboardBgMode(m)}
                    >
                      {m === "default" ? "Por defecto" : "Color solido"}
                    </button>
                  ))}
                </div>
                {dashboardBgMode === "solid" ? (
                  <div style={{ marginTop: 10 }}>
                    <span className="label">Color</span>
                    <div className="btn-row">
                      <input type="color" value={dashboardBgColor || "#eef1fb"} onChange={(e) => setDashboardBgColor(e.target.value)} />
                      <code style={{ color: "var(--muted)" }}>{dashboardBgColor || "-"}</code>
                    </div>
                  </div>
                ) : null}
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
                  Se aplica a todos los dashboards (alumno, revisor y admin del tenant).
                </div>
              </div>

              <div>
                <span className="label">Densidad</span>
                <select className="select" value={uiDensity} onChange={(e) => setUiDensity(e.target.value)}>
                  <option value="compact">Compacta</option>
                  <option value="comfortable">Normal</option>
                  <option value="spacious">Espaciosa</option>
                </select>
              </div>

              <div>
                <span className="label">Sombra</span>
                <select className="select" value={uiShadow} onChange={(e) => setUiShadow(e.target.value)}>
                  <option value="soft">Suave</option>
                  <option value="medium">Media</option>
                  <option value="none">Sin sombra</option>
                </select>
              </div>

              <div>
                <span className="label">Radio (bordes): {uiRadius}px</span>
                <input
                  className="input"
                  type="range"
                  min="10"
                  max="26"
                  value={uiRadius}
                  onChange={(e) => setUiRadius(parseInt(e.target.value, 10))}
                />
              </div>

              <div>
                <span className="label">Header / Topbar</span>
                <select className="select" value={dashboardHeaderStyle} onChange={(e) => setDashboardHeaderStyle(e.target.value)}>
                  <option value="solid">Solido</option>
                  <option value="brand">Con marca</option>
                </select>
              </div>

              <div className="btn-row">
                <button className="btn btn-primary" type="submit">Guardar</button>
                <button className="btn" type="button" onClick={loadTenantConfig}>Recargar</button>
              </div>
            </form>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">Vista previa (login)</p>
              <div
                style={{
                  marginTop: 12,
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  backgroundColor: (loginBgMode === "solid" ? (loginBgColor || "#f8fafc") : "#f8fafc"),
                  backgroundImage:
                    loginBgMode === "solid"
                      ? "none"
                      : loginBgMode === "gradient"
                      ? `linear-gradient(135deg, ${color}, ${secondaryColor || color})`
                      : (loginBgMode === "image" && loginBgUrl)
                        ? `linear-gradient(180deg, rgba(248,250,252,${Math.min(0.95, Math.max(0, Number(loginBgOverlay || 78) / 100))}), rgba(248,250,252,0.94)), url(${loginBgUrl})`
                        : (loginBgUrl ? `linear-gradient(180deg, rgba(248,250,252,0.88), rgba(248,250,252,0.94)), url(${loginBgUrl})` : "none"),
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  color: "var(--text)",
                  padding: 18,
                }}
              >
                <div className="btn-row">
                  <div className="brand-logo-lg">
                    {logo ? <img src={logo} alt="logo" /> : <span style={{ fontWeight: 900 }}>E</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{loginTitle || displayName || "Portal"}</div>
                    <div style={{ color: "var(--muted)", marginTop: 4 }}>{loginSubtitle || "Inicia sesion para continuar."}</div>
                    <div style={{ color: "var(--muted)", marginTop: 6, fontSize: 12 }}>
                      Login: <b>{loginTheme}</b> · Tarjeta: <b>{loginCardStyle}</b> · Densidad: <b>{uiDensity}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </main>

      {credModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="row" style={{ alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>{credModal.title}</h2>
              <button className="btn" type="button" onClick={() => setCredModal(null)}>Cerrar</button>
            </div>

            <div className="divider" />
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Usuario: <b>{credModal.userLabel}</b>
            </div>

            <div style={{ marginTop: 12 }}>
              <span className="label">Password</span>
              <div className="row" style={{ gap: 10, alignItems: "center" }}>
                <input className="input" value={credModal.password} readOnly />
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(credModal.password)}
                >
                  Copiar
                </button>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
                Se muestra solo ahora. Si se pierde, usa "Restablecer password".
              </div>
            </div>
          </div>
        </div>
      )}

      {editingType && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="row" style={{ alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>Editar tipo</h2>
              <button className="btn" type="button" onClick={() => setEditingType(null)}>Cerrar</button>
            </div>

            <form onSubmit={saveType} style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div>
                <span className="label">Programa</span>
                <select className="select" value={editingType.program ?? "PRACTICAS"} onChange={(e) => setEditingType((p) => ({ ...p, program: e.target.value }))}>
                  <option value="PRACTICAS">Practicas</option>
                  <option value="SERVICIO">Servicio social</option>
                </select>
              </div>
              <div>
                <span className="label">Nombre</span>
                <input className="input" value={editingType.name} onChange={(e) => setEditingType((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <span className="label">Código</span>
                <input className="input" value={editingType.code} onChange={(e) => setEditingType((p) => ({ ...p, code: e.target.value }))} />
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="row" style={{ alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>Editar alumno</h2>
              <button className="btn" type="button" onClick={() => setEditingStudent(null)}>Cerrar</button>
            </div>

            <form onSubmit={saveStudent} style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div>
                <span className="label">Matricula</span>
                <input className="input" value={editingStudent.matricula || ""} onChange={(e) => setEditingStudent((p) => ({ ...p, matricula: e.target.value }))} />
              </div>
              <div>
                <span className="label">Nombre completo</span>
                <input className="input" value={editingStudent.full_name || ""} onChange={(e) => setEditingStudent((p) => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div>
                <span className="label">Carrera (opcional)</span>
                <input className="input" value={editingStudent.career || ""} onChange={(e) => setEditingStudent((p) => ({ ...p, career: e.target.value }))} />
              </div>
              <div>
                <span className="label">Grado / Grupo (opcional)</span>
                <input className="input" value={editingStudent.grade || ""} onChange={(e) => setEditingStudent((p) => ({ ...p, grade: e.target.value }))} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={!!editingStudent.is_active} onChange={(e) => setEditingStudent((p) => ({ ...p, is_active: e.target.checked }))} />
                <span style={{ fontSize: 13 }}>Activo</span>
              </label>
              <div className="btn-row">
                <button className="btn btn-primary" type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}


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

