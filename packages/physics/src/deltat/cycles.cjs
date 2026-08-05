/**
 * ΔT cycle-correction stack — THE shared implementation (Phase 8.4, slice 2).
 *
 * The four anchored lattice-cycle ΔT corrections (Bond 8H/1830, Hallstatt
 * 8H/1104, Jose5 8H/2989, Jose4 8H/3749 — Jose5/Jose4 are a COUPLED PAIR,
 * fitted jointly), their implied δLOD twins (the d/dy of each correction:
 * physical consistency between the corrected ΔT curve and the LOD curve),
 * and the Core-mantle swing episode (Resonator driver: 2-kick damped
 * eigenmode T₀ = 8H/685, Q = 1.8, plus one switch-on-compensated drive
 * tone at the bond−hallstatt difference frequency — the §10g-adjacent
 * phase-locked construction; docs/104 §6/§8).
 *
 * One ±300/400-kyr taper serves the whole family (the browser carried four
 * per-cycle copies of the same two JSON half-widths plus a fifth
 * function-local pair in its taper derivative — all value-identical,
 * dissolved here; the historical "Holocene taper" name survives only in
 * engine comments).
 *
 * MATCHED PAIR: the coefficients were fitted JOINTLY (dt-corrections-fit.js
 * --joint) with the USNO 86400.0014 / deltaTStart 56.05 anchors — the
 * 4-cycle+swing δLOD sum at J2000 closes Layer-4 LOD_real onto the USNO
 * anchor by construction. Coefficients and this evaluation form ship
 * together; do not simplify the anchored (raw − raw@2000) construction or
 * the impulse-consistent tone compensation.
 *
 * ENGINE-SIDE, by design: the enable flags (browser mutable research
 * toggles, Node env vars), the per-cycle gated wrappers, the stack sum,
 * and the coefficient PROVENANCE (browser FIT.DT_STACK/FIT.DT_RESONATOR,
 * Node the fit-output data JSONs) — all injected.
 */

'use strict';

/**
 * @typedef {{ latticeN: number, cosCoeffSeconds: number, sinCoeffSeconds: number }} CycleSpec
 * @typedef {{ tYear: number, cosSeconds: number, sinSeconds: number }} ResonatorKick
 * @typedef {{ dn: number, phiLockedRad: number, ampSeconds: number }} ResonatorTone
 */

/**
 * @typedef {Object} DeltaTCyclesDeps
 * @property {number} eightHYears - 8 × the holistic year (J2000)
 * @property {number} taperFullHalfwidthYears - full strength within |y−2000| ≤ this
 * @property {number} taperTotalHalfwidthYears - zero beyond
 * @property {number} tropicalYearSecondsJ2000 - δLOD denominator (variation ≤1e-8 in-window)
 * @property {Record<string, CycleSpec>} cycles - keyed bond/hallstatt/jose5/jose4
 * @property {{ t0LatticeN: number, q: number, kicks: ResonatorKick[],
 *   tones: ResonatorTone[] }} resonator
 */

/**
 * Build the cycle-correction evaluators over one engine's constant set.
 * All evaluators are UNGATED — the engines own their enable flags.
 * @param {DeltaTCyclesDeps} deps
 */
function createDeltaTCycles(deps) {
  const HW_FULL = deps.taperFullHalfwidthYears;
  const HW_TOTAL = deps.taperTotalHalfwidthYears;
  const YEAR_S = deps.tropicalYearSecondsJ2000;

  /** @param {number} year @returns {number} 1 inside, cosine roll-off, 0 beyond */
  function taperAt(year) {
    const dy = Math.abs(year - 2000);
    if (dy <= HW_FULL) return 1.0;
    if (dy >= HW_TOTAL) return 0.0;
    const u = (dy - HW_FULL) / (HW_TOTAL - HW_FULL);
    return 0.5 * (1.0 + Math.cos(Math.PI * u));
  }

  /** @param {number} year @returns {number} d(taper)/dy */
  function taperDerivativeAt(year) {
    const dy = Math.abs(year - 2000);
    if (dy <= HW_FULL) return 0;
    if (dy >= HW_TOTAL) return 0;
    const width = HW_TOTAL - HW_FULL;
    const u = (dy - HW_FULL) / width;
    // taper(y) = 0.5·(1 + cos(π·u)); d/dy = −0.5·π·sin(π·u) · (du/dy)
    // du/dy = (1/width) · sign(y − 2000)
    const sign = year >= 2000 ? 1 : -1;
    return -0.5 * Math.PI * Math.sin(Math.PI * u) / width * sign;
  }

  // Per-cycle derived constants — period = 8H/N, ω = 2π/period, and the
  // J2000 anchor value (the correction is exactly 0 at year 2000 by
  // construction: taper·(raw − raw@2000)).
  /** @type {Record<string, {omega: number, cosC: number, sinC: number, rawAtJ2000: number}>} */
  const cyc = {};
  for (const [key, c] of Object.entries(deps.cycles)) {
    const periodYears = deps.eightHYears / c.latticeN;
    const omega = 2 * Math.PI / periodYears;
    cyc[key] = {
      omega, cosC: c.cosCoeffSeconds, sinC: c.sinCoeffSeconds,
      rawAtJ2000: c.cosCoeffSeconds * Math.cos(omega * 2000) + c.sinCoeffSeconds * Math.sin(omega * 2000),
    };
  }

  /** Anchored cycle ΔT correction, seconds. 0 at 2000 and outside the taper.
   * @param {string} cycleKey @param {number} year @returns {number} */
  function cycleDeltaTSecondsAt(cycleKey, year) {
    const c = cyc[cycleKey];
    const taper = taperAt(year);
    if (taper <= 0) return 0;
    const raw = c.cosC * Math.cos(c.omega * year) + c.sinC * Math.sin(c.omega * year);
    return taper * (raw - c.rawAtJ2000);
  }

  /** Implied δLOD of one cycle correction (s to add to LOD_mean):
   *  δLOD = 86400 · d/dy[correction] / yearS, product rule over taper·(raw−raw₀).
   * @param {string} cycleKey @param {number} year @returns {number} */
  function cycleLodSecondsAt(cycleKey, year) {
    const c = cyc[cycleKey];
    const taper = taperAt(year);
    if (taper <= 0) return 0;
    const raw = c.cosC * Math.cos(c.omega * year) + c.sinC * Math.sin(c.omega * year);
    const raw_prime = c.omega * (c.sinC * Math.cos(c.omega * year) - c.cosC * Math.sin(c.omega * year));
    const taper_prime = taperDerivativeAt(year);
    const dCdy = taper_prime * (raw - c.rawAtJ2000) + taper * raw_prime;
    return 86400 * dCdy / YEAR_S;
  }

  // ── Core-mantle swing (Resonator driver) ─────────────────────────────────
  const R = deps.resonator;
  const RES_T0_YR = deps.eightHYears / R.t0LatticeN;
  const RES_W0 = 2 * Math.PI / RES_T0_YR;
  const RES_LAMBDA = RES_W0 / (2 * R.q);
  const RES_WD = RES_W0 * Math.sqrt(1 - 1 / (4 * R.q * R.q));
  const RES_KICKS = R.kicks.map((k) => ({ t: k.tYear, cos_s: k.cosSeconds, sin_s: k.sinSeconds }));
  const RES_TONES = R.tones.map((t) => ({
    omega: 2 * Math.PI * t.dn / deps.eightHYears, phi_locked: t.phiLockedRad, amp_s: t.ampSeconds,
  }));

  // IMPULSE-CONSISTENT episode: kicks are sin-only (displacement-continuous —
  // ΔT is accumulated angle and must not step); the drive tone's displacement
  // at the excitation epoch is cancelled by an eigenmode transient (switched-on
  // drive; slope discontinuities at the kicks ARE the impulses).
  /** @param {{omega: number, phi_locked: number}} t @returns {number} */
  function resonatorToneC0(t) {
    return Math.cos(t.omega * RES_KICKS[0].t - t.phi_locked);
  }

  /** @param {number} year @returns {number} raw episode displacement, seconds */
  function resonatorRawSecondsAt(year) {
    let v = 0;
    for (const k of RES_KICKS) {
      const dt = year - k.t;
      if (dt < 0) continue;
      const e = Math.exp(-RES_LAMBDA * dt);
      v += e * (k.cos_s * Math.cos(RES_WD * dt) + k.sin_s * Math.sin(RES_WD * dt));
    }
    const dt1 = year - RES_KICKS[0].t;
    if (dt1 >= 0) {
      const e1 = Math.exp(-RES_LAMBDA * dt1);
      for (const t of RES_TONES) {
        v += e1 * t.amp_s * (Math.cos(t.omega * year - t.phi_locked)
                             - resonatorToneC0(t) * Math.cos(RES_WD * dt1));
      }
    }
    return v;
  }

  /** @param {number} year @returns {number} d(raw)/dy */
  function resonatorRawPrimeAt(year) {
    let v = 0;
    for (const k of RES_KICKS) {
      const dt = year - k.t;
      if (dt < 0) continue;
      const e = Math.exp(-RES_LAMBDA * dt);
      v += e * ((-RES_LAMBDA * k.cos_s + RES_WD * k.sin_s) * Math.cos(RES_WD * dt)
              + (-RES_LAMBDA * k.sin_s - RES_WD * k.cos_s) * Math.sin(RES_WD * dt));
    }
    const dt1 = year - RES_KICKS[0].t;
    if (dt1 >= 0) {
      const e1 = Math.exp(-RES_LAMBDA * dt1);
      for (const t of RES_TONES) {
        const c0 = resonatorToneC0(t);
        // d/dy of e1·[cos(ωy−φ) − c0·cos(w_d·dt1)] — product rule
        v += e1 * t.amp_s * (-RES_LAMBDA * (Math.cos(t.omega * year - t.phi_locked)
                                            - c0 * Math.cos(RES_WD * dt1))
                             - t.omega * Math.sin(t.omega * year - t.phi_locked)
                             + c0 * RES_WD * Math.sin(RES_WD * dt1));
      }
    }
    return v;
  }

  // Analytic SECOND derivative — the dLOD/dt decomposition needs it: the
  // resonator's δLOD has a genuine STEP at each kick, and a finite-difference
  // rate smears it into a window-wide rectangle. Coefficient map applied
  // twice for the kicks; product rule expansion for the compensated tone.
  /** @param {number} year @returns {number} d²(raw)/dy² */
  function resonatorRawSecondAt(year) {
    let v = 0;
    for (const k of RES_KICKS) {
      const dt = year - k.t;
      if (dt < 0) continue;
      const e = Math.exp(-RES_LAMBDA * dt);
      const a1 = -RES_LAMBDA * k.cos_s + RES_WD * k.sin_s;
      const b1 = -RES_LAMBDA * k.sin_s - RES_WD * k.cos_s;
      const a2 = -RES_LAMBDA * a1 + RES_WD * b1;
      const b2 = -RES_LAMBDA * b1 - RES_WD * a1;
      v += e * (a2 * Math.cos(RES_WD * dt) + b2 * Math.sin(RES_WD * dt));
    }
    const dt1 = year - RES_KICKS[0].t;
    if (dt1 >= 0) {
      const e1 = Math.exp(-RES_LAMBDA * dt1);
      for (const t of RES_TONES) {
        const c0 = resonatorToneC0(t);
        const A = Math.cos(t.omega * year - t.phi_locked) - c0 * Math.cos(RES_WD * dt1);
        const A1 = -t.omega * Math.sin(t.omega * year - t.phi_locked)
                 + c0 * RES_WD * Math.sin(RES_WD * dt1);
        const A2 = -t.omega * t.omega * Math.cos(t.omega * year - t.phi_locked)
                 + c0 * RES_WD * RES_WD * Math.cos(RES_WD * dt1);
        v += t.amp_s * e1 * (RES_LAMBDA * RES_LAMBDA * A - 2 * RES_LAMBDA * A1 + A2);
      }
    }
    return v;
  }

  const RES_DT_RAW_AT_J2000 = resonatorRawSecondsAt(2000);

  /** @param {number} year @returns {number} anchored swing ΔT correction, s */
  function swingDeltaTSecondsAt(year) {
    const taper = taperAt(year);
    if (taper <= 0) return 0;
    return taper * (resonatorRawSecondsAt(year) - RES_DT_RAW_AT_J2000);
  }

  /** @param {number} year @returns {number} implied swing δLOD, s */
  function swingLodSecondsAt(year) {
    const taper = taperAt(year);
    if (taper <= 0) return 0;
    const dCdy = taperDerivativeAt(year) * (resonatorRawSecondsAt(year) - RES_DT_RAW_AT_J2000)
               + taper * resonatorRawPrimeAt(year);
    return 86400 * dCdy / YEAR_S;
  }

  /** Analytic d(δLOD)/dy — exact in the flat-taper region, central
   *  difference in the transition (values there are microscopic).
   * @param {number} year @returns {number} */
  function swingLodRateAt(year) {
    const taper = taperAt(year);
    if (taper <= 0) return 0;
    if (taper >= 1) {
      return 86400 * resonatorRawSecondAt(year) / YEAR_S;
    }
    return (swingLodSecondsAt(year + 1) - swingLodSecondsAt(year - 1)) / 2;
  }

  return {
    taperAt, taperDerivativeAt,
    cycleDeltaTSecondsAt, cycleLodSecondsAt,
    swingDeltaTSecondsAt, swingLodSecondsAt, swingLodRateAt,
  };
}

module.exports = { createDeltaTCycles };
