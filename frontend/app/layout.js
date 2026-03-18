"use client";

import "./proto-ui.css";
import { useEffect, useState } from "react";
import Script from "next/script";
import { applyBrandVars } from "./lib/brand";

async function getTenantConfig() {
  const res = await fetch("/api/tenant/public-config");
  if (!res.ok) return null;
  return await res.json();
}

export default function RootLayout({ children }) {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    // Branding solo para escuelas; en admin.* no existe tenant context
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (host.startsWith("admin.")) return;
    }

    // Branding solo para escuelas; si falla no pasa nada
    getTenantConfig()
      .then((c) => {
        if (!c) return;
        setCfg(c);
        if (c?.brand?.primary_color || c?.brand?.secondary_color) {
          applyBrandVars(c?.brand?.primary_color, c?.brand?.secondary_color);
        }

        // UI settings (dashboards + login)
        if (c?.ui?.density) document.documentElement.dataset.density = c.ui.density;
        if (c?.ui?.shadow) document.documentElement.dataset.shadow = c.ui.shadow;
        if (typeof c?.ui?.radius === "number") {
          document.documentElement.style.setProperty("--radius", `${c.ui.radius}px`);
        }
        if (c?.ui?.dashboard_header_style) {
          document.documentElement.dataset.header = c.ui.dashboard_header_style;
        }

        // Dashboard background
        const bgMode = String(c?.ui?.dashboard_bg_mode || "default").toLowerCase();
        document.documentElement.dataset.dashboardBg = (bgMode === "solid" ? "solid" : "default");
        if (bgMode === "solid" && c?.ui?.dashboard_bg_color) {
          document.documentElement.style.setProperty("--bg", c.ui.dashboard_bg_color);
        } else {
          document.documentElement.style.removeProperty("--bg");
        }

        // Favicon dinámico por tenant (opcional)
        if (c?.brand?.favicon_url) {
          let link = document.querySelector("link[rel='icon']");
          if (!link) {
            link = document.createElement("link");
            link.setAttribute("rel", "icon");
            document.head.appendChild(link);
          }
          link.setAttribute("href", c.brand.favicon_url);
        }

        if (c?.display_name) {
          document.title = `${c.display_name} · SaaS Docs`;
        }
      })
      .catch(() => {});
  }, []);

  return (
    <html suppressHydrationWarning>
      <head>
        <Script id="strip-bis-skin-checked" strategy="beforeInteractive">
          {`
            (() => {
              try {
                const strip = () => {
                  document.querySelectorAll('[bis_skin_checked]').forEach((el) => el.removeAttribute('bis_skin_checked'));
                };
                strip();
                new MutationObserver(strip).observe(document.documentElement, { attributes: true, childList: true, subtree: true });
              } catch {}
            })();
          `}
        </Script>
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
