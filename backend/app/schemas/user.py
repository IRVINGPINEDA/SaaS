from pydantic import BaseModel, EmailStr


class TenantAdminCreate(BaseModel):
    tenant_id: int
    email: EmailStr
    full_name: str
    password: str


class ReviewerCreate(BaseModel):
    # Para TENANT_ADMIN se ignora y se usa tenant_id del token.
    # Para SUPER_ADMIN se requiere.
    tenant_id: int | None = None
    email: EmailStr
    full_name: str
    password: str | None = None


class StudentCreate(BaseModel):
    # Para TENANT_ADMIN se ignora y se usa tenant_id del token.
    # Para SUPER_ADMIN se requiere.
    tenant_id: int | None = None
    matricula: str
    full_name: str
    password: str | None = None
    category: str | None = None
    group_name: str | None = None


class StudentUpdate(BaseModel):
    matricula: str | None = None
    full_name: str | None = None
    category: str | None = None
    group_name: str | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: int
    tenant_id: int | None
    role: str
    email: str | None
    matricula: str | None = None
    full_name: str
    is_active: bool


class StudentOut(BaseModel):
    id: int
    tenant_id: int
    matricula: str
    full_name: str
    is_active: bool
    category: str | None = None
    group_name: str | None = None


class StudentOverviewOut(BaseModel):
    id: int
    tenant_id: int
    matricula: str
    full_name: str
    is_active: bool
    category: str | None = None
    group_name: str | None = None

    platform_status: str  # NONE | PENDING | OBSERVED | APPROVED | REJECTED
    docs_total: int = 0
    pending: int = 0
    observed: int = 0
    approved: int = 0
    rejected: int = 0
