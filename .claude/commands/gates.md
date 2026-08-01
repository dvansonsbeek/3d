---
description: Run the model's verification gates and report pass/fail
---

Run the standalone verification scripts and report the result as a table.

## What to run

These five are standalone — no CSV, no network, seconds each:

```bash
node tools/verify/verify-laws.js
node tools/verify/epoch-independence.js
node tools/verify/config1-proof.js
node tools/verify/eccentricity-balance.js
node tools/verify/measure-rms-by-epoch.js
```

If the user passes `full` as an argument, also run the remaining 12 in
`tools/verify/` — several are slow and some need
`data/02-solar-measurements.csv` (166 MB, gitignored) or network access to JPL.
Say which were skipped and why rather than silently omitting them.

## How to report

One row per script: name, pass/fail, and the key number it produced. Do not
paste raw output — extract the figures that matter and compare them against the
reference values below.

## Reference values

| check | expected |
|---|---|
| Law 4 — eccentricity amplitude K | 3.4143e-6 (all 8 planets) |
| Law 5 — eccentricity balance | 99.8636% (use **base** ecc, not J2000) |
| Saturn Law 5 | 0.05371910, err −0.272% |

Balance percentages come from `data/balance-presets.json` `currentConfig` —
that file reports `count: 767`, `allPassCount: 0`, `currentConfig.rank: 4`.

## Important

- These are **not** a test suite. They are 17 manual scripts that encode real
  gates but are not automated, not in CI, and have no shared harness.
  Converting them into one is Phase 4 of `docs/hidden/IP-unified-architecture.md`.
- `epoch-independence.js` tests **eccentricity-balance** epoch independence. It
  is *not* the referential-transparency gate (`f(Y)` invariant to scene epoch),
  which does not exist yet and currently **fails**. Do not conflate them.
- A script that errors is a FAIL to report, not a script to skip.
