"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../../lib/api";
import { clearToken, getToken } from "../../../lib/token";
import { computeApexHost } from "../../../lib/marketing";

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

function logout() {
  clearToken("admin");
  window.location.href = "/";
}

function IconButton({ children, onClick }) {
  return (
    <button className="icon-btn" onClick={onClick} type="button">
      {children}
    </button>
  );
}

function TopbarSuperAdmin({ onLogout, userName = "Super Admin", roleLabel = "Global" }) {
  const initial = (userName || "S").trim().charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-left">
          <div className="brand-icon">S</div>
          <div>
            <div className="brand-title">Super Admin</div>
            <div className="brand-subtitle">Gestion global del sistema</div>
          </div>
        </div>

        <div className="topbar-center">
          <label className="topbar-search">
            <span className="topbar-search-icon" aria-hidden="true" />
            <input type="search" aria-label="Buscar en el panel global" placeholder="Buscar escuelas o usuarios" />
          </label>
        </div>

        <div className="topbar-actions">
          <IconButton onClick={() => window.location.href = "/admin/tenants"}>Escuelas</IconButton>
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

function formatLocalDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function statusPillClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DONE") return "pill-green";
  if (s === "IN_PROGRESS") return "pill-blue";
  return "pill-gray";
}

function buildHost(subdomain, baseDomain) {
  const s = String(subdomain || "").trim().toLowerCase();
  if (!s) return baseDomain;
  if (s.includes(".")) return s;
  if (!baseDomain) return s;
  return `${s}.${baseDomain}`;
}

function buildAbsoluteUrl(hostname, path = "/") {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return p;
  if (!hostname) return p;
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${hostname}${port}${p}`;
}

function ContactModal({ item, onClose, token, onRefresh, onToast, baseDomain }) {
  const [status, setStatus] = useState(item?.status || "NEW");
  const [clientName, setClientName] = useState(item?.client_name || "");
  const [schoolName, setSchoolName] = useState(item?.school_name || "");
  const [desiredSlug, setDesiredSlug] = useState(item?.desired_slug || "");
  const [notes, setNotes] = useState(item?.notes || "");

  const [adminEmail, setAdminEmail] = useState(item?.email || "");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  async function saveOnly() {
    setErr("");
    setBusy(true);
    try {
      await apiPatch(
        `/contact/requests/${item.id}`,
        {
          status,
          client_name: clientName,
          school_name: schoolName,
          desired_slug: desiredSlug ? slugify(desiredSlug) : null,
          notes,
        },
        token,
      );
      onToast("Solicitud actualizada.");
      await onRefresh();
      onClose();
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  async function createTenantAndAdmin() {
    setErr("");
    setBusy(true);
    try {
      const slug = slugify(desiredSlug || schoolName);
      const name = (schoolName || "").trim();
      if (!slug) throw new Error("Ingresa un slug o nombre de escuela.");
      if (!name) throw new Error("Ingresa el nombre de la escuela.");

      const adminE = (adminEmail || "").trim().toLowerCase();
      const adminN = (adminFullName || "").trim();
      const adminP = (adminPassword || "").trim();
      if (!adminE) throw new Error("Ingresa el email del admin.");
      if (!adminN) throw new Error("Ingresa el nombre del admin.");
      if (!adminP || adminP.length < 8) throw new Error("Contraseña muy corta (min 8).");

      const createdTenant = await apiPost("/tenants", { slug, name }, token);
      const tenantId = createdTenant?.id;
      if (!tenantId) throw new Error("No se pudo crear la escuela.");

      await apiPost("/users/tenant-admin", { tenant_id: tenantId, email: adminE, full_name: adminN, password: adminP }, token);

      await apiPatch(
        `/contact/requests/${item.id}`,
        {
          status: "DONE",
          client_name: clientName,
          school_name: name,
          desired_slug: slug,
          created_tenant_id: tenantId,
          notes: (notes || "").trim() || `Tenant creado: ${slug} (#${tenantId})`,
        },
        token,
      );

      onToast(`Listo: ${baseDomain ? `${slug}.${baseDomain}` : slug}`);
      await onRefresh();
      onClose();
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: 980 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Solicitud #{item.id}</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
              {item.email} · {formatLocalDate(item.created_at)}
            </div>
          </div>
          <button className="btn" type="button" onClick={onClose}>Cerrar</button>
        </div>

        {err ? <div className="alert alert-error" style={{ marginTop: 12 }}>{err}</div> : null}

        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="card card-pad">
            <p className="card-title">Mensaje</p>
            <div style={{ whiteSpace: "pre-wrap", marginTop: 10, lineHeight: 1.5 }}>{item.message}</div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 12 }}>
              Host: <b>{item.source_host || "-"}</b> · IP: <b>{item.source_ip || "-"}</b>
            </div>
          </div>

          <div className="card card-pad">
            <p className="card-title">Gestion</p>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div>
                <span className="label">Estado</span>
                <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="NEW">Nuevo</option>
                  <option value="IN_PROGRESS">En progreso</option>
                  <option value="DONE">Cerrado</option>
                </select>
              </div>
              <div>
                <span className="label">Nombre del cliente (opcional)</span>
                <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre / contacto" />
              </div>
              <div>
                <span className="label">Escuela</span>
                <input className="input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Universidad X" />
              </div>
              <div>
                <span className="label">Slug deseado</span>
                <input className="input" value={desiredSlug} onChange={(e) => setDesiredSlug(e.target.value)} placeholder="universidadx" />
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                  URL: <b>{buildHost(slugify(desiredSlug || schoolName) || "escuela", baseDomain)}</b>
                </div>
              </div>
              <div>
                <span className="label">Notas</span>
                <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ resize: "vertical" }} />
              </div>

              <div className="btn-row">
                <button className="btn" type="button" onClick={saveOnly} disabled={busy}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card card-pad" style={{ marginTop: 12 }}>
          <p className="card-title">Dar de alta (opcional)</p>
          <p className="card-sub">Crea la escuela y un administrador con los datos de abajo.</p>

          <div className="grid-3" style={{ marginTop: 12 }}>
            <div>
              <span className="label">Email admin</span>
              <input className="input" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@escuela.edu" />
            </div>
            <div>
              <span className="label">Nombre admin</span>
              <input className="input" value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <span className="label">Contraseña</span>
              <input className="input" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Min 8 caracteres" />
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="button" onClick={createTenantAndAdmin} disabled={busy}>
              {busy ? "Procesando..." : "Crear escuela + admin"}
            </button>
            {item.created_tenant_id ? (
              <span style={{ color: "var(--muted)", fontSize: 13 }}>
                Tenant creado: <b>#{item.created_tenant_id}</b>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminPanelPage() {
  const tabs = useMemo(() => ["Resumen", "Escuelas", "Contactos", "Sistema"], []);
  const [tab, setTab] = useState("Resumen");
  const [baseDomain, setBaseDomain] = useState("");

  const [me, setMe] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tenantStats, setTenantStats] = useState([]);
  const [health, setHealth] = useState(null);
  const [contactRequests, setContactRequests] = useState([]);
  const [contactModal, setContactModal] = useState(null);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");

  const [adminTenantId, setAdminTenantId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((t) => t.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [tenants]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBaseDomain(
      computeApexHost(window.location.hostname) || window.location.hostname.toLowerCase(),
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (!requestedTab) return;

    const requestedNorm = normalizeTabName(requestedTab);
    const match = tabs.find((it) => normalizeTabName(it) === requestedNorm);
    if (match && match !== tab) setTab(match);
  }, [tabs, tab]);

  const loadAll = async ({ silent = false } = {}) => {
    const token = getToken("admin");
    if (!token) return;
    if (!silent) { setError(""); setOk(""); setIsLoading(true); }
    try {
      const meData = await apiGet("/auth/me", token);
      if (meData.role !== "SUPER_ADMIN") throw new Error("Solo SUPER_ADMIN puede acceder aquí.");
      setMe(meData);

      const list = await apiGet("/tenants", token);
      setTenants(list || []);

      const statsList = await apiGet("/tenants/user-stats", token).catch(() => []);
      setTenantStats(statsList || []);

      const h = await apiGet("/health", token).catch(() => null);
      setHealth(h);

      const contacts = await apiGet("/contact/requests", token).catch(() => []);
      setContactRequests(Array.isArray(contacts) ? contacts : []);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken("admin");
    if (!token) { window.location.href = "/"; return; }
    loadAll().catch((e) => setError(e.message || "Error"));
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      loadAll({ silent: true });
    };
    const intervalId = window.setInterval(tick, 10000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const createTenant = async (e) => {
    e.preventDefault();
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      const s = (slug || "").trim().toLowerCase();
      const n = (name || "").trim();
      if (!s) throw new Error("Ingresa un slug.");
      if (!n) throw new Error("Ingresa un nombre.");

      await apiPost("/tenants", { slug: s, name: n }, token);
      setSlug(""); setName("");
      setOk("Escuela creada.");
      await loadAll({ silent: true });
      setTab("Escuelas");
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const toggleActive = async (tenant) => {
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      await apiPatch(`/tenants/${tenant.id}`, { is_active: !tenant.is_active }, token);
      setOk(`Escuela ${!tenant.is_active ? "activada" : "desactivada"}.`);
      await loadAll({ silent: true });
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const createTenantAdmin = async (e) => {
    e.preventDefault();
    const token = getToken("admin");
    if (!token) return;
    setError(""); setOk("");
    try {
      const tenantId = parseInt(adminTenantId, 10);
      if (!tenantId) throw new Error("Selecciona una escuela.");
      const email = (adminEmail || "").trim().toLowerCase();
      const fullName = (adminFullName || "").trim();
      const password = (adminPassword || "").trim();

      if (!email) throw new Error("Ingresa el email del admin.");
      if (!fullName) throw new Error("Ingresa el nombre completo.");
      if (!password) throw new Error("Ingresa una contraseña.");

      await apiPost("/users/tenant-admin", { tenant_id: tenantId, email, full_name: fullName, password }, token);
      setOk(`Administrador creado: ${email}`);
      setAdminEmail("");
      setAdminFullName("");
      setAdminPassword("");
      await loadAll({ silent: true });
      setTab("Escuelas");
    } catch (e) {
      setError(e.message || "Error");
    }
  };

  const tableRows = tenantStats.length ? tenantStats : tenants.map((t) => ({
    tenant_id: t.id,
    slug: t.slug,
    name: t.name,
    is_active: t.is_active,
    users_total: 0,
    tenant_admins: 0,
    reviewers: 0,
    students: 0,
  }));

  const contactStats = useMemo(() => {
    const total = contactRequests.length;
    const by = { NEW: 0, IN_PROGRESS: 0, DONE: 0 };
    for (const r of contactRequests) {
      const s = String(r?.status || "NEW").toUpperCase();
      if (s in by) by[s] += 1;
      else by.NEW += 1;
    }
    return { total, ...by };
  }, [contactRequests]);

  const toast = (msg) => {
    setError("");
    setOk(String(msg || ""));
  };

  return (
    <>
      <TopbarSuperAdmin
        onLogout={logout}
        userName={me?.full_name || "Super Admin"}
        roleLabel="Administrador global"
      />
      <main className="container">
        <h1 className="h1">Panel del Super Admin</h1>
        <p className="p-muted">Administra escuelas (tenants) y revisa el estado del sistema.</p>

        <div className="tabs-shell">
          <Tabs
            value={tab}
            onChange={setTab}
            items={tabs}
            variant="side"
            header={(
              <div className="sidebar-brand" aria-label="Panel super admin">
                <div className="sidebar-brand-icon" aria-hidden="true">S</div>
                <div>
                  <div className="sidebar-brand-title">Super Admin</div>
                  <div className="sidebar-brand-sub">Global</div>
                </div>
              </div>
            )}
          />
          <div className="tabs-panel">
            {error && <div className="alert alert-error" style={{ marginTop: 0 }}>{error}</div>}
            {ok && <div className="alert alert-ok" style={{ marginTop: 0 }}>{ok}</div>}

            {tab === "Resumen" && (
              <>
            <div className="grid-3" style={{ marginTop: 0 }}>
              <div className="card card-pad">
                <p className="card-title">Escuelas</p>
                <div style={{ fontSize: 28, fontWeight: 950, marginTop: 10 }}>{stats.total}</div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
                  Activas: <b>{stats.active}</b> · Inactivas: <b>{stats.inactive}</b>
                </div>
              </div>

              <div className="card card-pad">
                <p className="card-title">Tu sesión</p>
                {!me ? (
                  <div style={{ color: "var(--muted)" }}>Cargando...</div>
                ) : (
                  <>
                    <div style={{ fontWeight: 900, marginTop: 10 }}>{me.full_name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{me.role}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 10 }}>
                      Host: <b>{typeof window !== "undefined" ? window.location.host : "-"}</b>
                    </div>
                  </>
                )}
              </div>

              <div className="card card-pad">
                <p className="card-title">Sistema</p>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>
                  API: <b>{health?.ok ? "OK" : "..."}</b>
                </div>
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button className="btn btn-primary" type="button" onClick={() => loadAll()} disabled={isLoading}>
                    {isLoading ? "Cargando..." : "Recargar"}
                  </button>
                  <button className="btn" type="button" onClick={() => setTab("Escuelas")}>Ir a Escuelas</button>
                </div>
              </div>
            </div>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">Crear nueva escuela</p>
              <p className="card-sub">Crea un tenant con subdominio.</p>

              <form onSubmit={createTenant} style={{ display: "grid", gap: 12, maxWidth: 520, marginTop: 12 }}>
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
                    URL: <code>{buildHost((slug || "escuela3").trim().toLowerCase(), baseDomain)}</code>
                  </span>
                </div>
              </form>
            </div>

            <div className="card card-pad" style={{ marginTop: 16 }}>
              <p className="card-title">Crear administrador de escuela</p>
              <p className="card-sub">Crea un usuario TENANT_ADMIN para una escuela.</p>

              <form onSubmit={createTenantAdmin} style={{ display: "grid", gap: 12, maxWidth: 520, marginTop: 12 }}>
                <div>
                  <span className="label">Escuela</span>
                  <select className="select" value={adminTenantId} onChange={(e) => setAdminTenantId(e.target.value)}>
                    <option value="">Selecciona...</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="label">Email</span>
                  <input className="input" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@escuela.com" />
                </div>

                <div>
                  <span className="label">Nombre completo</span>
                  <input className="input" value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} placeholder="Nombre Apellido" />
                </div>

                <div>
                  <span className="label">Contraseña</span>
                  <input className="input" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
                </div>

                <div className="btn-row">
                  <button className="btn btn-primary" type="submit">Crear admin</button>
                  <button className="btn" type="button" onClick={() => { setAdminEmail(""); setAdminFullName(""); setAdminPassword(""); }}>
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {tab === "Escuelas" && (
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <div>
                <p className="card-title">Escuelas (Tenants)</p>
                <p className="card-sub">Activa/desactiva y abre los portales por subdominio.</p>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" type="button" onClick={() => loadAll()} disabled={isLoading}>
                  {isLoading ? "Cargando..." : "Recargar"}
                </button>
              </div>
            </div>

            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Slug</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Usuarios</th>
                  <th>URL</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((t) => (
                  <tr key={t.tenant_id}>
                    <td>{t.tenant_id}</td>
                    <td><b>{t.slug}</b></td>
                    <td>{t.name}</td>
                    <td>
                      <span className={`pill ${t.is_active ? "pill-green" : "pill-gray"}`}>
                        {t.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div><b>{t.users_total ?? 0}</b> total</div>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>
                          Admin: {t.tenant_admins ?? 0} · Rev: {t.reviewers ?? 0} · Alum: {t.students ?? 0}
                        </div>
                      </div>
                    </td>
                    <td>
                      <a href={buildAbsoluteUrl(buildHost(t.slug, baseDomain), "/")} target="_blank" rel="noreferrer">
                        {buildHost(t.slug, baseDomain)}
                      </a>
                    </td>
                    <td>
                      <div className="btn-row">
                        <button className="btn" type="button" onClick={() => toggleActive({ id: t.tenant_id, is_active: t.is_active })}>
                          {t.is_active ? "Desactivar" : "Activar"}
                        </button>
                        <button className="btn" type="button" onClick={() => window.open(buildAbsoluteUrl(buildHost(t.slug, baseDomain), "/"), "_blank")}>
                          Abrir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tableRows.length === 0 && (
                  <tr><td colSpan={6} style={{ color: "var(--muted)" }}>No hay tenants.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Contactos" && (
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <div>
                <p className="card-title">Contactanos (Solicitudes)</p>
                <p className="card-sub">Mensajes enviados desde <b>{buildAbsoluteUrl(baseDomain, "/contact")}</b>.</p>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" type="button" onClick={() => loadAll()} disabled={isLoading}>
                  {isLoading ? "Cargando..." : "Recargar"}
                </button>
              </div>
            </div>

            <div className="grid-3" style={{ marginTop: 12 }}>
              <div className="card card-pad" style={{ marginTop: 0 }}>
                <p className="card-title">Total</p>
                <div style={{ fontSize: 28, fontWeight: 950, marginTop: 10 }}>{contactStats.total}</div>
              </div>
              <div className="card card-pad" style={{ marginTop: 0 }}>
                <p className="card-title">Nuevos</p>
                <div style={{ fontSize: 28, fontWeight: 950, marginTop: 10 }}>{contactStats.NEW}</div>
              </div>
              <div className="card card-pad" style={{ marginTop: 0 }}>
                <p className="card-title">En progreso</p>
                <div style={{ fontSize: 28, fontWeight: 950, marginTop: 10 }}>{contactStats.IN_PROGRESS}</div>
              </div>
            </div>

            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Estado</th>
                  <th>Correo</th>
                  <th>Escuela</th>
                  <th>Mensaje</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contactRequests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>
                      <span className={`pill ${statusPillClass(r.status)}`}>
                        {String(r.status || "NEW").toUpperCase()}
                      </span>
                    </td>
                    <td><b>{r.email}</b></td>
                    <td style={{ color: "var(--muted)" }}>{r.school_name || r.desired_slug || "-"}</td>
                    <td style={{ maxWidth: 520, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.message}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{formatLocalDate(r.created_at)}</td>
                    <td>
                      <div className="btn-row">
                        <button className="btn" type="button" onClick={() => setContactModal(r)}>Ver</button>
                        {r.created_tenant_id ? (
                          <button
                            className="btn"
                            type="button"
                            onClick={() => window.open(buildAbsoluteUrl(buildHost(r.desired_slug || "", baseDomain), "/"), "_blank")}
                            disabled={!r.desired_slug}
                          >
                            Abrir tenant
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {contactRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ color: "var(--muted)" }}>No hay solicitudes.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Sistema" && (
          <div className="grid-2" style={{ marginTop: 16 }}>
            <div className="card card-pad">
              <p className="card-title">Estado</p>
              <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 13 }}>
                API /health: <b>{health?.ok ? "OK" : "No disponible"}</b>
              </div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" type="button" onClick={() => loadAll()} disabled={isLoading}>
                  {isLoading ? "Cargando..." : "Recargar"}
                </button>
              </div>
            </div>

            <div className="card card-pad">
              <p className="card-title">Accesos rápidos</p>
              <div className="list">
                <div className="list-item">
                  <div>
                    <div className="item-title">Tenants (legacy)</div>
                    <div className="item-meta">Lista simple de escuelas</div>
                  </div>
                  <div className="actions">
                    <button className="btn" type="button" onClick={() => window.location.href = "/admin/tenants"}>Abrir</button>
                  </div>
                </div>
                <div className="list-item">
                  <div>
                    <div className="item-title">Dashboard</div>
                    <div className="item-meta">/dashboard (redirige por rol)</div>
                  </div>
                  <div className="actions">
                    <button className="btn" type="button" onClick={() => window.location.href = "/dashboard"}>Abrir</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </main>

      {contactModal ? (
        <ContactModal
          item={contactModal}
          baseDomain={baseDomain}
          token={getToken("admin")}
          onRefresh={() => loadAll({ silent: true })}
          onToast={toast}
          onClose={() => setContactModal(null)}
        />
      ) : null}
    </>
  );
}

