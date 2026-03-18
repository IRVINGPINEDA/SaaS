import re


def _clean_letters(s: str) -> str:
    s = (s or "").strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^A-Za-z0-9 ]+", "", s)
    return s


def generate_student_password(full_name: str, matricula: str) -> str:
    """
    Contraseña generica para alumno basada en nombre + matricula.
    Nota: se recomienda forzar cambio de contraseña en un sistema real.
    """
    name = _clean_letters(full_name)
    parts = [p for p in name.split(" ") if p]
    first = parts[0] if parts else "Alumno"
    first = first[:10]

    m = re.sub(r"\s+", "", (matricula or "").strip())
    m = re.sub(r"[^A-Za-z0-9]+", "", m)
    if not m:
        m = "0000"

    pwd = f"{first}{m}!"
    if len(pwd) < 8:
        pwd = (pwd + "12345678")[:8]
    return pwd


def generate_generic_password(seed: str, suffix: str = "!") -> str:
    seed = _clean_letters(seed)
    seed = re.sub(r"\s+", "", seed)[:14] or "User"
    pwd = f"{seed}{suffix}"
    if len(pwd) < 8:
        pwd = (pwd + "12345678")[:8]
    return pwd
