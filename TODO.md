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

- **Identify the physical channel for the fractional non-tidal secular rate (~0.5 ms/century)** — tracked as doc 102 §"What's next" item 3. §16 rate-sensitivity diagnostic finds a ~0.5 ms/cy contribution in the ΔT residual after α(t) + 4-flag stack subtraction (≈ 2× Cox-Chao satellite value, ~10% of full Munk-MacDonald). Currently detected but **not modelled** — website + docs honestly disclose this. Candidate mechanisms:
  - Time-varying core-mantle EM coupling (constant Holme 1998 rate was rejected — over-corrects Babylonian ΔT by ~2,700 s; time-average could still hit ~0.5 ms/cy if variability is derived from independent geomagnetic-secular-variation data)
  - Continental hydrology / groundwater / sea-level redistribution on centennial timescale (not currently in α(t))
  - Regional GIA structure beyond the global-average L1-orbital α(t) (a higher-resolution ICE-6G_C-type model with continental-resolution rebound profiles)
  - Fifth 8H-lattice harmonic (Eddy 999 yr / Emp862 862 yr / Jupiter92 1090 yr all tested and rolled back for various reasons — see doc 102 § "Rolled-back candidates")

  Whichever path pays off first, calibration must come from independent (non-eclipse) physics — otherwise the "zero eclipse-fitting" claim reduces to "zero fitting except for this channel". Preserving that claim is the design constraint.

- **Stage 2 (LOD-Climate Rhythm modal): GIA moving-mean analysis** — plan at [docs/hidden/IP-lod-climate-rhythm.md](docs/hidden/IP-lod-climate-rhythm.md) §Stage 2. Rolling-mean deviation over 100/300/1000/3000 yr windows, plus a proposed Framework Climate Index (FCI). Open question: does moving-mean deviation carry signal beyond the raw rate breakdown, or is it a phase-shifted version of the same information?

- **Stage 3 (LOD-Climate Rhythm modal): DT stack tuning sliders** — plan at [docs/hidden/IP-lod-climate-rhythm.md](docs/hidden/IP-lod-climate-rhythm.md) §Stage 3. Per-flag amplitude/phase live-preview sliders (±20% amp, ±50 yr phase) for hypothesis-testing without overwriting the shipped defaults. Less urgent now that Bond IRD r = +0.49 validates the current 4-flag calibration.
