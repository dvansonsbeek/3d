---
docVersion: 1.0
modelVersion: v11.0
coefficients: sha256:17f2ead87bad401e
status: current
---

# Ancient-record review — identification adjudication

**Status**: every first-hand ancient eclipse record in the 26-event audit
is **validated at its traditional date** by local-circumstance testing,
and the audit's remaining "geographic" verdicts on ancient rows are
**identification errors in second-hand record chains**, not physics
discrepancies. The Lu −708 record is identified **uniquely** by a
chronology-free sexagenary-day filter. ΔT is unaffected throughout: the
issues live in second-hand solar chronicle linkages only, and the timed
lunar corpus that constrains ΔT is identification-robust
([doc 102](102-gia-alpha-lunar-validation.md)).

---

## The wrong instrument

The 26-event audit classifies each historical eclipse by
**site-to-centerline distance** — the right metric for path-class
questions, and the wrong one for most ancient records. A chronicle or
diary claims a **local circumstance**: totality, "stars came out", a
measured partial phase in digits. A record of a deep partial can sit
1,500 km from the computed centerline and still be *exactly correct*.

The review therefore re-tests what each record **claims**, with the
20.3g location tier (`model.eclipse.solarLocalCircumstances` — IAU GMST
+ standard frame mapping, independent of the browser scene): for each
event, every solar eclipse in the dating-uncertainty window is evaluated
at the documented site (with a day-side pre-filter), candidates with
local magnitude ≥ 0.6 are ranked, and the traditionally-assigned date is
marked. That operationalizes the question "could it have been a
*different* date?" — instruments
`tools/explore/ancient-local-circumstances.mjs` and
`tools/explore/lu-ganzhi-filter.mjs`; all values below are from the
shipped stack (series-injected umbra chain, deep-branch argument
completions).

---

## Adjudications

| Record | Window | Traditional date | Verdict |
|---|---|---|---|
| Lu −708 (Chunqiu, total, day *renchen*) | ±30 yr | −708-07-17, **total, mag 1.019** | **UNIQUE** — ganzhi + totality filter |
| Babylon −135 (diary, "stars visible") | ±25 yr | −135-04-15, mag 0.988 | Best in window; no total candidate exists — the date stands ([doc 103](103-135-babylonian-case-study.md)) |
| Thales −584 (Herodotus) | ±30 yr | −584-05-28, mag 0.975 | Clearly best (next: −587 annular 0.955) |
| Thucydides −430 (crescent + stars, Athens) | ±10 yr | −430-08-03, mag 0.870 | Near-tie with −435 (0.861), traditional marginally ahead — an honest ambiguity historians also debate |
| Plutarch +71 (near-total, Aegean) | ±15 yr | +71-03-20, **total, mag 1.000** | Clearly best |
| Cairo 993 (Ibn Yunus, first-hand) | ±3 yr | 993-08-20, mag 0.959 | Deep partial at the traditional date — validates |
| Cairo 1004 (Ibn Yunus, first-hand) | ±3 yr | 1004-01-24, mag 0.981 | Deep partial at the traditional date — validates |
| Cairo 977 (Ibn Yunus, first-hand) | ±3 yr | 977-12-13, mag 0.600 | Visible partial at the traditional date — validates |
| Cairo 978 (Said, second-hand) | ±3 yr | own date mag 0.498 | **Duplicate/misdated** — window best is the *same* 977-12-13 event (0.600) |
| Cairo 979 (Said, second-hand) | ±3 yr | own date mag 0.455 | **Duplicate/misdated** — window best again 977-12-13 (0.600) |
| Cairo 985 (Said, second-hand) | ±3 yr | own date mag 0.282 | **Misdated ~3 yr** — window best 982-09-20 (0.621) |

Three findings carry the weight:

**The Cairo cluster resolves into first-hand vs second-hand.** The
Ibn Yunus records (977, 993, 1004) are genuine partials at their
traditional dates — their audit "geographic" class measured distance to
a centerline the observers never claimed to be under. The Said
al-Andalusi records (978, 979, 985) have **no adequate eclipse of their
own**: the 978 and 979 windows both point back at the same 977-12-13
event, and 985's only viable candidate is 982-09-20. The audit's large
gaps on exactly the second-hand rows are identification errors in the
transmission chain, and the −647 row (the fifth geographic verdict) is
an early-diary partial of the same local-circumstance character.

**Babylon −135 cannot be rescued by a date shift — and doesn't need
one.** No candidate in ±25 yr is total at Babylon; the traditional date
is the best match in its window, and the ΔT-free identification cascade
selects it uniquely with the required ΔT inside Stephenson's published
totality window (doc 103 owns the full case study; the ~0.01-magnitude
shortfall against literal totality is within the series' ancient error
budget).

**The Lu record is unique under a chronology-free filter.** See below.

---

## The Lu ganzhi filter

The Chunqiu records eclipse days by their **sexagenary (ganzhi) day
names** — a continuous 60-day cycle independent of any year chronology,
giving a 1-in-60 identification filter that no calendar reconstruction
can bias.

The JD↔ganzhi anchor is **verified, not assumed**: two independent
Chunqiu eclipse records — −719 Feb 22 (day *jisi*, #6) and −708 Jul 17
(day *renchen*, #29) — yield the **same offset K = 50** in
`ganzhi# = (localDayNumber + 50) mod 60` (local civil day at Lu). A
wrong day name in either record would break the agreement 59 times
in 60.

Applied to the −708 window (±30 yr, local magnitude ≥ 0.6 at Qufu
35.60 N, 116.98 E): **20 candidates → the renchen filter keeps 3**
(−708 total 1.019 · −703 partial 0.869 · −687 partial 0.697) **→ the
record's totality ("ji", complete) keeps exactly one** — the
traditional −708-07-17, on which the framework independently computes
totality at the site (audit BestGap 51 km). The traditional
identification survives a filter that never consulted the chronology it
confirms.

---

## Limits

- Magnitudes are framework local circumstances under the shipped stack;
  they carry the series' own ancient error budget (~0.01 magnitude
  class at −2 kyr) — rankings are robust to it, absolute totality
  verdicts at the 0.99 boundary are not.
- The ganzhi day names and site identifications follow Stephenson 1997
  Ch. 8; the day-name encodings are to be re-verified against the
  printed source before publication (same convention as the timed
  Babylonian corpus caveat in [doc 66](66-moon-meeus-corrections.md)).
- The 0.6 magnitude display threshold is a reporting choice, not a
  visibility claim; sub-0.6 own-date values for the Said rows are
  quoted directly.

---

## Cross-references

- [Doc 103 — −135 Babylonian case study](103-135-babylonian-case-study.md) — the full −135 identification cascade and residual decomposition
- [Doc 102 — GIA α(t) lunar validation](102-gia-alpha-lunar-validation.md) — the timed lunar corpus, the differential re-reduction, the dense-target cycle discrimination
- [Doc 66 — Moon Meeus corrections](66-moon-meeus-corrections.md) — audit-26 aggregate and the DE441 cross-check showing the Cairo cluster is not a Moon problem
- Sources: Stephenson 1997 *Historical Eclipses and Earth's Rotation* Ch. 8; Said al-Andalusi / Ibn Yunus records via Stephenson, Morrison & Hohenkerk 2016
