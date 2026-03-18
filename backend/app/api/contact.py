from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db_models.contact_request import ContactRequest
from app.api.auth import get_current_user
from app.core.config import ROLE_SUPER_ADMIN
from app.schemas.contact import ContactRequestCreateIn, ContactRequestOut, ContactRequestUpdateIn


router = APIRouter(prefix="/contact", tags=["contact"])


def require_super_admin(user):
    if user.role != ROLE_SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="SUPER_ADMIN required")


def _client_ip(request: Request) -> str | None:
    # Respeta proxy headers si existen, pero guarda solo el primer IP.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip() or None
    if request.client:
        return request.client.host
    return None


@router.post("/requests")
def create_contact_request(payload: ContactRequestCreateIn, request: Request, db: Session = Depends(get_db)):
    # Mantener este endpoint como "global": se recomienda usar el dominio base.
    # Si hay tenant resuelto, significa que estas en un subdominio de escuela.
    if getattr(request.state, "tenant_id", None):
        raise HTTPException(status_code=400, detail="Use the global domain to contact the SUPER_ADMIN.")

    email = str(payload.email).strip().lower()
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message cannot be empty")
    if len(message) > 5000:
        raise HTTPException(status_code=400, detail="message too long")

    cr = ContactRequest(
        email=email,
        message=message,
        status="NEW",
        source_host=request.headers.get("host"),
        source_ip=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(cr)
    db.commit()
    db.refresh(cr)
    return {"ok": True, "id": cr.id}


@router.get("/requests")
def list_contact_requests(db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_super_admin(user)
    rows = list(db.execute(select(ContactRequest).order_by(ContactRequest.created_at.desc())).scalars().all())
    out: list[dict] = []
    for r in rows:
        model = ContactRequestOut(
            id=r.id,
            email=r.email,
            message=r.message,
            status=r.status,
            client_name=r.client_name,
            school_name=r.school_name,
            desired_slug=r.desired_slug,
            created_tenant_id=r.created_tenant_id,
            notes=r.notes,
            source_host=r.source_host,
            source_ip=r.source_ip,
            user_agent=r.user_agent,
            created_at=r.created_at.isoformat() if r.created_at else None,
            updated_at=r.updated_at.isoformat() if r.updated_at else None,
        )
        out.append(model.model_dump() if hasattr(model, "model_dump") else model.dict())
    return out


@router.patch("/requests/{request_id}")
def update_contact_request(
    request_id: int,
    payload: ContactRequestUpdateIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    require_super_admin(user)

    r = db.get(ContactRequest, int(request_id))
    if not r:
        raise HTTPException(status_code=404, detail="Contact request not found")

    if payload.status is not None:
        s = payload.status.strip().upper()
        if s not in ("NEW", "IN_PROGRESS", "DONE"):
            raise HTTPException(status_code=400, detail="Invalid status")
        r.status = s

    if payload.client_name is not None:
        v = payload.client_name.strip()
        r.client_name = v or None

    if payload.school_name is not None:
        v = payload.school_name.strip()
        r.school_name = v or None

    if payload.desired_slug is not None:
        v = payload.desired_slug.strip().lower()
        r.desired_slug = v or None

    if payload.created_tenant_id is not None:
        # Se permite null para limpiar.
        r.created_tenant_id = int(payload.created_tenant_id) if payload.created_tenant_id else None

    if payload.notes is not None:
        v = payload.notes.strip()
        r.notes = v or None

    r.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return {"ok": True}
