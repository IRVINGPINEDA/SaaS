from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import ROLE_REVIEWER, ROLE_STUDENT, ROLE_TENANT_ADMIN
from app.core.security import create_access_token, decode_token
from app.core.storage import MINIO_BUCKET, ensure_bucket, get_minio
from app.db.session import get_db
from app.db_models.document import DocumentType, StudentDocument
from app.db_models.user import User
from app.schemas.document import (
    DocumentTypeCreateIn,
    DocumentTypeOut,
    DocumentTypeUpdateIn,
    StudentDocumentOut,
    ReviewIn,
)

router = APIRouter(prefix="/documents", tags=["documents"])


def require_tenant(request: Request) -> int:
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant requerido (subdominio).")
    return tenant_id


@router.get("/types", response_model=list[DocumentTypeOut])
def list_doc_types(
    request: Request,
    program: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)

    program_norm = (program or "").strip().upper() or None
    if program_norm not in (None, "PRACTICAS", "SERVICIO"):
        raise HTTPException(status_code=400, detail="program invalido (PRACTICAS o SERVICIO).")

    q = select(DocumentType).where(DocumentType.tenant_id == tenant_id)
    if program_norm == "PRACTICAS":
        # Legacy/unscoped types are treated as Practicas.
        q = q.where((DocumentType.program.is_(None)) | (DocumentType.program == "PRACTICAS"))
    elif program_norm == "SERVICIO":
        q = q.where(DocumentType.program == "SERVICIO")
    rows = (
        db.execute(
            q.order_by(DocumentType.id)
        )
        .scalars()
        .all()
    )
    return [DocumentTypeOut(id=r.id, name=r.name, code=r.code, program=r.program) for r in rows]


@router.post("/types", response_model=DocumentTypeOut)
def create_doc_type(
    payload: DocumentTypeCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")

    name = (payload.name or "").strip()
    code = (payload.code or "").strip().upper()
    program = (payload.program or "").strip().upper() or None
    if program not in (None, "PRACTICAS", "SERVICIO"):
        raise HTTPException(status_code=400, detail="program invalido (PRACTICAS o SERVICIO).")
    if not name or not code:
        raise HTTPException(status_code=400, detail="name and code are required")

    exists = (
        db.execute(
            select(DocumentType).where(
                DocumentType.tenant_id == tenant_id,
                DocumentType.code == code,
            )
        )
        .scalars()
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="code already exists")

    dt = DocumentType(tenant_id=tenant_id, name=name, code=code, program=program)
    db.add(dt)
    db.commit()
    db.refresh(dt)
    return DocumentTypeOut(id=dt.id, name=dt.name, code=dt.code, program=dt.program)


@router.patch("/types/{type_id}", response_model=DocumentTypeOut)
def update_doc_type(
    type_id: int,
    payload: DocumentTypeUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")

    dt = db.get(DocumentType, type_id)
    if not dt or dt.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Document type not found")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="name cannot be empty")
        dt.name = name

    if payload.code is not None:
        code = payload.code.strip().upper()
        if not code:
            raise HTTPException(status_code=400, detail="code cannot be empty")
        exists = (
            db.execute(
                select(DocumentType).where(
                    DocumentType.tenant_id == tenant_id,
                    DocumentType.code == code,
                    DocumentType.id != type_id,
                )
            )
            .scalars()
            .first()
        )
        if exists:
            raise HTTPException(status_code=409, detail="code already exists")
        dt.code = code

    if payload.program is not None:
        program = payload.program.strip().upper() or None
        if program not in (None, "PRACTICAS", "SERVICIO"):
            raise HTTPException(status_code=400, detail="program invalido (PRACTICAS o SERVICIO).")
        dt.program = program

    db.commit()
    db.refresh(dt)
    return DocumentTypeOut(id=dt.id, name=dt.name, code=dt.code, program=dt.program)


@router.delete("/types/{type_id}")
def delete_doc_type(
    type_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")

    dt = db.get(DocumentType, type_id)
    if not dt or dt.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Document type not found")

    in_use = int(
        db.execute(
            select(func.count())
            .select_from(StudentDocument)
            .where(StudentDocument.tenant_id == tenant_id)
            .where(StudentDocument.document_type_id == type_id)
        ).scalar_one()
    )
    if in_use > 0:
        raise HTTPException(status_code=409, detail="Document type has documents and cannot be deleted")

    db.delete(dt)
    db.commit()
    return {"ok": True}


@router.get("/my", response_model=list[StudentDocumentOut])
def my_documents(
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)
    if user.role != ROLE_STUDENT:
        raise HTTPException(status_code=403, detail="Solo alumnos.")

    q = (
        select(StudentDocument, DocumentType)
        .join(DocumentType, DocumentType.id == StudentDocument.document_type_id)
        .where(StudentDocument.tenant_id == tenant_id)
        .where(StudentDocument.student_user_id == user.id)
        .order_by(StudentDocument.id.desc())
    )
    rows = db.execute(q).all()

    out: list[StudentDocumentOut] = []
    for doc, dt in rows:
        out.append(
            StudentDocumentOut(
                id=doc.id,
                document_type_id=dt.id,
                document_type_name=dt.name,
                filename=doc.filename,
                status=doc.status,
                reviewer_comment=doc.reviewer_comment,
                created_at=doc.created_at.isoformat(),
                reviewed_at=doc.reviewed_at.isoformat() if doc.reviewed_at else None,
            )
        )
    return out


@router.post("/upload")
def upload_document(
    request: Request,
    document_type_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)
    if user.role != ROLE_STUDENT:
        raise HTTPException(status_code=403, detail="Solo alumnos pueden subir documentos.")

    dt = db.get(DocumentType, document_type_id)
    if not dt or dt.tenant_id != tenant_id:
        raise HTTPException(status_code=400, detail="Tipo de documento invalido.")

    client = get_minio()
    ensure_bucket(client)

    now = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = (file.filename or "archivo").replace(" ", "_")
    object_key = f"tenant/{tenant_id}/student/{user.id}/{dt.code}/{now}_{safe_name}"

    client.put_object(
        bucket_name=MINIO_BUCKET,
        object_name=object_key,
        data=file.file,
        length=-1,
        part_size=10 * 1024 * 1024,
        content_type=file.content_type or "application/octet-stream",
    )

    doc = StudentDocument(
        tenant_id=tenant_id,
        student_user_id=user.id,
        document_type_id=dt.id,
        filename=file.filename or safe_name,
        content_type=file.content_type or "application/octet-stream",
        object_key=object_key,
        status="PENDING",
    )
    db.add(doc)
    db.commit()

    return {"ok": True}


@router.get("/pending")
def pending_documents(
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)
    if user.role not in (ROLE_REVIEWER, ROLE_TENANT_ADMIN):
        raise HTTPException(status_code=403, detail="Solo revisor/area o admin de institucion.")

    q = (
        select(StudentDocument, DocumentType, User)
        .join(DocumentType, DocumentType.id == StudentDocument.document_type_id)
        .join(User, User.id == StudentDocument.student_user_id)
        .where(StudentDocument.tenant_id == tenant_id)
        .where(StudentDocument.status.in_(["PENDING", "OBSERVED"]))
        .order_by(StudentDocument.id.desc())
    )
    rows = db.execute(q).all()

    items = []
    for doc, dt, student in rows:
        items.append(
            {
                "id": doc.id,
                "doc_type": dt.name,
                "filename": doc.filename,
                "status": doc.status,
                "comment": doc.reviewer_comment,
                "created_at": doc.created_at.isoformat(),
                "student": {
                    "id": student.id,
                    "matricula": student.matricula,
                    "full_name": student.full_name,
                },
            }
        )
    return items


@router.get("/stats")
def document_stats(
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)

    q = select(StudentDocument.status, func.count()).where(StudentDocument.tenant_id == tenant_id)
    if user.role == ROLE_STUDENT:
        q = q.where(StudentDocument.student_user_id == user.id)
    elif user.role in (ROLE_REVIEWER, ROLE_TENANT_ADMIN):
        pass
    else:
        raise HTTPException(status_code=403, detail="No autorizado.")

    q = q.group_by(StudentDocument.status)
    rows = db.execute(q).all()
    by_status = {status: int(count) for status, count in rows}

    total = int(sum(by_status.values()))
    pending = int(by_status.get("PENDING", 0))
    observed = int(by_status.get("OBSERVED", 0))
    approved = int(by_status.get("APPROVED", 0))
    rejected = int(by_status.get("REJECTED", 0))

    approved_today = None
    if user.role in (ROLE_REVIEWER, ROLE_TENANT_ADMIN):
        start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        approved_today = int(
            db.execute(
                select(func.count())
                .select_from(StudentDocument)
                .where(StudentDocument.tenant_id == tenant_id)
                .where(StudentDocument.status == "APPROVED")
                .where(StudentDocument.reviewed_at.is_not(None))
                .where(StudentDocument.reviewed_at >= start)
            ).scalar_one()
        )

    return {
        "total": total,
        "pending": pending,
        "observed": observed,
        "approved": approved,
        "rejected": rejected,
        "pending_or_observed": pending + observed,
        "approved_today": approved_today,
        "by_status": by_status,
    }


@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)

    doc = (
        db.execute(
            select(StudentDocument).where(
                StudentDocument.id == doc_id,
                StudentDocument.tenant_id == tenant_id,
            )
        )
        .scalars()
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    if user.role == ROLE_STUDENT:
        if doc.student_user_id != user.id:
            raise HTTPException(status_code=403, detail="No autorizado.")
    elif user.role in (ROLE_REVIEWER, ROLE_TENANT_ADMIN):
        pass
    else:
        raise HTTPException(status_code=403, detail="No autorizado.")

    # No usamos presigned URL de MinIO porque minio-python intenta conectar al endpoint para resolver región.
    # En su lugar, generamos un token temporal y servimos el archivo desde el backend (misma origin del frontend).
    dl_token = create_access_token(
        {
            "typ": "doc_download",
            "doc_id": doc.id,
            "sub": str(user.id),
            "role": user.role,
            "tenant_id": user.tenant_id,
        },
        expires_minutes=5,
    )
    return {"url": f"/api/documents/{doc.id}/file?token={dl_token}"}


@router.get("/{doc_id}/file")
def get_document_file(
    doc_id: int,
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    tenant_id = require_tenant(request)
    try:
        data = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if data.get("typ") != "doc_download" or int(data.get("doc_id", -1)) != doc_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    role = data.get("role")
    user_id = int(data.get("sub"))
    token_tenant_id = data.get("tenant_id")

    doc = (
        db.execute(
            select(StudentDocument).where(
                StudentDocument.id == doc_id,
                StudentDocument.tenant_id == tenant_id,
            )
        )
        .scalars()
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    if token_tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado.")

    if role == ROLE_STUDENT:
        if doc.student_user_id != user_id:
            raise HTTPException(status_code=403, detail="No autorizado.")
    elif role in (ROLE_REVIEWER, ROLE_TENANT_ADMIN):
        pass
    else:
        raise HTTPException(status_code=403, detail="No autorizado.")

    client = get_minio()
    ensure_bucket(client)

    obj = client.get_object(MINIO_BUCKET, doc.object_key)

    def iter_bytes():
        try:
            for chunk in obj.stream(32 * 1024):
                yield chunk
        finally:
            try:
                obj.close()
            finally:
                obj.release_conn()

    headers = {
        "Content-Disposition": f'inline; filename="{doc.filename}"',
        "Cache-Control": "no-store",
    }
    return StreamingResponse(
        iter_bytes(),
        media_type=doc.content_type or "application/octet-stream",
        headers=headers,
    )


@router.post("/{doc_id}/review")
def review_document(
    doc_id: int,
    payload: ReviewIn,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)
    if user.role not in (ROLE_REVIEWER, ROLE_TENANT_ADMIN):
        raise HTTPException(status_code=403, detail="Solo revisor/area o admin de institucion.")

    doc = (
        db.execute(
            select(StudentDocument).where(
                StudentDocument.id == doc_id,
                StudentDocument.tenant_id == tenant_id,
            )
        )
        .scalars()
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    doc.status = payload.decision
    doc.reviewer_comment = payload.comment
    doc.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(doc)
    return {"ok": True, "id": doc.id, "status": doc.status}
