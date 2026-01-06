from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db_models.user import User
from app.db_models.tenant import Tenant
from app.schemas.auth import AdminLoginIn, StudentLoginIn, TokenOut, MeOut
from app.core.security import verify_password, create_access_token, decode_token
from app.core.config import (
    ROLE_SUPER_ADMIN, ROLE_TENANT_ADMIN, ROLE_REVIEWER, ROLE_STUDENT
)
from app.core.tenant import is_admin_host

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)

def require_tenant_context(request: Request) -> int:
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required (use school subdomain).")
    return tenant_id

@router.post("/login-admin", response_model=TokenOut)
def login_admin(payload: AdminLoginIn, request: Request, db: Session = Depends(get_db)):
    # Admin login permitido en:
    # - admin.<base_domain> para SUPER_ADMIN
    # - <tenant>.<base_domain> para TENANT_ADMIN/REVIEWER
    on_admin = is_admin_host(request.headers.get("host", ""))
    stmt = select(User).where(User.email == payload.email, User.is_active == True)
    user = db.execute(stmt).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.role == ROLE_SUPER_ADMIN:
        if not on_admin:
            raise HTTPException(status_code=403, detail="SUPER_ADMIN must login on admin subdomain.")
    else:
        # Debe estar en un tenant host y coincidir con tenant_id del request
        tenant_id = require_tenant_context(request)
        if user.tenant_id != tenant_id:
            raise HTTPException(status_code=403, detail="User does not belong to this tenant.")

        if user.role not in (ROLE_TENANT_ADMIN, ROLE_REVIEWER):
            raise HTTPException(status_code=403, detail="Not an admin account.")

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "tenant_id": user.tenant_id
    })
    return {"access_token": token}

@router.post("/login-student", response_model=TokenOut)
def login_student(payload: StudentLoginIn, request: Request, db: Session = Depends(get_db)):
    tenant_id = require_tenant_context(request)

    stmt = select(User).where(
        User.tenant_id == tenant_id,
        User.matricula == payload.matricula,
        User.is_active == True
    )
    user = db.execute(stmt).scalar_one_or_none()
    if not user or user.role != ROLE_STUDENT or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "tenant_id": user.tenant_id
    })
    return {"access_token": token}

def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        data = decode_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = int(data.get("sub"))
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user)):
    return MeOut(
        id=user.id,
        role=user.role,
        tenant_id=user.tenant_id,
        email=user.email,
        matricula=user.matricula,
        full_name=user.full_name
    )
