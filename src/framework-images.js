/**
 * Framework images (plan 17) — the twelve explanatory figures of the website,
 * drawn from the model so a changed number changes the figure.
 *
 * Every figure is `render(ctx) → { svg, sources }`: a self-contained paper SVG
 * in the export standard of the other Tools panels (white page, a 16-px title
 * at y = 18, the credit bottom-right, short labels only) and the sources line
 * the panel shows beside it. `ctx` is the small reader object src/script.js
 * builds (createFrameworkImagesContext) — the model's published surfaces, so
 * this module needs neither THREE nor the scene and stays testable.
 *
 * A number on a figure is a model number with its unit and its epoch; a date
 * is a computed crossing; nothing is typed.
 */

// ── the paper kit ────────────────────────────────────────────────────────────
const FONT = 'Inter,Helvetica,Arial,sans-serif';
export const FI_COLORS = {
  ink: '#111111', soft: '#555555', faint: '#9ca3af', rule: '#d1d5db',
  earth: '#3b82c4', sun: '#f08a0b', body: '#9a9a9a',
  apsidal: '#15803d', axial: '#2563eb', accent: '#b91c1c', magenta: '#c026d3', cyan: '#0891b2',
};
export const FI_CREDIT = 'ESSRT · holisticuniverse.com';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Thousands-separated number with `dp` decimals. */
export function fiNum(v, dp = 0) {
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
/** A model year as a calendar label: 28,900 AD / 4,080 BC (astronomical year ≤ 0 → BC = 1 − y). */
export function fiYearLabel(y) {
  const r = Math.round(y);
  return r > 0 ? `${fiNum(r)} AD` : `${fiNum(1 - r)} BC`;
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "2000-06-21 01:48 UT" → { date: '21 June 2000', time: '01:48 UT' }. */
export function fiFriendlyUT(isoUT) {
  const [isoDate, hhmm] = isoUT.split(' ');
  const [y, m, d] = isoDate.split('-').map(Number);
  return { date: `${d} ${MONTH_NAMES[m - 1]} ${y}`, time: `${hhmm} UT`, day: d, month: MONTH_NAMES[m - 1], year: y, hhmm };
}
/** Degrees as 23°26′21″ (rounded to the arcsecond). */
export function fiDMS(deg) {
  const s = Math.round(Math.abs(deg) * 3600), d = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${deg < 0 ? '−' : ''}${d}°${String(m).padStart(2, '0')}′${String(ss).padStart(2, '0')}″`;
}
/** Round a year to a stated step for a "~" label (the figure's own precision). */
export function fiRoundTo(v, step) { return Math.round(v / step) * step; }

export function fiText(x, y, s, o = {}) {
  const a = [`x="${x.toFixed(1)}"`, `y="${y.toFixed(1)}"`, `font-family="${FONT}"`, `font-size="${o.size || 13}"`, `fill="${o.color || FI_COLORS.ink}"`];
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`);
  if (o.weight) a.push(`font-weight="${o.weight}"`);
  if (o.italic) a.push('font-style="italic"');
  if (o.spacing) a.push(`letter-spacing="${o.spacing}"`);
  if (o.rotate) a.push(`transform="rotate(${o.rotate} ${x.toFixed(1)} ${y.toFixed(1)})"`);
  if (o.halo) a.push('stroke="#ffffff" stroke-width="5" stroke-linejoin="round" paint-order="stroke"');   // a white halo: a line behind the label stays legible
  return `<text ${a.join(' ')}>${o.raw ? s : esc(s)}</text>`;
}
/** Italic variable + upright rest, e.g. fiVar('T', ' = 25,771 yr'). */
export function fiVar(x, y, v, rest, o = {}) {
  const t = `<tspan font-style="italic">${esc(v)}</tspan>${esc(rest)}`;
  return fiText(x, y, t, { ...o, raw: true });
}
export function fiLine(x1, y1, x2, y2, o = {}) {
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${o.color || FI_COLORS.ink}" stroke-width="${o.width || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
}
export function fiCircle(cx, cy, r, o = {}) {
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${o.fill || 'none'}" stroke="${o.stroke || FI_COLORS.ink}" stroke-width="${o.width ?? 1.2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
}
/** A polyline through [x, y] points. */
export function fiPath(pts, o = {}) {
  if (!pts.length) return '';
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return `<path d="${d}" fill="none" stroke="${o.color || FI_COLORS.ink}" stroke-width="${o.width || 2.5}" stroke-linejoin="round" stroke-linecap="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
}
/** A circular arc around (cx, cy) from a0 to a1 (degrees, screen: 0 = +x, CCW positive) with an arrowhead at a1. */
export function fiArcArrow(cx, cy, r, a0, a1, o = {}) {
  const rad = (a) => (a * Math.PI) / 180;
  const pt = (a) => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 3));
  const pts = []; for (let i = 0; i <= n; i++) pts.push(pt(a0 + ((a1 - a0) * i) / n));
  return fiPath(pts, { color: o.color, width: o.width || 1.6 }) + fiArrowHead(pts[pts.length - 2], pts[pts.length - 1], o);
}
/** Text set along a circular arc around (cx, cy), from a0 to a1 (degrees, screen: 0 = +x, CCW positive), centred on the arc;
 *  pass a0 > a1 (a clockwise path) on the upper half so the text reads upright. */
let _fiArcId = 0;
export function fiTextOnArc(cx, cy, r, a0, a1, s, o = {}) {
  const rad = (a) => (a * Math.PI) / 180;
  const pt = (a) => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];
  const p0 = pt(a0), p1 = pt(a1), id = `fi-arc-${++_fiArcId}`;
  const sweep = a1 < a0 ? 1 : 0, large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `<defs><path id="${id}" d="M${p0[0].toFixed(1)},${p0[1].toFixed(1)} A${r},${r} 0 ${large} ${sweep} ${p1[0].toFixed(1)},${p1[1].toFixed(1)}"/></defs>`
    + `<text font-family="${FONT}" font-size="${o.size || 13}" fill="${o.color || FI_COLORS.ink}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(s)}</textPath></text>`;
}
/** A filled arrowhead at `to`, pointing from `from`. */
export function fiArrowHead(from, to, o = {}) {
  const L = o.head || 10, W = (o.head || 10) * 0.45;
  const dx = to[0] - from[0], dy = to[1] - from[1], d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  const bx = to[0] - ux * L, by = to[1] - uy * L;
  const p = [[to[0], to[1]], [bx - uy * W, by + ux * W], [bx + uy * W, by - ux * W]];
  return `<path d="M${p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' L')} Z" fill="${o.color || FI_COLORS.ink}"/>`;
}
/** A body: a filled disc with a thin dark rim. */
export function fiBody(cx, cy, r, fill) {
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" stroke="#333" stroke-width="1"/>`;
}
/** The page: white, the shared export header (title + legend rows — ctx.paperHeader, the other Tools exports' one home), the credit bottom-right. */
export function fiPage(W, H, headerSvg, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`
    + `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`
    + headerSvg
    + body
    + `<text x="${W - 12}" y="${H - 7}" text-anchor="end" font-size="9" fill="#888" font-family="${FONT}">${FI_CREDIT}</text>`
    + '</svg>';
}
/** A values block in the Planet Orbit Analysis style: a rule, a bold header row, label left, values right-aligned in columns. */
export function fiTable(x0, y0, rows, colX, o = {}) {
  const ROW = o.row || 19, size = o.size || 11.5;
  let s = fiLine(x0, y0 - 4, colX[colX.length - 1], y0 - 4, { color: '#e5e7eb', width: 1 });
  rows.forEach((r, i) => {
    const y = y0 + ROW * (i + 1) - 4, bold = i === 0 && o.header !== false ? '600' : undefined;
    s += fiText(x0, y, r[0], { size, color: '#333', weight: bold });
    for (let c = 1; c < r.length; c++) s += fiText(colX[c - 1], y, r[c], { size, color: '#333', anchor: 'end', weight: bold });
  });
  return { svg: s, bottom: y0 + ROW * rows.length };
}

// ── 1 · 02_CenterAA — Earth's e-vector loop, Earth-centred ───────────────────
/**
 * The eccentricity vector z(t) = e(t)·e^{iϖ(t)} of Earth's orbit from the
 * epoch to the next eccentricity minimum, drawn in the J2000 ecliptic
 * (equinox to the right, longitude counter-clockwise) with Earth at the
 * origin: the same pair of evaluators the scene's eccentricity path renders
 * (the one-source e of date, the chain's J2000-frame ϖ). The loop's radius is
 * e itself — the e-vector is to scale; the bodies are not.
 */
function renderEccentricityLoop(ctx, { sunCentred = false } = {}) {
  const W = 1100;
  const C = FI_COLORS;
  const y0 = ctx.epochYear;
  const epochLabel = y0 === 2000 ? 'J2000' : fiYearLabel(y0);
  const tAps = ctx.apsidalPeriodYears(y0);
  const tP = ctx.axialPrecessionYears(y0);
  const min = ctx.nextEccentricityMinimum(y0);          // { year, e, pom }
  const max = ctx.nextEccentricityMaximum(y0);
  // the apsidal period of date at each marked point: it drifts along the loop (fast turn near e ≈ 0)
  const tApsAtMin = ctx.apsidalPeriodYears(min.year);
  const tApsAtMax = max ? ctx.apsidalPeriodYears(max.year) : null;
  // the full loop: one apsidal revolution from the epoch (the period of date at
  // the epoch — the drawn path is the model's own, so it need not close)
  const yEnd = y0 + tAps;
  const N = 720;
  const samples = [];
  for (let i = 0; i <= N; i++) {
    const y = y0 + (tAps * i) / N;
    samples.push({ y, e: ctx.eccentricity(y), pom: ctx.perihelionLongitudeJ2000Deg(y) });
  }
  const iMin = Math.max(1, Math.min(N, Math.round(((min.year - y0) / tAps) * N)));
  const e0 = samples[0].e, pom0 = samples[0].pom, eEnd = samples[N].e;

  // the header (the other exports' one home) and its legend
  const title = `Earth’s eccentricity vector over one apsidal revolution from ${epochLabel}${sunCentred ? ' (Sun-centred)' : ''}`;
  const legend = [
    { name: `${epochLabel} → the next e minimum`, color: C.ink, bold: true },
    { name: 'the rest of the revolution', color: C.faint },
    { name: 'next e maximum', color: C.accent, marker: 'diamond' },
    { name: `end of one revolution (${fiYearLabel(yEnd)})`, color: C.soft, marker: 'dot' },
    { name: 'ticks every 10,000 yr', color: C.soft, dash: '1.6,6' },
  ];
  const head = ctx.paperHeader(title, legend, W);

  // to scale in e: fit the loop and the centre body (the origin) into the plot box
  const ex = samples.map((s) => s.e * Math.cos((s.pom * Math.PI) / 180)).concat([0]);
  const ey = samples.map((s) => s.e * Math.sin((s.pom * Math.PI) / 180)).concat([0]);
  const xMin = Math.min(...ex), xMax = Math.max(...ex), yMin = Math.min(...ey), yMax = Math.max(...ey);
  const BOX = 600, plotTop = head.bottom + 104, plotMidY = plotTop + BOX / 2;
  const k = BOX / Math.max(xMax - xMin, yMax - yMin);
  const cx = W / 2 - k * (xMin + xMax) / 2, cy = plotMidY + k * (yMin + yMax) / 2;
  const toXY = (e, pomDeg) => [cx + k * e * Math.cos((pomDeg * Math.PI) / 180), cy - k * e * Math.sin((pomDeg * Math.PI) / 180)];
  const pts = samples.map((s) => toXY(s.e, s.pom));
  // "outward" for the labels is away from the loop's centroid (the origin sits near its rim)
  const gx = pts.reduce((a, p) => a + p[0], 0) / pts.length, gy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const outward = (p, d) => { const L = Math.hypot(p[0] - gx, p[1] - gy) || 1; return [p[0] + (d * (p[0] - gx)) / L, p[1] + (d * (p[1] - gy)) / L]; };
  const anchorOf = (p) => (Math.abs(p[0] - gx) < 60 ? 'middle' : p[0] < gx ? 'end' : 'start');

  let body = '';
  // the loop: the rest first (beneath), then the epoch → minimum stretch
  body += fiPath(pts.slice(iMin), { color: C.faint, width: 2.2 });
  body += fiPath(pts.slice(0, iMin + 1), { color: C.ink, width: 3.2 });
  // the year ticks along the loop, labelled every 20,000 yr — a label is skipped
  // where it would sit on a marker or on the epoch → minimum stretch
  const busy = [pts[0], toXY(min.e, min.pom), ...(max && max.year <= yEnd ? [toXY(max.e, max.pom)] : []), ...pts.slice(0, iMin + 1).filter((_, i) => i % 6 === 0)];
  const clear = (q) => busy.every((b) => Math.hypot(q[0] - b[0], q[1] - b[1]) > 70);
  for (let dy = 10000; dy < tAps; dy += 10000) {
    const f = (dy / tAps) * N, i = Math.min(N - 1, Math.floor(f)), t = f - i;
    const p = [pts[i][0] + t * (pts[i + 1][0] - pts[i][0]), pts[i][1] + t * (pts[i + 1][1] - pts[i][1])];
    const a = outward(p, 9), b = outward(p, -9);
    body += fiLine(b[0], b[1], a[0], a[1], { color: C.soft, width: 1.4 });
    if (dy % 20000 === 0 && clear(outward(p, 24))) {
      const q = outward(p, 24);
      body += fiText(q[0], q[1] + 4, `${fiYearLabel(y0 + dy)}`, { size: 11.5, color: C.soft, anchor: anchorOf(p) });
    }
  }
  // the epoch: the perihelion (grey marker) and its labels — every value of
  // the epoch in ONE block: e and the apsidal period are both of that instant
  const p0 = pts[0], l0 = outward(p0, 34);
  body += fiBody(p0[0], p0[1], 9, '#a8a8a8');
  body += fiText(l0[0], l0[1] - 36, `PERIHELION · ${epochLabel}`, { size: 17, spacing: 0.5, anchor: anchorOf(p0) });
  body += fiVar(l0[0], l0[1] - 14, 'e', ` = ${e0.toFixed(4)}`, { size: 16, anchor: anchorOf(p0), italic: true });
  body += fiVar(l0[0], l0[1] + 8, 'T', ` = ~${fiNum(tAps)} yr (CCW)`, { size: 16, anchor: anchorOf(p0), color: C.apsidal });
  // the apsidal motion: an arrow beside the first stretch of the loop (prograde, CCW) — the direction cue only
  const i0 = Math.round(N * 0.03), i1 = Math.round(N * 0.12);
  const arrow = []; for (let i = i0; i <= i1; i += 2) arrow.push(outward(pts[i], 52));
  body += fiPath(arrow, { color: C.apsidal, width: 2 }) + fiArrowHead(arrow[arrow.length - 2], arrow[arrow.length - 1], { color: C.apsidal, head: 12 });
  const lab = outward(pts[Math.round((i0 + i1) / 2)], 70), labAnchor = anchorOf(lab);
  body += fiText(lab[0], lab[1], 'apsidal precession', { size: 15, color: C.apsidal, anchor: labAnchor });
  body += fiText(lab[0], lab[1] + 19, '(the perihelion’s slow turn)', { size: 13, color: C.soft, anchor: labAnchor });
  // the eccentricity minimum
  const pMin = toXY(min.e, min.pom);
  body += fiBody(pMin[0], pMin[1], 5, C.ink);
  body += fiVar(pMin[0] + 14, pMin[1] + 30, 'e', ` = ${min.e.toFixed(5)} (~${fiYearLabel(fiRoundTo(min.year, 100))})`, { size: 16, italic: true });
  body += fiVar(pMin[0] + 14, pMin[1] + 52, 'T', ` = ~${fiNum(tApsAtMin)} yr (CCW)`, { size: 16, color: C.apsidal });
  // the next eccentricity maximum (a diamond, in the accent)
  if (max && max.year <= yEnd) {
    const pMax = toXY(max.e, max.pom), lm0 = outward(pMax, -34), lm = [lm0[0] + 18, lm0[1]];   // inside the loop (the rim carries the tick labels), clear of the closing hook
    body += `<rect x="${(pMax[0] - 6).toFixed(1)}" y="${(pMax[1] - 6).toFixed(1)}" width="12" height="12" transform="rotate(45 ${pMax[0].toFixed(1)} ${pMax[1].toFixed(1)})" fill="${C.accent}" stroke="#fff" stroke-width="1.2"/>`;
    body += fiVar(lm[0], lm[1] + 5, 'e', ` = ${max.e.toFixed(4)} (~${fiYearLabel(fiRoundTo(max.year, 100))})`, { size: 15, anchor: anchorOf(pMax), color: C.accent });
    body += fiVar(lm[0], lm[1] + 26, 'T', ` = ~${fiNum(tApsAtMax)} yr (CCW)`, { size: 15, anchor: anchorOf(pMax), color: C.apsidal });
  }
  // the end of the revolution (a grey dot, as its legend swatch — the path does not close on itself)
  const pEnd = pts[N];
  body += fiCircle(pEnd[0], pEnd[1], 5, { stroke: '#ffffff', width: 1.2, fill: C.soft });
  // the frame: the J2000 March equinox (longitude 0°) to the right of the centre body
  const eqFrom = cx + (sunCentred ? 24 : 42), eqTo = eqFrom + 120;
  body += fiLine(eqFrom, cy, eqTo, cy, { color: C.faint, width: 1.4, dash: '5,4' }) + fiArrowHead([eqTo - 10, cy], [eqTo + 2, cy], { color: C.faint, head: 9 });
  body += fiText(eqFrom, cy - 8, 'March equinox (J2000) · 0°', { size: 12, color: C.soft });

  // the centre body
  if (sunCentred) {
    body += fiBody(cx, cy, 16, C.sun);
    body += fiText(cx, cy - 30, 'Sun', { size: 17, anchor: 'middle' });
  } else {
    // Earth with the axial precession circle (the wobble centre circling it, CW)
    // (the wobble centre's circle is a display glyph: its radius carries no physics)
    const rw = 34;
    body += fiCircle(cx, cy, rw, { stroke: C.ink, width: 1.2, dash: '4,4' });
    body += fiBody(cx, cy, 13, C.earth);
    body += fiText(cx, cy + rw + 22, 'Earth', { size: 17, anchor: 'middle' });
    body += fiBody(cx, cy - rw, 6, '#a8a8a8');
    body += fiArcArrow(cx, cy, rw + 24, 125, 55, { color: C.ink, width: 1.6, head: 10 });
    body += fiText(cx, cy - rw - 44, 'WOBBLE CENTER', { size: 17, anchor: 'middle', spacing: 0.5 });
    body += fiVar(cx, cy - rw - 70, 'T', ` = ~${fiNum(tP)} yr (CW) · ${epochLabel}`, { size: 16, anchor: 'middle' });
    body += fiText(cx, cy - rw - 90, 'axial precession', { size: 13, color: C.soft, anchor: 'middle' });
  }
  body += fiText(W - 40, plotTop + BOX + 70, 'e-vector to scale · bodies not to scale', { size: 12, color: C.soft, anchor: 'end' });

  // the values block
  const tPeri = 1 / (1 / tP + 1 / tAps);
  // the values block: the epoch's values only (the marked points carry their own on the drawing)
  const rows = [
    [`${epochLabel} values`, ''],
    ['eccentricity e', e0.toFixed(6)],
    ['longitude of perihelion ϖ (J2000 ecliptic)', `${pom0.toFixed(2)}°`],
    ['apsidal precession period (CCW)', `${fiNum(tAps)} yr`],
    ...(sunCentred ? [] : [['axial precession period (CW)', `${fiNum(tP)} yr`]]),
    ['perihelion precession vs the equinox', `${fiNum(tPeri)} yr`],
  ];
  const tx = W / 2 - 230, ty = plotTop + BOX + 100;
  const table = fiTable(tx, ty, rows, [W / 2 + 230]);
  body += table.svg;
  const H = table.bottom + 40;

  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { e0, pom0, eMin: min.e, eMinYear: min.year, eMax: max ? max.e : null, eMaxYear: max ? max.year : null, eEnd, endYear: yEnd, apsidalYears: tAps, apsidalYearsAtMin: tApsAtMin, apsidalYearsAtMax: tApsAtMax,axialYears: tP, perihelionVsEquinoxYears: tPeri },
    sources: 'e(t): the one-source N-body series · ϖ(t): the chain, J2000 ecliptic · T: the lunisolar surface (apsidal) and the axial precession of date · 1/T_peri = 1/T_p + 1/T_aps',
  };
}

// ── 11 · 09_Perihelion_21062000 — the perihelia at the June solstice ────────
/**
 * The longitudes of perihelion of the Sun (geocentric: Earth's ϖ + 180°) and
 * the seven planets at the model's June-solstice instant of the epoch year,
 * all in ONE frame — the J2000 ecliptic and equinox, the chain's frame (the
 * package's planet ϖ surface). Longitude counter-clockwise from the March
 * equinox at the right.
 */
function renderPerihelia(ctx) {
  const W = 1100, C = FI_COLORS;
  const year = Math.round(ctx.epochYear);
  const jd = ctx.cardinalJD(year, 'SS');
  const wrap = (a) => ((a % 360) + 360) % 360;
  const bodies = [
    { name: 'Sun', lon: wrap(ctx.perihelionLongitudeJ2000AtJD('earth', jd) + 180), color: C.sun, sun: true },
    ...ctx.planetKeys.map((k) => ({ name: k[0].toUpperCase() + k.slice(1), key: k, lon: wrap(ctx.perihelionLongitudeJ2000AtJD(k, jd)), color: C.ink })),
  ];
  // how far each planet's ϖ moves around the instant: the half-range over ±10 yr (quarter-year steps),
  // measured on the same reader — a near-circular orbit (Uranus, Neptune) swings by degrees within years
  const SPREAD_YEARS = 10, SPREAD_NOTE_DEG = 0.5;
  for (const b of bodies) {
    if (!b.key) continue;
    let lo = 0, hi = 0;
    for (let dy = -SPREAD_YEARS; dy <= SPREAD_YEARS; dy += 0.25) {
      const d = ((ctx.perihelionLongitudeJ2000AtJD(b.key, jd + dy * 365.25) - b.lon + 540) % 360) - 180;
      if (d < lo) lo = d; if (d > hi) hi = d;
    }
    b.spreadDeg = (hi - lo) / 2;
  }
  const title = `Longitudes of perihelion at the June solstice, ${ctx.formatUT(jd)}`;
  const legend = [
    { name: 'longitude of perihelion ϖ (J2000 ecliptic, from the March equinox)', color: C.ink, marker: 'dot' },
    { name: 'the Sun’s line of apsides (perihelion – aphelion)', color: C.apsidal, bold: true },
    { name: 'equinox and solstice directions', color: C.faint, dash: '6,4' },
    { name: `± (grey): how far ϖ moves within ±${SPREAD_YEARS} yr of this instant`, color: C.soft, marker: 'dots' },
  ];
  const head = ctx.paperHeader(title, legend, W);
  const R = 330, cx = W / 2, cy = head.bottom + 120 + R;
  const at = (lon, r) => [cx + r * Math.cos((lon * Math.PI) / 180), cy - r * Math.sin((lon * Math.PI) / 180)];
  let body = '';
  // the four cardinal directions (light, dashed, through the rim) and their names
  // outside the circle at their own direction — beyond the body labels
  // (each axis runs out to its name; the body labels it passes carry a white halo)
  const cards = [
    [0, 'March equinox · 0°', [R + 22, 0], 'start', R + 14],
    [90, 'June solstice · 90°', [0, -(R + 80)], 'middle', R + 66],
    [180, 'September equinox · 180°', [-(R + 22), 0], 'end', R + 14],
    [270, 'December solstice · 270°', [0, R + 130], 'middle', R + 114],
  ];
  for (const [lon, name, [dx, dy], anchor, reach] of cards) {
    const e = at(lon, reach);
    body += fiLine(cx, cy, e[0], e[1], { color: C.faint, width: 1.2, dash: '6,4' });
    body += fiText(cx + dx, cy + dy + 4, name, { size: 13, color: C.soft, anchor });
  }
  body += fiCircle(cx, cy, R, { stroke: C.ink, width: 2.2 });
  // the Sun's line of apsides through the centre; the aphelion end marked and its longitude
  const sun = bodies[0];
  // the apsidal line's turn toward increasing longitude (counter-clockwise): a green arc
  // leaving the line at the aphelion end, its name set along the arc
  const aph0 = sun.lon + 180;
  body += fiArcArrow(cx, cy, R - 28, aph0 + 2, aph0 + 52, { color: C.apsidal, width: 1.8, head: 10 });
  body += fiTextOnArc(cx, cy, R - 44, aph0 + 54, aph0 + 2, 'longitude increases (anticlockwise)', { size: 12.5, color: C.apsidal });
  const sp = at(sun.lon, R), sa = at(sun.lon + 180, R);
  body += fiLine(sa[0], sa[1], sp[0], sp[1], { color: C.apsidal, width: 2.6 });
  body += fiCircle(sa[0], sa[1], 6, { stroke: C.apsidal, width: 2, fill: '#ffffff' });
  const aphLon = (sun.lon + 180) % 360;
  const la2 = at(aphLon, R + 34), aAnchor = la2[0] < cx - 20 ? 'end' : la2[0] > cx + 20 ? 'start' : 'middle';
  body += fiText(la2[0], la2[1] - 14, 'Sun aphelion', { size: 14, weight: '600', color: C.apsidal, anchor: aAnchor });
  body += fiText(la2[0], la2[1] + 4, `${aphLon.toFixed(3)}°`, { size: 13.5, anchor: aAnchor });
  // the apsidal motion at the Sun's perihelion: a short green arrow along the rim (prograde) and T beneath its label —
  // against the equinox and the solstices drawn here (the seasons) the period is T_peri = 1/(1/T_p + 1/T_aps);
  // T_aps is the same motion against the stars
  const tAps = ctx.apsidalPeriodYears(ctx.epochYear);
  const tPeri = 1 / (1 / ctx.axialPrecessionYears(ctx.epochYear) + 1 / tAps);
  const epochLabel = ctx.epochYear === 2000 ? 'J2000' : fiYearLabel(ctx.epochYear);
  body += fiArcArrow(cx, cy, R - 14, sun.lon + 2.5, sun.lon + 16, { color: C.apsidal, width: 2, head: 10 });
  // Earth at the centre (the geocentric view)
  body += fiBody(cx, cy, 9, C.earth);
  body += fiText(cx + 14, cy + 22, 'Earth', { size: 13, color: C.soft });
  // each body: a dot on the rim, a short radial tick, the name and ϖ outside
  for (const b of bodies) {
    const p = at(b.lon, R), t = at(b.lon, R + 12), l = at(b.lon, R + 34);
    const c = Math.cos((b.lon * Math.PI) / 180);
    const anchor = c > 0.25 ? 'start' : c < -0.25 ? 'end' : 'middle';
    const s = Math.sin((b.lon * Math.PI) / 180);
    const dy = s > 0.6 ? -14 : s < -0.6 ? 10 : -6;
    body += fiLine(p[0], p[1], t[0], t[1], { color: b.color, width: 1.6 });
    body += b.sun ? fiBody(p[0], p[1], 9, C.sun) : fiBody(p[0], p[1], 6, '#6b7280');
    body += fiText(l[0], l[1] + dy, b.sun ? 'Sun perihelion' : b.name, { size: 14, weight: '600', anchor, color: b.sun ? C.apsidal : C.ink, halo: true });
    const spread = b.spreadDeg > SPREAD_NOTE_DEG ? `<tspan fill="${C.soft}" font-size="12"> ±${b.spreadDeg.toFixed(1)}°</tspan>` : '';
    body += fiText(l[0], l[1] + dy + 18, `${b.lon.toFixed(3)}°${spread}`, { size: 13.5, anchor, color: C.ink, halo: true, raw: true });
    if (b.sun) {
      body += fiVar(l[0], l[1] + dy + 38, 'T', ` = ~${fiNum(tPeri)} yr (CCW) · ${epochLabel} · through the seasons`, { size: 13.5, anchor, color: C.apsidal, halo: true });
      body += fiText(l[0], l[1] + dy + 56, `(~${fiNum(tAps)} yr against the stars)`, { size: 12, anchor, color: C.soft, halo: true });
    }
  }
  const H = cy + R + 158;
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { jd, perihelionLongitudesDeg: Object.fromEntries(bodies.map((b) => [b.name, b.lon])), spreadDeg: Object.fromEntries(bodies.filter((b) => b.key).map((b) => [b.name, b.spreadDeg])), sunAphelionDeg: (bodies[0].lon + 180) % 360, apsidalYears: ctx.apsidalPeriodYears(ctx.epochYear), perihelionVsEquinoxYears: 1 / (1 / ctx.axialPrecessionYears(ctx.epochYear) + 1 / ctx.apsidalPeriodYears(ctx.epochYear)) },
    sources: 'the June-solstice instant: the model’s cardinal finder · ϖ: the planet chain, J2000 ecliptic (the Sun’s = Earth’s + 180°)',
  };
}

// ── 8 · 04_Earth_Orbit_Year — days and years at the June solstice ───────────
/**
 * The three days and the two years of date at the model's June-solstice
 * instant, coloured by what each is measured AGAINST — the equinox (blue),
 * the stars (magenta), the Sun (orange): the sidereal DAY is equinox-
 * referenced while the sidereal YEAR is star-referenced, and the solar
 * (tropical) year returns to the equinox. Schematic: the angles are
 * exaggerated; every number is the package's published length family.
 */
function renderDaysAndYears(ctx) {
  const W = 1100, C = FI_COLORS;
  const EQX = C.axial, STAR = C.magenta, SUN = C.sun;
  const year = Math.round(ctx.epochYear);
  const jd = ctx.cardinalJD(year, 'SS');
  const yTT = ctx.engineYearOfJD(jd);
  const L = ctx.dayAndYearLengths(yTT);
  const tP = ctx.axialPrecessionYears(yTT);
  const stellarMinusSiderealMs = (L.stellarDaySeconds - L.siderealDaySeconds) * 1000;
  const solarMinusSiderealS = L.solarDaySeconds - L.siderealDaySeconds;
  const yearDiffS = L.siderealYearSeconds - L.tropicalYearSeconds;
  const ratio = L.siderealYearSeconds / yearDiffS;
  // ONE day on the whole figure (owner, option A): the years are counted in the solar day of date the
  // day panel shows — so seconds ÷ solar day = days, and days + 1 = the turns, all checkable by hand
  const tropicalYearSolarDays = L.tropicalYearSeconds / L.solarDaySeconds;
  const siderealYearSolarDays = L.siderealYearSeconds / L.solarDaySeconds;
  // Earth's turns against the equinox in one solar year: the solar year over the sidereal day (≡ the solar days + 1)
  const turnsPerSolarYear = L.tropicalYearSeconds / L.siderealDaySeconds;

  // the friendly date of the instant, with the solstice and its time beside it
  const when = fiFriendlyUT(ctx.formatUT(jd));
  const title = `Days and years on ${when.date} (the June solstice, ${when.time})`;
  const legend = [
    { name: 'measured against the equinox', color: EQX, bold: true },
    { name: 'measured against the stars', color: STAR, bold: true },
    { name: 'measured against the Sun', color: SUN, bold: true },
  ];
  const head = ctx.paperHeader(title, legend, W);
  let body = '';
  const rad = (a) => (a * Math.PI) / 180;
  const ray = (x, y, a, r0, r1, color, o = {}) => fiLine(x + r0 * Math.cos(rad(a)), y - r0 * Math.sin(rad(a)), x + r1 * Math.cos(rad(a)), y - r1 * Math.sin(rad(a)), { color, width: o.width || 2, dash: o.dash });
  // a values row: the label (coloured by its reference) left, the value right-aligned, the unit after it
  const VX0 = 640, VX1 = 990;
  const row = (y, label, value, unit, color, o = {}) =>
    fiText(VX0, y, label, { size: o.size || 14, color: color || C.ink, weight: o.weight })
    + fiText(VX1, y, value, { size: o.size || 14, color: C.ink, anchor: 'end', weight: o.weight })
    + (unit ? fiText(VX1 + 8, y, unit, { size: 13, color: C.soft }) : '');
  const heading = (y, s) => fiText(60, y, s, { size: 15, weight: '600' }) + fiLine(60, y + 10, W - 60, y + 10, { color: '#e5e7eb', width: 1 });

  // ── the day ───────────────────────────────────────────────────────────────
  const d0 = head.bottom + 40;
  body += heading(d0, 'The day — one turn of Earth, seen from above the North Pole');
  const ex = 260, ey = d0 + 170, er = 62;
  // the three reference directions after one turn (all aligned at the start): the equinox
  // has crept westward (met first), the star stays, the Sun has moved on eastward (met last)
  const dirs = [[-9, EQX, 'equinox', 'sidereal day'], [0, STAR, 'a distant star', 'stellar day'], [22, SUN, 'the Sun', 'solar day']];
  for (const [a, color, name, day] of dirs) {
    body += ray(ex, ey, a, er + 6, 200, color, { width: 2.2 });
    const tx = ex + 208 * Math.cos(rad(a)), ty = ey - 208 * Math.sin(rad(a));
    body += fiText(tx + 6, ty - 3, `→ ${name}`, { size: 12.5, color });
    body += fiText(tx + 6, ty + 13, day, { size: 12, color: C.soft });
  }
  body += fiBody(ex, ey, er, C.earth);
  body += fiLine(ex, ey, ex + er, ey, { color: '#ffffff', width: 2 });    // the meridian at the start
  body += fiArcArrow(ex, ey, er + 26, 150, 250, { color: C.ink, width: 1.6, head: 10 });
  body += fiText(ex - er - 40, ey - er - 6, 'Earth turns', { size: 12.5, color: C.soft, anchor: 'end' });
  body += fiText(ex - er - 40, ey - er + 10, 'anticlockwise', { size: 12.5, color: C.soft, anchor: 'end' });
  let vy = d0 + 66;
  body += row(vy, 'sidereal day', fiNum(L.siderealDaySeconds, 6), 's', EQX, { weight: '600' }); vy += 26;
  body += row(vy, 'stellar day', fiNum(L.stellarDaySeconds, 6), 's', STAR, { weight: '600' }); vy += 26;
  body += row(vy, 'solar day', fiNum(L.solarDaySeconds, 6), 's', SUN, { weight: '600' }); vy += 36;
  body += row(vy, 'stellar − sidereal (the equinox’s daily creep)', fiNum(stellarMinusSiderealMs, 3), 'ms', C.soft, { size: 13 }); vy += 22;
  body += row(vy, 'solar − sidereal (one day of orbit)', fiNum(solarMinusSiderealS, 3), 's', C.soft, { size: 13 }); vy += 30;
  body += row(vy, 'turns per solar year (against the equinox)', fiNum(turnsPerSolarYear, 5), '', EQX, { size: 13 }); vy += 18;
  body += fiText(VX0, vy, '= the solar days in the year + 1: the orbit adds one turn', { size: 12, color: C.soft }); vy += 14;
  body += fiText(VX0, vy + 8, 'SI seconds · the lengths of date · a “day” below is this solar day', { size: 12, color: C.faint });

  // ── the year ──────────────────────────────────────────────────────────────
  const y0 = d0 + 300;
  body += heading(y0, 'The year — one orbit of Earth around the Sun');
  const sx = 260, sy = y0 + 210, orb = 150;
  body += fiCircle(sx, sy, orb, { stroke: C.faint, width: 1.6, dash: '5,5' });
  body += fiArcArrow(sx, sy, orb + 22, 40, 110, { color: C.ink, width: 1.6, head: 10 });
  body += fiText(sx + (orb + 30) * Math.cos(rad(75)), sy - (orb + 30) * Math.sin(rad(75)) - 6, 'Earth orbits anticlockwise', { size: 12.5, color: C.soft, anchor: 'middle' });
  // the radius: one AU
  body += fiLine(sx, sy, sx + orb * Math.cos(rad(235)), sy - orb * Math.sin(rad(235)), { color: C.soft, width: 1.2 });
  const am = [sx + 0.62 * orb * Math.cos(rad(235)), sy - 0.62 * orb * Math.sin(rad(235))];
  body += fiText(am[0] + 12, am[1] - 4, '1 AU', { size: 12.5, color: C.soft });
  body += fiText(am[0] + 12, am[1] + 12, `${fiNum(ctx.auKm, 1)} km`, { size: 12, color: C.soft });
  body += fiBody(sx, sy, 18, SUN);
  body += fiText(sx, sy + 36, 'Sun', { size: 13, color: C.soft, anchor: 'middle' });
  // the star direction (fixed) and the two completions: against the star (sidereal year) at 0°,
  // against the equinox (solar year) earlier — the equinox has moved westward (clockwise)
  const SHIFT = -16;   // degrees, exaggerated
  body += ray(sx, sy, 0, 22, 300, STAR, { width: 1.6, dash: '7,5' });
  body += `<text x="${(sx + 312).toFixed(1)}" y="${(sy + 7).toFixed(1)}" font-family="${FONT}" font-size="20" fill="${STAR}">★</text>`;
  body += fiText(sx + 320, sy + 30, 'a distant star', { size: 12, color: STAR, anchor: 'middle' });
  body += ray(sx, sy, SHIFT, 22, orb + 60, EQX, { width: 1.6, dash: '7,5' });
  const pStar = [sx + orb, sy], pEqx = [sx + orb * Math.cos(rad(SHIFT)), sy - orb * Math.sin(rad(SHIFT))];
  body += fiCircle(pEqx[0], pEqx[1], 9, { fill: C.earth, stroke: EQX, width: 2.4 });
  body += fiCircle(pStar[0], pStar[1], 9, { fill: C.earth, stroke: STAR, width: 2.4 });
  // the step between the two completions: the extra time to the star
  body += fiArcArrow(sx, sy, orb + 14, SHIFT + 3, -3, { color: C.ink, width: 1.4, head: 8 });
  const ls = [sx + (orb + 24) * Math.cos(rad(SHIFT / 2)), sy - (orb + 24) * Math.sin(rad(SHIFT / 2))];
  body += fiText(ls[0], ls[1] + 5, `+${fiNum(yearDiffS, 2)} s`, { size: 12, color: C.ink });
  const lq = [sx + (orb + 64) * Math.cos(rad(SHIFT)), sy - (orb + 64) * Math.sin(rad(SHIFT))];
  body += fiText(lq[0] + 4, lq[1] + 10, 'after one solar year', { size: 12.5, color: EQX });
  body += fiText(lq[0] + 4, lq[1] + 26, '(back at the equinox)', { size: 12, color: C.soft });
  body += fiText(pStar[0] - 6, pStar[1] - 40, 'after one sidereal year', { size: 12.5, color: STAR });
  body += fiText(pStar[0] - 6, pStar[1] - 24, '(back at the star)', { size: 12, color: C.soft });
  vy = y0 + 66;
  body += row(vy, 'solar (tropical) year', fiNum(tropicalYearSolarDays, 5), 'days', EQX, { weight: '600' }); vy += 22;
  body += row(vy, '', fiNum(L.tropicalYearSeconds, 2), 's', EQX); vy += 30;
  body += row(vy, 'sidereal year', fiNum(siderealYearSolarDays, 5), 'days', STAR, { weight: '600' }); vy += 22;
  body += row(vy, '', fiNum(L.siderealYearSeconds, 2), 's', STAR); vy += 36;
  body += row(vy, 'sidereal − solar year', fiNum(yearDiffS, 2), 's', C.ink, { weight: '600' }); vy += 30;
  body += row(vy, 'sidereal year : the difference', '', '', C.soft, { size: 13 }); vy += 20;
  body += row(vy, '', `${fiNum(L.siderealYearSeconds, 2)} s : ${fiNum(yearDiffS, 2)} s`, '', C.soft, { size: 13 }); vy += 20;
  body += row(vy, '', `= ~${fiNum(ratio, 0)} : 1`, '', C.soft, { size: 13 }); vy += 26;
  body += row(vy, 'axial precession period T', `~${fiNum(tP, 0)}`, 'Julian yr', C.soft, { size: 13 }); vy += 22;
  body += fiText(VX0, vy + 8, 'the equinox turns once per T: the solar year falls short by one T-th of a turn', { size: 12, color: C.faint });

  const H = y0 + 470;
  body += fiText(W - 40, H - 30, 'schematic · angles exaggerated · not to scale', { size: 12, color: C.soft, anchor: 'end' });
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { jd, yearTT: yTT, ...L, tropicalYearSolarDays, siderealYearSolarDays, stellarMinusSiderealMs, solarMinusSiderealS, yearDiffS, ratio, turnsPerSolarYear, axialYears: tP, auKm: ctx.auKm },
    sources: 'the June-solstice instant: the model’s cardinal finder · the day and year lengths of date: the published length family (createModel().lengths, epoch.*SecondsAtYear) · T: the axial precession of date · AU: IAU 2012',
  };
}

// ── 3 · 02_Earth_Sun_orbit — the Sun's path seen from Earth ─────────────────
/**
 * The Sun's apparent path around Earth over the epoch year, TO SCALE: the
 * ellipse of the ONE certified Sun's mean elements of date (the eclipse Sun)
 * with Earth at a focus — the Sun at the model's four cardinal instants and
 * at perihelion and aphelion (where the mean anomaly crosses 0° and 180° —
 * the two-body ellipse's distance extremes), the distances a(1 ∓ e) on the
 * AU, and the season lengths between the cardinal instants. Longitude
 * counter-clockwise from the March equinox at the right (as figure 11).
 */
function renderSunPath(ctx) {
  const W = 1100, C = FI_COLORS;
  const year = Math.round(ctx.epochYear);
  const wrap = (a) => ((a % 360) + 360) % 360;
  const wrap180 = (a) => ((a + 540) % 360) - 180;
  const rad = (a) => (a * Math.PI) / 180;
  const els = (jd) => ctx.sunMeanElements(ctx.engineYearOfJD(jd));
  // the cardinal instants of the year and the next March equinox (the fourth season's end)
  const cps = ['VE', 'SS', 'AE', 'WS'];
  const cardJD = Object.fromEntries(cps.map((cp) => [cp, ctx.cardinalJD(year, cp)]));
  const nextVE = ctx.cardinalJD(year + 1, 'VE');
  // the apsides: Newton on the mean anomaly M = L − perigee (the rate ≈ 360°/anomalistic year)
  const apsis = (targetDeg, seedJD) => {
    let jd = seedJD;
    for (let i = 0; i < 6; i++) { const s = els(jd); jd -= wrap180(s.meanLongitudeDeg - s.perigeeLongitudeDeg - targetDeg) / 0.9856; }
    return jd;
  };
  const periJD = apsis(0, cardJD.VE - 76), aphJD = apsis(180, cardJD.VE + 106);
  const sP = els(periJD), sA = els(aphJD);
  const au = ctx.auKm;
  const rPeriKm = au * (1 - sP.eccentricity), rAphKm = au * (1 + sA.eccentricity);
  const s0 = els(cardJD.SS);                 // the drawn ellipse: the elements at mid-year
  const e = s0.eccentricity, perigee = wrap(s0.perigeeLongitudeDeg);
  // the Sun's angular speed at the apsides (Kepler II on the mean orbit): n·(1 ± e)²/(1 − e²)^{3/2},
  // n the mean motion over the anomalistic year — why the season around aphelion lasts longest
  const nDegPerDay = 360 / (ctx.anomalisticYearSeconds(ctx.engineYearOfJD(cardJD.SS)) / 86400);
  const k32 = Math.pow(1 - e * e, 1.5);
  const speedPeriDegPerDay = (nDegPerDay * (1 + e) ** 2) / k32, speedAphDegPerDay = (nDegPerDay * (1 - e) ** 2) / k32;
  // how far the perihelion stands past the December solstice
  const periPastSolsticeDeg = wrap(perigee - 270);
  const seasons = [
    ['northern spring', cardJD.SS - cardJD.VE, 45], ['northern summer', cardJD.AE - cardJD.SS, 135],
    ['northern autumn', cardJD.WS - cardJD.AE, 225], ['northern winter', nextVE - cardJD.WS, 315],
  ];

  const title = `The Sun’s path seen from Earth, ${year} — to scale`;
  const legend = [
    { name: 'the Sun’s apparent path (an ellipse, Earth at a focus)', color: C.ink },
    { name: 'line of apsides (perihelion – aphelion)', color: C.apsidal, bold: true },
    { name: 'equinox and solstice directions', color: C.faint, dash: '6,4' },
  ];
  const head = ctx.paperHeader(title, legend, W);
  const R = 320, cx = W / 2, cy = head.bottom + 130 + R;    // R ≙ 1 AU (the semi-major axis a)
  const rAt = (lon) => (R * (1 - e * e)) / (1 + e * Math.cos(rad(lon - perigee)));
  const at = (lon, r) => [cx + r * Math.cos(rad(lon)), cy - r * Math.sin(rad(lon))];
  let body = '';
  // the four directions from Earth
  for (const lon of [0, 90, 180, 270]) { const p = at(lon, R + 18); body += fiLine(cx, cy, p[0], p[1], { color: C.faint, width: 1.2, dash: '6,4' }); }
  // the path
  const pts = []; for (let i = 0; i <= 360; i++) pts.push(at(i, rAt(i)));
  body += fiPath(pts, { color: C.ink, width: 2.2 });
  // the line of apsides, and the path's centre (a·e from Earth toward aphelion)
  const pP = at(perigee, rAt(perigee)), pA = at(perigee + 180, rAt(perigee + 180));
  body += fiLine(pA[0], pA[1], pP[0], pP[1], { color: C.apsidal, width: 2 });
  // the path's centre lies a·e from Earth toward aphelion (5 px at this scale — named, not marked; the a-line starts there)
  const ctr = at(perigee + 180, R * e);
  body += fiText(cx - 14, cy - 26, 'centre of the path:', { size: 12, color: C.soft, anchor: 'end', halo: true });
  body += fiText(cx - 14, cy - 10, `${fiNum(au * e, 0)} km from Earth, toward aphelion`, { size: 12, color: C.soft, anchor: 'end', halo: true });
  // the perihelion's angle past the December solstice — the step the perihelion advances through the seasons
  body += fiArcArrow(cx, cy, R * 0.78, 270, perigee, { color: C.apsidal, width: 1.8, head: 8 });
  const lp = at(270 + periPastSolsticeDeg / 2, R * 0.78 - 18);
  body += fiText(lp[0], lp[1] + 4, `${periPastSolsticeDeg.toFixed(2)}°`, { size: 13, color: C.apsidal, anchor: 'middle', halo: true, weight: '600' });
  // the Sun's apparent motion (counter-clockwise), named along the arc
  body += fiArcArrow(cx, cy, R - 26, 18, 66, { color: C.soft, width: 1.4, head: 9 });
  body += fiTextOnArc(cx, cy, R - 42, 68, 16, 'the Sun’s apparent motion', { size: 12, color: C.soft });
  // the season lengths in their quadrants
  for (const [name, days, mid] of seasons) {
    const q = at(mid, R * 0.5);
    body += fiText(q[0], q[1] - 4, name, { size: 13, color: C.soft, anchor: 'middle' });
    body += fiText(q[0], q[1] + 14, `${fiNum(days, 2)} days`, { size: 13.5, anchor: 'middle', weight: '600' });
  }
  // Earth at the focus
  body += fiBody(cx, cy, 11, C.earth);
  body += fiText(cx + 14, cy + 24, 'Earth', { size: 13, color: C.soft });
  // the semi-major axis: one AU
  const A_DIR = 200, aEnd = [ctr[0] + R * Math.cos(rad(A_DIR)), ctr[1] - R * Math.sin(rad(A_DIR))];
  body += fiLine(ctr[0], ctr[1], aEnd[0], aEnd[1], { color: C.soft, width: 1, dash: '2,3' });
  const aMid = [ctr[0] + 0.72 * R * Math.cos(rad(A_DIR)), ctr[1] - 0.72 * R * Math.sin(rad(A_DIR))];
  body += fiText(aMid[0], aMid[1] + 22, `a = 1 AU = ${fiNum(au, 1)} km`, { size: 12, color: C.soft, anchor: 'middle', halo: true });

  // the Sun at the six instants: the four cardinals (λ = 0/90/180/270 by definition) and the apsides
  const suns = [
    { lon: 0, name: 'March equinox', jd: cardJD.VE }, { lon: 90, name: 'June solstice', jd: cardJD.SS },
    { lon: 180, name: 'September equinox', jd: cardJD.AE }, { lon: 270, name: 'December solstice', jd: cardJD.WS },
    { lon: perigee, name: 'perihelion (mean orbit)', jd: periJD, km: rPeriKm, apsis: true, speed: `fastest: ${speedPeriDegPerDay.toFixed(3)}° per day` },
    { lon: wrap(perigee + 180), name: 'aphelion (mean orbit)', jd: aphJD, km: rAphKm, apsis: true, speed: `slowest: ${speedAphDegPerDay.toFixed(3)}° per day` },
  ];
  for (const s of suns) {
    const p = at(s.lon, rAt(s.lon));
    // one Sun size for all six (size carries no meaning); the apsides carry a green ring
    if (s.apsis) body += fiCircle(p[0], p[1], 17, { stroke: C.apsidal, width: 2.4 });
    body += fiBody(p[0], p[1], 13, C.sun);
    const f = fiFriendlyUT(ctx.formatUT(s.jd));
    // the label outside the path; the apsis labels sit on the far side of their neighbouring solstice
    const c = Math.cos(rad(s.lon)), sn = Math.sin(rad(s.lon));
    let anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
    if (s.apsis) anchor = c >= 0 ? 'start' : 'end';
    if (!s.apsis && (s.lon === 90 || s.lon === 270)) anchor = Math.cos(rad(s.lon === 90 ? perigee + 180 : perigee)) < 0 ? 'start' : 'end';
    // the equinox labels stand above their Sun (centred): beside it they would leave the page
    const equinox = s.lon === 0 || s.lon === 180;
    if (equinox) anchor = 'middle';
    const l = equinox ? [p[0], p[1] - 30] : at(s.lon, R + (s.apsis ? 30 : 40));
    const dx = anchor === 'start' ? 8 : anchor === 'end' ? -8 : 0;
    const lines = [[s.name, { size: 14, weight: '600', color: s.apsis ? C.apsidal : C.ink }], [`${f.date} · ${f.time}`, { size: 13 }]];
    if (s.km) lines.push([`${fiNum(s.km, 1)} km`, { size: 13, color: C.apsidal }]);
    if (s.speed) lines.push([s.speed, { size: 12.5, color: C.soft }]);
    const y0 = equinox ? l[1] - 18 * (lines.length - 1) : l[1] + (sn > 0.6 ? -18 * lines.length + 8 : sn < -0.6 ? 10 : -10);
    lines.forEach(([t, o], i) => { body += fiText(l[0] + dx, y0 + 18 * i, t, { ...o, anchor, halo: true }); });
  }
  const H = cy + R + 160;
  body += fiText(W - 40, H - 30, 'path and distances to scale · the Sun and Earth not to scale', { size: 12, color: C.soft, anchor: 'end' });
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { cardinalJD: cardJD, nextVEJD: nextVE, perihelionJD: periJD, aphelionJD: aphJD, perihelionKm: rPeriKm, aphelionKm: rAphKm, eccentricity: e, perigeeLongitudeDeg: perigee, periPastSolsticeDeg, speedPeriDegPerDay, speedAphDegPerDay, pathCentreOffsetKm: au * e, seasonDays: Object.fromEntries(seasons.map(([n, d]) => [n, d])) },
    sources: 'the cardinal instants: the model’s cardinal finder · the Sun’s path, perihelion and aphelion: the certified Sun’s mean elements of date (mean anomaly 0° / 180°) · distances a(1 ∓ e) on the AU (IAU 2012)',
  };
}

// ── 7 · 04_coin_paradox_total — one sidereal year fewer per precession cycle ─
/**
 * The coin rotation paradox of the year: over one turn of the equinox the Sun
 * makes N laps against the equinox (solar years) and N − 1 against the stars
 * (sidereal years), N = sidereal ÷ (sidereal − solar year) — the same span as
 * the precession period T in Julian years. Four snapshots in the frame of the
 * seasons (the June solstice at the top, Earth at the centre): the ring of the
 * thirteen ecliptic constellations turns against it, 50.29″ a year — drawn as
 * a stated angle in the one-year panels, where the paradox lives.
 */
function renderCoinParadox(ctx) {
  const W = 1100, C = FI_COLORS, EQX = C.axial, STAR = C.magenta;
  const rad = (a) => (a * Math.PI) / 180;
  const year = Math.round(ctx.epochYear);
  const jd0 = ctx.cardinalJD(year, 'SS');
  const yTT0 = ctx.engineYearOfJD(jd0);
  const L = ctx.dayAndYearLengths(yTT0);
  const trop = L.tropicalYearSeconds, sid = L.siderealYearSeconds;
  const N = sid / (sid - trop);                          // solar years per turn of the equinox
  const nJulian = (N * trop) / (365.25 * 86400);         // the same span in Julian years
  // the year lengths in the solar day of date (the days figure 8 counts in)
  const tropDays = trop / L.solarDaySeconds, sidDays = sid / L.solarDaySeconds;
  const tP = ctx.axialPrecessionYears(yTT0);
  const turnArcsecPerSolarYear = 1296000 / N;
  const EXAG_DEG = 8;                                     // the one-year turn as drawn
  const f0 = fiFriendlyUT(ctx.formatUT(jd0)), f1 = fiFriendlyUT(ctx.formatUT(ctx.cardinalJD(year + 1, 'SS')));
  const fS = fiFriendlyUT(ctx.formatUT(jd0 + sid / 86400));
  const endYear = yTT0 + nJulian;
  // the J2000 longitude at the top at the start: the solstice of date, carried back by the precession over (yTT0 − 2000)
  const lonTop0 = 90 - (360 * (yTT0 - 2000)) / tP;

  const panels = [
    { head: 'Start', when: `${f0.date} · ${f0.time}`, solar: '0', sidereal: '0', turn: 0, sun: 0, note: 'the Sun at the June solstice, in front of a star' },
    { head: 'After one solar year', when: `${f1.date} · ${f1.time}`, solar: '1', sidereal: fiNum(trop / sid, 8), turn: EXAG_DEG, sun: 0, note: `back at the solstice, ${turnArcsecPerSolarYear.toFixed(2)}″ short of the star` },
    { head: 'After one sidereal year', when: `${fS.date} · ${fS.time}`, solar: fiNum(sid / trop, 8), sidereal: '1', turn: EXAG_DEG, sun: EXAG_DEG, note: `back at the star, ${turnArcsecPerSolarYear.toFixed(2)}″ past the solstice` },
    { head: 'After one precession cycle', when: `~${fiYearLabel(fiRoundTo(endYear, 1))}`, solar: fiNum(N, 2), sidereal: fiNum(N - 1, 2), turn: 0, sun: 0, full: true, note: 'the stars have turned once against the seasons' },
  ];

  const title = 'The coin rotation paradox: one sidereal year fewer than solar years per precession cycle';
  const legend = [
    { name: 'solar years (the Sun back at the solstice)', color: EQX, bold: true },
    { name: 'sidereal years (the Sun back at the star)', color: STAR, bold: true },
  ];
  const head = ctx.paperHeader(title, legend, W);
  let body = '';
  const PW = 530, PH = 600, RO = 178, RI = 146, RS = 100;
  panels.forEach((p, i) => {
    const x0 = 20 + (i % 2) * PW, y0 = head.bottom + 16 + Math.floor(i / 2) * PH;
    const cx = x0 + PW / 2, cy = y0 + 330;
    const pt = (th, r) => [cx + r * Math.cos(rad(th)), cy - r * Math.sin(rad(th))];
    body += fiText(x0 + 20, y0 + 26, `${i + 1} · ${p.head}`, { size: 15, weight: '600' });
    body += fiText(x0 + PW - 20, y0 + 26, p.when, { size: 13, color: C.soft, anchor: 'end' });
    // the counts against their totals
    // every count names its year (owner: the cycle is 25,771.52 years of 365.25 days — Julian — and 25,772.07 solar years)
    body += fiText(x0 + 20, y0 + 54, `solar years (of ${fiNum(tropDays, 5)} days)`, { size: 13.5, color: EQX });
    body += fiText(x0 + 380, y0 + 54, p.solar, { size: 13.5, anchor: 'end', weight: '600' });
    body += fiText(x0 + 386, y0 + 54, `/ ${fiNum(N, 2)}`, { size: 13.5, color: C.soft });
    body += fiText(x0 + 20, y0 + 76, `sidereal years (of ${fiNum(sidDays, 5)} days)`, { size: 13.5, color: STAR });
    body += fiText(x0 + 380, y0 + 76, p.sidereal, { size: 13.5, anchor: 'end', weight: '600' });
    body += fiText(x0 + 386, y0 + 76, `/ ${fiNum(N - 1, 2)}`, { size: 13.5, color: C.soft });
    // the constellation ring, turned against the seasons frame (the stars' longitudes grow)
    const th = (lonJ2000) => 90 + (lonJ2000 - lonTop0) + p.turn;
    body += fiCircle(cx, cy, RO, { stroke: C.faint, width: 1.2 }) + fiCircle(cx, cy, RI, { stroke: C.faint, width: 1.2 });
    const cons = ctx.eclipticConstellations;
    cons.forEach(([name, start], k) => {
      const end = cons[(k + 1) % cons.length][1];
      const span = ((end - start) % 360 + 360) % 360;
      const a = pt(th(start), RI), b = pt(th(start), RO);
      body += fiLine(a[0], a[1], b[0], b[1], { color: C.faint, width: 1.2 });
      const mid = th(start + span / 2), m = pt(mid, (RO + RI) / 2);
      let rot = 90 - mid; rot = ((rot % 360) + 540) % 360 - 180;
      if (Math.sin(rad(mid)) < 0) rot += 180;
      // a name that does not fit its arc takes the three-letter form (Ophiuchus; Scorpius, 6.5° on the ecliptic, in a smaller face)
      const arcPx = rad(span) * (RO + RI) / 2, fits = name.length * 6.2 <= arcPx - 8;
      body += fiText(m[0], m[1] + 4, fits ? name : name.slice(0, 3), { size: span < 8 ? 9 : 11, color: C.soft, anchor: 'middle', rotate: rot });
    });
    // the June solstice direction (the seasons frame: always the top) and the start star on the ring
    const sTop = pt(90, RO + 6), sTop2 = pt(90, RO + 22);
    body += `<path d="M${sTop[0].toFixed(1)},${sTop[1].toFixed(1)} l-7,-14 l14,0 Z" fill="${EQX}"/>`;
    body += fiText(sTop2[0], sTop2[1] - 4, 'June solstice', { size: 12, color: EQX, anchor: 'middle' });
    const st = pt(th(lonTop0), RI - 2);
    body += `<text x="${st[0].toFixed(1)}" y="${(st[1] + 7).toFixed(1)}" font-family="${FONT}" font-size="18" fill="${STAR}" text-anchor="middle">★</text>`;
    // the Sun's apparent path, Earth at the centre, the Sun and its line of sight to the ring
    body += fiCircle(cx, cy, RS, { stroke: C.faint, width: 1.2, dash: '4,4' });
    body += fiBody(cx, cy, 9, C.earth);
    const sp = pt(90 + p.sun, RS), sr = pt(90 + p.sun, RI);
    body += fiLine(cx, cy, sr[0], sr[1], { color: C.sun, width: 1.2, dash: '3,3' });
    body += fiBody(sp[0], sp[1], 12, C.sun);
    if (p.full) body += fiArcArrow(cx, cy, RO + 18, 112, 418, { color: STAR, width: 1.6, head: 10 });
    body += fiText(cx, cy + RO + 50, p.note, { size: 13, color: C.ink, anchor: 'middle' });
    if (p.turn) body += fiText(cx, cy + RO + 68, `(the ${turnArcsecPerSolarYear.toFixed(2)}″ turn drawn as ${EXAG_DEG}°)`, { size: 12, color: C.soft, anchor: 'middle' });
  });
  const yF = head.bottom + 16 + 2 * PH + 10;
  body += fiLine(40, yF, W - 40, yF, { color: '#e5e7eb', width: 1 });
  body += fiText(W / 2, yF + 26, `one turn of the equinox: N = sidereal ÷ (sidereal − solar year) = ${fiNum(N, 2)} solar years = ${fiNum(N - 1, 2)} sidereal years`, { size: 13, anchor: 'middle' });
  body += fiText(W / 2, yF + 46, `the precession period T = ${fiNum(tP, 2)} years of 365.25 days (Julian years) — the same span as ${fiNum(N, 2)} solar years`, { size: 13, anchor: 'middle', color: C.soft });
  const H = yF + 84;
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { jd0, N, nJulian, axialYears: tP, turnArcsecPerSolarYear, tropOverSid: trop / sid, sidOverTrop: sid / trop, endYear },
    sources: 'the year lengths of date: the published length family · the June solstices: the model’s cardinal finder · T: the axial precession of date · the constellations: the IAU boundaries on the ecliptic (J2000)',
  };
}

// ── 9 · 04_Earth_precession_CW — axial meets apsidal ────────────────────────
/**
 * The perihelion of date through the seasons: against the stars the equinox
 * turns clockwise (T_p) and the perihelion counter-clockwise (T_aps), so the
 * perihelion passes the seasons counter-clockwise once per
 * T_peri = 1/(1/T_p + 1/T_aps). Drawn in the frame of the seasons (the four
 * cardinal directions fixed), with the perihelion now and at the model's own
 * passages of the four directions over one cycle — each passage a computed
 * crossing of the certified Sun's perigee of date.
 */
function renderAxialMeetsApsidal(ctx) {
  const W = 1100, C = FI_COLORS, EQX = C.axial;
  const rad = (a) => (a * Math.PI) / 180;
  const y0 = ctx.epochYear;
  const epochLabel = y0 === 2000 ? 'J2000' : fiYearLabel(y0);
  const tP = ctx.axialPrecessionYears(y0), tAps = ctx.apsidalPeriodYears(y0);
  const tPeri = 1 / (1 / tP + 1 / tAps);
  const perigee = (y) => ctx.sunMeanElements(y).perigeeLongitudeDeg;   // the Sun's perigee of date (Earth's ϖ + 180°), °
  // the perigee unwrapped across one cycle around the epoch, sampled every 25 yr
  const STEP = 25, span = 1.15 * tPeri;
  const ys = [], us = [];
  for (let y = y0 - span; y <= y0 + span; y += STEP) {
    let u = perigee(y);
    if (us.length) { const prev = us[us.length - 1]; while (u - prev > 180) u -= 360; while (u - prev < -180) u += 360; }
    ys.push(y); us.push(u);
  }
  const uAt = (y) => { const i = Math.min(us.length - 2, Math.max(0, Math.floor((y - ys[0]) / STEP))); let u = perigee(y); while (u - us[i] > 180) u -= 360; while (u - us[i] < -180) u += 360; return u; };
  const crossing = (target) => {
    const k = us.findIndex((u, i) => i > 0 && (us[i - 1] - target) * (u - target) <= 0);
    if (k < 0) return null;
    let a = ys[k - 1], b = ys[k];
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if ((uAt(a) - target) * (uAt(m) - target) <= 0) b = m; else a = m; }
    return (a + b) / 2;
  };
  const uNow = uAt(y0);
  const t0 = 270 + 360 * Math.floor((uNow - 270) / 360);   // the last passage of the December solstice
  const DIRS = [[270, 'December solstice'], [360, 'March equinox'], [450, 'June solstice'], [540, 'September equinox'], [630, 'December solstice']];
  const passages = DIRS.map(([d, name]) => ({ dir: d % 360, name, year: crossing(t0 + d - 270) }));
  const nowLon = ((uNow % 360) + 360) % 360;

  const title = `Perihelion precession: the axial and the apsidal motion meet in ~${fiNum(tPeri, 0)} years (the ${epochLabel} rate)`;
  const legend = [
    { name: 'the equinox against the stars (axial precession, CW)', color: EQX, bold: true },
    { name: 'the perihelion against the stars (apsidal precession, CCW)', color: C.apsidal, bold: true },
    { name: 'the perihelion through the seasons (CCW)', color: C.ink, bold: true },
  ];
  const head = ctx.paperHeader(title, legend, W);
  const R = 250, cx = W / 2, cy = head.bottom + 130 + R;
  const at = (lon, r) => [cx + r * Math.cos(rad(lon)), cy - r * Math.sin(rad(lon))];
  let body = '';
  // the seasons frame: the four directions from Earth
  for (const [lon] of [[0], [90], [180], [270]]) { const p = at(lon, R + 10); body += fiLine(cx, cy, p[0], p[1], { color: C.faint, width: 1.2, dash: '6,4' }); }
  body += fiCircle(cx, cy, R, { stroke: C.ink, width: 2 });
  body += fiBody(cx, cy, 10, C.earth);
  // the three motions: two against the stars outside the rim, the resulting one inside
  body += fiArcArrow(cx, cy, R + 70, 165, 125, { color: EQX, width: 2.4, head: 12 });
  body += fiTextOnArc(cx, cy, R + 84, 167, 123, `axial · T = ${fiNum(tP, 0)} yr (${epochLabel})`, { size: 13, color: EQX });
  body += fiArcArrow(cx, cy, R + 70, 15, 55, { color: C.apsidal, width: 2.4, head: 12 });
  body += fiTextOnArc(cx, cy, R + 84, 59, 11, `apsidal · T = ${fiNum(tAps, 0)} yr (${epochLabel})`, { size: 13, color: C.apsidal });
  // (the lower half: a counter-clockwise text path reads upright, its top toward Earth)
  body += fiArcArrow(cx, cy, R - 36, 296, 356, { color: C.ink, width: 2.2, head: 11 });
  // (two lines; on the lower half the letters' tops face Earth, so the inner line reads first)
  body += fiTextOnArc(cx, cy, R - 72, 294, 358, 'through the seasons', { size: 13, color: C.ink });
  body += fiTextOnArc(cx, cy, R - 54, 294, 358, `T = ${fiNum(tPeri, 0)} yr (${epochLabel})`, { size: 13, color: C.ink });
  // the perihelion now (a green line from Earth) with the obliquity of date
  const pn = at(nowLon, R);
  body += fiLine(cx, cy, pn[0], pn[1], { color: C.apsidal, width: 2.4 });
  body += fiBody(pn[0], pn[1], 8, C.apsidal);
  body += fiText(pn[0] + 14, pn[1] + 22, `perihelion now (${epochLabel})`, { size: 13, color: C.apsidal, weight: '600', halo: true });
  // the passages: at each direction, the year(s) the perihelion stood there and the obliquity then
  const byDir = new Map();
  for (const p of passages) { if (p.year === null) continue; if (!byDir.has(p.dir)) byDir.set(p.dir, []); byDir.get(p.dir).push(p); }
  for (const [dir, list] of byDir) {
    const p = at(dir, R);
    body += fiCircle(p[0], p[1], 7, { stroke: C.ink, width: 2, fill: '#ffffff' });
    const c = Math.cos(rad(dir)), s = Math.sin(rad(dir));
    const anchor = c > 0.5 ? 'start' : c < -0.5 ? 'end' : 'middle';
    const l = at(dir, R + (Math.abs(s) > 0.5 ? 26 : 18));
    const lines = [[list[0].name, { size: 14, weight: '600' }]];
    for (const q of list) lines.push([fiYearLabel(fiRoundTo(q.year, 1)), { size: 13 }]);
    const yTop = s > 0.5 ? l[1] - 18 * (lines.length - 1) - 4 : s < -0.5 ? l[1] + 12 : l[1] - 9 * (lines.length - 1);
    lines.forEach(([t, o], i) => { body += fiText(l[0] + (anchor === 'start' ? 6 : anchor === 'end' ? -6 : 0), yTop + 18 * i, t, { ...o, anchor, halo: true }); });
  }
  // the time each quarter of the cycle took — the rate of date is not constant (along the rim, between the passages)
  const quarters = [];
  for (let k = 0; k + 1 < passages.length; k++) {
    const a = passages[k], b = passages[k + 1];
    if (a.year === null || b.year === null) continue;
    const mid = a.dir + 45, q = at(mid, R + 18);
    quarters.push(b.year - a.year);
    const c = Math.cos(rad(mid));
    body += fiText(q[0] + (c > 0 ? 4 : -4), q[1] + (Math.sin(rad(mid)) < 0 ? 14 : 0), `${fiNum(b.year - a.year, 0)} yr`, { size: 12.5, color: C.soft, anchor: c > 0 ? 'start' : 'end', halo: true });
  }
  const full = passages[4].year !== null && passages[0].year !== null ? passages[4].year - passages[0].year : null;
  // the relation (at the epoch) and the varying rate
  let vy = cy + R + 120;
  body += fiText(W / 2, vy, `1/T(seasons) = 1/T(axial) + 1/T(apsidal):  1/${fiNum(tPeri, 0)} = 1/${fiNum(tP, 0)} + 1/${fiNum(tAps, 0)}   ·   the rates at ${epochLabel}, in Julian years`, { size: 13, anchor: 'middle' });
  vy += 24;
  if (full !== null) body += fiText(W / 2, vy, `the rates change over time (faster near a low eccentricity): one full passage, ${fiYearLabel(passages[0].year)} → ${fiYearLabel(passages[4].year)}, takes ${fiNum(full, 0)} years`, { size: 13, anchor: 'middle', color: C.ink });
  vy += 22;
  body += fiText(W / 2, vy, 'the years and the quarter lengths along the rim: the model’s computed passages of the perihelion of date', { size: 12, anchor: 'middle', color: C.soft });
  const H = vy + 70;
  body += fiText(W - 40, H - 26, 'schematic · the seasons frame · not to scale', { size: 12, color: C.soft, anchor: 'end' });
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { axialYears: tP, apsidalYears: tAps, perihelionVsEquinoxYears: tPeri, perihelionNowDeg: nowLon, passages, quarterYears: quarters, fullCycleYears: full },
    sources: 'T: the axial precession of date and the apsidal period of date · the perihelion of date: the certified Sun’s perigee (its crossings scanned at 25 yr, bisected)',
  };
}

// ── the registry ─────────────────────────────────────────────────────────────
/** The twelve figures (plan 17 §3). `render` is null until the figure is built. */
export const FRAMEWORK_IMAGES = [
  { id: 'center-aa', file: '02_CenterAA', group: 'Earth’s orbit and precession', label: 'Eccentricity vector — Earth-centred', render: (ctx) => renderEccentricityLoop(ctx) },
  { id: 'center-03', file: '02_Center03', group: 'Earth’s orbit and precession', label: 'Eccentricity vector — Sun-centred', render: null },
  { id: 'earth-sun-orbit', file: '02_Earth_Sun_orbit', group: 'Earth’s orbit and precession', label: 'The Sun’s path seen from Earth', render: (ctx) => renderSunPath(ctx) },
  { id: 'bigger-picture', file: '03_bigger_picture', group: 'Earth’s orbit and precession', label: 'The cycles at a glance', render: null },
  { id: 'polestars', file: '03_great_year_polestars_01', group: 'Earth’s orbit and precession', label: 'The precession cone and the pole stars', render: null },
  { id: 'precession-seasons', file: '03_Precession_and_seasons', group: 'Earth’s orbit and precession', label: 'Seasons against perihelion', render: null },
  { id: 'coin-paradox', file: '04_coin_paradox_total', group: 'Days, years, Moon and climate', label: 'The coin rotation paradox', render: (ctx) => renderCoinParadox(ctx) },
  { id: 'orbit-year', file: '04_Earth_Orbit_Year', group: 'Days, years, Moon and climate', label: 'Days and years', render: (ctx) => renderDaysAndYears(ctx) },
  { id: 'precession-cw', file: '04_Earth_precession_CW', group: 'Days, years, Moon and climate', label: 'Axial meets apsidal', render: (ctx) => renderAxialMeetsApsidal(ctx) },
  { id: 'lunar-standstill', file: '08_Moon_Lunar_Standstill', group: 'Days, years, Moon and climate', label: 'The lunar standstills', render: null },
  { id: 'perihelia-2000', file: '09_Perihelion_21062000', group: 'Days, years, Moon and climate', label: 'The perihelia at the June solstice', render: (ctx) => renderPerihelia(ctx) },
  { id: 'ice-core', file: '15_Antarctica_ice_core', group: 'Days, years, Moon and climate', label: 'Antarctic ice cores and the model', render: null },
];
FRAMEWORK_IMAGES[1].render = (ctx) => renderEccentricityLoop(ctx, { sunCentred: true });
