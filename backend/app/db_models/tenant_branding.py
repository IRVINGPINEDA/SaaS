from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class TenantBranding(Base):
    __tablename__ = "tenant_branding"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), primary_key=True)

    # Branding extendido (sin migrar tabla tenants)
    brand_secondary_color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    brand_favicon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Login UX
    login_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    login_subtitle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    login_bg_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Login background customization
    login_bg_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)  # default|image|solid|gradient
    login_bg_color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    login_bg_overlay: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0..95 (percentage)
