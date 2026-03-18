from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db_models.tenant import Tenant
from app.db_models.tenant_branding import TenantBranding
from app.db_models.tenant_login import TenantLogin
from app.db_models.tenant_ui import TenantUi

router = APIRouter(prefix="/tenant", tags=["tenant-public"])

@router.get("/public-config")
def public_config(request: Request, db: Session = Depends(get_db)):
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required (use school subdomain).")

    t = db.execute(select(Tenant).where(Tenant.id == tenant_id)).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    b = db.get(TenantBranding, tenant_id)
    l = db.get(TenantLogin, tenant_id)
    ui = db.get(TenantUi, tenant_id)

    return {
        "tenant_id": t.id,
        "slug": t.slug,
        "display_name": t.name,
        "brand": {
            "primary_color": t.brand_primary_color or "#111827",
            "secondary_color": (b.brand_secondary_color if b else None),
            "logo_url": t.brand_logo_url,
            "favicon_url": (b.brand_favicon_url if b else None),
            "login_title": (b.login_title if b else None),
            "login_subtitle": (b.login_subtitle if b else None),
            "login_bg_url": (b.login_bg_url if b else None),
            "login_bg_mode": (b.login_bg_mode if b else None),
            "login_bg_color": (b.login_bg_color if b else None),
            "login_bg_overlay": (b.login_bg_overlay if b else None),
            "login_theme": (l.theme if l else "school"),
        }
        ,
        "ui": {
            "density": (ui.ui_density if ui else "comfortable"),
            "radius": (ui.ui_radius if ui else None),
            "shadow": (ui.ui_shadow if ui else "soft"),
            "login_card_style": (ui.login_card_style if ui else "solid"),
            "login_show_demo": (ui.login_show_demo if ui else True),
            "login_footer_text": (ui.login_footer_text if ui else None),
            "dashboard_header_style": (ui.dashboard_header_style if ui else "solid"),
            "dashboard_bg_mode": (ui.dashboard_bg_mode if ui else "default"),
            "dashboard_bg_color": (ui.dashboard_bg_color if ui else None),
        }
    }
