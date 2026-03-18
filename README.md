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
- **Reverse Proxy**: Caddy (manejo de subdominios por `BASE_DOMAIN`)
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
```

### 2) Abrir el sistema (IMPORTANTE: usar subdominios)

Este proyecto es **multi-tenant por subdominio**. Para que el backend resuelva `tenant_id`, entra por:

- `http://escuela1.<BASE_DOMAIN>` (tenant demo 1)
- `http://escuela2.<BASE_DOMAIN>` (tenant demo 2)
- `http://admin.<BASE_DOMAIN>` (portal global SUPER_ADMIN)

Configura `BASE_DOMAIN` segun tu entorno:
- Local: `BASE_DOMAIN=localtest.me` (no requiere hosts file)
- Alternativa local: `BASE_DOMAIN=127.0.0.1.sslip.io`

Resumen de seguridad (para presentacion): `SECURITY_RESUMEN.md`.

Evita abrir `http://localhost:3000` o `http://localhost:8000` si quieres que funcionen los portales por rol/tenant.

### 3) Demo de sincronización Alumno ↔ Revisor (documentos reales)

1) Entra a `http://escuela1.<BASE_DOMAIN>`
   - Alumno: `A001` / `Alumno123!`
   - En `Documentos` sube un PDF/imagen.

2) Entra a `http://escuela1.<BASE_DOMAIN>` (mismo tenant)
   - Revisor: `revisor@escuela1.com` / `Admin123!`
   - Abre `Pendientes / Observados` (ruta: `/reviewer/pending`)
   - Verás el documento subido por el alumno, podrás **abrirlo** y **aprobar/rechazar/observar**.

Nota: el visor abre el PDF desde el backend con un token temporal (misma origin) para que se muestre dentro del modal.
