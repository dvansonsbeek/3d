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
banked secular series, the one-source Earth movement), with the
H-lattice retained where it is measured to hold: **H(t) as the clock**
— Earth's rotation, tides, ΔT, the deep-time scaling laws, and the
kinematic identities. The re-evaluation records are doc 108 (the
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
lunar torque grows as the Moon was closer — and H(t) is now defined as
13 of those periods at every epoch (`deltat/deep-time.cjs hAtAge`, one
formula home `earth/precession-composed`). The record that decided it:
against the Precambrian precession constants the spin-only clock read
65.2 ″/yr where Meyers & Malinverno 2018 (Xiamaling, 1.4 Ga) measured
85.79 ± 2.72, and 70.9 where Lantink et al. 2022 (Joffre, 2.46 Ga)
measured 108.6 ± 8.5 — 24 % and 35 % low, outside 1σ in both — while the
composed rate reads 86.5 and 104.5 (both inside 1σ; paleo-anchors gate
rows `xiamaling-prec-1400` / `lantink-prec-2460`, which the spin-only
recipe fails). At 650 Ma Wu et al. 2024 infer 67.64: composed 67.8,
spin-only 58.6. The obliquity-beat keys that rode it read 24.9 kyr at
2.46 Ga where the composed beat reads 15.1. The formula survives in one
place, under its own name: `eraClockHAtAge` = H₀·LOD/LOD₀ is the FROZEN
era clock's phase convention — the ∫dt/H phase table, the cardinal era
clock and the year-length comb family were fitted against it and ship
with it as a device constant (plan 06 D8: two named counters), a
convention of those coefficients, not a claim about the sky.

**Superseded analyses** (docs 39, 97): the pre-unification eccentricity
exploration (superseded by the one H/3 law and doc 108) and the
first-pass paleo-ECS decomposition (superseded by docs 92 and 95).

## What this does NOT retire

H(t) as the clock — the recession history, the LOD/tide/ΔT stack, the
deep-time scaling of precession and the falsification legs (docs 99,
102–106); the certified era devices (doc 14's cardinal points, doc 11's
frozen year-length laws); the one-source movement and its verification
(docs 40, 57, 108, 109); the climate programme (docs 90–96, 98); the
Moon (doc 66), the legacy-device calibration record (doc 68) and the
Δa mass-derivation chain (doc 24, which now
carries the whole thread — the solar-Δa correction is live physics
inside the shipped lunar month chain).
