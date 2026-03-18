from pydantic import BaseModel

class TenantBrandingUpdate(BaseModel):
    display_name: str | None = None
    brand_primary_color: str | None = None
    brand_secondary_color: str | None = None
    brand_logo_url: str | None = None
    brand_favicon_url: str | None = None

    login_title: str | None = None
    login_subtitle: str | None = None
    login_bg_url: str | None = None
    login_bg_mode: str | None = None
    login_bg_color: str | None = None
    login_bg_overlay: int | None = None
    login_theme: str | None = None

    # UI (dashboards + login)
    ui_density: str | None = None
    ui_radius: int | None = None
    ui_shadow: str | None = None
    login_card_style: str | None = None
    login_show_demo: bool | None = None
    login_footer_text: str | None = None
    dashboard_header_style: str | None = None
    dashboard_bg_mode: str | None = None
    dashboard_bg_color: str | None = None
