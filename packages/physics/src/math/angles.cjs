/**
 * Angles — ONE home for the degree ↔ radian constants and the wraps
 * (holisticuniverse plan 13 B1). Before B1 the browser carried 27 local
 * `D2R`-style constants and twelve local wrap helpers in three ±180 forms;
 * the package itself a dozen private `D2R`s.
 *
 * The two ±180 forms in use differ only AT the boundary: `wrap180` maps
 * +180 to −180 (the half-open [−180, 180) the longitude-difference sites
 * use), `wrap180Closed` keeps +180 (the (−180, 180] of the residual
 * printers). A site keeps the form it had — B1 moves the formula, never
 * the convention.
 *
 * Pure, no model dependencies.
 */

'use strict';

/** π/180 — degrees to radians. */
const DEG2RAD = Math.PI / 180;
/** 180/π — radians to degrees. */
const RAD2DEG = 180 / Math.PI;
/** Arcseconds in a full turn. */
const ARCSEC_PER_TURN = 1296000;
/** Arcseconds per radian, 206264.806…  */
const ARCSEC_PER_RAD = (180 / Math.PI) * 3600;

/** @param {number} x degrees @returns {number} the same angle in [0, 360) */
const wrap360 = (x) => ((x % 360) + 360) % 360;
/** @param {number} x degrees @returns {number} the same angle in [−180, 180) */
const wrap180 = (x) => ((x + 540) % 360 + 360) % 360 - 180;
/** @param {number} x degrees @returns {number} the same angle in (−180, 180] */
const wrap180Closed = (x) => { const w = ((x % 360) + 360) % 360; return w > 180 ? w - 360 : w; };
/** @param {number} x radians @returns {number} the same angle in [0, 2π) */
const wrap2pi = (x) => { const tau = 2 * Math.PI; return ((x % tau) + tau) % tau; };
/** @param {number} x radians @returns {number} the same angle in [−π, π) */
const wrapPi = (x) => { const tau = 2 * Math.PI; return ((x + Math.PI) % tau + tau) % tau - Math.PI; };

module.exports = { DEG2RAD, RAD2DEG, ARCSEC_PER_TURN, ARCSEC_PER_RAD, wrap360, wrap180, wrap180Closed, wrap2pi, wrapPi };
