/**
 * The sky of date — plan 28 §B/C (doc 111 §1.48).
 *
 * ONE home for the catalogue sky: the bright-star catalogue (public/input/stars.json v2 — Hipparcos-2
 * astrometry at the catalogue epoch, Gaia DR3 / Pulkovo radial velocities, the BSC designations, the
 * IAU names; written by tools/pipeline/import-star-catalogue.js) and the constellation strokes keyed
 * to HIP ids (public/input/constellations.json v2), drawn on the scene's star sphere and MOVED with
 * their space velocities — regime 1, the linear space motion:
 *
 *   r(t) = r₀ + v·(t − t₀),   the direction r/|r| on the sphere,   V(t) = V₀ + 5 log₁₀(|r|/|r₀|),
 *
 * the plan's model, exact in itself. The referee (astropy's rigorous space motion, ERFA pmsafe — the
 * gate test/browser/sky-of-date.test.mjs) differs from this straight line by its light-time geometry on
 * the TRANSVERSE path: nothing for a star without proper motion, unchanged by the radial velocity,
 * ten times larger at ten times the distance for the same angular motion — 0.4″ at 100 kyr for
 * Sirius, 54″ for Groombridge 1830 (the fastest naked-eye star), measured and pinned per star in the
 * referee record, named open (doc 111 §1.48): the term belongs to a later regime, not to this one.
 * With r₀ = d·p̂ (the parallax distance, or the mode of a distance prior where the parallax is poor, flagged in the catalogue) and
 * v = d·(μα* ê_α + μδ ê_δ) + v_r p̂, exact in a straight line and valid while the Galactic curvature of
 * the relative orbit is invisible — ~(t/P_epi)² ≈ 3e-5 at 1 Myr (P_epi ≈ 170 Myr): the regime's edge,
 * ±1 Myr, is set by meaning, not numerics. Beyond it the catalogue hands over, across 0.2 Myr, to the
 * STATISTICALLY EQUIVALENT sky of plan 28 §E: every catalogue star keeps its magnitude and its Galactic
 * latitude and takes a seeded longitude (the seed changes every 100 Myr) — the same brightnesses and
 * the same spread about the band, no shape and no name, since no star of today's sky is in a known
 * place there; drawn as a child of the Milky Way dome, which turns with the Sun's Galactic orbit (once
 * per 216 Myr on McMillan 2017's R₀ and v₀, ONE home sky/galactic-frame). Regime 2 — the Galactic
 * orbits and the lifetimes between 1 and ~100 Myr, a band — is plan 28 §D, not built. The stars sit at
 * their MEASURED distances (UNITS_PER_PC on the scene's 1 AU = 100), centred on the Sun by the scene each
 * frame, so zooming out passes Proxima and Sirius and shows the neighbourhood as the 3-D cloud it is; a
 * sprite's size is the star's apparent magnitude at the camera. The Milky Way dome alone is a backdrop at
 * infinity (its group on the camera's position); the scene draws the sky in its own pass with a far
 * camera (script.js renderFrame), the depth cleared before the solar system.
 *
 * Recognisability: a constellation's shape is its stars' PAIRWISE angular separations (a rotation-
 * invariant description, so no best-fit rotation is needed); the RMS change of those separations since
 * the catalogue epoch fades its lines and its stars' names from RMS 1° (full) to 5° (gone).
 *
 * Frames: the catalogue is ICRS; the containers these objects sit in are aligned ONCE at init to the
 * J2000 equatorial frame through the world frame (the star-field rows of the perihelion-at-sun gate),
 * so a star's local coordinates are x = cos δ sin α, y = sin δ, z = cos δ cos α — the same convention
 * the former RA/Dec sprites used. Every position is pure in the ENGINE year (TT, Julian from J2000),
 * recomputed only when that year moves by a whole year (the sky moves ≤ 10″/yr).
 */

/* global document */
import { SUN_GALACTIC_ORBIT } from '@essrt/physics';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const MAS_TO_RAD = Math.PI / 180 / 3.6e6;
/** 1 km/s in parsecs per Julian year (the IAU parsec and the SI second). */
const KMS_TO_PC_PER_YEAR = 1.02271216505e-6;
/** The scene's units per parsec: 1 AU = 100 units (the scene's rule), 1 pc = 206,264.806 AU. The stars sit at their measured distances. */
export const UNITS_PER_PC = 206264.806 * 100;

export const SKY_CONSTANTS = Object.freeze({
  linearRegimeYears: 1e6,        // regime 1: |t − t₀| ≤ 1 Myr (plan 28 §C)
  regimeFadeYears: 2e5,          // the catalogue hands over to the statistical sky between 1.0 and 1.2 Myr
  handoverPhaseWidth: 0.05,      // each star hands over at its OWN seeded moment in the window (a smoothstep this wide in the fade), so the sky stays full
  recognisableRmsDeg: [1, 5],    // the lines and names fade between these RMS separation changes
  updateStepYears: 1,            // the sky is recomputed when the engine year moves this much
  nakedEyeV: 6.5,                // the named/lined tier; fainter stars are the background tier
  statisticalSeedCellYears: 1e8, // plan 28 §E: the statistical sky's seed changes every 100 Myr
  sunGalacticPeriodMyr: SUN_GALACTIC_ORBIT.periodMyr,   // the dome's turn (ONE home sky/galactic-frame)
  sunAbsMagV: 4.81,              // the Sun as a star: M_V (Willmer 2018, ApJS 236, 47) — seen from past the main camera's far plane
  sunBV: 0.65,                   // its colour (B−V, the same source)
});

/** mulberry32 — a small seeded PRNG: the statistical sky is reproducible per seed cell. @param {number} seed */
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
 * @param {string} deps.starsUrl
 * @param {string} deps.constellationsUrl
 * @param {any} deps.starsGroup  the container the sprites and labels go in (aligned to the J2000 frame at init)
 * @param {any} deps.constellationsGroup  the container the lines go in
 * @param {(jdUT: number) => number} deps.engineYearOfJd  the ONE engine year (TT, Julian from J2000) of a scene instant
 * @param {any} deps.constellationMaterial  the asterism lines' LineDashedMaterial (cloned per constellation)
 * @param {any} deps.drawOnShaderProto  the curved layout's ShaderMaterial prototype (cloned per stroke; needs uOpacity)
 * @param {any[]} deps.drawMaterials  the array the draw-on animation walks
 * @param {() => void} [deps.renderOnce]
 * @param {() => {starDistance: number, starsizeBase: number, namesVisible: boolean, layout: string}} deps.settings
 */
export function createSkyOfDate(deps) {
  const { THREE, CSS2DObject, fetchRepoJson, starsUrl, constellationsUrl, starsGroup, constellationsGroup, engineYearOfJd, constellationMaterial, drawOnShaderProto, drawMaterials, settings, dome, galacticTurnRadAtYear, galacticTriad } = deps;
  const C = SKY_CONSTANTS;
  /** The dome's base pose (the Galactic alignment at J2000, handed in at creation or by setDomeBase) and its turn of date. */
  const domeBase = new THREE.Quaternion();
  let domeBaseSet = false;
  if (deps.domeBase) { domeBase.copy(deps.domeBase); domeBaseSet = true; }
  /** The statistical sky (plan 28 §E): a child of the dome (it turns with the band), rebuilt per seed cell. */
  const stat = { points: null, geo: null, mat: null, seedCell: null, opacity: 0 };

  /** @type {{
   *  loaded: boolean, epochYear: number, n: number, nNaked: number,
   *  hip: Int32Array, r0: Float64Array, v: Float64Array, d0: Float64Array, vmag0: Float32Array, hasRv: Uint8Array, distFlag: Uint8Array,
   *  pos: Float32Array, sizeBright: Float32Array, sizeFaint: Float32Array, brightIdx: Int32Array, faintIdx: Int32Array,
   *  hipIndex: Map<number, number>, names: Record<string, any>,
   *  labels: Array<{obj: any, i: number, con: string | null}>, matBright: any, matFaint: any, geoBright: any, geoFaint: any,
   *  strokes: Array<Array<number | {raDeg: number, decDeg: number}>>, groups: Map<string, {name: string, starIdx: number[], pairs: Int32Array, sep0: Float64Array, strokeIdx: number[], opacity: number, rmsDeg: number}>,
   *  strokeGroup: string[], lineObjects: any[], layout: string, year: number, regimeFade: number, counts: any, textureReady: boolean,
   * }} */
  const S = /** @type {any} */ ({ loaded: false, epochYear: 1991.25, n: 0, nNaked: 0, labels: [], strokes: [], groups: new Map(), strokeGroup: [], lineObjects: [], layout: settings().layout || 'asterism', year: NaN, regimeFade: 1, counts: null, textureReady: false, names: {} });

  // The sprite's size is the star's APPARENT magnitude at the camera: m = M + 5 log₁₀(d_cam / 10 pc) with
  // d_cam the star's distance from the camera (the stars sit at their measured distances, so approaching
  // Sirius brightens it); the size law is the §E magnitude tiers made continuous AT THEIR DRAWN SIZE —
  // the former shader attenuated its tiers (1.5 / 1.0 / 0.6 / 0.3 / 0.14 of the base) by 2500/depth,
  // 0.5 at the centre of view on the 5,000-unit sphere, so the drawn sizes were 0.75 / 0.5 / 0.3 /
  // 0.15 / 0.07 of the base: m −1.4 → 0.80, 0 → 0.66, 2 → 0.46, 4 → 0.26, ≥ 6 → 0.07 (the first 3-D
  // build carried the tiers WITHOUT the attenuation — the bright stars twice too large, "too bright").
  const starShader = (pointTexture) => new THREE.ShaderMaterial({
    // uFade is the regime fade (1 inside the linear regime, 0 beyond the window); uSide 0 for the catalogue
    // tiers, 1 for the statistical tier. A star with handover phase p is in the catalogue while uFade > p and in
    // the statistical sky while uFade < p (a smoothstep of width uPhaseWidth between), so across the window the
    // stars hand over ONE BY ONE, each at full light — a tier-wide cross-fade had halved every star at the
    // midpoint and the faint tier sank into black ("at 1.1 Myr the sky is more or less empty").
    uniforms: { pointTexture: { value: pointTexture }, uBaseSize: { value: settings().starsizeBase }, uUnitsPerPc: { value: UNITS_PER_PC }, uOpacity: { value: 1.0 }, uFade: { value: 1.0 }, uSide: { value: 0.0 }, uPhaseWidth: { value: C.handoverPhaseWidth } },
    vertexShader: `
      uniform float uBaseSize, uUnitsPerPc, uFade, uSide, uPhaseWidth;
      attribute float absMag;
      attribute float phase;
      attribute vec3 starColor;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = starColor;
        float s = smoothstep(phase - uPhaseWidth, phase + uPhaseWidth, uFade);
        vAlpha = abs(uSide - s);
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

  /** The local unit vector of an ICRS direction (x = cos δ sin α, y = sin δ, z = cos δ cos α). */
  const localUnit = (raDeg, decDeg) => { const cd = Math.cos(decDeg * D2R); return [cd * Math.sin(raDeg * D2R), Math.sin(decDeg * D2R), cd * Math.cos(raDeg * D2R)]; };

  /** Parse the v2 catalogue into the typed arrays. @param {any} doc */
  function ingest(doc) {
    const cols = doc.columns, rows = doc.stars;
    const ci = Object.fromEntries(cols.map((c, i) => [c, i]));
    const n = rows.length;
    S.n = n; S.epochYear = doc._meta.epochYear; S.counts = doc._meta.counts; S.names = doc.names || {};
    S.hip = new Int32Array(n); S.r0 = new Float64Array(3 * n); S.v = new Float64Array(3 * n); S.d0 = new Float64Array(n);
    S.vmag0 = new Float32Array(n); S.absMag = new Float32Array(n); S.hasRv = new Uint8Array(n); S.distFlag = new Uint8Array(n);
    S.hipIndex = new Map();
    const colors = new Float32Array(3 * n);
    const brightIdx = [], faintIdx = [];
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      const hip = r[ci.hip], ra = r[ci.raDeg], dec = r[ci.decDeg], pmra = r[ci.pmRaMasYr], pmde = r[ci.pmDecMasYr], rv = r[ci.rvKmS], vmag = r[ci.vmag], bv = r[ci.bv], d = r[ci.distPc];
      S.hip[i] = hip; S.hipIndex.set(hip, i);
      const sa = Math.sin(ra * D2R), ca = Math.cos(ra * D2R), sd = Math.sin(dec * D2R), cd = Math.cos(dec * D2R);
      // local axes: p̂ = (cd·sa, sd, cd·ca); ê_α (east) = (ca, 0, −sa); ê_δ (north) = (−sd·sa, cd, −sd·ca)
      S.r0[3 * i] = d * cd * sa; S.r0[3 * i + 1] = d * sd; S.r0[3 * i + 2] = d * cd * ca;
      const va = d * pmra * MAS_TO_RAD, vd = d * pmde * MAS_TO_RAD, vr = (rv === null ? 0 : rv) * KMS_TO_PC_PER_YEAR;
      S.v[3 * i] = va * ca - vd * sd * sa + vr * cd * sa;
      S.v[3 * i + 1] = vd * cd + vr * sd;
      S.v[3 * i + 2] = -va * sa - vd * sd * ca + vr * cd * ca;
      S.d0[i] = d; S.vmag0[i] = vmag; S.hasRv[i] = rv === null ? 0 : 1; S.distFlag[i] = r[ci.distFlag];
      S.absMag[i] = vmag - 5 * Math.log10(d / 10);   // the absolute magnitude: the sprite's size is the apparent one at the camera
      const rgb = colorTemperature2rgb(colourTemperatureKelvinFromBV(bv === null ? 0.6 : bv));
      colors[3 * i] = rgb[0]; colors[3 * i + 1] = rgb[1]; colors[3 * i + 2] = rgb[2];
      if (vmag <= C.nakedEyeV) brightIdx.push(i); else faintIdx.push(i);
    }
    S.nNaked = brightIdx.length;
    S.brightIdx = Int32Array.from(brightIdx); S.faintIdx = Int32Array.from(faintIdx);
    S.pos = new Float32Array(3 * n);
    S.colors = colors;
    // the handover phase: each star's own moment in the window, a seeded uniform draw kept clear of the
    // window's ends by the smoothstep's width, so every star completes its handover inside the window
    const w = C.handoverPhaseWidth, rnd = mulberry32(0x9E37);
    S.phase = new Float32Array(n);
    for (let i = 0; i < n; i++) S.phase[i] = w + rnd() * (1 - 2 * w);
  }

  /** A star's handover alpha at a regime fade — the shader's smoothstep, in JS for the gates: {catalogue, statistical}, summing to 1. @param {number} i @param {number} fade */
  function handoverAlpha(i, fade) {
    const w = C.handoverPhaseWidth, p = S.phase[i];
    const t = Math.max(0, Math.min(1, (fade - (p - w)) / (2 * w)));
    const s = t * t * (3 - 2 * t);
    return { catalogue: s, statistical: 1 - s };
  }

  /** The sprites: two Points (the naked-eye tier, the background tier) sharing the per-star position array through index-gathered geometries. */
  function buildSprites(pointTexture) {
    const { starsizeBase } = settings();
    const build = (idx, matRef) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(3 * idx.length), col = new Float32Array(3 * idx.length), absMag = new Float32Array(idx.length), phase = new Float32Array(idx.length);
      for (let k = 0; k < idx.length; k++) { const i = idx[k]; col[3 * k] = S.colors[3 * i]; col[3 * k + 1] = S.colors[3 * i + 1]; col[3 * k + 2] = S.colors[3 * i + 2]; absMag[k] = S.absMag[i]; phase[k] = S.phase[i]; }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('starColor', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('absMag', new THREE.BufferAttribute(absMag, 1));
      geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
      void starsizeBase;
      const mat = starShader(pointTexture);
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      matRef.mat = mat; matRef.geo = geo; matRef.points = points;
      return points;
    };
    const b = {}, f = {};
    const pb = build(S.brightIdx, b), pf = build(S.faintIdx, f);
    S.matBright = b.mat; S.geoBright = b.geo; S.matFaint = f.mat; S.geoFaint = f.geo;
    pb.name = 'stars-naked-eye'; pf.name = 'stars-background';
    pb.renderOrder = -95; pf.renderOrder = -97;   // the backdrop draws first (plan 28 §E); the sprites write no depth
    while (starsGroup.children.length) starsGroup.remove(starsGroup.children[0]);
    starsGroup.add(pb); starsGroup.add(pf);
    // The Sun as a star: one point at the catalogue's origin (the container is centred on the Sun) with the
    // Sun's absolute magnitude and colour, on the same shader — so a camera past the main scene's far plane
    // (0.05 pc) still sees the Sun as the star it is from there (V 1.8 at Proxima); inside the solar system
    // the drawn Sun covers it. Always on: the Sun is the Sun in every regime.
    const sunGeo = new THREE.BufferGeometry();
    sunGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    sunGeo.setAttribute('starColor', new THREE.BufferAttribute(new Float32Array(colorTemperature2rgb(colourTemperatureKelvinFromBV(C.sunBV))), 3));
    sunGeo.setAttribute('absMag', new THREE.BufferAttribute(new Float32Array([C.sunAbsMagV]), 1));
    sunGeo.setAttribute('phase', new THREE.BufferAttribute(new Float32Array([-1]), 1));   // never hands over
    const sunPoint = new THREE.Points(sunGeo, starShader(pointTexture));
    sunPoint.name = 'sun-as-a-star'; sunPoint.renderOrder = -95; sunPoint.frustumCulled = false;
    starsGroup.add(sunPoint); S.sunPoint = sunPoint;
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
        const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
        const splinePts = curve.getPoints(pts.length * 5);
        const geo = new THREE.BufferGeometry().setFromPoints(splinePts);
        const dArr = new Float32Array(splinePts.length); let total = 0;
        for (let i = 1; i < splinePts.length; i++) { total += splinePts[i].distanceTo(splinePts[i - 1]); dArr[i] = total; }
        geo.setAttribute('lineDistance', new THREE.BufferAttribute(dArr, 1));
        const mat = drawOnShaderProto.clone();
        mat.uniforms.uTotalLength.value = total; mat.uniforms.uColor.value = constellationMaterial.color.clone();
        const g = S.groups.get(S.strokeGroup[si]);
        if (mat.uniforms.uOpacity) mat.uniforms.uOpacity.value = (g ? g.opacity : 1) * S.regimeFade;
        drawMaterials.push(mat);
        const line = new THREE.Line(geo, mat); line.frustumCulled = false; line.userData.group = S.strokeGroup[si]; line.renderOrder = -94;
        constellationsGroup.add(line); S.lineObjects.push(line);
      });
    }
  }

  /** Each catalogue star's Galactic (l, b) at the epoch (radians), from the J2000 direction and the triad — the
   *  statistical sky keeps b and V and scrambles l (plan 28 §E). Computed once after ingest. */
  let galL = null, galB = null;
  function computeGalactic() {
    const T = galacticTriad;
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

  /** Build (or rebuild for a new seed cell) the statistical sky: every catalogue star's magnitude and Galactic
   *  latitude kept, its longitude replaced by a seeded uniform draw — the same brightnesses and the same spread
   *  about the band, no shape, no name; a child of the dome, so it turns with the band. The dome's texture frame:
   *  +X the centre (l 0), +Y the pole, +Z = l 270 (the alignment's third axis is X × Y of the equatorial triad,
   *  i.e. −Y_g). Drawn just inside the dome; the sprite size compensates the distance. @param {number} cell */
  function buildStatistical(cell) {
    if (!S.loaded || galL === null) return;
    if (stat.seedCell === cell && stat.points) return;
    const rnd = mulberry32(0x5A17 ^ Math.imul(cell + 7919, 2654435761));
    const n = S.n;
    if (!stat.geo) {
      stat.geo = new THREE.BufferGeometry();
      stat.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * n), 3));
      stat.geo.setAttribute('starColor', new THREE.BufferAttribute(S.colors.slice(), 3));
      stat.geo.setAttribute('absMag', new THREE.BufferAttribute(S.absMag.slice(), 1));
      stat.geo.setAttribute('phase', new THREE.BufferAttribute(S.phase.slice(), 1));   // the same phase per star: its twin appears as it leaves
      stat.mat = starShader(S.matBright.uniforms.pointTexture.value);
      stat.mat.uniforms.uSide.value = 1.0;
      stat.mat.uniforms.uFade.value = 1.0;
      stat.points = new THREE.Points(stat.geo, stat.mat);
      stat.points.frustumCulled = false; stat.points.renderOrder = -96; stat.points.name = 'stars-statistical';
      starsGroup.add(stat.points);   // in the catalogue frame, at the catalogue's distances; the Galactic turn is applied as a rotation of this object
    }
    // the Galactic frame in the container's local coordinates (x = α 90°, y = the pole, z = the equinox):
    // X_g the centre, Z_g the pole, Y_g = Z_g × X_g (l = 90°)
    const T = galacticTriad;
    const X = [T.x[1], T.x[2], T.x[0]], Y = [T.y[1], T.y[2], T.y[0]], Z = [T.z[1], T.z[2], T.z[0]];
    const p = stat.geo.getAttribute('position').array;
    for (let i = 0; i < n; i++) {
      const l = rnd() * 2 * Math.PI, b = galB[i], cb = Math.cos(b), d = S.d0[i] * UNITS_PER_PC;
      const gx = cb * Math.cos(l), gy = cb * Math.sin(l), gz = Math.sin(b);
      p[3 * i] = d * (gx * X[0] + gy * Y[0] + gz * Z[0]);
      p[3 * i + 1] = d * (gx * X[1] + gy * Y[1] + gz * Z[1]);
      p[3 * i + 2] = d * (gx * X[2] + gy * Y[2] + gz * Z[2]);
    }
    stat.geo.getAttribute('position').needsUpdate = true;
    stat.seedCell = cell;
  }

  /** The positions of date: r = r₀ + v·Δt for every star, the sprites' attributes, the labels, the fades, the lines. */
  function computeForYear(year) {
    const dt = year - S.epochYear;
    const dtClamped = Math.max(-C.linearRegimeYears, Math.min(C.linearRegimeYears, dt));
    const over = Math.abs(dt) - C.linearRegimeYears;
    S.regimeFade = over <= 0 ? 1 : Math.max(0, 1 - over / C.regimeFadeYears);
    // plan 28 §E: the dome turns with the Sun's Galactic orbit about its pole (the texture's local +Y)
    S.galacticTurnRad = galacticTurnRadAtYear ? galacticTurnRadAtYear(year) : 0;
    if (dome && domeBaseSet) {
      dome.quaternion.copy(domeBase).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), S.galacticTurnRad));
      dome.updateMatrixWorld();
    }
    // the statistical sky beyond regime 1: built for the year's seed cell, cross-faded against the catalogue
    S.seedCell = seedCellOf(year);
    stat.opacity = 1 - S.regimeFade;   // the share of the stars that have handed over (reported; the shader works per star)
    if (stat.opacity > 0) buildStatistical(S.seedCell);
    if (stat.mat) stat.mat.uniforms.uFade.value = S.regimeFade;
    if (stat.points && galacticTriad) {   // the statistical sky turns with the band: a rotation about the Galactic pole in the container's frame
      const Z = galacticTriad.z;
      stat.points.quaternion.setFromAxisAngle(new THREE.Vector3(Z[1], Z[2], Z[0]).normalize(), S.galacticTurnRad);
    }
    const R = settings().starDistance, base = settings().starsizeBase;
    const n = S.n, pos = S.pos;
    for (let i = 0; i < n; i++) {
      pos[3 * i] = S.r0[3 * i] + S.v[3 * i] * dtClamped;
      pos[3 * i + 1] = S.r0[3 * i + 1] + S.v[3 * i + 1] * dtClamped;
      pos[3 * i + 2] = S.r0[3 * i + 2] + S.v[3 * i + 2] * dtClamped;
    }
    // the stars at their MEASURED distances: position (pc) × the scene's units per parsec, centred on the
    // Sun (the container's position, set by the scene each frame); the sprite's size is the apparent
    // magnitude at the camera, computed in the shader from absMag and the camera distance
    const fill = (idx, geo) => {
      const p = geo.getAttribute('position').array;
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k];
        p[3 * k] = pos[3 * i] * UNITS_PER_PC; p[3 * k + 1] = pos[3 * i + 1] * UNITS_PER_PC; p[3 * k + 2] = pos[3 * i + 2] * UNITS_PER_PC;
      }
      geo.getAttribute('position').needsUpdate = true;
    };
    void R; void base;
    if (S.geoBright) { fill(S.brightIdx, S.geoBright); fill(S.faintIdx, S.geoFaint); S.matBright.uniforms.uFade.value = S.regimeFade; S.matFaint.uniforms.uFade.value = S.regimeFade; }
    // the fades: the RMS change of every constellation's pairwise separations
    const [lo, hi] = C.recognisableRmsDeg;
    for (const g of S.groups.values()) {
      let sum = 0; const m = g.sep0.length;
      for (let k = 0; k < m; k++) { const d = separationRad(g.starIdx[g.pairs[2 * k]], g.starIdx[g.pairs[2 * k + 1]], false) - g.sep0[k]; sum += d * d; }
      g.rmsDeg = m ? Math.sqrt(sum / m) * R2D : 0;
      g.opacity = g.rmsDeg <= lo ? 1 : g.rmsDeg >= hi ? 0 : 1 - (g.rmsDeg - lo) / (hi - lo);
    }
    for (const L of S.labels) {
      const i = L.i;
      L.obj.position.set(pos[3 * i] * UNITS_PER_PC, pos[3 * i + 1] * UNITS_PER_PC, pos[3 * i + 2] * UNITS_PER_PC);
      const g = L.con ? S.groups.get(L.con) : null;
      L.div.style.opacity = String(((g ? g.opacity : 1) * S.regimeFade).toFixed(3));
    }
    buildLines();
    S.year = year;
  }

  const api = {
    /** Load both files and build everything; resolves when the sky is drawn at the given instant. @param {any} pointTexture @param {number} jdUT */
    async load(pointTexture, jdUT) {
      const [stars, consts] = await Promise.all([fetchRepoJson(starsUrl), fetchRepoJson(constellationsUrl)]);
      if (!stars || !stars.columns || !Array.isArray(stars.stars)) throw new Error('stars.json: not the v2 catalogue (columns + stars)');
      if (!consts || !Array.isArray(consts.strokes)) throw new Error('constellations.json: not the v2 stroke list');
      ingest(stars);
      buildSprites(pointTexture);
      ingestStrokes(consts);
      computeGalactic();
      S.loaded = true;
      api.updateForEpoch(jdUT, true);
      return S.counts;
    },
    /** Recompute the sky when the engine year has moved a whole year (or forced). @param {number} jdUT @param {boolean} [force] */
    updateForEpoch(jdUT, force) {
      if (!S.loaded) return false;
      const year = engineYearOfJd(jdUT);
      if (!Number.isFinite(year)) return false;
      if (!force && Number.isFinite(S.year) && Math.abs(year - S.year) < C.updateStepYears) return false;
      computeForYear(year);
      return true;
    },
    /** @param {'asterism' | 'stellarium'} layout */
    setLayout(layout) { S.layout = layout; if (S.loaded) buildLines(); },
    /** @param {boolean} visible */
    setNamesVisible(visible) { for (const L of S.labels) L.obj.visible = visible; },
    /** The dome's base pose (the Galactic alignment at J2000, set by the scene once); the turn of date rides on it. @param {any} q */
    setDomeBase(q) { domeBase.copy(q); domeBaseSet = true; if (S.loaded && Number.isFinite(S.year)) computeForYear(S.year); },
    get loaded() { return S.loaded; },
    get drawMaterials() { return drawMaterials; },
    /** The state the gates read. */
    state() {
      const groups = {}; for (const g of S.groups.values()) groups[g.name] = { rmsDeg: g.rmsDeg, opacity: g.opacity, stars: g.starIdx.length, strokes: g.strokeIdx.length };
      return {
        loaded: S.loaded, epochYear: S.epochYear, year: S.year,
        // linear: the catalogue; handover: the cross-fade into the statistical sky; statistical: the illustration (plan 28 §E)
        regime: S.regimeFade >= 1 ? 'linear' : S.regimeFade > 0 ? 'handover' : 'statistical', regimeFade: S.regimeFade,
        statisticalOpacity: stat.opacity, seedCell: S.seedCell, statisticalBuilt: stat.seedCell, galacticTurnRad: S.galacticTurnRad || 0,
        labelOpacity: S.labels.length ? Number(S.labels[0].div.style.opacity) : null,
        sunPointAbsMag: S.sunPoint ? S.sunPoint.geometry.getAttribute('absMag').array[0] : null,
        // the share of the stars still in the catalogue at this fade (alpha ≥ 0.5) — ≈ regimeFade, one by one
        catalogueShare: S.phase ? (() => { let k = 0; for (let i = 0; i < S.n; i++) if (handoverAlpha(i, S.regimeFade).catalogue >= 0.5) k++; return k / S.n; })() : null,
        stars: S.n, nakedEye: S.nNaked, labels: S.labels.length, strokes: S.strokes.length, constellations: S.groups.size, layout: S.layout, groups, counts: S.counts,
      };
    },
    /** A statistical-sky star's container-frame position (units) for the gates (the seeded draw of the built cell). @param {number} i */
    statisticalPositionAt(i) { if (!stat.geo) return null; const p = stat.geo.getAttribute('position').array; return [p[3 * i], p[3 * i + 1], p[3 * i + 2]]; },
    /** A star's handover alphas at the current fade (the shader's smoothstep in JS): {catalogue, statistical}, summing to 1. @param {number} hip */
    starHandoverAlpha(hip) { const i = S.hipIndex.get(hip); return i === undefined ? null : { hip, phase: S.phase[i], fade: S.regimeFade, ...handoverAlpha(i, S.regimeFade) }; },
    /** A catalogue star's drawn position (scene units in the container's frame — the Sun at the origin) and its absolute magnitude, at the current year. @param {number} hip */
    starPositionUnits(hip) {
      const i = S.hipIndex.get(hip); if (i === undefined || !Number.isFinite(S.year)) return null;
      return { hip, units: [S.pos[3 * i] * UNITS_PER_PC, S.pos[3 * i + 1] * UNITS_PER_PC, S.pos[3 * i + 2] * UNITS_PER_PC], distPc: Math.hypot(S.pos[3 * i], S.pos[3 * i + 1], S.pos[3 * i + 2]), absMag: S.absMag[i], unitsPerPc: UNITS_PER_PC };
    },
    /**
     * A star's direction at an engine year — pure, the same formula the sprites ride (no memo): the ICRS
     * α, δ of date (degrees), the local unit vector, the apparent magnitude; null for a HIP not in the catalogue.
     * @param {number} hip @param {number} year
     */
    starDirectionAt(hip, year) {
      const i = S.hipIndex.get(hip); if (i === undefined) return null;
      const dt = year - S.epochYear;
      const x = S.r0[3 * i] + S.v[3 * i] * dt, y = S.r0[3 * i + 1] + S.v[3 * i + 1] * dt, z = S.r0[3 * i + 2] + S.v[3 * i + 2] * dt;
      const r = Math.hypot(x, y, z);
      // local (x, y, z) = (Y_eq, Z_eq, X_eq): α = atan2(x, z), δ = asin(y / r)
      const raDeg = ((Math.atan2(x, z) * R2D) % 360 + 360) % 360, decDeg = Math.asin(y / r) * R2D;
      return { hip, raDeg, decDeg, local: [x / r, y / r, z / r], distPc: r, vmag: S.vmag0[i] + 5 * Math.log10(r / S.d0[i]), hasRv: S.hasRv[i] === 1, distFlag: S.distFlag[i], name: (S.names[hip] && S.names[hip].name) || null };
    },
    /** The catalogue record of a star as loaded (for the gates' counts and the referee's inputs). @param {number} hip */
    starRecord(hip) {
      const i = S.hipIndex.get(hip); if (i === undefined) return null;
      return { hip, r0: [S.r0[3 * i], S.r0[3 * i + 1], S.r0[3 * i + 2]], v: [S.v[3 * i], S.v[3 * i + 1], S.v[3 * i + 2]], d0: S.d0[i], vmag0: S.vmag0[i], hasRv: S.hasRv[i] === 1, distFlag: S.distFlag[i], names: S.names[hip] || null };
    },
  };
  return api;
}
