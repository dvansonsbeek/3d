#!/usr/bin/env node
/**
 * 9-3b: the pipeline verifier lives in @hum/fitting
 * (packages/fitting/src/verify-pipeline.cjs). This shim keeps the
 * documented CLI path working — including `--write` for the deliberate
 * RMS-baseline re-record; process.argv passes through unchanged.
 */

require('../../packages/fitting/src/verify-pipeline.cjs');
