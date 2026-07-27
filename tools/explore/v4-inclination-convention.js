/**
 * v4-inclination-convention.js — E3c of the v4 campaign (IP-v4-lab.md):
 * which quantity is the catalog inclination 5.1453964°?
 *
 * D7 status after E3/E3b: the 0.2% latitude-family gap survives bodies, J2,
 * AND the reference-plane convention. Remaining hypothesis: an
 * i-CONVENTION mismatch. The lab calibrates its lunar tilt so the MEAN
 * OSCULATING inclination matches the catalog value; the latitude sinF
 * coefficient then comes out 0.2% below Meeus. If the catalog value is
 * instead a THEORY CONSTANT (Brown/ELP convention, tied to the sinF
 * coefficient by the classical 0.99672 factor), the real Moon's mean
 * osculating inclination should be LARGER (≈ 5.1281/0.9944 ≈ 5.157°).
 *
 * Two independent measurements:
 *  PART 1 (lab): scale the free-tilt calibration so the lab's sinF
 *    coefficient reproduces Meeus's 5.128122 exactly; report what the
 *    mean osculating i and the nodal/apsidal periods become (is the
 *    convention discriminable by the other observables?).
 *  PART 2 (real Moon): measure the REAL Moon's mean osculating inclination
 *    from the Meeus series (scene-graph engine): r from λβΔ, v by central
 *    differences, i_osc = angle(h, ecliptic pole), averaged over two full
 *    node cycles. Verdict: ≈5.145 → genuine physics conflict;
 *    ≈5.157 → D7 dissolves into the i-convention (catalog = theory constant).
 *
 * Usage: node tools/explore/v4-inclination-convention.js [years=600] [dtDays=0.04]
 */

const D1 = require('./derive-meeus-amplitudes');
const LAB = require('./derive-planetary-lunar-terms');

const YEARS = parseFloat(process.argv[2] || '600');
const DTD = parseFloat(process.argv[3] || '0.04');
const d2r = Math.PI / 180;
const MEEUS_LAT = 5.128122;
const I_INPUT = 5.1453964;

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

const PART2_ONLY = process.argv.includes('part2only');

// ═══ PART 1: lab convention scan ═══════════════════════════════════════════
console.log(`v4 E3c — inclination-convention experiment (${YEARS} yr at dt=${DTD})`);
if (PART2_ONLY) console.log('(part2only: skipping the lab scan; Part-1 reference: sinF=Meeus at mean-osc i ≈ 5.1567°)');
let iOscAtMeeus = 5.1567;   // Part-1 result (recomputed unless part2only)
if (!PART2_ONLY) {
  console.log('\nPART 1 — lab calibration scan (base3):');
  console.log('calibrating baseline ICs (D1)...');
  const cal = D1.calibrate(undefined, false);
  const { eIC, iIC, aIC } = cal;
  const base = D1.analyzeRun(D1.integrate(eIC, iIC, aIC, YEARS, 0.02, undefined));
  const TGT0 = { eFree: base.eFree, iFree: base.iFree, aOsc: base.aOsc };

  const icsForScale = (scale) => {
    let e = eIC, i = iIC * scale, a = aIC;
    for (let it = 0; it < 6; it++) {
      const A = D1.analyzeRun(D1.integrate(e, i, a, YEARS, 0.02, undefined));
      const de = TGT0.eFree / A.eFree, di = (TGT0.iFree * scale) / A.iFree, da = TGT0.aOsc / A.aOsc;
      if (Math.abs(de - 1) < 3e-7 && Math.abs(di - 1) < 3e-7 && Math.abs(da - 1) < 1e-9) break;
      e *= Math.pow(de, 0.8); i *= Math.pow(di, 0.8); a *= da;
    }
    return { a, e, i };
  };

  console.log('  scale     sinF-coeff(°)   %Meeus    mean-osc i(°)   T_aps(d)    T_nod(d)');
  const rows = [];
  for (const scale of [1.0, 1.001, 1.00216, 1.003]) {
    const ICs = icsForScale(scale);
    const S = LAB.runSystem({ planets: false, j2: false, recordInc: true }, ICs, YEARS, DTD);
    const coeff = latMain(S, S.beta);
    let meanInc = 0;
    for (const v of S.inc) meanInc += v;
    meanInc = meanInc / S.inc.length / d2r;
    const fW = LAB.linFit(S.t, S.w), fOm = LAB.linFit(S.t, S.Om);
    const row = { scale, coeff, meanInc, Taps: 2 * Math.PI / fW.b, Tnod: -2 * Math.PI / fOm.b };
    rows.push(row);
    console.log(`  ${scale.toFixed(5)}   ${coeff.toFixed(6).padStart(10)}   ${(coeff / MEEUS_LAT * 100).toFixed(3).padStart(7)}   ${meanInc.toFixed(5).padStart(11)}   ${row.Taps.toFixed(2).padStart(9)}   ${row.Tnod.toFixed(2).padStart(9)}`);
  }
  // interpolate the scale that reproduces Meeus exactly
  const lo = rows[0], hi = rows[rows.length - 1];
  const fExact = (MEEUS_LAT - lo.coeff) / (hi.coeff - lo.coeff);
  iOscAtMeeus = lo.meanInc + fExact * (hi.meanInc - lo.meanInc);
  const TnodAtMeeus = lo.Tnod + fExact * (hi.Tnod - lo.Tnod);
  console.log(`  → sinF = Meeus exactly at mean-osc i ≈ ${iOscAtMeeus.toFixed(4)}°  (T_nod shifts ${(TnodAtMeeus - lo.Tnod).toFixed(2)} d from the catalog calibration — discriminability check)`);
}

// ═══ PART 2: the REAL Moon's mean osculating inclination ═══════════════════
console.log('\nPART 2 — real Moon (Meeus series, scene-graph engine):');
const SG = require('../lib/scene-graph');
const C = require('../lib/constants');
const OE = require('../lib/orbital-engine');

const NODE_CYCLE_D = 6798.38;
const STEP = 0.5;
const SPAN = 2 * NODE_CYCLE_D;
const jd0 = C.j2000JD;
const t0 = Date.now();

// ecliptic-of-date position vectors from the Meeus engine
const pos = [];
const nPts = Math.round(SPAN / STEP) + 1;
for (let k = 0; k < nPts; k++) {
  const jd = jd0 + k * STEP;
  const p = SG.computePlanetPosition('moon', jd);
  const dist = p.meeusDistKm !== undefined ? p.meeusDistKm : p.distAU * C.currentAUDistance;
  const ra = SG.thetaToRaDeg(p.ra) * d2r, dec = SG.phiToDecDeg(p.dec) * d2r;   // of-date equatorial (scene theta/phi → RA/Dec)
  const cd = Math.cos(dec);
  const ux = cd * Math.cos(ra), uy = cd * Math.sin(ra), uz = Math.sin(dec);
  const eps = OE.computeObliquityEarth(2000 + (jd - jd0) / 365.2425) * d2r;
  const ce = Math.cos(eps), se = Math.sin(eps);
  // equatorial → ecliptic (rotation about the equinox x-axis)
  pos.push([dist * ux, dist * (ce * uy + se * uz), dist * (-se * uy + ce * uz)]);
}
console.log(`  ${nPts} Meeus positions over 2 node cycles in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// central-difference velocities → h-vector → osculating inclination
let sumI = 0, minI = Infinity, maxI = -Infinity, cnt = 0;
for (let k = 1; k < nPts - 1; k++) {
  const r = pos[k];
  const v = [0, 1, 2].map(j => (pos[k + 1][j] - pos[k - 1][j]) / (2 * STEP));
  const hx = r[1] * v[2] - r[2] * v[1], hy = r[2] * v[0] - r[0] * v[2], hz = r[0] * v[1] - r[1] * v[0];
  const inc = Math.atan2(Math.hypot(hx, hy), hz) / d2r;
  sumI += inc; cnt++;
  if (inc < minI) minI = inc;
  if (inc > maxI) maxI = inc;
}
const meanIReal = sumI / cnt;
console.log(`  real-Moon osculating i: mean ${meanIReal.toFixed(5)}°   range [${minI.toFixed(3)}, ${maxI.toFixed(3)}]°`);

// ═══ VERDICT ═══════════════════════════════════════════════════════════════
console.log('\nVerdict:');
console.log(`  catalog input:                        ${I_INPUT}°`);
console.log(`  lab-required mean-osc i (sinF=Meeus): ${iOscAtMeeus.toFixed(4)}°`);
console.log(`  real-Moon measured mean-osc i:        ${meanIReal.toFixed(4)}°`);
if (Math.abs(meanIReal - iOscAtMeeus) < Math.abs(meanIReal - I_INPUT)) {
  console.log('  → real Moon sides with the LAB: the catalog 5.1453964° is a THEORY CONSTANT,');
  console.log('    not the mean osculating inclination — D7\'s 0.2% dissolves into the i-convention.');
} else {
  console.log('  → real Moon sides with the CATALOG: the compression factor conflict is genuine —');
  console.log('    pure gravity + J2 + planets does not reproduce the observed sinF/i ratio.');
}
