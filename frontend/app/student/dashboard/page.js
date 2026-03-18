"use client";

import { useEffect } from "react";

export default function RedirectPage() {
  useEffect(() => {
    window.location.href = "/student/portal";
  }, []);

  return (
    <main className="container redirect-shell">
      <div className="card card-pad redirect-card">
        <div className="redirect-spinner" aria-hidden="true" />
        <p className="card-title">Redirigiendo...</p>
        <p className="card-sub">Abriendo Portal del Alumno.</p>
      </div>
    </main>
  );
}
