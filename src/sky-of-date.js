/**
 * The sky of date — plan 28 §B/C/D/E (doc 111 §1.48).
 *
 * ONE home for the catalogue sky: the bright-star catalogue (public/input/stars.json v2 — Hipparcos-2
 * astrometry at the catalogue epoch, Gaia DR3 / Pulkovo radial velocities, the BSC designations, the
 * IAU names; written by tools/pipeline/import-star-catalogue.js), the constellation strokes keyed to
 * HIP ids (public/input/constellations.json v2), and the stars that ARRIVE (public/input/stars-gaia.bin
 * + .json — the Gaia DR3 six-dimensional stars within 1.5 kpc that ever reach V 8 within ±50 Myr,
 * written by tools/pipeline/import-gaia-neighbours.js, loaded after the catalogue), every one MOVED on
 * its Galactic orbit:
 *
 *   the second-order epicycle about each body's own guiding centre, the Sun on its own, in a cited local
 *   potential (ONE home @essrt/physics sky/galactic-orbits; the positions through sky-orbit-positions.js,
 *   computed in the orbit worker sky-orbits-worker.js off the main thread) — the direction r/|r| on the
 *   sky, the apparent magnitude V(t) = M + 5 log₁₀(d(t)/10 pc) in the shader.
 *
 * Inside ±1 Myr the orbit and the straight line agree to a fraction of a per cent; the referee of the era
 * (astropy's rigorous space motion, ERFA pmsafe — the gate test/browser/sky-of-date.test.mjs) is the line
 * on the INERTIAL velocity (the catalogue's observed rates through Stumpff's factors — the one home's
 * heliocentricGalacticState carries them) placed at the EMISSION instant, the apparent place; the scene
 * draws the GEOMETRIC place (where a star IS at the instant — a camera can fly to it) and is held to the
 * plan's 1″ / 10″ of the record's geometric place, the light-time term recorded beside it (doc 111 §1.48).
 * By 20 Myr a star's measured velocity error (~1 km/s, 20 pc) makes its direction uncertain by degrees:
 * the sky of date is statistically right, the real stars at roughly the right places and brightnesses —
 * not a star chart (the hover says so). A star is drawn while V(t) ≤ 8 (the shader's cut, so the arriving
 * stars brighten in and the leaving ones fade out) and while |t| is within its main-sequence lifetime from
 * its luminosity — a BAND: every star treated as mid-life. BIRTHS: when a star's lifetime is over, its
 * statistical twin takes its place as the next GENERATION of that luminosity (gen = ⌊|t|/τ⌋: a seeded place
 * at the star's Galactic latitude, fading in over the first tenth of its life and out over the last, the
 * place reseeded per generation) — the steady state of the population, an illustration said so in the
 * hover: 3,192 of the catalogue's 41,394 stars (620 naked-eye, the brightest of the sky) live under 60 Myr.
 * The catalogue regime ends at ±50 Myr; across 50–60 Myr the catalogue
 * hands over, STAR BY STAR (a seeded phase each; its statistical twin appears as it leaves), to the
 * STATISTICALLY EQUIVALENT sky of plan 28 §E: every catalogue star keeps its magnitude and its Galactic
 * latitude and takes a seeded longitude (one hash draw per cell, star and generation; the cell changes every
 * 100 Myr) — the same brightnesses and the same spread about the band, no shape and no name; drawn as a
 * child of the Milky Way dome, which turns with the Sun's Galactic orbit (once per 216 Myr, ONE home
 * sky/galactic-frame).
 *
 * The stars sit at their MEASURED distances (UNITS_PER_PC on the scene's 1 AU = 100), centred on the Sun
 * by the scene each frame, so zooming out passes Proxima and shows the neighbourhood as the 3-D cloud it
 * is; a sprite's size is the star's apparent magnitude at the camera. The Milky Way dome alone is a
 * backdrop at infinity (its group on the camera's position); the scene draws the sky in its own pass with
 * a far camera (script.js renderFrame), the depth cleared before the solar system.
 *
 * Recognisability: a constellation's shape is its stars' PAIRWISE angular separations (a rotation-
 * invariant description, so no best-fit rotation is needed); the RMS change of those separations since
 * the catalogue epoch fades its LINES from RMS 1° (full) to 5° (gone). A star keeps its NAME for as long
 * as it is drawn — the label's opacity is the star's own alpha (handover, V-8 visibility, lifetime).
 *
 * Frames: the catalogues are ICRS; the containers these objects sit in are aligned ONCE at init to the
 * J2000 equatorial frame through the world frame (the star-field rows of the perihelion-at-sun gate),
 * so a star's local coordinates are x = cos δ sin α, y = sin δ, z = cos δ cos α. Every position is pure
 * in the ENGINE year (TT, Julian from J2000): the named tier is recomputed when that year moves a whole
 * year (the sky moves ≤ 10″/yr), the arriving tier every thousand years (0.7′ at 100 pc); the worker
 * answers asynchronously, one request in flight, the latest year winning.
 */

/* global document, console, setTimeout, clearTimeout */
import { SUN_GALACTIC_ORBIT, LOCAL_GALACTIC_KINEMATICS, ORBIT_INTEGRATION, orbitElements, heliocentricGalacticState, galactocentricState, integratedStateAtYear, galacticTriadEquatorialJ2000, mainSequenceLifetimeYears, milkyWayLatitudeShiftDegAtYear, sunHeightPcAtYear } from '@essrt/physics';
import { fillLocalPositionsIntegrated, integratedSet, localOfGalactic } from './sky-orbit-positions.js';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
/** The scene's units per parsec: 1 AU = 100 units (the scene's rule), 1 pc = 206,264.806 AU. The stars sit at their measured distances. */
export const UNITS_PER_PC = 206264.806 * 100;

export const SKY_CONSTANTS = Object.freeze({
  catalogueRegimeYears: LOCAL_GALACTIC_KINEMATICS.catalogueRegimeYears,   // the catalogue regime: |t − 2000| ≤ 50 Myr on the orbits (plan 28 §D; ONE home sky/galactic-orbits)
  regimeFadeYears: 1e7,          // the catalogue hands over to the statistical sky between 50 and 60 Myr
  handoverPhaseWidth: 0.05,      // each star hands over at its OWN seeded moment in the window (a smoothstep this wide in the fade), so the sky stays full
  recognisableRmsDeg: [1, 5],    // the lines and names fade between these RMS separation changes
  updateStepYears: 1,            // the named tier is recomputed when the engine year moves this much
  gaiaUpdateStepYears: 1000,     // the arriving tier: 1 kyr (a 20 km/s star at 100 pc moves 0.7′)
  nakedEyeV: 6.5,                // the named/lined tier; fainter stars are the background tier
  visibleVLimit: 8.0,            // a star is drawn while its apparent magnitude of date is within this (the shader's cut)
  visibleVFadeWidth: 0.5,        // … fading out over this much beyond it
  lifetimeFadeFraction: 0.1,     // a star fades over the last tenth of its main-sequence lifetime (a band)
  statisticalSeedCellYears: 1e8, // plan 28 §E: the statistical sky's seed changes every 100 Myr
  sunGalacticPeriodMyr: SUN_GALACTIC_ORBIT.periodMyr,   // the dome's turn (ONE home sky/galactic-frame)
  spriteReferencePixelRatio: 2,  // the base size is the look accepted on a ratio-2 display (50 device px = 25 CSS px); other ratios scale to the same on-screen size
  sunAbsMagV: 4.81,              // the Sun as a star: M_V (Willmer 2018, ApJS 236, 47) — seen from past the main camera's far plane
  sunBV: 0.65,                   // its colour (B−V, the same source)
});

/** mulberry32 — a small seeded PRNG: the statistical sky and the handover phases are reproducible per seed. @param {number} seed */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Ballesteros (2012, EPL 97, 34008): the colour temperature of a black body from B−V. @param {number} bv */
export function colourTemperatureKelvinFromBV(bv) {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

/** A colour temperature's RGB (Tanner Helland's fit of the black-body locus), as [r, g, b] in [0, 1]. @param {number} kelvin */
export function colorTemperature2rgb(kelvin) {
  const temperature = Math.min(40000, Math.max(1000, kelvin)) / 100.0;
  let red, green, blue;
  if (temperature < 66.0) red = 255;
  else { const t = temperature - 55.0; red = Math.min(Math.max(351.97690566805693 + 0.114206453784165 * t - 40.25366309332127 * Math.log(t), 0), 255); }
  if (temperature < 66.0) { const t = temperature - 2; green = -155.25485562709179 - 0.44596950469579133 * t + 104.49216199393888 * Math.log(t); }
  else { const t = temperature - 50.0; green = 325.4494125711974 + 0.07943456536662342 * t - 28.0852963507957 * Math.log(t); }
  green = Math.min(Math.max(green, 0), 255);
  if (temperature >= 66.0) blue = 255;
  else if (temperature <= 20.0) blue = 0;
  else { const t = temperature - 10; blue = Math.min(Math.max(-254.76935184120902 + 0.8274096064007395 * t + 115.67994401066147 * Math.log(t), 0), 255); }
  return [red / 255, green / 255, blue / 255];
}

/**
 * @param {object} deps
 * @param {any} deps.THREE
 * @param {any} deps.CSS2DObject
 * @param {(url: string) => Promise<any>} deps.fetchRepoJson
 * @param {(url: string) => Promise<ArrayBuffer | null>} deps.fetchRepoBytes  a repo-relative binary (the arriving stars)
 * @param {string} deps.starsUrl
 * @param {string} deps.constellationsUrl
 * @param {string} [deps.gaiaManifestUrl]  public/input/stars-gaia.json (absent: the sky runs on the Hipparcos catalogue alone)
 * @param {any} deps.starsGroup  the container the sprites and labels go in (aligned to the J2000 frame at init)
 * @param {any} deps.constellationsGroup  the container the lines go in
 * @param {(jdUT: number) => number} deps.engineYearOfJd  the ONE engine year (TT, Julian from J2000) of a scene instant
 * @param {any} deps.constellationMaterial  the asterism lines' LineDashedMaterial (cloned per constellation)
 * @param {any} deps.drawOnShaderProto  the curved layout's ShaderMaterial prototype (cloned per stroke; needs uOpacity)
 * @param {any[]} deps.drawMaterials  the array the draw-on animation walks
 * @param {() => void} [deps.onPositions]  called when positions of date have landed (the labels and a paused frame need a render)
 * @param {() => Worker | null} [deps.createWorker]  the orbit worker (null: positions are computed on the main thread)
 * @param {() => number} [deps.pixelRatio]  the renderer's pixel ratio — a sprite is sized in DEVICE pixels, so its on-screen
 *   size follows the ratio unless the base size does: the adaptive ratio (1 ↔ 2 on the frame rate) brightened and dimmed the whole sky
 * @param {() => {starDistance: number, starsizeBase: number, namesVisible: boolean, layout: string}} deps.settings
 */
export function createSkyOfDate(deps) {
  const { THREE, CSS2DObject, fetchRepoJson, fetchRepoBytes, starsUrl, constellationsUrl, gaiaManifestUrl, starsGroup, constellationsGroup, engineYearOfJd, constellationMaterial, drawOnShaderProto, drawMaterials, settings, dome, galacticTurnRadAtYear, galacticTriad, onPositions, createWorker, pixelRatio } = deps;
  const C = SKY_CONSTANTS;
  const TRIAD = galacticTriad || galacticTriadEquatorialJ2000();
  /** The dome's base pose (the Galactic alignment at J2000, handed in at creation or by setDomeBase) and its turn of date. */
  const domeBase = new THREE.Quaternion();
  let domeBaseSet = false;
  if (deps.domeBase) { domeBase.copy(deps.domeBase); domeBaseSet = true; }
  /** The statistical sky (plan 28 §E): a child of the dome (it turns with the band), rebuilt per seed cell. */
  const stat = { points: null, geo: null, mat: null, seedCell: null, opacity: 0 };

  /** @type {any} The Hipparcos catalogue's state. */
  const S = /** @type {any} */ ({ loaded: false, epochYear: 1991.25, n: 0, nNaked: 0, labels: [], strokes: [], groups: new Map(), strokeGroup: [], lineObjects: [], layout: settings().layout || 'asterism', year: NaN, regimeFade: 1, counts: null, textureReady: false, names: {} });
  /** @type {any} The arriving stars' state (plan 28 §D). */
  const G = /** @type {any} */ ({ loaded: false, loading: false, failed: null, n: 0, year: NaN, manifest: null, epochYear: 2016, pos: null, absMag: null, vmag0: null, geo: null, mat: null, points: null });
  /** The orbit worker: one request in flight, the latest year pending; the buffers ping-pong. */
  const W = /** @type {any} */ ({ worker: null, busy: false, pending: NaN, hipSpare: null, gaiaSpare: null, hipMs: 0, gaiaMs: 0, updates: 0 });

  // The sprite's size is the star's APPARENT magnitude at the camera: m = M + 5 log₁₀(d_cam / 10 pc) with
  // d_cam the star's distance from the camera (the stars sit at their measured distances, so approaching
  // Sirius brightens it); the size law is the §E magnitude tiers made continuous AT THEIR DRAWN SIZE —
  // the former shader attenuated its tiers (1.5 / 1.0 / 0.6 / 0.3 / 0.14 of the base) by 2500/depth,
  // 0.5 at the centre of view on the 5,000-unit sphere, so the drawn sizes were 0.75 / 0.5 / 0.3 /
  // 0.15 / 0.07 of the base: m −1.4 → 0.80, 0 → 0.66, 2 → 0.46, 4 → 0.26, ≥ 6 → 0.07 (the first 3-D
  // build carried the tiers WITHOUT the attenuation — the bright stars twice too large, "too bright").
  const starShader = (pointTexture) => new THREE.ShaderMaterial({
    // uFade is the regime fade (1 inside the catalogue regime, 0 beyond the window); uSide 0 for the catalogue
    // tiers, 1 for the statistical tier. A star with handover phase p is in the catalogue while uFade > p and in
    // the statistical sky while uFade < p (a smoothstep of width uPhaseWidth between), so across the window the
    // stars hand over ONE BY ONE, each at full light — a tier-wide cross-fade had halved every star at the
    // midpoint and the faint tier sank into black ("at 1.1 Myr the sky is more or less empty").
    // The visibility cut: a star is drawn while its apparent magnitude OF DATE (from the Sun, the attribute's
    // distance) is within uVLimit, fading over uVFade beyond — the arriving stars brighten in, the leaving fade
    // out. The lifetime band: alpha fades over the last uLifeFade of a star's main-sequence lifetime tau at |t|.
    // BIRTHS (the statistical tier, uSide 1): a twin of generation gen ≥ 1 (gen = ⌊|t|/tau⌋, a CPU attribute) stands
    // for the star born in the dead star's place — drawn at full handover whatever the regime, alive from gen·tau
    // (fading in over uLifeFade·tau) to (gen+1)·tau (fading out over the same); gen 0 is the original's own twin.
    uniforms: { pointTexture: { value: pointTexture }, uBaseSize: { value: settings().starsizeBase * (S.pixelRatio || 1) / C.spriteReferencePixelRatio }, uUnitsPerPc: { value: UNITS_PER_PC }, uOpacity: { value: 1.0 }, uFade: { value: 1.0 }, uSide: { value: 0.0 }, uPhaseWidth: { value: C.handoverPhaseWidth }, uVLimit: { value: C.visibleVLimit }, uVFade: { value: C.visibleVFadeWidth }, uTimeYears: { value: 0.0 }, uLifeFade: { value: C.lifetimeFadeFraction } },
    vertexShader: `
      uniform float uBaseSize, uUnitsPerPc, uFade, uSide, uPhaseWidth, uVLimit, uVFade, uTimeYears, uLifeFade;
      attribute float absMag;
      attribute float phase;
      attribute float tau;
      attribute float gen;
      attribute vec3 starColor;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = starColor;
        float s = smoothstep(phase - uPhaseWidth, phase + uPhaseWidth, uFade);
        float born = step(0.5, gen);
        float handover = max(abs(uSide - s), uSide * born);
        float dSun = max(length(position) / uUnitsPerPc, 1.0e-6);
        float mSun = absMag + 5.0 * log(dSun / 10.0) / log(10.0);
        float visible = 1.0 - smoothstep(uVLimit, uVLimit + uVFade, mSun);
        float w = uLifeFade * tau, tStart = gen * tau, tEnd = (gen + 1.0) * tau;
        float bornIn = mix(1.0, smoothstep(tStart, tStart + w, uTimeYears), born);
        float alive = bornIn * (1.0 - smoothstep(tEnd - w, tEnd, uTimeYears));
        vAlpha = handover * visible * alive;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dPc = max(length(mv.xyz) / uUnitsPerPc, 1.0e-6);
        float m = absMag + 5.0 * log(dPc / 10.0) / log(10.0);
        gl_PointSize = uBaseSize * clamp(0.66 - 0.10 * m, 0.07, 0.80);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float a = texture2D(pointTexture, gl_PointCoord).a;
        // additive blending adds rgb × alpha: the opacity enters ONCE, so a star's drawn light is linear in it
        // (squared — colour × opacity too — a half-opacity star drew a quarter of its light).
        gl_FragColor = vec4(vColor, a * uOpacity * vAlpha);
      }
    `,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true,
  });
  /** Every sprite material of the sky, for the per-year uniforms. */
  const allMaterials = () => [S.matBright, S.matFaint, S.sunMat, stat.mat, G.mat].filter(Boolean);
  /** The sprites' base size follows the renderer's pixel ratio: gl_PointSize is in DEVICE pixels, so a constant base
   *  drew every star twice as large on screen whenever the adaptive ratio dropped from 2 to 1 (the owner: "sometimes
   *  the stars seem brighter"). The setting is the look accepted on a ratio-2 display, so the device size is
   *  setting × ratio / 2 (a first normalisation pinned the ratio-1 look: "too bright all the time"). Called every
   *  frame by updateForEpoch; the uniforms move only when the ratio does. */
  function syncPixelRatio() {
    const r = pixelRatio ? pixelRatio() : 1;
    if (r === S.pixelRatio) return;
    S.pixelRatio = r;
    for (const mat of allMaterials()) mat.uniforms.uBaseSize.value = settings().starsizeBase * r / C.spriteReferencePixelRatio;
  }

  /** The local unit vector of an ICRS direction (x = cos δ sin α, y = sin δ, z = cos δ cos α). */
  const localUnit = (raDeg, decDeg) => { const cd = Math.cos(decDeg * D2R); return [cd * Math.sin(raDeg * D2R), Math.sin(decDeg * D2R), cd * Math.cos(raDeg * D2R)]; };
  /** The main-sequence lifetime band's attribute: a star's τ from its absolute magnitude, as Float32 (the Sun's 1e10 fits). */
  const tauOf = (absMag) => mainSequenceLifetimeYears(absMag);

  /** Parse the v2 catalogue into the typed arrays. @param {any} doc */
  function ingest(doc) {
    const cols = doc.columns, rows = doc.stars;
    const ci = Object.fromEntries(cols.map((c, i) => [c, i]));
    const n = rows.length;
    S.n = n; S.epochYear = doc._meta.epochYear; S.counts = doc._meta.counts; S.names = doc.names || {};
    S.hip = new Int32Array(n); S.r0 = new Float64Array(3 * n); S.d0 = new Float64Array(n);
    S.raDeg = new Float64Array(n); S.decDeg = new Float64Array(n); S.pmRaMasYr = new Float64Array(n); S.pmDecMasYr = new Float64Array(n); S.rvKmS = new Float64Array(n);
    S.vmag0 = new Float32Array(n); S.absMag = new Float32Array(n); S.tau = new Float32Array(n); S.gen = new Int32Array(n); S.hasRv = new Uint8Array(n); S.distFlag = new Uint8Array(n);
    S.hipIndex = new Map();
    const colors = new Float32Array(3 * n);
    const brightIdx = [], faintIdx = [];
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      const hip = r[ci.hip], ra = r[ci.raDeg], dec = r[ci.decDeg], rv = r[ci.rvKmS], vmag = r[ci.vmag], bv = r[ci.bv], d = r[ci.distPc];
      S.hip[i] = hip; S.hipIndex.set(hip, i);
      const u = localUnit(ra, dec);
      S.r0[3 * i] = d * u[0]; S.r0[3 * i + 1] = d * u[1]; S.r0[3 * i + 2] = d * u[2];
      S.raDeg[i] = ra; S.decDeg[i] = dec; S.pmRaMasYr[i] = r[ci.pmRaMasYr]; S.pmDecMasYr[i] = r[ci.pmDecMasYr]; S.rvKmS[i] = rv === null ? 0 : rv;
      S.d0[i] = d; S.vmag0[i] = vmag; S.hasRv[i] = rv === null ? 0 : 1; S.distFlag[i] = r[ci.distFlag];
      S.absMag[i] = vmag - 5 * Math.log10(d / 10);   // the absolute magnitude: the sprite's size is the apparent one at the camera
      S.tau[i] = tauOf(S.absMag[i]);
      const rgb = colorTemperature2rgb(colourTemperatureKelvinFromBV(bv === null ? 0.6 : bv));
      colors[3 * i] = rgb[0]; colors[3 * i + 1] = rgb[1]; colors[3 * i + 2] = rgb[2];
      if (vmag <= C.nakedEyeV) brightIdx.push(i); else faintIdx.push(i);
    }
    S.nNaked = brightIdx.length;
    S.brightIdx = Int32Array.from(brightIdx); S.faintIdx = Int32Array.from(faintIdx);
    // the births: the shortest lifetime (the statistical tier must exist once the first star can have died) and the
    // short-lived set — the stars that die inside the catalogue regime and its handover (the hover's count)
    const shortLivedYears = C.catalogueRegimeYears + C.regimeFadeYears;
    S.tauMin = Infinity; S.nShortLived = 0; S.nShortLivedNaked = 0;
    for (let i = 0; i < n; i++) { if (S.tau[i] < S.tauMin) S.tauMin = S.tau[i]; if (S.tau[i] < shortLivedYears) { S.nShortLived++; if (S.vmag0[i] <= C.nakedEyeV) S.nShortLivedNaked++; } }
    S.pos = Float32Array.from(S.r0);   // the positions of date (pc, local frame): the epoch's until the first update lands
    W.hipSpare = new Float32Array(3 * n);
    // the Sun's state at the catalogue epoch, the same way the integrated set brings it there (one RK4 step from J2000)
    S.sunStateAtEpoch = integratedSet({ n: 0, raDeg: [], decDeg: [], distPc: [], pmRaMasYr: [], pmDecMasYr: [], rvKmS: [], epochYear: S.epochYear }, heliocentricGalacticState).states0;
    S.colors = colors;
    // the handover phase: each star's own moment in the window, a seeded uniform draw kept clear of the
    // window's ends by the smoothstep's width, so every star completes its handover inside the window
    const w = C.handoverPhaseWidth, rnd = mulberry32(0x9E37);
    S.phase = new Float32Array(n);
    for (let i = 0; i < n; i++) S.phase[i] = w + rnd() * (1 - 2 * w);
  }

  /** GLSL's smoothstep in JS (the labels follow the sprites' law). @param {number} e0 @param {number} e1 @param {number} x */
  const smoothstep = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  /** A star's handover alpha at a regime fade — the shader's smoothstep, in JS for the gates: {catalogue, statistical}, summing to 1. @param {number} i @param {number} fade */
  function handoverAlpha(i, fade) {
    const w = C.handoverPhaseWidth, p = S.phase[i];
    const t = Math.max(0, Math.min(1, (fade - (p - w)) / (2 * w)));
    const s = t * t * (3 - 2 * t);
    return { catalogue: s, statistical: 1 - s };
  }

  /** A Points tier from per-star arrays (the positions given in pc, scaled to units — the epoch's until the first update lands,
   *  so a worker that never answers still shows the epoch's sky, never an empty one). */
  function buildTier(pointTexture, n, colors, absMag, phase, tau, name, renderOrder, posPc) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(3 * n);
    if (posPc) for (let k = 0; k < 3 * n; k++) p[k] = posPc[k] * UNITS_PER_PC;
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('starColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('absMag', new THREE.BufferAttribute(absMag, 1));
    geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('tau', new THREE.BufferAttribute(tau, 1));
    geo.setAttribute('gen', new THREE.BufferAttribute(new Float32Array(n), 1));   // the generation: 0 on every catalogue tier; the statistical tier's births update it
    const mat = starShader(pointTexture);
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false; points.name = name; points.renderOrder = renderOrder;
    return { geo, mat, points };
  }

  /** The sprites: two Points (the naked-eye tier, the background tier) gathered from the per-star arrays by index, the Sun, the labels. */
  function buildSprites(pointTexture) {
    const gather = (idx, src, k) => { const out = new Float32Array(k * idx.length); for (let j = 0; j < idx.length; j++) for (let c = 0; c < k; c++) out[k * j + c] = src[k * idx[j] + c]; return out; };
    const tier = (idx, name, order) => buildTier(pointTexture, idx.length, gather(idx, S.colors, 3), gather(idx, S.absMag, 1), gather(idx, S.phase, 1), gather(idx, S.tau, 1), name, order, gather(idx, S.pos, 3));
    const b = tier(S.brightIdx, 'stars-naked-eye', -95), f = tier(S.faintIdx, 'stars-background', -97);   // the backdrop draws first (plan 28 §E); the sprites write no depth
    S.matBright = b.mat; S.geoBright = b.geo; S.matFaint = f.mat; S.geoFaint = f.geo;
    while (starsGroup.children.length) starsGroup.remove(starsGroup.children[0]);
    starsGroup.add(b.points); starsGroup.add(f.points);
    // The Sun as a star: one point at the catalogue's origin (the container is centred on the Sun) with the
    // Sun's absolute magnitude and colour, on the same shader — so a camera past the main scene's far plane
    // (0.05 pc) still sees the Sun as the star it is from there (V 1.8 at Proxima); inside the solar system
    // the drawn Sun covers it. Always on: the Sun is the Sun in every regime (phase −1: never hands over;
    // the visibility cut reads its magnitude at the origin as −∞; its lifetime 1e10 years).
    const sun = buildTier(pointTexture, 1, new Float32Array(colorTemperature2rgb(colourTemperatureKelvinFromBV(C.sunBV))), new Float32Array([C.sunAbsMagV]), new Float32Array([-1]), new Float32Array([1e10]), 'sun-as-a-star', -95);
    starsGroup.add(sun.points); S.sunPoint = sun.points; S.sunMat = sun.mat;
    // the names (the IAU proper names), labels in the same group
    S.labels = [];
    const { namesVisible } = settings();
    for (const [hipStr, rec] of Object.entries(S.names)) {
      if (!rec.name) continue;
      const i = S.hipIndex.get(Number(hipStr)); if (i === undefined) continue;
      const div = document.createElement('div');
      div.className = 'star-label'; div.textContent = rec.name; div.style.pointerEvents = 'none';
      const obj = new CSS2DObject(div);
      obj.visible = namesVisible;
      S.labels.push({ obj, i, con: rec.con || null, div });
      starsGroup.add(obj);
    }
    S.textureReady = true;
  }

  /** The constellation strokes: each a list of catalogue indices (or fixed J2000 directions); grouped by constellation for the fades. */
  function ingestStrokes(doc) {
    S.strokes = [];
    S.strokeGroup = [];
    S.groups = new Map();
    const conOf = (i) => { const rec = S.names[S.hip[i]]; return rec && rec.con ? rec.con : null; };
    for (const stroke of doc.strokes) {
      const resolved = [];
      const cons = new Map();
      for (const v of stroke) {
        if (typeof v === 'number') { const i = S.hipIndex.get(v); if (i === undefined) continue; resolved.push(i); const c = conOf(i); if (c) cons.set(c, (cons.get(c) || 0) + 1); }
        else resolved.push({ fixed: localUnit(v.raDeg, v.decDeg) });
      }
      if (resolved.length < 2) continue;
      let group = '?', best = 0; for (const [c, k] of cons) if (k > best) { best = k; group = c; }
      S.strokes.push(resolved);
      S.strokeGroup.push(group);
      if (!S.groups.has(group)) S.groups.set(group, { name: group, starIdx: [], strokeIdx: [], opacity: 1, rmsDeg: 0 });
      const g = S.groups.get(group);
      g.strokeIdx.push(S.strokes.length - 1);
      for (const r of resolved) if (typeof r === 'number' && !g.starIdx.includes(r)) g.starIdx.push(r);
    }
    // the shape at the epoch: every pair's separation (a rotation-invariant description of the figure)
    for (const g of S.groups.values()) {
      const m = g.starIdx.length, pairs = [], sep0 = [];
      for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) { pairs.push(a, b); sep0.push(separationRad(g.starIdx[a], g.starIdx[b], true)); }
      g.pairs = Int32Array.from(pairs); g.sep0 = Float64Array.from(sep0);
    }
  }

  /** The angular separation of two catalogue stars, at the epoch (r₀) or now (pos). */
  function separationRad(i, j, atEpoch) {
    const A = atEpoch ? S.r0 : S.pos, B = A;
    const ax = A[3 * i], ay = A[3 * i + 1], az = A[3 * i + 2], bx = B[3 * j], by = B[3 * j + 1], bz = B[3 * j + 2];
    const na = Math.hypot(ax, ay, az), nb = Math.hypot(bx, by, bz);
    return Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by + az * bz) / (na * nb))));
  }

  /** Build (or rebuild) the line objects for the current layout from the current positions. */
  function buildLines() {
    for (const obj of S.lineObjects) { constellationsGroup.remove(obj); obj.geometry.dispose(); if (obj.material !== constellationMaterial) obj.material.dispose(); }
    S.lineObjects = []; drawMaterials.length = 0;
    // the lines join the stars at their measured distances (a constellation is a chance alignment: fly
    // out of the neighbourhood and it falls apart); a fixed vertex (none today) sits at 100 pc
    const pointOf = (r) => { if (typeof r === 'number') return new THREE.Vector3(S.pos[3 * r] * UNITS_PER_PC, S.pos[3 * r + 1] * UNITS_PER_PC, S.pos[3 * r + 2] * UNITS_PER_PC); const R = 100 * UNITS_PER_PC; return new THREE.Vector3(r.fixed[0] * R, r.fixed[1] * R, r.fixed[2] * R); };
    if (S.layout === 'asterism') {
      for (const g of S.groups.values()) {
        const pts = [];
        for (const si of g.strokeIdx) { const s = S.strokes[si]; for (let i = 0; i < s.length - 1; i++) pts.push(pointOf(s[i]), pointOf(s[i + 1])); }
        if (!pts.length) continue;
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const dist = new Float32Array(pts.length); let acc = 0;
        for (let i = 1; i < pts.length; i++) { acc += pts[i].distanceTo(pts[i - 1]); dist[i] = acc; }
        geo.setAttribute('lineDistance', new THREE.BufferAttribute(dist, 1));
        const mat = constellationMaterial.clone(); mat.opacity = constellationMaterial.opacity * g.opacity * S.regimeFade; mat.transparent = true; mat.depthWrite = false;
        const mesh = new THREE.LineSegments(geo, mat); mesh.frustumCulled = false; mesh.userData.group = g.name; mesh.renderOrder = -94;
        constellationsGroup.add(mesh); S.lineObjects.push(mesh);
      }
    } else {
      S.strokes.forEach((s, si) => {
        const pts = s.map(pointOf);
        if (pts.length < 2) return;
        // The artistic curve is a SKY curve: a spline through the stars' DIRECTIONS, each sample then put at the
        // distance interpolated (in the log) between the two stars it lies between — so the curve still passes
        // through the stars in 3-D but projects as a smooth arc from the Sun. A spline through the 3-D positions
        // themselves, once the stars sat at their measured distances (tenfold apart along one stroke), overshot
        // in depth and projected as long whips across the sky (the owner: "no longer the proper constellation").
        const dirs = pts.map((p) => p.clone().normalize()), dist = pts.map((p) => p.length());
        const curve = new THREE.CatmullRomCurve3(dirs, false, 'catmullrom', 0.5);
        const nSeg = pts.length - 1, nPts = pts.length * 5;
        // CatmullRomCurve3's uniform parameter puts control point k at t = k / nSeg
        const splinePts = curve.getPoints(nPts).map((q, k) => { const u = (k / nPts) * nSeg, j = Math.min(nSeg - 1, Math.floor(u)), f = u - j; const d = Math.exp((1 - f) * Math.log(dist[j]) + f * Math.log(dist[j + 1])); return q.normalize().multiplyScalar(d); });
        const geo = new THREE.BufferGeometry().setFromPoints(splinePts);
        const dArr = new Float32Array(splinePts.length); let total = 0;
        for (let i = 1; i < splinePts.length; i++) { total += splinePts[i].distanceTo(splinePts[i - 1]); dArr[i] = total; }
        geo.setAttribute('lineDistance', new THREE.BufferAttribute(dArr, 1));
        const mat = drawOnShaderProto.clone();
        mat.uniforms.uTotalLength.value = total; mat.uniforms.uColor.value = constellationMaterial.color.clone();
        const g = S.groups.get(S.strokeGroup[si]);
        if (mat.uniforms.uOpacity) mat.uniforms.uOpacity.value = (g ? g.opacity : 1) * S.regimeFade;
        drawMaterials.push(mat);
        const line = new THREE.Line(geo, mat); line.frustumCulled = false; line.userData.group = S.strokeGroup[si]; line.userData.stroke = si; line.renderOrder = -94;
        constellationsGroup.add(line); S.lineObjects.push(line);
      });
    }
  }

  /** Each catalogue star's Galactic (l, b) at the epoch (radians), from the J2000 direction and the triad — the
   *  statistical sky keeps b and V and scrambles l (plan 28 §E). Computed once after ingest. */
  let galL = null, galB = null;
  function computeGalactic() {
    const T = TRIAD;
    galL = new Float32Array(S.n); galB = new Float32Array(S.n);
    for (let i = 0; i < S.n; i++) {
      // local (x, y, z) = (Y_eq, Z_eq, X_eq) → equatorial (X, Y, Z) = (z, x, y), normalised
      const x = S.r0[3 * i], y = S.r0[3 * i + 1], z = S.r0[3 * i + 2], n = Math.hypot(x, y, z) || 1;
      const e = [z / n, x / n, y / n];
      const dx = e[0] * T.x[0] + e[1] * T.x[1] + e[2] * T.x[2], dy = e[0] * T.y[0] + e[1] * T.y[1] + e[2] * T.y[2], dz = e[0] * T.z[0] + e[1] * T.z[1] + e[2] * T.z[2];
      galL[i] = Math.atan2(dy, dx); galB[i] = Math.asin(Math.max(-1, Math.min(1, dz)));
    }
  }

  /** The statistical sky's seed cell of a year: the 100-Myr cell the year falls in, counted from J2000 (0 holds today). @param {number} year */
  const seedCellOf = (year) => Math.floor((year - 2000) / C.statisticalSeedCellYears);

  /** A twin's seeded Galactic longitude (radians): ONE hash draw per (seed cell, star, generation) — the same number in
   *  any order of asking; a new cell or a new generation draws another place. @param {number} cell @param {number} i @param {number} gen */
  function twinLongitudeRad(cell, i, gen) {
    const seed = (0x5A17 ^ Math.imul(cell + 7919, 2654435761) ^ Math.imul(i + 1, 0x9E3779B1) ^ Math.imul(gen + 1, 0x85EBCA6B)) >>> 0;
    return mulberry32(seed)() * 2 * Math.PI;
  }
  /** Put a twin at its seeded longitude on its star's Galactic latitude and distance (the container's local frame). @param {Float32Array} p @param {number} i @param {number} cell @param {number} gen */
  function placeTwin(p, i, cell, gen) {
    // the Galactic frame in the container's local coordinates (x = α 90°, y = the pole, z = the equinox):
    // X_g the centre, Z_g the pole, Y_g = Z_g × X_g (l = 90°)
    const T = TRIAD;
    const X = [T.x[1], T.x[2], T.x[0]], Y = [T.y[1], T.y[2], T.y[0]], Z = [T.z[1], T.z[2], T.z[0]];
    const l = twinLongitudeRad(cell, i, gen), b = galB[i], cb = Math.cos(b), d = S.d0[i] * UNITS_PER_PC;
    const gx = cb * Math.cos(l), gy = cb * Math.sin(l), gz = Math.sin(b);
    p[3 * i] = d * (gx * X[0] + gy * Y[0] + gz * Z[0]);
    p[3 * i + 1] = d * (gx * X[1] + gy * Y[1] + gz * Z[1]);
    p[3 * i + 2] = d * (gx * X[2] + gy * Y[2] + gz * Z[2]);
  }

  /** Build (or rebuild for a new seed cell) the statistical sky: every catalogue star's magnitude and Galactic
   *  latitude kept, its longitude replaced by a seeded draw — the same brightnesses and the same spread about the
   *  band, no shape, no name; it turns with the band. Each star's twin carries the same handover phase, so it
   *  appears as the star leaves, and the star's own lifetime: once the star is dead the twin is the next
   *  GENERATION of its luminosity, born in a seeded place (updateGenerations). @param {number} cell */
  function buildStatistical(cell) {
    if (!S.loaded || galL === null) return;
    if (stat.seedCell === cell && stat.points) return;
    const n = S.n;
    if (!stat.geo) {
      const t = buildTier(S.matBright.uniforms.pointTexture.value, n, S.colors.slice(), S.absMag.slice(), S.phase.slice(), S.tau.slice(), 'stars-statistical', -96);
      stat.geo = t.geo; stat.mat = t.mat; stat.points = t.points;
      stat.mat.uniforms.uSide.value = 1.0;
      starsGroup.add(stat.points);   // in the catalogue frame, at the catalogue's distances; the Galactic turn is applied as a rotation of this object
    }
    const p = stat.geo.getAttribute('position').array;
    for (let i = 0; i < n; i++) placeTwin(p, i, cell, S.gen[i]);
    stat.geo.getAttribute('position').needsUpdate = true;
    stat.seedCell = cell;
  }

  /** The births: each twin's generation at |t| (⌊|t|/τ⌋, 0 while its star lives); a twin whose generation moved is
   *  re-placed by its new seed — the dead star's successor somewhere else at the same latitude. Pure in the year:
   *  the generation and the place depend on |t| and the cell alone. @param {number} dtYears  the years from J2000 */
  function updateGenerations(dtYears) {
    const t = Math.abs(dtYears), n = S.n;
    const genAttr = stat.geo ? stat.geo.getAttribute('gen') : null, p = stat.geo ? stat.geo.getAttribute('position').array : null;
    let moved = 0, born = 0, maxGen = 0;
    for (let i = 0; i < n; i++) {
      const g = Math.floor(t / S.tau[i]);
      if (g > 0) born++;
      if (g > maxGen) maxGen = g;
      if (g !== S.gen[i]) { S.gen[i] = g; moved++; if (genAttr) { genAttr.array[i] = g; if (p && stat.seedCell !== null) placeTwin(p, i, stat.seedCell, g); } }
    }
    if (moved && genAttr) { genAttr.needsUpdate = true; stat.geo.getAttribute('position').needsUpdate = true; }
    S.births = { born, maxGen, shortLived: S.nShortLived, shortLivedNakedEye: S.nShortLivedNaked };
  }

  // ── the arriving stars (plan 28 §D) ─────────────────────────────────────────
  /** Load the Gaia tier: the manifest, the Float32 column binary, the sprites; then hand the set to the worker. */
  async function loadGaia(pointTexture) {
    if (!gaiaManifestUrl || G.loading || G.loaded) return;
    G.loading = true;
    try {
      const man = await fetchRepoJson(gaiaManifestUrl);
      if (!man || !man._meta || !man._meta.binary) throw new Error('stars-gaia.json: not the v1 manifest');
      const bytes = await fetchRepoBytes(man._meta.binary.file);
      if (!bytes) throw new Error(`${man._meta.binary.file}: unavailable`);
      const cols = man._meta.columns, n = man._meta.n;
      if (bytes.byteLength !== 4 * cols.length * n) throw new Error(`${man._meta.binary.file}: ${bytes.byteLength} bytes for ${cols.length} × ${n} floats`);
      const all = new Float32Array(bytes);
      const col = (name) => { const k = cols.indexOf(name); if (k < 0) throw new Error(`stars-gaia: column ${name} missing`); return all.subarray(k * n, (k + 1) * n); };
      const ra = col('raDeg'), dec = col('decDeg'), d = col('distPc'), pmra = col('pmRaMasYr'), pmde = col('pmDecMasYr'), rv = col('rvKmS'), vmag = col('vmag'), bv = col('bv');
      G.n = n; G.manifest = man._meta; G.epochYear = man._meta.epochYear;
      G.vmag0 = Float32Array.from(vmag); G.d0 = Float32Array.from(d);
      G.absMag = new Float32Array(n); G.tau = new Float32Array(n); G.phase = new Float32Array(n);
      const colors = new Float32Array(3 * n);
      const w = C.handoverPhaseWidth, rnd = mulberry32(0x6A1A);
      for (let i = 0; i < n; i++) {
        G.absMag[i] = vmag[i] - 5 * Math.log10(d[i] / 10);
        G.tau[i] = tauOf(G.absMag[i]);
        G.phase[i] = w + rnd() * (1 - 2 * w);
        const rgb = colorTemperature2rgb(colourTemperatureKelvinFromBV(bv[i]));
        colors[3 * i] = rgb[0]; colors[3 * i + 1] = rgb[1]; colors[3 * i + 2] = rgb[2];
      }
      // the epoch's positions until the first update lands (most are invisible today: V > 8)
      G.pos = new Float32Array(3 * n);
      for (let i = 0; i < n; i++) { const u = localUnit(ra[i], dec[i]); G.pos[3 * i] = d[i] * u[0]; G.pos[3 * i + 1] = d[i] * u[1]; G.pos[3 * i + 2] = d[i] * u[2]; }
      const t = buildTier(pointTexture, n, colors, G.absMag, G.phase, G.tau, 'stars-arriving', -96, G.pos);
      G.geo = t.geo; G.mat = t.mat; G.points = t.points;
      W.gaiaSpare = new Float32Array(3 * n);
      starsGroup.add(G.points);
      const set = { type: 'init', set: 'gaia', n, raDeg: Float64Array.from(ra), decDeg: Float64Array.from(dec), distPc: Float64Array.from(d), pmRaMasYr: Float64Array.from(pmra), pmDecMasYr: Float64Array.from(pmde), rvKmS: Float64Array.from(rv), epochYear: G.epochYear, limitYears: C.catalogueRegimeYears + C.regimeFadeYears };
      if (W.worker) W.worker.postMessage(set, [set.raDeg.buffer, set.decDeg.buffer, set.distPc.buffer, set.pmRaMasYr.buffer, set.pmDecMasYr.buffer, set.rvKmS.buffer]);
      else G.integrated = integratedSet(set, heliocentricGalacticState, ORBIT_INTEGRATION.arriving);
      G.loaded = true;
      if (Number.isFinite(S.year)) requestPositions(S.year, true);
    } catch (e) {
      G.failed = String(e && e.message || e);
      console.error('the arriving stars (stars-gaia) did not load —', G.failed);
    } finally { G.loading = false; }
  }

  // ── the orbit worker ────────────────────────────────────────────────────────
  /** Start the orbit worker with the named catalogue; resolves when it reports the set ready (its bundle loads first). */
  function startWorker() {
    const set = { type: 'init', set: 'hip', n: S.n, raDeg: Float64Array.from(S.raDeg), decDeg: Float64Array.from(S.decDeg), distPc: Float64Array.from(S.d0), pmRaMasYr: Float64Array.from(S.pmRaMasYr), pmDecMasYr: Float64Array.from(S.pmDecMasYr), rvKmS: Float64Array.from(S.rvKmS), epochYear: S.epochYear, limitYears: C.catalogueRegimeYears + C.regimeFadeYears };
    let w = null;
    try { w = createWorker ? createWorker() : null; } catch (e) { console.error('sky orbit worker could not start —', e && e.message || e); }
    const mainThread = () => { W.worker = null; S.integrated = integratedSet({ ...set, raDeg: S.raDeg, decDeg: S.decDeg, distPc: S.d0, pmRaMasYr: S.pmRaMasYr, pmDecMasYr: S.pmDecMasYr, rvKmS: S.rvKmS }, heliocentricGalacticState); };
    if (!w) { mainThread(); return Promise.resolve(); }
    W.worker = w;
    return new Promise((resolve) => {
      // a worker that errors or never reports ready (a bundling or serving fault) hands over to the main thread, said in the console
      let settled = false;
      const giveUp = (why) => { if (settled) return; settled = true; console.error(`sky orbit worker: ${why} — the orbits are computed on the main thread`); try { w.terminate(); } catch { /* gone */ } mainThread(); resolve(); };
      const timer = setTimeout(() => giveUp('no answer within 20 s'), 20000);
      w.onmessage = (ev) => { const m = ev.data; if (m.type === 'positions') onPositionsMessage(m); else if (m.type === 'ready' && m.set === 'hip' && !settled) { settled = true; clearTimeout(timer); resolve(); } };
      w.onerror = (e) => { giveUp(e && e.message ? e.message : 'an error'); };
      w.postMessage(set, [set.raDeg.buffer, set.decDeg.buffer, set.distPc.buffer, set.pmRaMasYr.buffer, set.pmDecMasYr.buffer, set.rvKmS.buffer]);
    });
  }
  /** The year the orbits are evaluated at: clamped to the handover's end — beyond it every catalogue star is its
   *  statistical twin, and an integration to the genesis (880 nodes of 41,000 stars) would cost a minute. */
  const orbitYearOf = (year) => Math.max(2000 - C.catalogueRegimeYears - C.regimeFadeYears, Math.min(2000 + C.catalogueRegimeYears + C.regimeFadeYears, year));
  /** Ask for the positions of a year: the named tier every request, the arriving tier when its year moved a step (or forced). */
  function requestPositions(year, force) {
    if (W.busy) { W.pending = year; return; }
    const wantGaia = G.loaded && (force || !Number.isFinite(G.year) || Math.abs(year - G.year) >= C.gaiaUpdateStepYears);
    if (!W.worker) {   // the main-thread fallback (no Worker): the same code, synchronously
      fillLocalPositionsIntegrated(S.integrated, year, W.hipSpare, TRIAD);
      if (wantGaia) fillLocalPositionsIntegrated(G.integrated, year, W.gaiaSpare, TRIAD);
      onPositionsMessage({ year, hipBuf: W.hipSpare, gaiaBuf: wantGaia ? W.gaiaSpare : null, gaiaDone: wantGaia, hipMs: 0, gaiaMs: 0 });
      return;
    }
    W.busy = true;
    const hipBuf = W.hipSpare, gaiaBuf = wantGaia ? W.gaiaSpare : null;
    W.hipSpare = null; if (wantGaia) W.gaiaSpare = null;
    const transfer = [hipBuf.buffer]; if (gaiaBuf) transfer.push(gaiaBuf.buffer);
    W.worker.postMessage({ type: 'year', year, hipBuf, gaiaBuf }, transfer);
  }
  /** Positions have landed: swap the buffers in, fill the sprites, the fades, the labels, the lines. */
  function onPositionsMessage(m) {
    W.busy = false; W.updates++; W.hipMs = m.hipMs; W.gaiaMs = m.gaiaMs; W.nodes = m.nodes || null; W.prefetched = m.prefetched || 0; W.prefetchMs = m.prefetchMs || 0;
    if (W.onFirst) { const f = W.onFirst; W.onFirst = null; f(); }
    if (m.hipBuf) { const old = S.pos; S.pos = m.hipBuf; W.hipSpare = old; }
    if (m.gaiaBuf) { if (m.gaiaDone) { const old = G.pos; G.pos = m.gaiaBuf; W.gaiaSpare = old; G.year = m.year; } else W.gaiaSpare = m.gaiaBuf; }
    // the positions are the clamped orbit year's; the state's year is the one asked for (its regime, uniforms)
    applyPositions(orbitYearOf(S.requestedYear) === m.year ? S.requestedYear : m.year, !!(m.gaiaBuf && m.gaiaDone));
    if (Number.isFinite(W.pending)) { const y = W.pending; W.pending = NaN; if (y !== m.year) requestPositions(y, false); }
  }
  function applyPositions(year, gaiaMoved) {
    const pos = S.pos;
    // the stars at their MEASURED distances: position (pc) × the scene's units per parsec, centred on the
    // Sun (the container's position, set by the scene each frame)
    const fill = (idx, geo) => {
      const p = geo.getAttribute('position').array;
      for (let k = 0; k < idx.length; k++) { const i = idx[k]; p[3 * k] = pos[3 * i] * UNITS_PER_PC; p[3 * k + 1] = pos[3 * i + 1] * UNITS_PER_PC; p[3 * k + 2] = pos[3 * i + 2] * UNITS_PER_PC; }
      geo.getAttribute('position').needsUpdate = true;
    };
    if (S.geoBright) { fill(S.brightIdx, S.geoBright); fill(S.faintIdx, S.geoFaint); }
    if (gaiaMoved && G.geo) {
      const p = G.geo.getAttribute('position').array, q = G.pos;
      for (let k = 0; k < 3 * G.n; k++) p[k] = q[k] * UNITS_PER_PC;
      G.geo.getAttribute('position').needsUpdate = true;
    }
    // the fades: the RMS change of every constellation's pairwise separations
    const [lo, hi] = C.recognisableRmsDeg;
    for (const g of S.groups.values()) {
      let sum = 0; const m = g.sep0.length;
      for (let k = 0; k < m; k++) { const d = separationRad(g.starIdx[g.pairs[2 * k]], g.starIdx[g.pairs[2 * k + 1]], false) - g.sep0[k]; sum += d * d; }
      g.rmsDeg = m ? Math.sqrt(sum / m) * R2D : 0;
      g.opacity = g.rmsDeg <= lo ? 1 : g.rmsDeg >= hi ? 0 : 1 - (g.rmsDeg - lo) / (hi - lo);
    }
    // A star keeps its NAME for as long as it is drawn (the owner, at +2 Myr: "the star names should be there"): the
    // label's opacity is the star's own drawn alpha — its handover share at this fade, its V-8 visibility of date,
    // its lifetime — the shader's law in JS; the constellation's recognisability fades the LINES only (a name belongs
    // to the star, a shape to the chance alignment). Beyond the handover the names are gone with the catalogue.
    const tAbs = Math.abs(year - 2000), vFade = C.visibleVFadeWidth, lifeFade = C.lifetimeFadeFraction;
    let namesShowing = 0;
    for (const L of S.labels) {
      const i = L.i;
      L.obj.position.set(pos[3 * i] * UNITS_PER_PC, pos[3 * i + 1] * UNITS_PER_PC, pos[3 * i + 2] * UNITS_PER_PC);
      const d = Math.hypot(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]) || 1e-6;
      const mSun = S.absMag[i] + 5 * Math.log10(d / 10);
      const visible = 1 - smoothstep(C.visibleVLimit, C.visibleVLimit + vFade, mSun);
      const alive = 1 - smoothstep(S.tau[i] * (1 - lifeFade), S.tau[i], tAbs);
      const alpha = handoverAlpha(i, S.regimeFade).catalogue * visible * alive;
      L.div.style.opacity = String(alpha.toFixed(3));
      if (alpha >= 0.5) namesShowing++;
    }
    S.namesShowing = namesShowing;
    buildLines();
    S.year = year;
    if (onPositions) onPositions();
  }

  /** The sky of date at an engine year: the regime, the dome's turn, the statistical sky, the uniforms — then the positions (asynchronously). */
  function computeForYear(year) {
    const dt = year - 2000;
    const over = Math.abs(dt) - C.catalogueRegimeYears;
    S.regimeFade = over <= 0 ? 1 : Math.max(0, 1 - over / C.regimeFadeYears);
    S.requestedYear = year;
    // plan 28 §E: the dome turns with the Sun's Galactic orbit about its pole (the texture's local +Y)
    S.galacticTurnRad = galacticTurnRadAtYear ? galacticTurnRadAtYear(year) : 0;
    if (dome && domeBaseSet) {
      dome.quaternion.copy(domeBase).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), S.galacticTurnRad));
      dome.updateMatrixWorld();
    }
    // the band's vertical motion (plan 28 §E's asymmetry knob, built as the parallax of the disc's light): the Sun
    // oscillates ±102 pc about the Galactic plane every 85 Myr (ONE home sky/galactic-orbits), and the midplane seen
    // from height z lies at −atan(z / D) — a uniform latitude shift, which on an equirectangular dome is the
    // texture's vertical offset (image row b = 0 drawn at latitude −shift): 0.8° today, 3.9° at the extremes
    S.sunHeightPc = sunHeightPcAtYear(year);
    S.bandShiftDeg = milkyWayLatitudeShiftDegAtYear(year);
    if (dome && dome.material && dome.material.map) dome.material.map.offset.y = -S.bandShiftDeg / 180;
    // the statistical sky beyond the catalogue regime: built for the year's seed cell, handed over star by star —
    // and inside it as soon as the shortest-lived star can have died (its successor is drawn there: the births)
    S.seedCell = seedCellOf(year);
    stat.opacity = 1 - S.regimeFade;   // the share of the stars that have handed over (reported; the shader works per star)
    if (stat.opacity > 0 || Math.abs(dt) >= S.tauMin * (1 - C.lifetimeFadeFraction)) buildStatistical(S.seedCell);
    updateGenerations(dt);
    if (stat.points) {   // the statistical sky turns with the band: a rotation about the Galactic pole in the container's frame
      const Z = TRIAD.z;
      stat.points.quaternion.setFromAxisAngle(new THREE.Vector3(Z[1], Z[2], Z[0]).normalize(), S.galacticTurnRad);
    }
    for (const mat of allMaterials()) { mat.uniforms.uFade.value = S.regimeFade; mat.uniforms.uTimeYears.value = Math.abs(dt); }
    requestPositions(orbitYearOf(year), false);
  }

  const api = {
    /** Load the catalogue files and build everything; resolves — and reports loaded — once the orbit worker is ready and the
     *  first positions have landed (a landing read before that would see the epoch's sky). The arriving stars load after.
     *  @param {any} pointTexture @param {number} jdUT */
    async load(pointTexture, jdUT) {
      const [stars, consts] = await Promise.all([fetchRepoJson(starsUrl), fetchRepoJson(constellationsUrl)]);
      if (!stars || !stars.columns || !Array.isArray(stars.stars)) throw new Error('stars.json: not the v2 catalogue (columns + stars)');
      if (!consts || !Array.isArray(consts.strokes)) throw new Error('constellations.json: not the v2 stroke list');
      ingest(stars);
      buildSprites(pointTexture);
      ingestStrokes(consts);
      computeGalactic();
      await startWorker();
      const first = new Promise((resolve) => { W.onFirst = resolve; });
      S.loaded = true;
      api.updateForEpoch(jdUT, true);
      await first;
      S.ready = true;   // what `loaded` reports: the first positions are in
      loadGaia(pointTexture);
      return S.counts;
    },
    /** Recompute the sky when the engine year has moved a whole year (or forced). @param {number} jdUT @param {boolean} [force] */
    updateForEpoch(jdUT, force) {
      if (!S.loaded) return false;
      syncPixelRatio();
      const year = engineYearOfJd(jdUT);
      if (!Number.isFinite(year)) return false;
      const ref = Number.isFinite(S.requestedYear) ? S.requestedYear : S.year;
      if (!force && Number.isFinite(ref) && Math.abs(year - ref) < C.updateStepYears) return false;
      computeForYear(year);
      return true;
    },
    /** @param {'asterism' | 'stellarium'} layout */
    setLayout(layout) { S.layout = layout; if (S.loaded) buildLines(); },
    /** @param {boolean} visible */
    setNamesVisible(visible) { for (const L of S.labels) L.obj.visible = visible; },
    /** The dome's base pose (the Galactic alignment at J2000, set by the scene once); the turn of date rides on it. @param {any} q */
    setDomeBase(q) { domeBase.copy(q); domeBaseSet = true; if (S.loaded && Number.isFinite(S.year)) computeForYear(S.year); },
    /** True once the catalogue is built, the worker ready and the first positions in. */
    get loaded() { return S.ready === true; },
    /** The arriving stars: loaded, or failed (the sky runs on the catalogue alone), or still loading. */
    get gaiaLoaded() { return G.loaded; },
    get gaiaFailed() { return G.failed; },
    /** True when the positions drawn are the ones last asked for (the worker has answered). */
    get settled() { return S.loaded && !W.busy && !Number.isFinite(W.pending) && S.year === S.requestedYear && (!G.loaded || Math.abs(G.year - orbitYearOf(S.year)) < C.gaiaUpdateStepYears); },
    get drawMaterials() { return drawMaterials; },
    /** The state the gates read. */
    state() {
      const groups = {}; for (const g of S.groups.values()) groups[g.name] = { rmsDeg: g.rmsDeg, opacity: g.opacity, stars: g.starIdx.length, strokes: g.strokeIdx.length };
      // the arriving stars drawn now: V(t) ≤ the cut, from the positions of date (asked for, not per frame)
      let gaiaVisible = null;
      if (G.loaded && G.pos) { gaiaVisible = 0; for (let i = 0; i < G.n; i++) { const d = Math.hypot(G.pos[3 * i], G.pos[3 * i + 1], G.pos[3 * i + 2]); if (G.absMag[i] + 5 * Math.log10(d / 10) <= C.visibleVLimit) gaiaVisible++; } }
      return {
        loaded: S.loaded, epochYear: S.epochYear, year: S.year, requestedYear: S.requestedYear, settled: api.settled,
        // orbits: the catalogue on its Galactic orbits; handover: star by star into the statistical sky; statistical: the illustration (plan 28 §D/E)
        regime: S.regimeFade >= 1 ? 'orbits' : S.regimeFade > 0 ? 'handover' : 'statistical', regimeFade: S.regimeFade,
        statisticalOpacity: stat.opacity, seedCell: S.seedCell, statisticalBuilt: stat.seedCell, galacticTurnRad: S.galacticTurnRad || 0,
        sunHeightPc: S.sunHeightPc, bandShiftDeg: S.bandShiftDeg, domeTextureOffsetY: dome && dome.material && dome.material.map ? dome.material.map.offset.y : null,
        labelOpacity: S.labels.length ? Number(S.labels[0].div.style.opacity) : null,
        namesShowing: S.namesShowing ?? null,   // the named stars drawn with their name (alpha ≥ 0.5) at this year
        sunPointAbsMag: S.sunPoint ? S.sunPoint.geometry.getAttribute('absMag').array[0] : null,
        // the share of the stars still in the catalogue at this fade (alpha ≥ 0.5) — ≈ regimeFade, one by one
        catalogueShare: S.phase ? (() => { let k = 0; for (let i = 0; i < S.n; i++) if (handoverAlpha(i, S.regimeFade).catalogue >= 0.5) k++; return k / S.n; })() : null,
        stars: S.n, nakedEye: S.nNaked, labels: S.labels.length, strokes: S.strokes.length, constellations: S.groups.size, layout: S.layout, groups, counts: S.counts,
        worker: { present: !!W.worker, updates: W.updates, hipMs: W.hipMs, gaiaMs: W.gaiaMs, nodes: W.nodes || null, prefetched: W.prefetched || 0, prefetchMs: W.prefetchMs || 0 },
        // the births: the stars whose lifetime is over at this |t| (their twins drawn as the next generation), the highest generation
        births: S.births || null, statisticalTierBuilt: !!stat.geo,
        pixelRatio: S.pixelRatio, starsizeBase: settings().starsizeBase, baseSizeDevicePx: S.matBright ? S.matBright.uniforms.uBaseSize.value : null,
        gaia: { loaded: G.loaded, failed: G.failed, n: G.n, year: G.year, visible: gaiaVisible, counts: G.manifest ? G.manifest.counts : null, faint: !!(G.manifest && G.manifest.sourceFaint), cuts: G.manifest ? G.manifest.cuts : null },
      };
    },
    /** The drawn lines of a constellation for the gates: per line object its sampled points (units, the container frame) and, for the
     *  curved layout, the stars of its stroke — so a gate can read how far a curve strays from its stroke's great-circle polyline. @param {string} group */
    lineProbe(group) {
      const out = [];
      S.lineObjects.forEach((obj, k) => {
        if (obj.userData.group !== group) return;
        const a = obj.geometry.getAttribute('position').array, samples = [];
        for (let i = 0; i < a.length; i += 3) samples.push([a[i], a[i + 1], a[i + 2]]);
        const s = obj.userData.stroke !== undefined ? S.strokes[obj.userData.stroke] : null;
        const stars = s ? s.map((r) => typeof r === 'number' ? [S.pos[3 * r] * UNITS_PER_PC, S.pos[3 * r + 1] * UNITS_PER_PC, S.pos[3 * r + 2] * UNITS_PER_PC] : r.fixed.map((v) => v * 100 * UNITS_PER_PC)) : null;
        out.push({ index: k, samples, stars });
      });
      return { layout: S.layout, lines: out };
    },
    /** A statistical-sky star's container-frame position (units) for the gates (the seeded draw of the built cell). @param {number} i */
    statisticalPositionAt(i) { if (!stat.geo) return null; const p = stat.geo.getAttribute('position').array; return [p[3 * i], p[3 * i + 1], p[3 * i + 2]]; },
    /** A star's twin for the gates: its generation at the current year, its lifetime, the twin's drawn position (units) and the
     *  seeded longitude the place came from (null before the statistical tier exists). @param {number} hip */
    twinGenerationAt(hip) {
      const i = S.hipIndex.get(hip); if (i === undefined) return null;
      const p = stat.geo ? stat.geo.getAttribute('position').array : null;
      return { hip, gen: S.gen[i], tau: S.tau[i], absMag: S.absMag[i], cell: stat.seedCell, position: p ? [p[3 * i], p[3 * i + 1], p[3 * i + 2]] : null, longitudeRad: stat.seedCell === null ? null : twinLongitudeRad(stat.seedCell, i, S.gen[i]) };
    },
    /** A star's handover alphas at the current fade (the shader's smoothstep in JS): {catalogue, statistical}, summing to 1. @param {number} hip */
    starHandoverAlpha(hip) { const i = S.hipIndex.get(hip); return i === undefined ? null : { hip, phase: S.phase[i], fade: S.regimeFade, ...handoverAlpha(i, S.regimeFade) }; },
    /** A catalogue star's drawn position (scene units in the container's frame — the Sun at the origin) and its absolute magnitude, at the current year. @param {number} hip */
    starPositionUnits(hip) {
      const i = S.hipIndex.get(hip); if (i === undefined || !Number.isFinite(S.year)) return null;
      return { hip, units: [S.pos[3 * i] * UNITS_PER_PC, S.pos[3 * i + 1] * UNITS_PER_PC, S.pos[3 * i + 2] * UNITS_PER_PC], distPc: Math.hypot(S.pos[3 * i], S.pos[3 * i + 1], S.pos[3 * i + 2]), absMag: S.absMag[i], tau: S.tau[i], unitsPerPc: UNITS_PER_PC };
    },
    /** An arriving star's drawn position (pc, local frame), its V of date and its lifetime, at the arriving tier's year. @param {number} i */
    gaiaStarAt(i) {
      if (!G.loaded || i < 0 || i >= G.n) return null;
      const d = Math.hypot(G.pos[3 * i], G.pos[3 * i + 1], G.pos[3 * i + 2]);
      return { i, year: G.year, local: [G.pos[3 * i], G.pos[3 * i + 1], G.pos[3 * i + 2]], distPc: d, vmag: G.absMag[i] + 5 * Math.log10(d / 10), vmag0: G.vmag0[i], d0: G.d0[i], absMag: G.absMag[i], tau: G.tau[i] };
    },
    /**
     * A star's direction at an engine year — pure, the same orbit the sprites ride (no memo, the main thread's own
     * evaluation through the shared positions code): the ICRS α, δ of date (degrees), the local unit vector, the
     * apparent magnitude; null for a HIP not in the catalogue.
     * @param {number} hip @param {number} year
     */
    starDirectionAt(hip, year) {
      const i = S.hipIndex.get(hip); if (i === undefined) return null;
      const h = heliocentricGalacticState({ raDeg: S.raDeg[i], decDeg: S.decDeg[i], distPc: S.d0[i], pmRaMasYr: S.pmRaMasYr[i], pmDecMasYr: S.pmDecMasYr[i], rvKmS: S.rvKmS[i] });
      const el = orbitElements(h, S.epochYear);   // for the amplitude fraction (the epicycle's reach), not the position
      // the named catalogue is INTEGRATED: the star and the Sun on the same schedule from the catalogue epoch
      const st = integratedStateAtYear(galactocentricState(h, S.epochYear), S.epochYear, year);
      const sun = integratedStateAtYear(S.sunStateAtEpoch, S.epochYear, year);
      const [x, y, z] = localOfGalactic(st[0] - sun[0], st[1] - sun[1], st[2] - sun[2], TRIAD), r = Math.hypot(x, y, z);
      // local (x, y, z) = (Y_eq, Z_eq, X_eq): α = atan2(x, z), δ = asin(y / r)
      const raDeg = ((Math.atan2(x, z) * R2D) % 360 + 360) % 360, decDeg = Math.asin(y / r) * R2D;
      return { hip, raDeg, decDeg, local: [x / r, y / r, z / r], distPc: r, vmag: S.vmag0[i] + 5 * Math.log10(r / S.d0[i]), hasRv: S.hasRv[i] === 1, distFlag: S.distFlag[i], amplitudeFraction: el.amplitudeFraction, name: (S.names[hip] && S.names[hip].name) || null };
    },
    /** The catalogue record of a star as loaded (for the gates' counts and the referee's inputs). @param {number} hip */
    starRecord(hip) {
      const i = S.hipIndex.get(hip); if (i === undefined) return null;
      return { hip, r0: [S.r0[3 * i], S.r0[3 * i + 1], S.r0[3 * i + 2]], raDeg: S.raDeg[i], decDeg: S.decDeg[i], pmRaMasYr: S.pmRaMasYr[i], pmDecMasYr: S.pmDecMasYr[i], rvKmS: S.rvKmS[i], d0: S.d0[i], vmag0: S.vmag0[i], hasRv: S.hasRv[i] === 1, distFlag: S.distFlag[i], names: S.names[hip] || null };
    },
  };
  return api;
}
