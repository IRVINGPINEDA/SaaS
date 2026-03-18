from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.session import get_db
from app.db_models.tenant import Tenant
from app.db_models.tenant_branding import TenantBranding
from app.db_models.tenant_login import TenantLogin
from app.db_models.tenant_ui import TenantUi
from app.db_models.user import User as DbUser
from app.schemas.tenant import TenantCreate, TenantOut, TenantUpdate
from app.api.auth import get_current_user
from app.core.config import ROLE_SUPER_ADMIN, ROLE_TENANT_ADMIN, ROLE_REVIEWER, ROLE_STUDENT
from app.schemas.tenant_branding import TenantBrandingUpdate

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

@router.get("/user-stats")
def tenant_user_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_super_admin(user)

    # Base: tenants
    tenants = list(db.execute(select(Tenant).order_by(Tenant.id)).scalars().all())

    # Aggregations by tenant_id (exclude SUPER_ADMIN with tenant_id NULL)
    rows = db.execute(
        select(
            DbUser.tenant_id,
            DbUser.role,
            func.count(DbUser.id).label("cnt"),
        )
        .where(DbUser.tenant_id.is_not(None), DbUser.is_active.is_(True))
        .group_by(DbUser.tenant_id, DbUser.role)
    ).all()

    by_tenant: dict[int, dict[str, int]] = {}
    for tenant_id, role, cnt in rows:
        if tenant_id is None:
            continue
        m = by_tenant.setdefault(int(tenant_id), {})
        m[str(role)] = int(cnt)

    out = []
    for t in tenants:
        counts = by_tenant.get(t.id, {})
        total = sum(counts.values())
        out.append({
            "tenant_id": t.id,
            "slug": t.slug,
            "name": t.name,
            "is_active": t.is_active,
            "users_total": total,
            "tenant_admins": counts.get(ROLE_TENANT_ADMIN, 0),
            "reviewers": counts.get(ROLE_REVIEWER, 0),
            "students": counts.get(ROLE_STUDENT, 0),
        })

    return out

@router.patch("/{tenant_id}", response_model=TenantOut)
def update_tenant(
    tenant_id: int,
    payload: TenantUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    require_super_admin(user)

    t = db.get(Tenant, tenant_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="name cannot be empty")
        t.name = name

    if payload.is_active is not None:
        t.is_active = bool(payload.is_active)

    db.commit()
    db.refresh(t)
    return t



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

    if payload.display_name is not None:
        name = payload.display_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="display_name cannot be empty")
        t.name = name

    if payload.brand_primary_color is not None:
        t.brand_primary_color = payload.brand_primary_color
    if payload.brand_logo_url is not None:
        t.brand_logo_url = payload.brand_logo_url

    branding = db.get(TenantBranding, tenant_id)
    if not branding:
        branding = TenantBranding(tenant_id=tenant_id)
        db.add(branding)

    if payload.brand_secondary_color is not None:
        branding.brand_secondary_color = payload.brand_secondary_color
    if payload.brand_favicon_url is not None:
        branding.brand_favicon_url = payload.brand_favicon_url
    if payload.login_title is not None:
        branding.login_title = payload.login_title
    if payload.login_subtitle is not None:
        branding.login_subtitle = payload.login_subtitle
    if payload.login_bg_url is not None:
        branding.login_bg_url = payload.login_bg_url

    if payload.login_bg_mode is not None:
        m = payload.login_bg_mode.strip().lower()
        if m not in ("default", "image", "solid", "gradient"):
            raise HTTPException(status_code=400, detail="Invalid login_bg_mode")
        branding.login_bg_mode = m

    if payload.login_bg_color is not None:
        v = payload.login_bg_color.strip()
        branding.login_bg_color = v or None

    if payload.login_bg_overlay is not None:
        ov = int(payload.login_bg_overlay)
        if ov < 0 or ov > 95:
            raise HTTPException(status_code=400, detail="Invalid login_bg_overlay")
        branding.login_bg_overlay = ov

    if payload.login_theme is not None:
        theme = payload.login_theme.strip().lower()
        if theme not in ("school", "modern", "minimal"):
            raise HTTPException(status_code=400, detail="Invalid login_theme")
        tl = db.get(TenantLogin, tenant_id)
        if not tl:
            tl = TenantLogin(tenant_id=tenant_id, theme=theme)
            db.add(tl)
        else:
            tl.theme = theme

    # UI settings (tabla nueva para evitar migraciones)
    if (
        payload.ui_density is not None
        or payload.ui_radius is not None
        or payload.ui_shadow is not None
        or payload.login_card_style is not None
        or payload.login_show_demo is not None
        or payload.login_footer_text is not None
        or payload.dashboard_header_style is not None
        or payload.dashboard_bg_mode is not None
        or payload.dashboard_bg_color is not None
    ):
        ui = db.get(TenantUi, tenant_id)
        if not ui:
            ui = TenantUi(tenant_id=tenant_id)
            db.add(ui)

        if payload.ui_density is not None:
            density = payload.ui_density.strip().lower()
            if density not in ("compact", "comfortable", "spacious"):
                raise HTTPException(status_code=400, detail="Invalid ui_density")
            ui.ui_density = density

        if payload.ui_radius is not None:
            r = int(payload.ui_radius)
            if r < 10 or r > 26:
                raise HTTPException(status_code=400, detail="Invalid ui_radius")
            ui.ui_radius = r

        if payload.ui_shadow is not None:
            shadow = payload.ui_shadow.strip().lower()
            if shadow not in ("soft", "medium", "none"):
                raise HTTPException(status_code=400, detail="Invalid ui_shadow")
            ui.ui_shadow = shadow

        if payload.login_card_style is not None:
            s = payload.login_card_style.strip().lower()
            if s not in ("solid", "glass"):
                raise HTTPException(status_code=400, detail="Invalid login_card_style")
            ui.login_card_style = s

        if payload.login_show_demo is not None:
            ui.login_show_demo = bool(payload.login_show_demo)

        if payload.login_footer_text is not None:
            text = payload.login_footer_text.strip()
            ui.login_footer_text = text or None

        if payload.dashboard_header_style is not None:
            hs = payload.dashboard_header_style.strip().lower()
            if hs not in ("solid", "brand"):
                raise HTTPException(status_code=400, detail="Invalid dashboard_header_style")
            ui.dashboard_header_style = hs

        if payload.dashboard_bg_mode is not None:
            bgm = payload.dashboard_bg_mode.strip().lower()
            if bgm not in ("default", "solid"):
                raise HTTPException(status_code=400, detail="Invalid dashboard_bg_mode")
            ui.dashboard_bg_mode = bgm

        if payload.dashboard_bg_color is not None:
            v = payload.dashboard_bg_color.strip()
            ui.dashboard_bg_color = v or None

    db.commit()
    return {"ok": True}
