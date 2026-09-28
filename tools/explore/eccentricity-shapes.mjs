#!/usr/bin/env node
// THE ECCENTRICITY SHAPES — the owner's wobble-centre picture (public/img/02_CenterAA.png,
// hu) generalized to every planet, drawn from the SHIPPED planet chains (the elements of
// date the simulator renders from — @essrt/physics CHAIN_ARTIFACT, the governed N-body
// artifact: Wisdom–Holman + 1PN, ±500 kyr, NAFF secular modes anchored on the J2000
// elements). ONE home for the website's figure 109_shapes_free.svg (npm run figures:nbody).
//
// Each planet's eccentricity vector z(t) = e·e^{iϖ} traces a shape in the (e·cosϖ, e·sinϖ)
// plane. The perihelion is the direction of z; its rate is the phase rate of the trace —
// fast where the trace runs around the origin at large radius, whipping or retrograde where
// a counter-vector drags it back (doc 109 §11–12).
//
// Drawn per planet: the faint full trace (the chain's z(t) over its ±500-kyr span), the bold
// TWO-VECTOR shape (the two largest secular modes at DISTINCT frequencies — a mode split by
// the frequency analysis into two close lines is one vector, not two; the rule below), the
// two arrows at their J2000 phases (A₁ from the origin, A₂ from A₁'s tip — the owner's Earth
// diagram), the J2000 position (exact: the chain's own e and ϖ at 2000) with its direction of
// motion, and the readings (A, g, rate now / mean over the span, % of the span retrograde,
// dominance A₁/A₂).
//
//   node tools/explore/eccentricity-shapes.mjs [out=<svg path>] [modes=<research table>]
//   ESSRT_SITE_DIR=<holisticuniverse checkout>  →  writes public/img/109_shapes_free.svg there
//
// `modes=` draws a research NAFF table instead (the 2026-08 plates were cut from
// tools/explore/naff-modes-ecliptic-1000000-gr.local.json); the default is the shipped chain,
// so the published figure can never drift from the model.
//
// RESULT (chain, 2026-09): dominance sorts the system — Mercury and Mars own one big vector
// and ride near their long-term means; Venus and Earth are near-equal pairs whose traces pass
// the origin, so their instantaneous rates carry no structural information; Earth's shape
// cycle is the g₂ − g₅ beat, the ~405-kyr metronome of the rock record. Doc 109 §11–12, §17.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPlanetChainsFromArtifactData, computePlanetElementsAtYear, CHAIN_ARTIFACT } from '@essrt/physics';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const SITE = process.env.ESSRT_SITE_DIR;
const OUT = KV.out || (SITE ? SITE.replace(/\/$/, '') + '/public/img/109_shapes_free.svg' : ROOT + 'tools/explore/eccentricity-shapes.local.svg');
const R2D = 180 / Math.PI, AS = 3600, D2R = Math.PI / 180;
const SPLIT_ARCSEC_PER_YR = 0.5;   // two modes closer than this are one split line, not two vectors

// ── the source: shipped chain (default) or a research mode table ────────────
/** @type {Record<string, {zFull:(t:number)=>number[], modes:{g:number,A:number,ph:number}[], span:number}>} */
const bodies = {};
const order = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
let sourceLabel;
if (KV.modes) {
  const M = JSON.parse(readFileSync(KV.modes, 'utf8'));
  sourceLabel = `research NAFF table ${KV.modes.split('/').pop()}`;
  for (const k of order) {
    const z = M.modes[k].z;
    bodies[k] = {
      zFull: (t) => { let re = 0, im = 0; for (const f of z) { const c = Math.cos(f.omegaRadPerYr * t), s = Math.sin(f.omegaRadPerYr * t); re += f.re * c - f.im * s; im += f.re * s + f.im * c; } return [re, im]; },
      modes: z.map((f) => ({ g: f.omegaRadPerYr, A: Math.hypot(f.re, f.im), ph: Math.atan2(f.im, f.re) })),
      span: 1e6,
    };
  }
} else {
  const chains = buildPlanetChainsFromArtifactData(CHAIN_ARTIFACT);
  const span = CHAIN_ARTIFACT.meta && CHAIN_ARTIFACT.meta.spanYears ? CHAIN_ARTIFACT.meta.spanYears : 1e6;
  sourceLabel = `the shipped planet chains (@essrt/physics CHAIN_ARTIFACT — Wisdom–Holman + 1PN, ±${(span / 2e3).toFixed(0)} kyr, NAFF modes anchored on J2000)`;
  for (const k of order) {
    const ch = chains[k];
    // the SHAPE is secular: the chain with its short-period terms stripped (the
    // great-inequality wiggles would otherwise dominate a ±50-yr rate stencil —
    // Neptune read 70,000 ″/cy "now"); the J2000 dot is the full osculating point
    const sec = { ...ch, periodicTerms: undefined };
    const zOf = (el) => [el.e * Math.cos(el.lonPeriEclipticDeg * D2R), el.e * Math.sin(el.lonPeriEclipticDeg * D2R)];
    bodies[k] = {
      zFull: (t) => zOf(computePlanetElementsAtYear(2000 + t, sec, chains)),   // t in years from J2000
      zNow: zOf(computePlanetElementsAtYear(2000, ch, chains)),                // the osculating J2000 point
      modes: (ch.secularModes && ch.secularModes.z ? ch.secularModes.z : []).map((f) => ({ g: f.omegaRadPerYr, A: Math.hypot(f.re, f.im), ph: Math.atan2(f.im, f.re) })),
      span,
    };
  }
}

// ── the plate ─────────────────────────────────────────────────────────────────
const PW = 350, PH = 372, COLS = 4, ROWS = 2, W = COLS * PW, H = ROWS * PH + 46 + 18;   // + a credit strip
const COL = { trace: '#cfcfcf', shape: '#1a1a1a', a1: '#b3542e', a2: '#2e6fb3', now: '#b3542e', text: '#222', dim: '#666', bg: '#ffffff' };   // white ground (owner: no cream)
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, system-ui, sans-serif">`;
svg += `<rect width="${W}" height="${H}" fill="${COL.bg}"/>`;
svg += `<text x="${W / 2}" y="26" text-anchor="middle" font-size="17" font-weight="700" fill="${COL.text}">The eccentricity shapes — each planet's perihelion rides its own vector pattern</text>`;
svg += `<text x="${W / 2}" y="42" text-anchor="middle" font-size="11" fill="${COL.dim}">z = e·e^{iϖ} from ${KV.modes ? 'a research NAFF table' : 'the model’s own N-body chains (the elements the simulator renders)'}. Bold: the two-vector shape. Faint: the full trace over the chain’s span. Dashed: the next 30 kyr. Arrows: the two vectors at J2000, as in the Earth wobble-centre diagram.</text>`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
order.forEach((k, idx) => {
  const B = bodies[k];
  const sorted = [...B.modes].sort((a, b) => b.A - a.A);
  const m1 = sorted[0];
  // the second VECTOR: the largest mode at a distinct frequency (a split line is one vector)
  const m2 = sorted.slice(1).find((m) => Math.abs(m.g - m1.g) * R2D * AS > SPLIT_ARCSEC_PER_YR) || sorted[1];
  const z2 = (t) => [m1.A * Math.cos(m1.g * t + m1.ph) + m2.A * Math.cos(m2.g * t + m2.ph), m1.A * Math.sin(m1.g * t + m1.ph) + m2.A * Math.sin(m2.g * t + m2.ph)];
  const beat = 2 * Math.PI / Math.abs(m1.g - m2.g);
  const half = B.span / 2;
  // rate stats over the source's span (±50-yr central difference of the full trace)
  const rate = (t) => { const [r1, i1] = B.zFull(t - 50), [r2, i2] = B.zFull(t + 50); let d = Math.atan2(i2, r2) - Math.atan2(i1, r1); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d * R2D * AS; };
  const rates = []; for (let t = -half; t <= half; t += 1000) rates.push(rate(t));
  const meanRate = rates.reduce((s, x) => s + x, 0) / rates.length;
  const retro = 100 * rates.filter((x) => x * Math.sign(m1.g) < 0).length / rates.length;

  const x0 = (idx % COLS) * PW, y0 = 46 + Math.floor(idx / COLS) * PH, cx = x0 + PW / 2, cy = y0 + 168;
  const rmax = Math.max(m1.A + m2.A, ...Array.from({ length: 400 }, (_, i) => Math.hypot(...B.zFull(-half + i * (B.span / 400))))) * 1.12;
  const S = 140 / rmax, X = (z) => cx + z[0] * S, Y = (z) => cy - z[1] * S;
  // faint full trace over the source's span
  const n = 1600;
  let p = ''; for (let i = 0; i <= n; i++) { const z = B.zFull(-half + B.span * i / n); p += (i ? 'L' : 'M') + X(z).toFixed(1) + ',' + Y(z).toFixed(1); }
  svg += `<path d="${p}" fill="none" stroke="${COL.trace}" stroke-width="0.7" opacity="0.9"/>`;
  // bold two-vector shape over one beat
  p = ''; for (let i = 0; i <= 900; i++) { const z = z2(beat * i / 900); p += (i ? 'L' : 'M') + X(z).toFixed(1) + ',' + Y(z).toFixed(1); }
  svg += `<path d="${p}" fill="none" stroke="${COL.shape}" stroke-width="1.5"/>`;
  // origin (e = 0)
  svg += `<line x1="${cx - 4}" y1="${cy}" x2="${cx + 4}" y2="${cy}" stroke="${COL.dim}" stroke-width="1"/><line x1="${cx}" y1="${cy - 4}" x2="${cx}" y2="${cy + 4}" stroke="${COL.dim}" stroke-width="1"/>`;
  // vectors at J2000: A₁ from the origin, A₂ from A₁'s tip
  const v1 = [m1.A * Math.cos(m1.ph), m1.A * Math.sin(m1.ph)], vz = z2(0);
  const arrow = (xa, ya, xb, yb, color) => {
    const dx = xb - xa, dy = yb - ya, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    return `<line x1="${xa.toFixed(1)}" y1="${ya.toFixed(1)}" x2="${xb.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="${color}" stroke-width="1.6"/>`
      + `<path d="M${xb.toFixed(1)},${yb.toFixed(1)} l${(-7 * ux + 3 * uy).toFixed(1)},${(-7 * uy - 3 * ux).toFixed(1)} l${(6 * uy).toFixed(1)},${(-6 * ux).toFixed(1)} z" fill="${color}"/>`;
  };
  svg += arrow(cx, cy, X(v1), Y(v1), COL.a1);
  svg += arrow(X(v1), Y(v1), X(vz), Y(vz), COL.a2);
  // the next 30 kyr of the full trace (dashed)
  let pf = ''; for (let i = 0; i <= 300; i++) { const zq = B.zFull(i * 100); pf += (i ? 'L' : 'M') + X(zq).toFixed(1) + ',' + Y(zq).toFixed(1); }
  svg += `<path d="${pf}" fill="none" stroke="${COL.now}" stroke-width="1.6" stroke-dasharray="5,3" opacity="0.85"/>`;
  // J2000 position (the osculating point where the source has one) + direction of motion
  const zn = B.zNow || B.zFull(0), zn2 = B.zFull(600);
  const zs = B.zFull(0);   // the secular point the trace passes at J2000 (the arrow rides the trace)
  svg += `<circle cx="${X(zn).toFixed(1)}" cy="${Y(zn).toFixed(1)}" r="4" fill="${COL.now}"/>`;
  svg += arrow(X(zs), Y(zs), X(zs) + (X(zn2) - X(zs)) * 18, Y(zs) + (Y(zn2) - Y(zs)) * 18, COL.now);
  // labels
  const name = k[0].toUpperCase() + k.slice(1);
  const kyr = (yr) => (yr / 1000).toFixed(0);
  svg += `<text x="${cx}" y="${y0 + 16}" text-anchor="middle" font-size="14" font-weight="700" fill="${COL.text}">${name}</text>`;
  svg += `<text x="${cx}" y="${y0 + 30}" text-anchor="middle" font-size="9.5" fill="${COL.a1}">A₁ ${m1.A.toFixed(4)} at ${(m1.g * R2D * AS).toFixed(2)} ″/yr (${kyr(2 * Math.PI / Math.abs(m1.g))} kyr)</text>`;
  svg += `<text x="${cx}" y="${y0 + 42}" text-anchor="middle" font-size="9.5" fill="${COL.a2}">A₂ ${m2.A.toFixed(4)} at ${(m2.g * R2D * AS).toFixed(2)} ″/yr (${kyr(2 * Math.PI / Math.abs(m2.g))} kyr) · shape cycle ${kyr(beat)} kyr</text>`;
  svg += `<text x="${cx}" y="${y0 + PH - 26}" text-anchor="middle" font-size="9.5" fill="${COL.text}">ϖ̇ now ${rate(0).toFixed(0)} ″/cy · mean over ±${kyr(half)} kyr ${meanRate.toFixed(0)} · retrograde ${retro.toFixed(0)} % of the time</text>`;
  svg += `<text x="${cx}" y="${y0 + PH - 14}" text-anchor="middle" font-size="9.5" fill="${COL.dim}">e now ${Math.hypot(...zn).toFixed(4)} · dominance A₁/A₂ ${(m1.A / m2.A).toFixed(1)}${k === 'saturn' ? ' · the window rate also carries the 883-yr Jupiter term' : ''}</text>`;
  console.log(`${name.padEnd(8)} A₁ ${m1.A.toFixed(4)} @ ${(m1.g * R2D * AS).toFixed(2)} ″/yr · A₂ ${m2.A.toFixed(4)} @ ${(m2.g * R2D * AS).toFixed(2)} ″/yr · shape cycle ${kyr(beat)} kyr · ϖ̇ now ${rate(0).toFixed(0)} mean ${meanRate.toFixed(0)} ″/cy · retro ${retro.toFixed(0)} % · e now ${Math.hypot(...zn).toFixed(4)} · dominance ${(m1.A / m2.A).toFixed(1)}`);
});
svg += `<text x="${W - 12}" y="${H - 6}" text-anchor="end" font-size="9" fill="${COL.dim}">${esc('ESSRT · holisticuniverse.com — drawn from ' + sourceLabel)}</text>`;
svg += '</svg>';
if (SITE && !existsSync(SITE)) { console.error(`ESSRT_SITE_DIR not found: ${SITE}`); process.exit(1); }
writeFileSync(OUT, svg);
console.log(`wrote ${OUT} (${(svg.length / 1024).toFixed(0)} kB)`);
