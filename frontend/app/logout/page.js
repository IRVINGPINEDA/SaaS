"use client";

import { useEffect } from "react";
import { clearToken } from "../lib/token";

export default function LogoutPage() {
  useEffect(() => {
    clearToken("student");
    clearToken("admin");
    window.location.href = "/";
  }, []);

  return (
    <main className="container redirect-shell">
      <div className="card card-pad redirect-card">
        <div className="redirect-spinner" aria-hidden="true" />
        <h1 className="h1">Cerrando sesion</h1>
        <p className="p-muted">Saliendo de tu cuenta de forma segura.</p>
      </div>
    </main>
  );
}
