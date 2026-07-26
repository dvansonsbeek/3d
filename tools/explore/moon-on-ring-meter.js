/**
 * moon-on-ring-meter.js — Stage C gate (i), offline version.
 *
 * Measures whether the OVERRIDE Moon (Meeus series on the framework argument
 * skeleton — what you SEE) rides the RING (the raw scene hierarchy orbit —
 * the visible orbit line) at deep time.
 *
 * Method: at each epoch, sample the override Moon over one month (48 points),
 * then disable the override (C.useVariableSpeed = false + graph invalidation)
 * and sample the raw hierarchy ring densely (240 points over one draconitic
 * month). For each override sample, find the nearest ring point and decompose
 * the gap into out-of-plane (vs the ring's fitted plane) and in-plane
 * (radial/along-shape) components.
 *
 * Usage:  SG_DEEP_TIME=1 node tools/explore/moon-on-ring-meter.js
 *         (always-chains is unconditional in deep-time mode)
 */

const C = require('../lib/constants');

const EPOCHS = [2000, -584, 12000, 52000, 122000, 222000];
const AU_KM = 149597870.7;

function sampleMoon(SG, jd0, n, spanDays) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const jd = jd0 + (i / n) * spanDays;
    const p = SG.computePlanetPosition('moon', jd);
    const ra = SG.thetaToRaDeg(p.ra) * Math.PI / 180;
    const dec = SG.phiToDecDeg(p.dec) * Math.PI / 180;
    const r = p.distAU * AU_KM;
    pts.push([r * Math.cos(dec) * Math.cos(ra), r * Math.cos(dec) * Math.sin(ra), r * Math.sin(dec)]);
  }
  return pts;
}

function planeNormal(pts) {
  // average cross product of successive radius vectors (orbit normal)
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    nx += a[1] * b[2] - a[2] * b[1];
    ny += a[2] * b[0] - a[0] * b[2];
    nz += a[0] * b[1] - a[1] * b[0];
  }
  const m = Math.hypot(nx, ny, nz);
  return [nx / m, ny / m, nz / m];
}

function planeInfo(pts) {
  const n = planeNormal(pts);
  const incl = Math.acos(Math.abs(n[2])) * 180 / Math.PI;            // tilt vs scene z-plane
  const node = ((Math.atan2(n[1], n[0]) * 180 / Math.PI + 90) % 360 + 360) % 360; // ascending-node azimuth
  return { n, incl, node };
}

function analyze(label, moonPts, ringPts) {
  const nrm = planeNormal(ringPts);
  const pm = planeInfo(moonPts), pr = planeInfo(ringPts);
  const dot = Math.min(1, Math.abs(pm.n[0]*pr.n[0] + pm.n[1]*pr.n[1] + pm.n[2]*pr.n[2]));
  const planeAngle = Math.acos(dot) * 180 / Math.PI;
  let maxGap = 0, sumGap = 0, maxOop = 0, sumOop = 0, maxRad = 0;
  for (const p of moonPts) {
    let best = Infinity, bestR = null;
    for (const q of ringPts) {
      const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      if (d < best) { best = d; bestR = q; }
    }
    const oop = Math.abs(p[0] * nrm[0] + p[1] * nrm[1] + p[2] * nrm[2]);      // distance from ring plane
    const rMoon = Math.hypot(p[0], p[1], p[2]);
    const rRing = Math.hypot(bestR[0], bestR[1], bestR[2]);
    const rad = Math.abs(rMoon - rRing);
    sumGap += best; if (best > maxGap) maxGap = best;
    sumOop += oop; if (oop > maxOop) maxOop = oop;
    if (rad > maxRad) maxRad = rad;
  }
  const n = moonPts.length;
  console.log(label.padEnd(9),
    'gap mean', (sumGap / n).toFixed(0).padStart(7), ' max', maxGap.toFixed(0).padStart(7), 'km',
    '| oop max', maxOop.toFixed(0).padStart(6), '| rad max', maxRad.toFixed(0).padStart(7),
    '| planes ∠', planeAngle.toFixed(3).padStart(7) + '°',
    '| incl M/R', pm.incl.toFixed(2) + '/' + pr.incl.toFixed(2),
    '| node M/R', pm.node.toFixed(1).padStart(6) + '/' + pr.node.toFixed(1).padStart(6));
}

// pass 1: override Moon at all epochs
const SG1 = require('../lib/scene-graph');
const overrideSamples = {};
for (const yr of EPOCHS) {
  const jd0 = C.j2000JD + (yr - 2000) * 365.2425;
  overrideSamples[yr] = sampleMoon(SG1, jd0, 48, 27.3);
}
// pass 2: kill the override, re-require via cache purge for a clean graph
C.useVariableSpeed = false;
delete require.cache[require.resolve('../lib/scene-graph')];
const SG2 = require('../lib/scene-graph');
console.log('Moon-on-ring meter — override Moon vs raw hierarchy ring');
console.log('deep-time:', process.env.SG_DEEP_TIME === '1' ? 'ON' : 'OFF',
  ' chains: always-on in deep-time mode');
for (const yr of EPOCHS) {
  const jd0 = C.j2000JD + (yr - 2000) * 365.2425;
  const ring = sampleMoon(SG2, jd0, 240, 27.3);
  analyze(String(yr), overrideSamples[yr], ring);
}
console.log('\nInterpretation: out-of-plane = Moon above/below the visible ring plane;');
console.log('radial = inside/outside the ring ellipse; nearest-gap = what the eye sees.');
