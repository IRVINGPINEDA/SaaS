from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db_models.tenant import Tenant

router = APIRouter(prefix="/tenant", tags=["tenant-public"])

@router.get("/public-config")
def public_config(request: Request, db: Session = Depends(get_db)):
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required (use school subdomain).")

    t = db.execute(select(Tenant).where(Tenant.id == tenant_id)).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return {
        "tenant_id": t.id,
        "slug": t.slug,
        "display_name": t.name,
        "brand": {
            "primary_color": t.brand_primary_color or "#111827",
            "logo_url": t.brand_logo_url,
        }
    }
