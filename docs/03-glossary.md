---
docVersion: 1.0
modelVersion: v27.1
coefficients: sha256:1d7ef7b022b91f6c
status: current
---

# Glossary of Essential Terms

This glossary defines the key terms used throughout the documentation. For a complete glossary, see the [website glossary](https://www.holisticuniverse.com/en/reference/glossary).

---

## Core Model Concepts

### The model (a holistic view of our universe)
The Expanding Solar System Resonance Theory as one integrated account of the solar system: the planets on the model's own N-body chain, and Earth's spin and time on one derived clock with two counter-rotating reference points (axial precession clockwise, apsidal precession counter-clockwise). Published at holisticuniverse.com; the simulator and this documentation call it ESSRT.

### The N-body chain
The planets' orbits of date, from a Newtonian N-body integration with the first-order relativistic correction of one cited J2000 state (JPL Horizons vectors, DE440 mass ratios) with zero fitted constants. It supplies every planet's elements of date, the secular modes, the <!--v:earthDeepBeatPeriodKyr-->405.6<!--/v-->-kyr eccentricity metronome, and Earth's own eccentricity, inclination, node and perihelion of date ([doc 04](04-orbital-elements.md), [doc 109](109-model-nbody-engine.md)).

### The lunisolar precession clock
The mean lunisolar precession period — Earth's spin clock, <!--v:lunisolarPeriodJ2000Yr-->25,771.6<!--/v--> years at J2000: the period of the composed torque rate, Earth's spin carrying the solar and lunar torques, derived as the beat of the model's own sidereal and tropical year laws. Earth's other long cycles are stated as periods and ratios against it (the simulator's Lunisolar Clock panel shows them live; the ratios are J2000 readings that wander, not laws). Under [ESSRT](#expanding-solar-system-resonance-theory-essrt) the period evolves at deep time with the tidal history.

### The one-source movement
The ONE evaluator of Earth's orbit of date — eccentricity, longitude of perihelion, obliquity and the orbit's normal at any epoch: the N-body chain's banked secular series inside its ±10-Myr span, the anchored mode sums beyond it, with the obliquity integrated on that orbit plane. Every surface that shows one of these quantities — the scene, the API, the registry, the panels — reads this movement, which is why it is called one-source (`@essrt/physics` slice `one-source-movement`; [doc 110](110-calculation-map.md) chain 1).

### The hybrid obliquity
The model's obliquity of date: the precession equation integrated on the one-source orbit plane — the banked series' plane inside its span, the mode-tail plane beyond, joined continuously at the span's edges (hence "hybrid"). It replaced the fitted obliquity law in plan 09 and is the one obliquity every surface reads ([doc 109 §18](109-model-nbody-engine.md)).

### The one family (year lengths)
All of-date year lengths — sidereal, tropical, anomalistic and the four cardinal-point years — and the lunisolar precession period derived from the one movement, so that their beats are identities rather than separately fitted numbers: the precession period is the sidereal and tropical years' beat, the anomalistic year rides the movement's own apsidal rate ([doc 110 §3.2](110-calculation-map.md)).

### Of date
Evaluated at the epoch asked for — the equinox, ecliptic and orbital elements of that date — as opposed to the J2000-fixed value. In code, `…AtYear(year)` for a decimal year and `…AtAge(tMa)` for an age in Myr; a name without either is a J2000 constant. The frame of date is the equinox and ecliptic of that epoch.

### Certified
A shipped value the engine derives and the gate suite holds against an observation or a cited standard — the cardinal instants against the USNO 2000 times, the J2000 precession period against the IAU 2006 rate, the eclipse canon. "Certified" marks the gate-pinned shipped value as distinct from a diagnostic, an experiment or a reference overlay.

### Tier
A named evaluation level — which inputs and which approximation a surface reads — so that a number says what it was computed with: the eclipse location tier (the Besselian elements on the apparent Sun), the observer tier (the API's hour angle and altitude), the mode tier (the secular mode sums beyond the banked series), the tidal tier (the mean length of day).

### The chains
Derivations in which each quantity is computed from the one before it, each with one home: the **N-body chain** (above); the **Keplerian chain** (`planets/keplerian-chain` — a planet's elements of date from the J2000 anchor and the secular modes); the **Moon chains** (the tropical, apsidal and nodal periods of date, the inertial month chain composed with the precession of date); the **deep-time chain** (`deltat/deep-time-chain` — the length of day, ΔT, the Moon's recession and the solar-mass scalars at an age); the **mass chain** (`earth/mass-chain` — G, the mass ratios and the GM values from the cited inputs).

### EARTH-WOBBLE-CENTER
The scene's display marker for axial precession: it circles Earth clockwise once per axial precession period (<!--v:axialPrecRound-->~25,772<!--/v--> years), marking the direction Earth's axis leans — the precession of the equinoxes. A reference point placed from the engine, not a force; every instrument measures from Earth itself.

### PERIHELION-OF-EARTH
The scene's reference point for Earth's perihelion. It moves counter-clockwise around the Sun in one apsidal period (<!--v:inclPrecYears-->~111,581<!--/v--> years at J2000) and sets Earth's varying distance to the Sun through the year.

### Geo-heliocentric
A reference frame that is heliocentric (Earth orbits the Sun) but viewed from Earth's perspective. Produces identical predictions to standard heliocentric models.

---

## Precession Types

### Axial Precession
The slow wobble of Earth's rotational axis, causing the celestial poles to trace circles against the stars. Period: the clock, <!--v:axialPrecExact-->25,771.58<!--/v--> years at J2000 in the model.

### Apsidal Precession
The perihelion's revolution against the fixed stars — for Earth the one-source movement's own apsidal rate, for a planet the N-body chain's secular rate g (period 1,296,000″/g). Earth's period at J2000: <!--v:inclPrecYears-->~111,581<!--/v--> years, <!--v:lunisolarApsidalPerPrecessionJ2000-->4.330<!--/v--> precession periods, a reading of the orbit's own motion that wanders. The scene draws it as PERIHELION-OF-EARTH moving around the Sun — a construction of the picture, not a force. Scene nodes and code identifiers keep the historical name "inclination precession".

### Perihelion Precession
Two usages, both in the simulator. **For Earth** (the climate sense): the advance of the perihelion point through the seasons — the perihelion-of-date cycle, the beat of the two motions above: 1/T_peri = 1/T_p + 1/T_aps, <!--v:periPrecYears-->~20,936<!--/v--> years at J2000, the carrier of the climatic-precession band. **For a planet** (the standard planetary sense, as in "Mercury's perihelion precession"): the apsidal advance itself, quoted as a rate in arcseconds per century — the Perihelion of Planets Verification panel compares the chain's rate with the JPL WebGeoCalc observations in this sense ([doc 13](13-perihelion-precession.md)).

### Lunar Nodal Precession
The westward drift of the Moon's orbital nodes (where its orbit crosses the ecliptic), one revolution in <!--v:nodalPrecICRFexact-->18.61335<!--/v--> years (equinox of date; an input of the month chain).

### Lunar Apsidal Precession
The rotation of the Moon's line of apsides (perigee to apogee), one revolution in <!--v:apsidalPrecICRFexact-->8.84753<!--/v--> years (equinox of date; an input of the month chain).

---

## Orbital Elements

### Semi-major Axis (a)
Half the longest diameter of an elliptical orbit. Determines the orbit's size and, via Kepler's third law, the orbital period.

### Eccentricity (e)
A measure of how elliptical an orbit is. Range: 0 (perfect circle) to 1 (parabola). Earth's eccentricity of date is the N-body chain's banked series, anchored on the observed J2000 value ([Constants Reference](20-constants-reference.md)).

### Inclination (i)
The angle between an orbital plane and a reference plane (usually the ecliptic or invariable plane). Measured in degrees.

### Ascending Node (Ω)
The point where an orbiting body crosses the reference plane moving from south to north. The longitude of this point is a key orbital element.

### Descending Node
The point where an orbiting body crosses the reference plane moving from north to south. Located 180° from the ascending node.

### Argument of Periapsis (ω)
The angle from the ascending node to the perihelion point, measured in the orbital plane. Also called argument of perihelion for solar orbits.

### Longitude of Perihelion (ϖ)
The sum of the ascending node longitude and argument of periapsis: ϖ = Ω + ω. Measures the perihelion direction from the vernal equinox.

### Osculating element
The Keplerian element of the ellipse a body would follow if, at this instant, every other planet vanished. It is exact for that instant and wobbles from month to month as the planets pull: Earth's osculating perihelion swings by a few hundred arcseconds with Jupiter's 11.9-year period and by smaller amounts with the other planets' synodic periods. JPL's state vectors and WebGeoCalc's element tables are osculating.

### Mean element (of date)
The osculating element with that fast wobble averaged out, so what remains is the slow motion: the secular drift (Earth's perihelion advances about 1,161″ per century against the fixed stars) and, over tens of thousands of years, the Laplace–Lagrange swings. "Mean" does not mean constant — the mean element is a function of time, and which terms count as "fast" is set by the averaging window. The literature's mean elements (Simon et al. 1994, Meeus Table 31) are of this kind. Earth's published e(t) and ϖ(t) in this model are mean elements of date: the N-body series averaged over 1 kyr in the co-rotating frame and anchored at J2000 on its own node ([doc 110](110-calculation-map.md) chain 1.1). The eclipse Sun reads the same function; the fast wobble enters the Sun's longitude through the planetary completion's direct terms, never through the elements.

### Mean Anomaly (M)
The fraction of the orbital period that has elapsed since perihelion, expressed as an angle. Increases uniformly with time.

### True Anomaly (ν)
The actual angle between the perihelion direction and the current position of the body, as seen from the Sun. Varies non-uniformly due to orbital eccentricity.

### Eccentric Anomaly (E)
An auxiliary angle used to solve Kepler's equation. Relates Mean Anomaly to True Anomaly through the orbit's eccentricity.

---

## Reference Frames

### Ecliptic
The plane of Earth's orbit around the Sun. Used as the primary reference plane for solar system coordinates. The ecliptic slowly turns relative to the fixed stars on the orbit's nodal modes.

### Invariable Plane
The plane perpendicular to the total angular momentum vector of the solar system. Unlike the ecliptic, this plane is fixed in space. The model banks its own invariable plane from the chain and expresses node longitudes in the Souami & Souchay origin ([doc 05](05-invariable-plane-overview.md)).

### ICRF (International Celestial Reference Frame)
A quasi-inertial reference frame based on the positions of distant quasars. The most stable reference frame available, essentially "fixed stars."

### J2000
The standard astronomical epoch: January 1, 2000, 12:00 TT (Terrestrial Time). Orbital elements are often given for this epoch.

### Heliocentric
A coordinate system centered on the Sun.

### Geocentric
A coordinate system centered on Earth.

---

## Time Measurements

### Solar Year (Tropical Year)
The time for the Sun to return to the same position relative to the vernal equinox, <!--v:tropicalYearMeanJ2000Days-->365.242190469<!--/v--> days at J2000. This is the year of the seasons. Under ESSRT the day-count shifts at deep time via Driver 1 (LOD growth) and the length in seconds via Driver 2 (solar mass loss). The planets' orbital-period inputs in `astro-reference.json` ([doc 20, Planet Orbital Periods](20-constants-reference.md#planet-orbital-periods-tuned)) are a different quantity — each planet's own period of date, in SI days.

### Sidereal Year
The time for the Sun to return to the same position relative to the fixed stars, <!--v:siderealYearJ2000Days-->365.25636300<!--/v--> days at J2000 — about 20 minutes longer than the solar year because of precession. Under ESSRT its length in seconds evolves at deep time via Driver 2 and its day-count via Driver 1.

### Anomalistic Year
The time between successive perihelion passages, <!--v:anomalisticYearJ2000Days-->365.2596365<!--/v--> days at J2000.

### Julian Day (JD)
A continuous count of days since January 1, 4713 BC. Used in astronomy to avoid calendar complexities. J2000 = JD 2451545.0.

### Delta-T (ΔT)
The difference between Terrestrial Time (uniform atomic time) and Universal Time (based on Earth's rotation). ΔT varies because Earth's rotation is not constant; the model's ΔT rides the pure-tidal length-of-day history with a gated correction stack ([doc 102](102-gia-alpha-lunar-validation.md)).

---

## Position Measurements

### Right Ascension (RA)
The celestial equivalent of longitude. Measured in hours, minutes, and seconds eastward from the vernal equinox. Full circle = 24 hours.

### Declination (Dec)
The celestial equivalent of latitude. Measured in degrees north (+) or south (-) of the celestial equator. Range: -90° to +90°.

### Perihelion
The point in an orbit closest to the Sun. Earth reaches perihelion around January 3.

### Aphelion
The point in an orbit farthest from the Sun. Earth reaches aphelion around July 4.

### Obliquity
The angle between Earth's rotational axis and the perpendicular to its orbital plane, <!--v:obliquityJ2000Deg-->23.439279<!--/v-->° at J2000, oscillating between <!--v:mainstreamObliqRange-->~22.1° to ~24.5°<!--/v--> (Laskar 1993 range) on the <!--v:obliqBeatJ2000Kyr-->41.1<!--/v-->-kyr beat of the precession clock against the orbit plane's nodal mode s₃. The model integrates it from one precession equation on its own N-body orbit plane (doc 109 §18).

---

## Scientific References

### Expanding Solar System Resonance Theory (ESSRT)
The deep-time model: two physically independent drivers stretch the model's periods across geological time. **Driver 1** — Earth–Moon tidal evolution (the day lengthens, the Moon recedes; the mean lunisolar precession period follows the composed torque rate). **Driver 2** — solar mass loss (every orbit slowly expands via Kepler's third law). The axial precession period was <!--v:axialPrecAtDevonian-->21,235<!--/v--> yr at the Devonian (380 Ma), is <!--v:axialPrecRound-->~25,772<!--/v--> yr today and reaches <!--v:axialPrecAt200MyrFuture-->28,315<!--/v--> yr at +200 Myr; the climate formula's precession-band lines ride it, its eccentricity-band lines are planetary beats that do not. Validated against Wells 1963 (Devonian coral growth bands), Wu et al. 2024 (650-Myr cyclostratigraphy) and the Earth–Moon genesis epoch. Full theory: [Doc 99](99-expanding-solar-system-resonance-theory.md).

### Souami & Souchay (2012)
A scientific paper providing high-precision values for planetary orbital inclinations and ascending nodes relative to the invariable plane. The published reference the model's invariable-plane quantities are stated beside.

### Laplace-Lagrange Theory
A secular perturbation theory describing how planetary orbital elements oscillate over long timescales due to mutual gravitational interactions.

### Milankovitch Cycles
Long-term variations in Earth's orbital parameters (eccentricity, obliquity, precession) that affect climate. The model's climate formula rides the engine's own lines — the beats of the chain's secular modes with the precession clock, plus the 405.6-kyr family — see [Doc 92](92-climate-formula.md) (the canonical L1+L2+L3 climate formula and its evidence) and [Doc 94](94-insolation-null-test.md) (the insolation null test). Under [ESSRT](#expanding-solar-system-resonance-theory-essrt) the precession-band lines move with the clock.

---

## Formulas and Calculations

### Kepler's Equation
The fundamental equation relating Mean Anomaly to Eccentric Anomaly: M = E - e·sin(E). Must be solved iteratively.

### Vis-viva Equation
Calculates orbital velocity at any point: v = √(GM(2/r - 1/a)), where r is current distance and a is semi-major axis.

### Equation of Center
The difference between True Anomaly and Mean Anomaly (ν - M). Represents how much a body is ahead of or behind its mean position.

---

## Further Reading

For the complete glossary with detailed explanations, visit:
**[holisticuniverse.com Glossary](https://www.holisticuniverse.com/en/reference/glossary)**

---

**Previous**: [User Guide](02-user-guide.md) - How to use the simulation
**Next**: [Dynamic Elements Overview](04-orbital-elements.md) - How orbital elements change over time
