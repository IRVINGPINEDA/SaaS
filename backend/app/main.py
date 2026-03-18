from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy import inspect

from app.db.session import SessionLocal
from app.db.session import engine
from app.db.base_class import Base
import app.db.base  # noqa: F401 (register models for create_all)
from app.db_models.tenant import Tenant
from app.core.tenant import get_subdomain, is_admin_host

from app.api.public_tenant import router as public_tenant_router
from app.api.auth import router as auth_router
from app.api.tenants import router as tenants_router
from app.api.documents import router as documents_router
from app.api.users import router as users_router
from app.api.progress import router as progress_router
from app.api.contact import router as contact_router

app = FastAPI(
    title="Tesis SaaS Docs",
    root_path="/api",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.on_event("startup")
def ensure_tables():
    # Crea tablas faltantes (no modifica tablas existentes).
    Base.metadata.create_all(bind=engine)

    # Migraciones ligeras: agregar columnas nuevas si no existen.
    try:
        insp = inspect(engine)

        def ensure_column(table: str, col: str, ddl: str):
            cols = {c.get("name") for c in (insp.get_columns(table) or [])}
            if col in cols:
                return
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))

        # document_types.program
        ensure_column("document_types", "program", "program VARCHAR(16)")
        with engine.begin() as conn:
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_document_types_program ON document_types (program)"))
            except Exception:
                pass

        # tenant_branding login background options
        ensure_column("tenant_branding", "login_bg_mode", "login_bg_mode VARCHAR(20)")
        ensure_column("tenant_branding", "login_bg_color", "login_bg_color VARCHAR(20)")
        ensure_column("tenant_branding", "login_bg_overlay", "login_bg_overlay INTEGER")

        # tenant_ui dashboard background options
        ensure_column("tenant_ui", "dashboard_bg_mode", "dashboard_bg_mode VARCHAR(20)")
        ensure_column("tenant_ui", "dashboard_bg_color", "dashboard_bg_color VARCHAR(20)")
    except Exception:
        # No bloquear arranque si el motor no soporta inspeccion/DDL en runtime.
        pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def tenant_resolution(request: Request, call_next):
    host = request.headers.get("host", "")

    # admin.<base_domain> => contexto global
    if is_admin_host(host):
        request.state.tenant_id = None
        return await call_next(request)

    sub = get_subdomain(host)
    if not sub:
        request.state.tenant_id = None
        return await call_next(request)

    db = SessionLocal()
    try:
        tenant = db.execute(
            select(Tenant).where(Tenant.slug == sub, Tenant.is_active.is_(True))
        ).scalar_one_or_none()
        request.state.tenant_id = tenant.id if tenant else None
    finally:
        db.close()

    return await call_next(request)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/tenant/whoami")
def tenant_whoami(request: Request):
    return {
        "tenant_id": getattr(request.state, "tenant_id", None),
        "host": request.headers.get("host", None),
    }

# Routers
app.include_router(public_tenant_router)
app.include_router(auth_router)
app.include_router(tenants_router)
app.include_router(documents_router)
app.include_router(users_router)
app.include_router(progress_router)
app.include_router(contact_router)
