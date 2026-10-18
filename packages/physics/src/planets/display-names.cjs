/**
 * PLANET_DISPLAY_NAMES — the seven chain planets' presentation names, keyed
 * by the model's planet key (plan 11 step 6).
 *
 * The one leaf `public/input/model-parameters.json` still carried when the
 * file was deleted. A display name is presentation, not a model parameter:
 * not injectable, not hashed, not a degree of freedom — so it is code, not an
 * input. ONE home here: the Node constants (`tools/lib/constants.js`
 * `C.planets[key].name`), the package model (`model.planets.record(key).name`,
 * which the API, the MCP server and the website serve) and the Python bridge
 * (through the Node constants dump) all read it from this map.
 *
 * The key set is also the chain's planet list — every runtime iterates the
 * seven planets in this order.
 */

'use strict';

/** @type {Readonly<Record<string, string>>} */
const PLANET_DISPLAY_NAMES = Object.freeze({
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
});

module.exports = { PLANET_DISPLAY_NAMES };
