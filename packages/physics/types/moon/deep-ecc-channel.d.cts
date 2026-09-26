/**
 * THE SLOPE ANCHOR (owner-approved model change, after the Moon panels).
 * The 18-term table reproduces the attractor and the 405-kyr beat, but
 * nothing constrained its local DERIVATIVE at J2000: measured, its ė read
 * −5.00e-5/cy against the run's own −4.24e-5 (and the observed −4.20e-5),
 * a 19 % slope error that the lunar chain multiplied straight into the
 * perigee and node curvature (−44″/cy² against Meeus's −37″/cy² — the
 * "18 % split" the Moon precession panels showed). Against the ±10-Myr
 * series the table compresses, the error is a LINEAR vector drift of
 * 2.25e-4 per kyr out to ±20 kyr (an unresolved ultra-long mode), then
 * spectrum-class either way. So the anchored form gains a second,
 * BOUNDED term of the same class as the constant remainder:
 *
 *     z(t) = Σ … + (z_J2000 − Σ(0)) + (ż_J2000 − Σ̇(0))·I(t),
 *     I(t) = ∫₀ᵗ cos²(π τ / 2T_q) dτ  (the arguments' taper: linear near
 *            J2000, saturating at ±T_q/2 beyond |t| ≥ T_q)
 *
 * — ż_J2000 is the run's own z-rate at J2000 (script-written into the
 * artifact by generate.mjs from the banked series: "we are the source"),
 * T_q the H/12 taper the arguments' rate anchors ride. Inside the canon it
 * restores the run's slope exactly; beyond ±T_q it is a constant vector
 * offset of ~3e-3, the size of the table's own spectrum-class scatter
 * there, never a growing polynomial. Absent the two fields (an older
 * artifact), the channel is the value-anchored form above, unchanged.
 *
 * @param {{
 *   earthZ: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   anchorE: number,
 *   anchorPeriEclipticDeg: number,
 *   anchorZDotPerYr?: ReadonlyArray<number>,
 *   slopeTaperYears?: number,
 * }} artifact — the embedded deep-modes artifact (earth z-modes + the J2000
 *   anchor pair joined from the chain artifact's one home, + the J2000
 *   z-rate pair and the taper from the series' one home).
 */
export function createDeepEccChannel({ earthZ, anchorE, anchorPeriEclipticDeg, anchorZDotPerYr, slopeTaperYears }: {
    earthZ: ReadonlyArray<{
        omegaRadPerYr: number;
        re: number;
        im: number;
    }>;
    anchorE: number;
    anchorPeriEclipticDeg: number;
    anchorZDotPerYr?: ReadonlyArray<number>;
    slopeTaperYears?: number;
}): {
    eccAt: (tYr: number) => number;
    eccRateAt: (tYr: number) => number;
    modulation: (tMa: number, s: number) => number;
    channelIntegral: (T: number, s: number) => number;
    eFactorAt: (tYr: number) => number;
    e0: number;
    g0: number;
};
