 "use client";

import { useEffect, useMemo } from "react";
import { AboutLanding, computeApexHost } from "../lib/marketing";

export default function AboutPage() {
  const apexAboutHref = useMemo(() => {
    if (typeof window === "undefined") return "/about";
    const apexHost = computeApexHost(window.location.hostname);
    if (!apexHost) return "/about";
    const port = window.location.port ? `:${window.location.port}` : "";
    return `${window.location.protocol}//${apexHost}${port}/about`;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apexHost = computeApexHost(window.location.hostname);
    if (!apexHost) return;
    const current = window.location.hostname.toLowerCase();
    if (current === apexHost) return;
    window.location.href = apexAboutHref;
  }, [apexAboutHref]);

  return (
    <AboutLanding title="SaaS Docs" />
  );
}
