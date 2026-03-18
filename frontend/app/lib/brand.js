function normalizeHex(hex) {
  const v = String(hex || "").trim();
  if (!v) return null;
  if (v.startsWith("#")) return v;
  return `#${v}`;
}

function hexToRgbTriplet(hex) {
  const v = normalizeHex(hex);
  if (!v) return null;

  const m3 = /^#([0-9a-fA-F]{3})$/.exec(v);
  const m6 = /^#([0-9a-fA-F]{6})$/.exec(v);
  const full = m6 ? m6[1] : m3 ? m3[1].split("").map((c) => c + c).join("") : null;
  if (!full) return null;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return `${r} ${g} ${b}`;
}

export function applyBrandVars(primary, secondary) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (primary) {
    root.style.setProperty("--brand", primary);
    const rgb = hexToRgbTriplet(primary);
    if (rgb) root.style.setProperty("--brand-rgb", rgb);
    else root.style.removeProperty("--brand-rgb");
  }

  if (secondary) {
    root.style.setProperty("--brand2", secondary);
    const rgb2 = hexToRgbTriplet(secondary);
    if (rgb2) root.style.setProperty("--brand2-rgb", rgb2);
    else root.style.removeProperty("--brand2-rgb");
  } else {
    root.style.removeProperty("--brand2");
    root.style.removeProperty("--brand2-rgb");
  }
}
