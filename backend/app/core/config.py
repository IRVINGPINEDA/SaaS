import os

DATABASE_URL = os.getenv("DATABASE_URL", "")
BASE_DOMAIN = os.getenv("BASE_DOMAIN", "localtest.me")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALG = "HS256"
JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "720"))  # 12h

# En tu caso: admin.<base_domain> es el portal del SaaS
ADMIN_SUBDOMAIN = os.getenv("ADMIN_SUBDOMAIN", "admin")

# Roles
ROLE_SUPER_ADMIN = "SUPER_ADMIN"
ROLE_TENANT_ADMIN = "TENANT_ADMIN"
ROLE_REVIEWER = "REVIEWER"
ROLE_STUDENT = "STUDENT"
