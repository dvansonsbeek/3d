// ═══════════════════════════════════════════════════════════════
// VECTOR BALANCE AT J2000 — PHASE A
//
// Single foundational diagnostic: is the observed solar system
// in continuous vector balance?
//
// The "rigid rotation" hypothesis says:
//   - All 8 planets' ascending nodes Ω regress at one shared rate
//   - Their orbital plane normals, weighted by orbital angular
//     momentum L = m·√(a(1−e²)), sum to a vector that is parallel
//     to the total angular momentum vector at all times.
//
// Equivalently, in the invariable-plane frame (perpendicular to
// total L by definition), the in-plane components of the weighted
// orbital normals must sum to zero:
//
//   V = Σ_i L_i · sin(i_i) · (cos Ω_i, sin Ω_i)  =  0
//
// The invariable plane is DEFINED such that this is exact for
// the real solar system. So this script's job is to:
//
//   1. Compute V using the model's stored J2000 (i, Ω) values
//      on the invariable plane.
//   2. Compute |V| and report it as fraction of:
//        a) Σ L_i        (total orbital angular momentum)
//        b) Σ L_i sin i  (the in-plane component magnitude scale)
//      A truly invariable-plane-aligned dataset gives |V| ≈ 0.
//   3. Show the per-planet (p, q) contributions so we can see
//      which planets dominate and where the cancellations come from.
//
// If |V| is small (sub-percent), the hypothesis is consistent
// with observation and Phase B (find shared Ω rate) is worth doing.
// If |V| is large, either the input data is in the wrong frame or
// the rigid-rotation hypothesis is incompatible with observation.
//
// Usage: node tools/explore/vector-balance-j2000.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const DEG2RAD = Math.PI / 180;
const ALL = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

// ─── Build per-planet J2000 orbital state ───
// Inclination and ascending node on the invariable plane.
function loadPlanet(key) {
  if (key === 'earth') {
    return {
      name: 'Earth',
      mass: C.massFraction.earth,
      a:    1.0,
      e:    C.eccJ2000.earth,
      i:    C.ASTRO_REFERENCE.earthInclinationJ2000_deg,
      Omega: C.ASTRO_REFERENCE.earthAscendingNodeInvPlane,
    };
  }
  const p = C.planets[key];
  return {
    name: key.charAt(0).toUpperCase() + key.slice(1),
    mass: C.massFraction[key],
    a:    C.derived[key].orbitDistance,
    e:    C.eccJ2000[key],
    i:    p.invPlaneInclinationJ2000,
    Omega: p.ascendingNodeInvPlane,
  };
}

const planets = ALL.map(loadPlanet);

// ─── Compute orbital angular momentum (up to a common constant) ───
//   L_i = m_i · √(a_i (1 − e_i²))
// Units: solar masses · √AU. The absolute scale is irrelevant for
// the relative balance check; only ratios matter.
for (const p of planets) {
  p.L = p.mass * Math.sqrt(p.a * (1 - p.e * p.e));
  p.sinI = Math.sin(p.i * DEG2RAD);
  p.cosI = Math.cos(p.i * DEG2RAD);
  p.cosOmega = Math.cos(p.Omega * DEG2RAD);
  p.sinOmega = Math.sin(p.Omega * DEG2RAD);
  p.px = p.L * p.sinI * p.cosOmega;   // x-projection
  p.py = p.L * p.sinI * p.sinOmega;   // y-projection
  p.pz = p.L * p.cosI;                // z-projection (along inv-plane normal)
}

let Vx = 0, Vy = 0, Vz = 0;
let totalL = 0, totalLsinI = 0;
for (const p of planets) {
  Vx += p.px;
  Vy += p.py;
  Vz += p.pz;
  totalL += p.L;
  totalLsinI += Math.abs(p.L * p.sinI);
}

const Vmag = Math.sqrt(Vx * Vx + Vy * Vy);
const VmagFull = Math.sqrt(Vx * Vx + Vy * Vy + Vz * Vz);

// ═══════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  VECTOR BALANCE AT J2000 — Phase A diagnostic');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('  Per-planet contributions (invariable-plane frame, J2000):');
console.log('');
console.log('  Planet   │     mass     │   a(AU)  │  e       │ i(°)    │ Ω(°)     │      L         │   L·sin(i)·cos(Ω)  │   L·sin(i)·sin(Ω)');
console.log('  ─────────┼──────────────┼──────────┼──────────┼─────────┼──────────┼────────────────┼────────────────────┼────────────────────');
for (const p of planets) {
  console.log(
    '  ' + p.name.padEnd(8) + ' │ ' +
    p.mass.toExponential(3).padStart(12) + ' │ ' +
    p.a.toFixed(5).padStart(8) + ' │ ' +
    p.e.toFixed(6).padStart(8) + ' │ ' +
    p.i.toFixed(4).padStart(7) + ' │ ' +
    p.Omega.toFixed(3).padStart(8) + ' │ ' +
    p.L.toExponential(6).padStart(14) + ' │ ' +
    p.px.toExponential(6).padStart(18) + ' │ ' +
    p.py.toExponential(6).padStart(18)
  );
}
console.log('  ─────────┴──────────────┴──────────┴──────────┴─────────┴──────────┼────────────────┼────────────────────┼────────────────────');
console.log(
  '  ' + 'TOTAL'.padEnd(8) + '   ' + ' '.repeat(56) + ' │ ' +
  totalL.toExponential(6).padStart(14) + ' │ ' +
  Vx.toExponential(6).padStart(18) + ' │ ' +
  Vy.toExponential(6).padStart(18)
);
console.log('');
console.log('  In-plane vector residual:');
console.log(`    V_x       = ${Vx.toExponential(6)}`);
console.log(`    V_y       = ${Vy.toExponential(6)}`);
console.log(`    |V_xy|    = ${Vmag.toExponential(6)}`);
console.log('');
console.log('  Out-of-plane component:');
console.log(`    V_z       = ${Vz.toExponential(6)}    (= total |L_⊥inv|, always positive)`);
console.log(`    |V_full|  = ${VmagFull.toExponential(6)}`);
console.log('');
console.log('  Reference scales:');
console.log(`    Σ L_i              = ${totalL.toExponential(6)}`);
console.log(`    Σ |L_i · sin i_i|  = ${totalLsinI.toExponential(6)}`);
console.log('');
console.log('  Relative balance metrics:');
const relTotalL = Vmag / totalL;
const relInPlane = Vmag / totalLsinI;
console.log(`    |V_xy| / Σ L_i              = ${relTotalL.toExponential(3)}   (${(relTotalL * 100).toFixed(4)} %)`);
console.log(`    |V_xy| / Σ |L_i · sin i_i|  = ${relInPlane.toExponential(3)}   (${(relInPlane * 100).toFixed(4)} %)`);
console.log('');

// ─── Verdict ───
console.log('  ─── Verdict ─────────────────────────────────────────────────────');
if (relInPlane < 0.01) {
  console.log('  ✓ |V_xy| is < 1% of the in-plane scale.');
  console.log('    The data IS effectively on the invariable plane (as expected by');
  console.log('    construction). Continuous vector balance is consistent with');
  console.log('    observation. Proceed to Phase B (single shared Ω rate fit).');
} else if (relInPlane < 0.10) {
  console.log('  ~ |V_xy| is between 1% and 10% of the in-plane scale.');
  console.log('    Marginal — the input (Ω, i) values are close to but not exactly');
  console.log('    on the invariable plane. Worth investigating which planet drives');
  console.log('    the residual before proceeding.');
} else {
  console.log('  ✗ |V_xy| exceeds 10% of the in-plane scale.');
  console.log('    The stored J2000 (Ω, i) values are NOT on the invariable plane,');
  console.log('    or the rigid-rotation hypothesis is incompatible with observation.');
  console.log('    Investigate input frame before proceeding to Phase B.');
}
console.log('');

// ─── Per-planet (p, q) projections, sorted by magnitude ───
console.log('  Per-planet in-plane vectors (sorted by |sin(i)·L|):');
console.log('  ──────────────────────────────────────────────────────');
const sorted = [...planets].sort((a, b) => Math.abs(b.L * b.sinI) - Math.abs(a.L * a.sinI));
let runningX = 0, runningY = 0;
console.log('  Planet   │     L·sin(i)     │  cos(Ω)  │  sin(Ω)  │  running V_x          │  running V_y');
console.log('  ─────────┼──────────────────┼──────────┼──────────┼───────────────────────┼───────────────────────');
for (const p of sorted) {
  runningX += p.px;
  runningY += p.py;
  console.log(
    '  ' + p.name.padEnd(8) + ' │ ' +
    (p.L * p.sinI).toExponential(6).padStart(16) + ' │ ' +
    p.cosOmega.toFixed(4).padStart(8) + ' │ ' +
    p.sinOmega.toFixed(4).padStart(8) + ' │ ' +
    runningX.toExponential(6).padStart(20) + ' │ ' +
    runningY.toExponential(6).padStart(20)
  );
}
console.log('');
