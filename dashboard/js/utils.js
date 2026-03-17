// ═══════════════════════════════════════════════════════════════════════════
// UTILS — Formatting helpers
// ═══════════════════════════════════════════════════════════════════════════

export function formatYear(y) {
  const abs = Math.abs(Math.round(y));
  const str = abs.toLocaleString('en-US');
  return y < 0 ? `${str} BC` : `${str} AD`;
}

export function fmtDeg(v, decimals = 4) {
  return v.toFixed(decimals) + '°';
}

export function fmtSci(v, decimals = 6) {
  return v.toFixed(decimals);
}

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
