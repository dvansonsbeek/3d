---
name: scientific-validation
description: Use when claiming a formula, fit or correction is correct — before reporting a result, closing a gate, or accepting that a number validates a change. Covers the anchor tautology that read clean while a shipped formula was 0.2247 arcsec wrong, cancelling errors, and why a stable estimate with a tiny standard error can still be five times the true value.
---

# Scientific validation — why a green check can mean nothing

Every item here is a *measured* failure from this project. The theme: the check
passed, and the code was wrong.

## 1. The anchor tautology

> `Verify at J2000: 0.0000″` is a **tautology**, not validation.

It re-evaluates the formula at the anchor the formula was derived from. It cannot
fail. It read clean while a shipped formula was **0.2247″ off across 335,318
rows**.

**The real gate:** shipped coefficients against rows the fit never saw,
decomposed as

```
RMS² = bias² + scatter²
```

The decomposition matters. A small RMS hides a systematic offset when scatter
dominates; a bias term is a different failure from noise and needs a different
fix.

**Corollary — agreement at the anchor with divergence away from it is a
signature, not a coincidence.** It means stale coefficients: the formula is fine
and the constants are old. Do not go looking for a formula bug.

## 2. Errors cancel

Two rectangle-vs-integral bugs in the same pipeline were **equal and opposite**.
Fixing either alone moved a fit from ~5.6 min to **1162 min**.

> If a fix makes an unrelated gate go red, suspect a second compensating error
> before suspecting the new code.

This is why a passing suite before a change is not evidence the code is right —
only evidence it is self-consistent.

## 3. Stability and a small SE are not evidence

An ill-conditioned regressor returned a rock-stable amplitude with a tiny formal
standard error:

```
fitted A = 5.06        true A = 1.0
```

Repeated runs agreed with each other. The SE was small. Both facts were
meaningless — the regressor was uncentred, so the estimate was stable *about the
wrong value*. Centre the regressor, then look again.

**Never quote a formal SE as evidence of correctness.** It measures how tightly
the estimator concentrates, not where.

## 4. Shrinking the window to "validate" destroys the test

Trimming the fit window to check robustness broke orthogonality between
regressors. The amplitude went to **1e7**. That is not a robustness failure of
the model; it is the diagnostic invalidating itself.

If you need an out-of-sample test, hold out rows — do not narrow the span.

## 5. Negligible against the signal, dominant against the residual

A term can be safely ignored at the level of the raw quantity and be the largest
thing left once the signal is removed. Once you subtract a fit, re-examine every
term you previously dropped as negligible. The threshold moved.

## 6. Choose the observable that can see the error

**Declination is blind to a longitude error at the solstices and maximally
sensitive at the equinoxes.** Testing the wrong observable at the wrong phase
returns a clean result from a broken model.

Fastest way to classify a discrepancy: evaluate where each candidate cause has
maximum leverage, not where the data is densest.

### Sample at the defined points, not at a convenient grid

The sidereal year was measured at world angles **0/90/180/270** — an arbitrary
geometric grid. Per-angle results scattered across 8 seconds:

| world angle | vs IAU |
|---|---|
| 0° | +4.92 s |
| 90° | +8.17 s |
| 180° | +2.96 s |
| 270° | **−0.30 s** |

The 270° figure looked excellent and was the one being quoted. It was luck: the
parent-chain tilts contribute a −4.24 s projection bias at that angle, which
happened to cancel a real +3.94 s offset.

The fix was not a better average over the same grid. **Measure at the four
cardinal points — SS, AE, WS, VE — because that is where the quantity is
physically defined.** They are found by declination (solstice = extremum,
equinox = zero crossing), not by world angle — see the cardinal-point
detection in `src/script.js` (search `computeSolarYearDaysFromCardinals` /
`_cardinal`).

Generalise: if a sampling grid is chosen for convenience rather than because the
phenomenon is defined there, per-sample scatter is an artefact of the grid, and
any single sample that looks good is unearned. Ask what defines the point before
asking what the value is.

## 7. Estimate before you implement

A trapezoid-vs-Simpson hypothesis was implemented, then refuted by a
thirty-second order-of-magnitude estimate:

```
predicted effect  6e-9
observed effect   1.2e-6
```

Two orders apart — it was never the cause. The estimate should have come first.
The real cause was a convention mismatch.

## 8. Baseline before touching shared machinery

Capture the current numbers before changing anything shared. Two minutes; it has
caught a **583.7″** regression that would otherwise have been attributed to the
next change instead.

## 9. Null tests, and being willing to lose

The LOD↔climate correspondence looked convincing and **failed every null test**:

| test | result |
|---|---|
| sign rule | 65% vs 50% chance; LIA 0% for all five centuries |
| crossings | p ≈ 0.19 |
| Bond↔IRD phase | 175° anti-phase |
| PLV | p = 0.49 |

It was downgraded across the docs, the website and the paper to *"open
correspondence, not validation."*

A correspondence that survives no null test is a hypothesis. Run the null tests
*before* the claim reaches a document, because removing it afterwards costs far
more than never making it.

## Checklist

Before reporting a result as validated:

- Is the check evaluated anywhere other than the anchor it was fitted at?
- Decomposed into bias and scatter, or just an RMS?
- Out-of-sample rows, or the fit's own rows?
- If a gate went red elsewhere — could two errors have been cancelling?
- Is the estimator centred? Is the SE being mistaken for accuracy?
- Does the chosen observable have leverage on this particular error?
- Was there a baseline before the change?
