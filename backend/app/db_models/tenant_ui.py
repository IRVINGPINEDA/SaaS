from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class TenantUi(Base):
    __tablename__ = "tenant_ui"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), primary_key=True)

    # Densidad general de UI (dashboards + formularios)
    ui_density: Mapped[str] = mapped_column(String(20), default="comfortable")

    # Radio base en px (se transforma a CSS var). Si es NULL usa defaults del frontend.
    ui_radius: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Intensidad de sombra en UI: "soft" | "medium" | "none"
    ui_shadow: Mapped[str] = mapped_column(String(20), default="soft")

    # Login: estilo del cuadro (tarjeta)
    login_card_style: Mapped[str] = mapped_column(String(20), default="solid")

    # Login: mostrar bloque de credenciales demo
    login_show_demo: Mapped[bool] = mapped_column(Boolean, default=True)

    # Login: texto opcional al pie
    login_footer_text: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Dashboard: estilo del header/topbar
    dashboard_header_style: Mapped[str] = mapped_column(String(20), default="solid")

    # Dashboard: fondo
    dashboard_bg_mode: Mapped[str] = mapped_column(String(20), default="default")  # default | solid
    dashboard_bg_color: Mapped[str | None] = mapped_column(String(20), nullable=True)
