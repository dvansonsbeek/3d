---
docVersion: 1.0
modelVersion: v10.0
coefficients: sha256:19f53e968ab084a9
status: current
---

# 105 — ΔT stack: what each flag buys

Audit of the four ΔT correction flags (Bond 8H/1830, Hallstatt 8H/1104,
Jose5 8H/2989, Jose4 8H/3749) and the Core-mantle swing, measured through the
authoritative `--joint` fit with pre-registered pass criteria.

**Outcome: no flag is removed.** The shipped four-flag configuration is the best
of every configuration tested, in-sample and out-of-sample, and the ±300/400 kyr
taper stays. What the audit changed is the accuracy of the surrounding claims,
not the model.

---

## 1. Read this before judging any flag

`data/deltaT-4flag-fit.json` carries `fit_metrics.stage_a … stage_e`. **Those are
legacy single-shot cascade diagnostics, not the shipped fit**, and they rank the
flags differently from the fit that actually ships.

The trap is concrete. The stage metrics show stage_d — adding Jose4 — *raising*
`rms_post` from 19.75 s to 21.21 s, which reads as Jose4 not earning its place.
Measured through `--joint`, which re-optimises the USNO/deltaTStart anchors
together with the coefficients, Jose4 is the single largest contributor:
Espenak RMS 34.89 → <!--v:deltaTEspenakRmsSeconds-->12.6<!--/v--> s.

To compare configurations, use `DT_FLAGS` with `--joint` (§5). Never the stage
metrics.

## 2. Diagnostic hooks

All three are diagnostic-only and refuse `--write`/`--sync-code`. With every one
unset, tool output is byte-identical to the shipped run.

| variable | effect |
|---|---|
| `DT_FIT_WINDOW="start:end[:step]"` | trains on a sub-window; automatically scores the held-out complement of −720…2017 |
| `DT_FLAGS="bond,hallstatt"` | restricts the joint design matrix to a flag subset |
| `DT_FIT_DUMP=<path>` | writes the joint solution (coefficients, anchors, amplitudes) to an arbitrary path |

```bash
# what does each configuration buy, in-sample?
DT_FLAGS="bond,hallstatt" DT_CORRECTIONS_DISABLED=1 \
  node tools/fit/dt-corrections-fit.js --joint

# ... and out-of-sample, predicting the pre-CE era it never saw?
DT_FLAGS="bond,hallstatt" DT_FIT_WINDOW="0:2017" DT_CORRECTIONS_DISABLED=1 \
  node tools/fit/dt-corrections-fit.js --joint
```

## 3. Configuration sweep — in-sample

Full −720…2017 window, `--joint`, anchors free to move:

| configuration | Espenak RMS | full RMS |
|---|---:|---:|
| bond | 32.98 s | 77.37 s |
| bond + hallstatt | 33.49 s | 72.70 s |
| bond + hallstatt + jose5 | 34.89 s | 45.00 s |
| bond + hallstatt + jose4 (jose5 removed) | 26.07 s | 74.81 s |
| **all four (shipped)** | **<!--v:deltaTEspenakRmsSeconds-->12.6<!--/v--> s** | **<!--v:stephensonFullWindowRmsSeconds-->31.27<!--/v--> s** |

## 4. Configuration sweep — out-of-sample

Split 2 (train 0…2017 → test −720…−10), the one split whose training window
contains the Espenak anchor era:

| configuration | held-out RMS | intercept-only baseline | R² |
|---|---:|---:|---:|
| bond | 112.6 s | 264.0 s | +0.353 |
| bond + hallstatt | 93.5 s | 262.2 s | +0.554 |
| bond + hallstatt + jose5 | 227.4 s | 249.2 s | −1.639 |
| bond + hallstatt + jose4 | 306.8 s | 282.3 s | −3.802 |
| **all four (shipped)** | **85.4 s** | 223.3 s | **+0.628** |

The shipped stack predicts the Babylonian era from post-CE data at 85 s RMS
against a 223 s baseline. That is the strongest out-of-sample result the stack
has.

### Jose5 and Jose4 are a coupled pair

Judged singly, each looks poor — jose5 without jose4 scores 227.4 s on split 2,
jose4 without jose5 scores 306.8 s — while the pair together is the best result
on every metric. Their periods are 5×Jose = 897 yr and 4×Jose = 715.5 yr, close
enough that the fit distributes structure between them. **Testing either alone
measures a half-specified model, not that flag's contribution.**

Method consequence: a cumulative cascade (A → A+B → A+B+C) confounds "what does
C add" with "what the configuration looks like at that point". The jose5-removed
run is what exposed this, and a leave-one-out run should be standard in any
future flag audit.

### Splits that exclude the anchor era fail structurally

Splits 1 (train −720…1500) and 4 (train −720…900) fail for **every**
configuration, bond-only included (bond split-1 held-out 480.9 s against a
392.2 s intercept-only baseline). Both exclude the modern era where the Espenak
anchor lives, so anchor selection pulls against the training data. They are
stress tests, not verdicts on flag composition.

The honest conclusion from them: **the stack should not be trusted to extrapolate
into eras that exclude its anchor.**

### Note on anchor scoring

The USNO/deltaTStart sweep scores against `ESPENAK_REFERENCE` (1650–2017)
regardless of the training window. This was considered as a possible train/test
leak and deliberately kept: the Espenak and USNO anchors are external
observational boundary conditions, not parameters fitted to the ΔT record, so
holding them fixed across splits is correct.

## 5. Taper

`holoceneTaper` in `tools/lib/deep-time.js` holds the stack full to ±300 kyr,
fading to zero at ±400 kyr.

### The width is not observationally consequential

The stack's ΔT contribution is a sum of bounded sinusoids and does not grow with
age, while ΔT itself grows quadratically:

| year | stack ΔT | total ΔT | stack share |
|---:|---:|---:|---:|
| −2,000 | −420 s | 4.40e4 s | 0.96 % |
| −10,000 | +254 s | 3.81e5 s | 0.067 % |
| −100,000 | −393 s | 3.60e7 s | 0.0011 % |
| −300,000 | +242 s | 3.41e8 s | 0.00007 % |
| −400,000 | 0 s | 6.10e8 s | taper faded |

Beyond ~10 kyr the stack is under 0.1 % of ΔT and never exceeds ~±420 s
absolute. Narrowing the taper would change nothing measurable while costing a
refit and a reship. **The taper width is a safety choice, not a derived value.**

### Per-flag archive support

`scripts/lattice_harmonic_scan.py --candidates 1830,1104,2989,3749 --datasets all`
(✓ = amplitude exceeds the 95th-percentile permutation threshold):

| flag | Steinhilber 9.4 kyr | EPICA 803 kyr | Cheng 639 kyr | LR04 | Stephenson ΔT |
|---|---|---|---|---|---|
| Hallstatt 8H/1104 | ✓ 48.5 vs 23.1 | ✓ 6.85 vs 2.77 | · | · | · |
| Jose4 8H/3749 | ✓ 38.9 vs 26.7 | ✓ 6.34 vs 2.99 | · | · | · |
| Jose5 8H/2989 | · 17.5 vs 26.3 | ✓ 4.65 vs 2.94 | · | · | · |
| Bond 8H/1830 | · 8.5 vs 23.4 | ✓ 4.97 vs 2.90 | · | · | · |

- **All four clear the threshold in EPICA** at 803 kyr — four of four is not a
  chance pattern, and it is the only positive support for a wide taper. But every
  R²ₕ is ~0.01, i.e. coherence at the noise margin.
- **Cheng shows nothing for any flag**; LR04 is unresolvable.
- **Jose4's archive support is circular.** Jose4 was *identified by* a
  Steinhilber + EPICA scan, so those two ✓ marks are post-selection and cannot
  count as independent confirmation.
- **Bond has the weakest deep-time archive support of the four**, failing
  Steinhilber outright. Bond's strength is in the ΔT record, not the archives.
- **No flag is individually significant in the Stephenson ΔT record either**
  (Bond 360.9 against a p95 of 407.5). The four work collectively; none stands
  alone.

## 6. What this audit does and does not establish

Establishes:

- The shipped four-flag configuration is optimal among those tested, in-sample
  and on the one clean out-of-sample split.
- The flags close ΔT and extrapolate usefully backward within ~1 kyr of the fit
  window.
- The taper width is inconsequential and the coefficients should not be touched.

Does **not** establish:

- That the lattice periods are physically real. No flag is individually
  significant in any single record, and the separate climate correspondence
  fails its null tests — see doc 102 § "Defensible scientific position" item 7.
- That the stack extrapolates into eras without an anchor. It does not.

## Cross-references

- `tools/fit/README.md` — the fit pipeline and Step 7c
- `tools/fit/dt-corrections-fit.js` — `--joint`, `DT_FLAGS`, `DT_FIT_WINDOW`, `DT_FIT_DUMP`
- `scripts/lod_residual_shipped_stack_cv.py` — unconstrained-OLS CV of the shipped periods
- `scripts/lattice_harmonic_scan.py` — the cross-archive permutation scan
- `docs/102` § "Defensible scientific position" item 7 — the climate correspondence
- `docs/104` — the Core-mantle swing
