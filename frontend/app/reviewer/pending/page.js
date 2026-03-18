"use client";

import { useEffect } from "react";

export default function ReviewerPendingRedirect() {
  useEffect(() => {
    window.location.href = "/reviewer/panel?tab=Pendientes";
  }, []);

  return (
    <main className="container redirect-shell">
      <div className="card card-pad redirect-card">
        <div className="redirect-spinner" aria-hidden="true" />
        <h1 className="h1">Redirigiendo al panel</h1>
        <p className="p-muted">Abriendo la pestaña de pendientes del revisor.</p>
      </div>
    </main>
  );
}
