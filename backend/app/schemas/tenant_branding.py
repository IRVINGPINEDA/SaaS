from pydantic import BaseModel

class TenantBrandingUpdate(BaseModel):
    brand_primary_color: str | None = None
    brand_logo_url: str | None = None
