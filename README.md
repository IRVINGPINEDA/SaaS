SaaS Docs — Gestión de Documentación para Prácticas Profesionales y Servicio Social

Sistema **SaaS multi-tenant** (por subdominio) para gestionar el flujo de **carga, validación y revisión** de documentos de alumnos en **Prácticas Profesionales** y **Servicio Social** en México.

Cada institución (escuela/empresa) usa su propio subdominio y puede personalizar branding (logo/colores), mientras que el **Super Admin** administra el SaaS a nivel global.

---

## Roles del sistema

- **SUPER_ADMIN**: Admin global del SaaS (gestiona tenants/instituciones).
- **TENANT_ADMIN**: Admin de la institución (configuración interna, supervisión).
- **REVIEWER**: Área de Prácticas/Servicio Social (revisa, aprueba/rechaza/observa documentos).
- **STUDENT**: Alumno (sube documentos y consulta estatus).

---

## Arquitectura (Prototipo)

- **Frontend**: Next.js
- **Backend**: FastAPI + SQLAlchemy
- **DB**: PostgreSQL
- **Storage**: MinIO (S3 compatible)
- **Reverse Proxy**: Caddy (manejo de subdominios localtest.me)
- **Infra**: Docker Compose

---

## Requisitos

- Docker Desktop (Windows 11)
- Docker Compose
- Navegador web

---

## Instalación / Ejecución (Local)

### 1) Clonar el repositorio
```bash
git clone <URL_DEL_REPO>
cd tesis-saas-docs


docker compose up -d --build

docker exec -it tesis_backend python -m app.seed
