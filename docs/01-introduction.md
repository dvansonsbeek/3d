---
docVersion: 1.0
modelVersion: v21.0
coefficients: sha256:7258a9b469c8b95e
status: current
---

# Introduction to the Expanding Solar System Resonance Theory

## What is ESSRT?

The Expanding Solar System Resonance Theory (ESSRT) is one integrated account of the solar system: one cited J2000 state, one derived clock and one codebase produce the planets' orbits, Earth's precession, obliquity, eccentricity and timekeeping, the eclipse geometry and the orbital climate lines together — and the chain's evolution through geological time is gated by the rock record.

The physics composed here is standard: Newtonian N-body integration with the first-order relativistic correction, the averaged precession equation, tidal dissipation, secular perturbation theory. What is new is the integration. Because the chain is closed end to end, one input constant can be perturbed and the whole system re-run, which is what turns an integration into a source of testable consequences — and those consequences, at geological time, are the part that can be wrong.

---

## One Seed, One Clock

The model has two engines and one clock.

**The N-body engine — the planets.** Standard Newtonian gravity with the first-order relativistic correction, integrated from one cited J2000 heliocentric state (JPL Horizons vectors, DE440 mass ratios) with zero fitted constants. It supplies every planet's orbit of date, the secular modes, the <!--v:earthDeepBeatPeriodKyr-->405.6<!--/v-->-kyr eccentricity metronome, and Earth's own eccentricity, inclination, node and perihelion of date ([doc 04](04-dynamic-elements-overview.md), [doc 109](109-model-nbody-engine-and-lattice-test.md)).

**The clock — Earth's spin and time.** The mean lunisolar precession period, <!--v:lunisolarPeriodJ2000Yr-->25,771.4<!--/v--> years at J2000, is derived from the model's own sidereal and tropical year laws ([doc 11](11-length-day-year-formulas.md)) and agrees with the IAU value to eight parts in a million. Earth's other spin-side periods are read against it as ratios of periods, and it lengthens through geological time as tides slow the spin.

Two of Earth's precession motions rotate in **opposite directions**, so their frequencies add:

| Motion | Direction | Period at J2000 | In precession periods |
|--------|-----------|-----------------|-----------------------|
| Axial precession (the clock) | Clockwise | <!--v:axialPrecRound-->~25,771<!--/v--> yr | 1 |
| Apsidal precession (the orbit's own motion, a J2000 reading) | Counter-clockwise | <!--v:inclPrecYears-->~111,635<!--/v--> yr | <!--v:lunisolarApsidalPerPrecessionJ2000-->4.332<!--/v--> |
| Perihelion-of-date (their beat, 1/T_peri = 1/T_p + 1/T_aps) | — | <!--v:periPrecYears-->~20,938<!--/v--> yr | <!--v:lunisolarPeriOfDatePerPrecessionJ2000-->0.8124<!--/v--> |

The ratios are J2000 readings, not laws: the apsidal ratio wanders between <!--v:lunisolarApsidalPerPrecessionWanderMin-->1.08<!--/v--> and <!--v:lunisolarApsidalPerPrecessionWanderMax-->9.81<!--/v--> across ±26 kyr, as the simulator's Lunisolar Clock panel shows live. The perihelion-of-date beat is the carrier of the climatic-precession band; the obliquity band is the beat of the clock against the orbit's own nodal mode, <!--v:obliqCycleYears-->~41,224<!--/v--> years today.

**The anchor.** A third layer is a fitted timing anchor of <!--v:holisticYear-->335,317<!--/v--> years, calibrated on the perihelion–solstice alignment of the IAU mean elements in early 1246 AD (JD <!--v:periAlignJD-->2,176,153<!--/v-->; the model's own orbital series crosses at <!--v:periAlignYearSeries-->1247.2<!--/v--> AD, the mean-element and secular-element conventions labelled). It is the unit of the small periodic corrections that bring the time-domain machinery onto the observed cardinal points, day lengths and eclipses — bookkeeping, not a cycle: it scales with the precession period at deep time and is not a period of anything the model computes. The parameter accounting is three ledgers: zero fitted constants on the planetary side, the derived clock, and five named device constants of the frozen era machinery ([Constants Reference](20-constants-reference.md)). Nothing is tuned per phenomenon.

---

## How the Scene Shows It

The simulator is a geo-heliocentric orrery: the Sun is the centre of the solar system, and the scene is viewed from Earth's perspective so that the two counter-rotating motions are visible. Two markers carry them:

- **EARTH-WOBBLE-CENTER** — Earth circles it clockwise in one axial precession period; this is the precession of the equinoxes, the equinox moving westward through the zodiac under the solar and lunar torques on Earth's equatorial bulge.
- **PERIHELION-OF-EARTH** — the point that sets Earth's varying distance to the Sun through the year; it moves counter-clockwise around the wobble centre in one apsidal period, carrying Earth's perihelion against the fixed stars.

The two meet every perihelion-of-date cycle, and the solstice–perihelion alignment moves around the zodiac on that cycle. They are reference points placed from the engine, not forces: Earth's frame is placed from the engine's own elements of date ([doc 41](41-scene-graph-hierarchy.md)), the seven planets follow their own N-body element chains, and the Sun and the Moon stack over that frame. The view is geocentric; the predictions are those of a heliocentric model.

---

## What Follows From It

- **Obliquity, inclination and the nodes.** The obliquity is integrated under the composed precession rate against the orbit normal of date; Earth's inclination and node on the invariable plane are the engine's own, the planets' are the chain's ([doc 05](05-invariable-plane-overview.md), [doc 22](22-coordinate-frames.md)).
- **Day and year lengths.** The kinematic day and the year laws, with the three day bases named ([doc 11](11-length-day-year-formulas.md)).
- **Timekeeping.** The ΔT stack on the pure-tidal length-of-day history, validated against the historical eclipse record with zero parameters fitted to eclipse data ([doc 102](102-gia-alpha-lunar-validation.md), [doc 105](105-dt-stack-flag-audit.md)).
- **The Sun, the Moon and the planets.** The derived Sun and the framework-native lunar theory ([doc 65](65-equation-of-center.md), [doc 66](66-moon-meeus-corrections.md)), the planets' perihelion motion with Mercury's relativistic share emerging inside the measured advance ([doc 13](13-mercury-precession-breakdown.md)).
- **Climate.** The orbital-forcing formula rides the engine's own lines — the beats of the chain's secular modes with the precession clock, plus the 405.6-kyr family ([doc 92](92-climate-formula.md), [doc 94](94-insolation-null-test.md)).
- **Deep time.** The clock lengthens on the tidal history (Driver 1) and every orbit expands on the solar-mass history (Driver 2); the axial precession period was <!--v:axialPrecAtDevonian-->21,699<!--/v--> years in the Devonian. The theory, its predictions and the three pre-registered falsification legs are in [doc 99](99-expanding-solar-system-resonance-theory.md); the evidence is assembled in [doc 106](106-deep-time-validation-dossier.md).

Every published quantity is traced to its inputs, formula, code and live value in [doc 110 — the calculation map](110-calculation-map.md).

---

## How It Is Checked

The model is verified, not asserted. `npm run check` runs a gate chain on every push — golden masters that detect a one-ULP change, artifact freshness against recorded input hashes, the historical gate suite, the deep-time paleo anchors where an unexplained improvement fails too — and the simulator deploys only from a green run. The independent-observation record (transits, oppositions, Tycho's Mars) is in [doc 23](23-verification-data-reference.md); the full ledger, including what does not validate, is [doc 106](106-deep-time-validation-dossier.md).

---

## Getting Started

1. **Try the simulation**: https://3d.holisticuniverse.com
2. **Read the User Guide**: [02-user-guide.md](02-user-guide.md) explains the controls and panels
3. **Learn the terms**: [03-glossary.md](03-glossary.md) defines the vocabulary
4. **Read the code map**: [40-architecture.md](40-architecture.md) and the [Constants Reference](20-constants-reference.md) are the contributors' starting points

---

## Further Reading

The scientific background lives on the website:

- [How it Works](https://www.holisticuniverse.com/en/model/how-it-works) — the derivation methodology
- [Earth's Clock](https://www.holisticuniverse.com/en/model/earths-clock) — the lunisolar precession clock
- [Moon & Planets](https://www.holisticuniverse.com/en/model/moon-and-planets) — the N-body chain and the derived Moon
- [Expanding Resonance](https://www.holisticuniverse.com/en/model/expanding-resonance) — the deep-time evolution
- [Supporting Evidence](https://www.holisticuniverse.com/en/model/supporting-evidence) — what aligns with and where the model differs from current science

---

**Next**: [User Guide](02-user-guide.md) — how to use the 3D simulation
