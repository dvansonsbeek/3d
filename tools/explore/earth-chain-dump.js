/**
 * earth-chain-dump.js — earth-chain frame divergence hunt (tools twin of the
 * browser divergence meter's "[deep N] earth-chain:" rows).
 *
 * Prints, at each deep epoch and in the SAME conventions as the browser dump:
 *   eo      — earth.orbit rotation (H/13 frame)
 *   incl/ecl/obl/peri1/peri2 — the five Sun-chain tilt-layer rotations
 *   eps     — obliquity of date used by the λβ→RA/Dec conversion
 *   axX     — world azimuth of the rotAxis frame's local x-axis
 *   azW0/azW90 — world azimuth of ecliptic-of-date longitudes 0°/90°
 *                through the conversion (eps + rotAxis) — the frame the
 *                override Moon is placed in
 *
 * Diff against the browser rows: the first column that diverges
 * epoch-dependently is the diverging chain element.
 *
 * Usage: SG_DEEP_TIME=1 node tools/explore/earth-chain-dump.js
 */

const C = require('../lib/constants');
const SG = require('../lib/scene-graph');
const OE = require('../lib/orbital-engine');

const EPOCHS = [2000, -584, 12000, 52000, 122000, 200000, 222000];
const d2r = Math.PI / 180;
const wd = (r) => ((r / d2r) % 360 + 360) % 360;

console.log('epoch      eo      incl     ecl      obl      peri1    peri2    eps       axX      azW0     azW90');
for (const yr of EPOCHS) {
  const jd = C.j2000JD + (yr - 2000) * 365.2422;
  SG.computePlanetPosition('moon', jd);            // animates graph + updates matrices (deep sync incl.)
  const g = SG._getGraphForProbe();
  const grabE = (nm) => { let p = g.earthNodes.pivot; while (p && p.name !== nm) p = p.parent; return p; };
  const eo = grabE('earth.orbit');
  // tilt chain hangs under earth.pivot alongside the moon stack
  const grabDown = (root, nm) => {
    let hit = null;
    (function walk(n) { if (hit) return; if (n.name === nm) { hit = n; return; } for (const c of n.children) walk(c); })(root);
    return hit;
  };
  const incl  = grabDown(g.root, 'earthInclinationPrecession.orbit');
  const ecl   = grabDown(g.root, 'earthEclipticPrecession.orbit');
  const obl   = grabDown(g.root, 'earthObliquityPrecession.orbit');
  const peri1 = grabDown(g.root, 'earthPerihelionPrecession1.orbit');
  const peri2 = grabDown(g.root, 'earthPerihelionPrecession2.orbit');
  const currentYear = C.balancedYear + (jd - C.balancedJD) / (SG._epochCacheMSY ? SG._epochCacheMSY() : C.meansolaryearlengthinDays);
  const eps = OE.computeObliquityEarth(2000 + (jd - C.j2000JD) / 365.2422) * d2r;
  const rm = g.earthNodes.rotAxis.worldMatrix.e;
  const azW = (lamDeg) => {
    const lam = lamDeg * d2r;
    const RA = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));
    const phi = Math.PI / 2 - Math.asin(Math.sin(eps) * Math.sin(lam));
    const vx0 = Math.sin(phi) * Math.sin(RA), vy0 = Math.cos(phi), vz0 = Math.sin(phi) * Math.cos(RA);
    const vx = rm[0]*vx0 + rm[4]*vy0 + rm[8]*vz0;
    const vz = rm[2]*vx0 + rm[6]*vy0 + rm[10]*vz0;
    return ((Math.atan2(-vz, vx) / d2r) % 360 + 360) % 360;
  };
  const axX = ((Math.atan2(-rm[2], rm[0]) / d2r) % 360 + 360) % 360;
  const f = (n) => (n ? wd(n.ry).toFixed(2).padStart(8) : '     n/a');
  console.log(String(yr).padStart(6),
    f(eo), f(incl), f(ecl), f(obl), f(peri1), f(peri2),
    (eps / d2r).toFixed(4).padStart(9), axX.toFixed(2).padStart(8),
    azW(0).toFixed(2).padStart(8), azW(90).toFixed(2).padStart(8));
}
console.log('\nDiff these rows against the browser divergence meter "[deep N] earth-chain:" lines.');
console.log('A constant offset per column = convention difference (harmless).');
console.log('An epoch-DEPENDENT difference = the diverging chain element (root cause).');
