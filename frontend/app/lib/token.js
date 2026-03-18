const KEYS = {
  student: "token_student",
  admin: "token_admin",
};

export function getToken(kind) {
  if (typeof window === "undefined") return null;
  const key = KEYS[kind];
  if (!key) return null;
  return window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
}

export function getAnyToken() {
  if (typeof window === "undefined") return null;
  return (
    window.sessionStorage.getItem(KEYS.admin) ||
    window.sessionStorage.getItem(KEYS.student) ||
    window.localStorage.getItem(KEYS.admin) ||
    window.localStorage.getItem(KEYS.student)
  );
}

export function setToken(kind, token) {
  if (typeof window === "undefined") return;
  const key = KEYS[kind];
  if (!key) return;
  window.sessionStorage.setItem(key, token);
  window.localStorage.setItem(key, token);
}

export function clearToken(kind) {
  if (typeof window === "undefined") return;
  const key = KEYS[kind];
  if (!key) return;
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

