from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Global vs tenant:
    # - SUPER_ADMIN: tenant_id = NULL
    # - demás roles: tenant_id = id del tenant
    tenant_id: Mapped[int | None] = mapped_column(ForeignKey("tenants.id"), nullable=True)
    tenant = relationship("Tenant")

    role: Mapped[str] = mapped_column(String(30), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Admins/revisores usan email
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)

    # Alumnos usan matrícula (por tenant)
    matricula: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)

    full_name: Mapped[str] = mapped_column(String(200))
    password_hash: Mapped[str] = mapped_column(String(255))
