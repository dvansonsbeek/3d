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
 * With r₀ = d·p̂ (the parallax distance, or a photometric one, flagged in the catalogue) and
 * v = d·(μα* ê_α + μδ ê_δ) + v_r p̂, exact in a straight line and valid while the Galactic curvature of
 * the relative orbit is invisible — ~(t/P_epi)² ≈ 3e-5 at 1 Myr (P_epi ≈ 170 Myr): the regime's edge,
 * ±1 Myr, is set by meaning, not numerics. Beyond it the layer fades out over 0.2 Myr (regimes 2 and
 * 3 — the Galactic orbits, the lifetimes, the statistical sky — are plan 28 §D/E, not built): there no
 * star of today's sky is in a known place, and the scene says so.
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
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const MAS_TO_RAD = Math.PI / 180 / 3.6e6;
/** 1 km/s in parsecs per Julian year (the IAU parsec and the SI second). */
const KMS_TO_PC_PER_YEAR = 1.02271216505e-6;

export const SKY_CONSTANTS = Object.freeze({
  linearRegimeYears: 1e6,        // regime 1: |t − t₀| ≤ 1 Myr (plan 28 §C)
  regimeFadeYears: 2e5,          // the layer fades out between 1.0 and 1.2 Myr
  recognisableRmsDeg: [1, 5],    // the lines and names fade between these RMS separation changes
  updateStepYears: 1,            // the sky is recomputed when the engine year moves this much
  nakedEyeV: 6.5,                // the named/lined tier; fainter stars are the background tier
});

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

/** The sprite size tier by apparent magnitude (the former sprites' steps), times the base size. @param {number} mag @param {number} baseSize */
function spriteSize(mag, baseSize) {
  return (mag < 1 ? 1.5 : mag < 3 ? 1.0 : mag < 5 ? 0.6 : mag < 6.5 ? 0.3 : 0.14) * baseSize;
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
  const { THREE, CSS2DObject, fetchRepoJson, starsUrl, constellationsUrl, starsGroup, constellationsGroup, engineYearOfJd, constellationMaterial, drawOnShaderProto, drawMaterials, settings } = deps;
  const C = SKY_CONSTANTS;

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

  const starShader = (pointTexture) => new THREE.ShaderMaterial({
    uniforms: { pointTexture: { value: pointTexture }, uScaleFactor: { value: 2500.0 }, fadeStart: { value: 7500.0 }, fadeEnd: { value: 30000.0 }, uOpacity: { value: 1.0 } },
    vertexShader: `
      uniform float uScaleFactor;
      attribute float starSize;
      attribute vec3 starColor;
      varying vec3 vColor;
      varying float vDist;
      void main() {
        vColor = starColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDist = -mv.z;
        gl_PointSize = starSize * (uScaleFactor / max(vDist, 0.0001));
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      uniform float fadeStart, fadeEnd, uOpacity;
      varying vec3 vColor;
      varying float vDist;
      void main() {
        float a = texture2D(pointTexture, gl_PointCoord).a;
        float f = (1.0 - smoothstep(fadeStart, fadeEnd, vDist)) * uOpacity;
        gl_FragColor = vec4(vColor * f, a * f);
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
    S.vmag0 = new Float32Array(n); S.hasRv = new Uint8Array(n); S.distFlag = new Uint8Array(n);
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
      const rgb = colorTemperature2rgb(colourTemperatureKelvinFromBV(bv === null ? 0.6 : bv));
      colors[3 * i] = rgb[0]; colors[3 * i + 1] = rgb[1]; colors[3 * i + 2] = rgb[2];
      if (vmag <= C.nakedEyeV) brightIdx.push(i); else faintIdx.push(i);
    }
    S.nNaked = brightIdx.length;
    S.brightIdx = Int32Array.from(brightIdx); S.faintIdx = Int32Array.from(faintIdx);
    S.pos = new Float32Array(3 * n);
    S.colors = colors;
  }

  /** The sprites: two Points (the naked-eye tier, the background tier) sharing the per-star position array through index-gathered geometries. */
  function buildSprites(pointTexture) {
    const { starsizeBase } = settings();
    const build = (idx, matRef) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(3 * idx.length), col = new Float32Array(3 * idx.length), size = new Float32Array(idx.length);
      for (let k = 0; k < idx.length; k++) { const i = idx[k]; col[3 * k] = S.colors[3 * i]; col[3 * k + 1] = S.colors[3 * i + 1]; col[3 * k + 2] = S.colors[3 * i + 2]; size[k] = spriteSize(S.vmag0[i], starsizeBase); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('starColor', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('starSize', new THREE.BufferAttribute(size, 1));
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
    while (starsGroup.children.length) starsGroup.remove(starsGroup.children[0]);
    starsGroup.add(pb); starsGroup.add(pf);
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
    const R = settings().starDistance;
    const pointOf = (r) => { if (typeof r === 'number') { const n = Math.hypot(S.pos[3 * r], S.pos[3 * r + 1], S.pos[3 * r + 2]) || 1; return new THREE.Vector3(S.pos[3 * r] / n * R, S.pos[3 * r + 1] / n * R, S.pos[3 * r + 2] / n * R); } return new THREE.Vector3(r.fixed[0] * R, r.fixed[1] * R, r.fixed[2] * R); };
    if (S.layout === 'asterism') {
      for (const g of S.groups.values()) {
        const pts = [];
        for (const si of g.strokeIdx) { const s = S.strokes[si]; for (let i = 0; i < s.length - 1; i++) pts.push(pointOf(s[i]), pointOf(s[i + 1])); }
        if (!pts.length) continue;
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const dist = new Float32Array(pts.length); let acc = 0;
        for (let i = 1; i < pts.length; i++) { acc += pts[i].distanceTo(pts[i - 1]); dist[i] = acc; }
        geo.setAttribute('lineDistance', new THREE.BufferAttribute(dist, 1));
        const mat = constellationMaterial.clone(); mat.opacity = constellationMaterial.opacity * g.opacity * S.regimeFade; mat.transparent = true;
        const mesh = new THREE.LineSegments(geo, mat); mesh.frustumCulled = false; mesh.userData.group = g.name;
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
        const line = new THREE.Line(geo, mat); line.frustumCulled = false; line.userData.group = S.strokeGroup[si];
        constellationsGroup.add(line); S.lineObjects.push(line);
      });
    }
  }

  /** The positions of date: r = r₀ + v·Δt for every star, the sprites' attributes, the labels, the fades, the lines. */
  function computeForYear(year) {
    const dt = year - S.epochYear;
    const dtClamped = Math.max(-C.linearRegimeYears, Math.min(C.linearRegimeYears, dt));
    const over = Math.abs(dt) - C.linearRegimeYears;
    S.regimeFade = over <= 0 ? 1 : Math.max(0, 1 - over / C.regimeFadeYears);
    const R = settings().starDistance, base = settings().starsizeBase;
    const n = S.n, pos = S.pos;
    for (let i = 0; i < n; i++) {
      pos[3 * i] = S.r0[3 * i] + S.v[3 * i] * dtClamped;
      pos[3 * i + 1] = S.r0[3 * i + 1] + S.v[3 * i + 1] * dtClamped;
      pos[3 * i + 2] = S.r0[3 * i + 2] + S.v[3 * i + 2] * dtClamped;
    }
    const fill = (idx, geo) => {
      const p = geo.getAttribute('position').array, sz = geo.getAttribute('starSize').array;
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k], x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
        const r = Math.hypot(x, y, z) || 1, s = R / r;
        p[3 * k] = x * s; p[3 * k + 1] = y * s; p[3 * k + 2] = z * s;
        sz[k] = spriteSize(S.vmag0[i] + 5 * Math.log10(r / S.d0[i]), base);
      }
      geo.getAttribute('position').needsUpdate = true; geo.getAttribute('starSize').needsUpdate = true;
    };
    if (S.geoBright) { fill(S.brightIdx, S.geoBright); fill(S.faintIdx, S.geoFaint); S.matBright.uniforms.uOpacity.value = S.regimeFade; S.matFaint.uniforms.uOpacity.value = S.regimeFade; }
    // the fades: the RMS change of every constellation's pairwise separations
    const [lo, hi] = C.recognisableRmsDeg;
    for (const g of S.groups.values()) {
      let sum = 0; const m = g.sep0.length;
      for (let k = 0; k < m; k++) { const d = separationRad(g.starIdx[g.pairs[2 * k]], g.starIdx[g.pairs[2 * k + 1]], false) - g.sep0[k]; sum += d * d; }
      g.rmsDeg = m ? Math.sqrt(sum / m) * R2D : 0;
      g.opacity = g.rmsDeg <= lo ? 1 : g.rmsDeg >= hi ? 0 : 1 - (g.rmsDeg - lo) / (hi - lo);
    }
    for (const L of S.labels) {
      const i = L.i, x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2], r = Math.hypot(x, y, z) || 1;
      L.obj.position.set(x / r * R, y / r * R, z / r * R);
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
    get loaded() { return S.loaded; },
    get drawMaterials() { return drawMaterials; },
    /** The state the gates read. */
    state() {
      const groups = {}; for (const g of S.groups.values()) groups[g.name] = { rmsDeg: g.rmsDeg, opacity: g.opacity, stars: g.starIdx.length, strokes: g.strokeIdx.length };
      return { loaded: S.loaded, epochYear: S.epochYear, year: S.year, regime: S.regimeFade >= 1 ? 'linear' : S.regimeFade > 0 ? 'fading' : 'none', regimeFade: S.regimeFade, stars: S.n, nakedEye: S.nNaked, labels: S.labels.length, strokes: S.strokes.length, constellations: S.groups.size, layout: S.layout, groups, counts: S.counts };
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
