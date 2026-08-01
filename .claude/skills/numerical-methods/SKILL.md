---
name: numerical-methods
description: Use when writing or reviewing any accumulation, integration, quadrature, interpolation, phase advance, or curve fit in this model — anything that multiplies by an elapsed span, integrates a drifting rate, builds a lookup table, or fits an amplitude. Covers the rate-vs-point-value error class that produced four separate bugs in one week, plus estimator conditioning and validation traps.
---

# Numerical methods — the error classes that actually bit us

Every item here is a *measured* bug from this project, with its cost.

## 1. Rate vs point value — the dominant class

**A quantity valid AT A POINT is not valid ACROSS A SPAN.**

The tell: a formula multiplying something by an elapsed span. Ask whether the
multiplicand is constant over that span. If not, the correct form is an integral.

For a linearly drifting rate the rectangle form is **exactly twice** the integral:

```
correct:  s₀·Δt + s'·Δt²/2
wrong:    (s₀ + s'·Δt)·Δt  =  s₀·Δt + s'·Δt²
```

That exactness is diagnostic: **a measured factor of precisely 2.00 that survives
every parameter change is structural, not a mis-set constant.**

Four instances, one week:

| wrong form | cost |
|---|---|
| `pos = sDay(t)·Δt` instead of `∫sDay dt` | 3.3 d at −302 kyr, grows as Δt² (~10 yr at 10 Myr) |
| `drift = (Y−2000)·[T(Y)−mean]` instead of `Σ(T(y)−mean)` | +3.314 d |
| `H` pulled out of `∫a·sin(2πnc)·H(c)dc` | up to 5.2 s |
| instantaneous 1-year anchor used as a rate to integrate | −12,276 s ramp |

## 2. Integral → discrete sum needs Euler–Maclaurin

Quadrature gives you `∫f`. If the physical quantity is `Σf` over discrete years,
add the endpoint term:

```
Σ ≈ ∫ − (f(b) − f(a))/2
```

Omitting it cost 6–13 s. **Both endpoints are required** — do not assume
`f(a) = 0` (here `f(2000) = −0.118 s/yr`, because the reference constant is not
what the scene produces).

## 3. Fix node SPACING, not node count

A fixed Simpson `n` keeps node spacing proportional to the span, so accuracy
degrades linearly with distance from the anchor:

| epoch | fixed n=64 | fixed 2000-yr spacing |
|---|---|---|
| −302 kyr | 0.0 s | 0.0 s |
| −4 Myr | +137.7 s | resolved |
| −380 Ma | **−33,758 s (9.4 h)** | resolved |

In-window correctness tells you nothing about extrapolation. Always test at
−1 Myr and −380 Ma.

## 4. Estimate before you implement

A trapezoid-vs-Simpson table hypothesis was implemented, then refuted by a
30-second estimate that should have come first: `f'' ≈ 2e-21` ⇒ trapezoid error
≈ 6e-9, against 1.2e-6 observed — 200× too small to be the cause. The real cause
was a convention difference (α lattice reference).

**Do the order-of-magnitude estimate before writing the fix.**

## 5. Conditioning — centre your regressors

Fitting an amplitude on a regressor whose absolute value is 3.16e7 while its
variation is 1.8 s is catastrophically ill-conditioned against a free constant.
It returned a **stable, tiny-SE, completely wrong** answer of 5.06 (true: 1.0).

**Stability and a small formal standard error are not evidence of correctness.**
A formal SE assumes the model is complete and residuals are white. When residuals
are structured (unmodelled harmonics), the real uncertainty is far larger.

## 6. Do not "validate" by shrinking the window

Below one full period, harmonics lose orthogonality and swallow the signal — the
amplitude exploded to 1e7 while rms stayed small. Classic collinearity. **The
full-period window IS the estimator**, not an incidental choice. Trimming tests
nothing.

Related: over exactly one period a secular trend is near-collinear with the N=1
sine. Separating them needs multiple series sharing the trend but not the phase.

## 7. Cancelling errors

Two rectangle-vs-integral bugs were equal and opposite (−3.318 d vs +3.314 d).
Fixing either alone sent the fit from ~5.6 min to **1162 min**.

**If a fix makes an unrelated gate go red, suspect a second compensating error
before suspecting the new code.** Cancellation is window-dependent and never
survives extrapolation.

## 8. A small regression can hide a large modelling error

A 12,276 s ramp presented as a 6% RMSE change (6.02 vs 5.66 min) because the
harmonic basis absorbed most of it. It was caught only because a prototype
baseline existed to compare against. **Keep a baseline before changing shared
machinery** — two minutes, and it has caught a 583.7″ regression.

## 9. Validation

- **The in-sample anchor check is a tautology.** Re-evaluating at the anchor you
  derived from proves nothing. Real gate: shipped coefficients against rows the
  fit never saw, decomposed as `RMS² = bias² + scatter²`.
- **Agreement at the anchor with divergence away from it = stale coefficients**,
  not a formula bug.
- **A term can be negligible against the signal and dominant against the
  residual.** A ramp that is 0.1% of the signal was ~100% of what the harmonics left.

## 10. Units and frames

The CSV measures JD intervals = **SI days**. The ESSRT charts are **real (LOD)
days**. Detrending one against the other injects a 2590 s ramp. Put the unit in
every name. `divisor` and `period` are not interchangeable — that confusion
between two engines was worth 643,653 s.
