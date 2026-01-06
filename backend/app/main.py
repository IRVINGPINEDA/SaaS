from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.db.session import SessionLocal
from app.db_models.tenant import Tenant
from app.core.tenant import get_subdomain, is_admin_host

from app.api.public_tenant import router as public_tenant_router
from app.api.auth import router as auth_router
from app.api.tenants import router as tenants_router
from app.api.documents import router as documents_router

app = FastAPI(
    title="Tesis SaaS Docs",
    root_path="/api",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

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
