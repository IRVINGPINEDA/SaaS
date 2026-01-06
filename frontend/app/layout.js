"use client";

import "./proto-ui.css";
import { useEffect, useState } from "react";

async function getTenantConfig() {
  const res = await fetch("/api/tenant/public-config");
  if (!res.ok) return null;
  return await res.json();
}

export default function RootLayout({ children }) {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    // Branding solo para escuelas; si falla no pasa nada
    getTenantConfig()
      .then((c) => {
        if (!c) return;
        setCfg(c);
        if (c?.brand?.primary_color) {
          document.documentElement.style.setProperty("--brand", c.brand.primary_color);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}
