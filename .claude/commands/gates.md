---
description: Run the model's verification gates and report pass/fail
---

Run the model gates and report the result as a table.

## What to run

```bash
npm run test:verify:list     # the classification: which scripts can fail, which write artifacts
npm run test:verify          # the gates (seconds each; scene-year-lengths ~1 min)
```

`tools/verify/` holds gates and generators only — every script there either
fails or writes. The suite runs the gates (`class: 'gate'` in
`tools/verify/run-suite.mjs`) and FAILS on an unclassified script. The
generators (`--write`) rewrite tracked `data/*.json` and must never run as
tests; `npm run regen:cascade` prints which of them are stale and in what
order. If the user passes `full`, run `npm run test:verify -- --all`, which adds
the slow gate(s).

## How to report

One row per gate: name, pass/fail, and the key number it printed. Do not paste
raw output. A script that errors is a FAIL to report, not a script to skip.

## Important

- These gates are part of `npm run check` (`test:verify`); this command runs
  them alone for a quick read.
- The paleo-anchors gate fails on an unexplained *improvement* too — report a
  "better" number as a failure to explain, not as good news.
- The exploratory and narrative scripts (the ascending-node derivations, the
  historical RMS comparison, the Moon ΔT comparison) live in `tools/explore/`;
  they print, never fail, and are not gates.
