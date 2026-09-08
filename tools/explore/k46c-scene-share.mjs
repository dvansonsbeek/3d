#!/usr/bin/env node
// ⚠ HISTORICAL INSTRUMENT (pre-K5-excision): this script drove the scene's
// legacy/chain flag (SG._setKeplerChains), REMOVED with the K5 legacy-chain
// excision — the chain is the only planet path and the legacy side of this
// comparison no longer exists in the code. The measured findings recorded
// below are the permanent record; the script no longer runs as written.
//
// P5/K4.6b — THE SCENE SHARE, ISOLATED: the k46b error ladder measured the
// chain's element misfit at 12–18″ on the sky (rung B/D) while the K4
// verdict reads 32–111″ — the difference lives in the scene flag path.
// This probe measures that share DIRECTLY (no JPL anywhere): per epoch, the
// angular separation between
//   scene:  SG.computePlanetPosition under KEPLER_CHAINS (of-date RA/Dec)
//   ideal:  the SAME chain through the clean pipeline — chain Earth, the
//           scene's own light-time convention, ecliptic→equatorial by the
//           model's obliquity, then j2000ToOfDate (the k4 convention)
// and then the crisp hypothesis test: fit ONE small rotation ω (least
// squares over all planets' unit-vector pairs, b ≈ a + ω×a). If applying ω
// collapses the share, the entire systematic is the frame bridge R — the
// 2-point triad derivation aliases the two Earth models' annual-shape
// difference into R (K3 measured the ≤9″ annual ring + 1.6′ pole). The
// R(jd₁)-spread probe quantifies that aliasing directly: R derived at 12
// epochs through the seasons, spread reported as rotation angles.
//
// RESULT (measured, two runs):
//   BEFORE: giants' scene share 29–109″ (Saturn 109, Mars 89), NOT removed
//   by a one-rotation fit; R(jd₁) spread only ≤9.1″ through the seasons —
//   the frame bridge EXONERATED, a fixed rotation is not the structure.
//   ROOT CAUSE (found in the readout tail): the fitted GRAVITATION_
//   CORRECTION and ELONGATION_CORRECTION blocks lacked the KEPLER_CHAINS
//   guard — observation-fitted planet-planet/elongation terms rode the raw
//   path ON TOP of the chain's own derived layer (double-counted physics).
//   AFTER the guards: giants' share 13.0–13.8″ in-window (9.8–14.1 at
//   1600–1800), of which ~a common ω of 16″ (mostly an equatorial y-tilt —
//   the scene readout vs the EPS+j2000ToOfDate convention, the same ≤12″
//   class the shipped path absorbs into its fits); after-ω residual 5.8–7.3″.
//   Mercury/Venus/Mars share 20–31″ (Earth-source ÷d protection is weaker
//   there). The K4 verdict dropped to rung B: giants 18.5–21.1″ in-window.
//
//   node tools/explore/k46c-scene-share.mjs

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT + 'package.json');
const SG = require(ROOT + 'tools/lib/scene-graph.js');
const KC = require(ROOT + 'tools/lib/keplerian-chain.js');
const TL = require(ROOT + 'tools/lib/constants.js');
const { j2000ToOfDate } = require(ROOT + 'tools/lib/precession.js');

const D2R = Math.PI / 180, J2000_JD = KC.ANCHOR_EPOCH_JD, YRD = 365.25;
const EPS = TL.iauObliquityAtGrid * D2R;
const AU_KM = TL.currentAUDistance;
const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const chains = KC.buildPlanetChainsFromArtifact();   // periodic terms ride from the governed artifact (K4.6b banking)

// ── ideal pipeline (chain-only; scene conventions for light-time) ─────────
function chainHelioAU(planet, year) {
  const el = KC.computePlanetElementsAtYear(year, chains[planet], chains);
  const p = KC.computeHeliocentricEclipticFromElements(el);
  return [p.xAU, p.yAU, p.zAU];
}
function idealRaDecOfDate(planet, jd) {
  const year = KC.ANCHOR_EPOCH_YEAR + (jd - J2000_JD) / YRD;
  const e = chainHelioAU('earth', year);
  let p = chainHelioAU(planet, year);
  let geo = [p[0] - e[0], p[1] - e[1], p[2] - e[2]];
  const tauDays = Math.hypot(...geo) * AU_KM / TL.speedOfLight / 86400;
  p = chainHelioAU(planet, year - tauDays / YRD);
  geo = [p[0] - e[0], p[1] - e[1], p[2] - e[2]];
  const yq = geo[1] * Math.cos(EPS) - geo[2] * Math.sin(EPS);
  const zq = geo[1] * Math.sin(EPS) + geo[2] * Math.cos(EPS);
  const ra = ((Math.atan2(yq, geo[0]) / D2R) + 360) % 360;
  const dec = Math.asin(zq / Math.hypot(geo[0], yq, zq)) / D2R;
  return j2000ToOfDate(ra, dec, jd);
}

const unit = (ra, dec) => [Math.cos(dec * D2R) * Math.cos(ra * D2R), Math.cos(dec * D2R) * Math.sin(ra * D2R), Math.sin(dec * D2R)];
const sepAS = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / D2R * 3600;

// ── collect pairs ─────────────────────────────────────────────────────────
SG._setKeplerChains(true);
SG._injectKeplerChains(chains);
const WINDOWS = { '1800-2100': [], '1600-1800': [] };
for (let k = -160; k <= 40; k++) {
  const jd = J2000_JD + k * 2.5 * YRD;
  const win = jd >= J2000_JD - 200 * YRD ? '1800-2100' : '1600-1800';
  for (const planet of PLANETS) {
    const m = SG.computePlanetPosition(planet, jd);
    const b = unit(SG.thetaToRaDeg(m.ra), SG.phiToDecDeg(m.dec));   // scene
    const od = idealRaDecOfDate(planet, jd);
    const a = unit(od.ra, od.dec);                                  // ideal
    WINDOWS[win].push({ planet, a, b });
  }
}
SG._injectKeplerChains(null);
SG._setKeplerChains(false);

// ── one-rotation fit: b ≈ a + ω×a (small-angle Wahba by linear LSQ) ───────
function fitOmega(pairs) {
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], rhs = [0, 0, 0];
  for (const { a, b } of pairs) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    // rows of (ω×a): M(a)·ω with M = [[0,a2,-a1],[-a2,0,a0],[a1,-a0,0]]
    const M = [[0, a[2], -a[1]], [-a[2], 0, a[0]], [a[1], -a[0], 0]];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) A[j][k] += M[i][j] * M[i][k];
      for (let j = 0; j < 3; j++) rhs[j] += M[i][j] * d[i];
    }
  }
  // 3x3 solve
  const M2 = A.map((r, i) => [...r, rhs[i]]);
  for (let c = 0; c < 3; c++) {
    let piv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[piv][c])) piv = r;
    [M2[c], M2[piv]] = [M2[piv], M2[c]];
    for (let r = c + 1; r < 3; r++) { const f = M2[r][c] / M2[c][c]; for (let j = c; j <= 3; j++) M2[r][j] -= f * M2[c][j]; }
  }
  const w = [0, 0, 0];
  for (let i = 2; i >= 0; i--) { let s = M2[i][3]; for (let j = i + 1; j < 3; j++) s -= M2[i][j] * w[j]; w[i] = s / M2[i][i]; }
  return w;
}
const applyOmega = (a, w) => {
  const c = [w[1] * a[2] - w[2] * a[1], w[2] * a[0] - w[0] * a[2], w[0] * a[1] - w[1] * a[0]];
  const v = [a[0] + c[0], a[1] + c[1], a[2] + c[2]];
  const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n];
};

for (const [win, pairs] of Object.entries(WINDOWS)) {
  console.log(`\n=== ${win} — scene share (scene flag path vs ideal chain pipeline), RMS ″ ===`);
  const w = fitOmega(pairs);
  const AS = 1 / D2R * 3600;
  console.log(`one-rotation fit ω: |ω| ${(Math.hypot(...w) * AS).toFixed(1)}″  [equatorial x ${(w[0] * AS).toFixed(1)} y ${(w[1] * AS).toFixed(1)} z(RA-spin) ${(w[2] * AS).toFixed(1)}]`);
  console.log('planet      raw RMS   after-ω RMS   (n)');
  for (const p of PLANETS) {
    const sub = pairs.filter((x) => x.planet === p);
    const r0 = Math.sqrt(sub.reduce((s, x) => s + sepAS(x.a, x.b) ** 2, 0) / sub.length);
    const r1 = Math.sqrt(sub.reduce((s, x) => s + sepAS(applyOmega(x.a, w), x.b) ** 2, 0) / sub.length);
    console.log(`  ${p.padEnd(9)} ${r0.toFixed(1).padStart(7)} ${r1.toFixed(1).padStart(11)}      (${sub.length})`);
  }
}

// ── R(jd₁) spread: the 2-point triad derivation through the seasons ───────
console.log('\n=== R(jd₁) spread — triad-derived frame bridge at 12 epochs through one year ===');
const triad = (p, q) => {
  const u = p;
  const w0 = [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const wn = Math.hypot(...w0), w = [w0[0] / wn, w0[1] / wn, w0[2] / wn];
  const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
  return [u, v, w];
};
const norm = (v) => { const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n]; };
const sceneEarthHat = (jd) => {
  SG.computePlanetPosition('sun', jd);
  const g = SG._getGraphForProbe();
  const sun = g.sunNodes.pivot.getWorldPosition();
  const earth = g.earthNodes.rotAxis.getWorldPosition();
  return norm([earth[0] - sun[0], earth[1] - sun[1], earth[2] - sun[2]]);
};
const evalEarthHat = (jd) => norm(chainHelioAU('earth', KC.ANCHOR_EPOCH_YEAR + (jd - J2000_JD) / YRD));
const Rs = [];
for (let m = 0; m < 12; m++) {
  const jd1 = J2000_JD + m * 30.4, jd2 = jd1 + 91.3;
  const A = triad(evalEarthHat(jd1), evalEarthHat(jd2));
  const B = triad(sceneEarthHat(jd1), sceneEarthHat(jd2));
  const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    for (let k = 0; k < 3; k++) R[i][j] += B[k][i] * A[k][j];
  Rs.push(R);
}
const R0 = Rs[0];
const relAngle = (R, S) => {   // angle of R·Sᵀ
  let tr = 0;
  for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) tr += R[i][k] * S[i][k];
  return Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2))) / D2R * 3600;
};
const angles = Rs.map((R) => relAngle(R, R0));
console.log('rotation angle vs the jd₁=J2000 R, per derivation month (″):');
console.log('  ' + angles.map((a) => a.toFixed(1)).join('  '));
console.log(`  spread max ${Math.max(...angles).toFixed(1)}″ — the aliasing of the two Earth models' annual-shape difference into a 2-point R`);
