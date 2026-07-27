/**
 * v4-latitude-audit.js — E3b of the v4 campaign (IP-v4-lab.md): test whether
 * the LATITUDE REFERENCE-PLANE convention explains D7's open ~0.2% in the
 * latitude family.
 *
 * E3 (600-yr PART A) showed known physics moves the factor the WRONG way
 * (base3 99.79% → full 99.73% of Meeus 5.128122°). Pattern-matching v3 and
 * E1: suspect the frame/definition. Meeus's latitude is measured from the
 * ecliptic OF DATE; the lab measures β from the FIXED initial plane. In the
 * full system the Earth's orbital plane really precesses (planetary torques
 * — the lab's own ecliptic-of-date), so both conventions are measurable on
 * the SAME dynamics:
 *   A (fixed plane):  β as recorded;
 *   B (of date):      β′ = asin(û · n̂(t)), n̂ = EMB orbital-plane normal.
 * base3 is the control (plane conserved → A ≈ B).
 *
 * Also prints the two-body sine-convention factor (the sinF coefficient of
 * asin(sin i·sin u) is (sin i + sin³i/8)/i = 0.99967·i — a known −0.03%).
 *
 * Usage: node tools/explore/v4-latitude-audit.js [years=2000] [dtDays=0.04]
 */

const D1 = require('./derive-meeus-amplitudes');
const LAB = require('./derive-planetary-lunar-terms');

const YEARS = parseFloat(process.argv[2] || '2000');
const DTD = parseFloat(process.argv[3] || '0.04');
const d2r = Math.PI / 180;
const MEEUS_LAT = 5.128122;
const I_INPUT = 5.1453964;

console.log(`v4 E3b — latitude reference-plane audit: ${YEARS} yr at dt=${DTD} d`);
console.log('calibrating lunar ICs (D1)...');
const cal = D1.calibrate(undefined, true);
const moonIC = { a: cal.aIC, e: cal.eIC, i: cal.iIC };

// two-body sine-convention reference
const iRad = moonIC.i;
const s = Math.sin(iRad);
console.log(`two-body sine-convention factor (sinF coeff / i): ${((s + s ** 3 / 8) / iRad).toFixed(5)}  (a known −0.03%)`);
console.log(`Meeus reference factor: 5.128122 / 5.1453964 = ${(MEEUS_LAT / I_INPUT).toFixed(5)}\n`);

function latMain(S, betaArr) {
  const fLam = LAB.linFit(S.t, S.lam), fOm = LAB.linFit(S.t, S.Om);
  let ss = 0, sc = 0, scs = 0, bs = 0, bc = 0;
  for (let i = 0; i < S.t.length; i++) {
    const F = (fLam.a + fLam.b * S.t[i]) - (fOm.a + fOm.b * S.t[i]);
    const si = Math.sin(F), co = Math.cos(F);
    ss += si * si; sc += co * co; scs += si * co;
    bs += betaArr[i] * si; bc += betaArr[i] * co;
  }
  const det = ss * sc - scs * scs;
  return Math.hypot((bs * sc - bc * scs) / det, (bc * ss - bs * scs) / det) / d2r;
}

function ofDateBeta(S) {
  const out = new Float64Array(S.t.length);
  for (let i = 0; i < S.t.length; i++) {
    const cb = Math.cos(S.beta[i]);
    const u = [cb * Math.cos(S.lam[i]), cb * Math.sin(S.lam[i]), Math.sin(S.beta[i])];
    const n = S.eclN[i];
    out[i] = Math.asin(u[0] * n[0] + u[1] * n[1] + u[2] * n[2]);
  }
  return out;
}

function audit(label, opts) {
  const t0 = Date.now();
  const S = LAB.runSystem({ ...opts, recordEclipticNormal: true }, moonIC, YEARS, DTD);
  const ampFixed = latMain(S, S.beta);
  const ampOfDate = latMain(S, ofDateBeta(S));
  // plane drift over the window (angle between first and last normal)
  const n0 = S.eclN[0], n1 = S.eclN[S.eclN.length - 1];
  const drift = Math.acos(Math.max(-1, Math.min(1, n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]))) / d2r;
  console.log(`${label.padEnd(14)} fixed-plane ${ampFixed.toFixed(6)}° (${(ampFixed / MEEUS_LAT * 100).toFixed(3)}%)   of-date ${ampOfDate.toFixed(6)}° (${(ampOfDate / MEEUS_LAT * 100).toFixed(3)}%)   plane drift ${drift.toFixed(4)}° over window   (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  return { ampFixed, ampOfDate, drift };
}

console.log(`  reference: Meeus lat-main 5.128122°   (percentages vs Meeus)`);
const B = audit('base3 (ctrl)', { planets: false, j2: false });
const F = audit('8-body + J2', { planets: true, j2: true });

console.log('\nVerdict:');
const gapFixed = (1 - F.ampFixed / MEEUS_LAT) * 100;
const gapOfDate = (1 - F.ampOfDate / MEEUS_LAT) * 100;
console.log(`  full-system gap vs Meeus: fixed-plane ${gapFixed.toFixed(3)}%  →  of-date ${gapOfDate.toFixed(3)}%`);
console.log(`  control (base3 A−B): ${((B.ampFixed - B.ampOfDate) * 3600).toFixed(2)}″ (should be ~0)`);
console.log('  If the of-date gap ≈ 0: D7\'s 0.2% was the reference-plane convention.');
console.log('  If unchanged: next candidate per spec — the inclination-constant convention (which i is 5.1453964?).');
