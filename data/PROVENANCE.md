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
| `lr04-stack.txt` | Lisiecki & Raymo (2005) | freely distributed, citation requested (stated in file) |
| `kiani-shahvandi2024-lod-residual.txt` | Kiani Shahvandi et al. (2024) — LOD residual | citation requested |

### Public domain

| file | note |
|---|---|
| `tycho-mars-raw.csv` | Tycho Brahe's Mars observations, 1582–1600. The observations are long out of copyright; the `Volume`/`Page` columns record the printed edition transcribed from. |

### Generated here, not third-party

Listed so their absence from the sections above is not read as an omission.

| file | produced by |
|---|---|
| `insolation-features.csv` | `scripts/extract_insolation_features.js` |
| `02-solar-measurements.csv` | `tools/fit/export-solar-measurements.js` — gitignored, ~2 h 24 m to rebuild |
| `*.json` results under `data/` | the analysis scripts that name them; each records its generating script in a `meta` block |

### Lunar series

See `data/lunar-series/README.md` for per-file provenance and the verification
against the IMCCE primary files. Summary: ELP-2000/82B from the IMCCE public
archive; ELP/MPP02 series and driver via `ytliu0/ElpMpp02` (GPL-3.0). Both are
recorded in the repository `NOTICE`.

---

## Tracked — attribution recorded, rights to be confirmed

Retained because the basis for redistribution is good but not documented in
writing by the source. To be confirmed; any that cannot be will move to the
section below.

| file(s) | source | basis |
|---|---|---|
| `la2004-earth-51myr-back.asc` | Laskar et al. (2004), IMCCE | IMCCE distributes the LA2004 solutions publicly for scientific use |
| `rspa20160404supp2/` (15 tables) | Extract of the IOTA Lunar Occultation Archive VI/132B (Herald & Gault, 2010–2012), held by CDS Strasbourg; published as supplementary material to Stephenson, Morrison & Hohenkerk (2016), *Proc. R. Soc. A* — see `ReadMe-extract.txt` | CDS/VizieR catalogues are openly available for scientific use; the extract is a derived subset |
| `cenco2pip-100kyr-bayesian.csv` | CenCO2PIP consortium | community consortium data product |
| `delavega-2020-boron-co2.xlsx` | de la Vega et al. (2020) | supplementary data |
| `rahmstorf-2015-amoc-index.txt` | Rahmstorf et al. (2015) | AMOC index |

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

## Maintenance

Adding a dataset to `data/` means adding a row here first. If the redistribution
right is unclear, gitignore it and write the download step — that costs a
reviewer one command and costs us nothing.
