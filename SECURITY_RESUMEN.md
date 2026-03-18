# Resumen de Seguridad (Documentos, Usuarios y Contrasenas)

Este documento resume como se protege la informacion en el sistema SaaS Docs (prototipo multi-tenant por subdominio).

## 1) Seguridad de contrasenas

- Las contrasenas **no se guardan en texto plano**. Se almacenan como hash usando `PBKDF2-SHA256` (Passlib).
- El login valida credenciales comparando el hash (no se puede recuperar la contrasena original desde la base de datos).
- Regla minima: contrasena de **8 caracteres** para cuentas creadas desde la plataforma.
- Cuentas pueden desactivarse (`is_active=false`), bloqueando el acceso.

## 2) Autenticacion y sesiones (JWT)

- El backend emite un **JWT** (HS256) con expiracion (`exp`) para autenticar al usuario.
- El token incluye `role` y `tenant_id` para aplicar control de acceso por rol y por tenant.
- Si el token es invalido o expiro, el backend responde `401`.

## 3) Control de acceso por rol (RBAC)

Roles principales:
- `SUPER_ADMIN`: administra el SaaS global.
- `TENANT_ADMIN`: administra su institucion (tenant).
- `REVIEWER`: revisa documentos en su institucion.
- `STUDENT`: sube y consulta sus documentos.

Reglas clave:
- Un alumno solo puede ver/subir sus propios documentos.
- Revisor/Admin del tenant puede ver pendientes del tenant y cambiar estatus (aprobar/rechazar/observar).
- Un usuario no puede operar fuera de su rol (respuestas `403` cuando no corresponde).

## 4) Aislamiento multi-tenant (por subdominio)

- El tenant se resuelve por el `Host` del request (subdominio). Ejemplo: `escuela1.<BASE_DOMAIN>`.
- El backend fija `request.state.tenant_id` y la mayoria de endpoints requieren ese contexto.
- En login admin/revisor se valida que el usuario pertenezca al **mismo tenant** del subdominio.

Resultado: un usuario autenticado en un tenant no deberia poder acceder a datos de otro tenant, aunque conozca IDs.

## 5) Seguridad de documentos (almacenamiento y descarga)

- Los archivos se guardan en **MinIO (S3 compatible)**.
- La ruta interna del objeto incluye el tenant y el usuario:
  - `tenant/<tenant_id>/student/<user_id>/<DOC_CODE>/...`
- El frontend no descarga directamente desde MinIO.
- Para abrir/descargar un documento:
  1. Un endpoint valida permisos por rol/tenant y genera un token temporal de descarga (5 minutos).
  2. El backend sirve el archivo (stream) desde un endpoint protegido por ese token temporal.
- Respuesta de archivo con `Cache-Control: no-store` para reducir caching en el navegador.

## 6) Trazabilidad basica

- Cada documento tiene estatus (`PENDING`, `OBSERVED`, `APPROVED`, `REJECTED`) y timestamps.
- El revisor puede dejar comentario; se guarda junto con la fecha de revision.

## 7) Recomendaciones para produccion (para mencionar en presentacion)

Estas practicas no siempre estan activas por default en el prototipo, pero son recomendadas:

- Forzar HTTPS (TLS) en el reverse proxy.
- Cambiar `JWT_SECRET` a un secreto largo y unico.
- Restringir CORS (no dejar `allow_origins=["*"]`).
- Endurecer politicas de contrasena (longitud mayor, complejidad, rotacion si aplica).
- Logs/auditoria: registrar eventos de descarga y cambios de estatus por usuario.
- MinIO/Storage: habilitar TLS, politicas por bucket, y/o cifrado en reposo segun requerimientos.

