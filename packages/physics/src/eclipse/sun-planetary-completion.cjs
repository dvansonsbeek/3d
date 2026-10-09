/**
 * Sun planetary completion v3 — the DERIVED table on FRAMEWORK carriers
 * (FQ-5 N3, plan §12i; supersedes v2's IAU-literal argument rates, which
 * superseded the v1 fitted 10-term table).
 *
 * DERIVATION, not fit: the table is extracted from the framework's OWN
 * physics — twin epoch-phased 8-body RK4 integrations (Sun, planets, EMB)
 * built entirely from framework constants, planet phases taken from the
 * engine scene graph, differenced full-vs-base3 to isolate the planetary
 * signal, with the EMB secular-perihelion channel projected out (that
 * channel belongs to the framework's own ϖ(t)/e(t) laws). The 70 terms
 * below are the analytic reading of that derived signal: main synodic
 * tones plus eccentricity-modulation sidebands (main ± mean anomaly of
 * the modulating planet, main ± M_E). Table-vs-signal fidelity 0.61″
 * (the v2 IAU-carrier projection read 0.64″ — the framework carriers are
 * the signal's NATURAL basis, since the lab's tones sit at the framework
 * synodic frequencies). JPL Horizons enters only as VALIDATION, never as
 * fit target. Instruments: tools/explore/d2-derived-sun.mjs (signal),
 * n2-sun-framework-carriers.mjs (carrier feasibility + conditioning),
 * n3-carrier-swap-preview.mjs (table + the swap gates).
 *
 * THE CARRIERS (FQ-5 N3, the doctrine's final mile for the Sun side):
 * the six planetary mean-longitude RATES are no longer instrument
 * literals — they are INJECTED by the model wiring, computed live from
 * the framework's own planet records, as is the Moon-elongation rate for
 * the EMB-wobble carrier. PLAN 06 I2 — the injected rates are SIDEREAL
 * (the record's of-date rate minus the model's own J2000 precession;
 * Earth the framework sidereal year; model.js): a perturbation argument
 * is inertial (D'Alembert — only Σk = 0 arguments are frame-free), and
 * on the N3 of-date carriers every Σk ≠ 0 row (3V−4E, E−2J, 2V−3E,
 * 2E−3J, 2E−3M, 2M−E, 2(2M−E) …) drifted by Σk·ψ(t): 42..52° at −3000,
 * measured against JPL Horizons over ±3000 yr as the dominant ancient
 * scatter of the certified Sun (6.4″ → 4.4″ at −3000, 6.0 → 4.6″ at
 * −2000, 3.6 → 3.0″ at 0 AD on sidereal carriers; 1900–2100 unchanged).
 * The 70 N3 literals are KEPT: the two carrier sets share the J2000
 * anchors and part by ≤ 1.4°·|Σk| at the 200-yr window's edges, and the
 * re-extraction on sidereal carriers (tools/explore/i2-sidereal-carrier-
 * table.mjs) reproduces the composed function (fidelity 0.612 vs 0.614″,
 * JPL 1900–2100 all-phase sd identical to 0.01″) while redistributing
 * the near-degenerate ±M sideband pairs — only the composed function
 * ships, so the literals stay as extracted. The J2000 phase
 * anchors (ARG_L0, PERI, D0) remain declared epoch constants — the
 * "anchored by design" class; any constant phase offset is absorbed into
 * the fitted cos/sin split exactly. N3 gates measured before the swap:
 * all-phase JPL sd 2.15″ → 2.14″ (unchanged), syzygy fleet unchanged to
 * 0.01″, BCE arbitration detrended sd 0.199 min ≈ 5.5 km — below the
 * ancient corpus's discriminating power; conditioning probe: the v2 and
 * v3 composed tables agree at 0.146″ RMS in-window, diverging only
 * 0.93″ at ±600 yr (benign near-degenerate repartition, no
 * ill-conditioning).
 *
 * DECLARED INPUTS (the remaining non-framework residues):
 *  (i)  planet/Sun mass ratios — observed IAU constants (shared with the
 *       whole framework; nothing here fits them);
 *  (ii) the J2000 phase anchors ARG_L0 / PERI / D0 — epoch initial
 *       conditions ("anchored by design" class; the RATES are now
 *       framework-derived, injected);
 *  (iii) RETIRED (FQ-7-Sun annual-channel attribution): the former
 *       declared-fitted +1.42″ sin 2lE term. It was fitted against a
 *       Sun-ALONE JPL comparison bridged by the leading nutation term
 *       only, and the attribution measured it as the semiannual
 *       nutation term −1.32″ sin(2F−2D+2Ω) ≡ −1.32″ sin 2lE in disguise
 *       (2M residual 0.13″ under that bridge, 1.43″ ≡ the term's
 *       negative under the fuller bridge). Nutation in longitude is a
 *       frame rotation common to Sun AND Moon — this chain keeps both
 *       bodies MEAN-of-date (mean obliquity, mean sidereal time; see
 *       besselian.cjs), so a Sun-only nutation term is a frame
 *       inconsistency for elongation. Removed: the nutation-free syzygy
 *       fleet improves 3.877 → 3.756″ and the fuller-bridged Sun
 *       comparison 2.344 → 2.123″ (fq7s-jpl-preview.mjs --no-2le;
 *       fq7s-annual-channel.mjs). This file now carries ZERO fitted
 *       constants. The Earth-around-EMB wobble is DERIVED: amplitude
 *       a_M·μ/AU with μ = 1/(1+M_E/M_M), injected by the model wiring
 *       from live package constants (6.4399″ at current constants), sign
 *       negative in the subtract convention.
 *
 * THE CONSTANT-ATTRIBUTION RULE (v1's 20.3h-lite trap, still honored):
 * the table carries NO constant term — the constant is attributed to the
 * tier's existing anchors, so the terms ship without the +6″ syzygy-mean
 * penalty an eclipse-sample fit produced.
 *
 * Sign convention: unchanged — the evaluation models (framework − truth),
 * so consumers SUBTRACT it from the finder Sun longitude. TERMS literals
 * are stored in the extraction's native sign
 * (n3-framework-table.local.json) and negated in the evaluator.
 *
 * MATCHED PAIR: the amplitudes are the residual of the CURRENT finder
 * Sun chain AND pair with the injected carrier rates — re-derive the
 * table (the N2/N3 instrument chain) whenever either moves: a Step-0
 * SUN_HARMONICS refit, an eccentricity/perihelion definition change, or
 * a planet-record period change. ENFORCED: PAIRED_SUN_HARMONICS_SHA256
 * below is the fingerprint of the SUN_LONGITUDE_HARMONICS this table was
 * derived under; the create-model parity gate (test:model, in `npm run
 * check`) recomputes it from live constants and fails on mismatch. The
 * carrier↔table pairing is enforced by both living in this one module
 * with the rates injected from the same constants the records read. The
 * api centerline gate (≤12″ shadow-plane) backstops gross staleness
 * independently.
 *
 * FQ-5 N2 RECORD (the carrier attribution): 8/10 carriers measured
 * framework-expressible at <0.1″ induced error (e3b-argument-attribution
 * E0); the Delaunay pair Mp/F FAILED exact closure (the framework
 * composition carries a 16.9″/cy catalog-input residual ≡ 0.26 μd of
 * sidereal month) and stays a DECLARED INPUT in moon/series-extension —
 * the documented negative of the pre-registered stop-gate.
 */

'use strict';

const { SUN_COMPLETION_ARTIFACT } = require('./sun-completion-artifact.cjs');

/** J2000 mean-longitude phase anchors (deg), body order Mercury, Venus,
 *  Earth (EMB), Mars, Jupiter, Saturn — declared epoch constants
 *  (header (ii)); the RATES are injected (framework-derived). */
const ARG_L0 = [252.250906, 181.979801, 100.466457, 355.433000, 34.351519, 50.077444];
/** J2000 perihelion longitudes (deg), same body order — mean anomaly
 *  M_X = l_X − ϖ_X; slow ϖ drift is absorbed by the sidebands over the
 *  valid window. */
const PERI = [77.456, 131.564, 102.937, 336.060, 14.331, 93.057];
/** Moon mean elongation J2000 phase anchor (deg) — the EMB-wobble
 *  carrier; its rate is injected (framework-derived). */
const ARG_D0 = 297.8501921;

/**
 * The derived table, extraction-native sign (negated in the evaluator):
 * [[6 mean-longitude multipliers lMe,lV,lE,lM,lJ,lS],
 *  [6 mean-anomaly multipliers MMe,MV,ME,MMa,MJ,MS], cos″, sin″].
 * 70 terms ≥ 0.05″ from the N3 framework-carrier extraction (79-term
 * LSQ on the D2 derived signal, fidelity 0.616″) — re-derived under the
 * ONE eccentricity law (unification; D2 combined residual 0.60″,
 * composed difference vs the previous table ≤1.5″ at the ancient presets,
 * detrended 0.033 min). Individual coefficients redistribute between the
 * near-degenerate ±M sideband families; only the composed function ships.
 *
 * PLAN 06 I2 → I3 — the LONG-PERIOD rows live in LONG_PERIOD_TERMS below
 * (D'Alembert form on the e-vectors of date, derived over ±20 kyr; I3). The
 * I2 record: the Earth–Mars–Jupiter long inequality 4λ_E − 8λ_Ma + 3λ_J
 * (the classical ~1783-yr term) and the Venus–Earth term 8λ_V − 13λ_E
 * (≈239 yr) were first DERIVED as constant rows on the model's own
 * Wisdom–Holman engine over −5100..+1100 yr (6.27″ / 1.84″;
 * tools/explore/i2-long-inequality.mjs). Neither could come from the 200-yr
 * D2 window (the term's in-window ramp went to the projected-out secular
 * basis; the 240-yr term folded into it). WHY they were missing: the
 * certified Sun integrates a smooth tropical year for its mean longitude;
 * against Horizons its residual carried exactly this 6″ ripple (plan 06 I1
 * analysis) — with the same phase in the sidereal residual, a perturbation
 * of Earth's mean motion, not a frame effect. Sub-0.2″ candidates left out
 * (2J−5S 0.17″, 5V−8E 0.17″: window-dependent phase). The CARRIERS moved
 * with I3 from the planet records' rounded of-date periods minus p₀ to the
 * model's own banked J2000 sidereal mean motions (computeCarrierRatesDegPerCy;
 * the 70 short-period literals are KEPT — the two carrier sets share the
 * J2000 anchors and part by ≤ 12″/yr·|k|, i.e. ≤ 0.3°·|k| at the 200-yr
 * window's edges, the same class as the I2 of-date→sidereal move).
 * @type {Array<[number[], number[], number, number]>}
 */
const TERMS = [
  [[0, 3, -3, 0, 0, 0], [0, 0, -1, 0, 0, 0], -9.2558, -0.3232],
  [[0, 3, -4, 0, 0, 0], [0, 0, 0, 0, 0, 0], -0.1950, -9.2459],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, 1, 0], -1.4662, -6.4341],
  [[0, 1, -1, 0, 0, 0], [0, 0, 0, 0, 0, 0], 0.1345, 4.8332],
  [[0, 2, -2, 0, 0, 0], [0, 0, 0, 0, 0, 0], -2.1364, -2.9549],
  [[0, 2, -3, 0, 0, 0], [0, 0, 1, 0, 0, 0], -2.8927, -1.1913],
  [[0, 0, 1, 0, -2, 0], [0, 0, 1, 0, 0, 0], 2.8982, -1.0900],
  [[0, 2, -2, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.7820, 2.8796],
  [[0, 0, 1, 0, -1, 0], [0, 0, -1, 0, 0, 0], -2.5401, -0.1829],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, 0, 0], -0.2456, -2.1163],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, -1, 0, 0], 2.1028, 0.1572],
  [[0, 0, 2, -2, 0, 0], [0, 0, -1, 0, 0, 0], 2.0062, 0.4493],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, 1, 0], 0.2164, 1.7839],
  [[0, 2, -3, 0, 0, 0], [0, 0, 0, 0, 0, 0], -1.5284, 0.8126],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, -1, 0], -0.9353, -1.1855],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, 1, 0, 0], 0.4254, -1.4438],
  [[0, 3, -3, 0, 0, 0], [0, -1, 0, 0, 0, 0], -1.2408, 0.7438],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, 0, 0], 1.3145, -0.1985],
  [[0, 0, 2, 0, -2, 0], [0, 0, -1, 0, 0, 0], -0.4728, 1.1130],
  [[0, 3, -4, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.9746, 0.3524],
  [[0, 0, -1, 2, 0, 0], [0, 0, -1, 0, 0, 0], -0.9141, -0.1697],
  [[0, 3, -4, 0, 0, 0], [0, 0, 1, 0, 0, 0], -0.7605, 0.1501],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, -1, 0, 0], 0.6794, -0.0282],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, 0, 0, 0], -0.6021, 0.2300],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, 0, 0], -0.2055, -0.6053],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, 0, 0, 0], -0.6212, -0.0277],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, 0, 0], 0.0277, 0.5852],
  [[0, 0, -2, 4, 0, 0], [0, 0, -1, 0, 0, 0], -0.4801, 0.2245],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, -1, 0, 0], 0.0605, -0.5014],
  [[0, 0, -2, 4, 0, 0], [0, 0, 0, 0, 0, 0], 0.4682, 0.1671],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, 0, 0, 0], 0.2949, 0.3878],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, 0], 0.0845, -0.4011],
  [[0, 2, -3, 0, 0, 0], [0, 1, 0, 0, 0, 0], 0.0589, -0.3744],
  [[0, 3, -3, 0, 0, 0], [0, 0, 0, 0, 0, 0], -0.3257, -0.1827],
  [[0, 0, 2, 0, -3, 0], [0, 0, -1, 0, 0, 0], 0.0149, 0.3557],
  [[0, 0, -2, 4, 0, 0], [0, 0, 0, -1, 0, 0], -0.3152, -0.0762],
  [[0, 3, -4, 0, 0, 0], [0, -1, 0, 0, 0, 0], 0.0714, 0.3142],
  [[0, 0, -1, 2, 0, 0], [0, 0, 0, 1, 0, 0], 0.1331, -0.2622],
  [[0, 0, 2, -3, 0, 0], [0, 0, -1, 0, 0, 0], 0.2826, 0.0458],
  [[0, 2, -3, 0, 0, 0], [0, 0, -1, 0, 0, 0], -0.1689, -0.2243],
  [[0, 0, 1, 0, -1, 0], [0, 0, 1, 0, 0, 0], -0.0262, -0.2757],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, 0, 0, 0], 0.2267, -0.1326],
  [[0, 0, 1, 0, -2, 0], [0, 0, 0, 0, -1, 0], -0.2245, -0.0951],
  [[0, 0, 1, 0, 0, -1], [0, 0, -1, 0, 0, 0], -0.0453, 0.2368],
  [[0, 2, -2, 0, 0, 0], [0, -1, 0, 0, 0, 0], -0.2075, 0.0622],
  [[0, 3, -4, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.1413, 0.1567],
  [[0, 1, -1, 0, 0, 0], [0, 0, -1, 0, 0, 0], 0.0858, -0.1399],
  [[0, 0, 2, 0, -3, 0], [0, 0, 1, 0, 0, 0], 0.1632, -0.0164],
  [[0, 0, 2, -3, 0, 0], [0, 0, 1, 0, 0, 0], 0.1316, -0.0276],
  [[0, 0, -2, 4, 0, 0], [0, 0, 1, 0, 0, 0], 0.1219, 0.0452],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, 1, 0], -0.1243, -0.0271],
  [[0, 1, -1, 0, 0, 0], [0, -1, 0, 0, 0, 0], 0.1139, -0.0172],
  [[0, 0, 2, 0, 0, -2], [0, 0, 0, 0, 0, 0], -0.0385, 0.1031],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, -1], -0.0309, 0.1052],
  [[0, 0, 1, 0, -1, 0], [0, 0, 0, 0, 1, 0], 0.0945, 0.0475],
  [[0, 0, 2, -3, 0, 0], [0, 0, 0, -1, 0, 0], -0.0981, -0.0051],
  [[0, 0, 1, 0, 0, -1], [0, 0, 0, 0, 0, 1], -0.0827, 0.0500],
  [[0, 0, 2, 0, -2, 0], [0, 0, 0, 0, -1, 0], 0.0866, -0.0204],
  [[0, 1, -1, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.0085, -0.0855],
  [[0, 0, 1, 0, -2, 0], [0, 0, -1, 0, 0, 0], -0.0738, 0.0295],
  [[0, 0, 2, 0, -3, 0], [0, 0, 0, 0, -1, 0], 0.0097, 0.0787],
  [[0, 1, -1, 0, 0, 0], [0, 0, 1, 0, 0, 0], -0.0016, 0.0764],
  [[0, 0, 1, -1, 0, 0], [0, 0, 0, 1, 0, 0], 0.0655, 0.0358],
  [[0, 3, -3, 0, 0, 0], [0, 0, 1, 0, 0, 0], 0.0517, -0.0513],
  [[0, 0, 2, 0, -2, 0], [0, 0, 1, 0, 0, 0], -0.0085, 0.0687],
  [[0, 2, -2, 0, 0, 0], [0, 1, 0, 0, 0, 0], -0.0274, 0.0580],
  [[0, 0, 2, -2, 0, 0], [0, 0, 0, 1, 0, 0], 0.0521, 0.0217],
  [[0, 0, 1, -1, 0, 0], [0, 0, 1, 0, 0, 0], 0.0188, 0.0523],
  [[0, 2, -2, 0, 0, 0], [0, 0, 1, 0, 0, 0], -0.0421, -0.0340],
  [[0, 0, 1, -1, 0, 0], [0, 0, -1, 0, 0, 0], -0.0353, -0.0379],
  // plan 06 I3 — the Venus–Earth term 8λ_V − 13λ_E (≈239 yr on the banked
  // carriers): a CONSTANT row, derived on the model's own run over ±3100 yr
  // (i3-long-period-dalembert.mjs `2 20000 3100 4`; the I2 row read 1.84/0.14″
  // on the record carriers over −5100..+1100). The term is formally FIFTH order
  // (Σk = −5) and resonant (divisor 1.5°/yr: e⁵/ν² reaches the arcsecond), so it
  // is a CLUSTER of lines (ϖ/Ω multipliers summing to +5) beating on ~20 kyr —
  // no single-ϖ D'Alembert form holds (the {V,E} form shifted the Sun +0.9″ at
  // J2000 against Horizons' modern window; this row 0.74 → 0.83″ mean with the
  // scatter 0.94 → 0.78″), and the row is a LOCAL description of the
  // Horizons-certified era (≈1″ beyond it).
  [[0, 8, -13, 0, 0, 0], [0, 0, 0, 0, 0, 0], 1.4825, 0.9435],
];

/**
 * PLAN 06 I3 — the LONG INEQUALITY in D'ALEMBERT form (superseding the
 * constant-amplitude row of I2, 6.23/−0.72″): the Earth–Mars–Jupiter long
 * inequality 4λ_E − 8λ_Ma + 3λ_J (≈1783 yr) as a sum over bodies X of
 *     e_X(t)·[a_X·cos(θ + ϖ_X(t)) + b_X·sin(θ + ϖ_X(t))]
 * with e_X, ϖ_X the e-vectors OF DATE (the embedded artifact, ecliptic J2000;
 * D'Alembert: Σk_λ + Σj_ϖ = 0 and the argument has Σk = −1, so +ϖ_X).
 * WHY (measured 2026-10 on the model's inertial Sun against DE441 in the fixed
 * J2000 frame, tools/explore/sun-inertial-vs-de441.cjs): the constant rows left
 * 0.08″ at the 1783-yr period inside ±3000 yr and 3.7″ outside on both sides —
 * the inequality is first order in the eccentricities and its composed
 * amplitude/phase ride the e-vectors of date (the model's own N-body shows the
 * line growing 3.2″ → 9.0″ from −18 to +14 kyr). DERIVED on the model's own
 * Wisdom–Holman run over ±20,000 yr (tools/explore/i3-long-period-dalembert.mjs
 * `2 20000 9100 4`: yearly means of the EMB's osculating mean longitude, a
 * degree-4 secular detrend — diagnostic — plus these columns on the SAME
 * embedded e-vectors; dt 2 d, step-converged against dt 1 d): the 1783-yr band
 * left in the residual 0.05″ inside ±9100 and 0.07/0.05″ outside, the composed
 * J2000 amplitude 6.88″ on ±20 kyr vs 6.89″ on ±9100 (window-independent; the
 * constant row read 6.12 vs 6.89), and the ±9100-fitted rows evaluated over
 * ±20 kyr leave 0.28/0.53″ (rms Δ 0.57″). Against Horizons' modern window the
 * row moves the Sun by −0.36″ at J2000 with the scatter 0.94 → 0.89″ (the I2
 * constant row was derived off-centre, −5100..+1100). The Venus–Earth term is
 * NOT of this form — see its constant row in TERMS. The individual a_X, b_X
 * are NOT physically separable (the three perihelia
 * rotate only 33–80° per 9 kyr, so the columns are near-collinear — the first
 * cut, with the WRONG sign θ − ϖ_X, "fitted" ±9 kyr with coefficients of
 * thousands of ″/e and failed the window test); only the composed function
 * ships, as for the ±M sideband pairs. Beyond ±50 kyr the e-vectors are held at
 * the grid's ends (bounded, the former constant-row class).
 * RE-DERIVED on the running-mean series (the mean=1 dump; `2 20000 3100 4`):
 * the carriers moved in their 9th digit and the embedded e-vectors by ~1e-5
 * (the point-sampling alias gone), so the near-collinear a_X/b_X moved ~0.5 %
 * while the COMPOSED function held — J2000 amplitude 6.87″ on ±20 kyr, 6.87″
 * on ±3100, 6.87″ at dt/2; band left 0.09″ inside ±3100 and 0.13/0.10″
 * outside. The 8V−13E row re-read 1.4825/0.9435 (was /0.9436).
 * Extraction-native sign (N-body − smooth), negated in the evaluator.
 * @type {Array<[number[], number, number, number]>} [l-multipliers, bodyIndex (0 Me … 5 S), a (″/e), b (″/e)]
 */
const LONG_PERIOD_TERMS = [
  [[0, 0, 4, -8, 3, 0], 2, -790.7951, 592.4140],   // 4E−8Ma+3J · earth
  [[0, 0, 4, -8, 3, 0], 3, -81.3844, 77.5882],     // 4E−8Ma+3J · mars
  [[0, 0, 4, -8, 3, 0], 4, 160.5173, -304.5553],   // 4E−8Ma+3J · jupiter
];
/** body index → the embedded e-vector series' key */
const ECC_BODY_KEY = [null, 'venus', 'earth', 'mars', 'jupiter', null];

const D2R = Math.PI / 180;

/**
 * The e-vector (e·cos ϖ, e·sin ϖ; ecliptic J2000) of a body at T Julian
 * centuries TT from J2000, from the embedded 1-kyr grid (linear between nodes,
 * held at the grid's ends). The ONE source for every runtime — an
 * artifact-less createModel() and the browser before its series load compute
 * the identical rows.
 * @param {number} bodyIndex 0 Me, 1 V, 2 E, 3 Ma, 4 J, 5 S (only 1–4 are embedded)
 * @param {number} T
 * @returns {[number, number]}
 */
function eccVectorOfDateEmbedded(bodyIndex, T) {
  const key = ECC_BODY_KEY[bodyIndex];
  if (!key) throw new RangeError(`sun-planetary-completion: no embedded e-vector series for body index ${bodyIndex}`);
  const grid = SUN_COMPLETION_ARTIFACT.eccVectors;
  const b = /** @type {Record<string, {zQ: number[], zP: number[]}>} */ (grid.bodies)[key];
  const x = Math.min(Math.max((T * 100 - grid.t0Yr) / grid.stepYr, 0), b.zQ.length - 1);
  const i = Math.min(Math.floor(x), b.zQ.length - 2), f = x - i;
  return [b.zQ[i] + (b.zQ[i + 1] - b.zQ[i]) * f, b.zP[i] + (b.zP[i + 1] - b.zP[i]) * f];
}

/**
 * The completion's CARRIER rates (deg per Julian century TT) — ONE home for the
 * model wiring and the matched-pair gate. Planets: the model's own banked J2000
 * sidereal mean motions (the embedded artifact; the former carriers were the
 * planet records' rounded of-date periods minus p₀ — Venus 4.1″/yr and Jupiter
 * 1.7″/yr off the run's own motion, 83° of the Venus–Earth argument at ±9000 yr).
 * Earth: the framework sidereal year (the D6 ratio-only doctrine for the run's
 * absolute Earth rate). Moon elongation: sidereal month vs sidereal year.
 * @param {{ meanSiderealYearDays: number, moonSiderealMonthDays: number }} c
 * @returns {{ planets: number[], moonElongation: number }}
 */
function computeCarrierRatesDegPerCy({ meanSiderealYearDays, moonSiderealMonthDays }) {
  const L = SUN_COMPLETION_ARTIFACT.planetLamDotJ2000DegPerYr;
  const degPerCyOf = (/** @type {number} */ cyclesPerDay) => 360 * 36525 * cyclesPerDay;
  return {
    planets: [L.mercury * 100, L.venus * 100, degPerCyOf(1 / meanSiderealYearDays), L.mars * 100, L.jupiter * 100, L.saturn * 100],
    moonElongation: degPerCyOf(1 / moonSiderealMonthDays - 1 / meanSiderealYearDays),
  };
}

/**
 * @param {{ embWobbleArcsec: number,
 *           carrierRatesDegPerCy: { planets: number[], moonElongation: number },
 *           eccVectorOfDate?: (bodyIndex: number, T: number) => [number, number],
 *           moonElongationDegAtT?: (T: number) => number }} opts
 *   - embWobbleArcsec: the DERIVED Earth-around-EMB wobble amplitude
 *     a_M·μ/AU in arcsec (μ = 1/(1+M_E/M_M));
 *   - carrierRatesDegPerCy.planets: the six mean-longitude rates (deg/
 *     Julian-century TT), body order Me,V,E,Ma,J,S — computeCarrierRatesDegPerCy
 *     (the model's own banked J2000 sidereal mean motions; Earth the framework
 *     sidereal year);
 *   - carrierRatesDegPerCy.moonElongation: the framework Moon
 *     mean-elongation rate (deg/cy TT) — the EMB-wobble carrier's rate when
 *     moonElongationDegAtT is absent;
 *   - eccVectorOfDate: the e-vectors of date for the D'Alembert rows (default:
 *     the embedded grid — the ONE source; an override is for instruments);
 *   - moonElongationDegAtT: the Moon's mean elongation OF DATE (deg) at T —
 *     the framework's own argument (ṅ included). The constant-rate carrier
 *     D₀ + D₁·T ran ~29° off it at ±9000 yr: the lunar equation (6.44″) read
 *     as the largest short-period line left against DE441 at −9000 (2.8″ at
 *     29.53 d; the −9000 bin's scatter 4.13 → 3.62″ on the argument of date).
 *   Injected by the model wiring so the carrier↔table matched pair tracks the
 *   constants and the embedded artifact.
 * @returns {{ sunPlanetaryCompletionDeg: (T: number) => number }}
 */
function createSunPlanetaryCompletion({ embWobbleArcsec, carrierRatesDegPerCy, eccVectorOfDate = eccVectorOfDateEmbedded, moonElongationDegAtT = undefined }) {
  if (!Number.isFinite(embWobbleArcsec)) {
    throw new Error('createSunPlanetaryCompletion: embWobbleArcsec must be a finite number (derived a_M·μ/AU in arcsec)');
  }
  const rates = carrierRatesDegPerCy;
  if (!rates || !Array.isArray(rates.planets) || rates.planets.length !== 6
      || rates.planets.some((r) => !Number.isFinite(r)) || !Number.isFinite(rates.moonElongation)) {
    throw new Error('createSunPlanetaryCompletion: carrierRatesDegPerCy must supply 6 finite planet rates (Me,V,E,Ma,J,S) and a finite moonElongation rate (deg/cy TT)');
  }
  const L1 = rates.planets, D1 = rates.moonElongation;
  /**
   * Planetary-completion correction to the finder Sun longitude.
   * @param {number} T - Julian centuries TT from J2000
   * @returns {number} degrees — SUBTRACT from the finder Sun longitude
   */
  function sunPlanetaryCompletionDeg(T) {
    const l = new Float64Array(6), M = new Float64Array(6);
    for (let i = 0; i < 6; i++) {
      l[i] = (ARG_L0[i] + L1[i] * T) * D2R;
      M[i] = l[i] - PERI[i] * D2R;
    }
    let table = 0;
    for (const [kl, kM, cA, sA] of TERMS) {
      let th = 0;
      for (let i = 0; i < 6; i++) th += kl[i] * l[i] + kM[i] * M[i];
      table += cA * Math.cos(th) + sA * Math.sin(th);
    }
    // the long-period rows — amplitude and phase on the e-vectors of date
    for (const [kl, X, a, b] of LONG_PERIOD_TERMS) {
      let th = 0;
      for (let i = 0; i < 6; i++) th += kl[i] * l[i];
      const [q, p] = eccVectorOfDate(X, T);
      const e = Math.hypot(q, p), w = Math.atan2(p, q);
      table += e * (a * Math.cos(th + w) + b * Math.sin(th + w));
    }
    const D = moonElongationDegAtT ? moonElongationDegAtT(T) * D2R : (ARG_D0 + D1 * T) * D2R;
    const arcsec = -table - embWobbleArcsec * Math.sin(D);
    return arcsec / 3600;
  }
  return { sunPlanetaryCompletionDeg };
}

/** sha256/16 of JSON.stringify(FITTED_COEFFICIENTS.SUN_LONGITUDE_HARMONICS)
 *  at derivation time — the matched-pair fingerprint asserted by test:model.
 *  Unchanged from v1/v2: SUN_HARMONICS did not move in the D2 or N3
 *  landings. Plan 07 R10 moved the hash WITHOUT a refit: the three (sin, cos)
 *  pairs were rotated exactly from the t₀ phase origin to J2000
 *  (tools/fit/reorigin-combs-j2000.mjs), the finder Sun is bit-identical, so
 *  the residual this table was derived from is unchanged — the table stands
 *  (fidelity 0.616″, 70 terms), only the fingerprint is re-recorded. */
const PAIRED_SUN_HARMONICS_SHA256 = '53530a28a60b3c4a';   // was cbc189cea1c20292 (eccentricity unification: Step-0 refit → N2/N3 re-derived); R10 rotation, same Sun

/** sha256/16 of JSON.stringify([...planets, moonElongation]) — the seven
 *  full-precision carrier rates (deg/cy TT) the tables pair with: since plan
 *  06 I3 the model's own banked J2000 sidereal mean motions for the planets
 *  (the embedded sun-completion artifact), Earth the framework sidereal year,
 *  the Moon elongation from the sidereal month/year identity
 *  (computeCarrierRatesDegPerCy; the N3 short-period literals kept, the
 *  LONG_PERIOD_TERMS derived on these rates). The model wiring recomputes
 *  the rates live, so a series re-bank, a year or a month input change moves
 *  the carriers automatically while the tables stay frozen — a silent
 *  few-arcsec stale below the api gate's ≤12″ backstop. test:model recomputes
 *  this fingerprint from the live artifact + constants (identical arithmetic)
 *  and fails on mismatch: re-run the extraction chain
 *  (tools/explore/n2-sun-framework-carriers.mjs → i2-sidereal-carrier-table.mjs
 *  for the short-period rows, i3-long-period-dalembert.mjs for the long-period
 *  rows), re-embed the tables, and update this value. History: 2d066e92bae955e4
 *  was the I2 record-based carrier set. */
const PAIRED_CARRIER_RATES_SHA256 = '26552b86ad69eaf2';   // running-mean series re-bank (mean=1 dump): carriers moved in the 9th digit, LONG_PERIOD_TERMS + the 8V−13E row re-derived on them; history: 8e11456fcf8db81c (I3), 2d066e92bae955e4 (I2)

module.exports = { createSunPlanetaryCompletion, computeCarrierRatesDegPerCy, eccVectorOfDateEmbedded, PAIRED_SUN_HARMONICS_SHA256, PAIRED_CARRIER_RATES_SHA256 };
