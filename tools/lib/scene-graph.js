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

  // RealPerihelion tilts (ecliptic inclination decomposed via ascending node)
  const realPeriTiltA = Math.cos((-90 - p.ascendingNode) * d2r) * -p.eclipticInclinationJ2000;
  const realPeriTiltB = Math.sin((-90 - p.ascendingNode) * d2r) * -p.eclipticInclinationJ2000;

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
    perihelionPhaseJ2000: -C.correctionSun * d2r - 2 * Math.PI * (C.startmodelJD - 2451547.042) / C.meanSolarYearDays + (C.perihelionPhaseOffset || 0) * d2r, // JD 2451547.042 = Earth perihelion 2000
    perihelionPrecessionRate: Math.PI * 2 / C.perihelionCycleLength, // perihelion advances at H/16 rate
  };
  const sunNodes = makeObjectNodes('sun', sunDef);
  barycenter.pivot.addChild(sunNodes.container);

  // ─── MOON CHAIN (under earth.pivot) ────────────────────────────
  const moonApsidalPrec = makePrecessionNode('moonApsidalPrecession', {
    orbitRadius: -(C.moonDistance / C.currentAUDistance) * (C.moonOrbitalEccentricity * 100),
    orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
    orbitTilta: C.moonEclipticInclinationJ2000 - C.moonTilt, orbitTiltb: 0,
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
      startPos: C.correctionSun,
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
    const realPeri = makePrecessionNode(key + 'RealPerihelionAtSun', {
      orbitRadius: pd.elipticOrbitRadius,
      orbitCentera: 100, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: pd.realPeriTiltA, orbitTiltb: pd.realPeriTiltB,
      tilt: 0,
      startPos: pd.realPeriStartPos,
      speed: pd.realPeriSpeed,
    });
    eclip2.pivot.addChild(realPeri.container);

    // Planet itself
    const planetDef = {
      orbitRadius: pd.orbitRadiusScene,
      orbitCentera: 0, orbitCenterb: 0, orbitCenterc: 0,
      orbitTilta: 0, orbitTiltb: 0,
      tilt: 0,  // tilt only affects axial spin, not position
      startPos: pd.p.startpos,
      speed: pd.planetSpeed,
      eccentricity: pd.p.orbitalEccentricity,
    };
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
// MOVE MODEL — Update all rotations/positions for a given pos
// ═══════════════════════════════════════════════════════════════════════════

function moveModel(graph, pos) {
  // Update each "animated" object: orbit.ry = θ for circular, pivot.position for ellipse
  function animateObject(nodes, def) {
    let θ = def.speed * pos - def.startPos * d2r;
    if (C.useVariableSpeed && def.eccentricity && def.perihelionPhaseJ2000 !== undefined) {
      const e = def.eccentricity;
      const perihelionPhase = def.perihelionPhaseJ2000 + (def.perihelionPrecessionRate || 0) * pos;
      const M = θ - perihelionPhase;
      θ += 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
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

  // Planets
  for (const key of Object.keys(graph.planetNodeMap)) {
    const pm = graph.planetNodeMap[key];
    animateObject(pm.eclip1, pm.eclip1.def);
    animateObject(pm.periFromE, pm.periFromE.def);
    animateObject(pm.eclip2, pm.eclip2.def);
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

module.exports = {
  computePlanetPosition,
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
