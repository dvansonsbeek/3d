---
name: provenance-reproducibility
description: Use when adding a dataset, publishing a number, writing a constant into a document, versioning a release, or answering "where did this value come from". Covers version pinning, the constants hash, dataset manifests, and the distinction between a right to USE data and a right to REDISTRIBUTE it.
---

# Provenance and reproducibility — every number traceable

The claim this project makes is that its results are independently reproducible.
That is only true if every number can be traced to a source and a version.

## 1. One version scheme across code, coefficients, docs, paper and site

The same identifiers the API returns:

```
modelVersion       v11.0   MAJOR = structural (a law, a divisor, H)
                           MINOR = refit (coefficients move, structure does not)
coefficientsHash   sha256 over ALL embedded coefficient sources —
                   fitted-coefficients.json + the Meeus lunar tables +
                   climate-formula-coefficients.json, labels included
```

**The hash covers more than `fitted-coefficients.json`** — measured 2026-08:
editing a display *label* in the climate coefficients moved the hash and CI
correctly failed the push as a stale generated module. Any edit to any of the
three coefficient sources requires `generate.mjs --write` plus the restamp
cascade, and the full `npm run check` locally before pushing.

A response, a document and a paper figure that quote the same `modelVersion` and
`coefficientsHash` must produce the same numbers. If they cannot, the version
scheme is decorative.

**The paper pins a version permanently, and that pin must stay servable.** A
reader fetches `?version=v7.2` and reproduces every number in it. Doc versioning
and API versioning are one mechanism, not two.

## 2. Numbers in documents are generated, never typed

`{constants.H}`, not `335317`.

A typed constant is correct on the day it is written and silently wrong after the
next refit. CI forbids bare constant literals in `current` docs.

Document status governs the check:

| status | rule |
|---|---|
| **current** | must track HEAD; CI fails on stale numbers |
| **historical** | research records freeze; **exempt** from the freshness check |
| **superseded** | kept for provenance; links forward |

The exemption matters. A research record that says what was believed at the time
is *supposed* to hold old numbers — forcing it to update destroys the record.

## 3. Derived artefacts: the recipe is the artefact

`data/02-solar-measurements.csv` is 2,011,909 rows and 166 MB — the model's own
output, deterministic given the constants. It is gitignored.

That is the right call: the reproducibility artefact is
`export-solar-measurements.js` **plus** the constants, both public. Committing
the output would commit a 2 h 24 m cache.

Rule: if an artefact is derived and the generator is public, ship the generator
and a small committed fixture subset for CI — not the artefact.

## 4. Provenance fields must be relative

A generated artefact recording `"script": "/home/<user>/code/3d/scripts/x.py"`
leaks a path nobody else has and tells a reader nothing. Emit the bare filename
(or a repo-relative path for data files).

Ten generators already did this correctly and nine did not; the inconsistency
survived because nobody compared them — until `check:data` Rule 4 (fail-proven)
started rejecting machine-absolute paths in any tracked JSON, which immediately
caught nine fossil artifacts whose generators had long been fixed.

## 5. Use and redistribute are different rights

The distinction that governs `data/`:

> A dataset can be freely downloadable and still not be licensed for you to ship
> a copy inside your repository.

Two live examples from the audit:

| dataset | why it is not redistributed |
|---|---|
| **SILSO** sunspot numbers | CC BY-NC 4.0. The **NC** term cannot be reconciled with the commercial rights AGPL-3.0 grants downstream — we cannot pass on a right we do not hold. |
| **Snyder (2016)** source data | *Nature* 538 is subscription-access; the supplementary data is © Springer Nature. Availability from the author's site is not a grant. |

Both are gitignored with a documented download step. Neither is a model
dependency, so nothing breaks.

**Adding a dataset means adding a row to `data/PROVENANCE.md` first.** If the
redistribution right is unclear, gitignore it and write the download step — that
costs a reviewer one command and costs us nothing.

Also record the honest cases: Laskar LA2004 carries **no terms of use at all**
from IMCCE. "No stated licence" is not the same as "public domain", and writing
down which one you are relying on is the point.

## 6. Attribution has to be where people look

`elp-mpp02.js` is a GPL-3.0 port of `ytliu0/ElpMpp02`. It was credited in the
file header and in `data/lunar-series/README.md` — and absent from `NOTICE` and
`README`, the two places anyone actually checks.

Credited in a place nobody reads is not credited. Each distributing surface needs
it: repository, site, bundle, paper, source header, and the running UI.

## 7. Each layer needs its own audit pass

Three audits found three different things, and no single pass would have caught
all of them:

| layer | what hid there |
|---|---|
| vendored code | ElpMpp02, GPL-3.0, visible only in a file header |
| bundled data | SILSO's non-commercial clause |
| declared dependencies | `rebound` (GPL) behind a single `import` |

`package.json`, `requirements.txt`, `node_modules`, `data/`, and ported source
are five separate surfaces. Auditing one says nothing about the others.

## Checklist

- Does this number carry a `modelVersion` and `coefficientsHash`?
- Is it generated into the doc, or typed?
- If the artefact is derived — is the generator public and the artefact ignored?
- Are provenance fields relative, not absolute paths?
- New dataset: manifest row written, redistribution right recorded?
- New dependency or ported code: credited in `NOTICE` and `README`, not only in a header?
