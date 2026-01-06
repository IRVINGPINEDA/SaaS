from sqlalchemy import select
from app.db.session import engine, SessionLocal
from app.db.base_class import Base
from app.db.base_class import Base
import app.db.base  # <-- MUY IMPORTANTE para registrar modelos

from app.db_models.tenant import Tenant
from app.db_models.user import User
from app.core.security import hash_password
from app.core.config import ROLE_SUPER_ADMIN, ROLE_TENANT_ADMIN, ROLE_REVIEWER, ROLE_STUDENT
from app.db_models.document import DocumentType
def main():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1) Super Admin global
        super_email = "admin@saas.com"
        exists = db.execute(select(User).where(User.email == super_email)).scalar_one_or_none()
        if not exists:
            db.add(User(
                tenant_id=None,
                role=ROLE_SUPER_ADMIN,
                email=super_email,
                matricula=None,
                full_name="Super Admin",
                password_hash=hash_password("Admin123!"),
                is_active=True,
            ))
            db.commit()

        # 2) Tenants demo
        def get_or_create_tenant(slug: str, name: str) -> Tenant:
            t = db.execute(select(Tenant).where(Tenant.slug == slug)).scalar_one_or_none()
            if not t:
                t = Tenant(slug=slug, name=name, is_active=True)
                db.add(t)
                db.commit()
                db.refresh(t)
            return t

        t1 = get_or_create_tenant("escuela1", "Escuela 1")
        t2 = get_or_create_tenant("escuela2", "Escuela 2")
        

        def seed_doc_types(db, tenant_id: int):
            existing = db.query(DocumentType).filter(DocumentType.tenant_id == tenant_id).count()
            if existing > 0:
                return

            db.add_all([
                DocumentType(tenant_id=tenant_id, name="Carta de Presentación", code="CARTA_PRESENTACION"),
                DocumentType(tenant_id=tenant_id, name="Reporte Semanal", code="REPORTE_SEMANAL"),
                DocumentType(tenant_id=tenant_id, name="Evaluación Mensual", code="EVALUACION_MENSUAL"),
            ])
            db.commit()
        seed_doc_types(db, t1.id)
        seed_doc_types(db, t2.id)
        # 3) Usuarios por tenant
        def ensure_user(tenant_id, role, email, matricula, name, password):
            q = select(User).where(User.tenant_id == tenant_id)
            if email:
                q = q.where(User.email == email)
            if matricula:
                q = q.where(User.matricula == matricula)
            u = db.execute(q).scalar_one_or_none()
            if not u:
                db.add(User(
                    tenant_id=tenant_id,
                    role=role,
                    email=email,
                    matricula=matricula,
                    full_name=name,
                    password_hash=hash_password(password),
                    is_active=True
                ))
                db.commit()

        # escuela1
        ensure_user(t1.id, ROLE_TENANT_ADMIN, "admin@escuela1.com", None, "Admin Escuela1", "Admin123!")
        ensure_user(t1.id, ROLE_REVIEWER, "revisor@escuela1.com", None, "Revisor Escuela1", "Admin123!")
        ensure_user(t1.id, ROLE_STUDENT, None, "A001", "Alumno A001", "Alumno123!")

        # escuela2
        ensure_user(t2.id, ROLE_TENANT_ADMIN, "admin@escuela2.com", None, "Admin Escuela2", "Admin123!")
        ensure_user(t2.id, ROLE_REVIEWER, "revisor@escuela2.com", None, "Revisor Escuela2", "Admin123!")
        ensure_user(t2.id, ROLE_STUDENT, None, "B001", "Alumno B001", "Alumno123!")

        print("Seed listo:")
        print("- SUPER_ADMIN: admin@saas.com / Admin123! (host: admin.localtest.me)")
        print("- Escuela1 Admin: admin@escuela1.com / Admin123! (host: escuela1.localtest.me)")
        print("- Escuela1 Alumno: A001 / Alumno123! (host: escuela1.localtest.me)")
        print("- Escuela2 Admin: admin@escuela2.com / Admin123! (host: escuela2.localtest.me)")
        print("- Escuela2 Alumno: B001 / Alumno123! (host: escuela2.localtest.me)")

    finally:
        db.close()

if __name__ == "__main__":
    main()
