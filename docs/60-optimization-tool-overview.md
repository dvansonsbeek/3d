# Optimization Tool — Architecture & Constraints

**Goal**: Build a standalone tool that Claude can run autonomously to tune the model (planets, Moon, and Sun) against scientific reference data

**Related documents:**
- [61-optimization-execution-plan.md](61-optimization-execution-plan.md) — Implementation phases, execution campaign, progress tracking
- [62-type-i-inner-planets.md](62-type-i-inner-planets.md) — Type I eccentricity (Mercury, Venus)
- [63-type-ii-earth-crossers.md](63-type-ii-earth-crossers.md) — Type II eccentricity (Mars, Eros)
- [64-type-iii-outer-planets.md](64-type-iii-outer-planets.md) — Type III eccentricity (Jupiter–Neptune)
- [65-equation-of-center.md](65-equation-of-center.md) — Variable speed / Kepler's 2nd law
- [66-moon-meeus-corrections.md](66-moon-meeus-corrections.md) — Meeus Ch. 47 lunar perturbations
- [67-planet-parallax-corrections.md](67-planet-parallax-corrections.md) — Up to 42-parameter parallax correction
- [68-orbital-period-calibration.md](68-orbital-period-calibration.md) — Ancient observation calibration
- [69-optimization-baseline.md](69-optimization-baseline.md) — Baseline results

---

## 1. Background & Motivation

The solar system simulation (`src/script.js`) models long-term planetary orbital mechanics using the Holistic-Year framework. It computes perihelion positions, RA/Dec coordinates, inclinations, and precession rates from ~13 input constants per planet.

The model is now mature. The next step is building a **feedback loop**: compare the model's predictions against authoritative astronomical data, identify where it deviates, and systematically improve it — either by tuning existing parameters or by discovering missing perturbation terms.

### What we want
A tool that Claude can run **without user intervention** to:
1. Compute predicted positions for planets, Moon, and Sun from the model's formulas
2. Compare against authoritative reference data (observed eclipses, transit times, JPL Horizons)
3. Identify errors and systematic patterns
4. Optimize parameters or suggest new perturbation terms
5. Iterate until accuracy improves

### Why now
- We verified that **JPL Horizons API** can provide RA/Dec data for any planet at any date (tested successfully for all 8 planets)
- The **Excel comparison** ([01-holistic-year-objects-data.xlsx](../data/01-holistic-year-objects-data.xlsx)) showed the model's positions diverge from JPL: ~0.9° RA/century for the Sun, 1-7° for planets
- The existing ~80 standalone test scripts in `docs/hidden/testscripts/` prove the pattern works: pure math Node.js scripts that replicate model formulas and run with `node`

---

## 2. Core Constraint: Fibonacci Orbital Resonance

The model is fundamentally built on **Fibonacci number relationships between planets**. This is not just a curiosity — it's the structural backbone that determines orbit counts, periods, and major axes via Kepler's 3rd law. The optimization tool must respect and leverage this structure.

### 2.1 How Orbit Counts Work

Each planet has an integer orbit count in the Holistic Year (H = 335,317 solar years):

```
SolarYearCount = round(H x meanSolarYear / SolarYearInput)
```

This orbit count determines:
- The orbital period: `T = H / SolarYearCount`
- The semi-major axis via Kepler's 3rd law: `a = T^(2/3)`
- The orbital speed: `speed = 2pi / (H / SolarYearCount)`

Because `SolarYearCount` is **rounded to an integer**, a change in `SolarYearInput` only matters if it crosses a rounding boundary. This creates discrete jumps in orbit geometry, not smooth gradients.

### 2.2 The Six Fibonacci Laws

Documented in detail in `docs/10-fibonacci-laws.md`. Summary:

**Law 1 -- Fibonacci Cycle Hierarchy**: All major precession periods derive from H divided by Fibonacci numbers:

| F(n) | Period = H/F(n) | Astronomical meaning |
|------|-----------------|---------------------|
| 3 | H/3 | Earth inclination precession |
| 5 | H/5 | Jupiter perihelion precession |
| 8 | H/8 | Saturn perihelion precession (retrograde) |
| 13 | H/13 | Earth axial precession |
| 16 | H/16 | Perihelion precession cycle |
| 21 | H/21 | Beat: axial + obliquity |
| 34 | H/34 | Beat: axial + ecliptic |

**Laws 2-3 -- Inclination Constant & Balance**: Each planet's inclination amplitude = `psi / (d x sqrt(m))` where d is a Fibonacci divisor and psi is a universal constant. The mass-weighted amplitudes cancel between the in-phase group (7 planets) and anti-phase group (Saturn) to **100% balance**.

**Laws 4-5 -- Eccentricity Constant & Balance**: All 8 eccentricities are determined by Fibonacci pair constraints. Saturn's eccentricity is independently predicted to within 0.3% by two different laws.

**Law 6 -- Saturn-Jupiter-Earth Resonance Loop** (the 3-5-8-13-21 loop):

```
Jupiter (H/5) + Saturn (H/8)  -> Axial (H/13)
Jupiter - Saturn              -> Earth inclination (H/3)
Axial - Earth inclination     -> Obliquity (H/8) -> Saturn
```

Each beat frequency returns another H/Fibonacci period. The loop closes because F(n)+F(n+1)=F(n+2).

### 2.3 Mirror Pairs

Each inner planet shares its Fibonacci divisor with its outer counterpart across the asteroid belt:

| Level | Inner planet | Outer planet | Shared d | Fibonacci |
|-------|-------------|-------------|----------|-----------|
| Belt-adjacent | Mars (d=5) | Jupiter (d=5) | 5 | F5 |
| Middle | Earth (d=3) | Saturn (d=3) | 3 | F4 |
| Far | Venus (d=34) | Neptune (d=34) | 34 | F9 |
| Outermost | Mercury (d=21) | Uranus (d=21) | 21 | F8 |

Earth-Saturn is the only pair with opposite balance groups (in-phase vs anti-phase).

### 2.4 Implications for the Optimization Tool

1. **Jupiter-Saturn-Earth must be aligned FIRST** -- they form the 3-5-8-13-21 resonance loop. If these three aren't right, the beat frequencies that drive all precession periods will be wrong, affecting everything.
2. **Conjunction periods emerge from orbit count ratios** -- Jupiter and Saturn's great conjunction period (~19.86 years) is determined by `1/(1/T_J - 1/T_S)`. Getting this right validates the orbit counts.
3. **Once Jupiter-Saturn are aligned, extend outward** -- fit Mars (shares d=5 with Jupiter), then Mercury/Uranus (d=21 pair), Venus/Neptune (d=34 pair).
4. **Orbit counts are integers** -- `SolarYearCount` is rounded, creating discrete jumps in orbit geometry. The optimizer must understand this.
5. **The Fibonacci structure is a constraint, not a tunable** -- divisor assignments, balance conditions, and the resonance loop are structural. Only parameters within this framework are tunable.

---

## 3. Current Model Architecture

### 3.1 Input Constants (lines 25-460 of script.js)

**Global constants** (for current values, see [Constants Reference](20-constants-reference.md)):
| Constant | Purpose |
|----------|---------|
| `holisticyearLength` | Fundamental cycle constant |
| `perihelionalignmentYear` | Perihelion-solstice alignment epoch |
| `startmodelJD` | Model start: 21 June 2000 |
| `earthtiltMean` | Mean obliquity |
| `earthRAAngle` | Equatorial frame orientation (**derived**: 2A − A²/ε) |
| `earthInvPlaneInclinationAmplitude` | Obliquity oscillation range |
| `earthInvPlaneInclinationMean` | Mean Earth inclination to inv. plane |
| `eccentricityBase` | Orbital radius of PERIHELION-OF-EARTH around Sun |
| `eccentricityAmplitude` | Orbital radius of Earth around EARTH-WOBBLE-CENTER |
| `correctionSun` | Solstice alignment correction |
| `startAngleModel` | Start angle for 21 June 2000 |

**Per-planet constants (13 each, Mercury-Neptune + Pluto, Halley's, Eros, Ceres):**
| Constant | Example (Mercury) | Purpose |
|----------|-------------------|---------|
| `SolarYearInput` | 87.9683 days | Orbital period |
| `EclipticInclinationJ2000` | 7.00497902 deg | Inclination to ecliptic (JPL) |
| `OrbitalEccentricity` | 0.20563593 | Orbital eccentricity (JPL) |
| `InvPlaneInclinationJ2000` | 6.3472858 deg | Incl. to invariable plane |
| `LongitudePerihelion` | 77.4569131 deg | Perihelion longitude (JPL J2000) |
| `AscendingNode` | 48.33033155 deg | Ecliptic ascending node (SPICE) |
| `AngleCorrection` | 0.9709 deg | Perihelion alignment fine-tune |
| `PerihelionEclipticYears` | H/(1+3/8) | Perihelion precession period |
| `Startpos` | 83.653 deg | Starting orbital position |
| `InvPlaneInclinationMean` | 6.701170 deg | Inclination oscillation center (Mercury, after 2026-04-09 phase re-anchor) |
| `InvPlaneInclinationAmplitude` | 0.384267 deg | Inclination oscillation range |
| `InclinationPhaseAngle` | Per-planet | ICRF perihelion at balanced year n=7 ≈ -2,649,854 BC (e.g. Mercury: 234.52°, after 2026-04-09 audit) |

### 3.2 Perihelion Precession Periods (Fibonacci/Holistic-Year derived)
| Planet | Formula | Direction |
|--------|---------|-----------|
| Mercury | H/(1+3/8) | Prograde |
| Venus | Hx2 | Prograde |
| Mars | H/(4+3/8) | Prograde |
| Jupiter | H/5 | Prograde |
| Saturn | -H/8 | **Retrograde** |
| Uranus | H/3 | Prograde |
| Neptune | Hx2 | Prograde |

### 3.3 How the Model Computes Planet Positions

The simulation uses a **nested scene graph hierarchy** -- each level applies one physical effect as a rotation or translation:

**Earth hierarchy (8 nodes to barycenter):**
```
startingPoint (origin)
  -> earth                             speed: -2pi / (H/13), radius: -eccAmplitude x 100
    -> earthInclinationPrecession      speed: 2pi / (H/3)
      -> earthEclipticPrecession       speed: 2pi / (H/5), tiltb: -inclAmplitude
        -> earthObliquityPrecession    speed: -2pi / (H/8), tiltb: +inclAmplitude
          -> earthPerihelionPrecession1  speed: 2pi / (H/16), tilta: -earthRAAngle
            -> earthPerihelionPrecession2  speed: -2pi / (H/16), centera: -eccBase x 100
              -> barycenterEarthAndSun   radius: eccAmplitude x 100
                -> sun / earthPerihelionFromEarth
```
Counter-rotating motions: Earth orbits EARTH-WOBBLE-CENTER (CW, H/13) while PERIHELION-OF-EARTH orbits Sun (CCW, H/3). Meeting frequency: 1/(H/13) + 1/(H/3) = 16/H → H/16 perihelion cycle.
Observed eccentricity = distance(Earth, PERIHELION-OF-EARTH): ranges 0.0139 (opposite) to 0.0167 (aligned, matches J2000).
Note: `earthWobbleCenter` and `midEccentricityOrbit` are NOT in the positional chain (used for visualization/tracking only).

**Per-planet chain (5 levels under barycenter):**
```
barycenter
  -> perihelion duration ecliptic 1    speed: 2pi / perihelionYears
    -> perihelion from Earth           speed: 2pi (full orbit/year coupling)
      -> perihelion duration ecliptic 2 speed: -2pi / perihelionYears
        -> real perihelion at Sun      speed: -2pi, tilt from AscNode x EclIncl
          -> planet on orbit           speed: 2pi / (H/solarYearCount)
```

**RA/Dec computation** (lines 27890-27901):
1. Get planet's **world position** = product of all ancestor transforms x local position
2. Transform into **Earth's equatorial frame** = inverse of Earth's rotation axis world matrix
3. Convert to **spherical coordinates**: RA = theta, Dec = phi

This is the key Three.js coupling -- but it's mathematically just a chain of 4x4 matrix multiplications followed by a matrix inverse and spherical conversion. No rendering needed.

### 3.4 Report Generation Pipeline

The existing `generatePlanetReport()` (line 21120):
1. Pauses simulation, saves state
2. For each entry in `PLANET_TEST_DATES`:
   - Calls `jumpToJulianDay(jd)` -- sets date (pure math)
   - Calls `forceSceneUpdate()` -- updates 3D positions
   - Calls `collectPlanetDataForDate()` -- extracts computed RA/Dec/distances
   - Compares against reference RA/Dec from the test date entry
3. Restores state, returns formatted report + Excel data

### 3.5 Existing Calibration Infrastructure

Already in the codebase:
- `findOptimalEarthRAAngle()` (line 15761) -- optimizes 3 Earth parameters against IAU 2006
- `analyzeSensitivity()` (line 16526) -- measures parameter sensitivity
- `OrbitalFormulas.secularPrecessionContribution()` (line 1613) -- Laplace-Lagrange secular perturbation theory
- ~80 standalone Node.js optimization scripts in `docs/hidden/testscripts/` (e.g., `mercury-optimize-params.js`, `all-planets-optimization-v2.js`)

---

## 4. Reference Data & Source Reliability

Before building any optimization tool, we must answer a fundamental question: **what are we optimizing against?**

### 4.1 The Ground Truth Problem

A discussion on [comparison of ephemerides](https://forum.tychos.space/t/comparison-of-ephemerides/706/4) highlights a critical insight: **JPL Horizons, Swiss Ephemeris, and Stellarium are all computed models fitted to the same observational data.** Using one to validate another is circular reasoning.

Evidence:
- **Modern convergence**: All sources agree within ~0.3 deg for 2000-2025
- **Ancient divergence**: They diverge by up to 80 deg for dates before -4000 BCE
- This means they've been **fitted to the same modern observations**, not independently derived
- For ancient dates, they are extrapolations -- and they disagree with each other

### 4.2 The Source Hierarchy

Not all data is equal. We must distinguish between:

| Level | Type | Examples | Reliability |
|-------|------|----------|-------------|
| **1. Direct observations** | Actual recorded astronomical measurements | Tycho Brahe's observations, transit records, eclipse records, Nautical Almanacs, modern telescope/radar measurements | **Highest** -- model-independent |
| **2. Fitted ephemerides** | Numerical models fitted to observations | JPL DE441, Swiss Ephemeris, VSOP2013 | **High for modern era** (~1900-2100), degrades rapidly for ancient/future dates |
| **3. Model output** | Predictions from theoretical models | Our simulation, Tychosium, any Keplerian model | **Variable** -- this is what we're evaluating |

**Key insight:** JPL Horizons is a Level 2 source, not Level 1. It's a very good fitted model for the modern era, but:
- It uses the same gravitational theory (Newtonian + GR corrections) that we might want to test alternatives against
- Its "perturbation" terms are empirical fits, not pure physics
- For dates >200 years from present, it's extrapolating its fitted model
- Swiss Ephemeris documentation itself acknowledges error rates near 2 days at 4700 BCE

### 4.3 Complete Audit of PLANET_TEST_DATES

A thorough audit reveals that **ALL** data in `PLANET_TEST_DATES` (lines 6825-7580) is **computed from ephemeris models**, not from observations:

| Planet | Source | Data Type | Computed From | Entries | Has RA? |
|--------|--------|-----------|---------------|---------|---------|
| Mercury | NASA GSFC Transit Catalog (Espenak) | jd + dec | JPL DE404/DE405 | 96 | Start only |
| Venus | NASA GSFC Transit Catalog + occultation lists | jd + dec | JPL DE404/DE405 | 92 | Start only |
| Mars | Jean Meeus opposition tables + occultations | jd + dec | VSOP87 theory | 170 | Start only |
| Jupiter | astropixels.com + astropro.com | jd + longitude | JPL DE405 | 112 | Start only |
| Saturn | Same as Jupiter (mirrored conjunction data) | jd + longitude | JPL DE405 | 89 | Start only |
| Uranus | Occultation lists (Project Pluto, Wikipedia) | jd only | JPL DE | 17 | Start only |
| Neptune | Presumably astropixels.com + occultations | jd + longitude | JPL DE405 | 45 | Start only |

**Critical findings:**

1. **NASA GSFC transit catalogs are NOT observation records.** Confirmed on the [NASA transit page](https://eclipse.gsfc.nasa.gov/transit/transit.html): "Transit predictions were generated... using algorithms developed from the Explanatory Supplement [1974] and Meeus [1989]." The dec values are computed from DE ephemeris, not measured.

2. **The transit DATES are partially observational** (many were actually observed: Mercury since 1631, Venus in 1639/1761/1769/1874/1882/2004/2012), but the **position values (dec/RA) are all computed** retroactively from DE models. The dates qualify as Tier 1; the positions are Tier 2.

3. **Jean Meeus tables** use VSOP87 analytical theory (itself fitted to JPL DE200). These are computed predictions, not observations.

4. **astropixels.com** (Fred Espenak) explicitly uses JPL DE405 -- same author as NASA GSFC catalogs.

5. **Occultation entries** (Venus-Mercury, Jupiter-Mars, etc.) from Project Pluto and Wikipedia have **no positional data** -- only dates.

6. **RA is almost entirely absent.** Only the "Model start date" (JD 2451716.5) per planet has RA. All transit/opposition/conjunction entries lack RA. Validation has been declination-only.

7. **Jupiter-Saturn conjunction data is duplicated** -- the same 70 entries appear in both arrays.

### 4.4 What Is JPL DE441?

The [JPL DE440/DE441 ephemeris](https://ssd.jpl.nasa.gov/doc/de440_de441.html) ([Park et al., 2021](https://ssd.jpl.nasa.gov/doc/Park.2021.AJ.DE440.pdf)) is the current "gold standard" -- but it's important to understand what it is and isn't:

**What observations were used to fit it:**
- Juno radio range + VLBA data (Jupiter, post-2016)
- Cassini radio range + VLBA data (Saturn, 2004-2017)
- Stellar occultations reduced against Gaia catalog (Pluto)
- Lunar Laser Ranging from Apollo retroreflectors (1969-present, cm precision)
- Planetary radar ranging -- Mercury, Venus, Mars (1960s-present, meter precision)
- Historical optical transit circle observations (17th-20th century, arcsecond precision)
- CCD astrometry of outer planets (1980s-present, milliarcsecond precision)

**Accuracy ranges:**
| Era | Accuracy | Basis |
|-----|----------|-------|
| 1960-2025 | Sub-km (inner), 1-10 km (outer) | Radar + spacecraft tracking |
| 1700-1960 | Arcsecond level | Transit circle observations |
| 1000-1700 | Arcminute level | Historical observations sparse |
| Before 1000 CE | Degrees | Extrapolation only |

DE440 covers 1550-2650 at full accuracy. DE441 extends to -13200 to +17191 but assumes no lunar core damping, trading current-era accuracy for long-term stability.

### 4.5 Independent Verification: INPOP Ephemeris

[INPOP](https://www.imcce.fr/recherche/equipes/asd/inpop/) is an **independent** planetary ephemeris from IMCCE (Paris) -- different team, code, and fitting process than JPL. [Comparison shows](https://link.springer.com/article/10.1134/S1063772924700938) that for modern dates, DE and INPOP orientation offsets are <0.4 milliarcseconds, with relative spins <5 uas/year. This mutual convergence between independent teams validates both for the modern era.

### 4.6 Genuinely Model-Independent Observational Sources

These are **actual observations**, not computed from any ephemeris:

**High value, accessible:**
| Source | Period | Accuracy | Where to find |
|--------|--------|----------|---------------|
| Observed Mercury transit contact times | 1677-1973 | Seconds of time | RGO Bulletin 181 (1975); Newcomb's analysis |
| Observed Venus transit records | 1639, 1761, 1769, 1874, 1882, 2004, 2012 | Seconds of time | Phil. Trans. Royal Society; observatory reports |
| Greenwich Observatory meridian observations | 1675-present | 0.1-1 arcsec | Cambridge Univ. Library; HathiTrust |
| Paris Observatory records | 1667-present | 0.1-1 arcsec | bibnum.obspm.fr |
| Tycho Brahe's observations | 1577-1601 | 1-2 arcmin | Dreyer's Opera Omnia (archive.org) |
| Mars opposition observations (post-1700) | 1700-present | Arcseconds | Major observatory catalogs |

**Ancient, lower precision but model-independent:**
| Source | Period | Accuracy | Where to find |
|--------|--------|----------|---------------|
| Babylonian Astronomical Diaries | 652-61 BCE | ~1 deg | Hunger/Sachs vols; [CDLI](https://cdli.ox.ac.uk/wiki/doku.php?id=introduction_to_babylonian_astronomy); [Oracc ADsD](https://oracc.museum.upenn.edu/projectlist.html) |
| Chinese eclipse records | 720 BCE-1600 CE | Date only | Stephenson's *Historical Eclipses and Earth's Rotation* (1997) |
| Ptolemy's Almagest | ~150 CE | 10-30 arcmin | Toomer translation (1984); VizieR star catalog |
| Al-Sufi's Book of Fixed Stars | ~964 CE | 1-5 arcmin | Digitized scholarly editions |

**Key reference for historical eclipses:** F.R. Stephenson, *Historical Eclipses and Earth's Rotation* (Cambridge, 1997) -- the standard catalog of reliably dated eclipses from 700 BCE to 1600 CE.

### 4.7 The Tiered Reference System

Given the audit findings above (Section 4.3), we build the optimization tool with a **tiered reference system** that distinguishes actual observations from computed model output.

The key principle: **observed positions always outrank computed positions**, regardless of the computed position's apparent precision. A 1-arcminute Tycho Brahe measurement is more valuable for model validation than a sub-arcsecond JPL ephemeris position, because the latter is circular — it's computed from the same type of model we're trying to validate.

#### Tier 1 — True observations (position from actual measurement)

Sub-tiers reflect the precision of the observing technology:

| Sub-tier | Era | Position accuracy | Weight | Examples |
|----------|-----|-------------------|--------|----------|
| **1A** | Modern (1900+) | < 1 arcsec (< 0.0003°) | 10 | Lunar Laser Ranging (cm precision), modern eclipse contact times, radar ranging, 2004/2012 Venus transits |
| **1B** | Telescope era (1631-1900) | 1-40 arcsec (0.0003-0.011°) | 7-9 | Mercury transit contact times (RGO Bulletin 181), Flamsteed catalog, Halley's Venus transit, observatory records |
| **1C** | Pre-telescope precision (1577-1631) | 1-2 arcmin (0.017-0.033°) | 5-6 | **Tycho Brahe's planetary observations** (923 Mars declinations, 1582-1600), Tycho's star catalog (1004 stars) |
| **1D** | Ancient/medieval (700 BCE-1577) | 10-60 arcmin (0.17-1°) | 2-4 | Ptolemy's Almagest (~150 CE), Al-Sufi (~964 CE), Babylonian Astronomical Diaries, Chinese/Islamic eclipse records |

**Data currently compiled:**
- **Tier 1C: Tycho Brahe Mars declinations** — 923 observations (1582-1600) from *Opera Omnia* vols. 10 & 13, digitized by Pafko (2000). Declination only (no RA). Accuracy: 1-2 arcminutes. These are the most precise pre-telescope planetary position measurements ever made, and they directly constrain geocentric Mars positions.

**Tier 1 placeholders (TO BE COMPILED):**
- Tier 1A: Lunar Laser Ranging (1969-present), modern eclipse timings (1900-2025)
- Tier 1B: Mercury transit contact times (1677-1973, RGO Bulletin 181), Venus transit contact times (1639-2012)
- Tier 1D: Historical eclipse records (Stephenson 1997, 700 BCE-1600 CE)

**Important distinction:** The NASA GSFC transit catalogs contain both Tier 1 and Tier 2 data in the same entries. The **event dates** are Tier 1 (many were actually observed), but the **position values** (dec, RA) are Tier 2 (computed retroactively from JPL DE404/DE405). The optimization tool must treat these separately.

#### Tier 2 — Modern fitted ephemerides (computed, not observed)

| Weight | Source | Range | Notes |
|--------|--------|-------|-------|
| 1 | JPL DE441 / Horizons API | 1800-2200 | Sub-arcsecond precision, but computed from orbital models |
| 1 | VSOP87 theory | 1800-2200 | Used by Swiss Ephemeris |
| 1 | All dec/RA values in PLANET_TEST_DATES | various | Computed retroactively from DE models |

Tier 2 data is useful as a **convenience** for getting RA/Dec at specific dates where we lack direct observations. It should never be the primary validation target — fitting to JPL ephemeris is circular if the goal is to validate the model independently.

#### Tier 3 — Model extrapolations (zero weight, comparison only)

- JPL Horizons for ancient dates (>500 years from present)
- Any ephemeris for dates beyond its fitting range
- Useful for spotting gross errors, not for fine-tuning

### 4.8 The Planetarycalendar GitHub Repo

The [kaidadragongirl/planetarycalendar](https://github.com/kaidadragongirl/planetarycalendar) repo contains 30 CSV files in `CompareSwissTychos/` with daily ecliptic longitude comparisons:
- **Format:** Julian day, Y/M/D, Swiss Ephemeris values (Sun through Neptune), Tychos values, Diff values
- **Coverage:** -4712 to 3501, ~100,009 rows per file (daily data)
- **Near year 2000:** Swiss-Tychos differences are 0.02 deg (Sun) to 2.7 deg (planets)
- **Ancient dates (-4712):** Differences grow to 6-22 deg

**Usefulness:** The Swiss Ephemeris column is essentially JPL DE data (Tier 2). It provides a convenient source of daily ecliptic longitudes for cross-reference, but is NOT independent ground truth. The Tychos column is another model output.

### 4.9 Reference Data Sources & Current Comparison Results

**Available reference data:**

| Source | What it provides | Access method | Date range |
|--------|-----------------|---------------|------------|
| `PLANET_TEST_DATES` | ~700 entries: NASA transit/opposition/conjunction dates with Dec, some with RA | In-code constant | -2000 to +4000 |
| JPL Horizons API | Authoritative RA/Dec for any planet at any date | REST API with caching | Planet-dependent (see below) |
| [01-holistic-year-objects-data.xlsx](../data/01-holistic-year-objects-data.xlsx) | Simulation output at 1-year intervals for all planets | Local file | Full H |

**JPL Horizons date limits:**
| Planet | Max future date |
|--------|----------------|
| Sun, Mercury, Venus | Unlimited (DE ephemeris) |
| Mars | 2599 AD |
| Jupiter | 2200 AD |
| Saturn | 2250 AD |
| Uranus, Neptune | 2399 AD |

**Excel vs JPL comparison results (from investigation, years 1800-2910):**

| Body | Avg \|dRA\| | Max \|dRA\| | Avg \|dDec\| | Max \|dDec\| | Notes |
|---------|---------|---------|----------|---------|-------|
| Sun | 6.65 deg | 14.58 deg | 0.24 deg | 0.80 deg | ~1.4 deg/century RA drift (precession) |
| Mercury | 7.22 deg | 15.75 deg | 4.02 deg | 6.56 deg | Inner planet, fast orbit |
| Venus | 6.06 deg | 14.55 deg | 4.77 deg | 9.30 deg | Inner planet |
| Mars | 0.87 deg | 2.16 deg | 5.39 deg | 6.94 deg | Good RA, poor Dec |
| Jupiter | 1.96 deg | 4.23 deg | 1.43 deg | 2.36 deg | Best outer planet |
| Saturn | 1.49 deg | 3.23 deg | 3.28 deg | 4.92 deg | |
| Uranus | 2.62 deg | 5.01 deg | 1.44 deg | 2.65 deg | |
| Neptune | 1.60 deg | 2.75 deg | 2.34 deg | 4.03 deg | |

**Key finding:** The RA error grows linearly with time (~1.4 deg/century for the Sun) -- classic precession drift. Near year 2000, errors are small (~0.5-1.5 deg RA). The model is calibrated for the modern epoch. The Dec errors for Mars (5-7 deg) are consistently large, suggesting inclination modeling could improve.

### 4.10 Revised Strategy

Instead of blindly optimizing against JPL Horizons as "truth", the tool should:

1. **Primarily validate against observed events** (Tier 1): "Does a Mercury transit occur at this date?" "Is Mars in opposition at this date?" Transit contact times provide positional constraints to ~0.25 deg without relying on any ephemeris model.

2. **Use JPL Horizons for modern-era RA/Dec** (Tier 2): Only for dates 1800-2200, flagged as "fitted model reference, not observation." Cross-check against INPOP for consistency.

3. **Report divergence from JPL at ancient dates** (Tier 3): Not as "errors" but as "differences" -- because JPL may be wrong too. Note: even DE441, which extends to -13200, has degraded accuracy for dates before ~1000 CE.

4. **Weight optimization by data tier**: Tier 1 observations get 2-10x the weight of Tier 2 fits (scaled by era -- modern observations weight 10, ancient observations weight 2). Tier 3 gets 0 weight (report only).

5. **Build reference dataset first** (Phase 3):
   - Export PLANET_TEST_DATES into structured JSON with per-entry tier/weight/source metadata
   - Enrich with JPL Horizons RA for all modern dates (currently only dec is available)
   - Add observed Mercury transit contact times from RGO Bulletin 181 (1677-1973)
   - Add observed Venus transit records from Royal Society publications
   - Each entry gets: `{tier, weight, dateReliable, positionReliable, source, notes}`
   - Then update `PLANET_TEST_DATES` in-code (Phase 4).

6. **Only then build the optimization engine** -- optimizing against properly weighted, audited data.

---

## 5. Proposed Architecture: Standalone Node.js Optimization Engine

### 5.1 Why Standalone (not browser-based)

| Approach | Pros | Cons |
|----------|------|------|
| **A. Extract pure math engine** | Fast, Claude runs directly, clean | Must replicate Three.js matrix chain |
| B. Puppeteer browser automation | Uses exact same model | Heavy, slow, fragile |
| C. Hybrid (script generates, browser validates) | Exact model validation | Requires user intervention |

**Approach A is recommended** because:
- Claude can run `node tools/optimize.js` directly via Bash -- no browser, no user
- The RA/Dec computation is just rotation matrices + spherical coords -- doesn't need Three.js
- Fast iteration: hundreds of evaluations per second
- The project already has ~80 standalone Node.js scripts following this exact pattern
- The Three.js coupling is limited and well-understood (see section 3.3)

### 5.2 File Structure

```
tools/
  optimize.js              -- CLI entry point
  explore/
    orbit-counts.js        -- Verify SolarYearCount values and Fibonacci relationships
    conjunction-periods.js -- Jupiter-Saturn conjunction periods from orbit counts
    resonance-loop.js      -- 3-5-8-13-21 beat frequency verification
    alignment-explorer.js  -- Planet alignment dates and patterns
    moon-cycles.js         -- Moon cycle verification (Saros, nodal/apsidal precession)
    year-lengths.js        -- Year-length calculations and seasonal asymmetry
  lib/
    constants.js           -- All orbital constants extracted from script.js
    orbital-engine.js      -- Kepler solver, coordinate transforms, obliquity/inclination
    scene-graph.js         -- Matrix4 class + scene hierarchy replication
    horizons-client.js     -- JPL Horizons API client with caching
    reference-data.js      -- Tiered reference data loader with reliability scores
    optimizer.js           -- Sensitivity scan, Nelder-Mead, residual analysis
    reporter.js            -- Formatted output (tables, JSON, error statistics)
  data/
    parameters.json        -- Current parameter set (read/write by optimizer)
    reference-cache.json   -- Cached JPL Horizons API results
    reference-data.json    -- Compiled reference data with tier/weight per entry
  results/                 -- Optimization run outputs
```

### 5.3 The Core Challenge: Replicating the Scene Graph

The most critical piece is `scene-graph.js` -- it must produce the **exact same planet world positions** as the Three.js scene graph. Here's the approach:

**Implement a minimal Matrix4 class** (~100 lines of pure JavaScript):
```javascript
class Matrix4 {
  constructor() { this.elements = new Float64Array(16); this.identity(); }
  identity() { /* set to identity */ }
  makeRotationX(angle) { /* standard rotation matrix */ }
  makeRotationY(angle) { /* standard rotation matrix */ }
  makeRotationZ(angle) { /* standard rotation matrix */ }
  makeTranslation(x, y, z) { /* translation matrix */ }
  multiply(other) { /* 4x4 matrix multiplication */ }
  invert() { /* matrix inverse */ }
  transformPoint(x, y, z) { /* apply matrix to point */ }
}
```

**Build the hierarchy as a chain of matrix multiplications:**
```javascript
function computePlanetPosition(planetKey, pos) {
  // Build Earth chain matrices (8 nodes)
  const earthChain = buildEarthChain(pos);

  // Build planet chain matrices (5 levels)
  const planetChain = buildPlanetChain(planetKey, pos);

  // World position = earthChain x planetChain x localPos
  const worldPos = compose(earthChain, planetChain).transformPoint(0, 0, 0);

  // RA/Dec = transform into Earth equatorial frame
  const earthFrame = buildEarthRotationAxisMatrix(pos);
  const localPos = earthFrame.invert().transformPoint(worldPos);

  // Spherical coordinates
  const r = Math.sqrt(localPos.x**2 + localPos.y**2 + localPos.z**2);
  const ra = Math.atan2(localPos.x, localPos.z);
  const dec = Math.asin(localPos.y / r);

  return { ra, dec, dist: r / 100 }; // scene units -> AU
}
```

**Validation checkpoint:** At JD 2451716.5 (model start), Mercury RA must equal 7.412897222 hours. This is the acid test that proves the matrix chain is correct.

---

## 6. Parameter Classification -- What Is Tunable?

The model's tunability is more nuanced than a simple list of constants. There are **three categories** of possible changes, each with different implications:

### 6.1 Category A: Input Constants (lines 25-460)

These are the raw input values at the top of `script.js`. Changing them is straightforward but **one input often affects multiple derived quantities**, so changes propagate through the calculation chain.

**Per-planet input constants -- relatively safe to tune:**

| Parameter | Example (Mercury) | What it controls | Propagation effects |
|-----------|-------------------|------------------|-------------------|
| `SolarYearInput` | 87.9683 days | Orbital period -> feeds into `SolarYearCount` -> `OrbitDistance` (Kepler's 3rd) -> `PerihelionDistance` -> orbit speed, orbit radius | **High cascade**: changing this changes orbit size, speed, and all derived geometry |
| `Startpos` | 83.653 deg | Starting orbital angle at model epoch | **Isolated**: only affects where the planet is at JD 2451716.5 |
| `AngleCorrection` | 0.9709 deg | Fine-tunes perihelion alignment -> feeds into `orbitCentera`/`orbitCenterb` of the PerihelionFromEarth object | **Medium cascade**: affects perihelion direction vector |
| `InvPlaneInclinationMean` | 6.726271 deg | Center of inclination oscillation | **Isolated to inclination**: affects computed inclination vs time |
| `InvPlaneInclinationAmplitude` | 0.384267 deg | Range of inclination oscillation | **Isolated to inclination**: affects computed inclination vs time |
| `InclinationPhaseAngle` | Per-planet | Phase of inclination oscillation (ICRF perihelion at balanced year) | **Constrained**: per-planet value derived from balanced year |

**Earth input constants -- HIGH IMPACT, change with extreme care:**

For current values, see [Constants Reference](20-constants-reference.md).

| Parameter | What it controls | Why dangerous |
|-----------|------------------|---------------|
| `earthtiltMean` | Earth object `tilt` property -> obliquity of equatorial frame | **Affects ALL planets' RA/Dec** -- this defines the equatorial coordinate frame |
| `earthRAAngle` | `orbitTilta` of `earthPerihelionPrecession1` | **Derived** (2A − A²/ε). Affects ALL planets' RA -- rotates the entire equatorial reference frame |
| `earthInvPlaneInclinationAmplitude` | `orbitTiltb` of both `earthEclipticPrecession` (negative) and `earthObliquityPrecession` (positive) | **Affects ALL planets' Dec** -- controls Earth's inclination oscillation amplitude |
| `earthInvPlaneInclinationMean` | Used in inclination computation formulas | Less dangerous -- affects Earth inclination calculation |
| `eccentricityBase` | `orbitCentera` of `earthPerihelionPrecession2` = `-eccentricityBase*100` | Orbital radius of PERIHELION-OF-EARTH around Sun |
| `eccentricityAmplitude` | Earth `orbitRadius` = `-eccentricityAmplitude*100` and barycenter `orbitRadius` = `eccentricityAmplitude*100` | Orbital radius of Earth around EARTH-WOBBLE-CENTER |
| `correctionSun` | Sun and PerihelionFromEarth `startPos` | Affects solar/perihelion angular alignment |
| `temperatureGraphMostLikely` | Determines `balancedYear` -> all Earth precession `startPos` values | **Affects ALL precession starting angles** |

### 6.2 Category B: Derived Calculations (lines 960-1770)

These are the formulas that transform input constants into scene graph properties. Changing a **calculation formula** is a different kind of tuning -- it means the mathematical relationship itself is wrong, not just a parameter value.

**The three calculation TYPE patterns:**

```
TYPE I (Mercury, Venus):
  SolarYearCount = round(H x meanSolarYear / SolarYearInput)
  OrbitDistance = ((H / SolarYearCount)^2)^(1/3)          <-- Kepler's 3rd law
  PerihelionDistance = OrbitDistance x OrbitalEccentricity x 100
  ElipticOrbit = PerihelionDistance / 2

TYPE II (Mars, Eros):
  Same as Type I, but:
  RealOrbitalEccentricity = OrbitalEccentricity / (1 + OrbitalEccentricity)
  ElipticOrbit = ((RealEcc x OrbitDist)/2) x 100 + (Ecc x OrbitDist - RealEcc x OrbitDist) x 100
  PerihelionDistance = OrbitDist x Ecc x 100 + ElipticOrbit  <-- DIFFERENT formula

TYPE III (Jupiter, Saturn, Uranus, Neptune, Halley's):
  Same SolarYearCount and OrbitDistance, but:
  RealOrbitalEccentricity = OrbitalEccentricity / (1 + OrbitalEccentricity)
  ElipticOrbit = (Ecc x OrbitDist - RealEcc x OrbitDist) x 100
  PerihelionDistance = RealEcc x OrbitDist x 2 x 100        <-- DIFFERENT formula
```

**Key insight**: The three TYPE formulas compute `PerihelionDistance` differently. If Mars's Dec is systematically wrong, it could be because the TYPE II formula for `PerihelionDistance` doesn't correctly model the orbital geometry. Changing the TYPE formula is a legitimate tuning option.

**Other potentially tunable calculations:**
| Calculation | Line | What it computes | Tuning possibility |
|-------------|------|-----------------|-------------------|
| `LowestPoint` | e.g. 1695 | `180 - AscendingNode` -> `startPos` of RealPerihelionAtSun | The `180-` relationship might need adjustment |
| `orbitTilta/b` of RealPerihelionAtSun | e.g. 2662-2663 | `cos/sin((-90-AscNode) x pi/180) x -EclIncl` -> how the orbit plane is tilted | The trigonometric relationship between AscendingNode and EclipticInclination could need a correction term |
| `orbitCentera/b` of PerihelionFromEarth | e.g. 2610-2611 | `cos/sin((LongPeri+AngleCorr+90) x pi/180) x PerihelionDistance` -> direction of perihelion offset | The `+90` offset is a geometric convention that could need adjustment |

### 6.3 Category C: New Movements (Scene Graph Additions)

The model is built by **stacking movements on top of each other** in a scene graph hierarchy. Each node adds one physical effect (a rotation, translation, or tilt). If the model systematically cannot match observed positions, it may be missing a movement entirely.

**The model currently does NOT include** (acknowledged at [holisticuniverse.com/scientific-background](https://www.holisticuniverse.com/en/reference/scientific-background#what-the-model-does-not-include)):
- **Chandler wobble** (~433-day polar motion of Earth's rotation axis)
- **Lunar nodal precession** (~18.6-year cycle) -- only partially modeled
- **Atmospheric/ocean angular momentum** effects on Earth's rotation
- **Relativistic frame-dragging** (Lense-Thirring effect)
- **Solar mass loss** over geological time
- **Tidal friction** effects on orbital decay

Additionally, there are less well-known cycles that may need modeling:
- **39.5-year Sun-barycenter cycle** -- the Sun's distance to the solar system barycenter oscillates with a ~39.5-year period ([forum discussion](https://forum.tychos.space/t/the-39-5-year-cycle-of-the-sun/661)). Evidence from JPL Horizons shows recurring closest approaches at ~39-year intervals (1851, 1891, 1951, 1990, 2029). This is driven by Jupiter-Saturn relative positions and relates to the 79-year Mars/Sun cycle (2 x 39.5). Could affect Sun position and therefore all geocentric coordinates.
- **Other undiscovered periodic patterns** -- residual analysis may reveal additional cycles not yet documented

**Possible new movements to add:**

| Type | What it would model | Where in hierarchy | Period |
|------|--------------------|--------------------|--------|
| **Chandler wobble** | Earth polar motion | New node in Earth chain, near earth axial precession | ~433 days |
| **Sun-barycenter oscillation** | Sun's distance variation from SSB | New node affecting Sun/barycenter position | ~39.5 years |
| **Short-period perturbation** | Jupiter's gravitational pull on Mars/inner planets | Between PerihelionDurationEcliptic2 and RealPerihelionAtSun | ~12 years (Jupiter), ~29 years (Saturn) |
| **Additional inclination harmonic** | Multi-mode inclination oscillation | New node under existing planet chain | Various eigenmode periods |
| **Eccentricity-coupled tilt** | Orbit plane wobble correlated with eccentricity cycle | Modify existing orbitTilt to be time-dependent | H/16 |
| **Nodal regression correction** | Secular drift in ascending node | New precession node per planet | Planet-dependent |
| **Lunar nodal effect on ecliptic** | 18.6-year nutation component | New node in Earth chain | ~18.6 years |
| **Moon evection** | Solar perturbation of lunar orbit | New node in Moon chain | ~31.8 days |
| **Moon variation** | Acceleration/deceleration near syzygies | New node in Moon chain | ~14.8 days |
| **Moon annual equation** | Earth-Sun distance effect on Moon | New node in Moon chain | ~365.25 days |

**Important**: These missing movements are precisely the kind of thing the optimization tool's **residual pattern discovery** (Phase 8C) should detect. If after tuning all existing parameters there remains a periodic residual with a ~433-day period, that's the Chandler wobble asking to be modeled. If there's a ~39.5-year periodic residual in the Sun's position, that's the barycenter oscillation. For the Moon, residuals with periods matching evection (~31.8d), variation (~14.8d), or annual equation (~365d) indicate missing perturbation terms.

### 6.4 Must NOT Change (observational data, structural constants)

| Parameter | Why fixed |
|-----------|-----------|
| `EclipticInclinationJ2000` | JPL Horizons observational data -- defines the orbit plane |
| `OrbitalEccentricity` | JPL Horizons observational data -- defines orbit shape |
| `AscendingNode` | SPICE kernel data -- defines where orbit crosses ecliptic |
| `InvPlaneInclinationJ2000` | Souami & Souchay (2012) research paper |
| `LongitudePerihelion` | JPL J2000 reference -- defines perihelion direction |
| `PerihelionEclipticYears` | Derived from H/n -- the Fibonacci/Holistic-Year structure is fundamental |
| `holisticyearLength` | Core model constant (335,317) -- the entire model is built on this |
| `perihelionalignmentYear` | Historical reference (1246.03125 AD) |
| `AscendingNodeInvPlaneVerified` | Optimized from Souami & Souchay to match J2000 ecliptic inclinations |
| `moonEclipticInclinationJ2000` | 5.1453964 deg -- observational data |
| `moonOrbitalEccentricity` | 0.054900489 -- observational data |
| `moonDistance` | 384399.07 km -- measured (Lunar Laser Ranging) |
| Laplace-Lagrange bounds | Scientific reference data from Farside Table 10.4 |
| JPL ecliptic inclination trend rates | Scientific reference data from JPL |

### 6.5 The Dependency Chain (how changes propagate)

Understanding the dependency chain is critical for knowing what happens when you change something:

```
SolarYearInput
  -> SolarYearCount = round(H x meanSolarYear / SolarYearInput)
    -> OrbitDistance = ((H / SolarYearCount)^2)^(1/3)             <-- Kepler's 3rd law
      -> PerihelionDistance (TYPE I/II/III formula)
        -> ElipticOrbit
          -> orbitCentera/b of PerihelionFromEarth object        <-- perihelion offset direction
          -> orbitRadius of RealPerihelionAtSun object           <-- ellipse semi-minor axis
      -> orbitRadius of Planet object = OrbitDistance x 100      <-- orbit size in scene
      -> speed of Planet object = 2pi / (H / SolarYearCount)     <-- angular velocity

earthtiltMean
  -> earth.tilt = -earthtiltMean                                <-- defines equatorial plane
    -> ALL RA/Dec computations (via worldToLocal transform)

earthRAAngle
  -> earthPerihelionPrecession1.orbitTilta = -earthRAAngle       <-- tilts equatorial reference
    -> ALL RA values shift by approximately this amount

earthInvPlaneInclinationAmplitude
  -> earthEclipticPrecession.orbitTiltb = -amplitude             <-- one direction
  -> earthObliquityPrecession.orbitTiltb = +amplitude            <-- opposite direction
    -> Combined effect: obliquity oscillation range
    -> ALL Dec values affected

AngleCorrection
  -> PerihelionFromEarth.orbitCentera = cos((LongPeri + AngleCorr + 90) deg) x PerihelionDistance
  -> PerihelionFromEarth.orbitCenterb = cos((90 - (LongPeri + AngleCorr - 90)) deg) x PerihelionDistance
    -> Perihelion direction in ecliptic plane
```

### 6.6 Practical Tuning Strategy

Given the above, optimization should proceed in this order:

1. **First: Per-planet isolated parameters** (`Startpos`, `AngleCorrection`) -- low risk, no cascade
2. **Then: Per-planet cascading parameters** (`SolarYearInput`, `InvPlaneInclinationMean/Amplitude`) -- medium risk, changes orbit geometry
3. **Then: Earth global parameters** (`earthtiltMean`, `eccentricityBase`, `eccentricityAmplitude`) -- high risk, affects all planets (earthRAAngle is derived)
4. **Then: Calculation formulas** (TYPE I/II/III) -- only if systematic patterns suggest the formula itself is wrong
5. **Last: New movements** -- only if residual analysis reveals periodic patterns that no parameter change can explain
