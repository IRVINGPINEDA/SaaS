from pydantic import BaseModel

class DocumentTypeOut(BaseModel):
    id: int
    name: str
    code: str

class StudentDocumentOut(BaseModel):
    id: int
    document_type_id: int
    document_type_name: str
    filename: str
    status: str
    reviewer_comment: str | None = None
    created_at: str

class ReviewIn(BaseModel):
    action: str  # APPROVE / REJECT / OBSERVE
    comment: str | None = None
