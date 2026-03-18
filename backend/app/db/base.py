from sqlalchemy.orm import DeclarativeBase
from app.db_models.document import DocumentType, StudentDocument  # noqa
from app.db.base_class import Base  # noqa



from app.db_models.tenant import Tenant  # noqa
from app.db_models.tenant_branding import TenantBranding  # noqa
from app.db_models.tenant_login import TenantLogin  # noqa
from app.db_models.tenant_ui import TenantUi  # noqa
from app.db_models.user import User  # noqa
from app.db_models.user_profile_photo import UserProfilePhoto  # noqa
from app.db_models.progress_rule import ProgressRule  # noqa
from app.db_models.student_profile import StudentProfile  # noqa
from app.db_models.contact_request import ContactRequest  # noqa



class Base(DeclarativeBase):
    pass
