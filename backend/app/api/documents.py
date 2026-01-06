from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db

from app.api.auth import get_current_user

from app.db_models.document import DocumentType, StudentDocument
from app.schemas.document import DocumentTypeOut, StudentDocumentOut, ReviewIn
from app.core.storage import get_minio, ensure_bucket, MINIO_BUCKET

router = APIRouter(prefix="/documents", tags=["documents"])


def require_tenant(request: Request) -> int:
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant requerido (subdominio).")
    return tenant_id


@router.get("/types", response_model=list[DocumentTypeOut])
def list_doc_types(request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tenant_id = require_tenant(request)
    rows = db.execute(select(DocumentType).where(DocumentType.tenant_id == tenant_id).order_by(DocumentType.id)).scalars().all()
    return [DocumentTypeOut(id=r.id, name=r.name, code=r.code) for r in rows]


@router.get("/my", response_model=list[StudentDocumentOut])
def my_documents(request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tenant_id = require_tenant(request)

    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Solo alumnos.")

    q = (
        select(StudentDocument, DocumentType)
        .join(DocumentType, DocumentType.id == StudentDocument.document_type_id)
        .where(StudentDocument.tenant_id == tenant_id)
        .where(StudentDocument.student_user_id == user.id)
        .order_by(StudentDocument.id.desc())
    )
    rows = db.execute(q).all()

    out = []
    for doc, dt in rows:
        out.append(StudentDocumentOut(
            id=doc.id,
            document_type_id=dt.id,
            document_type_name=dt.name,
            filename=doc.filename,
            status=doc.status,
            reviewer_comment=doc.reviewer_comment,
            created_at=doc.created_at.isoformat(),
        ))
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
    if user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Solo alumnos pueden subir documentos.")

    dt = db.get(DocumentType, document_type_id)
    if not dt or dt.tenant_id != tenant_id:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido.")

    # Guardar en MinIO
    client = get_minio()
    ensure_bucket(client)

    now = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = file.filename.replace(" ", "_")
    object_key = f"tenant/{tenant_id}/student/{user.id}/{dt.code}/{now}_{safe_name}"

    data = file.file
    client.put_object(
        bucket_name=MINIO_BUCKET,
        object_name=object_key,
        data=data,
        length=-1,
        part_size=10 * 1024 * 1024,
        content_type=file.content_type or "application/octet-stream",
    )

    doc = StudentDocument(
        tenant_id=tenant_id,
        student_user_id=user.id,
        document_type_id=dt.id,
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        object_key=object_key,
        status="PENDING",
    )
    db.add(doc)
    db.commit()

    return {"ok": True}


@router.get("/pending")
def pending_documents(request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tenant_id = require_tenant(request)
    if user.role not in ("REVIEWER", "TENANT_ADMIN"):
        raise HTTPException(status_code=403, detail="Solo revisor/área o admin de institución.")

    q = (
        select(StudentDocument, DocumentType)
        .join(DocumentType, DocumentType.id == StudentDocument.document_type_id)
        .where(StudentDocument.tenant_id == tenant_id)
        .where(StudentDocument.status.in_(["PENDING", "OBSERVED"]))
        .order_by(StudentDocument.id.desc())
    )
    rows = db.execute(q).all()

    # Por ahora regresamos datos mínimos; luego agregamos alumno, etc.
    items = []
    for doc, dt in rows:
        items.append({
            "id": doc.id,
            "doc_type": dt.name,
            "filename": doc.filename,
            "status": doc.status,
            "comment": doc.reviewer_comment,
            "created_at": doc.created_at.isoformat(),
        })
    return items


@router.post("/{doc_id}/review")
def review_document(
    doc_id: int,
    payload: ReviewIn,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = require_tenant(request)
    if user.role not in ("REVIEWER", "TENANT_ADMIN"):
        raise HTTPException(status_code=403, detail="Solo revisor/área o admin de institución.")

    doc = db.get(StudentDocument, doc_id)
    if not doc or doc.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    action = payload.action.upper().strip()
    if action == "APPROVE":
        doc.status = "APPROVED"
        doc.reviewer_comment = payload.comment
        doc.reviewed_at = datetime.utcnow()
    elif action == "REJECT":
        doc.status = "REJECTED"
        doc.reviewer_comment = payload.comment
        doc.reviewed_at = datetime.utcnow()
    elif action == "OBSERVE":
        doc.status = "OBSERVED"
        doc.reviewer_comment = payload.comment or "Se requieren correcciones."
        doc.reviewed_at = datetime.utcnow()
    else:
        raise HTTPException(status_code=400, detail="Acción inválida (APPROVE/REJECT/OBSERVE).")

    db.commit()
    return {"ok": True}
