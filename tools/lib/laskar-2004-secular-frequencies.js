/**
 * La2004's main secular frequencies (″/yr) as TABULATED in Laskar et al. (2011), A&A 532, A89, Table 6
 * (the La2004 column beside La2010a; Laskar et al. 2004, A&A 428, 261–285, Table 3 is the original) —
 * external REFERENCE values from another theory's integration, never observations and never inputs: the
 * N-body generators use them as LABELS (the nearest-mode column) and as sanity thresholds (Saturn's g6,
 * Jupiter's g5, Earth's g5/g2 class). ONE home (doc 111 §1.18): `tools/verify/nbody-secular.js`,
 * `tools/verify/deep-secular-modes.js` and the NAFF extractor `tools/explore/naff-frequencies.mjs` read it;
 * the extractor's former table (g2 7.4555, s3 −18.8506, …) had no traceable source — its s3 equalled the
 * engine's own to four decimals — and left with this home.
 */
const LASKAR2004_SECULAR_FREQUENCIES_ARCSEC_PER_YR = Object.freeze({
  g: Object.freeze({ g1: 5.59, g2: 7.452, g3: 17.368, g4: 17.916, g5: 4.257452, g6: 28.2450, g7: 3.087951, g8: 0.673021 }),
  s: Object.freeze({ s1: -5.59, s2: -7.05, s3: -18.850, s4: -17.755, s6: -26.347855, s7: -2.9925259, s8: -0.691736 }),
});

module.exports = { LASKAR2004_SECULAR_FREQUENCIES_ARCSEC_PER_YR };
