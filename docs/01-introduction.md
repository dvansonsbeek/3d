---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:3f803b0a4e2b0b3c
status: current
---

# Introduction to the Holistic Universe Model

## What is the Holistic Universe Model?

The Holistic Universe Model is a geo-heliocentric framework that describes planetary and lunar movements through two interacting forces. Rather than treating astronomical phenomena as isolated events, the model unifies precession cycles, climate patterns, and timekeeping variations into a single coherent system.

> "Simple is hard and complex is easy." - The model's guiding principle

The solar system is remarkably complex, yet its primary movements can be modeled by simulating just two counter-rotating forces:
- **Axial precession** moves clockwise
- **Apsidal precession** moves counter-clockwise

These opposing movements generate all the observable dynamics of Earth, the Moon, planets, and the Sun.

---

## The Two Gravitational Control Points

The model introduces two key gravitational centers that govern all observed precession movements:

### EARTH-WOBBLE-CENTER

This point simulates **axial precession** - Earth's historical "precession of the equinoxes."

- Earth orbits this center in a **clockwise** direction
- One complete orbit takes approximately **<!--v:axialPrecRound-->~25,771<!--/v--> years** — the axial precession period at J2000 (see [Constants Reference](20-constants-reference.md))
- This is what causes the equinox to move westward through the zodiac
- The mechanism involves tidal forces from the Sun and Moon acting on Earth's equatorial bulge

In the 3D simulation, this point is visualized as "The Death Star."

### PERIHELION-OF-EARTH

This point determines Earth's varying distance to the Sun throughout the year (perihelion around January 3rd, aphelion around July 4th).

- It orbits **counter-clockwise** around the EARTH-WOBBLE-CENTER
- One complete orbit takes approximately **<!--v:inclPrecYears-->~111,570<!--/v--> years** (apsidal precession; see [Constants Reference](20-constants-reference.md))
- This slowly changes Earth's argument of periapsis relative to the fixed stars

In the 3D simulation, this appears as a white dot.

### Opposing Rotations Create Balance

The two movements interact:
- Earth moves clockwise around EARTH-WOBBLE-CENTER (one axial precession period, <!--v:axialPrecRound-->~25,771<!--/v--> years)
- PERIHELION-OF-EARTH moves counter-clockwise (one apsidal period, <!--v:inclPrecYears-->~111,570<!--/v--> years)
- They meet and realign every **<!--v:periPrecYears-->~20,936<!--/v--> years** — the perihelion-of-date cycle, because the two rates add

The solstice–perihelion alignment moves around the zodiac on that cycle. The simulator's Lunisolar Clock panel shows the live ratio of the two periods: <!--v:lunisolarApsidalPerPrecessionJ2000-->4.329<!--/v--> today, wandering between <!--v:lunisolarApsidalPerPrecessionWanderMin-->0.83<!--/v--> and <!--v:lunisolarApsidalPerPrecessionWanderMax-->9.89<!--/v--> across ±26 kyr.

---

## The lunisolar precession clock

Earth's spin tier runs on one clock: the mean lunisolar precession period, <!--v:lunisolarPeriodJ2000Yr-->25,771.4<!--/v--> years at J2000 — the period of the composed torque rate, Earth's spin carrying the solar and lunar torques on its equatorial bulge. Earth's other long cycles are read against it as ratios of periods:

| Cycle | Period at J2000 | In precession periods |
|-------|-----------------|-----------------------|
| Axial precession | <!--v:axialPrecRound-->~25,771<!--/v--> yr | 1 |
| Apsidal precession | <!--v:inclPrecYears-->~111,570<!--/v--> yr | <!--v:lunisolarApsidalPerPrecessionJ2000-->4.329<!--/v--> |
| Perihelion-of-date | <!--v:periPrecYears-->~20,936<!--/v--> yr | <!--v:lunisolarPeriOfDatePerPrecessionJ2000-->0.8124<!--/v--> |

The ratios are J2000 readings, not laws — the apsidal ratio wanders across ±26 kyr as the table above the panel shows. The model's earlier presentation, one "master cycle" divided by the small integers 13, 3 and 16, is retired ([retired record](retired-record.md)); the fitted timing anchor that presentation was built on remains a Ledger-2 constant of the [Constants Reference](20-constants-reference.md), and [doc 10](10-fibonacci-laws.md) keeps the historical derivation.

### Reference Point: JD 2176153.5 (1245-12-26) / early 1246 AD

This date marks the perihelion alignment epoch — when the perihelion longitude was closest to the winter solstice direction. It serves as the reference point for:
- Mean solar year length
- Mean sidereal year length
- Baseline calculations for all precession cycles

---

## Key Oscillating Parameters

Several Earth parameters oscillate over long timescales:

### Obliquity (Axial Tilt)

Earth's axial tilt is not constant but oscillates over approximately <!--v:obliqCycleYears-->~41,224<!--/v--> years — the beat of the axial precession against the orbit's inclination mode. The orbital eccentricity and inclination to the invariable plane also oscillate, on the orbit's own apsidal and nodal periods. See [Constants Reference](20-constants-reference.md) for all current values (mean, amplitude, and range for each parameter).

---

## What Makes This Model Unique

### 1. Unified Framework

A single model explains:
- Precession of the equinoxes
- Climate cycles (Milankovitch cycles)
- Timekeeping variations (Delta-T)
- Variations in day and year lengths

### 2. Verifiable Through Simulation

The 3D Solar System Simulation allows you to:
- Observe all movements in real-time
- Verify celestial positions against external planetariums
- Watch cycles unfold over thousands of years
- Explore the geometric relationships

### 3. Invariable Plane Extension

This documentation extends the model with calculations based on Souami & Souchay (2012):
- Planet positions relative to the invariable plane
- Dynamic inclination oscillations
- Ascending node precession
- Height above/below the invariable plane

### 4. Geo-Heliocentric Perspective

The model is **heliocentric** (Earth orbits the Sun) but viewed from a **geocentric perspective** (Earth at the visual center). This produces identical predictions to standard heliocentric models while providing intuitive visualization of how things appear from Earth.

### 5. Deep-Time Extension (ESSRT)

The model also extends across geological time through the **Expanding Solar System Resonance Theory (ESSRT)**. The periods shown throughout this documentation are J2000 values; at deep time they evolve through two physically independent drivers — Earth-Moon tidal evolution (Driver 1, lengthens the day) and solar mass loss (Driver 2, expands every orbit via Kepler's third law). See [Doc 99 — ESSRT](99-expanding-solar-system-resonance-theory.md) for the full framework.

---

## Getting Started

1. **Try the Simulation**: Visit https://3d.holisticuniverse.com
2. **Read the User Guide**: [02-user-guide.md](02-user-guide.md) explains all controls and features
3. **Learn the Terms**: [03-glossary.md](03-glossary.md) defines essential vocabulary

---

## Further Reading

For the complete scientific background:

- [How it Works](https://www.holisticuniverse.com/en/model/how-it-works) - Detailed explanation of the model
- [Precession](https://www.holisticuniverse.com/en/model/precession) - Complete precession theory
- [Obliquity & Inclination](https://www.holisticuniverse.com/en/model/obliquity) - Earth's tilt variations
- [Full Glossary](https://www.holisticuniverse.com/en/reference/glossary) - Terms defined

---

**Next**: [User Guide](02-user-guide.md) - Learn how to use the 3D simulation
