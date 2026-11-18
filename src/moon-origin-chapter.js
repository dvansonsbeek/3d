/**
 * The Moon's origin — an ILLUSTRATED chapter before the Genesis station (plan 31 C), with the early recession of
 * plan 31 B as its last phase. ONE home for the chapter: the keyframes (times and extents from the cited runs), the
 * scenario clock, the scene objects and the card's content; the tour runs it, the gates read it.
 *
 * What a browser can honestly show: NOT a hydrodynamic simulation (an SPH run is a supercomputer's; a toy N-body in
 * the page would be a plausible fake), but a KEYFRAMED SEQUENCE whose times and extents are the published runs' —
 * the canonical impact (Canup 2004: a Mars-class impactor, ~45°, near the escape velocity, the debris in orbit
 * within ~24 h), the disk (Ida, Canup & Stewart 1997: ~2 lunar masses inside ~5 R⊕), the accretion (Kokubo, Ida &
 * Makino 2000: the bulk outside the Roche zone within a month to a year) and the recession (the input's own
 * extrapolation, the package's moon/early-recession). The particle POSITIONS inside each phase are a sketch,
 * parametric and seeded, said so on every card: "illustrated after Canup 2004". The scenario is the one the model's
 * own conservation chain reaches without new physics (a 5.0-h day at 3 R⊕ on the constant Earth–Moon angular
 * momentum); the fast-spinning-Earth and synestia scenarios are NAMED on the card as the ones that need an evection
 * drain the chain does not carry.
 *
 * The clock: the chapter runs on its OWN scenario clock ("18 h after contact", "day 9", "year 1", …) shown on the
 * card; the simulator's instant stays at the genesis edge and the Date/Time fields never move — the navigable
 * domain is the cited history (the owner's decision, 2026-11-18: tour-only). Geometry in units of the Earth's DRAWN
 * radius, in the X–Z plane with Y the normal (three.js's convention: the Moon container's local Y is its orbit
 * normal), the chapter group on the Earth's world position in the Moon's orbit plane of date, so the hand-off lands
 * on the scene's own Moon at the history's first sample.
 */

/** The keyframes: scenario time in seconds from the contact (t1 null = open: the recession runs to the hand-over); the screen seconds each phase takes. */
export const ORIGIN_CHAPTER_PHASES = Object.freeze([
  { key: 'approach', t0: -2 * 3600, t1: 0, screenSeconds: 8, label: 'Theia approaches', source: 'Canup 2004: a Mars-class impactor (~0.1 M⊕), an oblique impact (~45°) near the escape velocity (~9–11 km/s)' },
  { key: 'contact', t0: 0, t1: 3 * 3600, screenSeconds: 14, label: 'contact and shear — the first hours', source: 'Canup 2004 (the SPH runs, t = 0 … 3 h): the impactor shears, its iron sinks to the Earth, its mantle is flung outward' },
  { key: 'plume', t0: 3 * 3600, t1: 24 * 3600, screenSeconds: 14, label: 'the debris in orbit within a day', source: 'Canup 2004: from the first contact to the debris in orbit, about 24 h' },
  { key: 'disk', t0: 24 * 3600, t1: 30 * 86400, screenSeconds: 12, label: 'a disk of about two lunar masses settles inside ~5 R⊕', source: 'Ida, Canup & Stewart 1997: the protolunar disk inside ~5 R⊕, most of it inside the Roche zone' },
  { key: 'accretion', t0: 30 * 86400, t1: 365.25 * 86400, screenSeconds: 14, label: 'the Moon accretes outside the Roche zone', source: 'Ida, Canup & Stewart 1997; Kokubo, Ida & Makino 2000: the bulk within a month to a year at ~3 R⊕ (the fluid Roche limit ~2.9 R⊕), ~10² yr to finish' },
  { key: 'recession', t0: 365.25 * 86400, t1: null, screenSeconds: 20, label: 'the early recession to the cited history\'s first sample', source: 'the input\'s own extrapolation: da/dt ∝ a^(−11/2) with the factor read off the history\'s first segment (plan 31 B) — a labelled scenario, the band from the window' },
]);
export const ORIGIN_CHAPTER = Object.freeze({
  theiaRadiusEarthRadii: 0.53,            // Mars-class (R_Mars / R⊕)
  moonRadiusEarthRadii: 0.2727,
  impactAngleDeg: 45,
  approachSpeedEarthRadiiPerHour: 6.2,    // ~11 km/s
  diskInnerEarthRadii: 1.4, diskOuterEarthRadii: 5.0, rocheEarthRadii: 2.9,
  accretionRadiusEarthRadii: 3.0,         // the scenario's first station (moon/early-recession's Roche zone)
  particles: 3000,
  tag: 'illustrated',
  after: 'illustrated after Canup 2004 (the impact), Ida, Canup & Stewart 1997 (the disk) and Kokubo, Ida & Makino 2000 (the accretion) — the times and extents are the cited runs\', the particle positions a sketch',
  alternatives: 'the fast-spinning Earth (Ćuk & Stewart 2012) and the synestia (Lock et al. 2018) need an evection-resonance drain of angular momentum the model\'s conservation chain does not carry — named, not drawn',
});

const SEC_PER_YR = 365.25 * 86400;

/** mulberry32: a seeded PRNG — the sketch is reproducible. @param {number} seed */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const smooth = (/** @type {number} */ u) => { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); };

/**
 * @param {object} deps
 * @param {any} deps.THREE
 * @param {any} deps.parent  the scene object the chapter group is added to
 * @param {() => any} deps.earthWorldPosition  the Earth's centre (world), each frame
 * @param {() => any} deps.frameQuaternion  the Moon's orbit plane of date (world; local Y its normal), each frame
 * @param {() => number} deps.earthDrawnRadius  the Earth's drawn radius in scene units
 * @param {(url: string, cb: (tex: any) => void) => any} deps.loadTexture
 * @param {string} deps.theiaTextureUrl  the magma-ocean map (the same kind as the Hadean Earth's)
 * @param {any} deps.pointTexture  the debris sprites' texture
 * @param {{ handover: () => any, distanceReAtYears: (years: number) => number | null, stateAt: (aRe: number) => any }} deps.recession  ONE home moon/early-recession
 * @param {() => void} [deps.onEnd]
 */
export function createMoonOriginChapter(deps) {
  const { THREE, parent, earthWorldPosition, frameQuaternion, earthDrawnRadius, loadTexture, theiaTextureUrl, pointTexture, recession, onEnd } = deps;
  const C = ORIGIN_CHAPTER, N = C.particles;
  const S = /** @type {any} */ ({ active: false, ended: false, built: false, phaseIndex: 0, phaseU: 0, screenT: 0, scenarioSeconds: 0, group: null, theia: null, moon: null, points: null, pos: null, prevPos: null, seeds: null, handover: null, moonAngle: 0, moonDistanceRe: null, theiaCentre: null });

  // ── the sketch's geometry (units of R, the Earth's drawn radius — the group's scale) ──
  const ang = C.impactAngleDeg * Math.PI / 180;
  const contactCentre = new THREE.Vector3(1 + C.theiaRadiusEarthRadii, 0, 0);      // Theia touching the Earth at +X
  const travel = new THREE.Vector3(-Math.cos(ang), 0, Math.sin(ang)).normalize();   // its velocity direction at contact, 45° to the surface normal, in the plane
  const contactAz = Math.atan2(contactCentre.z, contactCentre.x);

  function build() {
    if (S.built) return;
    S.group = new THREE.Group(); S.group.name = 'moon-origin-chapter'; S.group.visible = false;
    const theiaMat = new THREE.MeshStandardMaterial({ color: 0xffb070, emissive: 0x5a1a00, emissiveIntensity: 0.6, roughness: 0.9, metalness: 0 });
    S.theia = new THREE.Mesh(new THREE.SphereGeometry(C.theiaRadiusEarthRadii, 48, 32), theiaMat); S.theia.name = 'theia';
    if (loadTexture && theiaTextureUrl) loadTexture(theiaTextureUrl, (tex) => { theiaMat.map = tex; theiaMat.needsUpdate = true; });
    S.group.add(S.theia);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0xffc090, emissive: 0x6a2200, emissiveIntensity: 0.8, roughness: 0.95 });
    S.moon = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), moonMat); S.moon.name = 'accreting-moon'; S.moon.visible = false;
    if (loadTexture && theiaTextureUrl) loadTexture(theiaTextureUrl, (tex) => { moonMat.map = tex; moonMat.needsUpdate = true; });
    S.group.add(S.moon);
    const rnd = mulberry32(0x7E1A);
    S.seeds = new Float32Array(4 * N);
    for (let i = 0; i < 4 * N; i++) S.seeds[i] = rnd();
    S.pos = new Float32Array(3 * N); S.prevPos = new Float32Array(3 * N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(S.pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.06, map: pointTexture || null, color: 0xffb27a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    S.points = new THREE.Points(geo, mat); S.points.name = 'impact-debris'; S.points.frustumCulled = false;
    S.group.add(S.points);
    parent.add(S.group);
    S.built = true;
  }

  /** A particle's target position in a phase at its progress u (0 → 1), in R: (x, height, z). @param {number} i @param {string} key @param {number} u @param {number[]} out */
  function target(i, key, u, out) {
    const s0 = S.seeds[4 * i], s1 = S.seeds[4 * i + 1], s2 = S.seeds[4 * i + 2], s3 = S.seeds[4 * i + 3];
    const az0 = s0 * 2 * Math.PI, h = s2 - 0.5;
    if (key === 'approach') {   // packed inside Theia's mantle, riding with it
      const r = C.theiaRadiusEarthRadii * Math.cbrt(s1) * 0.95, th = Math.acos(2 * s2 - 1), tc = S.theiaCentre;
      out[0] = tc.x + r * Math.sin(th) * Math.cos(az0); out[1] = tc.y + r * Math.cos(th); out[2] = tc.z + r * Math.sin(th) * Math.sin(az0); return;
    }
    if (key === 'contact') {    // the shear: the mantle flung along the travel direction and outward, 1 → 4 R
      const spread = 0.3 + 1.2 * u, along = 0.5 + 3.5 * u * s1;
      const px = contactCentre.x + travel.x * along + spread * (s3 - 0.5) * 2 * Math.cos(az0), pz = contactCentre.z + travel.z * along + spread * (s3 - 0.5) * 2 * Math.sin(az0);
      const r = Math.max(1.05, Math.hypot(px, pz)), a = Math.atan2(pz, px);
      out[0] = r * Math.cos(a); out[1] = h * 0.4 * spread; out[2] = r * Math.sin(a); return;
    }
    if (key === 'plume') {      // the arc sweeping around the Earth: azimuth advancing with u, radius 1.2 … 6 R
      const r = 1.2 + 4.8 * s1 * s1, a = contactAz + 0.8 + u * (2.0 + 2.5 * s3) + s0 * 0.6;
      out[0] = r * Math.cos(a); out[1] = h * 0.5 * (1 - 0.6 * u); out[2] = r * Math.sin(a); return;
    }
    if (key === 'disk') {       // the annulus 1.4 … 5 R, thin
      const r = C.diskInnerEarthRadii + (C.diskOuterEarthRadii - C.diskInnerEarthRadii) * Math.sqrt(s1), a = az0 + u * 1.5;
      out[0] = r * Math.cos(a); out[1] = h * 0.12; out[2] = r * Math.sin(a); return;
    }
    if (key === 'accretion') {  // outside the Roche zone: onto the Moon at 3 R; inside: spiralling in
      const r0 = C.diskInnerEarthRadii + (C.diskOuterEarthRadii - C.diskInnerEarthRadii) * Math.sqrt(s1), a0 = az0 + 1.5;
      if (r0 >= C.rocheEarthRadii) {
        const A = C.accretionRadiusEarthRadii, mx = A * Math.cos(S.moonAngle), mz = A * Math.sin(S.moonAngle), f = smooth(Math.min(1, u * 1.2 + s3 * 0.1));
        out[0] = r0 * Math.cos(a0 + u * 2) * (1 - f) + mx * f; out[1] = h * 0.12 * (1 - f); out[2] = r0 * Math.sin(a0 + u * 2) * (1 - f) + mz * f; return;
      }
      const f = smooth(u), r = r0 * (1 - f) + 1.0 * f;
      out[0] = r * Math.cos(a0 + u * 3); out[1] = h * 0.12 * (1 - f); out[2] = r * Math.sin(a0 + u * 3); return;
    }
    out[0] = 0; out[1] = 0; out[2] = 0;   // the recession: the debris is gone
  }

  /** The scenario clock's label. @param {number} t seconds from the contact */
  function clockLabel(t) {
    const hm = (/** @type {number} */ h) => `${Math.floor(h)} h ${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, '0')} min`;
    if (t < 0) return `${hm(-t / 3600)} before contact`;
    if (t < 48 * 3600) return `${hm(t / 3600)} after contact`;
    if (t < 60 * 86400) return `day ${Math.floor(t / 86400) + 1}`;
    if (t < 2 * SEC_PER_YR) return `month ${Math.floor(t / (SEC_PER_YR / 12)) + 1}`;
    return `year ${Math.round(t / SEC_PER_YR).toLocaleString('en-US')}`;
  }

  /** The phase's progress → scenario seconds (linear; logarithmic in years over the recession). @param {number} k @param {number} u */
  function scenarioSeconds(k, u) {
    const p = ORIGIN_CHAPTER_PHASES[k];
    if (p.t1 === null) { const yEnd = S.handover ? S.handover.years : 1e5; return Math.exp(u * Math.log(yEnd)) * SEC_PER_YR; }
    return p.t0 + u * (p.t1 - p.t0);
  }

  function place() {
    if (!S.built) return;
    const R = earthDrawnRadius();
    S.group.position.copy(earthWorldPosition());
    S.group.quaternion.copy(frameQuaternion());
    S.group.scale.setScalar(R);
    // a point size is in SCENE units and ignores the group's scale (gl_PointSize = size · H/2 / depth): the first
    // build's 0.06 was 14 Earth radii per sprite, ~360 px on a 720-px canvas, 3,000 of them additive — the GPU fill
    // the owner saw; 0.2 R is 5–8 px at the chapter's 14-R framing (measured, doc 111 §1.49)
    S.points.material.size = 0.2 * R;
  }

  /** Pose the frame's objects inside phase k at progress u. @param {number} k @param {number} u */
  function render(k, u) {
    const key = ORIGIN_CHAPTER_PHASES[k].key;
    S.scenarioSeconds = scenarioSeconds(k, u);
    const t = S.scenarioSeconds;
    if (key === 'approach') {   // Theia on its line, upstream of the contact point by speed × time
      S.theiaCentre = contactCentre.clone().addScaledVector(travel, C.approachSpeedEarthRadiiPerHour * (t / 3600));
      S.theia.visible = true; S.theia.position.copy(S.theiaCentre); S.theia.scale.setScalar(1);
    } else if (key === 'contact') {   // deforming and sinking into the Earth
      S.theiaCentre = contactCentre.clone().addScaledVector(travel, 0.9 * smooth(u));
      S.theia.visible = true; S.theia.position.copy(S.theiaCentre); S.theia.scale.setScalar(1 - 0.75 * smooth(u));
    } else S.theia.visible = false;
    if (key === 'accretion') {
      const A = C.accretionRadiusEarthRadii;
      S.moon.visible = true; S.moonAngle += 0.02; S.moonDistanceRe = A;
      S.moon.scale.setScalar(Math.max(0.01, C.moonRadiusEarthRadii * (0.2 + 0.8 * smooth(u))));
      S.moon.position.set(A * Math.cos(S.moonAngle), 0, A * Math.sin(S.moonAngle));
    } else if (key === 'recession') {
      const a = recession.distanceReAtYears(t / SEC_PER_YR) ?? C.accretionRadiusEarthRadii;
      S.moonDistanceRe = a; S.moonAngle += Math.min(0.06, 0.6 / Math.pow(a, 1.5));
      S.moon.visible = true; S.moon.scale.setScalar(C.moonRadiusEarthRadii); S.moon.position.set(a * Math.cos(S.moonAngle), 0, a * Math.sin(S.moonAngle));
    } else { S.moon.visible = false; S.moonDistanceRe = null; }
    const showDebris = key !== 'recession';
    S.points.visible = showDebris;
    if (showDebris) {   // the debris: from the previous phase's end toward this phase's target
      const out = [0, 0, 0], f = key === 'approach' ? 1 : smooth(Math.min(1, u * 1.6));
      for (let i = 0; i < N; i++) {
        target(i, key, u, out);
        S.pos[3 * i] = S.prevPos[3 * i] * (1 - f) + out[0] * f; S.pos[3 * i + 1] = S.prevPos[3 * i + 1] * (1 - f) + out[1] * f; S.pos[3 * i + 2] = S.prevPos[3 * i + 2] * (1 - f) + out[2] * f;
      }
      S.points.geometry.getAttribute('position').needsUpdate = true;
      S.points.material.opacity = key === 'accretion' ? 0.85 * (1 - 0.9 * smooth(u)) : 0.85;
    }
  }

  function enterPhase(k) {
    if (S.built && S.pos) S.prevPos.set(S.pos);
    S.phaseIndex = k; S.phaseU = 0; S.screenT = 0;
    if (ORIGIN_CHAPTER_PHASES[k].key === 'accretion') S.moonAngle = contactAz + 2.3;
  }

  const esc = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const row = (/** @type {string} */ l, /** @type {string} */ v, /** @type {string} */ tag, /** @type {string} */ hint) => `<div class="origin-tour-row" title="${esc(hint)}"><span class="origin-tour-label">${l}</span><span class="origin-tour-value">${v}</span><span class="origin-tour-tag origin-tour-tag-${tag}">${tag}</span></div>`;
  const n0 = (/** @type {number} */ x) => Math.round(x).toLocaleString('en-US');

  /** The card's body for a phase: the clock, the phase, its source, the hand-off rows, the tag. @param {number} k */
  function cardHtml(k) {
    const p = ORIGIN_CHAPTER_PHASES[k];
    let rows = '';
    if (p.key === 'recession' && S.moonDistanceRe) {
      const st = recession.stateAt(S.moonDistanceRe), h = S.handover;
      rows = `<div class="origin-tour-rows">`
        + row('Moon distance', `${S.moonDistanceRe.toFixed(2)} R⊕ (${n0(S.moonDistanceRe * 6378)} km)`, 'scenario', 'the input\'s own extrapolation inward of its first sample on da/dt ∝ a^(−11/2) with the factor read off its first segment (the 3-sample window; the band: the 1- and 10-sample windows)')
        + row('Solar day', `${st.dayHours.toFixed(2)} h`, 'derived', 'the model\'s constant-angular-momentum chain at this distance — the day the Earth had when the Moon was there')
        + row('Month', `${st.monthHours.toFixed(1)} h (${st.monthDays.toFixed(2)} days)`, 'derived', 'the Moon\'s orbital period at this distance')
        + row('Moon in the sky', `${st.moonDiameterDeg.toFixed(1)}° across`, 'derived', 'the Moon\'s apparent diameter from the Earth')
        + row('Tidal lock', `within ~${st.lockYears < 1 ? '1' : n0(st.lockYears)} yr`, 'cited', 'Peale 1977: the lock time scales as a⁶ — within a century at 6 R⊕')
        + (h ? row('Hand-over', `${h.aOverEarthRadii.toFixed(2)} R⊕ after ${n0(h.years)} yr (band ${n0(h.bandYears[1])}–${n0(h.bandYears[0])})`, 'scenario', 'the cited history\'s first sample, where the simulator\'s own history begins; the input\'s band at that sample already reaches the Roche zone') : '')
        + `</div>`;
    } else if (p.key === 'accretion') {
      const st = recession.stateAt(C.accretionRadiusEarthRadii);
      rows = `<div class="origin-tour-rows">${row('At 3 R⊕', `day ${st.dayHours.toFixed(1)} h · month ${st.monthHours.toFixed(1)} h · the Moon ${st.moonDiameterDeg.toFixed(0)}° across`, 'derived', 'the model\'s constant-angular-momentum chain at 3 R⊕: the one derived number of the chapter')}</div>`;
    }
    return `<div class="origin-tour-clock"><span class="origin-tour-clock-label">${esc(clockLabel(S.scenarioSeconds))}</span><span class="origin-tour-clock-phase">${esc(p.label)}</span></div>`
      + `<div class="origin-tour-note">${esc(p.source)}</div>${rows}`
      + `<div class="origin-tour-says"><span class="origin-tour-tag origin-tour-tag-illustrated">${C.tag}</span> ${esc(C.after)}. ${esc(C.alternatives)}. The simulator's clock stays at the genesis edge; this chapter runs on its own scenario clock.</div>`;
  }

  return {
    phases: ORIGIN_CHAPTER_PHASES,
    get active() { return S.active; },
    start() {
      build();
      S.handover = recession.handover();
      S.active = true; S.ended = false; S.group.visible = true;
      S.pos.fill(0); S.prevPos.fill(0);
      enterPhase(0);
      place(); render(0, 0);
    },
    stop() { S.active = false; if (S.group) S.group.visible = false; },
    /** Advance by a screen interval (seconds); a phase's progress runs over its screenSeconds; the last phase ends the chapter. @param {number} dtSeconds */
    tick(dtSeconds) {
      if (!S.active || S.ended) return;
      const p = ORIGIN_CHAPTER_PHASES[S.phaseIndex];
      S.screenT += Math.min(Math.max(dtSeconds, 0), 0.1);
      let u = S.screenT / p.screenSeconds;
      if (u >= 1) {
        if (S.phaseIndex + 1 < ORIGIN_CHAPTER_PHASES.length) { render(S.phaseIndex, 1); enterPhase(S.phaseIndex + 1); u = 0; }
        else { S.phaseU = 1; place(); render(S.phaseIndex, 1); S.ended = true; if (onEnd) onEnd(); return; }
      }
      S.phaseU = u;
      place(); render(S.phaseIndex, u);
    },
    /** Jump to a phase's start, or to its end with atEnd (posed at u = 1; the next tick then ends the phase — the
     *  last phase's end hands the tour over, so a reader holds the tour paused). @param {string} key @param {boolean} [atEnd] */
    skipTo(key, atEnd = false) {
      const k = ORIGIN_CHAPTER_PHASES.findIndex((q) => q.key === key);
      if (k < 0 || !S.active) return false;
      enterPhase(k); S.ended = false;
      S.screenT = atEnd ? ORIGIN_CHAPTER_PHASES[k].screenSeconds : 0; S.phaseU = atEnd ? 1 : 0;
      place(); render(k, S.phaseU); return true;
    },
    place,
    /** The card's body for the current state — built on demand (the tour rebuilds it at ~10 Hz, not per frame). */
    cardHtml: () => cardHtml(S.phaseIndex),
    state() {
      const p = ORIGIN_CHAPTER_PHASES[S.phaseIndex];
      return { active: S.active, ended: S.ended, phase: p.key, phaseIndex: S.phaseIndex, phaseU: S.phaseU, scenarioSeconds: S.scenarioSeconds, clock: clockLabel(S.scenarioSeconds), theiaVisible: !!(S.theia && S.theia.visible), moonVisible: !!(S.moon && S.moon.visible), moonDistanceRe: S.moonDistanceRe, debrisVisible: !!(S.points && S.points.visible), particles: N, handover: S.handover, groupScale: S.group ? S.group.scale.x : null, groupVisible: !!(S.group && S.group.visible) };
    },
  };
}
