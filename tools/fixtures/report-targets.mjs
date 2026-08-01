/**
 * Report attempt-1 target status (plan §5a).
 *
 * NOT a gate. These are expected red — they record what attempt 1 achieved on a
 * tree that no longer exists, and they go green as Phases 6-7 land. Wiring them
 * into CI as failures would give a permanently red suite that can never say
 * "your extraction broke something", which is the exact confusion the two-tier
 * split exists to prevent.
 *
 * Exits 0 always. Read it; do not assert on it.
 */
import { attempt1Targets } from '../../packages/fixtures/src/index.js';

const targets = attempt1Targets();

console.log('ATTEMPT-1 TARGETS — expected red; this is a tracker, not a gate');
console.log('='.repeat(78));

const byPhase = new Map();
for (const t of targets) {
  const p = t.unblockedByPhase ?? 'none';
  if (!byPhase.has(p)) byPhase.set(p, []);
  byPhase.get(p).push(t);
}

const order = [...byPhase.keys()].sort((a, b) =>
  (a === 'none' ? 99 : a) - (b === 'none' ? 99 : b));

for (const phase of order) {
  console.log(`\n  unblocked by Phase ${phase}:`);
  for (const t of byPhase.get(phase)) {
    const state = t.measurable ? 'MEASURABLE' : 'not measurable';
    console.log(`    ${t.id.padEnd(28)} ${state}`);
    console.log(`      ${t.description}`);
    console.log(`      target : ${JSON.stringify(t.target)}`);
    if (t.current) console.log(`      current: ${JSON.stringify(t.current)}`);
    if (t.blockedBy) console.log(`      blocked: ${t.blockedBy}`);
  }
}

const measurable = targets.filter((t) => t.measurable);
console.log(`\n${'='.repeat(78)}`);
console.log(`  ${targets.length} targets · ${measurable.length} measurable today · ${targets.length - measurable.length} blocked`);
console.log('  None of these gate CI. They are the "not finished yet" list.');
