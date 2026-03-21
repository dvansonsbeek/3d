// ═══════════════════════════════════════════════════════════════════════════
// SCENE GRAPH ENGINE — Standalone position calculator for the solar system
// Replicates the Three.js hierarchy from script.js without any rendering.
//
// Usage:
//   const { computePlanetPosition } = require('./scene-graph');
//   const pos = computePlanetPosition('mars', 2451716.5);
//   // → { ra, dec, distAU, sunDistAU }  (ra/dec in radians)
// ═══════════════════════════════════════════════════════════════════════════

const C = require('./constants');
const OE = require('./orbital-engine');
const MEEUS_LUNAR = JSON.parse(require('fs').readFileSync(
  require('path').resolve(__dirname, '..', '..', 'public', 'input', 'meeus-lunar-tables.json'), 'utf8'));

// ═══════════════════════════════════════════════════════════════════════════
// MINIMAL MATRIX4 (column-major, matches Three.js convention)
// ═══════════════════════════════════════════════════════════════════════════

class Mat4 {
  constructor() { this.e = new Float64Array(16); this.e[0]=this.e[5]=this.e[10]=this.e[15]=1; }

  identity() { this.e.fill(0); this.e[0]=this.e[5]=this.e[10]=this.e[15]=1; return this; }

  copy(m) { for (let i=0;i<16;i++) this.e[i]=m.e[i]; return this; }

  // C = A * B  (this = a * b)
  multiplyMatrices(a, b) {
    const ae = a.e, be = b.e, te = this.e;
    const a11=ae[0],a21=ae[1],a31=ae[2],a41=ae[3];
    const a12=ae[4],a22=ae[5],a32=ae[6],a42=ae[7];
    const a13=ae[8],a23=ae[9],a33=ae[10],a43=ae[11];
    const a14=ae[12],a24=ae[13],a34=ae[14],a44=ae[15];
    const b11=be[0],b21=be[1],b31=be[2],b41=be[3];
    const b12=be[4],b22=be[5],b32=be[6],b42=be[7];
    const b13=be[8],b23=be[9],b33=be[10],b43=be[11];
    const b14=be[12],b24=be[13],b34=be[14],b44=be[15];
    te[0]=a11*b11+a12*b21+a13*b31+a14*b41;
    te[4]=a11*b12+a12*b22+a13*b32+a14*b42;
    te[8]=a11*b13+a12*b23+a13*b33+a14*b43;
    te[12]=a11*b14+a12*b24+a13*b34+a14*b44;
    te[1]=a21*b11+a22*b21+a23*b31+a24*b41;
    te[5]=a21*b12+a22*b22+a23*b32+a24*b42;
    te[9]=a21*b13+a22*b23+a23*b33+a24*b43;
    te[13]=a21*b14+a22*b24+a23*b34+a24*b44;
    te[2]=a31*b11+a32*b21+a33*b31+a34*b41;
    te[6]=a31*b12+a32*b22+a33*b32+a34*b42;
    te[10]=a31*b13+a32*b23+a33*b33+a34*b43;
    te[14]=a31*b14+a32*b24+a33*b34+a34*b44;
    te[3]=a41*b11+a42*b21+a43*b31+a44*b41;
    te[7]=a41*b12+a42*b22+a43*b32+a44*b42;
    te[11]=a41*b13+a42*b23+a43*b33+a44*b43;
    te[15]=a41*b14+a42*b24+a43*b34+a44*b44;
    return this;
  }

  premultiply(m) { return this.multiplyMatrices(m, this); }
  multiply(m) { return this.multiplyMatrices(this, m); }

  makeTranslation(x, y, z) {
    this.identity(); this.e[12]=x; this.e[13]=y; this.e[14]=z; return this;
  }

  makeRotationX(θ) {
    const c=Math.cos(θ), s=Math.sin(θ);
    this.identity(); this.e[5]=c; this.e[9]=-s; this.e[6]=s; this.e[10]=c; return this;
  }
  makeRotationY(θ) {
    const c=Math.cos(θ), s=Math.sin(θ);
    this.identity(); this.e[0]=c; this.e[8]=s; this.e[2]=-s; this.e[10]=c; return this;
  }
  makeRotationZ(θ) {
    const c=Math.cos(θ), s=Math.sin(θ);
    this.identity(); this.e[0]=c; this.e[4]=-s; this.e[1]=s; this.e[5]=c; return this;
  }

  // Compose from position (x,y,z) and Euler XYZ rotation (rx,ry,rz in radians)
  // Matches Three.js Object3D default Euler order 'XYZ'
  // From Three.js src/math/Euler.js makRotationFromEuler case 'XYZ':
  compose(px, py, pz, rx, ry, rz) {
    const a=Math.cos(rx), b=Math.sin(rx);
    const c=Math.cos(ry), d=Math.sin(ry);
    const e=Math.cos(rz), f=Math.sin(rz);
    const ae=a*e, af=a*f, be=b*e, bf=b*f;
    const te = this.e;
    te[0]=c*e;       te[4]=-c*f;       te[8]=d;           te[12]=px;
    te[1]=af+be*d;   te[5]=ae-bf*d;    te[9]=-b*c;        te[13]=py;
    te[2]=bf-ae*d;   te[6]=be+af*d;    te[10]=a*c;        te[14]=pz;
    te[3]=0;         te[7]=0;          te[11]=0;           te[15]=1;
    return this;
  }

  // Invert a 4x4 matrix (general case)
  getInverse(m) {
    const me = m.e, te = this.e;
    const n11=me[0],n21=me[1],n31=me[2],n41=me[3];
    const n12=me[4],n22=me[5],n32=me[6],n42=me[7];
    const n13=me[8],n23=me[9],n33=me[10],n43=me[11];
    const n14=me[12],n24=me[13],n34=me[14],n44=me[15];
    const t11=n23*n34*n42-n24*n33*n42+n24*n32*n43-n22*n34*n43-n23*n32*n44+n22*n33*n44;
    const t12=n14*n33*n42-n13*n34*n42-n14*n32*n43+n12*n34*n43+n13*n32*n44-n12*n33*n44;
    const t13=n13*n24*n42-n14*n23*n42+n14*n22*n43-n12*n24*n43-n13*n22*n44+n12*n23*n44;
    const t14=n14*n23*n32-n13*n24*n32-n14*n22*n33+n12*n24*n33+n13*n22*n34-n12*n23*n34;
    const det=n11*t11+n21*t12+n31*t13+n41*t14;
    if (det === 0) { this.identity(); return this; }
    const d = 1/det;
    te[0]=t11*d;
    te[1]=(n24*n33*n41-n23*n34*n41-n24*n31*n43+n21*n34*n43+n23*n31*n44-n21*n33*n44)*d;
    te[2]=(n22*n34*n41-n24*n32*n41+n24*n31*n42-n21*n34*n42-n22*n31*n44+n21*n32*n44)*d;
    te[3]=(n23*n32*n41-n22*n33*n41-n23*n31*n42+n21*n33*n42+n22*n31*n43-n21*n32*n43)*d;
    te[4]=t12*d;
    te[5]=(n13*n34*n41-n14*n33*n41+n14*n31*n43-n11*n34*n43-n13*n31*n44+n11*n33*n44)*d;
    te[6]=(n14*n32*n41-n12*n34*n41-n14*n31*n42+n11*n34*n42+n12*n31*n44-n11*n32*n44)*d;
    te[7]=(n12*n33*n41-n13*n32*n41+n13*n31*n42-n11*n33*n42-n12*n31*n43+n11*n32*n43)*d;
    te[8]=t13*d;
    te[9]=(n14*n23*n41-n13*n24*n41-n14*n21*n43+n11*n24*n43+n13*n21*n44-n11*n23*n44)*d;
    te[10]=(n12*n24*n41-n14*n22*n41+n14*n21*n42-n11*n24*n42-n12*n21*n44+n11*n22*n44)*d;
    te[11]=(n13*n22*n41-n12*n23*n41-n13*n21*n42+n11*n23*n42+n12*n21*n43-n11*n22*n43)*d;
    te[12]=t14*d;
    te[13]=(n13*n24*n31-n14*n23*n31+n14*n21*n33-n11*n24*n33-n13*n21*n34+n11*n23*n34)*d;
    te[14]=(n14*n22*n31-n12*n24*n31-n14*n21*n32+n11*n24*n32+n12*n21*n34-n11*n22*n34)*d;
    te[15]=(n12*n23*n31-n13*n22*n31+n13*n21*n32-n11*n23*n32-n12*n21*n33+n11*n22*n33)*d;
    return this;
  }

  // Transform a point (x,y,z) by this matrix, return [x,y,z]
  transformPoint(x, y, z) {
    const e = this.e;
    return [
      e[0]*x + e[4]*y + e[8]*z + e[12],
      e[1]*x + e[5]*y + e[9]*z + e[13],
      e[2]*x + e[6]*y + e[10]*z + e[14],
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SPHERICAL COORDINATES (matches Three.js Spherical)
// ═══════════════════════════════════════════════════════════════════════════

function cartesianToSpherical(x, y, z) {
  const r = Math.sqrt(x*x + y*y + z*z);
  if (r === 0) return { r: 0, theta: 0, phi: 0 };
  return {
    r,
    theta: Math.atan2(x, z),   // Three.js: theta = atan2(x, z)
    phi: Math.acos(Math.min(1, Math.max(-1, y / r))),  // Three.js: phi = acos(y/r)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE GRAPH NODE
// ═══════════════════════════════════════════════════════════════════════════

// Each node represents a Three.js Object3D with:
//   position (x,y,z), rotation (x,y,z in radians), children
// The "local matrix" is composed from position + rotation.
// The "world matrix" = parent.worldMatrix * localMatrix.

class Node {
  constructor(name) {
    this.name = name;
    this.px = 0; this.py = 0; this.pz = 0;  // position
    this.rx = 0; this.ry = 0; this.rz = 0;  // rotation (radians)
    this.localMatrix = new Mat4();
    this.worldMatrix = new Mat4();
    this.children = [];
    this.parent = null;
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  updateWorldMatrix() {
    this.localMatrix.compose(this.px, this.py, this.pz, this.rx, this.ry, this.rz);
    if (this.parent) {
      this.worldMatrix.multiplyMatrices(this.parent.worldMatrix, this.localMatrix);
    } else {
      this.worldMatrix.copy(this.localMatrix);
    }
    for (const child of this.children) child.updateWorldMatrix();
  }

  getWorldPosition() {
    return [this.worldMatrix.e[12], this.worldMatrix.e[13], this.worldMatrix.e[14]];
  }

  worldToLocal(wx, wy, wz) {
    const inv = new Mat4().getInverse(this.worldMatrix);
    return inv.transformPoint(wx, wy, wz);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Replicate createPlanet's 3-level structure
// ═══════════════════════════════════════════════════════════════════════════
//
// In script.js, createPlanet(pd) builds:
//   containerObj (= orbitContainer) — applies orbitTiltA/B as rotation.x/z, orbitCenter as position
//     └─ orbitObj (= orbit)        — rotation.y = θ for circular orbits
//        └─ pivotObj (= pivot)     — position.x = a (semi-major axis)
//           └─ rotationAxis        — position = pivot.position, rotation.z = tilt, rotation.x = tiltb
//
// For circular orbits:  orbit.rotation.y = θ, pivot at (radius, 0, 0)
// For elliptic orbits:  orbit.rotation.y = 0, pivot.position = (a*cos(θ), 0, b*sin(θ))

function makeObjectNodes(name, def) {
  const d2r = Math.PI / 180;
  const container = new Node(name + '.container');
  container.rx = (def.orbitTilta || 0) * d2r;
  container.rz = (def.orbitTiltb || 0) * d2r;
  container.px = def.orbitCentera || 0;
  container.py = def.orbitCenterc || 0;
  container.pz = def.orbitCenterb || 0;

  const orbit = new Node(name + '.orbit');
  container.addChild(orbit);

  const a = def.orbitSemiMajor !== undefined ? def.orbitSemiMajor : def.orbitRadius;
  const b = def.orbitSemiMinor !== undefined ? def.orbitSemiMinor : def.orbitRadius;
  const isEllipse = a !== b;

  const pivot = new Node(name + '.pivot');
  if (!isEllipse) {
    pivot.px = a;  // will be rotated by orbit.ry
  }
  orbit.addChild(pivot);

  // rotationAxis is a SIBLING of pivot (both children of orbit), not a child of pivot.
  // It has the same position as pivot but additionally applies axial tilt.
  // This matches script.js createPlanet: orbit.add(pivot); orbit.add(rotationAxis);
  const rotAxis = new Node(name + '.rotationAxis');
  rotAxis.rz = (def.tilt || 0) * d2r;
  if (def.tiltb) rotAxis.rx = def.tiltb * d2r;
  if (!isEllipse) {
    rotAxis.px = a;  // same position as pivot
  }
  orbit.addChild(rotAxis);

  return { container, orbit, pivot, rotAxis, a, b, isEllipse, def };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD THE COMPLETE SCENE GRAPH
// ═══════════════════════════════════════════════════════════════════════════

// Pre-compute all the per-planet derived values we need
const H = C.H;
const d2r = Math.PI / 180;
const sDay = 1 / C.meanSolarYearDays;
const correctionYears = C.correctionDays / C.meanSolarYearDays;
const startModelYearWithCorrection = C.startmodelYear + correctionYears;

// Ascending node frame corrections from ASTRO_REFERENCE (see constants.js)
const ascNodeToolCorrection = C.ASTRO_REFERENCE.ascNodeTiltCorrection;

// Per-planet variables computed from constants (replicating script.js lines 1687-1770)
function getPlanetSceneData(key) {
  const p = C.planets[key];
  if (!p) return null;
  const d = C.derived[key];

  // Perihelion ecliptic years (already in constants)
  const perihelionEclipticYears = p.perihelionEclipticYears;

  // lowestPoint (Type I only)
  const lowestPoint = 180 - p.ascendingNode;

  // Orbit center for PerihelionFromEarth layer
  const longPeri = p.longitudePerihelion;
  const angleCorr = p.angleCorrection;
  const periDist = d.perihelionDistance;
  const periFromEarthA = Math.cos((longPeri + angleCorr + 90) * d2r) * periDist;
  const periFromEarthB = Math.cos((90 - (longPeri + angleCorr - 90)) * d2r) * periDist;

  // Ascending node corrected for planet-level tilt placement
  const correctedAscNode = p.ascendingNode + (ascNodeToolCorrection[key] || 0);

  // RealPerihelion tilts (ecliptic inclination decomposed via corrected ascending node)
  const realPeriTiltA = Math.cos((-90 - correctedAscNode) * d2r) * -p.eclipticInclinationJ2000;
  const realPeriTiltB = Math.sin((-90 - correctedAscNode) * d2r) * -p.eclipticInclinationJ2000;

  // Speed for RealPerihelionAtSun — differs by type
  let realPeriSpeed, realPeriStartPos;
  if (p.type === 'I') {
    realPeriSpeed = -Math.PI * 2;
    realPeriStartPos = lowestPoint;
  } else if (p.type === 'II') {
    realPeriSpeed = -Math.PI * 2 + (2 * Math.PI * 2 / (H / d.solarYearCount));
    realPeriStartPos = p.startpos * 2;
  } else { // Type III
    realPeriSpeed = -Math.PI * 2;
    realPeriStartPos = p.startpos * 2;
  }

  // Elliptic orbit radius — sign differs for Saturn (negative in script.js)
  let elipticOrbitRadius = d.elipticOrbit;
  if (key === 'saturn') elipticOrbitRadius = -elipticOrbitRadius;

  // Planet orbital speed (Mars is negative, all others positive)
  const planetSpeed = (key === 'mars')
    ? -Math.PI * 2 / (H / d.solarYearCount)
    : Math.PI * 2 / (H / d.solarYearCount);

  // Orbit radius in scene units
  const orbitRadiusScene = d.orbitDistance * 100;

  return {
    key, p, d, perihelionEclipticYears, lowestPoint,
    periFromEarthA, periFromEarthB,
    realPeriTiltA, realPeriTiltB,
    realPeriSpeed, realPeriStartPos,
    elipticOrbitRadius, planetSpeed, orbitRadiusScene,
  };
}

function buildSceneGraph() {
  // Root
  const root = new Node('startingPoint');

  // ─── EARTH CHAIN ───────────────────────────────────────────────
  const earthDef = {
    orbitTilta: 0, orbitTiltb: 0,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitRadius: -C.eccentricityAmplitude * 100,
    tilt: -C.earthtiltMean,
    startPos: 0,
    speed: -Math.PI * 2 / (H / 13),
  };
  const earthNodes = makeObjectNodes('earth', earthDef);

  // Apply the static 90° rotation to earth.container (line 4993)
  earthNodes.container.ry = Math.PI / 2;

  root.addChild(earthNodes.container);

  // Earth precession layers (each is a "virtual" object with speed + tilt)
  function makePrecessionNode(name, def) {
    const n = makeObjectNodes(name, def);
    return n;
  }

  const earthInclPrec = makePrecessionNode('earthInclinationPrecession', {
    orbitRadius: 0, orbitTilta: 0, orbitTiltb: 0,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    tilt: 0,
    startPos: (C.balancedYear - startModelYearWithCorrection) / (H / 3) * 360,
    speed: Math.PI * 2 / (H / 3),
  });
  earthNodes.pivot.addChild(earthInclPrec.container);

  const earthEclipPrec = makePrecessionNode('earthEclipticPrecession', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: -C.earthInvPlaneInclinationAmplitude,
    tilt: 0,
    startPos: (C.balancedYear - startModelYearWithCorrection) / (H / 5) * 360,
    speed: Math.PI * 2 / (H / 5),
  });
  earthInclPrec.pivot.addChild(earthEclipPrec.container);

  const earthObliqPrec = makePrecessionNode('earthObliquityPrecession', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: C.earthInvPlaneInclinationAmplitude,
    tilt: 0,
    startPos: -((C.balancedYear - startModelYearWithCorrection) / (H / 8) * 360),
    speed: -Math.PI * 2 / (H / 8),
  });
  earthEclipPrec.pivot.addChild(earthObliqPrec.container);

  const earthPeriPrec1 = makePrecessionNode('earthPerihelionPrecession1', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: -C.earthRAAngle, orbitTiltb: 0,
    tilt: 0,
    startPos: (C.balancedYear - startModelYearWithCorrection) / (H / 16) * 360,
    speed: Math.PI * 2 / (H / 16),
  });
  earthObliqPrec.pivot.addChild(earthPeriPrec1.container);

  const earthPeriPrec2 = makePrecessionNode('earthPerihelionPrecession2', {
    orbitRadius: 0,
    orbitCentera: -C.eccentricityBase * 100, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,
    tilt: 0,
    startPos: -((C.balancedYear - startModelYearWithCorrection) / (H / 16) * 360),
    speed: -Math.PI * 2 / (H / 16),
  });
  earthPeriPrec1.pivot.addChild(earthPeriPrec2.container);

  const barycenter = makePrecessionNode('barycenter', {
    orbitRadius: C.eccentricityAmplitude * 100,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,
    tilt: 0,
    startPos: 0, speed: 0,
  });
  earthPeriPrec2.pivot.addChild(barycenter.container);

  // Sun (under barycenter)
  const sunDef = {
    orbitRadius: 100, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,
    tilt: -7.155,
    startPos: C.correctionSun,
    speed: Math.PI * 2,
    eccentricity: C.eocEccentricity,
    _eccentricityKey: 'earth',
    _eocDerived: true,  // Sun EoC = e_dynamic - e_base/2
    perihelionPhaseJ2000: -C.correctionSun * d2r - 2 * Math.PI * (C.startmodelJD - C.perihelionRefJD) / C.meanSolarYearDays + C.perihelionPhaseOffset * d2r,
    perihelionPrecessionRate: Math.PI * 2 / C.perihelionCycleLength, // perihelion advances at H/16 rate
  };
  const sunNodes = makeObjectNodes('sun', sunDef);
  barycenter.pivot.addChild(sunNodes.container);

  // ─── MOON CHAIN (under earth.pivot) ────────────────────────────
  const moonApsidalPrec = makePrecessionNode('moonApsidalPrecession', {
    orbitRadius: -(C.moonDistance / C.currentAUDistance) * (C.moonOrbitalEccentricity * 100),
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, // apsidal precession rotates perigee within the orbital plane — no plane tilt
    tilt: 0,
    startPos: C.moonStartposApsidal,
    speed: (Math.PI * 2) / (C.moonApsidalPrecessionDaysEarth / C.meanSolarYearDays),
  });
  earthNodes.pivot.addChild(moonApsidalPrec.container);

  const moonApsNodalPrec1 = makePrecessionNode('moonApsidalNodalPrecession1', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: C.moonStartposApsidal - C.moonStartposNodal,
    speed: -(Math.PI * 2) / (C.moonApsidalMeetsNodalDays / C.meanSolarYearDays),
  });
  moonApsidalPrec.pivot.addChild(moonApsNodalPrec1.container);

  const moonApsNodalPrec2 = makePrecessionNode('moonApsidalNodalPrecession2', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: -(C.moonStartposApsidal - C.moonStartposNodal),
    speed: (Math.PI * 2) / (C.moonApsidalMeetsNodalDays / C.meanSolarYearDays),
  });
  moonApsNodalPrec1.pivot.addChild(moonApsNodalPrec2.container);

  const moonLunarLevel = makePrecessionNode('moonLunarLevelingCycle', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0, tilt: 0,
    startPos: 360 - C.moonStartposApsidal - C.moonStartposNodal,
    speed: -(Math.PI * 2) / (C.moonLunarLevelingCycleDays / C.meanSolarYearDays),
  });
  moonApsNodalPrec2.pivot.addChild(moonLunarLevel.container);

  const moonNodalPrec = makePrecessionNode('moonNodalPrecession', {
    orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: Math.cos((-90 + 180) * d2r) * -C.moonEclipticInclinationJ2000,
    orbitTiltb: Math.sin((-90 + 180) * d2r) * -C.moonEclipticInclinationJ2000,
    tilt: 0,
    startPos: C.moonStartposNodal,
    speed: -(Math.PI * 2) / (C.moonNodalPrecessionDaysEarth / C.meanSolarYearDays),
  });
  moonLunarLevel.pivot.addChild(moonNodalPrec.container);

  const moonDef = {
    orbitRadius: (C.moonDistance / C.currentAUDistance) * 100,
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: 0, orbitTiltb: 0,
    tilt: -C.moonTilt,
    startPos: C.moonStartposMoon,
    speed: (Math.PI * 2) / (1 / (C.meanSolarYearDays / C.moonTropicalMonth)),
    eccentricity: C.moonOrbitalEccentricity,
    lunarPerturbations: true,
  };
  const moonNodes = makeObjectNodes('moon', moonDef);
  moonNodalPrec.pivot.addChild(moonNodes.container);

  // ─── PLANET CHAINS (under barycenter.pivot) ────────────────────
  const planetNodeMap = {};

  for (const key of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const pd = getPlanetSceneData(key);
    if (!pd) continue;

    // Layer 1: PerihelionDurationEcliptic1
    const eclip1 = makePrecessionNode(key + 'PerihelionDurationEcliptic1', {
      orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0, tilt: 0,
      startPos: 0,
      speed: Math.PI * 2 / pd.perihelionEclipticYears,
    });
    barycenter.pivot.addChild(eclip1.container);

    // Layer 2: PerihelionFromEarth
    const periFromE = makePrecessionNode(key + 'PerihelionFromEarth', {
      orbitRadius: 0,
      orbitCentera: pd.periFromEarthA, orbitCenterb: pd.periFromEarthB, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0, tilt: 0,
      startPos: 0,
      speed: Math.PI * 2,
    });
    eclip1.pivot.addChild(periFromE.container);

    // Layer 3: PerihelionDurationEcliptic2
    const eclip2 = makePrecessionNode(key + 'PerihelionDurationEcliptic2', {
      orbitRadius: 0, orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0, tilt: 0,
      startPos: 0,
      speed: -Math.PI * 2 / pd.perihelionEclipticYears,
    });
    periFromE.pivot.addChild(eclip2.container);

    // Layer 4: RealPerihelionAtSun
    // NOTE: Orbital plane tilt is applied at the PLANET container level (below the
    // annual rotation), not here. Placing it here causes the tilt's latitude effect
    // to oscillate annually in the tilted frame; at opposition dates (which recur at
    // the synodic period), the combined angle changes by exactly -2pi, making the
    // sampled latitude constant. Moving the tilt below the annual rotation ensures
    // the latitude varies with the planet's sidereal orbital angle.
    const realPeri = makePrecessionNode(key + 'RealPerihelionAtSun', {
      orbitRadius: pd.elipticOrbitRadius,
      orbitCentera: 100, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0,
      tilt: 0,
      startPos: pd.realPeriStartPos,
      speed: pd.realPeriSpeed,
    });
    eclip2.pivot.addChild(realPeri.container);

    // Planet itself — orbital plane tilt applied here (below annual rotation)
    const planetDef = {
      orbitRadius: pd.orbitRadiusScene,
      orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: pd.realPeriTiltA, orbitTiltb: pd.realPeriTiltB,
      tilt: 0,  // tilt only affects axial spin, not position
      startPos: pd.p.startpos,
      speed: pd.planetSpeed,
      eccentricity: pd.p.orbitalEccentricityJ2000,
    };
    // Add equation of center (variable speed) for planets
    const periRefMap = {
      mercury: C.ASTRO_REFERENCE.mercuryPerihelionRef_JD,
      venus: C.ASTRO_REFERENCE.venusPerihelionRef_JD,
      mars: C.ASTRO_REFERENCE.marsPerihelionRef_JD,
      jupiter: C.ASTRO_REFERENCE.jupiterPerihelionRef_JD,
      saturn: C.ASTRO_REFERENCE.saturnPerihelionRef_JD,
      uranus: C.ASTRO_REFERENCE.uranusPerihelionRef_JD,
      neptune: C.ASTRO_REFERENCE.neptunePerihelionRef_JD,
    };
    if (periRefMap[key]) {
      const periPrecRate = Math.PI * 2 / pd.perihelionEclipticYears;
      const pos_peri = (periRefMap[key] - C.startmodelJD) / C.meanSolarYearDays;
      // Type III: per-planet EoC fraction to correct for double-counting with geometric offset
      planetDef.eccentricity = pd.p.orbitalEccentricityJ2000 * (pd.p.eocFraction ?? 0.5);
      planetDef._eccentricityKey = key;
      planetDef._eocFraction = pd.p.eocFraction ?? 0.5;
      planetDef.perihelionPhaseJ2000 = -pd.p.startpos * d2r
        + (pd.planetSpeed - periPrecRate) * pos_peri;
      planetDef.perihelionPrecessionRate = periPrecRate;
    }
    const planetNodes = makeObjectNodes(key, planetDef);
    realPeri.pivot.addChild(planetNodes.container);

    planetNodeMap[key] = {
      eclip1, periFromE, eclip2, realPeri,
      planet: planetNodes,
      sceneData: pd,
    };
  }

  return {
    root, earthNodes, sunNodes, moonNodes, barycenter,
    earthInclPrec, earthEclipPrec, earthObliqPrec,
    earthPeriPrec1, earthPeriPrec2,
    moonApsidalPrec, moonApsNodalPrec1, moonApsNodalPrec2,
    moonLunarLevel, moonNodalPrec,
    planetNodeMap,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC ECLIPTIC INCLINATION — From invariable plane dynamics
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the dynamic ecliptic inclination for a planet at a given time.
 *
 * Replicates the logic from script.js:
 *   computeInclinationEarth() — Earth's inv. plane inclination oscillation
 *   computePlanetInvPlaneInclinationDynamic() — planet's inv. plane oscillation
 *   updateDynamicInclinations() — normal vector dot product → ecliptic inclination
 *
 * @param {string} key — planet key (e.g. 'saturn')
 * @param {number} yearsSinceBalanced — years since the balanced year epoch
 * @returns {number} ecliptic inclination in degrees
 */
function computeDynamicEclipticInclination(key, yearsSinceBalanced) {
  const p = C.planets[key];

  // --- Earth's orbital plane normal in invariable plane coords ---
  // Earth: i = mean - amplitude × cos(2π × years / (H/3))
  const earthPrecYears = C.ASTRO_REFERENCE.earthInvPlanePrecessionYears;
  const earthPhaseRad = (yearsSinceBalanced / earthPrecYears) * 2 * Math.PI;
  const earthI = (C.earthInvPlaneInclinationMean
    - C.earthInvPlaneInclinationAmplitude * Math.cos(earthPhaseRad)) * d2r;

  // Earth Ω on invariable plane (precesses at 360/period per year)
  const earthOmegaRate = 360 / earthPrecYears;
  const earthOmega = (C.ASTRO_REFERENCE.earthAscendingNodeInvPlane
    - earthOmegaRate * C.yearsFromBalancedToJ2000
    + earthOmegaRate * yearsSinceBalanced) * d2r;

  // --- Planet's orbital plane normal ---
  // Planet: i = mean + amplitude × cos(Ω - phaseAngle)
  const planetOmegaRate = 360 / p.perihelionEclipticYears;
  const planetOmegaDeg = p.ascendingNodeInvPlane
    - planetOmegaRate * C.yearsFromBalancedToJ2000
    + planetOmegaRate * yearsSinceBalanced;
  const planetOmega = planetOmegaDeg * d2r;

  const planetPhaseDeg = planetOmegaDeg - p.inclinationPhaseAngle;
  const planetI = (p.invPlaneInclinationMean
    + p.invPlaneInclinationAmplitude * Math.cos(planetPhaseDeg * d2r)) * d2r;

  // --- Dot product of normal vectors → angle between orbital planes ---
  const eNx = Math.sin(earthI) * Math.sin(earthOmega);
  const eNy = Math.sin(earthI) * Math.cos(earthOmega);
  const eNz = Math.cos(earthI);

  const pNx = Math.sin(planetI) * Math.sin(planetOmega);
  const pNy = Math.sin(planetI) * Math.cos(planetOmega);
  const pNz = Math.cos(planetI);

  const cosAngle = eNx * pNx + eNy * pNy + eNz * pNz;
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE MODEL — Update all rotations/positions for a given pos
// ═══════════════════════════════════════════════════════════════════════════

function moveModel(graph, pos) {
  // Compute dynamic eccentricities for all planets (oscillate at H/16)
  const currentYear = C.balancedYear + (C.startmodelJD + pos * C.meanSolarYearDays - C.balancedJD) / C.meanSolarYearDays;
  const dynEcc = { earth: OE.computeEccentricity(currentYear, C.balancedYear, C.perihelionCycleLength, C.eccentricityBase, C.eccentricityAmplitude) };
  for (const [key, p] of Object.entries(C.planets)) {
    if (p.eccentricityPhaseJ2000 !== undefined) {
      const refYear = 2000 - (p.eccentricityPhaseJ2000 / 360) * C.perihelionCycleLength;
      dynEcc[key] = OE.computeEccentricity(currentYear, refYear, C.perihelionCycleLength, p.orbitalEccentricityBase, p.orbitalEccentricityAmplitude);
    }
  }

  // Update each "animated" object: orbit.ry = θ for circular, pivot.position for ellipse
  function animateObject(nodes, def) {
    let θ = def.speed * pos - def.startPos * d2r;
    if (C.useVariableSpeed && def.eccentricity && def.perihelionPhaseJ2000 !== undefined) {
      let e;
      if (def._eccentricityKey && dynEcc[def._eccentricityKey] !== undefined) {
        e = def._eocDerived
          ? dynEcc[def._eccentricityKey] - C.eccentricityBase / 2   // Sun: eoc = e_dynamic - e_base/2
          : dynEcc[def._eccentricityKey] * def._eocFraction;        // Planets: eoc = e_dynamic × fraction
      } else {
        e = def.eccentricity;                                        // Moon, Pluto, etc: static
      }
      const perihelionPhase = def.perihelionPhaseJ2000 + (def.perihelionPrecessionRate || 0) * pos;
      const M = θ - perihelionPhase;
      θ += 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
    }
    // Full Meeus Ch. 47 lunar perturbations (longitude + latitude, 60+60 terms)
    // Meeus formulas require T from standard J2000.0 (JD 2451545.0) in Julian centuries (36525 days)
    if (C.useVariableSpeed && def.lunarPerturbations) {
      const d = (C.startmodelJD - 2451545.0) + pos * C.meanSolarYearDays;
      const T = d / 36525;
      const T2 = T * T, T3 = T2 * T, T4 = T3 * T;

      // Fundamental arguments from centralized Meeus tables
      const FA = MEEUS_LUNAR.fundamentalArguments;
      const polyEval = (c, T, T2, T3, T4) => c[0] + c[1]*T + c[2]*T2 + c[3]*T3 + (c[4] || 0)*T4;
      const Lp = polyEval(FA.Lp, T, T2, T3, T4) * d2r;
      const Dr = (polyEval(FA.D, T, T2, T3, T4) % 360) * d2r;
      const Mr = (polyEval(FA.M, T, T2, T3, T4) % 360) * d2r;
      const Mpr = (polyEval(FA.Mp, T, T2, T3, T4) % 360) * d2r;
      const Fr = (polyEval(FA.F, T, T2, T3, T4) % 360) * d2r;

      const EC = MEEUS_LUNAR.eccentricityCorrection;
      const E = 1 + EC.e1*T + EC.e2*T2;
      const E2 = E * E;
      const AA = MEEUS_LUNAR.additionalArguments;
      const A1 = (AA.A1[0] + AA.A1[1]*T) * d2r;
      const A2 = (AA.A2[0] + AA.A2[1]*T) * d2r;
      const A3 = (AA.A3[0] + AA.A3[1]*T) * d2r;

      // Table 47.A longitude terms from centralized tables
      const ML = MEEUS_LUNAR.longitudeTerms.terms;
      let Sl = 0;
      for (let i = 0; i < ML.length; i++) {
        const r = ML[i];
        const arg = r[0]*Dr + r[1]*Mr + r[2]*Mpr + r[3]*Fr;
        let term = r[4] * Math.sin(arg);
        const absM = r[1] < 0 ? -r[1] : r[1];
        if (absM === 1) term *= E;
        else if (absM === 2) term *= E2;
        Sl += term;
      }
      const LC = MEEUS_LUNAR.longitudeCorrections;
      Sl += LC.A1*Math.sin(A1) + LC.LpMinusF*Math.sin(Lp - Fr) + LC.A2*Math.sin(A2);
      const eocHalf = C.moonOrbitalEccentricity / 2;
      Sl -= (2 * eocHalf / d2r * 1e6) * Math.sin(Mpr);
      Sl -= (1.25 * eocHalf * eocHalf / d2r * 1e6) * Math.sin(2*Mpr);
      θ += Sl * 1e-6 * d2r;

      // Table 47.B latitude terms from centralized tables
      const MB = MEEUS_LUNAR.latitudeTerms.terms;
      let Sb = 0;
      for (let i = 0; i < MB.length; i++) {
        const r = MB[i];
        const arg = r[0]*Dr + r[1]*Mr + r[2]*Mpr + r[3]*Fr;
        let term = r[4] * Math.sin(arg);
        const absM = r[1] < 0 ? -r[1] : r[1];
        if (absM === 1) term *= E;
        else if (absM === 2) term *= E2;
        Sb += term;
      }
      const BC = MEEUS_LUNAR.latitudeCorrections;
      Sb += BC.Lp*Math.sin(Lp) + BC.A3*Math.sin(A3);
      Sb += BC.A1minusF*Math.sin(A1 - Fr) + BC.A1plusF*Math.sin(A1 + Fr);
      Sb += BC.LpMinusMp*Math.sin(Lp - Mpr) + BC.LpPlusMp*Math.sin(Lp + Mpr);
      nodes._meeusLatDeg = Sb * 1e-6;

      // Full Meeus ecliptic longitude for post-hoc RA override
      const fullSl = Sl + (2 * eocHalf / d2r * 1e6) * Math.sin(Mpr)
                       + (1.25 * eocHalf * eocHalf / d2r * 1e6) * Math.sin(2*Mpr);
      nodes._meeusLonDeg = Lp / d2r + fullSl * 1e-6 + C.moonMeeusLpCorrection;
      nodes._meeusT = T;
    }
    if (nodes.isEllipse) {
      const x = Math.cos(θ) * nodes.a;
      const z = Math.sin(θ) * nodes.b;
      nodes.pivot.px = x;
      nodes.pivot.pz = z;
      nodes.rotAxis.px = x;
      nodes.rotAxis.pz = z;
      nodes.orbit.ry = 0;
    } else {
      nodes.orbit.ry = θ;
    }
  }

  // Earth
  animateObject(graph.earthNodes, graph.earthNodes.def);

  // Earth precession layers
  const precLayers = [
    [graph.earthInclPrec, graph.earthInclPrec.def],
    [graph.earthEclipPrec, graph.earthEclipPrec.def],
    [graph.earthObliqPrec, graph.earthObliqPrec.def],
    [graph.earthPeriPrec1, graph.earthPeriPrec1.def],
    [graph.earthPeriPrec2, graph.earthPeriPrec2.def],
    [graph.barycenter, graph.barycenter.def],
  ];
  for (const [nodes, def] of precLayers) animateObject(nodes, def);

  // Sun
  animateObject(graph.sunNodes, graph.sunNodes.def);

  // Moon chain
  const moonLayers = [
    graph.moonApsidalPrec, graph.moonApsNodalPrec1, graph.moonApsNodalPrec2,
    graph.moonLunarLevel, graph.moonNodalPrec,
  ];
  for (const nodes of moonLayers) animateObject(nodes, nodes.def);
  animateObject(graph.moonNodes, graph.moonNodes.def);

  // Dynamic Earth ecliptic perihelion longitude (for geocentric elipticOrbit)
  const earthPeriPrec1Angle = graph.earthPeriPrec1.orbit.ry;
  const earthPeriEcl = ((earthPeriPrec1Angle + C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 * d2r) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  // Compute yearsSinceBalanced for dynamic ecliptic inclination
  const currentJD = C.startmodelJD + pos * C.meanSolarYearDays;
  const yearsSinceBalanced = (currentJD - C.balancedJD) / C.meanSolarYearDays;

  // Planets
  for (const key of Object.keys(graph.planetNodeMap)) {
    const pm = graph.planetNodeMap[key];
    animateObject(pm.eclip1, pm.eclip1.def);
    animateObject(pm.periFromE, pm.periFromE.def);
    animateObject(pm.eclip2, pm.eclip2.def);

    // Dynamic geocentric elipticOrbit for Type II + III planets
    if (pm.sceneData && (pm.sceneData.p.type === 'III' || pm.sceneData.p.type === 'II')) {
      const planetPrecAngle = pm.eclip1.orbit.ry;
      const planetPeriEcl = ((planetPrecAngle + pm.sceneData.p.longitudePerihelion * d2r) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const dw = earthPeriEcl - planetPeriEcl;
      let eo = 2 * dynEcc.earth * 100 * Math.sin(dw);
      if (key === 'saturn') eo = -eo;
      if (pm.sceneData.p.type === 'II') {
        // Type II: Mars orbit center offset + half Earth geocentric correction
        const eccDist = (dynEcc[key] || pm.sceneData.p.orbitalEccentricityJ2000) * pm.sceneData.d.orbitDistance * 100;
        eo = eccDist / 2 - eo / 2;
      }
      pm.realPeri.pivot.px = eo;
      pm.realPeri.rotAxis.px = eo;
    }

    // Dynamic orbital plane: update planet container tilt from dynamic ecliptic inclination
    if (pm.sceneData && pm.sceneData.p.ascendingNodeInvPlane !== undefined) {
      const dynamicIncl = computeDynamicEclipticInclination(key, yearsSinceBalanced);
      const correctedAscNode = pm.sceneData.p.ascendingNode + (ascNodeToolCorrection[key] || 0);
      const angle = (-90 - correctedAscNode) * d2r;
      pm.planet.container.rx = Math.cos(angle) * -dynamicIncl * d2r;
      pm.planet.container.rz = Math.sin(angle) * -dynamicIncl * d2r;
    }

    animateObject(pm.realPeri, pm.realPeri.def);
    animateObject(pm.planet, pm.planet.def);
  }

  // Update all world matrices from root
  graph.root.updateWorldMatrix();
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTE PLANET POSITION — Main entry point
// ═══════════════════════════════════════════════════════════════════════════

// Cache the scene graph (built once, reused)
let _graph = null;
function getGraph() {
  if (!_graph) _graph = buildSceneGraph();
  return _graph;
}

/** Invalidate cached scene graph (forces rebuild on next use). */
function _invalidateGraph() {
  _graph = null;
}

/**
 * Compute geocentric RA/Dec for a planet or the Moon at a given Julian Day.
 *
 * @param {string} target - 'mercury','venus','mars','jupiter','saturn','uranus','neptune','moon','sun'
 * @param {number} jd - Julian Day number
 * @returns {{ ra: number, dec: number, distAU: number, sunDistAU: number }}
 *   ra/dec in radians (Three.js spherical convention: theta/phi)
 */
function computePlanetPosition(target, jd) {
  const graph = getGraph();

  // Convert JD to pos (script.js: pos = sDay * (jd - startmodelJD))
  const pos = sDay * (jd - C.startmodelJD);

  // Animate all objects
  moveModel(graph, pos);

  // Get Earth reference frame (rotationAxis world matrix)
  const earthRotAxisWP = graph.earthNodes.rotAxis.getWorldPosition();

  // Get target world position
  let targetWP;
  if (target === 'moon') {
    targetWP = graph.moonNodes.pivot.getWorldPosition();
  } else if (target === 'sun') {
    targetWP = graph.sunNodes.pivot.getWorldPosition();
  } else {
    const pm = graph.planetNodeMap[target];
    if (!pm) throw new Error(`Unknown target: ${target}`);
    targetWP = pm.planet.pivot.getWorldPosition();
  }

  // Get Sun world position for sun distance
  const sunWP = graph.sunNodes.pivot.getWorldPosition();

  // Distance from Earth
  const dx = targetWP[0] - earthRotAxisWP[0];
  const dy = targetWP[1] - earthRotAxisWP[1];
  const dz = targetWP[2] - earthRotAxisWP[2];
  const distAU = Math.sqrt(dx*dx + dy*dy + dz*dz) / 100;

  // Distance from Sun
  const sdx = targetWP[0] - sunWP[0];
  const sdy = targetWP[1] - sunWP[1];
  const sdz = targetWP[2] - sunWP[2];
  const sunDistAU = Math.sqrt(sdx*sdx + sdy*sdy + sdz*sdz) / 100;

  // Transform planet world position into Earth's equatorial frame
  // (same as earth.rotationAxis.worldToLocal(PLANET_POS) in script.js)
  const local = graph.earthNodes.rotAxis.worldToLocal(targetWP[0], targetWP[1], targetWP[2]);

  // Convert to spherical (matches Three.js Spherical.setFromVector3)
  const sph = cartesianToSpherical(local[0], local[1], local[2]);

  // Post-hoc RA/Dec corrections for geocentric parallax + precession drift (15/18/24-param)
  // Model: dX = A + B/d + C*T + (D*sin(u) + E*cos(u) + F*sin(2u) + G*cos(2u)
  //              + H*sin(3u) + I*cos(3u))/d + T*(J*sin(u) + K*cos(u))/d
  //              + L/s + M*sin(u)/d² + N*sin(2u)/s + O*cos(u)/s
  //              + P*T*sin(2u)/d + Q*T*cos(2u)/d + R*T*sin(u)/s
  //              + S*T/d + U*cos(u)/d² + V/s² + W*sin(u)/s² + X*cos(3u)/s + Y*sin(3u)/s
  //   where u = RA - ascendingNode, d = geocentric dist, s = sunDist, T = centuries from J2000
  if (target !== 'moon' && target !== 'sun') {
    const ascNode = C.planets[target].ascendingNode;
    const u = (sph.theta / d2r - ascNode) * d2r;
    const invD = 1 / distAU;
    const invD2 = invD * invD;
    const invS = 1 / sunDistAU;
    const invS2 = invS * invS;
    const T = (jd - C.j2000JD) / C.julianCenturyDays;  // centuries from J2000
    const sinU = Math.sin(u), cosU = Math.cos(u);
    const sin2U = Math.sin(2*u), cos2U = Math.cos(2*u);
    const sin3U = Math.sin(3*u), cos3U = Math.cos(3*u);

    // Conjunction phase for Jupiter-Saturn interaction terms (AR-AW)
    const _yr = C.startmodelYear + (jd - C.startmodelJD) / C.meanSolarYearDays;
    const conjPhase = 2 * Math.PI * (_yr - 2000) / C.tripleSynodicYears;
    const sinCP = Math.sin(conjPhase), cosCP = Math.cos(conjPhase);
    const sin2CP = Math.sin(2 * conjPhase), cos2CP = Math.cos(2 * conjPhase);

    const dc = C.ASTRO_REFERENCE.decCorrection[target];
    if (dc) {
      const invDS = invD * invS;
      const corrDec = dc.A + dc.B * invD + (dc.C || 0) * T
        + (dc.D * sinU + dc.E * cosU + dc.F * sin2U + dc.G * cos2U
         + (dc.H || 0) * sin3U + (dc.I || 0) * cos3U) * invD
        + T * ((dc.J || 0) * sinU + (dc.K || 0) * cosU) * invD
        + (dc.L || 0) * invS + (dc.M || 0) * sinU * invD2
        + (dc.N || 0) * sin2U * invS + (dc.O || 0) * cosU * invS
        + (dc.P || 0) * T * sin2U * invD + (dc.Q || 0) * T * cos2U * invD
        + (dc.R || 0) * T * sinU * invS
        + (dc.S || 0) * T * invD + (dc.U || 0) * cosU * invD2
        + (dc.V || 0) * invS2 + (dc.W || 0) * sinU * invS2
        + (dc.X || 0) * cos3U * invS + (dc.Y || 0) * sin3U * invS
        + (dc.Z || 0) * invDS + (dc.AA || 0) * sinU * invDS
        + (dc.AB || 0) * cos2U * invDS + (dc.AC || 0) * T * sin2U * invS
        + (dc.AD || 0) * cos3U * invD2 + (dc.AE || 0) * sin2U * invS2
        + (dc.AF || 0) * sin3U * invS2 + (dc.AG || 0) * cos3U * invS2
        + (dc.AH || 0) * cosU * invS2 + (dc.AI || 0) * sinU * invD2 * invS
        + (dc.AJ || 0) * Math.cos(4*u) * invS + (dc.AK || 0) * sin2U * invD2 * invS
        + (dc.AL || 0) * Math.sin(4*u) * invD + (dc.AM || 0) * Math.cos(4*u) * invD
        + (dc.AN || 0) * T * sinU * invD2 + (dc.AO || 0) * T * cosU * invD2
        + (dc.AP || 0) * sinU * invD2 * invD + (dc.AQ || 0) * cosU * invD2 * invD
        + (dc.AR || 0) * sinCP + (dc.AS || 0) * cosCP
        + (dc.AT || 0) * sin2CP + (dc.AU_ || 0) * cos2CP
        + (dc.AV || 0) * sinCP * invD + (dc.AW || 0) * cosCP * invD;
      sph.phi += corrDec * d2r;
    }

    const rc = C.ASTRO_REFERENCE.raCorrection && C.ASTRO_REFERENCE.raCorrection[target];
    if (rc) {
      const invDS = invD * invS;
      const corrRA = rc.A + rc.B * invD + (rc.C || 0) * T
        + (rc.D * sinU + rc.E * cosU + rc.F * sin2U + rc.G * cos2U
         + (rc.H || 0) * sin3U + (rc.I || 0) * cos3U) * invD
        + T * ((rc.J || 0) * sinU + (rc.K || 0) * cosU) * invD
        + (rc.L || 0) * invS + (rc.M || 0) * sinU * invD2
        + (rc.N || 0) * sin2U * invS + (rc.O || 0) * cosU * invS
        + (rc.P || 0) * T * sin2U * invD + (rc.Q || 0) * T * cos2U * invD
        + (rc.R || 0) * T * sinU * invS
        + (rc.S || 0) * T * invD + (rc.U || 0) * cosU * invD2
        + (rc.V || 0) * invS2 + (rc.W || 0) * sinU * invS2
        + (rc.X || 0) * cos3U * invS + (rc.Y || 0) * sin3U * invS
        + (rc.Z || 0) * invDS + (rc.AA || 0) * sinU * invDS
        + (rc.AB || 0) * cos2U * invDS + (rc.AC || 0) * T * sin2U * invS
        + (rc.AD || 0) * cos3U * invD2 + (rc.AE || 0) * sin2U * invS2
        + (rc.AF || 0) * sin3U * invS2 + (rc.AG || 0) * cos3U * invS2
        + (rc.AH || 0) * cosU * invS2 + (rc.AI || 0) * sinU * invD2 * invS
        + (rc.AJ || 0) * Math.cos(4*u) * invS + (rc.AK || 0) * sin2U * invD2 * invS
        + (rc.AL || 0) * Math.sin(4*u) * invD + (rc.AM || 0) * Math.cos(4*u) * invD
        + (rc.AN || 0) * T * sinU * invD2 + (rc.AO || 0) * T * cosU * invD2
        + (rc.AP || 0) * sinU * invD2 * invD + (rc.AQ || 0) * cosU * invD2 * invD
        + (rc.AR || 0) * sinCP + (rc.AS || 0) * cosCP
        + (rc.AT || 0) * sin2CP + (rc.AU_ || 0) * cos2CP
        + (rc.AV || 0) * sinCP * invD + (rc.AW || 0) * cosCP * invD;
      sph.theta -= corrRA * d2r;
    }
  }

  // Two-stage conjunction correction (post-parallax, per-planet synodic periods)
  const conjCorr = C.CONJUNCTION_CORRECTION && C.CONJUNCTION_CORRECTION[target];
  if (conjCorr) {
    const _yr = C.startmodelYear + (jd - C.startmodelJD) / C.meanSolarYearDays;
    for (const term of conjCorr) {
      const phase = 2 * Math.PI * (_yr - 2000) / term.period;
      const sp = Math.sin(phase), cp = Math.cos(phase);
      sph.theta -= (term.raSin * sp + term.raCos * cp) * d2r;
      sph.phi += (term.decSin * sp + term.decCos * cp) * d2r;
    }
  }

  // Full Meeus Ch. 47 post-hoc correction: override both RA and Dec
  if (target === 'moon' && C.useVariableSpeed &&
      graph.moonNodes._meeusLonDeg !== undefined && graph.moonNodes._meeusLatDeg !== undefined) {
    const T = graph.moonNodes._meeusT || 0;
    const eps = (C.ASTRO_REFERENCE.obliquityJ2000_deg - 0.01300 * T) * d2r;
    const cosE = Math.cos(eps), sinE = Math.sin(eps);
    const lamR = graph.moonNodes._meeusLonDeg * d2r;
    const betR = graph.moonNodes._meeusLatDeg * d2r;
    const sinLam = Math.sin(lamR), cosLam = Math.cos(lamR);
    const sinBet = Math.sin(betR), cosBet = Math.cos(betR);

    let newRA = Math.atan2(sinLam * cosE - Math.tan(betR) * sinE, cosLam);
    if (newRA < 0) newRA += 2 * Math.PI;
    let newDec = Math.asin(sinBet * cosE + cosBet * sinE * sinLam);

    // Post-Meeus RA/Dec correction (fitted to JPL DE440 residuals)
    const mc = C.MOON_CORRECTION;
    if (mc) {
      const dJD = (graph.moonNodes._meeusT || 0) * 36525;  // days from J2000
      const Dc  = (297.850 + 12.19074912 * dJD) * d2r;
      const Mpc = (134.963 + 13.06499295 * dJD) * d2r;
      const Msc = (357.529 + 0.98560028 * dJD) * d2r;
      newRA  -= (mc.raSinD  * Math.sin(Dc) + mc.raCosD  * Math.cos(Dc)
               + mc.raSinMp * Math.sin(Mpc) + mc.raCosMp * Math.cos(Mpc)
               + mc.raSinMs * Math.sin(Msc) + mc.raCosMs * Math.cos(Msc)) * d2r;
      newDec -= (mc.decSinD  * Math.sin(Dc) + mc.decCosD  * Math.cos(Dc)
               + mc.decSinMp * Math.sin(Mpc) + mc.decCosMp * Math.cos(Mpc)
               + mc.decSinMs * Math.sin(Msc) + mc.decCosMs * Math.cos(Msc)) * d2r;
    }

    sph.theta = newRA;
    sph.phi = Math.PI / 2 - newDec;
  }

  return {
    ra: sph.theta,   // radians
    dec: sph.phi,    // radians (Three.js phi convention)
    distAU,
    sunDistAU,
  };
}

/**
 * Convert Three.js spherical dec (phi) to standard declination in degrees.
 * phi in [0, π] → dec in [-90°, +90°]
 */
function phiToDecDeg(phi) {
  const decRad = (phi <= 0) ? phi + Math.PI / 2 : Math.PI / 2 - phi;
  return decRad * (180 / Math.PI);
}

/**
 * Convert Three.js spherical RA (theta) to degrees [0, 360).
 */
function thetaToRaDeg(theta) {
  let deg = theta * (180 / Math.PI);
  return ((deg % 360) + 360) % 360;
}

/**
 * Convert Three.js spherical RA (theta) to hours [0, 24).
 */
function thetaToRaHours(theta) {
  if (theta < 0) theta += 2 * Math.PI;
  return theta * 12 / Math.PI;
}

/**
 * Get Sun's world-space angle (for sidereal year measurement).
 * Returns atan2(z, x) in degrees [0, 360).
 */
function getSunWorldAngle(jd) {
  const graph = getGraph();
  const pos = sDay * (jd - C.startmodelJD);
  moveModel(graph, pos);
  const sunWP = graph.sunNodes.pivot.getWorldPosition();
  let angle = Math.atan2(sunWP[2], sunWP[0]) * 180 / Math.PI;
  return ((angle % 360) + 360) % 360;
}

/**
 * Get WobbleCenter-Sun distance in AU (for perihelion/aphelion detection).
 * Uses the fixed wobble center (scene origin) → Sun, NOT Earth → Sun.
 * This measures the true anomalistic orbit without axial-precession noise.
 */
function getWobbleSunDistAU(jd) {
  const graph = getGraph();
  const pos = sDay * (jd - C.startmodelJD);
  moveModel(graph, pos);
  // WobbleCenter is at the scene origin (0,0,0)
  const sunWP = graph.sunNodes.pivot.getWorldPosition();
  return Math.sqrt(sunWP[0]*sunWP[0] + sunWP[1]*sunWP[1] + sunWP[2]*sunWP[2]) / 100;
}

module.exports = {
  computePlanetPosition,
  getSunWorldAngle,
  getWobbleSunDistAU,
  phiToDecDeg,
  thetaToRaDeg,
  thetaToRaHours,
  buildSceneGraph,
  moveModel,
  _invalidateGraph,
  // Expose internals for testing
  Mat4,
  Node,
  cartesianToSpherical,
};
