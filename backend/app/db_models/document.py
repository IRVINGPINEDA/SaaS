from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

#from app.db.base_class import Base
from app.db.base_class import Base


class DocumentType(Base):
    __tablename__ = "document_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(60), index=True)  # e.g. CARTA_PRESENTACION
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant")


class StudentDocument(Base):
    __tablename__ = "student_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id"), index=True)

    student_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    document_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("document_types.id"), index=True)

    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(120))
    object_key: Mapped[str] = mapped_column(String(512), index=True)  # MinIO path
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)  # PENDING/APPROVED/REJECTED/OBSERVED

    reviewer_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    tenant = relationship("Tenant")
    student = relationship("User")
    doc_type = relationship("DocumentType")
