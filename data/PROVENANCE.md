# Data provenance and redistribution rights

Every third-party dataset under `data/`, with its source, licence and whether
this repository may redistribute it. Datasets we may **use** but not
**redistribute** are gitignored and carry a download step below.

The distinction that matters: *access* and *redistribution* are different
rights. A dataset can be freely downloadable and still not licensed for us to
ship a copy inside an AGPL-3.0 repository.

Model physics depends on **none** of these. They are research inputs and
cross-validation references. Removing any of them does not affect
`public/input/`, the fitting pipeline, or the simulator.

---

## Tracked — redistribution permitted

### NOAA / World Data Center for Paleoclimatology

US federal open-data policy; freely redistributable with citation. Each file
retains its original NOAA header giving the full citation.

| file | study |
|---|---|
| `bond2001-raw.txt` | Bond et al. (2001) — North Atlantic ice-rafted debris |
| `chalk-2017-boron-co2.txt` | Chalk et al. (2017) — boron-isotope CO₂ |
| `cheng2016-speleothem.txt` | Cheng et al. (2016) — China 640 kyr speleothem δ¹⁸O |
| `dyez-2018-boron-co2.txt` | Dyez et al. (2018) — boron-isotope CO₂ |
| `epica-co2-bereiter2015.txt` | Bereiter et al. (2015) — revised 800 kyr Antarctic CO₂ |
| `gisp2-alley2000-raw.txt` | Alley (2000) — GISP2 temperature |
| `martinez-boti-2015-boron-co2.txt` | Martínez-Botí et al. (2015) — boron-isotope CO₂ |
| `moberg2005-raw.txt` | Moberg et al. (2005) — 2000-yr NH temperature |
| `spratt-lisiecki-2016-sea-level.txt` | Spratt & Lisiecki (2016) — sea-level stack |
| `steinhilber-2012-solar.txt` | Steinhilber et al. (2012) — 9.4 kyr solar activity |

### Explicitly licensed

| file | source | licence |
|---|---|---|
| `westerhold2020-cenogrid.tab` | Westerhold et al. (2020), CENOGRID, PANGAEA | **CC-BY-4.0**, stated in the file header |
| `cenco2pip-100kyr-bayesian.csv` | CenCO2PIP Consortium (2023), *Science* 382:eadi5177. Data product `SPATIAL-Lab/CenoCO2` v1.2, Bowen, Zenodo record 10471529 | **CC-BY-4.0** |
| `delavega-2020-boron-co2.xlsx` | de la Vega et al. (2020), *Scientific Reports* 10, doi:10.1038/s41598-020-67154-8 | **CC-BY-4.0** — *Scientific Reports* is fully open access |
| `lr04-stack.txt` | Lisiecki & Raymo (2005) | freely distributed, citation requested (stated in file) |
| `kiani-shahvandi2024-lod-residual.txt` | Kiani Shahvandi et al. (2024) — LOD residual | citation requested |
| `rspa20160404supp2/` (15 tables + ReadMe) | Supplementary material to Stephenson, Morrison & Hohenkerk (2016), *Proc. R. Soc. A* **472**:20160404, doi:10.1098/rspa.2016.0404. The tables are an extract of the IOTA Lunar Occultation Archive VI/132B (Herald & Gault, 2010–2012) held by CDS Strasbourg — see `ReadMe-extract.txt`. | **CC BY 4.0** — the article is open access, so the supplementary material is redistributable with attribution. The underlying CDS/VizieR catalogue is separately open for scientific use. |

### Public domain

| file | note |
|---|---|
| `tycho-mars-raw.csv` | Tycho Brahe's Mars observations, 1582–1600. The observations are long out of copyright; the `Volume`/`Page` columns record the printed edition transcribed from. |

### Generated here, not third-party

Listed so their absence from the sections above is not read as an omission.

| file | produced by |
|---|---|
| `01-holistic-year-objects-data.xlsx` | The Step 3 browser export (simulator → SheetJS workbook; `tools/fit/README.md` pipeline) — the ML-training observation workbook read by `fit_perihelion_harmonics.py` / `train_precession_physical.py` / `eval_precession_physical.py`. Gitignored at 319 MB; regenerate via the browser export before running Phase-2 pipeline steps. |
| `insolation-features.csv` | `scripts/extract_insolation_features.js` |
| `02-solar-measurements.csv` | `tools/fit/export-solar-measurements.js` — gitignored, ~2 h 24 m to rebuild |
| `nbody_cache_10myr.npz` | A REBOUND N-body integration of Sun + 8 planets, retained because **it has no working generator in this repo** and therefore could not otherwise be reproduced: WHFast symplectic integrator, dt = 5 days (< 1/20 of Mercury's period), 10 Myr forward, osculating elements written every 1,000 yr (10,001 samples: `times` + `ecc_/inc_/sma_` per planet). Read by `scripts/l1_vs_laskar_eigenmodes.py` and `scripts/l1_vs_laskar_50myr.py`. The setup above is the provenance — an independent REBOUND run with these parameters reproduces equivalent data. |
| `nbody_cache_50myr_backward.npz` | `scripts/nbody_50myr_backward.py` (requires `rebound`) — **not committed and not present**; regenerate before running `scripts/l1_vs_laskar_50myr.py`, which needs both caches |
| `paleo-validation-anchors.json` | Hand-assembled for the Phase-19 validation dossier: published paleo-rotation and Earth–Moon measurements (Wells 1963 via Arbab 2001, de Winter 2020, Pannella 1972, Williams 2000, Mitchell–Kirscher 2023, Wu et al. 2024, Patterson 1956) transcribed with full citation from the docs/99 validation tables. Observed values are published scientific measurements — facts, reproduced with citation; model predictions are NOT stored, they are recomputed live by the consumer, `tools/verify/paleo-anchors.js` (gate class). |
| `*.json` results under `data/` | the analysis scripts that name them; each records its generating script in a `meta` block |

### Lunar series — `data/lunar-series/` (55 files, 11 MB)

| part | source | redistribution |
|---|---|---|
| `elp2000-82b/ELP1..ELP36` | IMCCE public archive. Chapront-Touzé, M. & Chapront, J. (1983) *A&A* **124**, 50; revised (1988) *A&A* **190**, 342. | No stated terms, same position as LA2004 below. Transcription verified against the primary files — see the folder README. |
| `elp-mpp02/` series + `driver/ElpMpp02.{cpp,h}` | Chapront, J. & Francou, G. (2003) *A&A* **404**, 735, obtained via `ytliu0/ElpMpp02` | **GPL-3.0 — redistribution is explicitly granted.** |

The GPL half is worth stating plainly, because "third-party licensed" reads as a
risk and here it is the opposite: **the GPL exists to grant redistribution.** The
conditions are that notices are preserved and the combined work is compatibly
licensed — both hold (`NOTICE`; AGPL-3.0 combines under GPLv3 §13). This is the
inverse of SILSO, whose non-commercial term *withholds* a right we would need to
pass on.

Per-file provenance and the verification method are in
`data/lunar-series/README.md`.

---

## Tracked — no explicit licence, retained on a documented basis

One dataset, and the source attaches no terms to it at all. Retained because the
practical basis is strong — but the absence of a written grant is recorded here
rather than glossed over.

| file | source | basis for retention |
|---|---|---|
| `la2004-earth-51myr-back.asc` | Laskar et al. (2004), IMCCE. Nominal solution, −51 Myr to 0; columns match `INSOLN.LA2004.BTL.ASC` (time in kyr from J2000, eccentricity, obliquity in rad, longitude of perihelion in rad) | The IMCCE README for the LA2004 files states **no terms of use, licence or citation requirement** of any kind. IMCCE publishes them for open download and they are universally redistributed in the paleoclimate literature. Astronomical solution data is factual output rather than creative expression. |

**"No stated licence" is not the same as "public domain",** and writing down which
one is being relied on is the point of this section. If it ever needs to be
unambiguous — a journal requirement, or commercial use — a short written
confirmation from IMCCE would settle it.

The ELP-2000/82B files under `lunar-series/` sit in the same position and are
noted there rather than duplicated here.

---

## Not tracked — use permitted, redistribution not

Present locally, gitignored, **not** shipped. Both are freely downloadable; what
we lack is the right to ship a copy.

### SILSO sunspot numbers — CC BY-NC 4.0

    data/silso-monthly-sunspot.csv

WDC-SILSO, Royal Observatory of Belgium, Brussels.
International Sunspot Number (SN) Version 2, DOI 10.24414/qnza-ac80 (CC-BY-NC).

The **NC** term is the problem. This repository is AGPL-3.0, which grants every
downstream user the right to use the software commercially. We cannot pass on a
right to the bundled data that we do not hold, so shipping a CC BY-NC dataset
inside an AGPL repository is contradictory even where our own use is
non-commercial.

Download: <https://www.sidc.be/SILSO/datafiles> — monthly mean total sunspot
number, CSV. Save to the path above.

Used by `scripts/solar_8H_lattice_test.py`. The derived result
(`data/solar-8H-lattice-test.json`) remains tracked: computed statistics are not
the licensed dataset.

### Snyder (2016) source data — © Springer Nature

    data/Snyder 2016-Paleoceanography-Full Data Set.xlsx
    data/Snyder_Data_Figures/                              (11 files, 20.6 MB)

Snyder, C. W. (2016), *Evolution of global temperature over the past two million
years*, Nature **538**, 226–228, doi:10.1038/nature19798.

The article is subscription-access, so the supplementary source data is not
released under an open licence. Availability from the author's website is not a
grant of redistribution rights.

Download: <http://carolynsnyder.com/publications.php>. Preserve the filenames
above.

Used by `scripts/climate_ecs_boron.py`, `climate_ecs_cross_proxy.py`,
`climate_ecs_full_forcing.py`, `climate_ecs_monte_carlo.py`,
`climate_ecs_per_regime.py`, `climate_ecs_snyder.py`, `climate_ecs_tight.py`.

---

## Removed as unused

`rahmstorf-2015-amoc-index.txt` (AMOC index, Rahmstorf et al. 2015) was
downloaded but never referenced by any script or document. Removed from the
repository rather than resolved: there is no reason to hold rights to a file
nothing uses. It remains on local disk.

## Maintenance

Adding a dataset to `data/` means adding a row here first. If the redistribution
right is unclear, gitignore it and write the download step — that costs a
reviewer one command and costs us nothing.
