/**
 * The model assembly's shared context — the types the slices of `assembleModel` (../model.js) pass along.
 *
 * Each slice takes the context the earlier slices built (`import('./<previous>.js').Ctx`, an intersection
 * that grows slice by slice) and returns the bindings the later ones read; the composer merges them
 * into ONE object, so every closure sees the same instance of every memo and sampler. The inputs
 * below are the composer's parameters; `late` carries the handful of bindings a slice reads at CALL
 * time that a later slice defines — the composer fills each one as the owning slice returns, so a
 * reader finds every forward dependency of the assembly in these seven lines and in the composer.
 */

/**
 * RESEARCH OVERRIDES for Earth's orbit laws (doc 109 §7): an alternative e(t), de/dt(t) and
 * ϖ_of-date(t) flow through every consumer (the eclipse Sun, the Moon's E-factor, the cardinal
 * points) exactly as the shipped laws do. `{}` = the shipped laws. Not a counterfactual in the §2d
 * sense (no hash change) — callers must say when they used it; the generators refuse to --write
 * under an override.
 * @typedef {{ eccentricityAt?: (year: number) => number, eccentricityRateAt?: (year: number) => number, perihelionLongitudeDegAt?: (year: number) => number }} Laws
 */

/**
 * `giaEllipticityOfDate: false` builds the one-source history WITHOUT the J₂(t)/J₂₀ factor of date
 * (the ice-driven GIA channel, which rides the climate formula's own post-MPT layer): the orbital
 * FORCING alone. The T1 exporter derives the climate lines' obliquity rate on it, so the lines
 * cannot depend on their own fit (v23.0; measured 3e-5 of the rate, 2–3 yr of period). Default true =
 * the shipped physics.
 * `spinCheckpointsArtifact` (plan 24): the parsed spin-axis checkpoint bank — the walk's exact state
 * every 250 kyr; a deep read then walks at most one spacing, bit-identical to the full walk. Null =
 * the full walk from J2000.
 * `lunarCheckpointsArtifact` (plan 25): the parsed lunar cumulative bank — the five chain counts' and
 * the two carriers' coarse segment prefixes every 250 kyr; a deep lunar read then integrates one
 * segment at most, bit-identical to the unseeded tables. Null = compute the prefixes.
 * @typedef {{ giaEllipticityOfDate?: boolean, spinCheckpointsArtifact?: { spacingYr: number, checkpoints: ReadonlyArray<{t: number, s: number[]}> } | null, lunarCheckpointsArtifact?: { chains?: Record<string, { fwd: number[], bwd: number[] }>, carriers?: Record<string, { fwd: number[], bwd: number[] }>, sun?: { meanLongitude?: { fwd: number[], bwd: number[] } } } | null }} Options
 */

/**
 * The forward bindings — what an early slice reads at call time from a later one. Typed by the
 * members actually read, so the composer's assignment is checked against each owner's surface.
 * @typedef {object} LateBindings
 * @property {() => number} certifiedAxialPrecessionJ2000Years  owner: year-day-lengths — read by deep-time-chain
 * @property {{ epsAt(year: number): number, eAt(year: number): number, periOfDateDegAt(year: number): number, precessionOfDateFactorsAt(year: number): { solarTorque: number, ellipticity: number }, axialPrecessionYearsLunisolarJ2000: number }} oneSourceM  owner: one-source-movement — read by deep-time-chain and earth-scalars
 * @property {{ anomalisticYearSecondsAtYear(year: number): number }} yearLengthsM  owner: one-source-movement — read by year-day-lengths
 * @property {(year: number) => number} sunMeanLongitudeDegAt  owner: sun-and-eclipses — read by lunar-theory (the arguments' Sun)
 * @property {(year: number) => number} publishedAxialPrecessionYearsAtYear  owner: published-periods — read by lunar-theory (the dynamical rate of date)
 * @property {(year: number) => number} publishedSiderealYearSecondsAtYear  owner: published-periods — read by year-day-lengths
 * @property {(year: number) => number} sunAberrationArcsecAt  owner: cardinal-instants — read by sun-and-eclipses (the besselian's apparent Sun)
 */

/**
 * The composer's inputs — the first slice's context.
 * @typedef {object} ModelInputs
 * @property {Readonly<Record<string, any>>} C  the frozen constants context
 * @property {Readonly<Record<string, any>>} F  the fitted coefficients
 * @property {Laws} laws
 * @property {any} secularSeriesArtifact  the governed N-body secular series (the API/Node path; null for the bare package)
 * @property {Options} options
 * @property {LateBindings} late
 */

export {};
