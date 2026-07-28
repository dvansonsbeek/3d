# Lunar series — primary sources

Reference lunar theories used by the framework's derivation laboratories. These
are **external scientific data**, not framework outputs: they exist so the
model's own lunar theory (the Meeus Ch. 47 form documented in
[docs/66](../../docs/66-moon-meeus-corrections.md) and the public "Derived Moon"
document) can be checked against, and decomposed against, the published
classical series.

## `elp2000-82b/` — ELP-2000/82B (Chapront-Touzé & Chapront)

The lunar theory Meeus Ch. 47 abridges. Full series: **37,863 non-zero terms**
across 36 files.

| Item | Provenance |
|---|---|
| `ELP1` … `ELP36` | **Primary source.** IMCCE public archive, `https://ftp.imcce.fr/pub/ephem/moon/elp82b/`. Original fixed-format files of Chapront-Touzé, M. & Chapront, J. (1983) *A&A* 124, 50; revised (1988) *A&A* 190, 342. |
| `moon-elp2000-82b-full.json` | Machine-readable transcription of the same series (from `vsr83/ELP2000-82B`, MIT). This is the file the labs read. Previously carried at `public/input/` and removed in commit `7f83805`; restored here because the derivation labs now depend on it. |

**Transcription verified against the primary source** (2026-07-28): per-file term
counts match for 33 of 36 files; the 3 main-problem files (ELP1/2/3) differ by 9
entries in total, and every one of those is an **A = 0.0 placeholder** the
transcription dropped. The JSON is therefore a faithful, complete copy of the
non-zero series.

File semantics: ELP1–3 main problem (longitude / latitude / distance),
ELP4–9 Earth figure perturbations, ELP10–21 planetary perturbations,
ELP22–27 tidal + relativistic, ELP28–36 Moon figure / solar-eccentricity
partials. Arguments are integer multiples of `D, ℓ′, ℓ, F` (main problem) or of
`ζ, D, ℓ′, ℓ, F` / planetary mean longitudes (perturbations).

## `elp-mpp02/` — ELP/MPP02 (Chapront & Francou)

The **successor** theory: ELP re-fitted with new planetary perturbations, in two
variants — one adjusted to Lunar Laser Ranging, one to JPL DE405/DE406. Full
series: 35,901 terms across 14 files.

| Item | Provenance |
|---|---|
| `elp_main.{long,lat,dist}`, `elp_pert.{long,lat,dist}T*` | Chapront, J. & Francou, G. (2003) *A&A* 404, 735, "The lunar theory ELP revisited. Introduction of new planetary perturbations". Author data originally distributed at `ftp://cyrano-se.obspm.fr/pub/2_lunar_solutions/2_elpmpp02/` (now defunct); obtained via the reformatted copy in `ytliu0/ElpMpp02` (GPL-3.0, compatible with this repository's licence). |

| `driver/ElpMpp02.{cpp,h}` | Reference implementation by Y.-T. Liu (`ytliu0/ElpMpp02`, GPL-3.0), written from the authors' ftp material. **Required to evaluate the series** — see below. |

Format: whitespace-separated rows. Main-problem files carry the four Delaunay
multipliers followed by the amplitude and its partial derivatives; perturbation
files carry the amplitude, phase, and the full multiplier set. `T0…T3` denote the
power of time multiplying each block.

### The series alone are not evaluable — `driver/` supplies the rest

Two things live in the driver rather than in the series files, and both are
needed before a single MPP02 position can be computed:

1. **The fundamental arguments.** MPP02 re-fitted them, which is a large part of
   what separates it from ELP-2000/82B — e.g. `W2` rate `14643420.3171″/cy`
   against ELP82B's `14643420.2632`. Evaluating MPP02 amplitudes on ELP82B
   arguments would mix the two theories and is not a valid substitute.
2. **The two Δ-parameter sets.** `setup_parameters(corr, …)` carries
   `corr=0` (fitted to LLR) and `corr=1` (fitted to JPL DE405/DE406). The
   main-problem partial derivatives exist precisely so amplitudes can be
   corrected by these Δ values; using the nominal amplitudes uncorrected is a
   third variant belonging to neither published solution.

## Why both are here

The two theories bracket a real distinction the framework needs:

- **ELP-2000/82B** is the lineage Meeus Ch. 47 was abridged *from* — so
  `full ELP82B − Meeus-60` isolates pure **series truncation**.
- **ELP/MPP02** is the lineage modern numerical ephemerides (DE-class) were
  fitted *to* — so `MPP02 − ELP82B` was expected to isolate an
  **ephemeris-generation gap**.

The first separation worked: it names **−1.13″** of the shipped 5.1″ RA
correction as planetary-series truncation. **The second did not.** Measured
(`tools/explore/residual-attribution-mpp02.js`), MPP02 and ELP82B agree to
**0.03″** on that term and to 0.30″ RMS in longitude over 2000–2050 — the two
analytic theories sit together, and JPL DE441 sits **~4″ from both**. So the
remaining −4.05″ is an analytic-vs-numerical offset, not a step between
analytic lineages, and it has no series-term decomposition in any analytic
theory. See docs/66 §1.

## Consumers

| Script | Reads |
|---|---|
| `tools/explore/residual-attribution-elp.js` | `elp2000-82b/moon-elp2000-82b-full.json` (default path; override with a CLI argument) |

Nothing in the runtime simulation reads these files — they are laboratory
inputs only.
