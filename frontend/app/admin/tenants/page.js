"use client";

import { useEffect } from "react";
import { getToken } from "../../lib/token";

export default function TenantsRedirectPage() {
  useEffect(() => {
    const token = getToken("admin");
    if (!token) {
      window.location.href = "/";
      return;
    }
    window.location.href = "/admin/super/panel?tab=Escuelas";
  }, []);

  return (
    <main className="container redirect-shell">
      <div className="card card-pad redirect-card">
        <div className="redirect-spinner" aria-hidden="true" />
        <h1 className="h1">Redirigiendo</h1>
        <p className="p-muted">Abriendo el panel de escuelas del super administrador.</p>
      </div>
    </main>
  );
}
