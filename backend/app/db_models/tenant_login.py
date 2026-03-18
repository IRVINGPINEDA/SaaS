from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class TenantLogin(Base):
    __tablename__ = "tenant_login"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), primary_key=True)
    # Uno de: "school", "modern", "minimal"
    theme: Mapped[str] = mapped_column(String(30), default="school")

