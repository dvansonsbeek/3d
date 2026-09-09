#!/usr/bin/env node
// STAGE C LAB — the obliquity/spin HYBRID (engine-switch record, plan 02 §8;
// K8b-3/D5 opening result; the verdict generator tools/verify/
// obliquity-hybrid.js runs this lab under --json).
//
// The MATHEMATICS lives ONCE in @essrt/physics/earth/deep-orbital-history
// (the C-3 one-home factory): ds/dt = α (ŝ·n̂)(ŝ×n̂) with n̂(t) from an
// anchored ζ mode-sum and ONE engine-K anchor α = (H/13 rate)/cos ε₀ —
// zero fitted constants. This lab instantiates BOTH ζ tiers (the era tier
// = its OWN 8-term extraction earthZetaEra — never a slice of the deep
// table; the Gram–Schmidt reshaping lesson) and compares against La2004
// (THEORY reference) and the shipped 16-harmonic fitted law.
//
// MEASURED (the discovery record; the banked verdict reproduces it):
//   dε/dt(J2000) = −46.96 ″/cy vs IAU −46.84 (0.25%) — the scene A-solve's
//     TARGET, derived (an era-tier quantity: the deep table's local slope
//     reads −38.5, the remainder-shift class);
//   era tier 0–13 kyr: 51″ rms corr 0.999 (fitted law: 711″); deep tier:
//     flat ~0.1° corr ≥ 0.985 across the full megayear;
//   the H/8 identity natively: dominant beat |ψ̇| − |s₃| = 41.2 kyr.
// CONVENTION CATCH: the J2000 celestial pole sits at ecliptic longitude
//   +90°; the −90° choice gives corr −0.998 — the instant tell.
import { readFileSync } from 'node:fs';
import * as phys from '@essrt/physics';

const model = phys.createModel();
const R2D = 180 / Math.PI;

const MT = JSON.parse(readFileSync(new URL('../../data/nbody-deep-secular-modes.json', import.meta.url), 'utf8'));
const AE = /** @type {any} */ (phys.CHAIN_ARTIFACT).j2000AnchorElements.earth;
const axialYears = model.epoch.axialPrecessionYearsAtYear(2000);
const eps0Deg = model.constants.earthOrbital.obliquityJ2000_deg;

const mkTier = (zetaModes) => phys.createDeepOrbitalHistory({
  zModes: MT.modes.earth.z,
  zetaModes,
  anchorE: AE.e,
  anchorPeriEclipticDeg: AE.lonPeriEclipticDeg,
  anchorInclEclipticDeg: AE.inclEclipticDeg,
  anchorAscNodeEclipticDeg: AE.ascNodeEclipticDeg,
  axialPrecessionYearsJ2000: axialYears,
  obliquityJ2000Deg: eps0Deg,
});
const tierFull = mkTier(MT.modes.earth.zeta);
const tierEra = mkTier(MT.earthZetaEra ?? MT.modes.earth.zeta.slice(0, 8));

console.log(`alpha = ${tierFull.alphaArcsecPerYr.toFixed(3)}"/yr  (H/13-anchored; literature precession constant ~54.9)`);

const la = readFileSync(new URL('../../data/la2004-earth-51myr-back.asc', import.meta.url), 'utf8')
  .trim().split('\n').map((l) => l.trim().split(/\s+/).map((x) => Number(x.replace('D', 'E'))));
const laEps = new Map(la.map((r) => [Math.round(-r[0]), r[2] * R2D]));
const epsK = (y) => model.earth.obliquityDeg(y);
const corr = (a, b) => { const m = (x) => x.reduce((p, c) => p + c) / x.length; const ma = m(a), mb = m(b); let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { ab += (a[i] - ma) * (b[i] - mb); aa += (a[i] - ma) ** 2; bb += (b[i] - mb) ** 2; } return ab / Math.sqrt(aa * bb); };

function runVariant(tier) {
  const S = tier.build(200, -1_000_000, 1000);
  // ±100-yr central difference on a FINE grid (at(±100) must be exact grid
  // nodes — a 1000-yr grid lerps in millennium-scale curvature; the verdict
  // generator's refuse-gate caught exactly that during the C-3 refactor).
  const R = tier.build(-150, 150, 50);
  const rate = ((R.at(100).epsDeg - R.at(-100).epsDeg) / 200) * 3600 * 100;   // ″/cy
  const windows = {};
  for (const kyrMax of [13, 50, 130, 270, 600, 1000]) {
    let sh = 0, sk = 0, n = 0; const vh = [], vk = [], vl = [];
    for (let k = 0; k <= kyrMax; k++) {
      const l = laEps.get(k);
      if (l === undefined) continue;
      const h = S.at(-k * 1000).epsDeg;
      const kk = epsK(2000 - k * 1000);
      sh += (h - l) ** 2; sk += (kk - l) ** 2; n++;
      vh.push(h); vk.push(kk); vl.push(l);
    }
    windows[kyrMax] = {
      hybridRmsArcsec: Math.sqrt(sh / n) * 3600, hybridCorr: corr(vh, vl),
      fittedLawRmsArcsec: Math.sqrt(sk / n) * 3600, fittedLawCorr: corr(vk, vl),
    };
  }
  return { rateArcsecPerCy: rate, windows };
}

const full = runVariant(tierFull);
const era = runVariant(tierEra);

// dominant obliquity beat: the equinox and the node BOTH regress, so the
// relative rate is the DIFFERENCE |psi-dot| − |s₃| (the H/8 identity).
const psiDotRadPerYr = (2 * Math.PI) / axialYears;
const sDom = MT.modes.earth.zeta.filter((m) => Math.abs(m.omegaRadPerYr) > 1e-9)
  .sort((a, b) => Math.hypot(b.re, b.im) - Math.hypot(a.re, a.im))[0];
const beatKyr = 2 * Math.PI / (psiDotRadPerYr - Math.abs(sDom.omegaRadPerYr)) / 1000;

console.log(`d eps/dt at J2000 (era tier): ${era.rateArcsecPerCy.toFixed(2)} "/cy   (IAU −46.84 — the shipped A-solve's TARGET, here derived; full-table local slope ${full.rateArcsecPerCy.toFixed(2)} — the remainder-shift class)`);
console.log(`dominant obliquity beat |ψ̇| − |s₃|: ${beatKyr.toFixed(1)} kyr (the H/8 identity, derived)`);
for (const [label, v] of [['full ζ table', full], [`era ζ tier (${(MT.earthZetaEra ?? []).length || 8} terms)`, era]]) {
  console.log(`\n== eps(t) vs La2004 — ${label} — vs the shipped fitted law ==`);
  for (const kyrMax of [13, 50, 130, 270, 600, 1000]) {
    const w = v.windows[kyrMax];
    console.log(`  0-${String(kyrMax).padEnd(4)} kyr:  hybrid rms ${w.hybridRmsArcsec.toFixed(1).padStart(7)}"  corr ${w.hybridCorr.toFixed(3)}   |  fitted law rms ${w.fittedLawRmsArcsec.toFixed(1).padStart(7)}"  corr ${w.fittedLawCorr.toFixed(3)}`);
  }
}

if (process.argv.includes('--json')) {
  console.log('@@OBLIQUITY_HYBRID_JSON@@ ' + JSON.stringify({
    alphaArcsecPerYr: tierFull.alphaArcsecPerYr,
    psiDotH13ArcsecPerYr: (psiDotRadPerYr * R2D) * 3600,
    rateFullArcsecPerCy: full.rateArcsecPerCy,
    rateEraArcsecPerCy: era.rateArcsecPerCy,
    beatKyr,
    zetaTermsFull: MT.modes.earth.zeta.length,
    zetaTermsEra: (MT.earthZetaEra ?? MT.modes.earth.zeta.slice(0, 8)).length,
    windowsFull: full.windows, windowsEra: era.windows,
  }));
}
