from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func, case

from app.db.session import get_db
from app.db_models.user import User
from app.db_models.user_profile_photo import UserProfilePhoto
from app.db_models.tenant import Tenant
from app.db_models.student_profile import StudentProfile
from app.db_models.document import StudentDocument
from app.schemas.user import TenantAdminCreate, ReviewerCreate, StudentCreate, StudentOut, StudentOverviewOut, StudentUpdate, UserOut
from app.api.auth import get_current_user
from app.core.config import ROLE_SUPER_ADMIN, ROLE_TENANT_ADMIN, ROLE_REVIEWER, ROLE_STUDENT
from app.core.security import create_access_token, decode_token, hash_password
from app.core.passwords import generate_student_password, generate_generic_password
from app.core.storage import MINIO_BUCKET, ensure_bucket, get_minio
from app.core.student_import import (
    StudentImportRow,
    parse_csv,
    parse_docx,
    parse_pdf,
    parse_xlsx,
)

router = APIRouter(prefix="/users", tags=["users"])


def require_super_admin(user: User):
    if user.role != ROLE_SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="SUPER_ADMIN required")

def require_tenant_admin(user: User):
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")


@router.post("/tenant-admin", response_model=UserOut)
def create_tenant_admin(
    payload: TenantAdminCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_super_admin(user)

    tenant = db.get(Tenant, payload.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    email = payload.email.strip().lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    full_name = (payload.full_name or "").strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="full_name cannot be empty")

    if not payload.password or len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password too short (min 8)")

    u = User(
        tenant_id=tenant.id,
        role=ROLE_TENANT_ADMIN,
        is_active=True,
        email=email,
        matricula=None,
        full_name=full_name,
        password_hash=hash_password(payload.password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return UserOut(
        id=u.id,
        tenant_id=u.tenant_id,
        role=u.role,
        email=u.email,
        matricula=u.matricula,
        full_name=u.full_name,
        is_active=u.is_active,
    )


@router.post("/reviewer")
def create_reviewer(
    payload: ReviewerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # TENANT_ADMIN crea revisores de su tenant
    # SUPER_ADMIN puede crear revisores de cualquier tenant (debe especificar tenant_id)
    if user.role == ROLE_TENANT_ADMIN:
        tenant_id = user.tenant_id
        if not tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")
    elif user.role == ROLE_SUPER_ADMIN:
        if not payload.tenant_id:
            raise HTTPException(status_code=400, detail="tenant_id is required")
        tenant_id = int(payload.tenant_id)
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    email = payload.email.strip().lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    full_name = (payload.full_name or "").strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="full_name cannot be empty")

    generated_password: str | None = None
    password = (payload.password or "").strip()
    if not password:
        password = generate_generic_password(full_name)
        generated_password = password
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password too short (min 8)")

    u = User(
        tenant_id=tenant.id,
        role=ROLE_REVIEWER,
        is_active=True,
        email=email,
        matricula=None,
        full_name=full_name,
        password_hash=hash_password(password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return {
        "user": UserOut(
            id=u.id,
            tenant_id=u.tenant_id,
            role=u.role,
            email=u.email,
            matricula=u.matricula,
            full_name=u.full_name,
            is_active=u.is_active,
        ),
        "temp_password": generated_password,
    }


@router.get("/reviewers", response_model=list[UserOut])
def list_reviewers(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == ROLE_TENANT_ADMIN:
        if not user.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")
        tenant_id = user.tenant_id
    else:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")

    reviewers = list(
        db.execute(
            select(User)
            .where(User.tenant_id == tenant_id, User.role == ROLE_REVIEWER)
            .order_by(User.id.desc())
        ).scalars().all()
    )
    return [
        UserOut(
            id=u.id,
            tenant_id=u.tenant_id,
            role=u.role,
            email=u.email,
            matricula=u.matricula,
            full_name=u.full_name,
            is_active=u.is_active,
        )
        for u in reviewers
    ]


@router.post("/student")
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # TENANT_ADMIN crea alumnos de su tenant
    # SUPER_ADMIN puede crear alumnos de cualquier tenant (debe especificar tenant_id)
    if user.role == ROLE_TENANT_ADMIN:
        tenant_id = user.tenant_id
        if not tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")
    elif user.role == ROLE_SUPER_ADMIN:
        if not payload.tenant_id:
            raise HTTPException(status_code=400, detail="tenant_id is required")
        tenant_id = int(payload.tenant_id)
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    matricula = (payload.matricula or "").strip()
    if not matricula:
        raise HTTPException(status_code=400, detail="matricula cannot be empty")

    full_name = (payload.full_name or "").strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="full_name cannot be empty")

    generated_password: str | None = None
    password = (payload.password or "").strip()
    if not password:
        password = generate_student_password(full_name, matricula)
        generated_password = password
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password too short (min 8)")

    exists = db.execute(
        select(User).where(
            User.tenant_id == tenant.id,
            User.matricula == matricula,
        )
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="matricula already exists")

    u = User(
        tenant_id=tenant.id,
        role=ROLE_STUDENT,
        is_active=True,
        email=None,
        matricula=matricula,
        full_name=full_name,
        password_hash=hash_password(password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    if payload.category is not None or payload.group_name is not None:
        cat = (payload.category or "").strip() or None
        grp = (payload.group_name or "").strip() or None
        sp = StudentProfile(student_user_id=u.id, tenant_id=tenant.id, category=cat, group_name=grp)
        db.add(sp)
        db.commit()

    return {
        "user": UserOut(
            id=u.id,
            tenant_id=u.tenant_id,
            role=u.role,
            email=u.email,
            matricula=u.matricula,
            full_name=u.full_name,
            is_active=u.is_active,
        ),
        "temp_password": generated_password,
    }


@router.get("/students", response_model=list[StudentOut])
def list_students(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == ROLE_TENANT_ADMIN:
        if not user.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")
        tenant_id = user.tenant_id
    else:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")

    rows = db.execute(
        select(User, StudentProfile)
        .outerjoin(StudentProfile, StudentProfile.student_user_id == User.id)
        .where(User.tenant_id == tenant_id, User.role == ROLE_STUDENT)
        .order_by(User.id.desc())
    ).all()

    out: list[StudentOut] = []
    for u, sp in rows:
        out.append(
            StudentOut(
                id=u.id,
                tenant_id=int(u.tenant_id or 0),
                matricula=u.matricula or "",
                full_name=u.full_name,
                is_active=u.is_active,
                category=(sp.category if sp else None),
                group_name=(sp.group_name if sp else None),
            )
        )
    return out


@router.get("/students/overview", response_model=list[StudentOverviewOut])
def students_overview(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in (ROLE_TENANT_ADMIN, ROLE_REVIEWER):
        raise HTTPException(status_code=403, detail="TENANT_ADMIN or REVIEWER required")
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing")

    tenant_id = int(user.tenant_id)

    pending_count = func.coalesce(func.sum(case((StudentDocument.status == "PENDING", 1), else_=0)), 0).label("pending")
    observed_count = func.coalesce(func.sum(case((StudentDocument.status == "OBSERVED", 1), else_=0)), 0).label("observed")
    approved_count = func.coalesce(func.sum(case((StudentDocument.status == "APPROVED", 1), else_=0)), 0).label("approved")
    rejected_count = func.coalesce(func.sum(case((StudentDocument.status == "REJECTED", 1), else_=0)), 0).label("rejected")
    docs_total = func.coalesce(func.count(StudentDocument.id), 0).label("docs_total")

    rows = db.execute(
        select(
            User.id,
            User.tenant_id,
            User.matricula,
            User.full_name,
            User.is_active,
            StudentProfile.category,
            StudentProfile.group_name,
            docs_total,
            pending_count,
            observed_count,
            approved_count,
            rejected_count,
        )
        .outerjoin(StudentProfile, StudentProfile.student_user_id == User.id)
        .outerjoin(
            StudentDocument,
            (StudentDocument.student_user_id == User.id) & (StudentDocument.tenant_id == tenant_id),
        )
        .where(User.tenant_id == tenant_id, User.role == ROLE_STUDENT)
        .group_by(
            User.id,
            User.tenant_id,
            User.matricula,
            User.full_name,
            User.is_active,
            StudentProfile.category,
            StudentProfile.group_name,
        )
        .order_by(User.id.desc())
    ).all()

    out: list[StudentOverviewOut] = []
    for user_id, u_tenant_id, matricula, full_name, is_active, category, group_name, total, p, o, a, r in rows:
        p = int(p or 0)
        o = int(o or 0)
        a = int(a or 0)
        r = int(r or 0)
        total = int(total or 0)

        if p > 0:
            status = "PENDING"
        elif o > 0:
            status = "OBSERVED"
        elif r > 0:
            status = "REJECTED"
        elif a > 0:
            status = "APPROVED"
        else:
            status = "NONE"

        out.append(
            StudentOverviewOut(
                id=int(user_id),
                tenant_id=int(u_tenant_id or 0),
                matricula=matricula or "",
                full_name=full_name,
                is_active=bool(is_active),
                category=category,
                group_name=group_name,
                platform_status=status,
                docs_total=total,
                pending=p,
                observed=o,
                approved=a,
                rejected=r,
            )
        )
    return out


@router.patch("/students/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")

    u = db.get(User, student_id)
    if not u or u.tenant_id != user.tenant_id or u.role != ROLE_STUDENT:
        raise HTTPException(status_code=404, detail="Student not found")

    if payload.matricula is not None:
        m = payload.matricula.strip()
        if not m:
            raise HTTPException(status_code=400, detail="matricula cannot be empty")
        if m != (u.matricula or ""):
            exists = db.execute(
                select(User).where(
                    User.tenant_id == user.tenant_id,
                    User.matricula == m,
                )
            ).scalar_one_or_none()
            if exists:
                raise HTTPException(status_code=409, detail="matricula already exists")
        u.matricula = m

    if payload.full_name is not None:
        name = payload.full_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="full_name cannot be empty")
        u.full_name = name

    if payload.is_active is not None:
        u.is_active = bool(payload.is_active)

    sp = db.get(StudentProfile, u.id)
    if payload.category is not None or payload.group_name is not None:
        if not sp:
            sp = StudentProfile(student_user_id=u.id, tenant_id=int(user.tenant_id))
            db.add(sp)
        if payload.category is not None:
            sp.category = payload.category.strip() or None
        if payload.group_name is not None:
            sp.group_name = payload.group_name.strip() or None

    db.add(u)
    db.commit()
    db.refresh(u)

    sp2 = db.get(StudentProfile, u.id)
    return StudentOut(
        id=u.id,
        tenant_id=int(u.tenant_id or 0),
        matricula=u.matricula or "",
        full_name=u.full_name,
        is_active=u.is_active,
        category=(sp2.category if sp2 else None),
        group_name=(sp2.group_name if sp2 else None),
    )


@router.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Eliminacion segura: desactiva (no borra) para no romper documentos/relaciones
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")

    u = db.get(User, student_id)
    if not u or u.tenant_id != user.tenant_id or u.role != ROLE_STUDENT:
        raise HTTPException(status_code=404, detail="Student not found")

    u.is_active = False
    db.add(u)
    db.commit()
    return {"ok": True}


@router.post("/students/import")
async def import_students(
    file: UploadFile = File(...),
    on_duplicate: str = Form("skip"),  # "skip" | "update"
    default_password: str = Form("Alumno123!"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")

    mode = (on_duplicate or "skip").strip().lower()
    if mode not in ("skip", "update"):
        raise HTTPException(status_code=400, detail="Invalid on_duplicate")

    if not default_password or len(default_password) < 8:
        if default_password.strip().upper() != "AUTO":
            raise HTTPException(status_code=400, detail="default_password too short (min 8)")

    name = (file.filename or "").lower()
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        if name.endswith(".csv"):
            rows = parse_csv(data)
        elif name.endswith(".xlsx"):
            rows = parse_xlsx(data)
        elif name.endswith(".docx"):
            rows = parse_docx(data)
        elif name.endswith(".pdf"):
            rows = parse_pdf(data)
        elif name.endswith(".tsv") or name.endswith(".txt"):
            rows = parse_csv(data)
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado. Usa .csv, .xlsx, .docx o .pdf")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo leer el archivo. Revisa el formato.")

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No se detectaron filas. Si es PDF escaneado (imagen), conviertelo a XLSX/CSV o usa un PDF con texto seleccionable.",
        )

    created = 0
    updated = 0
    skipped = 0
    errors: list[dict] = []
    credentials: list[dict] = []

    for i, r in enumerate(rows, start=1):
        try:
            result = _apply_import_row(db, user.tenant_id, r, mode, default_password)
            if result.status == "created":
                created += 1
                if result.password:
                    credentials.append({"matricula": r.matricula, "password": result.password})
            elif result.status == "updated":
                updated += 1
                if result.password:
                    credentials.append({"matricula": r.matricula, "password": result.password})
            elif result.status == "skipped":
                skipped += 1
        except HTTPException as e:
            errors.append({"row": i, "matricula": r.matricula, "detail": e.detail})
        except Exception:
            errors.append({"row": i, "matricula": r.matricula, "detail": "Error al procesar fila"})

    processed = created + updated + skipped

    return {
        "ok": True,
        "filename": file.filename,
        "rows": len(rows),
        "processed": processed,
        "mode": mode,
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "credentials": credentials[:200],
        "credentials_count": len(credentials),
        "errors": errors[:50],
        "errors_count": len(errors),
    }


class _ImportResult:
    def __init__(self, status: str, password: str | None = None):
        self.status = status
        self.password = password


def _apply_import_row(
    db: Session,
    tenant_id: int,
    row: StudentImportRow,
    mode: str,
    default_password: str,
):
    matricula = (row.matricula or "").strip()
    full_name = (row.full_name or "").strip()
    if not matricula or not full_name:
        raise HTTPException(status_code=400, detail="Fila incompleta (matricula/nombre)")

    existing = db.execute(
        select(User).where(
            User.tenant_id == tenant_id,
            User.matricula == matricula,
        )
    ).scalar_one_or_none()

    if existing:
        if existing.role != ROLE_STUDENT:
            raise HTTPException(status_code=409, detail="La matricula ya existe en otra cuenta")
        if mode == "skip":
            return _ImportResult("skipped")

        existing.full_name = full_name
        new_password: str | None = None
        if row.password:
            if len(row.password) < 8:
                raise HTTPException(status_code=400, detail="Password muy corta (min 8)")
            existing.password_hash = hash_password(row.password)
            new_password = row.password
        db.add(existing)
        db.commit()

        sp = db.get(StudentProfile, existing.id)
        if not sp:
            sp = StudentProfile(student_user_id=existing.id, tenant_id=tenant_id)
            db.add(sp)
        if row.category is not None:
            sp.category = (row.category.strip() or None)
        if row.group_name is not None:
            sp.group_name = (row.group_name.strip() or None)
        db.commit()
        return _ImportResult("updated", password=new_password)

    password: str
    if row.password:
        password = row.password
    else:
        if (default_password or "").strip().upper() == "AUTO":
            password = generate_student_password(full_name, matricula)
        else:
            password = default_password
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password muy corta (min 8)")

    u = User(
        tenant_id=tenant_id,
        role=ROLE_STUDENT,
        is_active=True,
        email=None,
        matricula=matricula,
        full_name=full_name,
        password_hash=hash_password(password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    if row.category is not None or row.group_name is not None:
        sp = StudentProfile(
            student_user_id=u.id,
            tenant_id=tenant_id,
            category=(row.category.strip() if row.category else None),
            group_name=(row.group_name.strip() if row.group_name else None),
        )
        db.add(sp)
        db.commit()
    return _ImportResult("created", password=password)


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")

    target = db.get(User, user_id)
    if not target or target.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")

    if target.role == ROLE_STUDENT:
        pwd = generate_student_password(target.full_name, target.matricula or "")
    elif target.role == ROLE_REVIEWER:
        pwd = generate_generic_password(target.full_name or "Reviewer")
    else:
        raise HTTPException(status_code=400, detail="Only STUDENT or REVIEWER supported")

    target.password_hash = hash_password(pwd)
    db.add(target)
    db.commit()

    return {"ok": True, "user_id": target.id, "temp_password": pwd}


def _photo_download_url(photo_user_id: int, tenant_id: int) -> str:
    token = create_access_token(
        {
            "typ": "profile_photo_download",
            "photo_user_id": photo_user_id,
            "tenant_id": tenant_id,
        },
        expires_minutes=10,
    )
    return f"/api/users/photo/file?token={token}"


@router.get("/me/photo")
def get_my_profile_photo(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in (ROLE_REVIEWER, ROLE_STUDENT):
        raise HTTPException(status_code=403, detail="STUDENT or REVIEWER required")
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing")

    row = db.get(UserProfilePhoto, user.id)
    if not row or row.tenant_id != user.tenant_id:
        return {"status": "NONE"}

    return {
        "status": row.status,
        "url": _photo_download_url(user.id, user.tenant_id),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "reviewed_at": row.reviewed_at.isoformat() if row.reviewed_at else None,
        "review_comment": row.review_comment,
    }


@router.post("/me/photo")
def upload_my_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in (ROLE_REVIEWER, ROLE_STUDENT):
        raise HTTPException(status_code=403, detail="STUDENT or REVIEWER required")
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing")

    content_type = (file.content_type or "").lower()
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if content_type not in allowed:
        raise HTTPException(status_code=400, detail="Formato no soportado. Usa JPG/PNG/WebP.")

    client = get_minio()
    ensure_bucket(client)

    now = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = (file.filename or "foto").replace(" ", "_").replace("/", "_").replace("\\", "_")
    role_dir = "reviewer" if user.role == ROLE_REVIEWER else "student"
    object_key = f"tenant/{user.tenant_id}/{role_dir}/{user.id}/profile/{now}_{safe_name}"

    client.put_object(
        bucket_name=MINIO_BUCKET,
        object_name=object_key,
        data=file.file,
        length=-1,
        part_size=10 * 1024 * 1024,
        content_type=content_type,
    )

    row = db.get(UserProfilePhoto, user.id)
    if not row:
        row = UserProfilePhoto(
            user_id=user.id,
            tenant_id=user.tenant_id,
            object_key=object_key,
            content_type=content_type,
            status="PENDING",
            created_at=datetime.utcnow(),
        )
        db.add(row)
    else:
        row.tenant_id = user.tenant_id
        row.object_key = object_key
        row.content_type = content_type
        row.status = "PENDING"
        row.created_at = datetime.utcnow()
        row.reviewed_at = None
        row.reviewed_by_user_id = None
        row.review_comment = None

    db.commit()
    return {"ok": True, "status": "PENDING"}


@router.get("/students/photo-requests")
def list_student_photo_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_admin(user)
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")

    rows = (
        db.execute(
            select(UserProfilePhoto, User)
            .join(User, User.id == UserProfilePhoto.user_id)
            .where(
                UserProfilePhoto.tenant_id == user.tenant_id,
                UserProfilePhoto.status == "PENDING",
                User.role == ROLE_STUDENT,
            )
            .order_by(UserProfilePhoto.created_at.desc())
        )
        .all()
    )

    out: list[dict] = []
    for photo, student in rows:
        out.append(
            {
                "user_id": student.id,
                "full_name": student.full_name,
                "matricula": student.matricula,
                "status": photo.status,
                "created_at": photo.created_at.isoformat() if photo.created_at else None,
                "url": _photo_download_url(student.id, user.tenant_id),
            }
        )
    return out


@router.post("/students/{student_id}/photo/decision")
def decide_student_photo(
    student_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_admin(user)
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")

    decision = (payload.get("decision") or "").strip().upper()
    comment = payload.get("comment")
    if decision not in ("APPROVED", "REJECTED"):
        raise HTTPException(status_code=400, detail="decision must be APPROVED or REJECTED")

    student = db.get(User, student_id)
    if not student or student.tenant_id != user.tenant_id or student.role != ROLE_STUDENT:
        raise HTTPException(status_code=404, detail="Student not found")

    row = db.get(UserProfilePhoto, student_id)
    if not row or row.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="Photo request not found")

    if row.status != "PENDING":
        raise HTTPException(status_code=409, detail="Photo request is not pending")

    row.status = decision
    row.reviewed_at = datetime.utcnow()
    row.reviewed_by_user_id = user.id
    row.review_comment = (str(comment).strip() if comment is not None else None) or None

    db.commit()
    return {"ok": True, "user_id": student_id, "status": row.status}


@router.get("/reviewers/photo-requests")
def list_reviewer_photo_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_admin(user)
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")

    rows = (
        db.execute(
            select(UserProfilePhoto, User)
            .join(User, User.id == UserProfilePhoto.user_id)
            .where(
                UserProfilePhoto.tenant_id == user.tenant_id,
                UserProfilePhoto.status == "PENDING",
                User.role == ROLE_REVIEWER,
            )
            .order_by(UserProfilePhoto.created_at.desc())
        )
        .all()
    )

    out: list[dict] = []
    for photo, reviewer in rows:
        out.append(
            {
                "user_id": reviewer.id,
                "full_name": reviewer.full_name,
                "email": reviewer.email,
                "status": photo.status,
                "created_at": photo.created_at.isoformat() if photo.created_at else None,
                "url": _photo_download_url(reviewer.id, user.tenant_id),
            }
        )
    return out


@router.post("/reviewers/{reviewer_id}/photo/decision")
def decide_reviewer_photo(
    reviewer_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_admin(user)
    if not user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context missing for TENANT_ADMIN")

    decision = (payload.get("decision") or "").strip().upper()
    comment = payload.get("comment")
    if decision not in ("APPROVED", "REJECTED"):
        raise HTTPException(status_code=400, detail="decision must be APPROVED or REJECTED")

    reviewer = db.get(User, reviewer_id)
    if not reviewer or reviewer.tenant_id != user.tenant_id or reviewer.role != ROLE_REVIEWER:
        raise HTTPException(status_code=404, detail="Reviewer not found")

    row = db.get(UserProfilePhoto, reviewer_id)
    if not row or row.tenant_id != user.tenant_id:
        raise HTTPException(status_code=404, detail="Photo request not found")

    if row.status != "PENDING":
        raise HTTPException(status_code=409, detail="Photo request is not pending")

    row.status = decision
    row.reviewed_at = datetime.utcnow()
    row.reviewed_by_user_id = user.id
    row.review_comment = (str(comment).strip() if comment is not None else None) or None

    db.commit()
    return {"ok": True, "user_id": reviewer_id, "status": row.status}


@router.get("/photo/file")
def get_profile_photo_file(
    token: str,
    db: Session = Depends(get_db),
):
    try:
        data = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if data.get("typ") != "profile_photo_download":
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        photo_user_id = int(data.get("photo_user_id", -1))
        tenant_id = int(data.get("tenant_id", -1))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    row = db.get(UserProfilePhoto, photo_user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Photo not found")
    if row.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    client = get_minio()
    ensure_bucket(client)
    obj = client.get_object(MINIO_BUCKET, row.object_key)

    def iter_bytes():
        try:
            for chunk in obj.stream(32 * 1024):
                yield chunk
        finally:
            try:
                obj.close()
            finally:
                obj.release_conn()

    headers = {"Cache-Control": "no-store"}
    return StreamingResponse(
        iter_bytes(),
        media_type=row.content_type or "application/octet-stream",
        headers=headers,
    )
