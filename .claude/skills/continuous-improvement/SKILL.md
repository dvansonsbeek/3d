---
name: continuous-improvement
description: Use immediately after a correction — a user pointing out an error, a regression, a gate going red, or a rule that was written down and then skipped anyway. Turns a one-off fix into a rule change, or decides deliberately that it should not. Adapted from the L-GEVITY continuous-improvement protocol.
---

# Continuous improvement — make the correction stick

A fixed bug is worth one bug. A fixed *rule* is worth every future instance.
This runs after the fix, not instead of it.

## 1. Triggers — when to run this at all

| trigger | example from this project |
|---|---|
| **User correction** | " textures" left outside the link; the Tychosium credit too prominent |
| **Regression** | a fix turned an unrelated gate red — the cancelling rectangle/integral pair |
| **Stale value shipped** | `86399.99967739309` propagated from a pre-refit artefact into memory, a reference doc and a skill |
| **New pattern established** | the two-repo symlink decision |
| **Systematic failure** | the greedy-write trap present in **all three** fitters |
| **A written rule was skipped anyway** | edit discipline, documented three times and still bypassed |

The last one is the most important and the easiest to rationalise away.

## 2. Root cause — which of these four?

Be honest; the fix differs completely.

| cause | meaning | the fix |
|---|---|---|
| **Missing / ambiguous** | no rule covered this, or it could be read two ways | write or sharpen the rule |
| **Conflict** | two rules pointed different directions | remove one; conflicting guidance is why guidance gets ignored |
| **Ignored** | the rule was clear and got skipped anyway | **prose will not fix this — make it mechanical** |
| **Technical constraint** | the rule is right but impossible to follow here | record the exception with its reason |

> **"Ignored" almost never means the wording was bad.** Edit discipline was
> stated in `CLAUDE.md`, in memory, and in the plan, and was still bypassed. What
> fixed it was `block-batch-edits.py` — a hook that refuses. If a rule has been
> skipped twice, stop rewriting it and encode it as a check.

This is L-GEVITY's **E gate**: *can the rule be encoded as a check?* A rule in
prose is advice. A rule in CI is a boundary.

## 3. Update — shrink, don't grow

| rule | |
|---|---|
| **Minimal wording** | the shortest form that is unambiguous |
| **Shrink, don't grow** | prefer replacing a paragraph over appending one; a skill that only grows stops being read |
| **Anti-patterns** | show the wrong form next to the right one — the wrong form is what gets recognised in the wild |
| **Zero redundancy** | one fact, one home. Two copies drift — demonstrated by the two reference files, and by the LOD constant that reached three files |
| **Code > docs** | a lint rule, a build assertion or a hook beats any amount of writing |
| **Actionable** | a reader must be able to tell whether they are currently violating it |

Attach the **cost**. `numerical-methods` says "3.3 d at −302 kyr", not "can cause
drift". Numbers are what make a rule survive the next deadline.

## 4. Verify, and say what changed

- **Verify** — re-run the thing that failed. For a rendered artefact, look at the
  render, not the diff: the ` textures` bug and the brightness imbalance were
  both invisible in source and obvious on screen.
- **Notify** — state which rule changed and why. A silent rule change is
  indistinguishable from drift.

## 5. When NOT to make a rule

Not every correction deserves one. Skip it when:

- it was a one-off typo with no class behind it
- the rule would fire so often it becomes noise
- an existing rule already covers it — the failure was in applying it, which
  means the answer is §2's "ignored" branch, not a new rule

**A skill that accumulates every past mistake stops being read.** Adding a rule
has a cost, paid by every future reader.

## Worked example

> **Trigger** — stale constant `86399.99967739309` shipped in a new skill.
> **Root cause** — *missing*: no rule said "confirm constants from code, not from
> memory or a document".
> **Update** — added to `units-and-frames` with the derivation and the correct
> value, plus a one-line pointer in `provenance-reproducibility`. The wrong value
> was kept as the worked example, because the failure mode is more instructive
> than the number.
> **Verify** — three code paths agreed; the stale figure was traced to a
> pre-refit artefact and removed from the reference doc and memory too.
