# Despliegue en AWS EC2 (sslip.io + subdominios + HTTPS)

Este proyecto es **multi-tenant por subdominio**. En EC2 puedes "emular DNS" usando `sslip.io` para que:

- `admin.<ELASTIC_IP>.sslip.io` sea el portal **SUPER_ADMIN**
- `<tenant>.<ELASTIC_IP>.sslip.io` sea el portal de cada escuela (tenant)

Ejemplo con Elastic IP `18.205.23.12`:
- `https://admin.18.205.23.12.sslip.io`
- `https://escuela1.18.205.23.12.sslip.io`

## 0) Requisitos

- Cuenta de AWS
- Un par de llaves SSH (Key Pair) para EC2
- Dominio NO es necesario (usamos `sslip.io`)
- En el servidor: Ubuntu Server 22.04 LTS (recomendado)
- El repo corre con Docker Compose

## 1) Crear la instancia EC2

1. En AWS Console: `EC2 -> Instances -> Launch instance`
2. Nombre: el que quieras (ej. `tesis-saas-docs`)
3. AMI: `Ubuntu Server 22.04 LTS`
4. Instance type: `t3.small` o `t3.medium` (recomendado para demo)
5. Key pair: selecciona tu key pair
6. Storage: 20-40 GB (recomendado)
7. Security group (Inbound rules):
   - TCP `22` desde **tu IP** (no 0.0.0.0/0)
   - TCP `80` desde `0.0.0.0/0`
   - TCP `443` desde `0.0.0.0/0`
8. Launch

## 2) Asignar Elastic IP (recomendado)

1. AWS Console: `EC2 -> Elastic IPs -> Allocate Elastic IP address`
2. Selecciona tu Elastic IP -> `Actions -> Associate Elastic IP address`
3. Asóciala a tu instancia

Vas a usar esa IP en `sslip.io`.

## 3) Conectarte por SSH

En tu maquina local (Windows), con PowerShell:

```powershell
ssh -i C:\ruta\tu-llave.pem ubuntu@<ELASTIC_IP>
```

Si tu usuario no es `ubuntu`, usa el que corresponda a tu AMI.

## 4) Preparar el servidor (Docker + Compose)

En la instancia:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git

# Docker repo
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Permitir docker sin sudo (vuelve a entrar por SSH despues)
sudo usermod -aG docker $USER
exit
```

Vuelve a entrar por SSH.

Verifica:

```bash
docker --version
docker compose version
```

## 5) Clonar el proyecto y configurar variables

```bash
git clone <URL_DEL_REPO>
cd tesis-saas-docs
```

Crea un archivo `.env` en la raiz del repo:

```bash
cat > .env << 'EOF'
# Cambia por tu Elastic IP
BASE_DOMAIN=<ELASTIC_IP>.sslip.io

# Opcional (recomendado): email para avisos de certificados de Let's Encrypt (Caddy)
# CADDY_EMAIL=tu-correo@dominio.com

# Recomendado en produccion (no uses valores "dev"):
# JWT_SECRET=pon-un-secreto-largo-aqui
EOF
```

Notas:
- `BASE_DOMAIN` es el dominio raiz sobre el que se calculan tenants y admin.
- Con `sslip.io` ese dominio raiz siempre es `<IP>.sslip.io`.

## 6) Levantar el stack en EC2

```bash
docker compose up -d --build
```

Revisa que todo quede `Up`:

```bash
docker ps
```

## 7) Seed (crear usuarios/tenants demo)

```bash
docker exec -it tesis_backend python -m app.seed
```

## 8) Probar en el navegador (subdominios)

Con tu Elastic IP (ej. `18.205.23.12`):

1. Super admin:
   - `https://admin.18.205.23.12.sslip.io`
2. Tenant demo:
   - `https://escuela1.18.205.23.12.sslip.io`
   - `https://escuela2.18.205.23.12.sslip.io`

Si quieres probar API:
- Salud: `https://admin.<ELASTIC_IP>.sslip.io/api/health`
- Whoami: `https://escuela1.<ELASTIC_IP>.sslip.io/api/tenant/whoami`

## 9) Si HTTPS no levanta

Checklist rapido:

1. Security Group: puertos `80` y `443` inbound abiertos.
2. Estas entrando por `https://<algo>.<ELASTIC_IP>.sslip.io` (no por la IP directa).
3. Caddy y backend arriba:
   - `docker logs tesis_proxy --tail 200`
   - `docker logs tesis_backend --tail 200`
4. Rate limits: Let's Encrypt limita certificados. Para demo usa pocos subdominios (admin + 1-3 tenants).

## 10) Operacion basica (comandos utiles)

Actualizar codigo y reconstruir:

```bash
git pull
docker compose up -d --build
```

Ver logs:

```bash
docker logs tesis_proxy --tail 200
docker logs tesis_frontend --tail 200
docker logs tesis_backend --tail 200
```

Apagar:

```bash
docker compose down
```

Apagar y borrar volumenes (borra DB/archivos MinIO):

```bash
docker compose down -v
```

