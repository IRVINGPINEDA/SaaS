# Plan de Sprints — Tesis SaaS Docs

Cadencia sugerida: sprints de 2 semanas (ajustable).

## Sprint 1 — Fundaciones (multi-tenant + auth)
- Objetivo: dejar un esqueleto funcional end-to-end con multi-tenant por subdominio y autenticación por rol.
- Alcance:
  - Infra local con Docker Compose (PostgreSQL, MinIO, Backend, Frontend, Reverse Proxy).
  - Resolución de tenant por subdominio (`admin.<base_domain>` global y `<tenant>.<base_domain>` por escuela).
  - Modelos base: `Tenant`, `User` (roles), `DocumentType`, `StudentDocument`.
  - Auth:
    - Login admin (SUPER_ADMIN vs TENANT_ADMIN/REVIEWER).
    - Login alumno (matrícula por tenant).
    - Endpoint `/auth/me`.
  - Seed inicial de tenants/usuarios/tipos de documento.
- Entregables: backend y frontend levantan, se puede iniciar sesión por rol y validar contexto de tenant.

## Sprint 2 — Portales por rol + branding
- Objetivo: navegación por rol y configuración base por institución.
- Alcance:
  - Frontend: rutas y redirecciones por rol (SUPER_ADMIN / TENANT_ADMIN / REVIEWER / STUDENT).
  - SUPER_ADMIN: CRUD básico de tenants (alta/listado).
  - TENANT_ADMIN: edición de branding del tenant (color/logo URL).
  - Ajustes de sesión para evitar colisiones entre roles (tokens separados por rol).
- Entregables: portales accesibles por rol con UX mínima y configuración por tenant.

## Sprint 3 — Documentación real (Alumno ↔ Revisor)
- Objetivo: sincronizar carga, revisión, estatus y visualización de documentos entre alumno y revisor.
- Alcance:
  - Alumno:
    - Ver tipos requeridos.
    - Subir documentos (PDF/imagen) a MinIO.
    - Ver “Mis documentos” con estatus, comentarios y fechas.
    - Vista “Requisitos” (checklist por tipo + último estatus).
    - Modal de detalles + visor PDF embebido (iframe).
  - Revisor/Área:
    - Panel con KPIs y bandeja.
    - Pendientes/Observados con filtros (tipo, alumno, estatus).
    - Revisión: aprobar/rechazar/observar + comentario.
    - Visor PDF embebido (modal) sin salir del panel.
  - Backend:
    - Endpoints de documentos (types, my, upload, pending, review).
    - Descarga/visualización servida por backend con token temporal.
    - Endpoint de estadísticas por tenant (`/documents/stats`).
  - Auto-refresh (polling) en alumno y revisor para ver cambios sin recargar.
- Entregables: flujo completo “Alumno sube → Revisor ve/revisa → Alumno ve estatus/comentario” sin re-login.

## Sprint 4 — Expedientes de prácticas/servicio social (workflow)
- Objetivo: pasar de “documentos sueltos” a expediente por alumno y proceso.
- Alcance:
  - Modelo/BD: entidad “Expediente” (por alumno, periodo, programa: prácticas/servicio social).
  - Checklist configurable por tenant (requisitos por programa/periodo).
  - Asignación de revisores (opcional) y reglas de revisión.
  - Historial de eventos (subida, revisión, cambios de estado).
  - Pantallas:
    - Alumno: expediente, progreso, estado global.
    - Revisor: cola por expediente + detalle de expediente.
- Entregables: expediente navegable con estados y trazabilidad básica.

## Sprint 5 — Reportes, notificaciones y hardening
- Objetivo: cerrar el MVP con reporting, auditoría y preparación para despliegue.
- Alcance:
  - Reportes: exportar (CSV/PDF) y métricas por tenant/periodo.
  - Notificaciones: email o in-app (documento observado, aprobado, etc.).
  - Seguridad/operación:
    - Permisos finos y validaciones adicionales.
    - Logging/auditoría (quién revisó qué y cuándo).
    - Manejo de errores, pruebas mínimas y documentación final.
- Entregables: sistema “presentable” para evaluación con métricas, trazabilidad y estabilidad.

## Backlog (ideas rápidas)
- Carga de logo por archivo (en vez de URL) usando MinIO.
- Buscador por matrícula/nombre global en revisor.
- Descarga masiva/zip por expediente.
- Plantillas y validación de formato (nombres, tamaño máximo, PDF obligatorio en ciertos tipos).
