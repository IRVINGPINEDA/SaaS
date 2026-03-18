from pydantic import BaseModel
from typing import Literal

class DocumentTypeOut(BaseModel):
    id: int
    name: str
    code: str
    program: str | None = None

class DocumentTypeCreateIn(BaseModel):
    name: str
    code: str
    program: str | None = None

class DocumentTypeUpdateIn(BaseModel):
    name: str | None = None
    code: str | None = None
    program: str | None = None

class StudentDocumentOut(BaseModel):
    id: int
    document_type_id: int
    document_type_name: str
    filename: str
    status: str
    reviewer_comment: str | None = None
    created_at: str
    reviewed_at: str | None = None

class ReviewIn(BaseModel):
    decision: Literal["APPROVED", "REJECTED", "OBSERVED"]
    comment: str | None = None
