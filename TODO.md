# TODO

## Pending

- **Update Holistic website documents + paper to reflect current framework state**
  - Docs 99 and 102 in this repo document the current shipped state:
    - LLR α₁ 3.82 cm/yr Moon recession (was Wells 1989 3.43 cm/yr)
    - L1-orbital-coupled α(t) GIA (was multi-mode Peltier ICE-5G viscoelastic)
    - Factor-2.0 J₂→α conversion (was factor 1.5)
    - dα/dt = −1.35×10⁻¹¹/yr (was −1.8×10⁻¹¹)
    - ALPHA_CLIMATE_SCALE = −3.93×10⁻⁷ (was −5.24×10⁻⁷)
    - USNO 86400.0026 s J2000 anchor (was 86400.0018)
    - deltaTStart 65.924 s (was 57.526)
    - 4-flag lattice stack shipped default-ON (Bond + Hallstatt + Jose5 + Jose4)
    - L-5b headline 21.3 min / 1281 s / 108/267 events (was 48.6 min / 2917 s / 67/267)
    - L-7 solar essentially matches NASA (671 vs 672 s, 44/89 events beating)
    - 26-event solar audit: 1 confirmed + 11 off-peak + 6 regional + 2 ΔT+regional + 6 geographic
    - -135 Babylon: BestGap 949 km at −1h25, ↶ regional match
    - New dLOD/dt driver decomposition (tidal +2.12, GIA −0.35, stack, net L2 +1.77, net L3 +0.764 ms/cy)
    - New Layer 1/2/3 solar-day taxonomy documented
    - Mainstream literature comparison for dLOD/dt decomposition
    - Sub-Milankovitch stack ↔ named climate transitions empirical validation (5/10 within ±100 yr, 10/10 within ±500 yr)
  - Also: docs 100 and 101 archived at `docs/hidden/old-documents/` — website index should not link them
  - Paper `Fibonacci_Laws_of_Planetary_Motion.tex` (external repo) needs the same physics-anchor updates

- **Build the LOD-Climate Rhythm modal** — implementation plan at [docs/hidden/IP-lod-climate-rhythm.md](docs/hidden/IP-lod-climate-rhythm.md)
