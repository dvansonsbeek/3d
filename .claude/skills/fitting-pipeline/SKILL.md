---
name: fitting-pipeline
description: Use when running, modifying or reviewing any fitter in tools/fit — or when a fit result is about to be written to fitted-coefficients.json or synced into shipped code. Covers the greedy-write trap that was present in all three fitters, the shipped-vs-search distinction, and why coefficients and runtime form are a matched pair.
---

# Fitting pipeline — the traps that ship silently

Every item here is a *measured* failure in this project's own fitters. They share
a property: nothing crashes, and a plausible number lands in a shipped file.

## 1. Write the SHIPPED divisor set, never the greedy result

**The single most dangerous trap here, and it was present in all three fitters.**

A greedy search over divisor sets is a *diagnostic*. It tells you whether the
shipped set is near-optimal. It is not a proposal to adopt.

```
greedy search  →  report the comparison
shipped set    →  write the coefficients
```

Writing the greedy winner silently churns a **structural claim** — the H-lattice
divisor set is the theory, not a tuning parameter — in exchange for a
rounding-level RMS gain. A refit that changes which divisors ship is a change to
the model, and must be an explicit, reviewed decision.

Before any fitter writes: confirm the divisor set it is writing is the one in
`fitted-coefficients.json`, not the one its search preferred.

## 2. Corrections stay harmonic on H-lattice divisors

**No T, T², T³.** Polynomial corrections fit the window and compound outside it.
A fitted linear slope was **41 min wrong at −400 Ma**. A Sun T² term produced a
visible offset and was disabled.

Every correction is a harmonic on a divisor of H (or 8H). That constraint is what
makes the model extrapolate rather than interpolate — a polynomial correction
destroys the lattice claim even when it improves the in-window RMS.

If a residual cannot be expressed as a lattice harmonic, that is a finding to
document, not a licence to add a polynomial.

## 3. Coefficients and runtime form are a matched pair

The generator can emit terms the runtime cannot evaluate. That is not a runtime
bug; it is a contract violation, and it must fail the build.

Two shapes that have diverged here: `[div, sin, cos]` versus
`{order, sin, cos}`. Same data, different reading, no error — just wrong numbers.

**Build assertion:** if the emitted term shape is not what the evaluator parses,
the build fails. Do not add a tolerant parser; the tolerance is what hides it.

## 4. Always verify out-of-sample

An in-sample RMS is a description of the fit, not evidence about the model. See
the `scientific-validation` skill — in particular that `Verify at J2000: 0.0000″`
is a tautology.

Minimum: hold out rows the fit never saw, and report
`RMS² = bias² + scatter²`. Do **not** narrow the fit window as a substitute —
that broke orthogonality and sent an amplitude to 1e7.

## 5. Refits move anchors — check what else moved

Fitted scalars propagate. Since the Phase-14 website split, the website
consumes the published packages (`@essrt/physics` + `@essrt/model-values`) —
a refit reaches it by `npm run values:package:write` + publishing new
package versions, never by file sync. The `values:package` check in the
chain fails if the packaged values lag the registry.

After a refit, the question is not "did the fit improve" but "which shipped
anchors moved, and does every downstream gate still pass with the new values".

## 6. Judge coupled flags leave-one-out, never by cascade

The ΔT stack's four flags are not independent. `fit_metrics.stage_*` are **legacy
cascade diagnostics that rank the flags backwards**, and Jose5/Jose4 are a
**coupled pair** — dropping one makes the other look worthless.

Evaluate by leave-one-out against the full stack. A cascade ordering answers a
different question than the one being asked.

## 7. Back up the corpus before regenerating

`data/02-solar-measurements.csv` is 166 MB, gitignored, and takes **2 h 24 m** to
rebuild. There is no git recovery. Back it up before any regeneration.

The file is *derived* and deterministic given the constants, so the
reproducibility artefact is `export-solar-measurements.js` plus the constants —
but that is a reason not to commit it, not a reason to be casual about losing it
mid-campaign.

## 8. Fit the structure, not the points

When the theory says several fitted quantities share one object, fit the
shared object — with the structural relation locked in the design matrix, not
checked afterwards. Measured on the §10g cardinal-point sidebands:

- **Free per-point fitting proves nothing and can destroy evidence.** 104
  free mid-band parameters reached a 6× better RMSE — by splitting the braid
  arbitrarily and breaking the quadrature gate (7.7°/17.6% spread). Free
  parameters always improve RMSE; the gain carries no information.
- **A structural lock makes RMSE evidential.** 52 parameters SHARED across
  the four points (phase = order·λ_X − 2π·div·c, quadrature enforced by
  construction) captured 3× of residual with zero per-point freedom and
  OOS ≡ in-sample. Under a lock, captured variance is evidence FOR the
  structure — there is nothing free to fake it with.
- **Run the sign experiment.** Fit every discrete convention (rotation sense,
  order pattern) with identical freedom. §10g: the counter-rotating lock
  captured the residual; the co-rotating lock captured NOTHING. Wrong
  geometry fails all senses; an overfitting basis passes all; exactly one
  passing is structure detection. A null under one lock is not failure — it
  is half of the measurement.
- The lock's discrete choices (band, orders, angles, SIGN) are structural
  claims. Document the refuted senses next to the shipped one so nobody
  "fixes" a load-bearing minus sign.

## Checklist

Before a fitter writes anything:

- Is it writing the shipped divisor set, or its own search result?
- Any T/T²/T³ sneaking in as a "small correction"?
- Does the emitted term shape match what the runtime parses — asserted, not assumed?
- Out-of-sample rows held out, bias and scatter reported separately?
- Which shipped anchors will move, and are their gates re-run?
- Where quantities share a structural object: fitted jointly with the lock in
  the design matrix, and the refuted senses recorded?
- Is the 166 MB corpus backed up?
