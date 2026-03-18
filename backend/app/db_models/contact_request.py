from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class ContactRequest(Base):
    __tablename__ = "contact_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    email: Mapped[str] = mapped_column(String(255), index=True)
    message: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(String(20), default="NEW", index=True)  # NEW/IN_PROGRESS/DONE

    # Datos opcionales que el SUPER_ADMIN puede completar.
    client_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    school_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    desired_slug: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    source_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_ip: Mapped[str | None] = mapped_column(String(100), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

