#!/usr/bin/env node
// STAGE C-4, SESSION 2 — the quantitative Cassini/obliquity RESPONSE per
// planet, integrated on the ENGINE'S OWN plane histories (plan 02 §8).
//
// For each case: n̂_p(t) from the planet's OWN deep ζ table (anchored at its
// chain J2000 plane), the spin integrated under ds/dt = α (ŝ·n̂)(ŝ×n̂) over
// ±10 Myr from the observed obliquity at several node azimuths; measured:
// the obliquity envelope (min/mean/max) → locked / librating / wandering /
// stable classification. ZERO fitted constants — α and ε₀ are EXTERNAL
// references (cited; labeled observed), the planes are ours.
//
// External references (research-lab literals, cited):
//   α  Mars  −7.606 ″/yr (Konopliv 2016; InSight 2021) · Jupiter −2.8
//      (Saillenfest 2020, MoI-dependent −2.7…−2.9) · Saturn −0.662
//      long-term (Ward–Hamilton 2004: present −0.45 = 68% via the Titan
//      cycle) · Earth −50.288 (the engine's own year-length surface).
//   ε₀ IAU/Archinal: Mars 25.19° · Jupiter 3.13° · Saturn 26.73° ·
//      Earth 23.439° (repo home).
//
// THE CONTROL EXPERIMENT: Earth-without-Moon — α drops to its solar third
// (f_S = 0.3165, derived from shared constants in C-2) ⇒ |α| ≈ 15.9 ″/yr,
// INSIDE the inner s-band: integrate Earth's own plane history under the
// moonless α and watch the obliquity wander (Laskar–Robutel 1993, here as
// a statement of the engine's own tables).
import { readFileSync } from 'node:fs';
const phys = await import('@essrt/physics');

const ART = JSON.parse(readFileSync(new URL('../../data/nbody-deep-secular-modes.json', import.meta.url), 'utf8'));
const CH = /** @type {any} */ (phys.CHAIN_ARTIFACT).j2000AnchorElements;
// the cited observed values live in the astro-reference TARGET block (E20:
// one home; targets are excluded from the injectable constants context, so
// read the JSON directly)
const SPIN = JSON.parse(readFileSync(new URL('../../public/input/astro-reference.json', import.meta.url), 'utf8')).planetSpinObserved;
const EPS0_EARTH = JSON.parse(readFileSync(new URL('../../public/input/astro-reference.json', import.meta.url), 'utf8')).earthOrbital.obliquityJ2000_deg;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;

function planeEvaluator(planet) {
  const A = CH[planet];
  const s2 = Math.sin(A.inclEclipticDeg / 2 * D2R);
  const anchor = [s2 * Math.cos(A.ascNodeEclipticDeg * D2R), s2 * Math.sin(A.ascNodeEclipticDeg * D2R)];
  const modes = ART.modes[planet].zeta;
  const sum = (t) => { let re = 0, im = 0; for (const m of modes) { const c = Math.cos(m.omegaRadPerYr * t), s = Math.sin(m.omegaRadPerYr * t); re += m.re * c - m.im * s; im += m.re * s + m.im * c; } return [re, im]; };
  const s0 = sum(0), Rr = [anchor[0] - s0[0], anchor[1] - s0[1]];
  return (t) => {
    const [q, p] = (() => { const [x, y] = sum(t); return [x + Rr[0], y + Rr[1]]; })();
    const i = 2 * Math.asin(Math.min(1, Math.hypot(q, p))), Om = Math.atan2(p, q);
    return [Math.sin(i) * Math.sin(Om), -Math.sin(i) * Math.cos(Om), Math.cos(i)];
  };
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Integrate the spin over [0, tEnd] (yr, negative ok); return eps envelope. */
function run(planet, alphaAsPerYr, eps0Deg, azimuthDeg, tEndYr, dtYr = 10) {
  const n0f = planeEvaluator(planet);
  const ALPHA = (alphaAsPerYr / 3600) * D2R;   // rad/yr (signed; retrograde < 0 handled by sign)
  // initial spin: obliquity eps0 about the J2000 orbit normal, azimuth free
  const n0 = n0f(0);
  // build an orthonormal frame around n0
  const ref = Math.abs(n0[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const e1r = cross(ref, n0); const e1n = Math.hypot(...e1r); const e1 = e1r.map((x) => x / e1n);
  const e2 = cross(n0, e1);
  const se = Math.sin(eps0Deg * D2R), ce = Math.cos(eps0Deg * D2R), az = azimuthDeg * D2R;
  let S = [0, 1, 2].map((i) => ce * n0[i] + se * (Math.cos(az) * e1[i] + Math.sin(az) * e2[i]));
  const deriv = (s, t) => { const n = n0f(t); const k = ALPHA * dot(s, n); const c = cross(s, n); return [k * c[0], k * c[1], k * c[2]]; };
  const h = Math.sign(tEndYr) * dtYr;
  let t = 0, mn = eps0Deg, mx = eps0Deg, sumE = 0, nS = 0;
  while (Math.abs(t) < Math.abs(tEndYr)) {
    const k1 = deriv(S, t);
    const k2 = deriv([S[0] + h / 2 * k1[0], S[1] + h / 2 * k1[1], S[2] + h / 2 * k1[2]], t + h / 2);
    const k3 = deriv([S[0] + h / 2 * k2[0], S[1] + h / 2 * k2[1], S[2] + h / 2 * k2[2]], t + h / 2);
    const k4 = deriv([S[0] + h * k3[0], S[1] + h * k3[1], S[2] + h * k3[2]], t + h);
    S = [0, 1, 2].map((i) => S[i] + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    const r = Math.hypot(...S); S = S.map((x) => x / r);
    t += h;
    if (Math.round(t) % 1000 === 0) {
      const e = Math.acos(Math.max(-1, Math.min(1, dot(S, n0f(t))))) * R2D;
      mn = Math.min(mn, e); mx = Math.max(mx, e); sumE += e; nS++;
    }
  }
  return { min: mn, max: mx, mean: sumE / nS };
}

const F_S = 0.3165;   // the solar torque fraction DERIVED from shared constants in C-2
const SAT_LT = SPIN.saturnSpinPrecessionPresentArcsecPerYr / SPIN.saturnPresentToLongTermFraction;
const CASES = [
  ['earth (with Moon)', 'earth', -50.288, EPS0_EARTH, 'STABLE expected (the C-3 hybrid)'],
  ['earth WITHOUT Moon', 'earth', -50.288 * F_S, EPS0_EARTH, 'the Laskar–Robutel control: α = solar third, inside the s-band'],
  ['mars', 'mars', SPIN.marsSpinPrecessionArcsecPerYr, SPIN.marsObliquityJ2000Deg, 'chaotic band expected (inside the s1/s2 multiplet)'],
  ['jupiter', 'jupiter', SPIN.jupiterSpinPrecessionApproxArcsecPerYr, SPIN.jupiterObliquityJ2000Deg, 'adjacent to s7 — modest response without migration'],
  ['saturn @ long-term α', 'saturn', SAT_LT, SPIN.saturnObliquityJ2000Deg, 'the s8 island: started at the observed 26.73°'],
  ['saturn @ low start', 'saturn', SAT_LT, 3.0, 'same α, started LOW — outside the island'],
];

console.log('== Cassini/obliquity response on the engine\'s own plane histories (±10 Myr, dt 10 yr) ==');
console.log('case                     α ″/yr    ε₀       ε min / mean / max over the run   (azimuths 0°/90°/180°)');
for (const [label, planet, alpha, eps0, note] of CASES) {
  const parts = [];
  for (const az of [0, 90, 180]) {
    const r = run(planet, alpha, eps0, az, -10_000_000);
    parts.push(`${r.min.toFixed(1)}/${r.mean.toFixed(1)}/${r.max.toFixed(1)}`);
  }
  console.log(`  ${label.padEnd(22)} ${String(alpha.toFixed(2)).padStart(8)}  ${String(eps0).padStart(6)}   ${parts.join('   ')}`);
  console.log(`      ${note}`);
}
