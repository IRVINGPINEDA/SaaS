"use client";

import { useEffect } from "react";

export default function RedirectPage() {
  useEffect(() => {
    window.location.href = "/reviewer/panel";
  }, []);

  return (
    <main className="container redirect-shell">
      <div className="card card-pad redirect-card">
        <div className="redirect-spinner" aria-hidden="true" />
        <p className="card-title">Redirigiendo...</p>
        <p className="card-sub">Abriendo Panel del Revisor.</p>
      </div>
    </main>
  );
}
