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
/** A model (astronomical) year as a calendar label rounded on the CALENDAR year: −2840 → "2,800 BC" (2,841 BC rounded), not "2,801 BC". */
export function fiYearLabelRounded(y, step) {
  return y > 0 ? `${fiNum(Math.round(y / step) * step)} AD` : `${fiNum(Math.round((1 - y) / step) * step)} BC`;
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
  body += fiText(l0[0], l0[1] - 36, `Perihelion · ${epochLabel}`, { size: 16, weight: '600', anchor: anchorOf(p0) });
  body += fiVar(l0[0], l0[1] - 14, 'e', ` = ${e0.toFixed(4)}`, { size: 16, anchor: anchorOf(p0), italic: true });
  body += fiVar(l0[0], l0[1] + 8, 'T', ` = ${fiNum(tAps)} yr (anticlockwise · ${epochLabel})`, { size: 16, anchor: anchorOf(p0), color: C.apsidal });
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
  body += fiVar(pMin[0] + 14, pMin[1] + 52, 'T', ` = ${fiNum(tApsAtMin)} yr (anticlockwise)`, { size: 16, color: C.apsidal });
  // the next eccentricity maximum (a diamond, in the accent)
  if (max && max.year <= yEnd) {
    const pMax = toXY(max.e, max.pom), lm0 = outward(pMax, -34), lm = [lm0[0] + 18, lm0[1]];   // inside the loop (the rim carries the tick labels), clear of the closing hook
    body += `<rect x="${(pMax[0] - 6).toFixed(1)}" y="${(pMax[1] - 6).toFixed(1)}" width="12" height="12" transform="rotate(45 ${pMax[0].toFixed(1)} ${pMax[1].toFixed(1)})" fill="${C.accent}" stroke="#fff" stroke-width="1.2"/>`;
    body += fiVar(lm[0], lm[1] + 5, 'e', ` = ${max.e.toFixed(4)} (~${fiYearLabel(fiRoundTo(max.year, 100))})`, { size: 15, anchor: anchorOf(pMax), color: C.accent });
    body += fiVar(lm[0], lm[1] + 26, 'T', ` = ${fiNum(tApsAtMax)} yr (anticlockwise)`, { size: 15, anchor: anchorOf(pMax), color: C.apsidal });
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
    // Earth with the axial precession glyph: the pole circling once per T, clockwise
    // (the circle is a display glyph: its radius carries no physics)
    const rw = 34;
    body += fiCircle(cx, cy, rw, { stroke: C.ink, width: 1.2, dash: '4,4' });
    body += fiBody(cx, cy, 13, C.earth);
    body += fiText(cx, cy + rw + 22, 'Earth', { size: 17, anchor: 'middle' });
    body += fiBody(cx, cy - rw, 6, '#a8a8a8');
    body += fiArcArrow(cx, cy, rw + 24, 125, 55, { color: C.ink, width: 1.6, head: 10 });
    body += fiText(cx, cy - rw - 90, 'Axial precession', { size: 16, weight: '600', anchor: 'middle' });
    body += fiVar(cx, cy - rw - 68, 'T', ` = ${fiNum(tP)} yr (clockwise · ${epochLabel})`, { size: 16, anchor: 'middle' });
    body += fiText(cx, cy - rw - 46, 'the pole circles once per T', { size: 13, color: C.soft, anchor: 'middle' });
  }
  body += fiText(W - 40, plotTop + BOX + 70, 'e-vector to scale · bodies not to scale', { size: 12, color: C.soft, anchor: 'end' });

  // the values block
  const tPeri = 1 / (1 / tP + 1 / tAps);
  // the values block: the epoch's values only (the marked points carry their own on the drawing)
  const rows = [
    [`${epochLabel} values`, ''],
    ['eccentricity e', e0.toFixed(6)],
    ['longitude of perihelion ϖ (J2000 ecliptic)', `${pom0.toFixed(2)}°`],
    ['apsidal precession period (anticlockwise)', `${fiNum(tAps)} yr`],
    ...(sunCentred ? [] : [['axial precession period (clockwise)', `${fiNum(tP)} yr`]]),
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
  const when = fiFriendlyUT(ctx.formatUT(jd));
  const title = `Longitudes of perihelion on ${when.date} (the June solstice, ${when.time})`;
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
      body += fiVar(l[0], l[1] + dy + 38, 'T', ` = ${fiNum(tPeri)} yr (anticlockwise · ${epochLabel}) through the seasons`, { size: 13.5, anchor, color: C.apsidal, halo: true });
      body += fiText(l[0], l[1] + dy + 56, `(${fiNum(tAps)} yr against the stars)`, { size: 12, anchor, color: C.soft, halo: true });
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
  body += fiText(W / 2, yF + 26, 'one turn of the equinox: N = sidereal ÷ (sidereal − solar year)', { size: 13, anchor: 'middle' });
  body += fiText(W / 2, yF + 46, `= ${fiNum(N, 2)} solar years = ${fiNum(N - 1, 2)} sidereal years`, { size: 13, anchor: 'middle' });
  body += fiText(W / 2, yF + 68, `the precession period T = ${fiNum(tP, 2)} years of 365.25 days (Julian years)`, { size: 13, anchor: 'middle', color: C.soft });
  body += fiText(W / 2, yF + 88, `— the same span as ${fiNum(N, 2)} solar years`, { size: 13, anchor: 'middle', color: C.soft });
  const H = yF + 126;
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { jd0, N, nJulian, axialYears: tP, turnArcsecPerSolarYear, tropOverSid: trop / sid, sidOverTrop: sid / trop, endYear },
    sources: 'the year lengths of date: the published length family · the June solstices: the model’s cardinal finder · T: the axial precession of date · the constellations: the IAU boundaries on the ecliptic (J2000)',
  };
}

/**
 * The perihelion of date's passages through the four cardinal directions
 * between two years — the crossings of the certified Sun's perigee of date
 * (Earth's ϖ + 180°) through 0° / 90° / 180° / 270°, scanned every 25 yr on
 * the unwrapped longitude and bisected. ONE home for the passage years
 * figures 6 and 9 print. → [{ year, dirDeg }] in time order.
 */
export function fiPerigeePassages(ctx, yFrom, yTo) {
  const STEP = 25;
  const perigee = (y) => ctx.sunMeanElements(y).perigeeLongitudeDeg;
  const ys = [], us = [];
  for (let y = yFrom; y <= yTo; y += STEP) {
    let u = perigee(y);
    if (us.length) { const prev = us[us.length - 1]; while (u - prev > 180) u -= 360; while (u - prev < -180) u += 360; }
    ys.push(y); us.push(u);
  }
  const uNear = (y, ref) => { let u = perigee(y); while (u - ref > 180) u -= 360; while (u - ref < -180) u += 360; return u; };
  const out = [];
  for (let i = 1; i < us.length; i++) {
    for (let t = 90 * Math.ceil(us[i - 1] / 90); t <= us[i]; t += 90) {
      if (t === us[i - 1]) continue;
      let a = ys[i - 1], b = ys[i];
      for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if ((uNear(a, us[i - 1]) - t) * (uNear(m, us[i - 1]) - t) <= 0) b = m; else a = m; }
      out.push({ year: (a + b) / 2, dirDeg: ((t % 360) + 360) % 360 });
    }
  }
  return out;
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
  // the perihelion's passages over one cycle: from the last passage of the December solstice to the next (the shared scan)
  const CARD_NAMES = { 0: 'March equinox', 90: 'June solstice', 180: 'September equinox', 270: 'December solstice' };
  const all = fiPerigeePassages(ctx, y0 - 1.15 * tPeri, y0 + 1.15 * tPeri);
  let i0 = -1; all.forEach((p, i) => { if (p.dirDeg === 270 && p.year <= y0) i0 = i; });
  const passages = [0, 1, 2, 3, 4].map((k) => { const p = i0 >= 0 ? all[i0 + k] : undefined; return p ? { dir: p.dirDeg, name: CARD_NAMES[p.dirDeg], year: p.year } : { dir: (270 + 90 * k) % 360, name: CARD_NAMES[(270 + 90 * k) % 360], year: null }; });
  const nowLon = ((ctx.sunMeanElements(y0).perigeeLongitudeDeg % 360) + 360) % 360;

  const title = `Perihelion precession: the axial and the apsidal motion meet in T = ${fiNum(tPeri, 0)} yr (${epochLabel})`;
  const legend = [
    { name: 'the equinox against the stars (axial precession, clockwise)', color: EQX, bold: true },
    { name: 'the perihelion against the stars (apsidal precession, anticlockwise)', color: C.apsidal, bold: true },
    { name: 'the perihelion through the seasons (anticlockwise)', color: C.ink, bold: true },
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
  body += fiText(W / 2, vy, `1/T(seasons) = 1/T(axial) + 1/T(apsidal):  1/${fiNum(tPeri, 0)} = 1/${fiNum(tP, 0)} + 1/${fiNum(tAps, 0)}`, { size: 13, anchor: 'middle' });
  vy += 20;
  body += fiText(W / 2, vy, `the rates at ${epochLabel}, in Julian years`, { size: 12, anchor: 'middle', color: C.soft });
  vy += 26;
  if (full !== null) body += fiText(W / 2, vy, 'the rates change over time (faster near a low eccentricity):', { size: 13, anchor: 'middle', color: C.ink });
  vy += 20;
  if (full !== null) body += fiText(W / 2, vy, `one full passage, ${fiYearLabel(passages[0].year)} → ${fiYearLabel(passages[4].year)}, takes ${fiNum(full, 0)} years`, { size: 13, anchor: 'middle', color: C.ink });
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

// ── 6 · 03_Precession_and_seasons — the seasons against perihelion ──────────
/**
 * Earth's orbit with the perihelion held at the bottom, at the perihelion of
 * date's passages of the four cardinal directions over one cycle — from the
 * last December-solstice passage before the epoch (the shared passage scan:
 * figure 9's years and quarters; the epoch a tick on the first quarter):
 * Earth at the start of each northern season at the true anomaly the
 * certified Sun's perigee of that year gives (ν = λ − perigee), the season
 * lengths from the model's own cardinal instants of that year, the orbit's
 * shape from that year's e (drawn exaggerated, not printed — the figure is
 * about the seasons).
 */
function renderSeasonsVsPerihelion(ctx) {
  const W = 1100, C = FI_COLORS, EXAG = 12;
  const rad = (a) => (a * Math.PI) / 180;
  const y0 = ctx.epochYear;
  const epochLabel = y0 === 2000 ? 'J2000' : fiYearLabel(y0);
  const tP = ctx.axialPrecessionYears(y0), tAps = ctx.apsidalPeriodYears(y0);
  const tPeri = 1 / (1 / tP + 1 / tAps);
  const all = fiPerigeePassages(ctx, y0 - 1.3 * tPeri, y0 + 1.1 * tPeri);
  const prev = (dir) => [...all].reverse().find((p) => p.dirDeg === dir && p.year < y0);
  // the ring starts at the last passage of the December solstice (owner: every arrow a true quarter, figure 9's spans)
  const after = (dir, p) => p && all.find((q) => q.dirDeg === dir && q.year > p.year);
  const pDec = prev(270), pMar = after(0, pDec), pJun = after(90, pMar), pSep = after(180, pJun);
  const pSepBefore = pDec && [...all].reverse().find((q) => q.dirDeg === 180 && q.year < pDec.year);
  const NAMES = [[0, 'March equinox'], [90, 'June solstice'], [180, 'September equinox'], [270, 'December solstice']];
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  // one panel's numbers: e, the perigee, the four cardinal true anomalies and the season lengths of that year
  // (the orbit of the calendar year at its June solstice — the instant figure 3 draws, so the two agree)
  const state = (Y) => {
    const yr = Math.round(Y);
    const jd = Object.fromEntries(['VE', 'SS', 'AE', 'WS'].map((cp) => [cp, ctx.cardinalJD(yr, cp)]));
    const s = ctx.sunMeanElements(ctx.engineYearOfJD(jd.SS));
    const veNext = ctx.cardinalJD(yr + 1, 'VE');
    const days = [jd.SS - jd.VE, jd.AE - jd.SS, jd.WS - jd.AE, veNext - jd.WS];
    return { Y, e: s.eccentricity, perigee: s.perigeeLongitudeDeg, days };
  };
  const pDecNext = pSep && all.find((p) => p.dirDeg === 270 && p.year > pSep.year);
  const panels = [
    pDec && { st: state(pDec.year), head: `${fiYearLabel(fiRoundTo(pDec.year, 1))}${pDecNext ? ` (and ${fiYearLabel(fiRoundTo(pDecNext.year, 1))})` : ''}` },
    pMar && { st: state(pMar.year), head: fiYearLabel(fiRoundTo(pMar.year, 1)) },
    pJun && { st: state(pJun.year), head: fiYearLabel(fiRoundTo(pJun.year, 1)) },
    pSep && { st: state(pSep.year), head: `${fiYearLabel(fiRoundTo(pSep.year, 1))}${pSepBefore ? ` (and ${fiYearLabel(fiRoundTo(pSepBefore.year, 1))})` : ''}` },
  ];
  // the span each arrow stands for: one quarter between computed passages (the rate of date varies — figure 9's quarters)
  const spans = [pDec && pMar && pMar.year - pDec.year, pMar && pJun && pJun.year - pMar.year, pJun && pSep && pSep.year - pJun.year, pSep && pDecNext && pDecNext.year - pSep.year];
  // where the epoch falls on the first quarter (a tick on its arrow)
  const nowFrac = pDec && pMar ? (y0 - pDec.year) / (pMar.year - pDec.year) : null;

  const title = `The seasons against perihelion: the perihelion moves through the seasons in T = ${fiNum(tPeri, 0)} yr (${epochLabel})`;
  const legend = [
    { name: 'Earth at the start of each northern season', color: C.earth, marker: 'dot' },
    { name: 'perihelion (held at the bottom of each orbit)', color: C.apsidal, marker: 'dot' },
    { name: 'season length (days, from the model’s cardinal instants)', color: C.ink },
    { name: 'the two short seasons, beside perihelion', color: C.apsidal },
  ];
  const head = ctx.paperHeader(title, legend, W);
  const top = head.bottom + 20, A = 105;
  const spots = [[W / 2, top + 210], [W - 245, top + 520], [W / 2, top + 830], [245, top + 520]];
  let body = '';
  // the arrows between the panels (clockwise around the ring: now → March → June → September → now)
  // each arrow carries the years it spans, set outside the ring at the curve's midpoint
  const ringC = [W / 2, top + 520];
  const bez = (p0, p1, p2, t) => [0, 1].map((k) => (1 - t) * (1 - t) * p0[k] + 2 * (1 - t) * t * p1[k] + t * t * p2[k]);
  const arc = (p0, p1, p2, span) => {
    let s = `<path d="M${p0[0]},${p0[1]} Q${p1[0]},${p1[1]} ${p2[0]},${p2[1]}" fill="none" stroke="${C.soft}" stroke-width="2"/>` + fiArrowHead(p1, p2, { color: C.soft, head: 12 });
    if (span) {
      const m = bez(p0, p1, p2, 0.5);
      const dx = m[0] - ringC[0], dy = m[1] - ringC[1], L = Math.hypot(dx, dy) || 1;
      const q = [m[0] + (20 * dx) / L, m[1] + (20 * dy) / L], anchor = dx > 0 ? 'start' : 'end';
      s += fiText(q[0], q[1] + 4, `${fiNum(span, 0)} yr`, { size: 13.5, weight: '600', anchor, color: C.ink });
    }
    return s;
  };
  const A1 = [[W / 2 + 175, top + 150], [W - 245, top + 160], [W - 245, top + 345]];
  body += arc(...A1, spans[0]);
  body += arc([W - 245, top + 715], [W - 245, top + 870], [W / 2 + 175, top + 880], spans[1]);
  body += arc([W / 2 - 175, top + 880], [245, top + 870], [245, top + 715], spans[2]);
  body += arc([245, top + 345], [245, top + 160], [W / 2 - 175, top + 150], spans[3]);
  // the epoch on the first quarter's arrow: a dot at its share of the quarter, named outside the ring
  if (nowFrac !== null && nowFrac > 0 && nowFrac < 1) {
    const n = bez(...A1, nowFrac);
    body += fiCircle(n[0], n[1], 6, { fill: C.ink, stroke: '#ffffff', width: 1.5 });
    body += fiText(n[0] + 2, n[1] - 14, `now (${epochLabel}): ${fiNum(y0 - pDec.year, 0)} yr into this quarter`, { size: 12.5, anchor: 'middle', color: C.ink, halo: true });
  }

  panels.forEach((p, i) => {
    if (!p) return;
    const [cx, cy] = spots[i], st = p.st;
    const eD = st.e * EXAG, b = A * Math.sqrt(1 - eD * eD), c = A * eD;
    const sx = cx, sy = cy + c;                                 // the Sun at the lower focus: perihelion at the bottom
    const posAt = (nu) => { const r = (A * (1 - eD * eD)) / (1 + eD * Math.cos(rad(nu))), th = -90 + nu; return [sx + r * Math.cos(rad(th)), sy - r * Math.sin(rad(th)), r]; };
    body += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${b.toFixed(1)}" ry="${A}" fill="#f8fafc" stroke="${C.ink}" stroke-width="1.8"/>`;
    const nus = NAMES.map(([lon]) => ((lon - st.perigee) % 360 + 360) % 360);
    // the season lines from the Sun to Earth at each season start, the season names and lengths between them
    nus.forEach((nu) => { const q = posAt(nu); body += fiLine(sx, sy, q[0], q[1], { color: C.faint, width: 1 }); });
    // the two shortest seasons — the ones beside perihelion — in the perihelion's green
    const shortTwo = [...st.days].map((d, k) => [d, k]).sort((a, b) => a[0] - b[0]).slice(0, 2).map((x) => x[1]);
    nus.forEach((nu, k) => {
      let n2 = nus[(k + 1) % 4]; if (n2 < nu) n2 += 360;
      const mid = (nu + n2) / 2, q = posAt(mid), f = 0.56;
      const lx = sx + f * (q[0] - sx), ly = sy + f * (q[1] - sy);
      const short = shortTwo.includes(k);
      body += fiText(lx, ly - 3, SEASONS[k], { size: 11.5, color: short ? C.apsidal : C.soft, anchor: 'middle' });
      body += fiText(lx, ly + 12, `${st.days[k].toFixed(1)} d`, { size: 12, anchor: 'middle', weight: '600', color: short ? C.apsidal : C.ink });
    });
    // perihelion (a green ring at the bottom)
    const pp = posAt(0);
    body += fiCircle(pp[0], pp[1], 9, { stroke: C.apsidal, width: 2.4 });
    // Earth at each season start, named outside the orbit
    nus.forEach((nu, k) => {
      const q = posAt(nu);
      body += fiBody(q[0], q[1], 6.5, C.earth);
      const dx = q[0] - cx, dy = q[1] - cy, L = Math.hypot(dx, dy) || 1;
      const lx = q[0] + (16 * dx) / L, ly = q[1] + (16 * dy) / L;
      const anchor = dx > 20 ? 'start' : dx < -20 ? 'end' : 'middle';
      const atPeri = Math.min(nu, 360 - nu) < 4;
      body += fiText(lx, ly + (dy > 40 ? 12 : dy < -40 ? -2 : 4), atPeri ? `${NAMES[k][1]} = perihelion` : NAMES[k][1], { size: 11.5, anchor, color: atPeri ? C.apsidal : C.ink, weight: atPeri ? '600' : undefined, halo: true });
    });
    body += fiBody(sx, sy, 7, C.sun);
    // the caption
    body += fiText(cx, cy + A + 46, p.head, { size: 15, weight: '600', anchor: 'middle' });
  });
  const H = top + 1060;
  body += fiText(W - 40, H - 30, 'schematic · not to scale · seasons of the northern hemisphere', { size: 12, color: C.soft, anchor: 'end' });
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { perihelionVsEquinoxYears: tPeri, panels: panels.filter(Boolean).map((p) => ({ year: p.st.Y, e: p.st.e, perigeeDeg: p.st.perigee, seasonDays: p.st.days })), septemberBefore: pSepBefore ? pSepBefore.year : null },
    sources: 'the passage years: the shared scan of the certified Sun’s perigee of date (as figure 9) · e and the perigee: the certified Sun’s mean elements of that year · the season lengths: the model’s cardinal instants of that year',
  };
}

// ── 4 · 03_bigger_picture — the cycles at a glance ──────────────────────────
/**
 * Eight cells, each a quantity of the model over the last 350 kyr (sampled, not
 * a sine), its period — the J2000 rate where one is published, else the mean
 * spacing of its maxima measured on the model's own curve over the last Myr —
 * and its range over the last Myr, written min – max. The day length carries
 * no cycle in the model (the tidal lengthening), so its cell names its change;
 * the climate cell is the LR04 record (data, not model).
 */
function renderCyclesAtAGlance(ctx) {
  const W = 1100, C = FI_COLORS;
  const y0 = ctx.epochYear, epochLabel = y0 === 2000 ? 'J2000' : fiYearLabel(y0);
  const SPAN = 350000, MYR = 1000000;
  const rad = (a) => (a * Math.PI) / 180;
  const sample = (f, from, to, n) => { const xs = [], vs = []; for (let i = 0; i <= n; i++) { const y = from + ((to - from) * i) / n; xs.push(y); vs.push(f(y)); } return { xs, vs }; };
  const range = (vs) => [Math.min(...vs), Math.max(...vs)];
  const meanMaxSpacing = (s) => {
    const peaks = []; for (let i = 1; i < s.vs.length - 1; i++) if (s.vs[i] > s.vs[i - 1] && s.vs[i] >= s.vs[i + 1]) peaks.push(s.xs[i]);
    return peaks.length > 1 ? (peaks[peaks.length - 1] - peaks[0]) / (peaks.length - 1) : null;
  };
  // the axial precession: the equinox's angle against the stars, integrated over the rate of date (never rate × span)
  const axialAngle = (() => {
    const n = 1400, xs = [], vs = []; let ang = 0;
    for (let i = 0; i <= n; i++) { const y = y0 - SPAN + (SPAN * i) / n; if (i) ang += (360 * (SPAN / n)) / ctx.axialPrecessionYears(y - SPAN / n / 2); xs.push(y); vs.push(ang); }
    const end = vs[n]; return { xs, vs: vs.map((a) => Math.cos(rad(a - end))) };
  })();
  const eS = sample(ctx.eccentricity, y0 - MYR, y0, 1000), iS = sample(ctx.inclinationInvariableDeg, y0 - MYR, y0, 1000), epsS = sample(ctx.obliquityDeg, y0 - MYR, y0, 1000);
  const last = (s) => { const k = s.xs.findIndex((x) => x >= y0 - SPAN); return { xs: s.xs.slice(k), vs: s.vs.slice(k) }; };
  const nodeS = sample((y) => Math.sin(rad(ctx.ascendingNodeInvariableDeg(y))), y0 - SPAN, y0, 700);
  // the node's mean turn over the last Myr, measured on the unwrapped longitude (it regresses: Ω falls)
  const nodeTurnYears = (() => {
    let prev = ctx.ascendingNodeInvariableDeg(y0 - MYR), total = 0;
    for (let k = 1; k <= 1000; k++) { const v = ctx.ascendingNodeInvariableDeg(y0 - MYR + k * 1000); total += ((v - prev + 540) % 360) - 180; prev = v; }
    return total ? MYR / Math.abs(total / 360) : null;
  })();
  const periS = sample((y) => Math.sin(rad(ctx.sunMeanElements(y).perigeeLongitudeDeg - 180)), y0 - SPAN, y0, 1400);
  const lodS = sample(ctx.lodSeconds, y0 - SPAN, y0, 350);
  const lr = ctx.lr04();
  let lrS = null, lrRange = null;
  if (lr) {
    const xs = [], vs = [];
    lr.age_kyr_BP.forEach((a, k) => { if (a <= SPAN / 1000) { xs.push(y0 - a * 1000); vs.push(lr.d18o_per_mille[k]); } });
    const order = xs.map((x, k) => [x, vs[k]]).sort((a, b) => a[0] - b[0]);
    lrS = { xs: order.map((o) => o[0]), vs: order.map((o) => o[1]) };
    lrRange = range(lr.age_kyr_BP.map((a, k) => (a <= MYR / 1000 ? lr.d18o_per_mille[k] : NaN)).filter((v) => !Number.isNaN(v)));
  }
  const tP = ctx.axialPrecessionYears(y0), tAps = ctx.apsidalPeriodYears(y0), tPeri = 1 / (1 / tP + 1 / tAps);
  const tObl = ctx.obliquityBeatYears(y0), tNode = ctx.nodalPeriodYears();
  const eLong = ctx.eccentricityLongBeatYears(), eShort = meanMaxSpacing(eS), iPer = meanMaxSpacing(iS);
  const [eMin, eMax] = range(eS.vs), [iMin, iMax] = range(iS.vs), [epsMin, epsMax] = range(epsS.vs);
  const lodNow = ctx.lodSeconds(y0), lodThen = lodS.vs[0];

  const cells = [
    // the orbit
    // (each cell's lines stay inside its 260-px column: the period first, then a range where the quantity has one;
    //  `icon` names the picture above its curve, `aka` the other names a reader meets)
    { icon: 'ecc', name: 'Eccentricity', what: 'the orbit’s elongation e', s: last(eS), lines: [`maxima every ~${fiNum(fiRoundTo(eShort, 1000), 0)} yr`, `and a ${fiNum(fiRoundTo(eLong, 100), 0)}-yr beat`], rng: `${eMin.toFixed(4)} – ${eMax.toFixed(4)}`, color: C.apsidal },
    { icon: 'incl', name: 'Inclination', what: 'to the invariable plane, degrees', s: last(iS), lines: [`maxima every ~${fiNum(fiRoundTo(iPer, 1000), 0)} yr`], rng: `${iMin.toFixed(2)}° – ${iMax.toFixed(2)}°`, color: C.apsidal },
    { icon: 'node', aka: 'also: planetary precession', name: 'Ecliptic precession', what: 'the orbit’s node (sin Ω), invariable plane', s: nodeS, lines: [`one turn per ~${fiNum(fiRoundTo(nodeTurnYears, 1000), 0)} yr (last Myr)`, `the s₃ mode: ${fiNum(tNode, 0)} yr`], color: C.apsidal },
    { icon: 'peri', aka: 'also: advance of the perihelion', name: 'Perihelion precession', what: 'against the equinox (sin ϖ)', s: periS, lines: [`T = ${fiNum(tPeri, 0)} yr (${epochLabel})`, 'one turn through the seasons'], color: C.apsidal },
    // the spin axis and the climate record
    { icon: 'axial', aka: 'also: precession of the equinoxes · Great Year', name: 'Axial precession', what: 'the equinox against the stars (cos)', s: axialAngle, lines: [`T = ${fiNum(tP, 0)} yr (${epochLabel})`, 'one turn of the equinox per T'], color: C.axial },
    { icon: 'obl', aka: 'also: the axial tilt', name: 'Obliquity', what: 'the tilt ε, degrees', s: last(epsS), lines: [`T = ${fiNum(tObl, 0)} yr (${epochLabel})`], rng: `${epsMin.toFixed(2)}° – ${epsMax.toFixed(2)}°`, color: C.axial },
    { icon: 'lod', aka: 'also: LOD, the length of day', name: 'Day length', what: 'the solar day of date, seconds', s: lodS, lines: [`+${(lodNow - lodThen).toFixed(1)} s in 350 kyr: no cycle`, 'the tidal braking of the spin'], rng: `${fiNum(lodThen, 2)} → ${fiNum(lodNow, 2)} s`, rngLabel: 'drawn span', color: C.axial },
    { name: 'Climate record', what: 'LR04 benthic δ¹⁸O (data) · up = warmer', s: lrS, flip: true, lines: ['the ice ages: the response'], rng: lrRange ? `${lrRange[0].toFixed(2)} – ${lrRange[1].toFixed(2)} ‰` : '—', color: C.ink },
  ];

  const title = `The cycles at a glance: Earth’s orbit and spin axis over the last 350,000 years`;
  const legend = [
    { name: 'the orbit', color: C.apsidal, bold: true },
    { name: 'the spin axis', color: C.axial, bold: true },
    { name: 'the climate record (data)', color: C.ink, bold: true },
  ];
  const head = ctx.paperHeader(title, legend, W);
  let body = '';
  const CW = 260, CH = 420, X0 = 30;
  const rowY = [head.bottom + 60, head.bottom + 60 + CH + 50];
  // ── the pictures: one per cell, in a 110-px band above its curve; a model number where the picture can carry one
  const ell = (cx, cy, rx, ry, o = {}) => `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${o.fill || 'none'}" stroke="${o.stroke || C.ink}" stroke-width="${o.width || 1.4}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.rot ? ` transform="rotate(${o.rot} ${cx.toFixed(1)} ${cy.toFixed(1)})"` : ''}/>`;
  const ellArrow = (cx, cy, rx, ry, t0, t1, color) => {   // an arrow along an ellipse, t in degrees (screen CCW)
    const pts = []; for (let i = 0; i <= 24; i++) { const t = rad(t0 + ((t1 - t0) * i) / 24); pts.push([cx + rx * Math.cos(t), cy - ry * Math.sin(t)]); }
    return fiPath(pts, { color, width: 1.6 }) + fiArrowHead(pts[pts.length - 2], pts[pts.length - 1], { color, head: 8 });
  };
  const small = (x, y, s, o = {}) => fiText(x, y, s, { size: 10.5, color: C.soft, ...o });
  const icon = (kind, bx, by, bw, bh) => {
    const cx = bx + bw / 2, cy = by + bh / 2;
    let s = '';
    if (kind === 'ecc') {
      // two orbits sharing the Sun's focus: the round one at the last-Myr minimum e, the long one at the maximum (e drawn ×5)
      const X = 5, a = 44, sx = cx - 30;
      for (const [e, dash, col] of [[eMin, '4,3', C.soft], [eMax, null, C.apsidal]]) {
        const eD = e * X; s += ell(sx + a * eD, cy, a, a * Math.sqrt(1 - eD * eD), { stroke: col, width: 1.6, dash });
      }
      s += fiBody(sx, cy, 5, C.sun);
      s += small(bx + bw - 6, cy - 14, `e = ${eMax.toFixed(4)}`, { anchor: 'end', color: C.apsidal });
      s += small(bx + bw - 6, cy + 2, `e = ${eMin.toFixed(4)}`, { anchor: 'end' });
      s += small(bx + bw - 6, cy + 18, '(drawn ×5)', { anchor: 'end' });
    } else if (kind === 'incl' || kind === 'node') {
      // the invariable plane (grey) and the orbit's plane tipped against it along the node line (the angle drawn ×4)
      const ang = 4 * (kind === 'incl' ? iMax : ctx.inclinationInvariableDeg(y0));
      const ox = cx - 10, oy = cy - 4;
      s += ell(ox, oy, 76, 18, { stroke: C.faint, width: 1.4, fill: '#f3f4f6' });
      s += ell(ox, oy, 76, 18, { stroke: C.apsidal, width: 1.8, rot: -ang });
      s += fiLine(ox - 92, oy, ox + 92, oy, { color: C.soft, width: 1, dash: '3,3' });
      if (kind === 'incl') {
        s += small(ox + 80, oy - 26, 'orbit', { color: C.apsidal });
        s += small(ox - 92, oy + 34, 'invariable plane (grey)', {});
        s += small(ox - 92, oy + 48, `i up to ${iMax.toFixed(2)}° (drawn ×4)`, {});
      } else {
        // the node regresses: clockwise seen from the north, i.e. right-to-left along the near (lower) edge
        s += ellArrow(ox, oy + 8, 96, 32, 335, 205, C.apsidal);
        s += small(ox - 92, oy - 14, 'node line', {});
        s += small(ox, oy + 56, 'the node line turns clockwise', { anchor: 'middle' });
      }
    } else if (kind === 'peri') {
      // the orbit turning about the Sun: an earlier orientation (faint) and the present one, the perihelion advancing
      const a = 44, eD = 0.32, b = a * Math.sqrt(1 - eD * eD), sx = cx - 6;
      s += ell(sx + a * eD * Math.cos(rad(-30)), cy - a * eD * Math.sin(rad(-30)), a, b, { stroke: C.faint, width: 1.4, rot: 30, dash: '4,3' });
      s += ell(sx + a * eD, cy, a, b, { stroke: C.apsidal, width: 1.8 });
      s += fiBody(sx, cy, 5, C.sun);
      s += fiArcArrow(sx, cy, a * (1 + eD) + 12, -34, 8, { color: C.apsidal, width: 1.6, head: 8 });
      s += small(bx + 4, cy - 30, 'the perihelion', {});
      s += small(bx + 4, cy - 16, 'turns anticlockwise', {});
    } else if (kind === 'axial') {
      // Earth's axis at the obliquity of date (to scale) tracing a cone about the ecliptic pole
      const L = 46, e = rad(ctx.obliquityDeg(y0)), ex = cx - 20;
      s += fiLine(ex, cy + 44, ex, cy - 52, { color: C.faint, width: 1, dash: '3,3' });
      s += ell(ex, cy - L * Math.cos(e), L * Math.sin(e), 5, { stroke: C.axial, width: 1.4 });
      s += fiArrowHead([ex - 4, cy - L * Math.cos(e) + 5], [ex - 10, cy - L * Math.cos(e) + 4.6], { color: C.axial, head: 7 });
      s += fiBody(ex, cy, 16, C.earth);
      // the axis through Earth's centre, its north end on the cone's rim
      s += fiLine(ex - 0.75 * L * Math.sin(e), cy + 0.75 * L * Math.cos(e), ex + L * Math.sin(e), cy - L * Math.cos(e), { color: C.ink, width: 1.8 });
      s += small(ex + 30, cy - 30, 'the axis traces a cone', {});
      s += small(ex + 30, cy - 16, `half-angle ε = ${ctx.obliquityDeg(y0).toFixed(2)}°`, {});
      s += small(ex + 30, cy - 2, 'clockwise, seen from the north', {});
    } else if (kind === 'obl') {
      // the tilt to scale: the ecliptic pole (dashed), the axis now, and the last-Myr wedge min – max
      const L = 96, ox = cx - 70, oy = by + bh - 6, now = ctx.obliquityDeg(y0);
      const tip = (d, r) => [ox + r * Math.sin(rad(d)), oy - r * Math.cos(rad(d))];
      s += fiLine(ox - 20, oy, ox + 80, oy, { color: C.soft, width: 1.2 });
      s += fiLine(ox, oy, ox, oy - L, { color: C.faint, width: 1, dash: '3,3' });
      const a = tip(epsMin, L), b = tip(epsMax, L);
      s += `<path d="M${ox},${oy} L${a[0].toFixed(1)},${a[1].toFixed(1)} L${b[0].toFixed(1)},${b[1].toFixed(1)} Z" fill="${C.axial}" opacity="0.25"/>`;
      const n = tip(now, L + 4); s += fiLine(ox, oy, n[0], n[1], { color: C.axial, width: 2 });
      const lx = ox + 70;
      s += fiLine(b[0], b[1], lx - 4, by + 14, { color: C.faint, width: 0.8 }) + small(lx, by + 18, `${epsMax.toFixed(2)}° max`);
      s += fiLine(n[0], n[1], lx - 4, by + 36, { color: C.faint, width: 0.8 }) + small(lx, by + 40, `${now.toFixed(2)}° now (${epochLabel})`, { color: C.axial });
      s += fiLine(a[0], a[1], lx - 4, by + 58, { color: C.faint, width: 0.8 }) + small(lx, by + 62, `${epsMin.toFixed(2)}° min`);
      s += small(lx, by + 84, 'angles to scale');
    } else if (kind === 'lod') {
      // the Moon's tide: the bulge carried ahead of the Moon by the spin, its pull braking the spin
      const ex = cx - 40;
      s += ell(ex, cy, 30, 22, { stroke: C.axial, width: 1.2, fill: '#eef4fb', rot: -18 });
      s += fiBody(ex, cy, 18, C.earth);
      s += fiArcArrow(ex, cy, 38, 150, 205, { color: C.ink, width: 1.4, head: 8 });   // the spin, anticlockwise seen from the north
      s += fiBody(ex + 96, cy, 7, '#9ca3af');
      s += small(ex + 96, cy + 22, 'Moon', { anchor: 'middle' });
      s += fiLine(ex + 30, cy - 10, ex + 86, cy - 2, { color: C.faint, width: 1, dash: '3,3' });
      s += small(ex + 50, cy - 30, 'the tidal bulge leads the Moon;', {});
      s += small(ex + 50, cy - 16, 'its pull slows the spin', {});
    }
    return s;
  };
  body += fiText(X0, rowY[0] - 22, 'Earth’s orbit', { size: 16, weight: '600', color: C.apsidal });
  body += fiText(X0, rowY[1] - 22, 'Earth’s spin axis · and the climate record', { size: 16, weight: '600', color: C.axial });
  cells.forEach((c, k) => {
    const x = X0 + (k % 4) * (CW + 5), y = rowY[Math.floor(k / 4)];
    body += fiText(x + 8, y + 18, c.name, { size: 15, weight: '600' });
    if (c.aka) body += fiText(x + 8, y + 35, c.aka, { size: 11, color: C.soft, italic: true });
    body += fiText(x + 8, y + 52, c.what, { size: 11.5, color: C.soft });
    if (c.icon) body += icon(c.icon, x + 6, y + 62, CW - 20, 110);
    // the mini-curve over the drawn span: 350 kyr ago at the left, now at the right
    const px = x + 10, py = y + 182, pw = CW - 30, ph = 110;
    body += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#fafafa" stroke="#e5e7eb"/>`;
    if (c.s && c.s.vs.length > 1) {
      const [lo, hi] = range(c.s.vs), pad = (hi - lo) * 0.08 || 1;
      const x0s = y0 - SPAN;
      const pts = c.s.xs.map((t, i) => { const fy = (c.s.vs[i] - (lo - pad)) / (hi - lo + 2 * pad); return [px + (pw * (t - x0s)) / SPAN, c.flip ? py + ph * fy : py + ph * (1 - fy)]; });
      body += fiPath(pts, { color: c.color, width: 1.4 });
      // now: the curve's right end
      const pn = pts[pts.length - 1];
      body += fiCircle(pn[0], pn[1], 4.5, { fill: c.color, stroke: '#ffffff', width: 1.2 });
    } else body += fiText(px + pw / 2, py + ph / 2, 'loading the record…', { size: 12, color: C.faint, anchor: 'middle' });
    for (const kyr of [350, 250, 150, 50, 0]) {
      const tx = px + (pw * (SPAN - kyr * 1000)) / SPAN;
      body += fiLine(tx, py + ph, tx, py + ph + 4, { color: C.faint, width: 1 });
      body += fiText(tx, py + ph + 16, String(kyr), { size: 10, color: C.soft, anchor: 'middle' });
    }
    body += fiText(px + pw, py + ph + 30, 'kyr ago · dot = now', { size: 10, color: C.soft, anchor: 'end' });
    let ly = py + ph + 52;
    c.lines.forEach((t, j) => { body += fiText(x + 8, ly, t, { size: j ? 12 : 12.5, color: j ? C.soft : C.ink }); ly += 18; });
    if (c.rng) body += fiText(x + 8, ly, `${c.rngLabel || 'last Myr'}: ${c.rng}`, { size: 12, color: C.soft });
  });
  // the J2000 years and days (the published family, as in Days and years)
  const jdSS = ctx.cardinalJD(Math.round(y0), 'SS');
  const L = ctx.dayAndYearLengths(ctx.engineYearOfJD(jdSS));
  const anomS = ctx.anomalisticYearSeconds(ctx.engineYearOfJD(jdSS));
  const yF = rowY[1] + CH + 30;
  body += fiLine(X0, yF, W - X0, yF, { color: '#e5e7eb', width: 1 });
  body += fiText(W / 2, yF + 24, `years: solar ${fiNum(L.tropicalYearSeconds / L.solarDaySeconds, 5)} d · sidereal ${fiNum(L.siderealYearSeconds / L.solarDaySeconds, 5)} d · anomalistic ${fiNum(anomS / L.solarDaySeconds, 5)} d`, { size: 13, anchor: 'middle' });
  body += fiText(W / 2, yF + 44, `days: solar ${fiNum(L.solarDaySeconds, 4)} s · sidereal ${fiNum(L.siderealDaySeconds, 4)} s · stellar ${fiNum(L.stellarDaySeconds, 4)} s`, { size: 13, anchor: 'middle', color: C.soft });
  body += fiText(W / 2, yF + 62, '(21 June 2000, as in Days and years)', { size: 12, anchor: 'middle', color: C.soft });
  const H = yF + 84;
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { axialYears: tP, perihelionVsEquinoxYears: tPeri, obliquityBeatYears: tObl, nodalYears: tNode, nodeMeanTurnYears: nodeTurnYears, eccentricityLongBeatYears: eLong, eccentricityMaxSpacingYears: eShort, inclinationMaxSpacingYears: iPer, eRange: [eMin, eMax], iRange: [iMin, iMax], epsRange: [epsMin, epsMax], lodThen, lodNow, lr04Range: lrRange },
    sources: 'e(t), ϖ: the one-source series and the certified Sun · i, Ω: the earth surface (invariable plane) · ε: the hybrid · T: the published periods of date · LOD: LOD_real of date · δ¹⁸O: LR04 (Lisiecki & Raymo 2005)',
  };
}

// ── 10 · 08_Moon_Lunar_Standstill — the lunar node and the standstills ───────
/**
 * The Moon's ascending node over a century: its ecliptic longitude of date
 * Ω = L′ − F (the scene's lunar arguments) and, beneath, the band of the
 * Moon's monthly declination extremes ±(ε ± i·cos Ω)… computed exactly as the
 * extreme declination of a body on the Moon's mean orbit (ε of date, i the
 * Moon's mean inclination) — at its widest when the node stands at the March
 * equinox (Ω = 0°, the major standstill), narrowest at Ω = 180° (the minor).
 * The standstills are the computed crossings of Ω through 0° and 180°.
 */
function renderLunarStandstill(ctx) {
  const W = 1100, C = FI_COLORS, MOON = C.cyan;
  const rad = (a) => (a * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
  const y0 = Math.round(ctx.epochYear), Y0 = y0 - 40, Y1 = y0 + 60;
  const jdOf = (y) => ctx.julianDay(Math.floor(y), 1, 1) + (y - Math.floor(y)) * 365.25;
  const iM = ctx.moonInclinationDeg;
  // the extreme declination over a month: a great circle reaches a declination equal to the angle between its pole and
  // the celestial pole — the ecliptic's is ε (the Sun's limit); the Moon's orbit pole sits i from the ecliptic pole,
  // so at Ω = 0° the angle is ε + i (the major standstill), at Ω = 180° ε − i (the minor)
  const extremeDecDeg = (om, eps) => {
    const pe = [0, Math.sin(rad(eps)), Math.cos(rad(eps))];                               // the celestial pole in ecliptic coordinates
    const po = [Math.sin(rad(iM)) * Math.sin(rad(om)), -Math.sin(rad(iM)) * Math.cos(rad(om)), Math.cos(rad(iM))];   // the Moon's orbit pole
    return deg(Math.acos(pe[0] * po[0] + pe[1] * po[1] + pe[2] * po[2]));
  };
  const N = 1200, xs = [], om = [], ext = [];
  for (let k = 0; k <= N; k++) {
    const y = Y0 + ((Y1 - Y0) * k) / N, jd = jdOf(y), o = ctx.moonNodeLongitudeDeg(jd);
    xs.push(y); om.push(o); ext.push(extremeDecDeg(o, ctx.obliquityDeg(ctx.engineYearOfJD(jd))));
  }
  // the standstills: Ω crossing 0° (major: Ω regresses 360 → 0) and 180° (minor)
  const events = [];
  for (let k = 1; k <= N; k++) {
    const a = om[k - 1], b = om[k];
    if (a < 30 && b > 330) events.push({ kind: 'major', y: xs[k - 1] + ((xs[k] - xs[k - 1]) * a) / (a + 360 - b) });
    if (a >= 180 && b < 180) events.push({ kind: 'minor', y: xs[k - 1] + ((xs[k] - xs[k - 1]) * (a - 180)) / (a - b) });
  }
  const nextMajor = events.find((e) => e.kind === 'major' && e.y > 2024) || events.find((e) => e.kind === 'major');
  const extMax = Math.max(...ext), extMin = Math.min(...ext);
  const nodeYears = (() => { const ks = events.filter((e) => e.kind === 'major'); return ks.length > 1 ? (ks[ks.length - 1].y - ks[0].y) / (ks.length - 1) : null; })();

  const title = `The Moon’s node and the lunar standstills, ${Y0}–${Y1}`;
  const legend = [
    { name: 'the ascending node Ω (ecliptic of date)', color: MOON, bold: true },
    { name: 'the Moon’s monthly declination extremes', color: C.ink, bold: true },
    { name: 'major standstill (Ω = 0°)', color: C.magenta, bold: true },
    { name: 'minor standstill (Ω = 180°)', color: C.soft, bold: true },
  ];
  const head = ctx.paperHeader(title, legend, W);
  let body = '';
  const L = 90, R = W - 40, PW = R - L;
  const X = (y) => L + (PW * (y - Y0)) / (Y1 - Y0);
  const plot = (top, h, lo, hi, ylab, ticks) => {
    let s = `<rect x="${L}" y="${top}" width="${PW}" height="${h}" fill="#fafafa" stroke="#e5e7eb"/>`;
    for (const t of ticks) { const yy = top + h * (1 - (t - lo) / (hi - lo)); s += fiLine(L, yy, R, yy, { color: '#eceff3', width: 1 }) + fiText(L - 8, yy + 4, `${t}°`, { size: 11, color: C.soft, anchor: 'end' }); }
    s += fiText(28, top + h / 2, ylab, { size: 12, color: C.soft, anchor: 'middle', rotate: -90 });
    return s;
  };
  const yr = (top, h, lo, hi) => (v) => top + h * (1 - (v - lo) / (hi - lo));
  // ── the node
  const t1 = head.bottom + 50, h1 = 260, Y1f = yr(t1, h1, 0, 360);
  body += fiText(L, t1 - 14, 'The ascending node regresses once round the ecliptic', { size: 14, weight: '600' });
  body += plot(t1, h1, 0, 360, 'node longitude Ω', [0, 90, 180, 270, 360]);
  let seg = [];
  for (let k = 0; k <= N; k++) {
    if (k && Math.abs(om[k] - om[k - 1]) > 180) { body += fiPath(seg, { color: MOON, width: 2 }); seg = []; }
    seg.push([X(xs[k]), Y1f(om[k])]);
  }
  body += fiPath(seg, { color: MOON, width: 2 });
  body += fiText(L, t1 + h1 + 40, 'Ω = 0°: the Moon’s orbit tilts the same way as the ecliptic does against the equator, so i adds to ε (major)', { size: 12, color: C.soft });
  body += fiText(L, t1 + h1 + 56, 'Ω = 180°: it subtracts (minor)', { size: 12, color: C.soft });
  // ── the declination band
  const t2 = t1 + h1 + 110, h2 = 300, lo2 = -32, hi2 = 32, Y2f = yr(t2, h2, lo2, hi2);
  body += fiText(L, t2 - 14, 'How far north and south the Moon reaches each month', { size: 14, weight: '600' });
  body += fiText(R, t2 - 14, 'the mean orbit, geocentric (the real extremes wobble ~0.15°, and parallax adds up to ~1°)', { size: 11, color: C.soft, anchor: 'end' });
  body += plot(t2, h2, lo2, hi2, 'declination', [-30, -20, -10, 0, 10, 20, 30]);
  const up = xs.map((x, k) => [X(x), Y2f(ext[k])]), dn = xs.map((x, k) => [X(x), Y2f(-ext[k])]);
  body += `<path d="M${up.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')} L${dn.slice().reverse().map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')} Z" fill="${MOON}" opacity="0.12"/>`;
  body += fiPath(up, { color: C.ink, width: 1.6 }) + fiPath(dn, { color: C.ink, width: 1.6 });
  const epsNow = ctx.obliquityDeg(ctx.engineYearOfJD(jdOf(y0)));
  body += fiLine(L, Y2f(epsNow), R, Y2f(epsNow), { color: C.sun, width: 1.2, dash: '5,4' }) + fiLine(L, Y2f(-epsNow), R, Y2f(-epsNow), { color: C.sun, width: 1.2, dash: '5,4' });
  body += fiText(L, t2 + h2 + 40, `dashed orange: the Sun’s limits ±${epsNow.toFixed(2)}° (ε)`, { size: 11.5, color: C.sun });
  // the band's values at the first major and minor peaks
  const firstMaj = events.find((e) => e.kind === 'major'), firstMin = events.find((e) => e.kind === 'minor');
  if (firstMaj) body += fiText(X(firstMaj.y) + 8, Y2f(extMax) - 8, `${extMax.toFixed(2)}°`, { size: 12, weight: '600', color: C.magenta, halo: true });
  if (firstMin) body += fiText(X(firstMin.y) + 8, Y2f(extMin) + 18, `${extMin.toFixed(2)}°`, { size: 12, weight: '600', color: C.soft, halo: true });
  // the standstills through both plots, and the decade axis
  for (const e of events) {
    const x = X(e.y), col = e.kind === 'major' ? C.magenta : C.soft;   // (blue stays the axial family's colour)
    body += fiLine(x, t1, x, t2 + h2, { color: col, width: 1.4, dash: '6,4' });
    body += fiText(x, t2 + h2 + 18, `${e.kind} ${e.y.toFixed(1)}`, { size: 11.5, color: col, anchor: 'middle', weight: '600', halo: true });
  }
  for (let y = Math.ceil(Y0 / 10) * 10; y <= Y1; y += 10) {
    const x = X(y);
    body += fiLine(x, t1 + h1, x, t1 + h1 + 4, { color: C.faint, width: 1 }) + fiText(x, t1 + h1 + 18, String(y), { size: 11, color: C.soft, anchor: 'middle' });
    body += fiLine(x, t2 + h2, x, t2 + h2 + 4, { color: C.faint, width: 1 });
  }
  // the epoch: the scene's start instant
  const xN = X(ctx.epochYear);
  body += fiLine(xN, t1, xN, t2 + h2, { color: C.ink, width: 1.2 });
  const omN = ctx.moonNodeLongitudeDeg(ctx.cardinalJD(y0, 'SS'));
  body += fiText(xN + 6, t1 + 16, `21 June ${y0}: Ω = ${omN.toFixed(1)}°`, { size: 12, color: C.ink, halo: true });
  // the summary
  let vy = t2 + h2 + 76;
  body += fiText(W / 2, vy, `the band: ±${extMax.toFixed(2)}° at a major standstill (ε + i) · ±${extMin.toFixed(2)}° at a minor (ε − i) · i = ${iM.toFixed(3)}°`, { size: 13, anchor: 'middle' });
  vy += 22;
  if (nodeYears) body += fiText(W / 2, vy, `one node cycle ~${nodeYears.toFixed(2)} years (the standstills’ mean spacing here)`, { size: 12.5, anchor: 'middle', color: C.soft });
  vy += 18;
  if (nextMajor) body += fiText(W / 2, vy, `the current major standstill: Ω = 0° in ${nextMajor.y - Math.floor(nextMajor.y) < 0.34 ? 'early' : nextMajor.y - Math.floor(nextMajor.y) < 0.67 ? 'mid' : 'late'} ${Math.floor(nextMajor.y)}`, { size: 12.5, anchor: 'middle', color: C.soft });
  const H = vy + 50;
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { events, extMaxDeg: extMax, extMinDeg: extMin, moonInclinationDeg: iM, nodeYears, nodeAtEpochDeg: omN },
    sources: 'Ω = L′ − F: the scene’s lunar arguments · ε: the hybrid obliquity of date · i: the Moon’s mean inclination · the extremes: the exact declination limit of the mean orbit',
  };
}

// ── 5 · 03_great_year_polestars_01 — the pole's path among the stars ────────
/**
 * The north and south celestial poles of date among the stars, on two sky
 * charts centred on the ecliptic poles (J2000 ecliptic, seen from inside the
 * sky): the pole sits at ecliptic latitude 90° − ε₀ and longitude 90° − ψ_A(t),
 * ψ_A the spin axis's inertial precession accumulated from J2000 — the
 * model's realized rate over each span (its window mean, never the J2000
 * instant × the span). Each named star's closest approach (year and
 * separation) is a computed minimum against the catalogue's J2000 position;
 * proper motion is neglected and the tilt to the J2000 ecliptic is held at
 * ε₀ (both stated on the figure).
 */
function renderPoleStars(ctx) {
  const W = 1100, C = FI_COLORS;
  const rad = (a) => (a * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
  const eps0 = ctx.obliquityDeg(2000);
  const Y0 = -4000, Y1 = 28500, STEP = 20;
  const psiDeg = (y) => (y === 2000 ? 0 : (ctx.spinAxisInertialRateMeanArcsecPerYr(Math.min(2000, y), Math.max(2000, y)) * (y - 2000)) / 3600);
  // the pole of date as an ecliptic unit vector (north; the south pole is its negative)
  const poleAt = (y) => { const l = rad(90 - psiDeg(y)), b = rad(90 - eps0); return [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)]; };
  const ys = [], poles = [];
  for (let y = Y0; y <= Y1; y += STEP) { ys.push(y); poles.push(poleAt(y)); }
  // the catalogue: J2000 RA/Dec strings → an ecliptic unit vector (the J2000 obliquity)
  const parseAngle = (s, hours) => {
    const m = String(s).replace(/[−–]/g, '-').match(/([+-]?)(\d+)\D+(\d+)\D+([\d.]+)/);
    if (!m) return NaN;
    const v = (+m[2] + +m[3] / 60 + +m[4] / 3600) * (hours ? 15 : 1);
    return m[1] === '-' ? -v : v;
  };
  const toEcl = (raDeg, decDeg) => {
    const a = rad(raDeg), d = rad(decDeg), e = rad(eps0);
    const x = Math.cos(d) * Math.cos(a), y = Math.cos(d) * Math.sin(a), z = Math.sin(d);
    return [x, y * Math.cos(e) + z * Math.sin(e), -y * Math.sin(e) + z * Math.cos(e)];
  };
  const cat = (ctx.stars() || []).map((s) => {
    const ra = parseAngle(s.RA, true), dec = parseAngle(s.Dec, false);
    return Number.isFinite(ra) && Number.isFinite(dec) ? { name: s.N, mag: parseFloat(s.V), v: toEcl(ra, dec) } : null;
  }).filter(Boolean);
  const sep = (u, v) => deg(Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))));
  // each named star's closest approaches over the drawn span (local minima of the separation from the pole of date)
  const NAMED = { north: ['Polaris', 'Kochab', 'Thuban', 'Edasich', 'Alderamin', 'Alfirk', 'Errai', 'Vega', 'Deneb'], south: ['Polaris Australis', 'Canopus'] };
  const approaches = (star, south) => {
    const d = poles.map((p) => sep(south ? [-p[0], -p[1], -p[2]] : p, star.v));
    const out = [];
    for (let k = 1; k < d.length - 1; k++) if (d[k] <= d[k - 1] && d[k] < d[k + 1]) out.push({ year: ys[k], sepDeg: d[k] });
    return out;
  };
  const named = { north: [], south: [] };
  for (const half of ['north', 'south']) for (const n of NAMED[half]) {
    const s = cat.find((c) => c.name === n); if (!s) continue;
    named[half].push({ ...s, closest: approaches(s, half === 'south') });
  }

  const title = 'The precession cone: Earth’s axis and the pole stars over one precession cycle';
  const legend = [
    { name: 'the path of the celestial pole', color: C.axial, bold: true },
    { name: 'the pole now (J2000)', color: C.axial, marker: 'dot' },
    { name: 'a named star (closest approach: year · separation)', color: C.ink, marker: 'dot' },
  ];
  const head = ctx.paperHeader(title, legend, W);
  let body = '';
  if (!cat.length) body += fiText(W / 2, head.bottom + 300, 'loading the star catalogue…', { size: 14, color: C.faint, anchor: 'middle' });
  // ── the side view: the double cone, to scale (half-angle ε₀), seen from slightly above the ecliptic.
  // screen right = the ecliptic y axis (λ = 90°: the pole now, Polaris), toward the viewer = x (λ = 0°)
  const EL = rad(14), S = 540, ccx = 380, ccy = head.bottom + 70 + S * Math.cos(rad(eps0)) * Math.cos(EL) + 70;
  const proj = (p) => [ccx + S * p[1], ccy - S * (p[2] * Math.cos(EL) - p[0] * Math.sin(EL))];
  const capN = poles, capS = poles.map((p) => [-p[0], -p[1], -p[2]]);
  // a star's place on its cap plane (z = ±cos ε₀): its true direction, scaled to the plane
  const onCap = (v, south) => { const k = (south ? -1 : 1) * Math.cos(rad(eps0)) / v[2]; return [v[0] * k, v[1] * k, v[2] * k]; };
  // the full rims (one revolution of λ) for the cone silhouettes and the cap ellipses
  const rim = (south) => Array.from({ length: 181 }, (_, k) => { const l = rad(2 * k), b = rad(90 - eps0); const p = [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)]; return proj(south ? [-p[0], -p[1], -p[2]] : p); });
  for (const south of [false, true]) {
    const r = rim(south), xs = r.map((q) => q[0]);
    const iL = xs.indexOf(Math.min(...xs)), iR = xs.indexOf(Math.max(...xs));
    body += `<path d="M${ccx},${ccy} L${r[iL][0].toFixed(1)},${r[iL][1].toFixed(1)} L${r[iR][0].toFixed(1)},${r[iR][1].toFixed(1)} Z" fill="#e5e9ef" opacity="0.7"/>`;
    body += `<path d="M${r.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' L')} Z" fill="#d8dee6" stroke="${C.faint}" stroke-width="1"/>`;
  }
  // what the cone circles: the fixed ecliptic pole (the cone's axis) and Earth's orbit plane at Earth
  const zTop = proj([0, 0, 1.08]), zBot = proj([0, 0, -1.08]);
  body += fiLine(zBot[0], zBot[1], zTop[0], zTop[1], { color: C.soft, width: 1.2, dash: '2,4' });
  const zMid = proj([0, 0, 0.55]);   // (the label mid-line: the top end carries the far-side star labels)
  body += fiText(zMid[0] - 8, zMid[1], 'the ecliptic pole (fixed):', { size: 11.5, color: C.soft, anchor: 'end', halo: true });
  body += fiText(zMid[0] - 8, zMid[1] + 15, 'the axis circles it', { size: 11.5, color: C.soft, anchor: 'end', halo: true });
  const orbit = Array.from({ length: 121 }, (_, k) => { const l = rad(3 * k); return proj([0.42 * Math.cos(l), 0.42 * Math.sin(l), 0]); });
  body += `<path d="M${orbit.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' L')} Z" fill="none" stroke="${C.soft}" stroke-width="1.1" stroke-dasharray="5,4"/>`;
  const oR = orbit[30];   // λ = 90°: the ellipse's right end
  body += fiText(oR[0] + 10, oR[1] + 4, 'Earth’s orbit plane (the ecliptic)', { size: 11.5, color: C.soft });
  // the pole's path on both rims (the drawn span), the direction of motion, the pole now
  const nowK = Math.round((2000 - Y0) / STEP);
  for (const [cap, south] of [[capN, false], [capS, true]]) {
    const pts = cap.map(proj);
    body += fiPath(pts, { color: C.axial, width: 2.2 });
    const kB = Math.round((8000 - Y0) / STEP);
    body += fiArrowHead(pts[kB - 3], pts[kB], { color: C.axial, head: 12 });
    const pn = pts[nowK];
    body += fiCircle(pn[0], pn[1], 6.5, { fill: C.axial, stroke: '#ffffff', width: 1.5 });
    body += fiText(pn[0] + (south ? -10 : 10), pn[1] + (south ? -12 : -12), 'now (J2000)', { size: 11.5, color: C.axial, weight: '600', anchor: south ? 'end' : 'start', halo: true });
  }
  // Earth and its axis now (from the south rim's pole to the north rim's), with the spin
  const aN = proj(capN[nowK]), aS = proj(capS[nowK]);
  body += fiLine(aS[0], aS[1], aN[0], aN[1], { color: C.ink, width: 1.6, dash: '6,4' });
  body += fiBody(ccx, ccy, 20, C.earth);
  const axU = [aN[0] - ccx, aN[1] - ccy], axL = Math.hypot(axU[0], axU[1]);
  body += fiLine(ccx - (36 * axU[0]) / axL, ccy - (36 * axU[1]) / axL, ccx + (36 * axU[0]) / axL, ccy + (36 * axU[1]) / axL, { color: C.ink, width: 2.4 });
  body += fiText(ccx + 28, ccy + 34, 'Earth', { size: 13, color: C.soft });
  // the daily spin about the axis (a small ellipse round it, anticlockwise seen from the north)
  {
    const ux = axU[0] / axL, uy = axU[1] / axL, c0 = [ccx + 30 * ux, ccy + 30 * uy];
    const pts = []; for (let k = 0; k <= 26; k++) { const t = rad(200 + (300 * k) / 26); pts.push([c0[0] + 16 * Math.cos(t) * -uy + 5 * Math.sin(t) * ux, c0[1] + 16 * Math.cos(t) * ux + 5 * Math.sin(t) * uy]); }
    body += fiPath(pts, { color: C.ink, width: 1.3 }) + fiArrowHead(pts[pts.length - 2], pts[pts.length - 1], { color: C.ink, head: 7 });
    body += fiText(c0[0] - 22, c0[1] - 4, 'daily spin', { size: 11, color: C.soft, anchor: 'end' });
  }
  // the named stars on their caps, labels spread clear of each other with leader lines
  const placeLabels = (list, south) => {
    const items = list.map((s) => { const p = proj(onCap(s.v, south)); return { s, p }; }).sort((a, b) => a.p[0] - b.p[0]);
    const rimPts = rim(south), cyCap = rimPts.reduce((a, q) => a + q[1], 0) / rimPts.length;
    let out = '';
    const up = items.filter((it) => it.p[1] <= cyCap), dn = items.filter((it) => it.p[1] > cyCap);
    for (const [group, sign] of [[up, -1], [dn, 1]]) {
      // spread left to right 118 px apart, then pull back from the page's right edge (keeping the spacing)
      const lx = group.map((it) => it.p[0]);
      for (let i = 1; i < lx.length; i++) lx[i] = Math.max(lx[i], lx[i - 1] + 118);
      const XMAX = W - 110;
      if (lx.length && lx[lx.length - 1] > XMAX) { lx[lx.length - 1] = XMAX; for (let i = lx.length - 2; i >= 0; i--) lx[i] = Math.min(lx[i], lx[i + 1] - 118); }
      group.forEach((it, i) => {
        const ly = cyCap + sign * (78 + (i % 2) * 36);
        const best = it.s.closest.filter((c) => c.sepDeg < 10);
        const when = best.length ? best.map((c) => fiYearLabelRounded(c.year, 100)).join(' · ') : '—';
        const sepFmt = (d) => `${d.toFixed(d < 1 ? 2 : 1)}°`;   // two decimals below 1°
        const sepTxt = best.length ? sepFmt(Math.min(...best.map((c) => c.sepDeg))) : `${sepFmt(Math.min(...it.s.closest.map((c) => c.sepDeg)))} at best`;
        out += fiLine(it.p[0], it.p[1], lx[i], ly + (sign < 0 ? 16 : -14), { color: C.faint, width: 0.9 });
        out += `<text x="${it.p[0].toFixed(1)}" y="${(it.p[1] + 5).toFixed(1)}" font-family="${FONT}" font-size="15" fill="#111" text-anchor="middle">★</text>`;
        out += fiText(lx[i], ly, it.s.name, { size: 12, weight: '600', anchor: 'middle', halo: true });
        out += fiText(lx[i], ly + 14, `${when} · ${sepTxt}`, { size: 10.5, color: C.soft, anchor: 'middle', halo: true });
      });
    }
    return out;
  };
  body += placeLabels(named.north, false) + placeLabels(named.south, true);
  // the cone's message, beside it
  const pol = named.north.find((s) => s.name === 'Polaris'), vega = named.north.find((s) => s.name === 'Vega');
  const nearPol = pol && pol.closest.find((c) => c.year > 2000), nearVega = vega && vega.closest.find((c) => c.year > 2000);
  const tP = ctx.axialPrecessionYears(2000);
  // (the right column, beside the cone's waist: the inset, then the cone's message under it)
  const tx = ccx + 300, ty = ccy + 130;
  body += fiText(tx, ty, 'Earth’s axis now points (near) to Polaris', { size: 13.5, weight: '600' });
  if (nearPol) body += fiText(tx, ty + 18, `closest around ${fiYearLabelRounded(nearPol.year, 100)} · ${nearPol.sepDeg.toFixed(2)}° from the pole`, { size: 12, color: C.soft });
  if (nearVega) body += fiText(tx, ty + 48, `in ~${fiNum(fiRoundTo(nearVega.year - 2000, 100), 0)} years it points (near) to Vega`, { size: 13.5, weight: '600' });
  if (nearVega) body += fiText(tx, ty + 66, `around ${fiYearLabelRounded(nearVega.year, 100)} · ${nearVega.sepDeg.toFixed(1)}° from the pole`, { size: 12, color: C.soft });
  body += fiText(tx, ty + 96, `one turn of the cone: T = ${fiNum(tP, 0)} yr (J2000)`, { size: 12.5 });
  body += fiText(tx, ty + 114, `the cone’s half-angle: ε = ${eps0.toFixed(2)}° (to scale)`, { size: 12, color: C.soft });
  // ── the inset: the same northern path as a sky map, seen from Earth looking up
  const R = 150, RMAX = 40;
  const charts = [{ half: 'north', cx: W - 40 - R, label: 'The same northern path as a sky map', sign: 1 }];
  const cy = ccy - 140;
  for (const ch of charts) {
    const { cx, sign } = ch, south = sign < 0;
    // seen from inside the sky: longitude runs counter-clockwise around the north pole, clockwise around the south
    // (screen y up = sin λ for both; the south chart mirrors x, so its longitude runs clockwise)
    const xy = (v) => {
      const colat = deg(Math.acos(Math.max(-1, Math.min(1, south ? -v[2] : v[2]))));
      const lon = Math.atan2(v[1], v[0]), r = (R * colat) / RMAX;
      return [cx + (south ? -1 : 1) * r * Math.cos(lon), cy - r * Math.sin(lon)];
    };
    body += fiText(cx, cy - R - 12, ch.label, { size: 12.5, weight: '600', anchor: 'middle' });
    body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#f8fafc" stroke="${C.rule}" stroke-width="1.2"/>`;
    for (const c of [10, 20, 30]) body += fiCircle(cx, cy, (R * c) / RMAX, { stroke: '#e5e7eb', width: 1 });
    body += fiText(cx + 4, cy - (R * 30) / RMAX - 4, '30°', { size: 10, color: C.faint });
    // the background stars within the chart, sized by magnitude
    for (const s of cat) {
      const w = south ? -s.v[2] : s.v[2]; if (w < Math.cos(rad(RMAX))) continue;
      const p = xy(s.v), r = Math.max(0.8, 3.4 - 0.6 * (Number.isFinite(s.mag) ? s.mag : 4));
      body += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}" fill="#9ca3af"/>`;
    }
    // the pole's path with millennium ticks, and the pole now
    const pts = poles.map((p) => xy(south ? [-p[0], -p[1], -p[2]] : p));
    body += fiPath(pts, { color: C.axial, width: 2 });
    // ticks on calendar years: 4000 BC and 2000 BC (astronomical −3999, −1999), then every 2,000 AD; labelled every 4,000
    const TICKS = [[-3999, null], [-1999, '2,000 BC'], ...Array.from({ length: 14 }, (_, k) => { const y = 2000 * (k + 1); return [y, (y - 2000) % 4000 === 0 && y > 2000 && y <= 26000 ? `${fiNum(y)} AD` : null]; })];
    for (const [y, lab] of TICKS) {
      const k = Math.round((y - Y0) / STEP); if (k < 0 || k >= pts.length) continue;
      const p = pts[k], dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1;
      body += fiLine(p[0] - (5 * dx) / L, p[1] - (5 * dy) / L, p[0] + (5 * dx) / L, p[1] + (5 * dy) / L, { color: C.axial, width: 1.4 });
      // (on the north chart Alfirk's dot sits on the 6,000 AD tick — its own date, 5,900 AD, says it)
      if (lab && (y === 10000 || y === 18000 || y === 26000)) body += fiText(p[0] - (16 * dx) / L, p[1] - (16 * dy) / L + 4, lab, { size: 9.5, color: C.axial, anchor: 'middle', halo: true });
    }
    const pNow = pts[Math.round((2000 - Y0) / STEP)];
    body += fiCircle(pNow[0], pNow[1], 6, { fill: C.axial, stroke: '#ffffff', width: 1.5 });
    // the precession's direction along the path (the pole moves with decreasing longitude)
    const kA = Math.round((9000 - Y0) / STEP), kB = kA + 60;
    if (pts[kB]) body += fiArrowHead(pts[kB - 2], pts[kB], { color: C.axial, head: 11 });
    // the named stars, names only (their dates are on the cone)
    for (const s of named[ch.half]) {
      const p = xy(s.v), dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1;
      body += fiBody(p[0], p[1], 3.2, '#111111');
      const out = L < 20 ? [1, -1] : [dx / L, dy / L];
      body += fiText(p[0] + 9 * out[0], p[1] + 9 * out[1] + 3, s.name, { size: 9.5, anchor: out[0] > 0.3 ? 'start' : out[0] < -0.3 ? 'end' : 'middle', halo: true });
    }
    body += fiText(cx, cy + R + 16, 'seen from Earth looking up · ticks every 2,000 yr', { size: 10.5, color: C.soft, anchor: 'middle' });
  }
  // the stated limits, under the cone
  let vy = ccy + S * Math.cos(rad(eps0)) * Math.cos(EL) + 170;
  body += fiText(W / 2, vy, `the pole circles the ecliptic pole at ε = ${eps0.toFixed(2)}° on the model’s realized precession rate`, { size: 12, anchor: 'middle', color: C.soft });
  vy += 20;
  body += fiText(W / 2, vy, 'star positions J2000, proper motion neglected (Vega drifts ~1° in 12,000 yr)', { size: 12, anchor: 'middle', color: C.soft });
  vy += 18;
  body += fiText(W / 2, vy, 'the tilt to the J2000 ecliptic held at ε₀', { size: 12, anchor: 'middle', color: C.soft });
  const H = Math.round(vy + 50);
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { eps0, named: Object.fromEntries(['north', 'south'].map((h) => [h, named[h].map((s) => ({ name: s.name, closest: s.closest }))])), catalogueSize: cat.length },
    sources: 'the pole of date: the model’s realized spin-axis precession (lunisolar.spinAxisInertialRateMeanArcsecPerYr) at ε₀ · the stars: public/input/stars.json (the scene’s catalogue, J2000)',
  };
}

// ── 12 · 15_Antarctica_ice_core — the ice cores, and the model ───────────────
/**
 * Three strips on one time axis (the last 400 kyr, present = 1950): (a) the
 * Antarctic temperature anomaly — EPICA Dome C (Jouzel 2007) and Vostok
 * (Petit 1999), data only; (b) atmospheric CO₂ — the EPICA composite (Bereiter
 * 2015) and Vostok, data only; (c) the benthic δ¹⁸O stack LR04 (data) with the
 * model's climate formula on it (the shipped coefficients, L1 + L2 + L3) — the
 * quantity the model predicts. No model curve is drawn on (a) or (b).
 */
function renderIceCores(ctx) {
  const W = 1100, C = FI_COLORS, SPAN = 400;
  const ic = ctx.iceCores(), ep = ctx.epicaCO2(), lr = ctx.lr04();
  const title = 'Antarctic ice cores over the last 400,000 years — and the model';
  const legend = [
    { name: 'EPICA Dome C (data)', color: C.ink, bold: true },
    { name: 'Vostok (data)', color: C.faint, bold: true },
    { name: 'LR04 benthic δ¹⁸O (data)', color: C.axial, bold: true },
    { name: 'the model’s climate formula', color: C.apsidal, bold: true },
    { name: 'warm periods (EPICA Dome C above −1.5 °C)', color: C.sun, marker: 'rect' },
  ];
  const head = ctx.paperHeader(title, legend, W);
  let body = '';
  const L = 90, R = W - 40, PW = R - L;
  const X = (kyr) => L + (PW * (SPAN - kyr)) / SPAN;          // 400 kyr ago at the left
  const within = (ages, vals) => ages.map((a, k) => [a, vals[k]]).filter((p) => p[0] <= SPAN && Number.isFinite(p[1])).sort((a, b) => a[0] - b[0]);
  // the warm periods, from the data (set below from EPICA Dome C): shaded under the curves of every strip
  let warm = [];
  // (flip: the axis runs downward — the curves AND the tick labels, so a reversed axis reads true)
  const strip = (top, h, lo, hi, ylab, ticks, series, note, flip = false) => {
    const Y0f = (v) => top + h * (1 - (v - lo) / (hi - lo));
    const Y = flip ? (v) => Y0f(lo + hi - v) : Y0f;
    let s = `<rect x="${L}" y="${top}" width="${PW}" height="${h}" fill="#fafafa" stroke="#e5e7eb"/>`;
    for (const [a, b] of warm) s += `<rect x="${X(b).toFixed(1)}" y="${top}" width="${(X(a) - X(b)).toFixed(1)}" height="${h}" fill="${C.sun}" opacity="0.10"/>`;
    for (const t of ticks) s += fiLine(L, Y(t), R, Y(t), { color: '#eceff3', width: 1 }) + fiText(L - 8, Y(t) + 4, String(t), { size: 11, color: C.soft, anchor: 'end' });
    s += fiText(26, top + h / 2, ylab, { size: 12, color: C.soft, anchor: 'middle', rotate: -90 });
    for (const sr of series) if (sr.pts && sr.pts.length > 1) s += fiPath(sr.pts.map((p) => [X(p[0]), Y(p[1])]), { color: sr.color, width: sr.width || 1.4 });
    if (note) s += fiText(L + 8, top + 16, note, { size: 11.5, color: C.soft });
    for (let k = 0; k <= SPAN; k += 50) { const x = X(k); s += fiLine(x, top + h, x, top + h + 4, { color: C.faint, width: 1 }); }
    return { svg: s, Y };
  };
  const loading = !ic || !ep || !lr;
  if (loading) body += fiText(W / 2, head.bottom + 200, 'loading the records…', { size: 14, color: C.faint, anchor: 'middle' });
  const H1 = 250, GAP = 70;
  const t1 = head.bottom + 40, t2 = t1 + H1 + GAP, t3 = t2 + H1 + GAP;
  // (a) temperature
  const edc = ic ? within(ic.epicaDomeCTemperature.ageKyrBP, ic.epicaDomeCTemperature.temperatureAnomalyC) : [];
  const vosT = ic ? within(ic.vostokTemperature.ageKyrBP, ic.vostokTemperature.temperatureAnomalyC) : [];
  // the warm periods: EPICA Dome C warmer than −1.5 °C, runs merged across gaps under 2 kyr, runs under 1.5 kyr dropped
  const WARM_C = -1.5;
  for (const [a, v] of edc) {
    if (v <= WARM_C) continue;
    const last = warm[warm.length - 1];
    if (last && a - last[1] < 2) last[1] = a; else warm.push([a, a]);
  }
  warm = warm.filter(([a, b]) => b - a >= 1.5).map(([a, b]) => [Math.max(0, a - 0.25), Math.min(SPAN, b + 0.25)]);
  body += fiText(L, t1 - 12, 'Antarctic temperature, difference from today (°C)', { size: 14, weight: '600' });
  const sa = strip(t1, H1, -11, 5, '°C', [-10, -8, -6, -4, -2, 0, 2, 4], [{ pts: vosT, color: C.faint, width: 1.2 }, { pts: edc, color: C.ink, width: 1.5 }]);
  body += sa.svg;
  // the Last Glacial Maximum: the coldest EPICA Dome C bin between 15 and 30 kyr ago
  const lgm = edc.filter((p) => p[0] >= 15 && p[0] <= 30).reduce((m, p) => (!m || p[1] < m[1] ? p : m), null);
  if (lgm) {
    // the label in the empty warm corner above the last 60 kyr, an arrow down to the coldest point (as the original)
    const x = X(lgm[0]), y = sa.Y(lgm[1]), lx = X(62), ly = sa.Y(3.6);
    body += fiText(lx, ly, 'Last Glacial Maximum', { size: 12.5, weight: '600', color: C.accent, anchor: 'end', halo: true });
    body += fiText(lx, ly + 16, `~${fiNum(fiRoundTo(lgm[0], 1), 0)} kyr ago · ${lgm[1].toFixed(1)} °C`, { size: 11.5, color: C.accent, anchor: 'end', halo: true });
    body += fiLine(lx + 4, ly + 6, x - 3, y - 10, { color: C.accent, width: 1.3 }) + fiArrowHead([x - 9, y - 18], [x - 2, y - 7], { color: C.accent, head: 9 });
  }
  // (b) CO₂ — the exporter (scripts/export_epica_browser.py) starts the 2-kyr grid at 2 kyr BP: a 0-kyr
  // bin averaged the industrial-era samples in (the composite runs to 2001 AD). The > 0 filter stays as a
  // guard; the strip shows the natural cycle and says what it leaves out
  const epc = ep ? within(ep.age_kyr_BP, ep.co2_ppm).filter((p) => p[0] > 0) : [];
  const vosC = ic ? within(ic.vostokCO2.ageKyrBP, ic.vostokCO2.co2Ppm) : [];
  body += fiText(L, t2 - 12, 'Atmospheric CO₂ (ppm)', { size: 14, weight: '600' });
  body += strip(t2, H1, 170, 310, 'ppm', [180, 200, 220, 240, 260, 280, 300], [{ pts: vosC, color: C.faint, width: 1.2 }, { pts: epc, color: C.ink, width: 1.5 }]).svg;
  body += fiText(R - 6, t2 + 16, 'the industrial rise (to ~370 ppm by 2001) is not shown', { size: 11, color: C.soft, anchor: 'end', halo: true });
  // (c) δ¹⁸O: LR04 and the model's formula (up = warmer: the axis is flipped)
  const lrS = lr ? within(lr.age_kyr_BP, lr.d18o_per_mille) : [];
  const model = []; for (let k = 0; k <= SPAN; k += 1) model.push([k, ctx.climateD18O(k, 'all')]);
  let r = null;
  if (lrS.length) {
    const pairs = lrS.map((p) => [p[1], ctx.climateD18O(p[0], 'all')]);
    const n = pairs.length, mx = pairs.reduce((a, p) => a + p[0], 0) / n, my = pairs.reduce((a, p) => a + p[1], 0) / n;
    const sxy = pairs.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0), sxx = pairs.reduce((a, p) => a + (p[0] - mx) ** 2, 0), syy = pairs.reduce((a, p) => a + (p[1] - my) ** 2, 0);
    r = sxy / Math.sqrt(sxx * syy);
  }
  body += fiText(L, t3 - 12, `Benthic δ¹⁸O (‰, up = warmer) — what the model predicts${r === null ? '' : ` · r = ${r.toFixed(2)} against LR04 (0–400 kyr)`}`, { size: 14, weight: '600' });
  body += strip(t3, H1, 3.0, 5.2, '‰', [3.0, 3.5, 4.0, 4.5, 5.0], [{ pts: lrS, color: C.axial, width: 1.4 }, { pts: model, color: C.apsidal, width: 2.2 }], null, true).svg;
  // the shared time axis
  for (let k = 0; k <= SPAN; k += 50) body += fiText(X(k), t3 + H1 + 18, k ? `${k}` : '0', { size: 11, color: C.soft, anchor: 'middle' });
  body += fiText(L + PW / 2, t3 + H1 + 38, 'thousand years before present (present = 1950)', { size: 12, color: C.soft, anchor: 'middle' });
  // what the figure claims, and what it does not
  let vy = t3 + H1 + 72;
  body += fiText(W / 2, vy, 'The model predicts the δ¹⁸O record (ice volume and deep-ocean temperature) — not Antarctic °C or ppm:', { size: 12.5, anchor: 'middle' });
  vy += 18;
  body += fiText(W / 2, vy, 'no model curve is drawn on those strips', { size: 12.5, anchor: 'middle' });
  vy += 22;
  body += fiText(W / 2, vy, 'data: EPICA Dome C, Jouzel et al. 2007 · Vostok, Petit et al. 1999 (NOAA NCEI)', { size: 11.5, anchor: 'middle', color: C.soft });
  vy += 16;
  body += fiText(W / 2, vy, 'CO₂ composite, Bereiter et al. 2015 (NOAA NCEI) · LR04, Lisiecki & Raymo 2005', { size: 11.5, anchor: 'middle', color: C.soft });
  const H = vy + 46;
  return {
    svg: fiPage(W, H, head.svg, body),
    numbers: { warmPeriodsKyrBP: warm, lgmKyrBP: lgm ? lgm[0] : null, lgmTempC: lgm ? lgm[1] : null, modelVsLR04r: r, nEDC: edc.length, nVostokT: vosT.length, nCO2: epc.length, nVostokCO2: vosC.length, nLR04: lrS.length, loading },
    sources: 'the records: public/input/ice-core-data.json (NOAA: EPICA Dome C, Vostok), epica-co2-data.json, lr04-data.json · the model: the climate formula’s shipped coefficients (CLIMATE_FORMULA_COEFFS, the LR04 regimes)',
  };
}

// ── the registry ─────────────────────────────────────────────────────────────
/** The twelve figures (plan 17 §3). `render` is null until the figure is built. */
export const FRAMEWORK_IMAGES = [
  { id: 'center-aa', file: '02_CenterAA', group: 'Earth’s orbit and precession', label: 'Eccentricity vector — Earth-centred', render: (ctx) => renderEccentricityLoop(ctx) },
  { id: 'center-03', file: '02_Center03', group: 'Earth’s orbit and precession', label: 'Eccentricity vector — Sun-centred', render: null },
  { id: 'earth-sun-orbit', file: '02_Earth_Sun_orbit', group: 'Earth’s orbit and precession', label: 'The Sun’s path seen from Earth', render: (ctx) => renderSunPath(ctx) },
  { id: 'bigger-picture', file: '03_bigger_picture', group: 'Earth’s orbit and precession', label: 'The cycles at a glance', render: (ctx) => renderCyclesAtAGlance(ctx) },
  { id: 'polestars', file: '03_great_year_polestars_01', group: 'Earth’s orbit and precession', label: 'The precession cone and the pole stars', render: (ctx) => renderPoleStars(ctx) },
  { id: 'precession-seasons', file: '03_Precession_and_seasons', group: 'Earth’s orbit and precession', label: 'Seasons against perihelion', render: (ctx) => renderSeasonsVsPerihelion(ctx) },
  { id: 'coin-paradox', file: '04_coin_paradox_total', group: 'Days, years, Moon and climate', label: 'The coin rotation paradox', render: (ctx) => renderCoinParadox(ctx) },
  { id: 'orbit-year', file: '04_Earth_Orbit_Year', group: 'Days, years, Moon and climate', label: 'Days and years', render: (ctx) => renderDaysAndYears(ctx) },
  { id: 'precession-cw', file: '04_Earth_precession_CW', group: 'Days, years, Moon and climate', label: 'Axial meets apsidal', render: (ctx) => renderAxialMeetsApsidal(ctx) },
  { id: 'lunar-standstill', file: '08_Moon_Lunar_Standstill', group: 'Days, years, Moon and climate', label: 'The lunar standstills', render: (ctx) => renderLunarStandstill(ctx) },
  { id: 'perihelia-2000', file: '09_Perihelion_21062000', group: 'Days, years, Moon and climate', label: 'The perihelia at the June solstice', render: (ctx) => renderPerihelia(ctx) },
  { id: 'ice-core', file: '15_Antarctica_ice_core', group: 'Days, years, Moon and climate', label: 'Antarctic ice cores and the model', render: (ctx) => renderIceCores(ctx) },
];
FRAMEWORK_IMAGES[1].render = (ctx) => renderEccentricityLoop(ctx, { sunCentred: true });
