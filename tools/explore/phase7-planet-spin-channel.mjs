#!/usr/bin/env node
// PHASE 7 (plan 06; ex-K8b-3) — LAB RECORD: the planets' spin channel from
// their own torques, on the engine's own plane histories.
//
// This lab opened Phase 7 with research literals; the channel then landed as
// ONE home (packages/physics/src/planets/spin-channel.cjs, read through
// createModel().planets.spin) with its inputs in the CITED astro-reference
// block `planetSpinPhysical`. The lab now reads the shipped channel and adds
// what a lab may: the alternative-moment runs (Jupiter's empirical Juno fit,
// Saturn's Ward–Hamilton libration band) through the injectable constants,
// and the per-planet obliquity envelopes at two initial-azimuth twins to show
// the envelope's sensitivity (the shipped channel starts from the IAU pole,
// azimuth included — the twins here are the "what if the pole azimuth were
// 90° elsewhere" reading, a research question, not a published value).
//
//   node tools/explore/phase7-planet-spin-channel.mjs
//
// Validation targets (cited, never inputs): astro-reference planetSpinObserved
// and Margot et al. 2021's Venus pole rate 44.58 ± 3.3 ″/yr (quoted in the
// input block's _description).
const phys = await import('@essrt/physics');
const { createModel, DEFAULT_CONSTANTS, DEEP_MODES_ARTIFACT } = phys;
import { readFileSync } from 'node:fs';
const OBS = JSON.parse(readFileSync(new URL('../../public/input/astro-reference.json', import.meta.url), 'utf8')).planetSpinObserved;
const VENUS_OBS = { rate: 44.58, sigma: 3.3 };   // Margot et al. 2021 (lab literal, cited in the block)
const s = (k, m = createModel()) => m.planets.spin(k);
const pct = (a, b) => ((a / b - 1) * 100).toFixed(2) + ' %';
const lead = (p) => DEEP_MODES_ARTIFACT.planetLeadingZetaArcsecPerYr[p];

console.log('== the shipped channel (createModel().planets.spin) ==');
console.log('planet    λ (class)                  α ″/yr     ε₀ °      ψ̇₀ ″/yr    T₀ yr          band ±1 Myr');
const m0 = createModel();
for (const k of m0.planets.keys) {
  const c = s(k, m0);
  const b = c.cassiniLocked ? null : c.obliquityEnvelopeDeg(2000, 1_000_000);
  console.log(`${k.padEnd(9)} ${String(c.momentOfInertiaFactor).padEnd(8)} ${c.momentOfInertiaFactorClass.padEnd(18)} ${c.alphaArcsecPerYr.toFixed(4).padStart(9)} ${c.obliquityJ2000Deg.toFixed(3).padStart(8)} ${c.cassiniLocked ? '   (lock)' : c.spinPrecessionRateArcsecPerYrJ2000.toFixed(4).padStart(9)} ${c.cassiniLocked ? '—'.padStart(13) : Math.round(c.axialPrecessionPeriodYearsJ2000).toLocaleString('en-US').padStart(13)}   ${b ? `${b.minDeg.toFixed(2)}–${b.maxDeg.toFixed(2)}` : '—'}`);
}
console.log('\n  Mercury α_free / |s1| =', (s('mercury', m0).alphaArcsecPerYr / Math.abs(lead('mercury'))).toFixed(1), '(Cassini lock; the shipped axial row = the chain node rate)');
console.log('  Mars   closure vs Konopliv 2016:', pct(s('mars', m0).spinPrecessionRateArcsecPerYrJ2000, OBS.marsSpinPrecessionArcsecPerYr));
console.log('  Venus  closure vs Margot 2021:  ', pct(Math.abs(s('venus', m0).spinPrecessionRateArcsecPerYrJ2000), VENUS_OBS.rate), `(± ${(VENUS_OBS.sigma / VENUS_OBS.rate * 100).toFixed(1)} % 1σ)`);
console.log('  Saturn pole rate vs OUR s8:     ', pct(s('saturn', m0).spinPrecessionRateArcsecPerYrJ2000, lead('neptune')));
console.log('  Jupiter α vs Saillenfest 2020 low end 2.64:', pct(s('jupiter', m0).alphaArcsecPerYr, 2.64));

console.log('\n== the alternative moments, through the injectable constants (counterfactuals, not shipped) ==');
const withLambda = (k, lam) => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONSTANTS));
  c.planetSpinPhysical[k].momentOfInertiaFactor = lam;
  return s(k, createModel(c));
};
{
  const alt = DEFAULT_CONSTANTS.planetSpinPhysical.jupiter.momentOfInertiaFactorAlternative;
  const j = withLambda('jupiter', alt);
  console.log(`  Jupiter at the empirical Juno-fit λ ${alt}: α ${j.alphaArcsecPerYr.toFixed(4)} ″/yr (${pct(j.alphaArcsecPerYr, 2.64)} vs Saillenfest's low end)`);
  const [lo, hi] = DEFAULT_CONSTANTS.planetSpinPhysical.saturn.momentOfInertiaFactorAlternative;
  for (const lam of [lo, (lo + hi) / 2, hi]) {
    const sat = withLambda('saturn', lam);
    console.log(`  Saturn at the WH04 libration band λ ${lam.toFixed(4)}: α ${sat.alphaArcsecPerYr.toFixed(4)}, pole rate ${sat.spinPrecessionRateArcsecPerYrJ2000.toFixed(4)} ″/yr → vs our s8 ${pct(sat.spinPrecessionRateArcsecPerYrJ2000, lead('neptune'))}`);
  }
}

console.log('\n== envelope sensitivity to the initial azimuth (research twin: the pole turned 90° about the orbit normal) ==');
const CH = /** @type {any} */ (phys.CHAIN_ARTIFACT).j2000AnchorElements;
for (const k of ['mars', 'jupiter', 'saturn']) {
  const c = s(k, m0);
  const A = CH[k];
  const twin = phys.createPlanetSpinChannel({
    key: k,
    spin: { ...DEFAULT_CONSTANTS.planetSpinPhysical[k], poleRaJ2000Deg: DEFAULT_CONSTANTS.planetSpinPhysical[k].poleRaJ2000Deg + 90 / Math.cos(DEFAULT_CONSTANTS.planetSpinPhysical[k].poleDecJ2000Deg * Math.PI / 180) },
    zetaModes: DEEP_MODES_ARTIFACT.planetZeta[k],
    anchorInclEclipticDeg: A.inclEclipticDeg, anchorAscNodeEclipticDeg: A.ascNodeEclipticDeg,
    semiMajorAxisAU: A.aAU, eccentricity: A.e,
    massFractionOfSun: 1 / DEFAULT_CONSTANTS.physicalConstants.massRatioDE440[k],
    gmSunKm3S2: 132712440041.9394,   // lab literal: the IAU 2015 nominal GM☉ (the model derives its own inside createModel; a research twin only)
    obliquityJ2000Deg: DEFAULT_CONSTANTS.earthOrbital.obliquityJ2000_deg,
  });
  const b0 = c.obliquityEnvelopeDeg(2000, 1_000_000), b1 = twin.obliquityEnvelopeDeg(2000, 1_000_000);
  console.log(`  ${k.padEnd(8)} shipped ${b0.minDeg.toFixed(2)}–${b0.maxDeg.toFixed(2)}   azimuth twin (ε₀ ${twin.obliquityJ2000Deg.toFixed(2)}°) ${b1.minDeg.toFixed(2)}–${b1.maxDeg.toFixed(2)}`);
}
