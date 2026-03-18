from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import ROLE_REVIEWER, ROLE_STUDENT, ROLE_TENANT_ADMIN
from app.db.session import get_db
from app.db_models.document import StudentDocument, DocumentType
from app.db_models.progress_rule import ProgressRule
from app.db_models.user import User
from app.schemas.progress import (
    BatchProgressIn,
    BatchProgressOut,
    BatchProgressItemOut,
    MyProgressOut,
    ProgramProgressOut,
    ProgressRuleCreateIn,
    ProgressRuleOut,
    ProgressRuleUpdateIn,
)

router = APIRouter(prefix="/progress", tags=["progress"])


def require_tenant(request: Request) -> int:
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant requerido (subdominio).")
    return int(tenant_id)


def _require_staff(user: User):
    if user.role not in (ROLE_REVIEWER, ROLE_TENANT_ADMIN):
        raise HTTPException(status_code=403, detail="REVIEWER/TENANT_ADMIN required")


def _program_norm(v: str) -> str:
    p = (v or "").strip().upper()
    if p in ("PRACTICAS", "PRACTICA", "PRACT"):
        return "PRACTICAS"
    if p in ("SERVICIO", "SERVICIO_SOCIAL", "SS"):
        return "SERVICIO"
    raise HTTPException(status_code=400, detail="program must be PRACTICAS or SERVICIO")


def _compute_program_progress(
    rules: list[ProgressRule],
    latest_by_type: dict[int, str],
) -> ProgramProgressOut:
    active_rules = [r for r in rules if r.is_active]
    total_points = sum(int(r.points or 0) for r in active_rules)
    if total_points <= 0:
        return ProgramProgressOut(program=active_rules[0].program if active_rules else "UNKNOWN", percent=None, completed_points=0, total_points=0)

    completed_points = 0
    for r in active_rules:
        status = latest_by_type.get(int(r.document_type_id))
        if status == "APPROVED":
            completed_points += int(r.points or 0)

    percent = int(round((completed_points / total_points) * 100))
    return ProgramProgressOut(
        program=active_rules[0].program if active_rules else "UNKNOWN",
        percent=max(0, min(100, percent)),
        completed_points=completed_points,
        total_points=total_points,
    )


def _is_program_complete(p: ProgramProgressOut) -> bool:
    if p.percent is None:
        return False
    if int(p.total_points or 0) <= 0:
        return False
    return int(p.completed_points or 0) >= int(p.total_points or 0) or int(p.percent or 0) >= 100


def _lock_program(p: ProgramProgressOut) -> ProgramProgressOut:
    # Keep total_points so the UI can show what remains, but don't count any progress yet.
    p.percent = 0 if p.percent is not None else None
    p.completed_points = 0
    return p


def _latest_doc_status_by_type(
    db: Session,
    tenant_id: int,
    student_user_id: int,
    doc_type_ids: list[int],
) -> dict[int, str]:
    if not doc_type_ids:
        return {}

    rows = (
        db.execute(
            select(StudentDocument)
            .where(
                StudentDocument.tenant_id == tenant_id,
                StudentDocument.student_user_id == student_user_id,
                StudentDocument.document_type_id.in_(doc_type_ids),
            )
            .order_by(StudentDocument.created_at.desc())
        )
        .scalars()
        .all()
    )
    latest: dict[int, str] = {}
    for d in rows:
        dtid = int(d.document_type_id)
        if dtid not in latest:
            latest[dtid] = d.status
    return latest


@router.get("/me", response_model=MyProgressOut)
def my_progress(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != ROLE_STUDENT:
        raise HTTPException(status_code=403, detail="STUDENT required")

    tenant_id = require_tenant(request)
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado.")

    rules = (
        db.execute(
            select(ProgressRule)
            .where(ProgressRule.tenant_id == tenant_id)
            .order_by(ProgressRule.program.asc(), ProgressRule.order.asc(), ProgressRule.id.asc())
        )
        .scalars()
        .all()
    )

    rules_p = [r for r in rules if r.program == "PRACTICAS"]
    rules_s = [r for r in rules if r.program == "SERVICIO"]
    type_ids = list({int(r.document_type_id) for r in rules if r.is_active})
    latest = _latest_doc_status_by_type(db, tenant_id, user.id, type_ids)

    practicas = _compute_program_progress(rules_p, latest)
    practicas.program = "PRACTICAS"
    servicio = _compute_program_progress(rules_s, latest)
    servicio.program = "SERVICIO"

    # Servicio social se habilita solo cuando el alumno concluya Prácticas.
    if not _is_program_complete(practicas) and int(servicio.total_points or 0) > 0:
        servicio = _lock_program(servicio)

    return MyProgressOut(
        tenant_id=tenant_id,
        student_user_id=user.id,
        practicas=practicas,
        servicio=servicio,
    )


@router.post("/students/batch", response_model=BatchProgressOut)
def batch_progress(
    payload: BatchProgressIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_staff(user)
    tenant_id = require_tenant(request)
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado.")

    student_ids = [int(x) for x in (payload.student_ids or []) if int(x) > 0]
    student_ids = list(dict.fromkeys(student_ids))[:200]
    if not student_ids:
        return BatchProgressOut(items=[])

    # Verify students belong to this tenant
    allowed = set(
        db.execute(
            select(User.id)
            .where(User.tenant_id == tenant_id, User.role == ROLE_STUDENT, User.id.in_(student_ids))
        ).scalars().all()
    )
    student_ids = [sid for sid in student_ids if sid in allowed]
    if not student_ids:
        return BatchProgressOut(items=[])

    rules = (
        db.execute(select(ProgressRule).where(ProgressRule.tenant_id == tenant_id))
        .scalars()
        .all()
    )
    rules_p = [r for r in rules if r.program == "PRACTICAS"]
    rules_s = [r for r in rules if r.program == "SERVICIO"]
    type_ids = list({int(r.document_type_id) for r in rules if r.is_active})

    # Load docs for all students & types (latest per pair in Python)
    latest_by_student: dict[int, dict[int, str]] = {sid: {} for sid in student_ids}
    if type_ids:
        docs = (
            db.execute(
                select(StudentDocument)
                .where(
                    StudentDocument.tenant_id == tenant_id,
                    StudentDocument.student_user_id.in_(student_ids),
                    StudentDocument.document_type_id.in_(type_ids),
                )
                .order_by(StudentDocument.created_at.desc())
            )
            .scalars()
            .all()
        )
        for d in docs:
            sid = int(d.student_user_id)
            dtid = int(d.document_type_id)
            mp = latest_by_student.get(sid)
            if mp is None:
                continue
            if dtid not in mp:
                mp[dtid] = d.status

    items: list[BatchProgressItemOut] = []
    for sid in student_ids:
        latest = latest_by_student.get(sid, {})
        p = _compute_program_progress(rules_p, latest)
        s = _compute_program_progress(rules_s, latest)
        if not _is_program_complete(p) and int(s.total_points or 0) > 0:
            s = _lock_program(s)
        items.append(
            BatchProgressItemOut(
                student_user_id=sid,
                practicas_percent=p.percent,
                servicio_percent=s.percent,
            )
        )

    return BatchProgressOut(items=items)


@router.get("/rules", response_model=list[ProgressRuleOut])
def list_rules(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")
    tenant_id = require_tenant(request)
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado.")

    rows = (
        db.execute(
            select(ProgressRule, DocumentType)
            .join(DocumentType, DocumentType.id == ProgressRule.document_type_id)
            .where(ProgressRule.tenant_id == tenant_id, DocumentType.tenant_id == tenant_id)
            .order_by(ProgressRule.program.asc(), ProgressRule.order.asc(), ProgressRule.id.asc())
        )
        .all()
    )
    out: list[ProgressRuleOut] = []
    for r, dt in rows:
        out.append(
            ProgressRuleOut(
                id=r.id,
                tenant_id=r.tenant_id,
                program=r.program,
                document_type_id=r.document_type_id,
                document_type_name=dt.name,
                document_type_code=dt.code,
                points=r.points,
                order=r.order,
                is_active=r.is_active,
            )
        )
    return out


@router.get("/rules/public", response_model=list[ProgressRuleOut])
def list_public_rules(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in (ROLE_STUDENT, ROLE_REVIEWER, ROLE_TENANT_ADMIN):
        raise HTTPException(status_code=403, detail="Not allowed")

    tenant_id = require_tenant(request)
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado.")

    rows = (
        db.execute(
            select(ProgressRule, DocumentType)
            .join(DocumentType, DocumentType.id == ProgressRule.document_type_id)
            .where(
                ProgressRule.tenant_id == tenant_id,
                ProgressRule.is_active.is_(True),
                DocumentType.tenant_id == tenant_id,
            )
            .order_by(ProgressRule.program.asc(), ProgressRule.order.asc(), ProgressRule.id.asc())
        )
        .all()
    )

    out: list[ProgressRuleOut] = []
    for r, dt in rows:
        out.append(
            ProgressRuleOut(
                id=r.id,
                tenant_id=r.tenant_id,
                program=r.program,
                document_type_id=r.document_type_id,
                document_type_name=dt.name,
                document_type_code=dt.code,
                points=r.points,
                order=r.order,
                is_active=r.is_active,
            )
        )
    return out


@router.post("/rules", response_model=ProgressRuleOut)
def create_rule(
    payload: ProgressRuleCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")
    tenant_id = require_tenant(request)
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado.")

    program = _program_norm(payload.program)
    dt = db.get(DocumentType, int(payload.document_type_id))
    if not dt or dt.tenant_id != tenant_id:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido.")

    points = int(payload.points or 0)
    if points <= 0 or points > 100:
        raise HTTPException(status_code=400, detail="points must be 1..100")

    existing = (
        db.execute(
            select(ProgressRule).where(
                ProgressRule.tenant_id == tenant_id,
                ProgressRule.program == program,
                ProgressRule.document_type_id == dt.id,
            )
        )
        .scalars()
        .first()
    )
    if existing:
        existing.points = points
        existing.order = int(payload.order or 0)
        existing.is_active = bool(payload.is_active)
        db.commit()
        db.refresh(existing)
        return ProgressRuleOut(
            id=existing.id,
            tenant_id=existing.tenant_id,
            program=existing.program,
            document_type_id=existing.document_type_id,
            document_type_name=dt.name,
            document_type_code=dt.code,
            points=existing.points,
            order=existing.order,
            is_active=existing.is_active,
        )

    r = ProgressRule(
        tenant_id=tenant_id,
        program=program,
        document_type_id=dt.id,
        points=points,
        order=int(payload.order or 0),
        is_active=bool(payload.is_active),
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return ProgressRuleOut(
        id=r.id,
        tenant_id=r.tenant_id,
        program=r.program,
        document_type_id=r.document_type_id,
        document_type_name=dt.name,
        document_type_code=dt.code,
        points=r.points,
        order=r.order,
        is_active=r.is_active,
    )


@router.patch("/rules/{rule_id}", response_model=ProgressRuleOut)
def update_rule(
    rule_id: int,
    payload: ProgressRuleUpdateIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")
    tenant_id = require_tenant(request)
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado.")

    r = db.get(ProgressRule, rule_id)
    if not r or r.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Rule not found")

    if payload.points is not None:
        points = int(payload.points)
        if points <= 0 or points > 100:
            raise HTTPException(status_code=400, detail="points must be 1..100")
        r.points = points
    if payload.order is not None:
        r.order = int(payload.order)
    if payload.is_active is not None:
        r.is_active = bool(payload.is_active)

    db.commit()
    db.refresh(r)

    dt = db.get(DocumentType, int(r.document_type_id))
    return ProgressRuleOut(
        id=r.id,
        tenant_id=r.tenant_id,
        program=r.program,
        document_type_id=r.document_type_id,
        document_type_name=dt.name if dt else None,
        document_type_code=dt.code if dt else None,
        points=r.points,
        order=r.order,
        is_active=r.is_active,
    )


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != ROLE_TENANT_ADMIN:
        raise HTTPException(status_code=403, detail="TENANT_ADMIN required")
    tenant_id = require_tenant(request)
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="No autorizado.")

    r = db.get(ProgressRule, rule_id)
    if not r or r.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Rule not found")

    db.delete(r)
    db.commit()
    return {"ok": True}
