# Invariable Plane Balance Explorer

## Overview

The Invariable Plane Balance Explorer is an interactive modal for testing planetary group assignments and Fibonacci divisors for the [Fibonacci Laws of Planetary Motion](10-fibonacci-laws.md). It provides instant visual feedback on whether a given configuration satisfies the inclination balance (Law 3), eccentricity balance (Law 5), and fits within Laplace-Lagrange secular theory bounds.

The explorer allows users to experiment with alternative configurations to understand why certain planetary assignments are uniquely constrained — for example, why the mirror-symmetric d-assignments are the only solution satisfying all six laws simultaneously.

**Related Documentation:**
- [Fibonacci Laws of Planetary Motion](10-fibonacci-laws.md) — the six laws and their derivations
- [UI Panels Reference](50-ui-panels-reference.md) — overview of all UI panels
- [Invariable Plane Calculations](33-invariable-plane-calculations.md) — height calculation formulas

---

## Accessing the Explorer

1. Open the Tweakpane control panel
2. Expand the **"Invariable Plane Positions"** folder
3. Click **"Invariable Plane Balance Explorer"**
4. The modal overlay appears centered on screen

---

## Panel Layout

The explorer is a centered overlay modal (not a side panel) to provide the horizontal space needed for the results table. It uses the same glass-morphism aesthetic as the Planet Hierarchy Inspector.

```
┌──────────────────────────────────────────────────────────────────┐
│  Invariable Plane Balance Explorer              [Presets ▼] [X]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PLANET ASSIGNMENTS                                              │
│  ┌────────┬──────────┬────────┬────┬────────────┬─────┬───────┐  │
│  │ Planet │ Phase(γ)  │ ω̃ J2000│ d  │ Period(yr) │ Grp │ Trend │  │
│  ├────────┼───────────┼────────┼────┼────────────┼─────┼───────┤  │
│  │ Mercury│ [▼ 99.5°] │ 77.46  │[▼] │ 8H/93      │ PRO │ +0.53 │  │
│  │ Venus  │ [▼ 79.8°] │131.58  │[▼] │ 2H/25      │ PRO │ +0.19 │  │
│  │ Earth🔒│  21.8°    │102.95  │ 3  │ H/3        │ PRO │ +1.16 │  │
│  │ Mars   │ [▼ 97.0°] │336.07  │[▼] │ 8H/69      │ PRO │ +1.68 │  │
│  │ Jupiter│ [▼291.2°] │ 14.71  │[▼] │ H/8        │ PRO │ +1.94 │  │
│  │ Saturn │ [▼120.4°] │ 92.13  │[▼] │ H/5        │ ANT │ -3.11 │  │
│  │ Uranus │ [▼ 21.3°] │170.73  │[▼] │ H/16       │ PRO │ +1.16 │  │
│  │ Neptune│ [▼354.0°] │ 45.80  │[▼] │ 2H/25      │ PRO │ +0.19 │  │
│  └────────┴──────────┴────────┴────┴────────────┴─────┴───────┘  │
│                                                                  │
│  BALANCE RESULTS                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Inclination (Law 3): w = √(m·a(1-e²))/d    100%             │  │
│  │ Eccentricity (Law 5): v = √m·a^(3/2)·e/√d  100%             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  PER-PLANET RESULTS                                              │
│  ┌──────┬──────┬──────┬──────────┬──┬───────┬──────┬────┬───┐    │
│  │Planet│ Amp  │ Mean │ Range    │LL│Trend  │ JPL  │Err │Dir│    │
│  ├──────┼──────┼──────┼──────────┼──┼───────┼──────┼────┼───┤    │
│  │Merc  │0.384 │5.963 │[5.6,6.3] │✓ │-0.006 │-0.006│ 0.0│ ✓ │    │
│  │Venus │0.061 │2.094 │[2.0,2.2] │✓ │-0.001 │-0.001│ 0.1│ ✓ │    │
│  │...   │      │      │          │  │       │      │    │   │    │
│  └──────┴──────┴──────┴──────────┴──┴───────┴──────┴────┴───┘    │
│                                                                  │
│  BALANCE VERIFICATION                                            │
│  Incl: Σ(pro)=X  Σ(anti)=Y  →  100%       ✓                           │
│  Ecc:  Σ(pro)=X  Σ(anti)=Y  →  100%       ✓                           │
│  LL: 7/8 pass (Saturn margin) | Dir: 7/7 fitted planets match    │
│  ψ = 2205 / (2 × H) = 3.288e-3                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Controls

### Preset Dropdown

A dropdown in the header offers **743 pre-computed configurations** that achieve ≥99.994% inclination vector balance (the TNO margin). These are grouped by Jupiter/Saturn d-value scenario:

| Scenario | Jupiter d | Saturn d |
|----------|-----------|----------|
| A | 5 | 3 |
| B | 8 | 5 |
| C | 13 | 8 |
| D | 21 | 13 |

Selecting a preset applies its d-values and balance group assignments to all planets (except Earth, which is locked).

### Phase Angle (γ)

A dropdown per planet to select the oscillation phase angle. Each planet has a per-planet phase angle (ICRF perihelion longitude at the balanced year). Available options:

| Option | Value | Description |
|--------|-------|-------------|
| Per-planet default | Various | ICRF perihelion at balanced year (model default) |
| γ₁–γ₈ | Various | Laplace-Lagrange eigenmode angles |
| Custom | User input | Any angle 0°–360° |

Phase angles are per-planet values derived from the balanced year (~302,635 BC). They cluster near LL eigenmodes. See [Fibonacci Laws — Phase Groups](10-fibonacci-laws.md#phase-groups).

### ω̃ J2000 (Read-Only)

Displays each planet's ICRF perihelion longitude at the J2000 epoch. This value is not editable — it is derived from observational data.

### Fibonacci Divisor (d)

A dropdown per planet with common Fibonacci number values:

| Value | Label | Expression |
|-------|-------|------------|
| 1 | 1 | F₁ = F₂ |
| 2 | 2 | F₃ |
| 3 | 3 | F₄ |
| 5 | 5 | F₅ |
| 8 | 8 | F₆ |
| 13 | 13 | F₇ |
| 21 | 21 | F₈ |
| 34 | 34 | F₉ |
| 55 | 55 | F₁₀ |
| Custom | (input) | Any positive value |

Selecting "Custom" reveals a numeric input field.

### Period (years)

The ICRF perihelion period for each planet, editable for exploration. The period determines the base trend displayed in the last column.

### Earth Row (Locked)

Earth's controls are locked (grayed out): phase = 21.77°, d = 3, in-phase group. Earth's amplitude is independently calibrated from the temperature/obliquity model (0.635185°), so its parameters cannot be freely varied.

### Instant Recalculation

Every control change triggers immediate recalculation — no "Calculate" button needed. All results, including balance percentages and the per-planet table, update in real time.

---

## Results

### Balance Results

Two summary lines show the balance percentage for each law:

**Inclination Balance (Law 3):**
```
w = √(m · a(1-e²)) / d
```
The structural weights of the in-phase group must equal those of the anti-phase group. Displayed as a percentage (100% = perfect balance). Turns red if below 90%.

**Eccentricity Balance (Law 5):**
```
v = √m × a^(3/2) × e / √d
```
The eccentricity weights of the in-phase group must equal those of the anti-phase group. Displayed as a percentage. Turns red if below 90%.

### Per-Planet Results Table

| Column | Description |
|--------|-------------|
| **Planet** | Planet name |
| **Amplitude** | Oscillation amplitude in degrees: `ψ / (d × √m)` |
| **Mean** | Center of oscillation: `i_J2000 − amplitude × cos(Ω − γ)` |
| **Range** | `[mean − amplitude, mean + amplitude]` in degrees |
| **LL** | ✓ if range fits within Laplace-Lagrange bounds, ✗ if not |
| **Trend (°/cy)** | Model's apparent ecliptic-inclination trend over 1900–2100, measured against Earth's orbital plane *at each year* (the moving plane of date — what an Earth-bound observer would actually measure) |
| **JPL (°/cy)** | JPL's catalog `dI/dt` re-expressed in the moving-Earth frame. JPL's [Approximate Positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html) reports trends in the *J2000-frozen* ecliptic, so they are not directly comparable to the moving-frame model trend. The displayed value is `JPL_catalog + (trend_moving − trend_J2000_fixed)`. See [32-inclination-calculations.md § Two Frames](32-inclination-calculations.md#two-frames--be-careful-which-one-you-mean). |
| **Frame corr** | The frame correction `trend_moving − trend_J2000_fixed`. Tells you how much of the displayed JPL value comes from Earth's plane motion between 1900 and 2100. |
| **Err** | `\|Trend − JPL\|` × 3600 — both columns now share the same frame so the subtraction is meaningful (arcseconds/century) |
| **Dir** | ✓ if `Trend` and `JPL` have the same sign, ✗ if not (Earth shows —) |
| **d×i×√m** | Structural weight for inclination balance (scientific notation) |
| **v (ecc)** | Eccentricity weight (scientific notation) |

### Balance Verification

Below the results table:

- **Inclination verification**: Sum of in-phase group weights, sum of anti-phase group weights, balance percentage, pass/fail indicator
- **Eccentricity verification**: Same format for eccentricity weights
- **Status line**: Count of LL bounds passes (out of 8) and direction matches (out of 7, Earth excluded)
- **ψ formula**: `ψ = 2205 / (2 × H)` (see [Constants Reference](20-constants-reference.md) for current value)
- **Explanatory text**: Brief description of the TNO margin (~0.006%, ~1.25 arcseconds) and balance conditions

---

## Interpreting Results

### A Valid Configuration

A configuration is valid when:

| Check | Criterion |
|-------|-----------|
| **Inclination balance** | ≥99.994% (TNO margin) |
| **Eccentricity balance** | High percentage (100% for the model configuration) |
| **LL bounds** | All 8 planets within Laplace-Lagrange bounds (Config #1 has Saturn at +0.027° excess — within source precision, see [54 § 2A](54-vector-balance-analysis.md#2a-saturn-ll-bound-excess-is-within-source-precision)) |
| **Trend directions** | All 7 fitted planets match JPL direction in the J2000-fixed frame (7/7 ✓) |

### Exploring Configurations

Useful experiments to try:

| Experiment | Expected Result |
|------------|----------------|
| Change Saturn to in-phase group | Balance collapses (all planets on one side) |
| Increase Neptune d from 34 to 55 | Amplitude decreases, may still pass LL bounds |
| Set Jupiter d to large value (e.g., 55) | Jupiter amplitude shrinks, balance breaks |
| Use Preset dropdown | See all 743 valid configurations |
| Look for Config #1 (Scenario A) | The unique mirror-symmetric solution |

### Why Earth Is Locked

Earth's inclination amplitude (~0.632°) is predicted by the Fibonacci formula. With d = 3:

```
amplitude = ψ / (3 × √m_Earth)
          = 3.288e-3 / (3 × 1.7331e-3)
          = 0.632°
```

The model's calibrated value (0.63603°) is 0.47% higher, tuned to match IAU observations. Changing Earth's d would break this relationship.

---

## Default Configuration

The model's default (and uniquely determined) configuration:

| Planet | Phase | d | Fibonacci | Mirror partner |
|--------|-------|---|-----------|----------------|
| Mercury | Prograde (234.52°) | 21 | F₈ | Uranus |
| Venus | Prograde (259.82°) | 34 | F₉ | Neptune |
| Earth | Prograde (21.77°) | 3 | F₄ | Saturn |
| Mars | Prograde (231.95°) | 5 | F₅ | Jupiter |
| Jupiter | Prograde (291.18°) | 5 | F₅ | Mars |
| Saturn | Anti-phase (120.38°) | 3 | F₄ | Earth |
| Uranus | Prograde (21.33°) | 21 | F₈ | Mercury |
| Neptune | Prograde (174.04°) | 34 | F₉ | Venus |

Expected results:
- Inclination balance: **100%**
- Eccentricity balance: **100%**
- LL bounds: **7/8 pass** (Saturn: +0.027° excess, within Brouwer & van Woerkom source precision)
- Trend directions: **7/7 fitted planets match JPL direction** (J2000-fixed frame)
- Total trend error: **~4.3″/century** across all 7 fitted planets

This is Config #1 out of 743 valid configurations — the only one with mirror-symmetric d-assignments (Finding 2 in [Fibonacci Laws](10-fibonacci-laws.md#finding-2-configuration-uniqueness)). The d-values, antiPhase grouping, and mirror pairs are unchanged from the original April 2026 analysis; the asc-node integers and 4 phase angles were re-fit 2026-04-09 to bring JPL trends into agreement.

---

## Input Variables

Each calculation in the Balance Explorer uses a mix of **fixed constants** (from JPL DE440 / model calibration, not editable) and **user-adjustable parameters** (controlled via the UI). The table below shows which variables feed into which calculation.

### Fixed Constants (per planet)

These are read from the model's orbital element constants and cannot be changed in the explorer:

| Variable | Symbol | Description | Source |
|----------|--------|-------------|--------|
| Mass | m | Planet mass in solar units (M_planet / M_sun) | JPL DE440 mass ratios |
| Semi-major axis | a | Orbital semi-major axis in AU | JPL orbital elements |
| Eccentricity | e | Orbital eccentricity at J2000 epoch | JPL J2000 orbital elements |
| J2000 inclination | i_J2000 | Inclination to invariable plane at J2000 | Souami & Souchay (2012) |
| Perihelion longitude | ω̃_J2000 | ICRF perihelion longitude at J2000 | JPL orbital elements |
| JPL trend | trend_JPL | Observed ecliptic inclination trend (°/century) | JPL ephemerides |
| LL bounds | LL_min, LL_max | Laplace-Lagrange secular theory inclination bounds | Secular perturbation theory |
| Holistic Year | H | See [Constants Reference](20-constants-reference.md) — used to derive ψ | Model calibration |

### User-Adjustable Parameters (per planet)

These can be changed via the UI controls (except for Earth, which is locked):

| Variable | Symbol | Description | Default |
|----------|--------|-------------|---------|
| Fibonacci divisor | d | Fibonacci number dividing the amplitude | See [Default Configuration](#default-configuration) |
| Phase angle | γ | Per-planet phase angle (ICRF perihelion at balanced year) | Per-planet values |
| ICRF period | T | ICRF perihelion period in years | From model constants |

### Variables Used Per Calculation

#### Inclination Amplitude (Law 2)

Determines each planet's oscillation amplitude around its mean inclination.

| Variable | Type | Role |
|----------|------|------|
| ψ = 2205/(2×H) | Fixed | Universal coupling constant |
| d | **User-adjustable** | Fibonacci divisor |
| m | Fixed | Planet mass (via √m) |

#### Mean and Range

Derives the center and bounds of inclination oscillation from the amplitude.

| Variable | Type | Role |
|----------|------|------|
| amplitude | Computed | From Law 2 above |
| i_J2000 | Fixed | J2000 inclination snapshot |
| ω̃_J2000 | Fixed | ICRF perihelion longitude at J2000 |
| γ | **User-adjustable** | Phase angle (determines cos_phase) |

#### Inclination Balance (Law 3)

Tests whether the structural weights cancel between the two phase groups.

| Variable | Type | Role |
|----------|------|------|
| m | Fixed | Planet mass (via √m) |
| a | Fixed | Semi-major axis |
| e | Fixed | Eccentricity (via 1−e²) |
| d | **User-adjustable** | Fibonacci divisor (denominator) |
| γ | **User-adjustable** | Phase angle (group membership: Saturn = anti-phase, all others = in-phase) |

#### Eccentricity Balance (Law 5)

Tests whether the eccentricity weights cancel between the two phase groups.

| Variable | Type | Role |
|----------|------|------|
| m | Fixed | Planet mass (via √m) |
| a | Fixed | Semi-major axis (via a^(3/2)) |
| e | Fixed | Eccentricity (direct multiplier) |
| d | **User-adjustable** | Fibonacci divisor (via √d) |
| γ | **User-adjustable** | Phase angle (determines group membership) |

Note: Law 5 uses **different powers** of the same variables compared to Law 3 — `a^(3/2)` instead of `a^(1/2)`, `e` directly instead of `(1−e²)`, and `1/√d` instead of `1/d`. This is why the two balance conditions are independent.

#### Laplace-Lagrange Bounds Check

Verifies the oscillation range fits within secular theory predictions.

| Variable | Type | Role |
|----------|------|------|
| mean | Computed | From Mean calculation above |
| amplitude | Computed | From Law 2 above |
| LL_min, LL_max | Fixed | Secular theory bounds per planet |

#### Ecliptic Trend

Computes the apparent change in ecliptic inclination over 1900–2100 by comparing orbital pole normal vectors.

| Variable | Type | Role |
|----------|------|------|
| mean | Computed | From Mean calculation above |
| amplitude | Computed | From Law 2 above |
| ω̃_J2000 | Fixed | Planet ICRF perihelion longitude at J2000 |
| γ | **User-adjustable** | Phase angle |
| T | **User-adjustable** | ICRF period (determines ω̃ drift rate) |
| Earth constants | Fixed | Earth's mean, amplitude, ω̃, and period (H/3) for the reference frame |

---

## Calculation Details

### Inclination Amplitude (Law 2)

```
amplitude = ψ / (d × √m)

Where:
  ψ = 2205 / (2 × H)
  H = Holistic Year (see Constants Reference for current value)
  d = Fibonacci divisor
  m = planet mass in solar units
```

### Inclination Balance (Law 3)

The structural weight per planet:
```
w = √(m × a × (1-e²)) / d
```

Balance condition:
```
Σ(in-phase group) w = Σ(anti-phase group) w
```

### Eccentricity Balance (Law 5)

The eccentricity weight per planet:
```
v = √m × a^(3/2) × e / √d
```

Balance condition:
```
Σ(in-phase group) v = Σ(anti-phase group) v
```

### Ecliptic Trend Calculation

To verify that a configuration produces correct observed inclination trends, the explorer computes the apparent ecliptic inclination at years 1900 and 2100:

1. For each year, compute the planet's orbital pole and Earth's orbital pole in invariable plane coordinates
2. Apparent inclination = arccos(dot product of normal vectors)
3. Trend = (incl₂₁₀₀ − incl₁₉₀₀) / 2 degrees per century

The planet's invariable plane inclination at year Y:
```
ω̃(Y) = ω̃_J2000 + (360/icrfPeriod) × (Y − 2000)
i(Y) = mean + amplitude × cos(ω̃(Y) − γ)
```

### Laplace-Lagrange Bounds Check

Each planet's oscillation range `[mean − amplitude, mean + amplitude]` is checked against the Laplace-Lagrange secular theory bounds (with 0.01° tolerance):

```
fits = (mean − amplitude ≥ LL_min − 0.01) AND (mean + amplitude ≤ LL_max + 0.01)
```

---

## Code Locations

| Component | Location |
|-----------|----------|
| `BALANCE_PLANETS` array | [script.js:9207](../src/script.js#L9207) |
| `BALANCE_PRESETS` (743 configs) | [script.js:9216](../src/script.js#L9216) |
| `D_VALUE_OPTIONS` | [script.js:9330](../src/script.js#L9330) |
| `BALANCE_CONFIG` | [script.js:9348](../src/script.js#L9348) |
| `computeBalanceResults()` | [script.js:9497](../src/script.js#L9497) |
| `createBalanceExplorerPanel()` | [script.js:9619](../src/script.js#L9619) |
| `updateBalanceExplorerResults()` | [script.js:9868](../src/script.js#L9868) |
| `openBalanceExplorer()` / `closeBalanceExplorer()` | [script.js:9966](../src/script.js#L9966) |
| Menu button in Tweakpane panel | [script.js:11535](../src/script.js#L11535) |
| CSS styles (`.fbe-` prefix) | [style.css](../src/style.css) |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [10 - Fibonacci Laws](10-fibonacci-laws.md) | The six laws, derivations, and findings |
| [50 - UI Panels Reference](50-ui-panels-reference.md) | Overview of all UI panels |
| [33 - Invariable Plane Calculations](33-invariable-plane-calculations.md) | Height calculation formulas |
| [20 - Constants Reference](20-constants-reference.md) | Planet masses and orbital elements |

---

---

## Vector Balance Diagram

The Balance Explorer includes an interactive polar SVG diagram showing the 2D vector balance of planetary angular momentum perturbations at the current simulation year.

### What it shows

- **Outer ring**: Colored dots at each planet's current ICRF perihelion longitude (ϖ)
- **Arrows from center**: Force vectors pointing at each planet's ascending node direction (Ω), with length proportional to L × sin(i) — the angular momentum perturbation magnitude
- **Green arrows**: In-phase planets (7 planets)
- **Red arrow**: Anti-phase planet (Saturn)
- **Gold dashed circle**: Net imbalance at center
- **Dashed lines**: Fixed phase angles (φ) — where each planet reaches its inclination extreme
- **Force share**: In-phase total %, anti-phase total %, and imbalance %

The diagram updates live as the simulation year changes.

### Single-mode vs Multi-mode toggle

A toggle button switches between two ascending node models:

**Single-mode** (default): Each planet's ascending node precesses at ONE constant rate (the model's 8H/N period from `ascendingNodeCyclesIn8H`). Different planets have different rates, so the vector cancellation geometry breaks over time. Balance can drop to ~72% at some epochs.

**Multi-mode**: Each planet's ascending node position is computed as the sum of 7 eigenmodes, all oscillating simultaneously. The eigenvector amplitudes are solved to enforce angular momentum cancellation per mode. Balance is guaranteed 100% at all times.

### The vector balance constraint and its limitations

The vector balance diagram demonstrates an important subtlety: the multi-mode solver gives 100% balance for ANY set of 7 frequencies — not just the model's 8H/N values or Laskar's measured eigenfrequencies. This is because the solver has 56 free parameters (8 planets × 7 modes) but only 23 constraints (16 data + 7 angular momentum), leaving 33 degrees of freedom to always find a solution.

**What this means:** The 100% vector balance is a mathematical property of the solver's over-determined system, not a unique property of any specific frequency set. The invariable plane is stable by DEFINITION — it is the plane where Σ L×sin(i)×exp(iΩ) = 0 — so any eigenmode decomposition that reproduces the J2000 state will automatically maintain this.

**What IS genuinely constraining (and unique to this model):**

| Constraint | Status | Laskar equivalent |
|-----------|--------|-------------------|
| Scalar inclination balance (Law 3) = 100% | ✓ Real constraint, selects d-values | None |
| Scalar eccentricity balance (Law 5) = 100% | ✓ Independent constraint, same d-values | None |
| Fibonacci d-values with mirror symmetry | ✓ Structural prediction | None |
| 8H/N ascending node periods (re-fit 2026-04-09 to JPL trends) | ✓ JPL trend match for 7/7 fitted planets | Laskar's s₁–s₈ are no longer the target — see [55 § Notable Patterns](55-grand-holistic-octave-periods.md#notable-patterns) |
| J2000 positions and short-term rates | ✓ Match observations | ✓ Match observations |

**What CANNOT be observationally verified:**

The ascending node periods (whether 8H/N or Laskar's values) describe motion over 50,000–2,000,000 year timescales. Humanity has at most ~4,000 years of recorded astronomical observations — far too short to distinguish between:

- A constant rate (single-mode at 8H/N)
- A wobbling rate (multi-mode sum of 7 eigenfrequencies)
- A fundamentally different period that produces the same J2000 snapshot

The model's 8H/N predictions and Laskar's N-body measurements both produce indistinguishable motion over observable timescales. The difference is philosophical: Laskar extracts 8 independent numbers from a simulation; our model derives all 7 from a single constant (H = 335,317) with a Fibonacci structure that also explains the scalar balance, the d-values, and the mirror symmetry.

### Frequency comparison

| Mode | Our 8H/N | Our rate | Laskar rate | Diff |
|------|---------|----------|-------------|------|
| s₁ (Mercury) | 8H/12 | −5.80"/yr | −5.61"/yr | +3.3% |
| s₂ (Venus) | 8H/15 | −7.25"/yr | −7.06"/yr | +2.6% |
| s₃ (Earth) | 8H/40 | −19.33"/yr | −18.85"/yr | +2.5% |
| s₄ (Mars) | 8H/37 | −17.88"/yr | −17.64"/yr | +1.4% |
| s₆ (Saturn) | 8H/55 | −26.57"/yr | −26.35"/yr | +0.8% |
| s₇ (Uranus) | 8H/6 | −2.90"/yr | −2.99"/yr | −3.1% |
| s₈ (Neptune) | 8H/1 | −0.48"/yr | −0.69"/yr | −30% |

The Neptune outlier (8H/1 = 2.68M yr vs Laskar's 1.87M yr) is the largest discrepancy. Neptune's eigenfrequency is so slow that even Laskar's 50 Myr integration captures only ~27 complete cycles, limiting measurement precision.

---

**Previous**: [10 - Fibonacci Laws of Planetary Motion](10-fibonacci-laws.md)
