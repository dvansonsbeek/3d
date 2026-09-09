#!/usr/bin/env node
// STAGE C-4, SESSION 1 — the planetary spin/Cassini LANDSCAPE from the
// engine's OWN node modes (plan 02 §8, K8b-3/D5; the "labels' spin lines"
// research arc).
//
// The question: which planets' spin states are node-locked (Cassini),
// node-resonant, node-chaotic, or node-free — judged by comparing each
// planet's OBSERVED spin-precession constant (external references, cited
// below, labeled OBSERVED/THEORY — never model inputs) against THE
// ENGINE'S OWN s-mode frequencies (data/nbody-deep-secular-modes.json +
// the 1-Myr artifact's per-planet leading s).
//
// External references (research-lab literals, each cited; they enter a
// constants home only if/when C-4's publish leg lands):
//   Mercury  — Cassini state CONFIRMED observationally (Margot et al. 2007,
//              Science 316, 710): the spin follows the orbit-plane
//              precession. Anchor #1.
//   Moon     — Cassini state 2; closed by THIS model's own v4 campaign
//              (full Euler integration). Anchor #2.
//   Mars     — spin precession −7608.3 ± 2.1 mas/yr (Konopliv et al. 2016;
//              InSight combined −7605 ± 3, Kahan et al. 2021) → α_obs ≈
//              −7.606 ″/yr.
//   Jupiter  — adiabatically entering the secular spin-orbit resonance
//              with the URANUS nodal mode s7 (Saillenfest et al. 2020,
//              A&A 640, A11 — "The future large obliquity of Jupiter").
//   Saturn   — captured in the s8 (Neptune nodal mode) resonance — the
//              origin of the 27° obliquity (Ward & Hamilton 2004, AJ 128,
//              2501); present pole rate ≈ −0.45 ″/yr = ~68% of the
//              long-term rate (the 700-yr Titan cycle).
//   Earth    — spin precession p = 50.288 ″/yr (the engine's own
//              year-length surface; the H/13 anchor of the Stage-C hybrid).
import { readFileSync } from 'node:fs';
const phys = await import('@essrt/physics');

const ART = JSON.parse(readFileSync(new URL('../../data/nbody-deep-secular-modes.json', import.meta.url), 'utf8'));
const ERA = JSON.parse(readFileSync(new URL('../../data/nbody-secular-frequencies.json', import.meta.url), 'utf8'));
// the cited observed values live in the astro-reference TARGET block (E20)
const SPIN = JSON.parse(readFileSync(new URL('../../public/input/astro-reference.json', import.meta.url), 'utf8')).planetSpinObserved;
void phys;   // package import keeps the lab on the workspace resolution path
const R = 180 / Math.PI * 3600;

// the engine's own s-line list (deep tables, all planets, deduplicated)
const lines = new Map();
for (const p of Object.keys(ART.modes)) {
  for (const m of ART.modes[p].zeta) {
    const as = m.omegaRadPerYr * R;
    if (Math.abs(as) < 1e-4) continue;
    const key = as.toFixed(3);
    const amp = Math.hypot(m.re, m.im);
    if (!lines.has(key) || lines.get(key) < amp) lines.set(key, amp);
  }
}
// amp filter APPLIED GLOBALLY: the deep tables carry tiny spurious
// positive-frequency terms (e.g. Saturn's +58.85) that must not enter the
// nearest-line search.
const sLines = [...lines.entries()].map(([k, a]) => ({ as: Number(k), amp: a }))
  .filter((l) => l.amp > 5e-4 && l.as < 0)
  .sort((a, b) => a.as - b.as);
console.log('== the engine\'s own s-line landscape (deep ζ tables, ″/yr) ==');
console.log(sLines.filter((l) => l.amp > 5e-4).map((l) => l.as.toFixed(3)).join('  '));

const own = (p) => ERA.s[p].arcsecPerYr;
const nearest = (alpha) => sLines.reduce((b, l) => Math.abs(l.as - alpha) < Math.abs(b.as - alpha) ? l : b);

console.log('\n== the spin/Cassini landscape — observed spin rates vs OUR s-modes ==');
const rows = [
  ['mercury', null, 'Cassini-LOCKED (Margot 2007) — spin follows the orbit node', `proper s (ours): ${own('mercury').toFixed(3)} ″/yr — the lock IS the statement; observational anchor #1`],
  ['moon', null, 'Cassini state 2 — closed by the model\'s own v4 Euler campaign', 'observational anchor #2 (in-repo record)'],
  ['earth', -50.288, 'STABLE — 1.9× above the highest s-line; no resonance reachable', ''],
  ['mars', SPIN.marsSpinPrecessionArcsecPerYr, 'CHAOTIC-obliquity regime (Laskar–Robutel class) — inside the dense s1/s2 multiplet', ''],
  ['jupiter', SPIN.jupiterSpinPrecessionApproxArcsecPerYr, 'entering the s7 resonance (Saillenfest 2020; α ≈ −2.7…−2.9, moment-of-inertia dependent)', ''],
  ['saturn (present)', SPIN.saturnSpinPrecessionPresentArcsecPerYr, 'pole rate today — ~68% of long-term (the 700-yr Titan cycle, Ward–Hamilton 2004)', ''],
  ['saturn (long-term)', SPIN.saturnSpinPrecessionPresentArcsecPerYr / SPIN.saturnPresentToLongTermFraction, 'captured at s8 — the 27° obliquity origin (Ward–Hamilton 2004)', ''],
];
for (const [p, alpha, state, note] of rows) {
  if (alpha === null) { console.log(`  ${p.padEnd(8)} ${state}\n           ${note}`); continue; }
  const n = nearest(alpha);
  const band = sLines.filter((l) => l.amp > 5e-4);
  const inBand = alpha >= Math.min(...band.map((l) => l.as)) && alpha <= Math.max(...band.map((l) => l.as));
  console.log(`  ${p.padEnd(8)} α_obs ${String(alpha).padStart(7)} ″/yr · nearest OUR s-line ${n.as.toFixed(3)} (Δ ${(alpha - n.as).toFixed(3)}) · inside our s-band [${Math.min(...band.map(l=>l.as)).toFixed(2)}, ${Math.max(...band.map(l=>l.as)).toFixed(2)}]: ${inBand}`);
  console.log(`           ${state}`);
}

console.log('\n== the Earth statement (the §9 position, given its dynamical criterion) ==');
const maxS = Math.max(...sLines.filter((l) => l.amp > 5e-4).map((l) => Math.abs(l.as)));
console.log(`  Earth's spin precession p = 50.288 ″/yr sits ${ (50.288 / maxS).toFixed(2) }× ABOVE the engine's`);
console.log(`  highest s-line (|s| = ${maxS.toFixed(3)} — our s6): no spin-node resonance is reachable.`);
console.log('  The Moon supplies ~2/3 of α — remove it and α drops toward the inner s-band');
console.log('  (the Laskar–Robutel stabilization, here as a statement of OUR OWN mode table).');
console.log('  Mars, with no massive moon, sits INSIDE the band — the chaotic regime;');
console.log('  Mercury and the Moon are LOCKED; Saturn/Jupiter sit ON our s8/s7 lines.');
