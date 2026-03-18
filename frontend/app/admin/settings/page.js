"use client";

import { useEffect } from "react";
import { getToken } from "../../lib/token";

export default function TenantSettingsRedirectPage() {
  useEffect(() => {
    const token = getToken("admin");
    if (!token) {
      window.location.href = "/";
      return;
    }
    window.location.href = "/admin/panel?tab=Branding";
  }, []);

  return (
    <main className="container redirect-shell">
      <div className="card card-pad redirect-card">
        <div className="redirect-spinner" aria-hidden="true" />
        <h1 className="h1">Redirigiendo</h1>
        <p className="p-muted">Abriendo la configuración de branding del tenant.</p>
      </div>
    </main>
  );
}
