/** π/180 — degrees to radians. */
export const DEG2RAD: number;
/** 180/π — radians to degrees. */
export const RAD2DEG: number;
/** Arcseconds in a full turn. */
export const ARCSEC_PER_TURN: 1296000;
/** Arcseconds per radian, 206264.806…  */
export const ARCSEC_PER_RAD: number;
/** @param {number} x degrees @returns {number} the same angle in [0, 360) */
export function wrap360(x: number): number;
/** @param {number} x degrees @returns {number} the same angle in [−180, 180) */
export function wrap180(x: number): number;
/** @param {number} x degrees @returns {number} the same angle in (−180, 180] */
export function wrap180Closed(x: number): number;
/** @param {number} x radians @returns {number} the same angle in [0, 2π) */
export function wrap2pi(x: number): number;
/** @param {number} x radians @returns {number} the same angle in [−π, π) */
export function wrapPi(x: number): number;
