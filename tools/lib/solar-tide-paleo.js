/**
 * A solar tide of date in the deep day length, read against the paleo record — ONE home (doc 99 §"The J₂ → α
 * conversion factor"; the registry's solarTide* keys and tools/explore/solar-tide-paleo-test.mjs both read it).
 *
 * The deep LOD is the lunar angular-momentum transfer on the cited distance history. A solar tide removes spin from
 * the Earth without moving the Moon, so a chain carrying it has the Earth spinning FASTER in the past than the
 * lunar-only budget says: LOD_s(t) = LOD(t) − ∫_t^0 r(t')·(dLOD_lunar/dt') dt', with the solar/lunar torque ratio of
 * date r(t') = r₀·(a(t')/a₀)⁶ (equal lags). The day-length and day-count anchors of data/paleo-validation-anchors.json
 * are re-read with it through the gate's own expectation types.
 *
 * Measured (2026-11): the lunar-only chain has none of the 29 outside; r₀ 5.6 % (the J2000 budget's physical pair)
 * 6; ~17 % (today's dissipation budget) 19; 21 % (equal lags) 19; 27 % (La2004's spin history) 22. The record bounds
 * the NET non-lunar braking over the Phanerozoic to a few per cent of the lunar transfer.
 */
'use strict';

/** the equal-lag solar/lunar tidal torque ratio (M_S/M_M)²·(a_M/a_S)⁶ on the given masses and distances
 *  @param {{sunMassKg: number, moonMassKg: number, moonDistanceM: number, auM: number}} c */
function equalLagSolarShare(c) {
  return (c.sunMassKg / c.moonMassKg) ** 2 * (c.moonDistanceM / c.auM) ** 6;
}

/** the shares read, as fractions of the lunar transfer — each with its provenance */
const SOLAR_TIDE_SHARES = Object.freeze({
  /** the J2000 LOD budget's physical pair: the degree-2 identity's 1.5 plus a net solar tide of 5.6 % (doc 99) */
  j2000Pair: 0.056,
  /** today's tidal dissipation budget: the solar constituents' share of the braking torque, ~0.5–0.6 TW of ~3.7 TW */
  dissipationBudget: 0.17,
  /** equal lags: (M_S/M_M)²·(a_M/a_S)⁶ on the DE440-class masses (1.98892e30 / 7.34767e22 kg), the J2000 mean distance 384,399 km and the AU */
  equalLags: equalLagSolarShare({ sunMassKg: 1.98892e30, moonMassKg: 7.34767e22, moonDistanceM: 384399e3, auM: 1.495979e11 }),
  /** La2004's spin history as measured over the last 10 Myr (tools/explore/la2004-precession-attribution.mjs) */
  la2004Measured: 0.27,
});

/**
 * @param {{ epoch: { lodSecondsAtYear(y: number): number, moonDistanceKmAtYear(y: number): number, tropicalYearSecondsAtYear(y: number): number } }} model a SEATED createModel()
 * @param {{ anchors: {id: string, ageMa: number, quantity: string, observed?: number, observedRange?: number[], expectation: any}[] }} anchorsFile data/paleo-validation-anchors.json
 */
function createSolarTidePaleoReader(model, anchorsFile) {
  const lodAt = (tMa) => model.epoch.lodSecondsAtYear(2000 - tMa * 1e6);
  const aAt = (tMa) => model.epoch.moonDistanceKmAtYear(2000 - tMa * 1e6);
  const yearSecAt = (tMa) => model.epoch.tropicalYearSecondsAtYear(2000 - tMa * 1e6);
  const a0 = aAt(0);
  const anchors = anchorsFile.anchors.filter((r) => r.quantity === 'daysPerYear' || r.quantity === 'lodHr');

  /** the lunar lengthening per 1-Myr step, forward in time, cached per age (the integrand's grid is shared by every share) */
  const stepCache = new Map();
  const stepAt = (tm) => { let v = stepCache.get(tm); if (v === undefined) { v = { dlod: lodAt(tm - 0.5) - lodAt(tm + 0.5), w: (aAt(tm) / a0) ** 6 }; stepCache.set(tm, v); } return v; };
  /** the LOD the solar tide would have added between the age and now — the past day is SHORTER by this. @param {number} tMa @param {number} r0 */
  const solarDeltaLodSeconds = (tMa, r0) => { let s = 0; for (let t = 0; t < tMa; t += 1) { const { dlod, w } = stepAt(t + 0.5); s += r0 * w * dlod; } return s; };

  /** @param {typeof anchors[number]} r @param {number} value @returns {{ok: boolean, deltaPct?: number, outside?: number, label: string}} */
  const verdict = (r, value) => {
    const e = r.expectation;
    if (e.type === 'relativePct') { const d = (value / r.observed - 1) * 100; return { ok: Math.abs(d) <= e.tolerancePct, deltaPct: d, label: `${d.toFixed(2)} % (±${e.tolerancePct})` }; }
    if (e.type === 'deviationBandPct') { const d = (value / r.observed - 1) * 100; return { ok: d >= e.band[0] && d <= e.band[1], deltaPct: d, label: `${d.toFixed(2)} % (band ${e.band[0]}…${e.band[1]})` }; }
    if (e.type === 'range') { const [lo, hi] = r.observedRange; const out = value < lo ? value - lo : value > hi ? value - hi : 0; return { ok: Math.abs(out) <= e.outsideToleranceAbs, outside: out, label: `${value.toFixed(2)} vs [${lo}, ${hi}] out ${out.toFixed(2)} (±${e.outsideToleranceAbs})` }; }
    if (e.type === 'deviationBandOutsideRange') { const [lo, hi] = r.observedRange; const out = value < lo ? value - lo : value > hi ? value - hi : 0; return { ok: out >= e.band[0] && out <= e.band[1], outside: out, label: `out ${out.toFixed(2)} (band ${e.band[0]}…${e.band[1]})` }; }
    return { ok: true, label: e.type };
  };
  const valueFor = (r, lodS) => (r.quantity === 'lodHr' ? lodS / 3600 : yearSecAt(r.ageMa) / lodS);

  /** every anchor re-read at a share — rows with the shipped and the solar-tide verdicts. @param {number} r0 */
  const readAt = (r0) => anchors.map((r) => {
    const lod = lodAt(r.ageMa);
    return { id: r.id, ageMa: r.ageMa, quantity: r.quantity, shipped: verdict(r, valueFor(r, lod)), withSolar: verdict(r, valueFor(r, lod - solarDeltaLodSeconds(r.ageMa, r0))) };
  });
  /** how many anchors sit outside their expectation at a share. @param {number} r0 */
  const outsideAt = (r0) => readAt(r0).filter((x) => !x.withSolar.ok).length;
  /** the largest share (in steps of 0.1 %) at which no anchor leaves its expectation — the record's bound on the net
   *  non-lunar braking, as a fraction of the lunar transfer */
  const boundShare = () => { let last = 0; for (let r0 = 0; r0 <= 0.5 + 1e-12; r0 += 0.001) { if (outsideAt(r0) > 0) break; last = r0; } return last; };

  return Object.freeze({ anchors, anchorCount: anchors.length, lodAt, aAt, solarDeltaLodSeconds, readAt, outsideAt, boundShare });
}

module.exports = { SOLAR_TIDE_SHARES, equalLagSolarShare, createSolarTidePaleoReader };
