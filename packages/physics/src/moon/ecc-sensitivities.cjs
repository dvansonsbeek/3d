/**
 * The lunar perigee/node eccentricity sensitivities — ONE home (plan 23).
 *
 * The Sun's mean perturbation on the lunar perigee and node scales as
 * g(e_E) = (1 − e_E²)^(−3/2); the of-date rates ride the channel
 * rate(t) = rate₀ · [g(e_E(t))/g₀]^s. The pair the record fixes is the
 * MEEUS-EFFECTIVE one: s_ϖ = 2.407 / s_Ω = 1.018 reproduce Meeus Ch. 47's
 * of-date T² coefficients exactly (doc 66 §1, the (ė, s) degeneracy). Each of
 * those T² coefficients contains the equinox's own acceleration — the general
 * precession's T² term, a frame bookkeeping share that has nothing to do with
 * Earth's eccentricity. Removing it gives the PHYSICAL pair the three-body
 * laboratory reproduces from pure gravity (2.479 / 0.867; doc 66 §1):
 *
 *     s_phys = (s_eff · Ẋ_of-date · κ/2 − T2_frame) / (Ẋ_ICRF · κ/2),
 *     κ = 3 e₀ ė₀ / (1 − e₀²),   Ẋ_ICRF = Ẋ_of-date − p₀
 *
 * — derived here from the injected constants, never typed. The runtime (plan
 * 23) carries s_phys in the channel and ONE frame term, the model's own
 * precession of date, on every of-date lunar longitude alike, so the
 * frame-free arguments M′ = L′ − ϖ and F = L′ − Ω cancel it exactly at every
 * epoch. Measured before the change (plan 23 §0): with the frame share frozen
 * inside s_eff on the eccentricity channel, M′ and F inherited L′'s frame term
 * uncancelled — 2.5° at ±10 kyr, 39° at −1 Myr — and the perigee and node
 * carried a 3 % share of the channel's own wiggle that is not theirs; in the
 * historical window the change is ≤ 21″ of ϖ/Ω at ±3000 (seconds of eclipse
 * time).
 *
 * The Meeus Ch. 47 argument RATES live here too (the ONE set the arguments
 * module, its pure-Meeus reference and this derivation share).
 */

'use strict';

/** Meeus Ch. 47 mean-argument rates, degrees per Julian century (the J2000 polynomials' linear terms). */
const MEEUS_ARGUMENT_RATES_DEG_PER_CY = Object.freeze({
  Lp: 481267.88123421,   // the Moon's mean longitude L′
  D: 445267.1114034,     // the mean elongation
  M: 35999.0502909,      // the Sun's mean anomaly
  Mp: 477198.8675055,    // the Moon's mean anomaly M′
  F: 483202.0175233,     // the argument of latitude
});

/** The Meeus-effective pair: Meeus-exact of-date T² by construction (the shipped record values). */
const MOON_ECC_SENSITIVITY_PERIGEE = 2.407;
const MOON_ECC_SENSITIVITY_NODE = 1.018;

/**
 * The physical pair and the rate split, derived from the shipped constants.
 * @param {{
 *   eccentricityJ2000: number,
 *   eccentricityDotJ2000: number,
 *   frameT2ArcsecPerCy2: number,
 *   generalPrecessionArcsecPerYr: number,
 * }} inputs — e₀ (the catalog secular value the Taylor checks use); ė₀ per
 *   Julian century; the general precession's T² coefficient the of-date Meeus
 *   polynomials embed (Lieske 1976, the ELP frame), ″/cy²; p₀, the IAU 2006 p_A
 *   linear rate, ″/yr
 * @returns {Readonly<{
 *   perigeeEffective: number, nodeEffective: number,
 *   perigeePhysical: number, nodePhysical: number,
 *   kappaPerCy: number, frameT2DegPerCy2: number, generalPrecessionDegPerCy: number,
 *   perigeeRateOfDateDegPerCy: number, nodeRateOfDateDegPerCy: number,
 *   perigeeRateIcrfDegPerCy: number, nodeRateIcrfDegPerCy: number,
 * }>}
 */
function deriveMoonEccSensitivities({ eccentricityJ2000, eccentricityDotJ2000, frameT2ArcsecPerCy2, generalPrecessionArcsecPerYr }) {
  const R = MEEUS_ARGUMENT_RATES_DEG_PER_CY;
  const e0 = eccentricityJ2000, ed = eccentricityDotJ2000;
  const kappaPerCy = 3 * e0 * ed / (1 - e0 * e0);
  const generalPrecessionDegPerCy = generalPrecessionArcsecPerYr * 100 / 3600;
  const frameT2DegPerCy2 = frameT2ArcsecPerCy2 / 3600;
  const perigeeRateOfDateDegPerCy = R.Lp - R.Mp;   // ϖ̇ of date (+4069.0137) = ϖ̇_ICRF + p₀
  const nodeRateOfDateDegPerCy = R.Lp - R.F;       // Ω̇ of date (−1934.1363) = Ω̇_ICRF + p₀
  const perigeeRateIcrfDegPerCy = perigeeRateOfDateDegPerCy - generalPrecessionDegPerCy;
  const nodeRateIcrfDegPerCy = nodeRateOfDateDegPerCy - generalPrecessionDegPerCy;
  const half = kappaPerCy / 2;
  const perigeePhysical = (MOON_ECC_SENSITIVITY_PERIGEE * perigeeRateOfDateDegPerCy * half - frameT2DegPerCy2) / (perigeeRateIcrfDegPerCy * half);
  const nodePhysical = (MOON_ECC_SENSITIVITY_NODE * nodeRateOfDateDegPerCy * half - frameT2DegPerCy2) / (nodeRateIcrfDegPerCy * half);
  return Object.freeze({
    perigeeEffective: MOON_ECC_SENSITIVITY_PERIGEE, nodeEffective: MOON_ECC_SENSITIVITY_NODE,
    perigeePhysical, nodePhysical,
    kappaPerCy, frameT2DegPerCy2, generalPrecessionDegPerCy,
    perigeeRateOfDateDegPerCy, nodeRateOfDateDegPerCy, perigeeRateIcrfDegPerCy, nodeRateIcrfDegPerCy,
  });
}

module.exports = { MEEUS_ARGUMENT_RATES_DEG_PER_CY, MOON_ECC_SENSITIVITY_PERIGEE, MOON_ECC_SENSITIVITY_NODE, deriveMoonEccSensitivities };
