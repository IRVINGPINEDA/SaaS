export function apiBase() {
  // Como Caddy enruta /api al backend, usamos relativo
  return "/api";
}

export async function apiPost(path, body, token) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || "Error");
  }
  return data;
}

export async function apiGet(path, token) {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || "Error");
  }
  return data;
}
