from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Branding simple (prototipo)
    brand_primary_color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    brand_logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
