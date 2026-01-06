from app.core.config import BASE_DOMAIN, ADMIN_SUBDOMAIN

def parse_host(host: str) -> str:
    return host.split(":")[0].lower().strip()

def get_subdomain(host: str) -> str | None:
    host = parse_host(host)
    if host == BASE_DOMAIN:
        return None
    suffix = "." + BASE_DOMAIN
    if host.endswith(suffix):
        return host[: -len(suffix)]
    return None

def is_admin_host(host: str) -> bool:
    sub = get_subdomain(host)
    return sub == ADMIN_SUBDOMAIN
