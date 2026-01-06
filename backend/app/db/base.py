from sqlalchemy.orm import DeclarativeBase
from app.db_models.document import DocumentType, StudentDocument  # noqa
from app.db.base_class import Base  # noqa



from app.db_models.tenant import Tenant  # noqa
from app.db_models.user import User  # noqa



class Base(DeclarativeBase):
    pass
