#!/usr/bin/env node
/**
 * Plan 12: the regime-aware recession fitter — the governed instrument —
 * lives in @essrt/fitting (packages/fitting/src/fit-regime-recession.cjs).
 * Shim keeps the documented CLI path; argv passes through unchanged.
 * (tools/explore/fit-regime-recession.js is the frozen 2026-08-14 record.)
 */

require('../../packages/fitting/src/fit-regime-recession.cjs');
