from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db_models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantOut
from app.api.auth import get_current_user
from app.core.config import ROLE_SUPER_ADMIN



from app.schemas.tenant_branding import TenantBrandingUpdate
from app.core.config import ROLE_TENANT_ADMIN, ROLE_SUPER_ADMIN

router = APIRouter(prefix="/tenants", tags=["tenants"])

def require_super_admin(user):
    if user.role != ROLE_SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="SUPER_ADMIN required")

@router.post("", response_model=TenantOut)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_super_admin(user)

    existing = db.execute(select(Tenant).where(Tenant.slug == payload.slug)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Slug already exists")

    t = Tenant(slug=payload.slug, name=payload.name, is_active=True)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.get("", response_model=list[TenantOut])
def list_tenants(db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_super_admin(user)
    return list(db.execute(select(Tenant).order_by(Tenant.id)).scalars().all())



@router.patch("/{tenant_id}/branding")
def update_branding(
    tenant_id: int,
    payload: TenantBrandingUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # SUPER_ADMIN puede editar cualquier tenant
    # TENANT_ADMIN solo su propio tenant
    if user.role == ROLE_SUPER_ADMIN:
        pass
    elif user.role == ROLE_TENANT_ADMIN:
        if user.tenant_id != tenant_id:
            raise HTTPException(status_code=403, detail="Not allowed")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    t = db.get(Tenant, tenant_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if payload.brand_primary_color is not None:
        t.brand_primary_color = payload.brand_primary_color
    if payload.brand_logo_url is not None:
        t.brand_logo_url = payload.brand_logo_url

    db.commit()
    return {"ok": True}
