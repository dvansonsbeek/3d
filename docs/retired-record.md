---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:b8b18424a3435e20
status: current
---

# Retired Documentation — the Record

Twenty-four documents were removed from this tree when the model's
restatement made their subject matter historical. This page is the
public record of what was retired and why; the full texts remain in git
history (every removal is one commit, `git log --diff-filter=D --
docs/` finds them) and in the maintainers' offline archive.

The through-line: the codebase was originally built around the
**H / 8H family connection** — fitted per-planet corrections, the
Fibonacci-law balance constructions, and lattice-divisor period claims
for the planets. The model has since moved to its **own N-body
dynamics** for everything planetary (the engine-D element chains, the
banked secular series, the one-source Earth movement), and Earth's spin
and time on **one clock — the mean lunisolar precession period** (the
composed torque rate on the tidal chain: Earth's rotation, tides, ΔT, the
deep-time scaling laws), with the fitted anchor and its divisors kept as
the frozen devices' named conventions. The re-evaluation records are doc 108 (the
derived Earth-orbit vector), doc 109 (the model's own N-body vs the
lattice), and doc 10 (the six relations with per-relation statuses).

## What was retired, by family

**The fitted correction stack** (docs 62, 63, 64, 67, 71; the
optimization programme 60, 61, 69; legacy-path references 30, 34, 70,
80; doc 35's predictive-formula derivations): per-planet geometric
chains with fitted parallax/gravitation/elongation corrections. Deleted
from the code at the K5 excision — the planets render from the model's
own N-body element chain, which is not fitted per planet.

**The balance constructions** (docs 19, 36, 38, 53, 54): the Law-3/
Law-5 eccentricity-and-inclination balance instruments and the Config-7
analysis. Re-evaluated with the engine's own dynamical inputs at the
Fibonacci-law retirement (doc 109 is the evidence record); what
survives is documented in doc 10 as an observation, not a law.

**The Law-4 prediction products** (doc 27) and the **Planet Nine
prediction** (doc 15): TNO obliquity predictions and the Planet-Nine
screening — products of the retired law framework. Their predictions
are withdrawn with it; this line is the honest record of that
withdrawal. (The one surviving adjacent claim — the mirror-uniqueness
of the shipped configuration — is documented where it is measured, in
the root README and `data/balance-presets.json`. The Δa mass-derivation
content STAYS in the tree, consolidated in doc 24: the solar-Δa
correction is live physics in the shipped lunar month chain, and the GM
chain it derives is the model's own.)

**The planet lattice-period claims** (docs 37, 55): per-planet
perihelion/node divisor tables and the Solar System Resonance Cycle
period table. The model's own N-body measured the planetary g/s
frequencies OFF the 8H lattice (docs 108/109); the planets' periods are
now dynamical outputs of the chains. Earth's kinematic identities
(H/13, H/3, H/16, H/8) remain documented in docs 10, 11 and 40.

**The spin-only deep-time clock** ("H ∝ LOD", "H(t) = H₀·LOD(t)/LOD₀",
"the structural H(t)/13 precession period"): the statement that Earth's
axial-precession period at deep time scales with the day length alone.
Retired at plan 06 D6/Phase 3. The physical rate is the composed
lunisolar rate ψ̇(t) = [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³] — the
lunar torque grows as the Moon was closer — and the internal unit H(t)
scales with that period (`deltat/deep-time.cjs hAtAge`, one formula home
`earth/precession-composed`). The record that decided it:
against the Precambrian precession constants the spin-only clock read
65.2 ″/yr where Meyers & Malinverno 2018 (Xiamaling, 1.4 Ga) measured
85.79 ± 2.72, and 70.9 where Lantink et al. 2022 (Joffre, 2.46 Ga)
measured 108.6 ± 8.5 — 24 % and 35 % low, outside 1σ in both — while the
composed rate reads 86.5 and 104.5 (both inside 1σ; paleo-anchors gate
rows `xiamaling-prec-1400` / `lantink-prec-2460`, which the spin-only
recipe fails). At 650 Ma Wu et al. 2024 infer 67.64: composed 67.8,
spin-only 58.6. The obliquity-beat keys that rode it read 24.9 kyr at
2.46 Ga where the composed beat reads 15.1.

**"H = 13 × the axial precession period"** (the H/13 identity stated as a
J2000 fact, "T_p = H/13 = 25,793.6 yr"): retired at plan 06 S5 — one J2000
precession reading. H₀ = 335,317 was fitted on the 1246 AD
perihelion–solstice alignment plus the J2000 longitude of perihelion, the
perihelion-of-date beat, not on the axial rate; H₀/13 = 25,793.6 yr is
therefore the fit anchor's reading, 0.086 % slower than the model's own
J2000 period, 25,771.4 yr (the certified of-date year laws' beat, IAU
50.2879 ″/yr to 8×10⁻⁶), and is not a period of anything the model
computes — nor a window mean (the published period averages 25,598 yr
over ±26 kyr, 25,641 over one unit around the balanced year). The composed
clock's anchor p₀, the hybrid's self-anchor and every published face (the
`lunisolar` surface, the registry's `axialPrec*`/`lunisolar*`/`obliqBeat*`
keys, the panels, the API) now read the derived value; the unit and the
clock scale together and their ratio H(t)/T_p(t) = 13.011 is a fit
constant, not structure. The 13 survives only as the unit's calendar
convention — the kinematic day/year identities on H/(H − 13) and the deep
JD↔year calendar (`tropicalYearSecondsAtAge`), device tier, the plan-06
Phase 6 / D2 decision. Measured on the change: the composed rate rose
0.086 % everywhere (Xiamaling +0.94 %, Lantink −3.68 %, both inside 1σ),
the J2000 obliquity beat moved 41.3 → 41.2 kyr, nothing certified moved
(eclipse audit and lunar alignment reproduced bit-for-bit).

The spin-only formula survives in one
place, under its own name: `eraClockHAtAge` = H₀·LOD/LOD₀ is the FROZEN
era clock's phase convention — the ∫dt/H phase table, the cardinal era
clock and the year-length comb family were fitted against it and ship
with it as a device constant (plan 06 D8: two named counters), a
convention of those coefficients, not a claim about the sky.

**Superseded analyses** (docs 39, 97): the pre-unification eccentricity
exploration (superseded by the one H/3 law and doc 108) and the
first-pass paleo-ECS decomposition (superseded by docs 92 and 95).

**The integer-label framing of the climate lines and the ΔT stack**
(plan 06 T1/T5, 2026-09): the claim that the climate formula's orbital
lines and the ΔT stack's cycles are integer divisors of an "8H" base
(the "8H/n lattice", "Solar System Resonance Cycle"). T1 fitted the
33-integer comb and the engine's own Berger/Laskar-style beat lines
(|g_i − g_j|, p + s_i, p + g_i) on the same data, regimes, solver and
line count: the physical set matches or beats the comb in every LR04
regime up to ~25 lines and beats a same-size random null, while the
comb's short-window edge was carried entirely by its 16 lines with no
Earth-forcing counterpart. T5 found the ΔT stack's lattice labels carry
zero information (chance level; the ~1.5-kyr oscillation is real, its
period from the record). The shipped climate formula's L1 is the physical
line set (`data/l1-physical-lines.json`, one home; doc 92 §2); the ΔT
stack keeps its four periods with the divisors as identifiers. Docs 91,
93, 94, 98 stand as the comb-era record with status banners.

## What this does NOT retire

The lunisolar precession clock — the recession history, the LOD/tide/ΔT
stack, the deep-time scaling of precession and the falsification legs
(docs 99, 102–106); the certified era devices (doc 14's cardinal points, doc 11's
frozen year-length laws); the one-source movement and its verification
(docs 40, 57, 108, 109); the climate programme (docs 90–96, 98); the
Moon (doc 66), the legacy-device calibration record (doc 68) and the
Δa mass-derivation chain (doc 24, which now
carries the whole thread — the solar-Δa correction is live physics
inside the shipped lunar month chain).
