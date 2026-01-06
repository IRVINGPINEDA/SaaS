from pydantic import BaseModel

class TenantCreate(BaseModel):
    slug: str
    name: str

class TenantOut(BaseModel):
    id: int
    slug: str
    name: str
    is_active: bool
    brand_primary_color: str | None = None
    brand_logo_url: str | None = None
