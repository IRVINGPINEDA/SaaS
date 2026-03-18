from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class ProgressRule(Base):
    __tablename__ = "progress_rules"
    __table_args__ = (
        UniqueConstraint("tenant_id", "program", "document_type_id", name="uq_progress_rules_tenant_program_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id"), index=True)

    # PRACTICAS | SERVICIO
    program: Mapped[str] = mapped_column(String(20), index=True)

    document_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("document_types.id"), index=True)
    points: Mapped[int] = mapped_column(Integer, default=1)
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    doc_type = relationship("DocumentType")

