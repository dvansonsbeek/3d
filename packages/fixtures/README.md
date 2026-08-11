# @essrt/fixtures — golden masters

Two tiers. They answer different questions, and conflating them is what makes a
strangler-fig migration untrustworthy.

| tier | what it is | expected state | breaking it means |
|---|---|---|---|
| `regression/` | what the tree does **today** | **green, always** | your extraction changed behaviour — stop |
| `targets/` | what attempt 1 **achieved**, on a tree that no longer exists | **red** | nothing; they go green as Phases 6–7 land |

Encoding targets as regression fixtures would give a suite that is red from day
one and can therefore never distinguish a broken extraction from unfinished
work. That distinction is the whole point of this package.

## regression/ — freeze today

- `tools-lib.json` — the Node engine: `H` and `LOD` at −5/−1/0/+1/+5 Ma, the ΔT
  stack at J2000, and the anchors. Recorded from `tools/lib`, which is already
  referentially transparent.
- `script-js.json` — the browser monolith: `f(Y)` over a year grid, read through
  the `window.__test__` surface. This is the tier that matters for **Phase 8**,
  which dissolves `src/script.js`; without it, "the extraction changed nothing"
  is unverifiable for ~64,700 lines.

Re-record only when a change to behaviour is **intended**, and say so in the
commit message:

```sh
node tools/fixtures/record-tools-lib.mjs --write
npm run build && node test/browser/snapshot.test.mjs --write
```

A re-record with no explanation is indistinguishable from silently accepting a
regression.

## targets/ — attempt-1 acceptance values

`attempt1.json`. Sources in `~/holistic-archive/2026-08-01-attempt1/`, whose
three harnesses are **specifications, not runnable seeds**: `runtime-check.js`
throws on a missing attempt-1 key, `integral-truth.js` returns `NaN` for its
comparison column (`DT._cumulIntegralAtYear` is gone), and only `yearlen-check.js`
still runs — which is how the 16× year-length gap was found.

## The trap this package exists to avoid

`Verify at J2000: 0.0000″` is a **tautology**, not validation — it re-evaluates
at the anchor it was derived from. It read clean while a shipped formula was
0.2247″ off across 335,318 rows. Fixtures here record values **away** from the
anchor for that reason.
