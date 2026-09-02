#!/usr/bin/env node
// THE ECCENTRICITY SHAPES — the owner's wobble-centre picture (public/img/02_CenterAA.png,
// hu) generalized to every planet from the model's OWN N-body mode table.
//
// Each planet's eccentricity vector z(t) = e·e^{iϖ} = Σ Aᵢ e^{i(gᵢt+φᵢ)} traces a shape in
// the (e·cosϖ, e·sinϖ) plane. The perihelion is the direction of z; its rate is the phase
// rate of the trace — fast where the trace runs around the origin at large radius, whipping
// or retrograde where a counter-vector drags it back (doc 109 §11; the shape table in the
// two-engine plan discussion: dominance A1/A2 decides how far the rate wanders).
//
// Drawn per planet: the faint full-mode trace (all NAFF terms, one beat cycle of the top
// pair, plus margin), the bold TWO-VECTOR shape (A1 + A2 only — "the most likely shape"),
// the two arrows at their J2000 phases (A1 from the origin, A2 from A1's tip — exactly the
// owner's Earth diagram), the J2000 position with its direction of motion, and the numbers
// (A, g, rate now / mean, % retrograde). Source: naff-modes-ecliptic-1000000-gr.local.json
// (Wisdom–Holman, 1PN on, 16 terms, LS-refit amplitudes).
//
//   node tools/explore/eccentricity-shapes.mjs [modes=…] [out=<svg path>]
//
// RESULT: the generator behind the published "Eccentricity Shapes" research
// plate (five-stage record incl. the bound campaign). Key measured readings:
// dominance sorts the system (Mercury 2.9 / Jupiter 2.4 / Mars 1.9 ride near
// their means; Venus 0.6 / Earth 0.55 are borrowers whose instantaneous rate
// carries no structural information — Earth today 31 % above its mean);
// Saturn's window retrograde is the epicycle far side + the 883-yr GI wiggle,
// not a secular direction. Doc 109 §11–12.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const KV = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const M = JSON.parse(readFileSync(KV.modes || ROOT + 'tools/explore/naff-modes-ecliptic-1000000-gr.local.json', 'utf8'));
const OUT = KV.out || ROOT + 'tools/explore/eccentricity-shapes.local.svg';
const R2D = 180 / Math.PI, AS = 3600;

const PW = 350, PH = 372, COLS = 4, ROWS = 2, W = COLS * PW, H = ROWS * PH + 46;
const COL = { trace: '#c9c2b8', shape: '#1a1a1a', a1: '#b3542e', a2: '#2e6fb3', now: '#b3542e', text: '#222', dim: '#6b675f', bg: '#faf8f4' };
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, system-ui, sans-serif">`;
svg += `<rect width="${W}" height="${H}" fill="${COL.bg}"/>`;
svg += `<text x="${W / 2}" y="26" text-anchor="middle" font-size="17" font-weight="700" fill="${COL.text}">The eccentricity shapes — each planet's perihelion rides its own vector pattern</text>`;
svg += `<text x="${W / 2}" y="42" text-anchor="middle" font-size="11" fill="${COL.dim}">z = e·e^{iϖ} from the model's N-body mode table (Wisdom–Holman + 1PN, NAFF). Bold: the two-vector shape. Faint: all modes. Dashed: the next 30 kyr. Arrows: the two vectors at J2000, as in the Earth wobble-centre diagram.</text>`;

const order = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
order.forEach((k, idx) => {
  const m = M.modes[k];
  const modes = m.z.map((f) => ({ g: f.omegaRadPerYr, A: Math.hypot(f.re, f.im), ph: Math.atan2(f.im, f.re) })).sort((a, b) => b.A - a.A);
  const [m1, m2] = modes;
  const zFull = (t) => { let re = 0, im = 0; for (const f of m.z) { const c = Math.cos(f.omegaRadPerYr * t), s = Math.sin(f.omegaRadPerYr * t); re += f.re * c - f.im * s; im += f.re * s + f.im * c; } return [re, im]; };
  const z2 = (t) => [m1.A * Math.cos(m1.g * t + m1.ph) + m2.A * Math.cos(m2.g * t + m2.ph), m1.A * Math.sin(m1.g * t + m1.ph) + m2.A * Math.sin(m2.g * t + m2.ph)];
  const beat = 2 * Math.PI / Math.abs(m1.g - m2.g);
  // rate stats (full modes, ±1 Myr)
  const rate = (t) => { const [r1, i1] = zFull(t - 50), [r2, i2] = zFull(t + 50); let d = Math.atan2(i2, r2) - Math.atan2(i1, r1); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d * R2D * AS; };
  const rates = []; for (let t = -1e6; t <= 1e6; t += 1000) rates.push(rate(t));
  const meanRate = rates.reduce((s, x) => s + x, 0) / rates.length;
  const retro = 100 * rates.filter((x) => x * Math.sign(m1.g) < 0).length / rates.length;

  const x0 = (idx % COLS) * PW, y0 = 46 + Math.floor(idx / COLS) * PH, cx = x0 + PW / 2, cy = y0 + 168;
  const rmax = Math.max(m1.A + m2.A, ...Array.from({ length: 400 }, (_, i) => Math.hypot(...zFull(-1e6 + i * 5000)))) * 1.12;
  const S = 140 / rmax, X = (z) => cx + z[0] * S, Y = (z) => cy - z[1] * S;
  // faint full trace over max(beat, 400 kyr)
  const span = Math.max(beat * 1.05, 4e5), n = 1600;
  let p = ''; for (let i = 0; i <= n; i++) { const z = zFull(-span / 2 + span * i / n); p += (i ? 'L' : 'M') + X(z).toFixed(1) + ',' + Y(z).toFixed(1); }
  svg += `<path d="${p}" fill="none" stroke="${COL.trace}" stroke-width="0.7" opacity="0.9"/>`;
  // bold two-vector shape over one beat
  p = ''; for (let i = 0; i <= 900; i++) { const z = z2(beat * i / 900); p += (i ? 'L' : 'M') + X(z).toFixed(1) + ',' + Y(z).toFixed(1); }
  svg += `<path d="${p}" fill="none" stroke="${COL.shape}" stroke-width="1.5"/>`;
  // origin (Sun-centred e = 0)
  svg += `<line x1="${cx - 4}" y1="${cy}" x2="${cx + 4}" y2="${cy}" stroke="${COL.dim}" stroke-width="1"/><line x1="${cx}" y1="${cy - 4}" x2="${cx}" y2="${cy + 4}" stroke="${COL.dim}" stroke-width="1"/>`;
  // vectors at J2000: A1 from origin, A2 from A1 tip
  const v1 = [m1.A * Math.cos(m1.ph), m1.A * Math.sin(m1.ph)], vz = z2(0);
  const arrow = (xa, ya, xb, yb, color) => {
    const dx = xb - xa, dy = yb - ya, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    return `<line x1="${xa.toFixed(1)}" y1="${ya.toFixed(1)}" x2="${xb.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="${color}" stroke-width="1.6"/>`
      + `<path d="M${xb.toFixed(1)},${yb.toFixed(1)} l${(-7 * ux + 3 * uy).toFixed(1)},${(-7 * uy - 3 * ux).toFixed(1)} l${(6 * uy).toFixed(1)},${(-6 * ux).toFixed(1)} z" fill="${color}" transform="translate(${(0).toFixed(1)},0)"/>`;
  };
  svg += arrow(cx, cy, X(v1), Y(v1), COL.a1);
  svg += arrow(X(v1), Y(v1), X(vz), Y(vz), COL.a2);
  // the next 30 kyr of the full trace — where the shape takes the planet from here (dashed)
  let pf = ''; for (let i = 0; i <= 300; i++) { const zq = zFull(i * 100); pf += (i ? 'L' : 'M') + X(zq).toFixed(1) + ',' + Y(zq).toFixed(1); }
  svg += `<path d="${pf}" fill="none" stroke="${COL.now}" stroke-width="1.6" stroke-dasharray="5,3" opacity="0.85"/>`;
  // J2000 position + direction of motion of the full trace
  const zn = zFull(0), zn2 = zFull(600);
  svg += `<circle cx="${X(zn).toFixed(1)}" cy="${Y(zn).toFixed(1)}" r="4" fill="${COL.now}"/>`;
  svg += arrow(X(zn), Y(zn), X(zn) + (X(zn2) - X(zn)) * 18, Y(zn) + (Y(zn2) - Y(zn)) * 18, COL.now);
  // labels
  const name = k[0].toUpperCase() + k.slice(1);
  const kyr = (yr) => (yr / 1000).toFixed(0);
  svg += `<text x="${cx}" y="${y0 + 16}" text-anchor="middle" font-size="14" font-weight="700" fill="${COL.text}">${name}</text>`;
  svg += `<text x="${cx}" y="${y0 + 30}" text-anchor="middle" font-size="9.5" fill="${COL.a1}">A₁ ${m1.A.toFixed(4)} at ${(m1.g * R2D * AS).toFixed(2)} ″/yr (${kyr(2 * Math.PI / Math.abs(m1.g) )} kyr)</text>`;
  svg += `<text x="${cx}" y="${y0 + 42}" text-anchor="middle" font-size="9.5" fill="${COL.a2}">A₂ ${m2.A.toFixed(4)} at ${(m2.g * R2D * AS).toFixed(2)} ″/yr (${kyr(2 * Math.PI / Math.abs(m2.g))} kyr) · shape cycle ${kyr(beat)} kyr</text>`;
  svg += `<text x="${cx}" y="${y0 + PH - 26}" text-anchor="middle" font-size="9.5" fill="${COL.text}">ϖ̇ now ${rate(0).toFixed(0)} ″/cy · long-term mean ${meanRate.toFixed(0)} · retrograde ${retro.toFixed(0)} % of the time</text>`;
  svg += `<text x="${cx}" y="${y0 + PH - 14}" text-anchor="middle" font-size="9.5" fill="${COL.dim}">e now ${Math.hypot(...zn).toFixed(4)} · dominance A₁/A₂ ${(m1.A / m2.A).toFixed(1)}${k === 'saturn' ? ' · window rate also carries the 883-yr Jupiter term' : ''}</text>`;
});
svg += '</svg>';
writeFileSync(OUT, svg);
console.log(`wrote ${OUT} (${(svg.length / 1024).toFixed(0)} kB)`);
