# The ṅ-alignment campaign — pre-registered predictions

This file is written and committed BEFORE any implementation of the
campaign (plan §12i queue item 0). The commit hash is the timestamp.
The theoryDrift discipline: predictions are recorded first and never
re-derived after the fact; the campaign is judged against THIS list.

## Frozen baseline (measured, `u2-ndot-consistency.mjs` @ 04725ef)

- Driver-1-implied ṅ = **−25.83 ″/cy²** (ȧ = 3.82 cm/yr, a = 384,399.1 km).
- Chain effective ṅ = **−24.00 ″/cy²** (DE441 route, 19 epochs,
  c = +0.923 ″/cy²); −24.8 via the ELP-canon route (theoryDrift).
- Gap (DE441 route) = **1.83 ″/cy²**.
- −135 Moon-λ error vs DE441 = **+427″**; Moon-β error = +12.8″.
- 20.3g tier at −135 / Babylon: **partial, magnitude 0.959–0.960**;
  ΔT-free required-ΔT = **10,787 s** vs model curve 12,067 s.
- theoryDrift −750 bin = **−13.42 min**; effective Δṅ vs canon = 1.08 ″/cy².
- Phase C PoC re-reduced century residuals (identified subset):
  +2.2 / +8.8 / −4.4 / +6.0 min (−700/−600/−500/−400).
- Modern gates: centerline mean **8.4″** / max 12.4″; 179-syzygy
  elongation mean +1.8″ / RMS 10.8″; canonGeometry mean-abs 8.5 min.

## The change being made

The lunar argument secular is DERIVED from Driver 1's a(t)
(time-varying, chain-integrated — never a constant T² patch), replacing
whatever inherited secular currently produces the −24.0 behaviour.
Residual anchors are then refit (5c-class) against MODERN JPL only.
No eclipse data enters any fit at any step.

## Predictions (P1–P7)

- **P1 — the consistency check closes.** Re-running
  `u2-ndot-consistency.mjs` Part 2 post-campaign: quadratic coefficient
  c → 0.0 ± 0.15 ″/cy²; effective ṅ → −25.83 ± 0.3 (i.e. ≡ Part 1).
- **P2 — the −135 Moon longitude closes.** dλ_moon vs DE441 at the
  −135 instant: +427″ → **within ±50″** (nominal +10″: the gap
  removes ½·1.83·21.35² ≈ 417″). dβ stays < 25″.
- **P3 — the −135 required-ΔT enters Stephenson's window.** The
  ΔT-free matcher's −135 required-ΔT: 10,787 → **11,550 ± 150 s**,
  INSIDE the published totality window [11,220–12,140] — the two
  reductions converge once the Moon conventions align.
- **P4 — the −135 local circumstances at Babylon.** Tier magnitude
  0.96 → **≥ 0.98**, with residual-to-totality ≤ 700 s of dial
  (≈ the remaining Sun-λ + method budget). STRETCH (not required):
  outright totality if the residual budget resolves favourably.
- **P5 — theoryDrift collapses.** The −750 drift bin: −13.42 min →
  **|drift| < 2 min**; effective Δṅ vs canon: 1.08 → **< 0.2 ″/cy²**.
  Phase C re-reduced century residuals converge to Stephenson's own
  reductions within ±2 min per century (the differential → 0 because
  the moons now share a secular).
- **P6 — modern era invariant.** The alignment's modern-era λ effect is
  ½·1.83·(0.5 cy)² < 0.25″: centerline gate stays 8.4″ ± 0.5;
  179-syzygy RMS stays 10.8″ ± 0.5; canonGeometry modern bins and the
  canon 1450/1450 statistics unchanged; all fixture changes are
  ancient-era-only re-records.
- **P7 — the ancient audit rows improve** (with the parallel
  scene-mapping fix): Babylon −135 bestGap 1,411 km → tier-class
  (≤ ~300 km); the ancient "geographic" rows shrink or reclassify
  under local-circumstance verdicts.

## Falsification criteria (what would refute the ṅ-gap hypothesis)

- Post-alignment dλ_moon at −135 stays > 150″ (the gap was not the
  cause), or
- P1 closes but P3 misses the window by > 400 s (the gap was real but
  not the eclipse-relevant quantity), or
- any modern gate regresses beyond P6's bands (the alignment broke the
  certified era — abort and revert per the matched-triple discipline).

## Measurement commands (unchanged instruments)

    node tools/explore/u2-ndot-consistency.mjs
    node tools/explore/u2-dt-free-matcher.mjs
    node tools/verify/lunar-alignment.js
    node tools/verify/eclipse-audit.js
    node tools/explore/phase-c-rereduction-poc.mjs
