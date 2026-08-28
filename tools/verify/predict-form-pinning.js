#!/usr/bin/env node
/**
 * PREDICT SCALAR-FORM PINNING GATE (§12g item 3)
 * ===============================================
 *
 * The predictive-precession feature basis is shared (@essrt/physics/planets/
 * predict), but the Earth scalars are a documented DUAL quantity: the Node
 * engine wires the J2000-anchored forms — the form the shipped
 * PREDICT_COEFFS were TRAINED against (verified in
 * tools/lib/python/predictive_formula_physical.py) — while the browser
 * injects the deep-time epoch-aware forms. Harmless today (values are
 * display-only; measured divergence ~5e-8 ″/cy at the 2000 anchor,
 * ~1e-5 ″/cy at ±100 yr — three-plus orders below the 0.01 ″/cy display
 * precision). THE TRAP ARMS if predict is ever refit or promoted to
 * scene-consumed with the wrong scalar form — the ~1162-minute-class
 * coefficients/runtime mismatch. This gate pins both paths:
 *
 *   1. MATCHED-PAIR PIN: the Node (trained-form) fluctuation at the
 *      reference epochs must equal the recorded fixture to 1e-9 ″/cy.
 *      A retrain, a coefficient edit, or a scalar-form change on the Node
 *      side trips this — forcing a conscious --write re-record.
 *   2. DUAL-FORM BOUND: the browser-form mirror (the §12h parity-proven
 *      wiring in tools/docs/model-values.mjs, which the website parity
 *      harness separately pins to the site) must stay within the
 *      documented envelope of the trained form: ≤ 1e-6 ″/cy at the 2000
 *      anchor, ≤ 5e-5 ″/cy at ±100 yr. A silent scalar-form change on
 *      either side blows the bound by orders of magnitude.
 *
 *   node tools/verify/predict-form-pinning.js            # gate (exit 1 on drift)
 *   node tools/verify/predict-form-pinning.js --write    # re-record the fixture
 *                                                        # (ONLY after a conscious retrain)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(ROOT, 'packages', 'fixtures', 'regression', 'predict-form.json');
const WRITE = process.argv.includes('--write');

const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const EPOCHS = [1900, 1950, 2000, 2050, 2100];
const PIN_TOL = 1e-9;            // ″/cy — trained form vs fixture
const ANCHOR_BOUND = 1e-6;       // ″/cy — dual-form delta at 2000.
const SPAN_BOUND = 5e-5;         // ″/cy — dual-form delta at ±100 yr

async function main() {
  const OE = require(path.join(ROOT, 'tools', 'lib', 'orbital-engine.js'));
  const { _predictiveMachineryForGate } = await import(
    path.join(ROOT, 'tools', 'docs', 'model-values.mjs'));
  const browser = _predictiveMachineryForGate();

  const values = {};
  const deltas = {};
  for (const y of EPOCHS) {
    for (const p of PLANETS) {
      const nodeF = OE.predictPrecessionFluctuation(y, p);
      values[`${p}@${y}`] = nodeF;
      deltas[`${p}@${y}`] = browser.fluct(y, p) - nodeF;
    }
  }

  if (WRITE) {
    fs.writeFileSync(FIXTURE, JSON.stringify({
      _comment: 'TRAINED-FORM predict fluctuations (Node J2000-anchored scalars) at the reference epochs — the matched pair of PREDICT_COEFFS and their training form. Re-record ONLY after a conscious retrain: node tools/verify/predict-form-pinning.js --write',
      values,
    }, null, 2) + '\n');
    console.log(`✓ recorded ${Object.keys(values).length} trained-form values -> ${path.relative(ROOT, FIXTURE)}`);
    return;
  }

  if (!fs.existsSync(FIXTURE)) {
    console.error('FAIL — fixture missing. Record it: node tools/verify/predict-form-pinning.js --write');
    process.exit(1);
  }
  const recorded = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).values;

  const failures = [];
  for (const key of Object.keys(values)) {
    if (!(key in recorded)) { failures.push(`${key}: not in fixture — re-record after a conscious retrain`); continue; }
    const drift = Math.abs(values[key] - recorded[key]);
    if (drift > PIN_TOL) {
      failures.push(`${key}: trained-form value drifted ${drift.toExponential(3)} ″/cy from the recorded pair (coeffs or Node scalar form changed — retrain/pin as a matched pair, then --write)`);
    }
    const year = Number(key.split('@')[1]);
    const bound = year === 2000 ? ANCHOR_BOUND : SPAN_BOUND;
    if (Math.abs(deltas[key]) > bound) {
      failures.push(`${key}: dual-form delta ${deltas[key].toExponential(3)} ″/cy exceeds the ${bound} envelope (a scalar form changed on one side)`);
    }
  }

  const maxDelta = Math.max(...Object.values(deltas).map(Math.abs));
  console.log(`predict-form pinning — ${Object.keys(values).length} values (${PLANETS.length} planets × ${EPOCHS.length} epochs)`);
  console.log(`  trained form ≡ fixture (tol ${PIN_TOL} ″/cy) · max dual-form delta ${maxDelta.toExponential(3)} ″/cy`);
  if (failures.length) {
    for (const f of failures) console.error(`  FAIL ${f}`);
    console.error(`FAIL — ${failures.length} pin violation(s).`);
    process.exit(1);
  }
  console.log('PASS — coefficients and scalar form are a matched pair; the dual-form envelope holds.');
}

main().catch((e) => { console.error(e); process.exit(1); });
