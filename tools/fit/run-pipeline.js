#!/usr/bin/env node
/**
 * 9-3g: the pipeline orchestrator lives in @hum/fitting
 * (packages/fitting/src/run-pipeline.cjs). Shim keeps the documented CLI
 * path; argv passes through unchanged. Its step cmds keep spawning the
 * tools/fit/*.js paths — which are now these one-line shims — so the
 * documented pipeline steps stay valid end to end.
 */

require('../../packages/fitting/src/run-pipeline.cjs');
