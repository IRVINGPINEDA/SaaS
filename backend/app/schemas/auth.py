from pydantic import BaseModel, EmailStr

class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str

class StudentLoginIn(BaseModel):
    matricula: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MeOut(BaseModel):
    id: int
    role: str
    tenant_id: int | None
    email: str | None
    matricula: str | None
    full_name: str
