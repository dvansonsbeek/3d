---
name: units-and-frames
description: Use when a quantity crosses a boundary — between SI days and LOD days, divisors and periods, snapshot and integrated phase, or between the ecliptic, equatorial, ICRF and of-date frames. Also when naming a new variable that carries a unit or a frame. Covers the conversion errors that produced a 643,653-second discrepancy between two engines computing the same thing.
---

# Units and frames — where two correct calculations disagree

Every item here is a *measured* bug from this project. The pattern they share:
both sides were internally correct and used the same symbol for different things.

## 1. `divisor` and `period` are never interchangeable

The single most expensive naming failure here. The website stored **periods**
(`H/div` in years); the simulator stored **divisors** (the integer `div`). Both
called the field the same thing.

    cost: 643,653 s

Rule: say which. `axialPrecessionDivisor` is an integer; `axialPrecessionYears`
is a duration. A function taking one must never accept the other, and no
conversion may be implicit.

The lattice makes this especially easy to get wrong, because a divisor *looks*
like a period when H is nearby in magnitude. `8H/65` is a divisor expression;
`41,270 yr` is its period at J2000 — and the period is epoch-dependent while the
divisor is not.

## 2. SI days are not LOD days — and there are three of them

**`86400 s` is a definition of the SI day, not a measurement of Earth's
rotation.** Three distinct quantities get called "the day", and they differ in
the third decimal of a second:

| | value at J2000 | what it is |
|---|---|---|
| SI day | `86400` exactly | definition; the unit seconds are counted in |
| **`LOD_mean`** kinematic | **`86399.99967597384`** | the H/13 identity output; baseline for the ΔT integrand and every sidereal↔tropical conversion |
| **`LOD_real`** Layer 4 | `86400.0014` | the **physical** mean solar day, matching the USNO anchor |

### Where `LOD_mean` comes from

```js
meanlengthofday = meansiderealyearlengthinSeconds / meansiderealyearlengthinDays_kinematic
```

| term | value | origin |
|---|---|---|
| numerator | `31558149.7635456` s | IAU sidereal year × 86400 — an **external measured anchor** |
| denominator | `365.256364374` d | `meansolaryearlengthinDays × H/(H−13)` — the **H/13 lattice identity** |

A measured duration in SI seconds, divided by a framework-derived count of days.
The quotient is the length of one framework day, in SI seconds — and it lands
**3.2e-4 s below** the SI definition, a 3.7e-9 relative offset.

That closeness is a **result, not an input.** Two independent things — the IAU
year length and the lattice identity — were never constrained to produce 86400,
and they land within four parts in a billion of it.

Confirm the number from code, never from a document:

```js
require('./tools/lib/deep-time.js').LOD_NOW_H13_S   // 86399.99967597384
```

### Do not confuse `LOD_mean` with the physical day

`LOD_real` is ~1.7 ms **longer**. That gap is not error — it is the physics:
the H/5 ecliptic missing-motion correction, the four-cycle ΔT stack
(Bond/Hallstatt/Jose5/Jose4), and the Core-mantle swing.

So "the physics-derived day is 86,399.9997" is **backwards**. 86,399.9997 is the
*kinematic baseline*; the physical day is 86,400.0014.

### Consequences

Any "year length in days" is meaningless until you say which day:

| quantity | divide the year in seconds by |
|---|---|
| SI / kinematic days | `86400` exactly |
| real (LOD) days | `lodSeconds(year)` |

A year length that changes when deep-time mode is toggled is usually this, not a
physics error.

### The stale-constant trap, demonstrated

This skill originally quoted `86399.99967739309` — taken from memory, which had
taken it from a **pre-refit fit artefact** (`data/deltaT-bond-cycle-residual-fit.json`).
It was 1.42e-6 s wrong and had propagated into a reference document as well.
Three independent code paths agreed on the correct value the whole time.

Constants that live in prose go stale silently. See the
`provenance-reproducibility` skill: numbers in documents are generated, never
typed.

## 3. Snapshot phase vs integrated phase

For a cycle whose period depends on epoch, there are two different quantities:

```
snapshot     phase = div · (t − 2000) / H(2000)      wrong across a span
integrated   phase = ∫ div / H(τ) dτ                 correct
```

H is not fixed: 335,292.31 at one end of the window, 335,319.90 at the other.
Using the snapshot form across deep time is the rate-vs-point-value error in
disguise — see the `numerical-methods` skill, which is the general case.

The tell is the same: something multiplied by an elapsed span.

## 4. Frames — name it or lose it

Four frames are live in this model and they are not interchangeable:

| frame | when it applies |
|---|---|
| **Ecliptic** | orbital elements, the H-lattice precession rates |
| **Equatorial** | declination, RA, obliquity-referred offsets |
| **ICRF** | the fixed inertial reference; per-planet perihelion phase angles |
| **Of-date** | rotating equinox; what Meeus Ch. 47 uses |

A measured instance: **the H/13 rate is ecliptic, but the offset it was compared
against is equatorial.** The conversion is `m = p·cos ε`, not identity. Two
correct numbers, one wrong comparison.

Another: ELP's mean longitude `W1` is referred to the *inertial* mean ecliptic of
date. Adding accumulated general precession `p_A` gives the *rotating* equinox of
date. `evalMoon(t)` and `evalMoon(t, {inertial:true})` differ by exactly that,
and picking the wrong one produces a plausible, wrong residual.

## 5. Detrending changes what the residual means

Removing a trend before fitting redefines the target. A 2590 s error came from
comparing a detrended residual against a non-detrended reference. If one side of
a comparison has been detrended, the other must be, with the same trend.

## 6. Naming rules that prevent all of the above

From `CLAUDE.md`, each traceable to a bug on this page:

| rule | |
|---|---|
| **N1** | Unit always in the name — `…Seconds`, `…Days`, `…Degrees`, `…Radians` |
| **N2** | `divisor` and `period` are never interchangeable; say which |
| **N3** | Epoch parameter is always `year`, always first |
| **N5** | Frame in the name where ambiguous — `Geocentric`, `Ecliptic`, `ICRF`, `OfDate` |
| **N6** | `…AtEpoch` suffix when epoch-dependent; its absence means J2000-fixed |

N6 is the one people skip. A name without it is a *claim* that the quantity does
not move with epoch. If that claim is false, every caller inherits the error.

## Checklist

Before comparing two quantities, or accepting that they disagree:

- Same unit? SI days or LOD days — which?
- Divisor or period — and at which epoch?
- Snapshot or integrated — does the span cross a drift?
- Same frame? If one is ecliptic and one equatorial, where is the `cos ε`?
- Both detrended, or neither?
