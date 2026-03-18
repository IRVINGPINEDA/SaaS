from pydantic import BaseModel


class ProgressRuleOut(BaseModel):
    id: int
    tenant_id: int
    program: str
    document_type_id: int
    document_type_name: str | None = None
    document_type_code: str | None = None
    points: int
    order: int
    is_active: bool


class ProgressRuleCreateIn(BaseModel):
    program: str
    document_type_id: int
    points: int = 1
    order: int = 0
    is_active: bool = True


class ProgressRuleUpdateIn(BaseModel):
    points: int | None = None
    order: int | None = None
    is_active: bool | None = None


class ProgramProgressOut(BaseModel):
    program: str
    percent: int | None = None
    completed_points: int = 0
    total_points: int = 0


class MyProgressOut(BaseModel):
    tenant_id: int
    student_user_id: int
    practicas: ProgramProgressOut
    servicio: ProgramProgressOut


class BatchProgressIn(BaseModel):
    student_ids: list[int]


class BatchProgressItemOut(BaseModel):
    student_user_id: int
    practicas_percent: int | None = None
    servicio_percent: int | None = None


class BatchProgressOut(BaseModel):
    items: list[BatchProgressItemOut]

