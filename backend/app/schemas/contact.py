from pydantic import BaseModel, EmailStr


class ContactRequestCreateIn(BaseModel):
    email: EmailStr
    message: str


class ContactRequestUpdateIn(BaseModel):
    status: str | None = None
    client_name: str | None = None
    school_name: str | None = None
    desired_slug: str | None = None
    created_tenant_id: int | None = None
    notes: str | None = None


class ContactRequestOut(BaseModel):
    id: int
    email: str
    message: str
    status: str

    client_name: str | None = None
    school_name: str | None = None
    desired_slug: str | None = None
    created_tenant_id: int | None = None
    notes: str | None = None

    source_host: str | None = None
    source_ip: str | None = None
    user_agent: str | None = None

    created_at: str | None = None
    updated_at: str | None = None

