/*The Interactive 3D Solar System Simulation shows the precession / eccentricity / inclination / obliquity / perihelion date movements of Earth, Moon, Sun and Planets modelled from a geo-heliocentric frame of reference, coming together in a Holistic-Year cycle of 305,952 years, an Axial precession cycle of ~23,535 years, an Inclination precession cycle of 101,984 years and a Perihelion precession cycle of 19,122 years. 

The way it is modelled:
* The EARTH-WOBBLE-CENTER is the center of our solar system.
* Earth is wobbling clockwise around the EARTH-WOBBLE-CENTER in a period of ~23,535 solar years, also known as Axial precession and therefore the Axial tilt changes.
* The HELION-POINT is orbiting the EARTH-WOBBLE-CENTER - and therefore Earth - counter-clockwise in a period of 101,984 solar years, also known as Inclination precession and therefore the inclination tilt changes.
* Axial precession meets Inclination precession every 19,122 years.
* Our Sun is orbiting the HELION-POINT in a period of 1 solar year.
* Therefore it shows as if the Sun is orbiting Earth.

How you could also see it:
* The HELION-POINT is the center of our solar system.
* Earth is wobbling clockwise around the EARTH-WOBBLE-CENTER in a period of ~23,535 solar years, also known as Axial precession and therefore the Axial tilt changes.
* The EARTH-WOBBLE-CENTER - and therefore Earth - is orbiting the HELION-POINT counter-clockwise in a period of 101,984 solar years, also known as Inclination precession and therefore the inclination tilt changes.
* Axial precession meets Inclination precession every 19,122 years.
* Our Sun is orbiting the HELION-POINT in a period of 1 solar year.
* Therefore it shows as if the Sun is orbiting Earth.

What is actually happening:
* The Sun is (still) the center of our solar system.
* Earth is wobbling clockwise around the EARTH-WOBBLE-CENTER in a period of ~23,535 solar years, also known as Axial precession and therefore the Axial tilt changes.
* The HELION-POINT of Earth is orbiting the Sun counter-clockwise in a period of 101,984 solar years, also known as Inclination precession and therefore the inclination tilt changes.
* Axial precession meets Inclination precession every 19,122 years.
* Earth is orbiting the HELION-POINT of Earth - close to the Sun - in a period of 1 solar year.
* Therefore it shows Earth is actually orbiting the Sun.
* So we still live in a Heliocentric solar system

* All planets in our solar system are orbiting the Sun but have a barycenter just outside of the Sun.
* The location of the barycenters of the planets are structured according to the Golden Spiral pattern around the Sun and the planets are orbiting these barycenters according to Kepler’s 3rd law.

Additional explanation to understand the model:
* The inclination (J2000 value ~1.57869°) and axial tilt together result in the obliquity of Earth’s axis (J2000 value +23°26'21").
* There are only two counter movements around Earth working against each other in a ratio of 3:13 ; Inclination:Axial which explains all movements around Earth (precession, eccentricity, obliquity, inclination, etc)
* The currently experienced precession is NOT the mean value and all precession movements are always experienced in the same ratio (e.g. experienced perihelion precession is 13/16th of Axial precession: ~25,771*13/16 = ~20,939 years)
* The Perihelion precession cycle of 19,122 years determines the natural cycles of the length of solar days, sidereal days, solar years, sidereal years and anomalistic years.
* The EARTH-WOBBLE-CENTER was aligned in 1246 AD with the HELION-POINT and therefore the length of solar year in days and the length of sidereal year in seconds were MEAN in 1246 AD.
* The difference between the sidereal day - stellar day leads to the difference solar year – sidereal year because the location of the EARTH-WOBBLE-CENTER is at a MEAN ratio of 1:366.2422341 compared to the Sun: 1 second movement is (mean) amplified ~366.2422341 times.

For more details see https://holisticuniverse.com.

Why is the length of the Holistic-Year 305,952 years? This number fits all observations best:
1. Historic value longitude of perihelion 90°: 1245-12-14
2. Current (J2000) value longitude of perihelion: 6h51m47s = ~102.945°
3. The Length of solar day, solar year in days, sidereal year in seconds aligned to 3D longitude values and historic values
a) 1246 Length of solar day in days was ~365.242236 days (which is ~31,556,929.19 SI seconds in Ephemeris time).
b) 1246 Length of sidereal year in SI seconds was ~31,558,149.6847
c) 1246 Length of solar day was above 86,400 SI seconds because of historic Delta T predictions.
4. Climate graphs with ~100k cycles as a cycle of 305,952 years
5. End of Last Glacial Maximum (LGM) around 21,000 BC and end of Younger dryes around 9800 BC. 
6. The location of the EARTH-WOBBLE-CENTER is at a MEAN ratio of 1:366.2422341 compared to the location the Sun as seen from Earth
7. Obliquity correct both historic and current values
8. Orbital Inclination to ICRF correct both historic and current values
9. Eccentricity correct both historic and current values

Technical: 

Build in Three js R175 including orbitcontrols.

It's an interactive 3D visualization where the browser renders a miniature model of the solar system using three.js — a JavaScript library that simplifies working with WebGL. The project typically features:
- A central sun: A bright, glowing sphere, possibly using a texture and some light emission effects.
- Orbiting planets: Each planet is a textured sphere with individual rotation (spinning) and revolution (orbiting) animations.
- Orbit paths: Visualized with faint circles or lines showing the paths of the planets.
- Lighting: A combination of ambient and point lights to simulate how the sun lights up the planets.
- Camera controls: Using something like OrbitControls to let the user zoom, pan, and rotate around the system.
- Scaling: Distances are to scale but sizes of the planets are not to scale because realistic proportions would make some planets almost invisible or too far apart.
- Extras: You might see moons orbiting planets, rings around Saturn, zodiac positions, polar axis line,constellation or even starfield backgrounds to make it more immersive.

At a basic level, it's like building a tiny universe in the browser, where JavaScript, math (especially trigonometry), and 3D graphics all work together.*/

//*************************************************************
// ADD GLOBAL INPUT CONSTANTS
//*************************************************************
const holisticyearLength = 305952;
// Input Length of Holistic-Year in Years
const perihelionalignmentYear = 1246;
// Last AD YEAR longitude of perihelion aligned with solstice (according to J. Meeus around 1246 AD)
const perihelionalignmentJD = 2176142;
// Last AD YEAR longitude of perihelion aligned with solstice (according to J. Meeus around 1246 AD) in Juliandate
const lengthsolaryearindaysin1246 = 365.242236;
// Reference length of solar year in days in 1246 AD according to EPOCH document = MEAN
const meansiderealyearlengthinSeconds = 31558149.6846777;
// Reference length of sidereal year in seconds in 1246 AD according to EPOCH document = MEAN
const startmodelJD = 2451717;
// Start of the 3D model in Juliandate
const startmodelYear = 2000.5;
// Start of the 3D model in year
const correctionDays = 2.7343897;
// Small correction in days because the startmodel on 21 june 12:00 UTC is not exactly aligned with Solstice + to make sure the juliandate is with exact rounded numbers in the Balanced year
const earthtiltMean = 23.4243449577;
const earthinclinationMean = 1.492075548;
const tiltandinclinationAmplitude = 0.58;
const eccentricityMean = 0.01404974;
const eccentricityAmplitude = 0.0027304333159777;
const eccentricitySinusCorrection = 0.6895;
const mideccentricitypointAmplitude = 2.43229166666669;
const helionpointAmplitude = 9.8471328125;
const meansolardayAmplitudeinSeconds = 0.07875;
const meansolaryearAmplitudeinDays = 0.00017926844;
const meansiderealyearAmplitudeinSeconds = 0.3036366;
//*************************************************************
// ADD OTHER GLOBAL CONSTANTS VIA CALCULATIONS
//*************************************************************
const perihelionCycleLength = holisticyearLength / 16;
const meansolaryearlengthinDays = Math.round(lengthsolaryearindaysin1246 * (holisticyearLength / 16)) / (holisticyearLength / 16);
const meanearthRotationsinDays = meansolaryearlengthinDays+1;
const startmodelyearwithCorrection = startmodelYear+(correctionDays/meansolaryearlengthinDays);
const balancedYear = perihelionalignmentYear-(14.5*(holisticyearLength/16));
const balancedJD = startmodelJD-(meansolaryearlengthinDays*(startmodelyearwithCorrection-balancedYear));
const meansiderealyearlengthinDays = meansolaryearlengthinDays *(holisticyearLength/13)/((holisticyearLength/13)-1);
const meanlengthofday = meansiderealyearlengthinSeconds/meansiderealyearlengthinDays;
//sDAY IS USED IN 3D MODEL CALCULATIONS 
const sDay = 1/meansolaryearlengthinDays;
//sDAY IS USED IN 3D MODEL CALCULATIONS
const sYear = sDay*365;
const sMonth = sDay*30;
const sWeek = sDay*7;
const sHour = sDay/24;
const sMinute = sHour/60;
const sSecond = sMinute/60;

//alert(meansolaryearlengthinDays);
//alert(meanearthRotationsinDays);
//alert(startmodelyearwithCorrection);
//alert(balancedYear);
//alert(balancedJD);
//alert(meansiderealyearlengthinDays);
//alert(meanlengthofday);
//alert(sDay);
//alert(sYear);
//alert(sMonth);
//alert(sWeek);
//alert(sHour);
//alert(sMinute);
//alert(sSecond);

//*************************************************************
// ADD PLANETS (Stars, Moons and deferents conunt as planets)
//*************************************************************
const startingPoint = {
  name: "Starting Point",
  size: 0.1,
  color: 0x578B7C,
  startPos: 0,
  speed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const earthWobbleCenter = {
  name: "EARTH-WOBBLE-CENTER",
  size: 0.011,
  color: 0x333333,
  startPos: -112.791336670025,
  speed: 0,
  tilt: 0,
  rotationSpeed: -0.00026697458749521,
  orbitRadius: 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/deathstar.png',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

   traceOn: false,

   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   //isDeferent: true,
};

const midEccentricityOrbit = {
  name: "EARTH-MID-ECCENTRICITY-ORBIT",
   size: 0.011,   
   color: 0x0096FF,
   startPos: -112.791336670025,
   speed: 0.00026697458749521,
   rotationSpeed: 0,
   tilt: 0,
   orbitRadius: 1.404974,
   orbitCentera: 0,
   orbitCenterb: 0,
   orbitCenterc: 0,
   orbitTilta: 0,
   orbitTiltb: 0,
   textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/earth_mean_eccentricity.png',
   traceLength : sYear * 1000000,
   traceStep : sYear,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: false,

   traceOn: true,

   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

const helionPointAlternative = {
  name: "Helion Point (Alternative)",
   size: 0.011,   
   color: 0x333333,
   startPos: -104.204722055415,
   speed: 0.0000616095201912024,
   rotationSpeed: 0,
   tilt: 0,
   orbitRadius: 1.404974,
   orbitCentera: 0,
   orbitCenterb: 0,
   orbitCenterc: 0,
   orbitTilta: 0,
   orbitTiltb: 0,
   textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/lightstar.png',
   traceLength : sYear * 1000000,
   traceStep : sYear,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: false,

   traceOn: false,

   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

const earth = {
  name: "Earth",
  size: 0.0852703981708473,
  // 10 times bigger than real 
  color: 0x333333,
  sphereSegments: 320,
  startPos: 0,    
  speed: -0.00026697458749521,
  rotationSpeed: 2301.16782401453,
  tilt: -23.4243449577,
  tiltb: 0,
  orbitRadius: -0.27304333159777,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,  
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Earth.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  
  traceLength : sYear * 1000000,
  traceStep : sYear,
  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

const earthInclinationPrecession = {
  name: "Earth Inclination Precession",
  size: 0.1,
  color: 0xFEAA0D,
  startPos: 98.5866146146096,
  speed: 0.0000616095201912024,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const earthEclipticPrecession = {
  name: "Earth Ecliptic Precession",
  size: 0.1,
  color: 0xFEAA0D,
  startPos: 164.311024357683,
  speed: 0.000102682533652004,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: -0.58,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const earthObliquityPrecession = {
  name: "Earth Obliquity Precession",
  size: 0.1,
  color: 0xFEAA0D,
  startPos: 97.1023610277075,
  speed: -0.000164292053843206,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0.58,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const earthPerihelionPrecession1 = {
  name: "Earth Perihelion Precession1",
  size: 0.1,
  color: 0xFEAA0D,
  startPos: -194.204722055415,
  speed: 0.000328584107686413,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: -1.11,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const earthPerihelionPrecession2 = {
  name: "Earth Perihelion Precession2",
  size: 0.1,
  color: 0xFEAA0D,
  startPos: 194.204722055415,
  speed: -0.000328584107686413,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -1.404974,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const barycenterSun = {
  name: "Barycenter Sun",
  size: 0.01,
  color: 0xFFFF00,
  startPos: 0,
  speed: 0,
  tilt: 0,
  orbitRadius: 0.27304333159777,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const earthHelionPoint = {
   name: "HELION-POINT = LONGITUDE PERIHELION",
   size: 0.011,   
   color: 0xBF40BF,
   startPos: 0,    
   speed: 0,
   rotationSpeed: 0,
   tilt: 0,
   orbitRadius: 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
   orbitCentera: 0,
   orbitCenterb: 0,
   orbitCenterc: 0,
   orbitTilta: 0,
   orbitTiltb: 0,
   textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/lightstar.png',
   traceLength : sYear * 1000000,
   traceStep : sYear,
  
   visible: true,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: false,

   traceOn: true,

   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   //isDeferent: true,
};

const sun = {
  name: "Sun",
  size: 0.930951753186224,    
  color: 0x333333,
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 83.9952982796623,
  tilt: -7.155,
  orbitRadius: 100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Sun.jpg',
  textureTransparency: 9,
  visible: true,
  emissive: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceLength : sYear * 1000000,
  traceStep : sYear*10,
  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

const moonApsidalPrecession = {
  name: "Moon Apsidal Precession",
  size: 0.001,
  color: 0x8b8b8b,
  startPos: 340,
  speed: 0.709885428149756,
  tilt: 0,
  orbitRadius: -0.0141069500625657,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
}; 

const moonApsidalNodalPrecession1 = {
  name: "Moon Apsidal Nodal Precession1",
  size: 0.001,
  color: 0x8b8b8b,
  startPos: -90,
  speed: -1.04769042735813,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
}; 

const moonApsidalNodalPrecession2 = {
  name: "Moon Apsidal Nodal Precession2",
  size: 0.001,
  color: 0x8b8b8b,
  startPos: 90,
  speed: 1.04769042735813,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
}; 

const moonRoyerCycle = {
  name: "Moon Royer Cycle",
  size: 0.001,
  color: 0xFFFF00,
  startPos: -44.1,
  speed: -0.372080428941402,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const moonNodalPrecession = {
  name: "Moon Nodal Precession",
  size: 0.001,
  color: 0x8b8b8b,
  startPos: 64.1,
  speed: -0.337804999208372,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90+180)*Math.PI)/180)*-5.1453964,
  orbitTiltb: Math.sin(((-90+180)*Math.PI)/180)*-5.1453964,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
}; 

const moon = {
  name: "Moon",
  size: 0.0232276033326404,
  //10 times bigger than real
  color: 0x8b8b8b,
  startPos: 126.22,
  speed: 83.9952982796623,
  rotationSpeed: 0,
  tilt: -6.687,
  orbitRadius: 0.25695490731541,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Moon.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  
  traceLength : sYear * 18,
  traceStep : sDay,
  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

const mercurySunBarycenter0 = {
   name: "BARYCENTER MERCURY",
   size: 0.5,
   color: 0x333333,
   startPos: 0,    
   speed: Math.PI*2,
   rotationSpeed: 0,
   tilt: 0,
   orbitRadius: 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
   orbitCentera: -11.2169591606661,
   orbitCenterb: 0,
   orbitCenterc: -0.6,
   orbitTilta: 0,
   orbitTiltb: 0,
   textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/mercury_barycenter.png',
   traceLength : sYear * 1000000,
   traceStep : sYear,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: false,

   traceOn: false,

   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

const mercurySunBarycenter = {
   name: "Barycenter Mercury-Sun",
   size: 0.01,   
   color: 0x333333,
   startPos: 0,    
   speed: 0,
   rotationSpeed: 0,
   tilt: 0,
   orbitRadius: 0,
   orbitCentera: 100,
   orbitCenterb: 0,
   orbitCenterc: 0,
   orbitTilta: 0,
   orbitTiltb: 0,
   traceLength : sYear * 90,
   traceStep : sMonth,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: false,

   traceOn: false,

   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

const mercuryBarycenter = {
  name: "Mercury Barycenter Location",
  size: 0.1,
  color: 0x868485,
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -11.2169591606661,
  orbitCenterb: 0,
  orbitCenterc: -0.6,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const mercuryEllipse = {
  name: "Mercury Ellipse Factor",
  size: 0.1,
  color: 0x868485,
  startPos: 0,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const mercury = {
  name: "Mercury",
  //size: 0.00326167744046522,
  size: 1,
  color: 0x868485,
  startPos: 211.54,
  speed: 26.0875244996281,
  rotationSpeed: 39.1312867494422,
  tilt: -0.03,
  orbitRadius: 38.7107274186104,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-48.33167)*Math.PI)/180)*-7.00487,
  orbitTiltb: Math.sin(((-90-48.33167)*Math.PI)/180)*-7.00487,

  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Mercury.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceLength : sYear * 14,
  traceStep : sDay,
  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

const venusSunBarycenter0 = {
  name: "BARYCENTER VENUS",
  size: 0.011,   
  color: 0x333333,
  startPos: 0, 
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  orbitCentera: -0.489934935944517,
  orbitCenterb: 0,
  orbitCenterc: -0.05,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/venus_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const venusSunBarycenter = {
  name: "Barycenter Venus-Sun",
  size: 0.01,   
  color: 0x333333,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const venusBarycenter = {
  name: "Venus Barycenter Location",
  size: 0.1,
  color: 0xA57C1B,
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -0.489934935944517,
  orbitCenterb: 0,
  orbitCenterc: -0.05,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const venusEllipse = {
  name: "Venus Ellipse Factor",
  size: 0.1,
  color: 0xA57C1B,
  startPos: 0,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const venus = {
  name: "Venus",
  //size: 0.00809075686937222,
  size: 1,
  color: 0xA57C1B,
  startPos: 352.635,
  speed: 10.2132976731898,
  rotationSpeed: -9.4430965247729,
  tilt: -2.6392,
  orbitRadius: 72.3340172922693,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-76.68069)*Math.PI)/180)*-3.39471,
  orbitTiltb: Math.sin(((-90-76.68069)*Math.PI)/180)*-3.39471,
  traceLength : sYear *16,
  traceStep : sWeek,

  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/VenusAtmosphere.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

const marsSunBarycenter0 = {
  name: "BARYCENTER MARS",
  size: 0.5,   
  color: 0x333333,
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 7.78722181048582,
  orbitCentera: 8.83305630702754,
  orbitCenterb: -20.1708748079022,
  orbitCenterc: 0.7,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/mars_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const marsSunBarycenter = {
  name: "Barycenter Mars-Sun",
  size: 0.01,   
  color: 0x333333,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const marsBarycenter = {
  name: "Mars Barycenter Location",
  size: 0.1,
  color: 0x008000,
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 8.83305630702754,
  orbitCenterb: -20.1708748079022,
  orbitCenterc: 0.7,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
};  

const marsEllipse = {
  name: "Mars Ellipse Factor",
  size: 0.1,
  color: 0xFEAA0D,
  startPos: 243.094,
  speed: 0.398326084542855,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 7.78722181048582,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-49.57854)*Math.PI)/180)*-1.85061,
  orbitTiltb: Math.sin(((-90-49.57854)*Math.PI)/180)*-1.85061,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
}; 

const mars = {
  name: "Mars",
  //size: 0.00453148161022128,
  size: 1,
  color: 0xFF0000,
  startPos: 121.547,
  speed: -3.34075569586122,
  rotationSpeed: 2236.82429921882,
  tilt: -25.19,
  orbitRadius: 152.366713671252,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 44,
  traceStep : sWeek, 

  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Mars.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

const phobos = {
  name: "Phobos",
  //size: 0.0000148397834115522,
  size: 0.027272727,
  color: 0x8b8b8b,
  startPos: 122,
  speed: 6986.5,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 5,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
};

const deimos = {
  name: "Deimos",
  //size: 0.00000842257977412423,
  size: 0.027272727,
  color: 0x8b8b8b,
  startPos: 0,    
  speed: 1802,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 10,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
};

const jupiterSunBarycenter0 = {
  name: "BARYCENTER JUPITER",
  size: 0.5,   
  color: 0x333333,
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  orbitCentera: -14.8529260159503,
  orbitCenterb: -44.5901620064302,
  orbitCenterc: 0.7,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/jupiter_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const jupiterSunBarycenter = {
  name: "Barycenter Jupiter-Sun",
  size: 0.01,   
  color: 0x333333,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const jupiterBarycenter = {
  name: "Jupiter Barycenter Location",
  size: 0.1,
  color: 0xCDC2B2,
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -14.8529260159503,
  orbitCenterb: -44.5901620064302,
  orbitCenterc: 0.7,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const jupiterEllipse = {
  name: "Jupiter Ellipse Factor",
  size: 0.1,
  color: 0xCDC2B2,
  startPos: 41.205,    
  speed: -5.75326128750832,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-100.55615)*Math.PI)/180)*-1.3053,
  orbitTiltb: Math.sin(((-90-100.55615)*Math.PI)/180)*-1.3053,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const jupiter = {
  name: "Jupiter",
  //size: 0.0934652340617141,   
  size: 6,
  color: 0xCDC2B2,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 5549.34320193203,
  tilt: -3.13,
  orbitRadius: 519.969067802053,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 24,
  traceStep : sWeek,
  
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Jupiter.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

const saturnSunBarycenter0 = {
  name: "BARYCENTER SATURN",
  size: 0.5,   
  color: 0x333333,
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  orbitCentera: -99.8674039040765,
  orbitCenterb: 3.4559296989952,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/saturn_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const saturnSunBarycenter = {
  name: "Barycenter Saturn-Sun",
  size: 0.01,   
  color: 0x333333,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const saturnBarycenter = {
  name: "Saturn Barycenter Location",
  size: 0.1,
  color: 0xA79662,
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -99.8674039040765,
  orbitCenterb: 3.4559296989952,
  orbitCenterc: 1.8,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const saturnEllipse = {
  name: "Saturn Ellipse Factor",
  size: 0.1,   
  color: 0xA79662,
  startPos: 34.355,    
  speed: -6.06960563718342,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-113.71504)*Math.PI)/180)*-2.48446,
  orbitTiltb: Math.sin(((-90-113.71504)*Math.PI)/180)*-2.48446,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const saturn = {
  name: "Saturn",
  //size: 0.0778513754613971,   
  size: 5,
  color: 0xA79662,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 5215.37251228578,
  tilt: -26.73,
  orbitRadius: 952.971629139966,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 60,
  traceStep : sWeek,

  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Saturn.jpg',
  ringUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/saturn-rings.png',
  ringSize: 10,
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

const uranusSunBarycenter0 = {
  name: "BARYCENTER URANUS",
  size: 0.5,   
  color: 0x333333,
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  orbitCentera: -27.8688886566711,
  orbitCenterb: 175.24925683614,
  orbitCenterc: -1.9,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/uranus_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const uranusSunBarycenter = {
  name: "Barycenter Uranus-Sun",
  size: 0.01,   
  color: 0x333333,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const uranusBarycenter = {
  name: "Uranus Barycenter Location",
  size: 0.1,
  color: 0xD2F9FA,
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -27.8688886566711,
  orbitCenterb: 175.24925683614,
  orbitCenterc: -1.9,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const uranusEllipse = {
  name: "Uranus Ellipse Factor",
  size: 0.1,   
  color: 0xD2F9FA,
  startPos: 134.51,    
  speed: -6.2081449115867,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-74.22988)*Math.PI)/180)*-0.76986,
  orbitTiltb: Math.sin(((-90-74.22988)*Math.PI)/180)*-0.76986,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const uranus = {
  name: "Uranus",
  //size: 0.0339068997192601, 
  size: 5,
  color: 0xD2F9FA,
  startPos: 0,    
  speed: 0,
  rotationSpeed: -3194.74981995042,
  tilt: -82.23,
  orbitRadius: 1913.91730411169,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 18,
  traceStep : sWeek,
  
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Uranus.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

const neptuneSunBarycenter0 = {
  name: "BARYCENTER NEPTUNE",
  size: 0.5,   
  color: 0x333333,
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  orbitCentera: -34.3277111737215,
  orbitCenterb: -34.3620585913588,
  orbitCenterc: 1.7,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/neptune_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const neptuneSunBarycenter = {
  name: "Barycenter Neptune-Sun",
  size: 0.01,   
  color: 0x333333,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const neptuneBarycenter = {
  name: "Neptune Barycenter Location",
  size: 0.1,
  color: 0x5E93F1,
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -34.3277111737215,
  orbitCenterb: -34.3620585913588,
  orbitCenterc: 1.7,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const neptuneEllipse = {
  name: "Neptune Ellipse Factor",
  size: 0.1,   
  color: 0x5E93F1,
  startPos: 144.16,    
  speed: -6.2448231126072,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-131.72169)*Math.PI)/180)*-1.76917,
  orbitTiltb: Math.sin(((-90-131.72169)*Math.PI)/180)*-1.76917,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const neptune = {
  name: "Neptune",
  //size: 0.0329175808251566,
  size: 5,
  color: 0x5E93F1,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 3418.56790376751,
  tilt: -28.32,
  orbitRadius: 2993.53460611855,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 18,
  traceStep : sWeek,
  
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Neptune.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

//The accurate orbits of Pluto and Halleys and Eros will be added later
// You can now make eccentric orbits with these settings (especially helpfull for hallays)
//  orbitSemiMajor: 100,
//  orbitSemiMinor: 30,

const plutoSunBarycenter0 = {
  name: "BARYCENTER PLUTO",
  size: 0.01,   
  color: 0x333333,
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  orbitCentera: 1355.8371267405,
  orbitCenterb: 1400.74054002809,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/pluto_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const plutoSunBarycenter = {
  name: "Barycenter Pluto-Sun",
  size: 0.01,   
  color: 0x333333,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const plutoBarycenter = {
  name: "Pluto Barycenter Location",
  size: 5,
  color: 0x5E93F1,
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 1355.8371267405,
  orbitCenterb: 1400.74054002809,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const plutoEllipse = {
  name: "Pluto Ellipse Factor",
  size: 0.1,   
  color: 0x5E93F1,
  startPos: 215,    
  speed: -6.25761735630024,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-110.30347)*Math.PI)/180)*-17.14175,
  orbitTiltb: Math.sin(((-90-110.30347)*Math.PI)/180)*-17.14175,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const pluto = {
  name: "Pluto",
  //size: 0.00158865897549076,   
  size: 5,
  color: 0x5E93F1,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 359.294297168521,
  tilt: -57.47,
  orbitRadius: 3923.3401562492,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 18,
  traceStep : sWeek,
  
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/FictionalMakemake.jpg',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const halleysSunBarycenter0 = {
  name: "BARYCENTER HALLEYS",
  size: 0.01,   
  color: 0x333333,
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  orbitCentera: 0,
  orbitCenterb: 3425.26406009445,
  orbitCenterc: -479.375616078497,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/halleys_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const halleysSunBarycenter = {
  name: "Barycenter Halleys-Sun",
  size: 0.01,   
  color: 0x333333,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const halleysBarycenter = {
  name: "Halleys Barycenter Location",
  size: 0.1,
  color: 0xA57C1B,
  startPos: 0,
  speed: Math.PI*2,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 3425.26406009445,
  orbitCenterc: -479.375616078497,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const halleysEllipse = {
  name: "Halleys Ellipse Factor",
  size: 0.1,
  color: 0xA57C1B,
  startPos: 200,
  speed: -6.20009460094839,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-59.56078348)*Math.PI)/180)*(180-162.192203847561),
  orbitTiltb: Math.sin(((-90-59.56078348)*Math.PI)/180)*(180-162.192203847561),

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const halleys = {
  name: "Halleys",
  //size: 0.0000073530458345529,
  size: 6,
  color: 0x00FF00,
  startPos: 0,
  speed: 0,
  rotationSpeed: 1043.12937189584,
  tilt: 0,
  orbitRadius: 1788.20900979424,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear * 90,
  traceStep : sWeek,

  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/FictionalCeres.jpg',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

const erosSunBarycenter0 = {
   name: "BARYCENTER EROS",
   size: 0.01,   
   color: 0x333333,
   startPos: 0,    
   speed: Math.PI*2,
   rotationSpeed: 0,
   tilt: 0,
   orbitRadius: 17.0301972356361,
   orbitCentera: -41.5066637049184,
   orbitCenterb: 27.010766876461,
   orbitCenterc: 0,
   orbitTilta: 0,
   orbitTiltb: 0,
   textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/eros_barycenter.png',
   traceLength : sYear * 1000000,
   traceStep : sYear,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: false,

   traceOn: false,

   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

const erosSunBarycenter = {
   name: "Barycenter Eros-Sun",
   size: 0.01,   
   color: 0x333333,
   startPos: 0,    
   speed: 0,
   rotationSpeed: 0,
   tilt: 0,
   orbitRadius: 0,
   orbitCentera: 100,
   orbitCenterb: 0,
   orbitCenterc: 0,
   orbitTilta: 0,
   orbitTiltb: 0,
   traceLength : sYear * 90,
   traceStep : sMonth,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: false,

   traceOn: false,

   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

const erosBarycenter = {
  name: "Eros Barycenter Location",
  size: 0.1,
  color: 0xA57C1B,
  startPos: 0,
  speed: Math.PI*2,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -41.5066637049184,
  orbitCenterb: 27.010766876461,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const erosEllipse = {
  name: "Eros Ellipse Factor",
  size: 0.1,
  color: 0xA57C1B,
  startPos: 114.6,
  speed: 0.852798978486624,
  tilt: 0,
  orbitRadius: 17.0301972356361,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-304.4115786)*Math.PI)/180)*-10.82903287,
  orbitTiltb: Math.sin(((-90-304.4115786)*Math.PI)/180)*-10.82903287,

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const eros = {
  name: "Eros",
  //size: 0.0000112568447139883,
  size: 1,
  color: 0xA57C1B,
  startPos: 57.3,
  speed: -3.56799275538197,
  rotationSpeed: 10451.0875434594,
  tilt: 0,
  orbitRadius: 145.826791115055,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear *16,
  traceStep : sWeek,

  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/FictionalEris.jpg',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

  traceOn: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

//*************************************************************
// ADD CONSTANTS
//*************************************************************
const planetObjects = [startingPoint, earthWobbleCenter, midEccentricityOrbit, helionPointAlternative, earth, earthPerihelionPrecession1, earthPerihelionPrecession2, earthObliquityPrecession, earthInclinationPrecession, earthEclipticPrecession, barycenterSun, earthHelionPoint, mercurySunBarycenter0, mercurySunBarycenter, venusSunBarycenter0, venusSunBarycenter, marsSunBarycenter0, marsSunBarycenter, jupiterSunBarycenter0, jupiterSunBarycenter, saturnSunBarycenter0, saturnSunBarycenter, uranusSunBarycenter0, uranusSunBarycenter, neptuneSunBarycenter0, neptuneSunBarycenter, plutoSunBarycenter0, plutoSunBarycenter, halleysSunBarycenter0, halleysSunBarycenter, erosSunBarycenter0, erosSunBarycenter, sun, moonApsidalPrecession, moonApsidalNodalPrecession1, moonApsidalNodalPrecession2, moonRoyerCycle, moonNodalPrecession, moon, mercuryBarycenter, mercuryEllipse, mercury, venusBarycenter, venusEllipse, venus, marsBarycenter, marsEllipse, mars, phobos, deimos, jupiterBarycenter, jupiterEllipse, jupiter, saturnBarycenter, saturnEllipse, saturn, uranusBarycenter, uranusEllipse, uranus, neptuneBarycenter, neptuneEllipse, neptune, plutoBarycenter, plutoEllipse, pluto, halleysBarycenter, halleysEllipse, halleys, erosBarycenter, erosEllipse, eros]

const tracePlanets = [earthHelionPoint, midEccentricityOrbit, sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune]

//*************************************************************
// ADD ALL CALENDAR CONSTANTS
//*************************************************************
const GREGORIAN_START = { year: 1582, month: 10, day: 15};
// Start of the Gregorian Calendar
const GREGORIAN_START_JD = 2299160.5;
// Start of the Gregorian Calendar in Juliandate
const REVISION_START_JD = perihelionalignmentJD;
// Start of the Revised Julian Calendar in Juliandate

//*************************************************************
// ADD ALL SETTINGS NEEDED FOR GUI
//*************************************************************
let o = {
  background: 0x000000,
  Run: false,
  traceBtn: false,
  '1 second equals': sWeek,
  speedFact: sWeek,
  speed: 1,
  reverse: false,

  'Step forward': function () {
    if (this.speedFact === sYear) {
      this.pos = dateToDays(addYears(this.Date, 1)) * sDay + timeToPos(this.Time);
    } else if (this.speedFact === sYear * 10) {
      this.pos = dateToDays(addYears(this.Date, 10)) * sDay + timeToPos(this.Time);
    } else if (this.speedFact === sYear * 100) {
      this.pos = dateToDays(addYears(this.Date, 100)) * sDay + timeToPos(this.Time);
    } else if (this.speedFact === sYear * 1000) {
      this.pos = dateToDays(addYears(this.Date, 1000)) * sDay + timeToPos(this.Time);
    } else {
      this.pos += this.speedFact;
    }
  },

  'Step backward': function () {
    if (this.speedFact === sYear) {
      this.pos = dateToDays(addYears(this.Date, -1)) * sDay + timeToPos(this.Time);
    } else if (this.speedFact === sYear * 10) {
      this.pos = dateToDays(addYears(this.Date, -10)) * sDay + timeToPos(this.Time);
    } else if (this.speedFact === sYear * 100) {
      this.pos = dateToDays(addYears(this.Date, -100)) * sDay + timeToPos(this.Time);
    } else if (this.speedFact === sYear * 1000) {
      this.pos = dateToDays(addYears(this.Date, -1000)) * sDay + timeToPos(this.Time);
    } else {
      this.pos -= this.speedFact;
    }
  },

  'Reset': function () {
    this.pos = 0;
    controls.reset();
  },

  'Today': function () {
    const newPos = sDay * dateToDays(
      new Intl.DateTimeFormat("fr-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(Date.now())
    );
    this.pos = newPos;
    controls.reset();
  },

  Position: "", 
  Date: "",
  periheliondate: "",
  cSphereSize: 1,
  zodiacSize: 1,
  constellationLayout: 'asterism', // or 'stellarium'
  starDistanceScaleFact: 1.5,
  starDistance: 5000,
  starSize: 1,
  starsizeBase: 50,
  starNamesVisible: false,
  'Axis helpers': false,
  Orbits: true,
  Time: "00:00:00",
  Zoom: 0,
  worldCamX: '0',
  worldCamY: '0',
  worldCamZ: '0',
  worldCamDist: '0',
  worldCamDistKm: '0',
  worldCamRa: '0',
  worldCamDec: '0',

  Day: "",
  julianDay: "",
  juliandaysbalancedJD: 0,
  'Line trace': true,
  'Camera Lat': 0,
  'Camera Long': 0,
  'Polar line': false,
  polarLineLength: 1,
  Performance: false,
  camX: 0,
  camY: 0,
  camZ: 0,
  Size: 1,
  traceSize: 1,
  traceLength: sYear * 18,
  traceStep: sDay,
  tracePlanet: earth,
  traceArrIndex: 0,
  Lines: true,

  moonElongation: 0.01,
  mercuryElongation: 0.01,
  venusElongation: 0.01,
  marsElongation: 0.01,
  jupiterElongation: 0.01,
  saturnElongation: 0.01,
  uranusElongation: 0.01,
  neptuneElongation: 0.01,

  Target: "",
  lookAtObj: {}
};

let predictions = {
  juliandaysbalancedJD: 0,
  lengthofDay: 0,
  lengthofsiderealDay: 0,
  predictedDeltat: 0,
  lengthofsolarYear: 0,
  lengthofsiderealYear: 0,
  lengthofanomalisticYear: 0,
  perihelionPrecession: 0,
  axialPrecession: 0,
  inclinationPrecession: 0,
  obliquityPrecession: 0,
  eclipticPrecession: 0,
  eccentricityEarth: 0,
  obliquityEarth: 0,
  inclinationEarth: 0,
  longitudePerihelion: 0,
  lengthofAU: 0,
  anomalisticMercury: 0,
};

//*************************************************************
// SETUP CAMERAS and CONTROLS
//*************************************************************
const camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 10000000);
camera.position.set(0, 1000, 0);
//camera.position.set(0, 0.5, 4);
const baseCamDistance = camera.position.length();

//*************************************************************
// LOAD DEFAULT SETTINGS (Three.js core setup (scene, camera, renderer))
//*************************************************************
const scene = new THREE.Scene();
scene.background = new THREE.Color( o.background );

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

// —– setup once —–
const labelRenderer = new THREE.CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
// ────────────────────────────────────────────────────
// 1) Style & add your CSS2DRenderer DOM element
// ────────────────────────────────────────────────────
labelRenderer.domElement.style.position      = 'absolute';
labelRenderer.domElement.style.top           = '0';
labelRenderer.domElement.style.left          = '0';
labelRenderer.domElement.style.right         = '0';
labelRenderer.domElement.style.bottom        = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex        = '0';
document.body.appendChild(labelRenderer.domElement);

// ----------------------------------------------------------
//  Patch CSS2DRenderer so labels never disappear and
//  use proper .project() for on-screen placement
// ----------------------------------------------------------
;(function(labelRenderer, baseCamDistance) {
  const projV    = new THREE.Vector3();
  const dom      = labelRenderer.domElement;
  const zoomFactor = 0.5, minScale = 0.2, maxScale = 1.5;

  // Ensure the CSS2D layer really covers the viewport
  Object.assign(dom.style, {
    position:      'absolute',
    top:           '0',
    left:          '0',
    right:         '0',
    bottom:        '0',
    pointerEvents: 'none',
    zIndex:        '0'
  });

  labelRenderer.render = (scene, camera) => {
    if (!needsLabelUpdate) return;
    needsLabelUpdate = false;

    console.groupCollapsed('[Label Debug] render start');
    console.log('starNamesVisible =', o.starNamesVisible);

    // 1) Sync size
    const w = window.innerWidth, h = window.innerHeight;
    labelRenderer.setSize(w, h);

    // 2) Clear out any old labels
    while (dom.firstChild) dom.removeChild(dom.firstChild);

    // 3) Update matrices
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    // 4) Compute scale
    const rawScale   = baseCamDistance / camera.position.length();
    const scaled     = Math.pow(rawScale, zoomFactor);
    const finalScale = Math.min(maxScale, Math.max(minScale, scaled));
    console.log('Computed label scale:', finalScale.toFixed(3));

    // 5) Traverse and append *only* visible labels
    let total = 0, flaggedVisible = 0, appended = 0;
    scene.traverse(obj => {
      if (!(obj instanceof THREE.CSS2DObject)) return;
      total++;
      if (!obj.visible) return;    // skip invisible ones

      flaggedVisible++;

      // project to screen
      projV.setFromMatrixPosition(obj.matrixWorld).project(camera);
      const x = (projV.x * 0.5 + 0.5) * w;
      const y = (-projV.y * 0.5 + 0.5) * h;
      const el = obj.element;

      // position & show
      el.style.transform = 
        `translate(-50%,-50%) translate(${x}px,${y}px) scale(${finalScale})`;
      el.style.display   = '';    // guarantee it’s not hidden via CSS

      dom.appendChild(el);
      appended++;
    });

    // 6) Summary
    console.log(`Totals → all:${total}, visible:${flaggedVisible}, appended:${appended}, domChildren:${dom.childElementCount}`);
    if (flaggedVisible !== appended) {
      console.error('⚠️ Mismatch: flaggedVisible(' + flaggedVisible + ') ≠ appended(' + appended + ')');
    }
    console.groupEnd();
  };
})(labelRenderer, baseCamDistance);

//})(labelRenderer, camera, baseCamDistance);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5; // Try adjusting this
renderer.useLegacyLights = false

document.body.appendChild(renderer.domElement);

// Memory improvement: create one loader, one cache
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableKeys = false;
controls.zoomSpeed = 8.0;
controls.dollySpeed = 8.0;

//*************************************************************
// CREATE AND CONFIGURE PLANETS
//*************************************************************
//First add the default settings of the planets
planetObjects.forEach(obj => createPlanet(obj));

//Now adding the order of all objects 
startingPoint.pivotObj.add(earth.containerObj);
startingPoint.pivotObj.add(helionPointAlternative.containerObj);

earth.pivotObj.add(earthInclinationPrecession.containerObj);
earthInclinationPrecession.pivotObj.add(midEccentricityOrbit.containerObj);
earthInclinationPrecession.pivotObj.add(earthEclipticPrecession.containerObj);
earthEclipticPrecession.pivotObj.add(earthObliquityPrecession.containerObj);
earthObliquityPrecession.pivotObj.add(earthPerihelionPrecession1.containerObj);
earthPerihelionPrecession1.pivotObj.add(earthPerihelionPrecession2.containerObj);
earthPerihelionPrecession2.pivotObj.add(barycenterSun.containerObj);

barycenterSun.pivotObj.add(earthHelionPoint.containerObj);
barycenterSun.pivotObj.add(mercurySunBarycenter0.containerObj);
mercurySunBarycenter0.pivotObj.add(mercurySunBarycenter.containerObj);
barycenterSun.pivotObj.add(venusSunBarycenter0.containerObj);
venusSunBarycenter0.pivotObj.add(venusSunBarycenter.containerObj);
barycenterSun.pivotObj.add(marsSunBarycenter0.containerObj);
marsSunBarycenter0.pivotObj.add(marsSunBarycenter.containerObj);
barycenterSun.pivotObj.add(jupiterSunBarycenter0.containerObj);
jupiterSunBarycenter0.pivotObj.add(jupiterSunBarycenter.containerObj);
barycenterSun.pivotObj.add(saturnSunBarycenter0.containerObj);
saturnSunBarycenter0.pivotObj.add(saturnSunBarycenter.containerObj);
barycenterSun.pivotObj.add(uranusSunBarycenter0.containerObj);
uranusSunBarycenter0.pivotObj.add(uranusSunBarycenter.containerObj);
barycenterSun.pivotObj.add(neptuneSunBarycenter0.containerObj);
neptuneSunBarycenter0.pivotObj.add(neptuneSunBarycenter.containerObj);
barycenterSun.pivotObj.add(sun.containerObj);

earth.pivotObj.add(moonApsidalPrecession.containerObj);
moonApsidalPrecession.pivotObj.add(moonApsidalNodalPrecession1.containerObj);
moonApsidalNodalPrecession1.pivotObj.add(moonApsidalNodalPrecession2.containerObj);
moonApsidalNodalPrecession2.pivotObj.add(moonRoyerCycle.containerObj);
moonRoyerCycle.pivotObj.add(moonNodalPrecession.containerObj);
moonNodalPrecession.pivotObj.add(moon.containerObj);

barycenterSun.pivotObj.add(mercuryBarycenter.containerObj);
mercuryBarycenter.pivotObj.add(mercuryEllipse.containerObj);
mercuryEllipse.pivotObj.add(mercury.containerObj);

barycenterSun.pivotObj.add(venusBarycenter.containerObj);
venusBarycenter.pivotObj.add(venusEllipse.containerObj);
venusEllipse.pivotObj.add(venus.containerObj);

barycenterSun.pivotObj.add(marsBarycenter.containerObj);
marsBarycenter.pivotObj.add(marsEllipse.containerObj);
marsEllipse.pivotObj.add(mars.containerObj);

mars.pivotObj.add(phobos.containerObj);
mars.pivotObj.add(deimos.containerObj);

barycenterSun.pivotObj.add(jupiterBarycenter.containerObj);
jupiterBarycenter.pivotObj.add(jupiterEllipse.containerObj);
jupiterEllipse.pivotObj.add(jupiter.containerObj);

barycenterSun.pivotObj.add(saturnBarycenter.containerObj);
saturnBarycenter.pivotObj.add(saturnEllipse.containerObj);
saturnEllipse.pivotObj.add(saturn.containerObj);

barycenterSun.pivotObj.add(uranusBarycenter.containerObj);
uranusBarycenter.pivotObj.add(uranusEllipse.containerObj);
uranusEllipse.pivotObj.add(uranus.containerObj);

barycenterSun.pivotObj.add(neptuneBarycenter.containerObj);
neptuneBarycenter.pivotObj.add(neptuneEllipse.containerObj);
neptuneEllipse.pivotObj.add(neptune.containerObj);

barycenterSun.pivotObj.add(plutoBarycenter.containerObj);
plutoBarycenter.pivotObj.add(plutoEllipse.containerObj);
plutoEllipse.pivotObj.add(pluto.containerObj);

barycenterSun.pivotObj.add(halleysBarycenter.containerObj);
halleysBarycenter.pivotObj.add(halleysEllipse.containerObj);
halleysEllipse.pivotObj.add(halleys.containerObj);

barycenterSun.pivotObj.add(erosBarycenter.containerObj);
erosBarycenter.pivotObj.add(erosEllipse.containerObj);
erosEllipse.pivotObj.add(eros.containerObj);

earth.containerObj.rotation.y = Math.PI/2;
//END CREATE AND CONFIGURE PLANETS

//*************************************************************
// CREATE VALUE HOLDERS FOR Right Ascension, Declination and Distance
//*************************************************************
planetObjects.forEach(obj => {
    obj.ra = "";
    obj.dec = "";
    obj.raDisplay = '';
    obj.decDisplay = '';
    obj.dist = "";      
    obj.distKm = "";      
})

//*************************************************************
// SETUP LIGHT
//*************************************************************
// AMBIENT LIGHT — soft fill light for subtle illumination
const ambientLight = new THREE.AmbientLight(0x404040, o.ambientLight || 1.2);
scene.add(ambientLight);

const fallbackLight = new THREE.PointLight(0xffffff, 10000); // distance = 0 = infinite
fallbackLight.visible = false;
scene.add(fallbackLight);

// POINTLIGHT SUNLIGHT — Obsolete. Was initial light for planets in space
//const sun2Light = new THREE.PointLight(0xffffff, 0.1);
//scene.add(sun2Light);

// DIRECTIONAL SUNLIGHT — better choice for Earth in space
const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.castShadow = true;

// Optional: adjust shadow quality
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.bias = -0.0001;
sunLight.shadow.radius = 1;
sunLight.shadow.camera.far = 1000; // Increase only if necessary

// Add light and its target
scene.add(sunLight);
scene.add(sunLight.target); // Required for .target to work

// Optional: helper for debugging shadow frustum
// const helper = new THREE.CameraHelper(sunLight.shadow.camera);
// scene.add(helper);

//const shadowCameraHelper = new THREE.CameraHelper(sunLight.shadow.camera);
//scene.add(shadowCameraHelper);

// Add light to the Sun pivot, so it follows the Sun’s position
sun.pivotObj.add(sunLight);

// Add target for the light to follow Earth
const lightTarget = new THREE.Object3D();
scene.add(lightTarget);
sunLight.target = lightTarget;

// Add the light to the scene
scene.add(sunLight);

//*************************************************************
// ADD CELESTIAL SPHERE, ECLIPTIC GRID & ZODIAC TO Earth
//*************************************************************
// Add polar line
const polarLine = createEarthPolarLine();
earth.rotationAxis.add(polarLine);

// Celestial sphere setup
const celestialSphere = createCelestialSphere(o.starDistance);
earth.rotationAxis.add(celestialSphere);
celestialSphere.visible = false;

// Object to help align the celestial sphere
const csLookAtObj = new THREE.Object3D();
celestialSphere.add(csLookAtObj);

// Ground plane grid helper
const plane = new THREE.GridHelper(o.starDistance * 2, 30, 0x008800, 0x000088);
earth.pivotObj.add(plane);
plane.visible = false;

// Zodiac
const zodiac = new THREE.PolarGridHelper(250, 24, 1, 64, 0x000000, 0x555555);

// Generate zodiac circular text texture
const zodiacText = "      GEMINI             TAURUS             ARIES             PISCES          AQUARIUS       CAPRICORN     SAGITTARIUS      SCORPIO             LIBRA              VIRGO                LEO               CANCER ";
const zCanvas = getCircularText(
    zodiacText,
    800,
    0,
    "right",
    false,
    true,
    "Arial",
    "18pt",
    2
);

// Create texture and mesh for circular label
const zTexture = new THREE.CanvasTexture(zCanvas);
zTexture.anisotropy = 8;
zTexture.minFilter = THREE.LinearMipMapLinearFilter;
zTexture.magFilter = THREE.LinearFilter;
zTexture.needsUpdate = true;

const zLabelGeometry = new THREE.RingGeometry(235, 250, 128);
const zLabelMaterial = new THREE.MeshBasicMaterial({
    map: zTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
    depthWrite: false
});

const zLabel = new THREE.Mesh(zLabelGeometry, zLabelMaterial);
zLabel.rotation.x = -Math.PI / 2;
zodiac.add(zLabel);

// Add to scene
earth.pivotObj.add(zodiac);
zodiac.position.y = 0;
zodiac.visible = false;

// Add Glow effect of zodiac
const glowGeometry = new THREE.RingGeometry(255, 265, 128);
const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffaa,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2,
    depthWrite: false
});

// Add Glow ring (can be used in render loop)
const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
glowRing.rotation.x = -Math.PI / 2;
zodiac.add(glowRing);

//*************************************************************
// CREATE MILKYWAY SKYDOME
//*************************************************************
const skyGeo = new THREE.SphereGeometry(100000, 25, 25);
const loader = new THREE.TextureLoader();
const skyTexture = loadTexture("https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/milkyway.jpg");

// ✅ Set correct color space for color image textures
skyTexture.colorSpace = THREE.SRGBColorSpace; // This is the correct setting for normal color images
const skyMaterial = new THREE.MeshBasicMaterial({
  map: skyTexture,
  side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeo, skyMaterial);
scene.add(sky);

//*************************************************************
// ADD STARS, CONSTELLATIONS
//*************************************************************
const sceneObjects = {
  stars: new THREE.Object3D(),
  constellations: new THREE.Object3D(),
  // we can add other fixed obects over here later on. e.g.
  //blackholes: new THREE.Object3D(), 
};

// Add containers to the scene
scene.add(sceneObjects.stars);
scene.add(sceneObjects.constellations);
// we can add other fixed objects over here later on. e.g.
//scene.add(sceneObjects.blackholes);

// --- Create Starfield ---
createStarfield();
scene.updateMatrixWorld();
sceneObjects.stars.applyMatrix4(earth.rotationAxis.matrixWorld);
sceneObjects.stars.visible = true;

// --- Create Constellations ---
scene.updateMatrixWorld();
sceneObjects.constellations.applyMatrix4(earth.rotationAxis.matrixWorld);
sceneObjects.constellations.visible = false;

// --- Create Blackholes ---
//scene.updateMatrixWorld();
//sceneObjects.blackholes.applyMatrix4(earth.rotationAxis.matrixWorld);
//sceneObjects.blackholes.visible = false;

//*************************************************************
// Add the stars, star-lables and constellations
//*************************************************************
// 1) Asset URLs
const bsc5url           = 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/input/stars.json';
const constellationsUrl = 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/input/constellations.json';
const starGlowURL       = 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/lensflare2.png';

let starTexture;
let starSizeMaterial = null;
let starsMesh;

let needsLabelUpdate = true;
// 2) Whenever you know the labels need repositioning:
//    • On camera move:
controls.addEventListener('change', () => { needsLabelUpdate = true; });
//    • On zoom (if separate):
camera.addEventListener('zoom',   () => { needsLabelUpdate = true; });

// 2) One dashed‐line material for all constellations
const constellationMaterial = new THREE.LineDashedMaterial({
  color:       0x00aaff,
  linewidth:   1,
  scale:       1,
  dashSize:    2,
  gapSize:     1,
  transparent: true,
  opacity:     0.5,
});

// ——————————————————————————————————————————
// 1) Create a “draw-on” shader material prototype
// ——————————————————————————————————————————
const drawOnShaderProto = new THREE.ShaderMaterial({
  uniforms: {
    uDrawProgress: { value: 0.0 },
    uTotalLength:   { value: 1.0 },                          // ← declared here
    uColor:         { value: constellationMaterial.color.clone() }
  },
  vertexShader: `
    attribute float lineDistance;
    varying   float vLineDistance;
    void main() {
      vLineDistance = lineDistance;
      gl_Position   = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uDrawProgress;
    uniform float uTotalLength;                                // ← and here
    uniform vec3  uColor;
    varying float vLineDistance;
    void main() {
      // now we can safely compare against uTotalLength
      if ((vLineDistance / uTotalLength) > uDrawProgress) discard;
      gl_FragColor = vec4(uColor, 1.0);
    }
  `,
  transparent: true,
  depthWrite:  false
});

// Array to keep track of every material instance we create,
// so we can update their `uDrawProgress` in a single loop.
const drawMaterials = [];

// 3) Kick off constellation setup immediately
initConstellations();

// 4) Load star‐glow texture, then build stars
loadTexture(starGlowURL, tex => {
  starTexture = tex;
  starTexture.colorSpace = THREE.SRGBColorSpace;  // correct color space
  initStars();  // now that we have the texture, build the Points cloud
});

//*************************************************************
// Add a Visual Ring or Glow Around the Focused Planet
//*************************************************************
const focusRing = new THREE.Mesh(
  new THREE.RingGeometry(1.1, 1.2, 64),
  new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide })
);
focusRing.rotation.x = Math.PI / 2;
scene.add(focusRing);

//*************************************************************
// ADD GLOW EFFECT TO SUN
//*************************************************************
const sunTexture = loadTexture('https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/glow.png'); 

// ✅ Set correct color space for color image textures
sunTexture.colorSpace = THREE.SRGBColorSpace;

// Create the Sprite material
const sunGlowMaterial = new THREE.SpriteMaterial({
  map: sunTexture || null, // if no texture, just use color
  color: 0xffffaa, // soft yellowish white
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 0.05, // soft glow
  depthWrite: false, // important! otherwise sun glow could hide other objects
});

// Create the Sprite
const sunGlow = new THREE.Sprite(sunGlowMaterial);

// Set position and size
sunGlow.scale.set(500, 500, 10); // Size of glow in world units, adjust as needed

// Attach to Sun pivot
sun.pivotObj.add(sunGlow);

//*************************************************************
// ADD LENS FLARE EFFECT WHEN LOOKING AT TO SUN
//*************************************************************
const flareTexture = loadTexture('https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/lensflare.png'); 
// You can use any small round bright texture or generate a quick radial white glow.

// ✅ Set correct color space for color image textures
flareTexture.colorSpace = THREE.SRGBColorSpace;

// Create multiple flare elements
const flares = [
  createFlare(0xffffff, 30),   // Bright center flare
  createFlare(0xffcc88, 15),   // Warm flare
  createFlare(0x88aaff, 20),   // Cool flare
  createFlare(0xff8888, 8),    // Small red flare
  createFlare(0x88ff88, 12),   // Small greenish flare
];

//*************************************************************
// START SCENE
//*************************************************************
const clock = new THREE.Clock(); 

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    onWindowResize();
  }, 100);
});
onWindowResize();

let pause = true;

planetObjects.forEach(obj => {
  showHideObject(obj)
});
showHideAxisHelpers();

// Create reusable geometries and materials
const bGeometry = new THREE.SphereGeometry( 1, 32, 16 );
const unlitMaterial = new THREE.MeshBasicMaterial({ color: 0x777777 });

o.pos = 0;
o.sun = {pivotObj: new THREE.Object3D()};
o.earth = {pivotObj: new THREE.Object3D()};
o.lookAtObj = o.earth;
o.displayFormat = 'sexagesimal'; // or 'decimal'
o.RA_Display = '';
o.Dec_Display = '';
//o.julianDay = startmodelJD; BE CAREFUL: IF YOU SET THIS THE JULIAN DAY IS NOT SELECTABLE
o.perihelionDate = "";
let currPos; 
let lastPlanetFocus = earth; // Default fallback

let lastFrameTime = 0;
let smoothedFps   = 60;
let lastCameraX   = 0, lastCameraY = 0, lastCameraZ = 0;
let lowPerformanceMode = false;

// At the top of your file, create a reusable vectors
const centerPosVec = new THREE.Vector3();
const starPosVec  = new THREE.Vector3();
const scaleVec = new THREE.Vector3();
const _tempVec = new THREE.Vector3();

let cameraWorldPos = new THREE.Vector3();

const CS_POS       = new THREE.Vector3();
const CAMERA_POS   = new THREE.Vector3();
const PLANET_POS   = new THREE.Vector3();
const LOOK_DIR     = new THREE.Vector3();
const SPHERICAL    = new THREE.Spherical();
const AU_IN_KM     = 149597870.698828;

const _pos        = new THREE.Vector3();
const _camPos     = new THREE.Vector3();
const _starPos    = new THREE.Vector3();
const _linePos    = new THREE.Vector3();

const starsArr = sceneObjects.stars.children;
const constArr = sceneObjects.constellations.children;

let tlapsed = 0;
let posElapsed =0;
let uiElapsed =0;
let lightElapsed =0;
let updatePredictionElapsed = 0;

let cameraMoved = true; // Force first update
let eggTriggered = false;

//*************************************************************
// CREATE SETTINGS AND SETUP GUI
//*************************************************************
setupGUI()
function setupGUI() {
  const gui = new dat.GUI({ width: 300 });
  gui.domElement.id = 'gui';
  gui.add(o, 'Date').name('Date (Y-M-D)').listen().onFinishChange(() => {
    if (isValidDate(o.Date)) {
      updatePosition();
    }
  });
  
  gui.add(o, 'Time').name('Time (UTC)').listen().onFinishChange(function() {
    if (isValidTime(o.Time)) {
      updatePosition();
    } 
  });

  gui.add(o, 'julianDay').name('Julian day').listen().onFinishChange(() => {
    if (isNumeric(o.julianDay)) {
      o.Day = o.julianDay - startmodelJD;
      o.pos = sDay * o.Day + timeToPos(o.Time);
      const p = dayToDateNew(o.julianDay,'julianday','perihelion-calendar');
      o.perihelionDate = `${p.date}`;
    }
  });
  
  const perihelionController = gui.add(o, 'perihelionDate')
  .name('Perihelion Date')
  .listen(); // display-only

  if (perihelionController.__li) {
  perihelionController.__li.classList.add('highlight-perihelion');
  }
  
  let ctrlFolder = gui.addFolder('Simulation Controls')
  ctrlFolder.add(o, 'Run').listen();
  ctrlFolder.add(o, '1 second equals', 
                 {  '1 second': sSecond, 
                    '1 minute': sMinute, 
                    '1 hour': sHour, 
                    '1 day': sDay, 
                    '1 week': sWeek, 
                    '1 month': sMonth,  
                    '1 year': sYear, 
                    '10 years': sYear*10,
                    '100 years': sYear*100,
                    '1000 years': sYear*1000,
                 }).onFinishChange(function() {
    o.speedFact = Number(o['1 second equals']);});
  ctrlFolder.add(o, 'speed', -5, 5).step(0.5).name('Speed multiplier');
  ctrlFolder.add(o, 'traceBtn').name('Enable Tracing').onFinishChange(() => {
  if (o.traceBtn) {
    // Tracing turned ON → reset and re-init
    resetAllTraces();
  } else {
    // Tracing turned OFF → remove all traces and stop drawing
    tracePlanets.forEach(obj => {
      if (obj.traceLine && obj.traceLine instanceof THREE.Object3D) {
        scene.remove(obj.traceLine);
      }
      obj.traceLine = undefined;
      obj.traceArrIndex = 0;
      obj.traceStartPos = o.pos;
      obj.traceCurrPos = o.pos;
    });
  }
  });

  let folderT = ctrlFolder.addFolder('Select objects to Trace')  
  
  tracePlanets.forEach(obj => {
    folderT.add(obj, 'traceOn').name(obj.name).onFinishChange(()=>{resetAllTraces(obj)})
  });

  ctrlFolder.add(o, 'Step forward' );
  ctrlFolder.add(o, 'Step backward' );
  ctrlFolder.add(o, 'Reset' );
  ctrlFolder.add(o, 'Today' );
  
  let planetList = {}
  let isHelper = {}
  const helperRegex = /Barycenter|Phobos|Deimos|Precession|WOBBLE|HELION|Eros|Pluto|Halleys|Eccentricity|Helion|Starting|Cycle|Ellipse/i;

  planetObjects.forEach(obj => {
  if (!helperRegex.test(obj.name)) {
    // not a “helper” → go in the planet list
    planetList[obj.name] = obj.name;
  } else {
    // otherwise → it’s a helper object
    isHelper[obj.name] = obj.name;
    }
  });

  ctrlFolder.add(o, 'Target', {'Please select': "", ...planetList}).name('Look at').onFinishChange(()=>{
    o.lookAtObj = planetObjects.find(obj => {
      return obj.name === o.Target
    })
    if (o.Target === "") {o.lookAtObj = {}}    
  });
  
  ctrlFolder.open() 
  
  let astroFolder = gui.addFolder('Predictions Holistic Universe Model');

    let daysFolder = astroFolder.addFolder('Length of Days Predictions');
 //     daysFolder.add(predictions, 'juliandaysbalancedJD').name('Juliandays since balanced year').listen();
      daysFolder.add(predictions, 'lengthofDay').name('Length of Day (sec)').step(0.000001).listen();
      daysFolder.add(predictions, 'lengthofsiderealDay').name('Length of Sidereal Day (sec)').step(0.000001).listen();
      daysFolder.add(predictions, 'predictedDeltat').name('Delta-T (sec)').step(0.000001).listen();
    daysFolder.open();
    let yearsFolder = astroFolder.addFolder('Length of Years Predictions');
      yearsFolder.add(predictions, 'lengthofsolarYear').name('Length of Solar Year (days)').step(0.000001).listen();
      yearsFolder.add(predictions, 'lengthofsiderealYear').name('Length of Sidereal Year (sec)').step(0.000001).listen();
      yearsFolder.add(predictions, 'lengthofanomalisticYear').name('Length of Anomalistic Year (sec)').step(0.000001).listen();
    yearsFolder.open();
    let precessionFolder = astroFolder.addFolder('Experienced Precession Predictions');
      precessionFolder.add(predictions, 'perihelionPrecession').name('Perihelion Precession (yrs)').step(0.000001).listen();
      precessionFolder.add(predictions, 'axialPrecession').name('Axial Precession (yrs)').step(0.000001).listen();
      precessionFolder.add(predictions, 'inclinationPrecession').name('Inclination Precession (yrs)').step(0.000001).listen();
      precessionFolder.add(predictions, 'eclipticPrecession').name('Length Ecliptic Cycle (yrs)').step(0.000001).listen();
      precessionFolder.add(predictions, 'obliquityPrecession').name('Length Obliquity Cycle (yrs)').step(0.000001).listen();
    precessionFolder.open();
    let orbitalFolder = astroFolder.addFolder('Orbital Elements Predictions');
      orbitalFolder.add(predictions, 'eccentricityEarth').name('Earth Orbital Eccentricity (AU)').step(0.000001).listen();
      orbitalFolder.add(predictions, 'obliquityEarth').name('Earth Obliquity (°)').step(0.000001).listen();
      orbitalFolder.add(predictions, 'inclinationEarth').name('Earth Inclination to invariable plane (°)').step(0.000001).listen();
      orbitalFolder.add(predictions, 'longitudePerihelion').name('Earth Longitude of Perihelion (°)').step(0.000001).listen();
      orbitalFolder.add(predictions, 'lengthofAU').name('Length of AU (km)').step(0.000001).listen();
      orbitalFolder.add(predictions, 'anomalisticMercury').name('Missing Mercury Advance (arcsec)').step(0.000001).listen();
    orbitalFolder.open();
  astroFolder.close();
  
  let posFolder = gui.addFolder('Celestial Positions')
  posFolder
  .add(o, 'displayFormat', ['sexagesimal', 'decimal'])
  .name('RA/Dec Format')
  .onChange(updatePositions); // Recompute output when format changes

  const helperFolder = posFolder.addFolder('Show Helper Objects');
  
  tracePlanets.forEach(obj => {
  const isHelperObj  = Boolean(isHelper[obj.name]);
  // helpers → helperFolder, planets → posFolder directly
  const targetFolder = isHelperObj ? helperFolder : posFolder;

  const sub = targetFolder.addFolder(obj.name);
  sub.add(obj, 'raDisplay').name('RA').listen();
  sub.add(obj, 'decDisplay').name('Dec').listen();
  sub.add(obj, 'distKm').name('Kilometers').listen();
  sub.add(obj, 'dist').name('AU Distance').listen();
  sub.open();
  });

  //tracePlanets.forEach(obj => {
  //let posPlFolder = posFolder.addFolder(obj.name);
  //posPlFolder.add(obj, 'raDisplay').name('RA').listen();
  //posPlFolder.add(obj, 'decDisplay').name('Dec').listen();
  //posPlFolder.add(obj, 'distKm').listen().name('Kilometers');
  //posPlFolder.add(obj, 'dist').listen().name('AU Distance');
  //posPlFolder.open();
  //});
  
  let folderO = gui.addFolder('Celestial Tools')
  folderO.add(zodiac, 'visible').name('Zodiac');
  folderO.add(o, 'zodiacSize', 0.01, 10).step(0.1).name('Zodiac size').onChange(()=>{changeZodiacScale()})
  folderO.add(o, 'Polar line').onFinishChange(()=>{
    polarLine.visible = o['Polar line']
  });
  folderO.add(o, 'polarLineLength', 0.1, 50).name('Line length').onChange(()=>{
      polarLine.scale.y = o.polarLineLength
  });
  
  folderO.add(sceneObjects.stars, 'visible').name('Stars visible');

  folderO.add(o, 'starNamesVisible').name('Star names')
  .onChange(visible => {
    sceneObjects.stars.children.forEach(child => {
      if (child instanceof THREE.CSS2DObject) {
        child.visible = visible;
      }
    });
    needsLabelUpdate = true;  // ensure your next frame re‐draws all labels
  });

  folderO.add(sceneObjects.constellations, 'visible').name('Constellations visible');
  folderO.add(o, 'constellationLayout', {
  'Traditional (Asterism)': 'asterism',
  'Artistic (Curved)':  'stellarium'
})
  .name('Constellation Style')
  .onChange(() => {
    initConstellations();   // re–draw with the new style
  });
  
  folderO.add(o, 'starDistanceScaleFact', 0.1, 2).step(0.1).name('Star distance')
  .onChange(factor => {
    sceneObjects.stars.scale.setScalar(factor);
    sceneObjects.constellations.scale.setScalar(factor);
    sceneObjects.stars.children.forEach(child => {
      if (child instanceof THREE.CSS2DObject) {
        child.scale.setScalar(factor);
      }
    });
  });

// ← no star-size here; that slider lives inside initStars()

  folderO.add(celestialSphere, 'visible').name('Celestial sphere')
  folderO.add(plane, 'visible').name('Ecliptic grid')
  
  let sFolder = gui.addFolder('Settings')
  let folderPlanets = sFolder.addFolder('Planets show/hide');
  folderPlanets.add(o, 'Orbits' ).onFinishChange(()=>{
    showHideOrbits();
  });

  folderPlanets.add(o, 'Size', 0.4, 1.4).onChange(()=>{changePlanetScale()})
  planetObjects.forEach(obj => {
    if (!obj.isDeferent) {
      folderPlanets.add(obj, 'visible').name(obj.name).onFinishChange(()=>{
        showHideObject(obj);
      });
    }
  })
 
  let folderDef = sFolder.addFolder('Objects show/hide');
  planetObjects.forEach(obj => {
    if (obj.isDeferent) {
      folderDef.add(obj, 'visible').name(obj.name).onFinishChange(()=>{
        showHideObject(obj);
      });
    }
  })

  let folderElongations=sFolder.addFolder("Elongations show/hide");
  folderElongations.add(o,"moonElongation").min(0.0).max(180.0).listen().name("Moon")
  folderElongations.add(o,"mercuryElongation").min(0.0).max(180.0).listen().name("Mercury")
  folderElongations.add(o,"venusElongation").min(0.0).max(180.0).listen().name("Venus")
  folderElongations.add(o,"marsElongation").min(0.0).max(180.0).listen().name("Mars")
  folderElongations.add(o,"jupiterElongation").min(0.0).max(180.0).listen().name("Jupiter")
  folderElongations.add(o,"saturnElongation").min(0.0).max(180.0).listen().name("Saturn")  
  folderElongations.add(o,"uranusElongation").min(0.0).max(180.0).listen().name("Uranus") 
  folderElongations.add(o,"neptuneElongation").min(0.0).max(180.0).listen().name("Neptune") 
  
  let folderCamera = sFolder.addFolder('Camera show/hide')  

  folderCamera.add(o, 'worldCamRa').name('RA').listen()
  folderCamera.add(o, 'worldCamDec').name('Dec').listen()
  folderCamera.add(o, 'worldCamDist').name('AU distance').listen()
 
}  

//*************************************************************
// USE STATISTICS (WHEN NEEDED)
//*************************************************************
const stats = new Stats()
//stats.showPanel(2); // 0: fps, 1: ms, 2: MB
document.body.appendChild( stats.dom )
if (!o.Performance) stats.dom.style.display = 'none';
//if (!o.Performance) stats.dom.style.display = 'visible';
//stats.dom.style.display = 'none';    // completely removes it from layout
// OR
//stats.dom.style.visibility = 'hidden'; // hides but still takes up space
//stats.dom.style.display = 'block';   // or '' if you want default style
// OR
//stats.dom.style.visibility = 'visible';

//*************************************************************
// THE ANIMATE/RENDER LOOP (BE CAREFUL WITH ADDING/ CHANGING)
//*************************************************************
function render(now) {
  requestAnimationFrame(render);
  //stats.begin();
  stats.update();

  // 1) Delta and FPS throttle
  const deltaMs = now - lastFrameTime;
  lastFrameTime = now;
  const delta   = deltaMs * 0.001;    // seconds/frame
  const fps     = 1000 / deltaMs;
  smoothedFps   = smoothedFps * 0.9 + fps * 0.1;

  if (smoothedFps < 30 && !lowPerformanceMode) {
    renderer.setPixelRatio(1);
    lowPerformanceMode = true;
  } else if (smoothedFps > 40 && lowPerformanceMode) {
    renderer.setPixelRatio(window.devicePixelRatio);
    lowPerformanceMode = false;
  }

  // 2) Did the camera move?
  const { x, y, z } = camera.position;
  cameraMoved = (x !== lastCameraX || y !== lastCameraY || z !== lastCameraZ);
  lastCameraX = x; lastCameraY = y; lastCameraZ = z;

  // 3) OrbitControls: point at your selected pivot
  if (o.lookAtObj?.pivotObj) {
    controls.target.copy(
      o.lookAtObj.pivotObj.getWorldPosition(new THREE.Vector3())
    );
  }
  controls.update();

  // 4) Throttle the human-readable GUI (20 Hz)
  uiElapsed += delta;
  if (uiElapsed >= 0.05) {
    uiElapsed -= 0.05;
    o.Position      = o.pos;
    o.Day           = posToDays(o.pos);
    o.Date          = daysToDate(o.Day);
    o.Time          = posToTime(o.pos);
    o.julianDay     = dateTimeToJulianDay(o.Date, o.Time);
    const p         = dayToDateNew(o.julianDay,'julianday','perihelion-calendar');
    o.perihelionDate = `${p.date} ${p.time}`;
    o.currentYear = julianDateToDecimalYear(o.julianDay)
    o.perihelionprecessioncycleYear = yearInCycle(o.currentYear, balancedYear, holisticyearLength);

    o.juliandaysbalancedJD = o.julianDay - balancedJD;
    //console.log(o.perihelionprecessioncycleYear)
    // Easter egg/ Can be added later
    //     if (isPerihelionCycle(o.periheliondate, 'perihelionday', ) && !eggTriggered) {
    //       eggTriggered = true;
    //       triggerPerihelionEasterEgg();
    //     }

    o.worldCamX = Math.round(x);
    o.worldCamY = Math.round(y);
    o.worldCamZ = Math.round(z);
  }

  // 5) Advance the simulation time (once per frame)
  if (o.Run) {
    o.pos += Number(o.speedFact) * o.speed * delta;
  }

  // 6) Must-run-every-frame: updates your models
  trace(o.pos);
  moveModel(o.pos);
  updatePositions();
  updateLightingForFocus();
  updateFlares();
  updateSunGlow();
  
  // 7) Throttle astro-heavy updates (10 Hz)
  posElapsed += delta;
  if (posElapsed >= 0.1) {
    posElapsed -= 0.1;
    updateElongations();
    updatePredictions();
    //updateDomLabel(); Can be added later
  }

  // 8) Throttle lighting/glow (10 Hz)
  lightElapsed += delta;
  if (lightElapsed >= 0.1) {
    lightElapsed -= 0.1;
    updateFocusRing();
    animateGlow(); // zodiac animation
  }

  // 9) Camera-move-dependent fades & flares
  if (cameraMoved) {
    // star‐tag fades
  }

  // 10) Last thing: draw
  renderer.render(scene, camera);
  if (needsLabelUpdate) {
    // 3a) sync the CSS2D internal size
    labelRenderer.setSize(window.innerWidth, window.innerHeight);

    // 3b) call your patched render (it will clear & re-append all labels)
    labelRenderer.render(scene, camera);

    needsLabelUpdate = false;
  }
  //stats.end();
}
requestAnimationFrame(render);
//} 
//render();
//*************************************************************
// FUNCTIONS
//*************************************************************
function initConstellations() {
  console.log(`⏳ initConstellations() [${o.constellationLayout}] fetching…`);

  fetch(constellationsUrl)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      // build raw strokes
      const strokes = [];
      let stroke = [];
      data.asterismIndices.forEach(idx => {
        if (idx !== -1) {
          const ra  = data.rightAscension[idx];
          const dec = data.declination   [idx];
          if (!Number.isFinite(ra) || !Number.isFinite(dec)) return;
          const R = o.starDistance;
          stroke.push(new THREE.Vector3(
            R * Math.cos(dec) * Math.sin(ra),
            R * Math.sin(dec),
            R * Math.cos(dec) * Math.cos(ra)
          ));
        } else {
          if (stroke.length > 1) strokes.push(stroke);
          stroke = [];
        }
      });
      if (stroke.length > 1) strokes.push(stroke);
      console.log(`  → parsed ${strokes.length} strokes`);

      // clear old
      sceneObjects.constellations.clear();
      drawMaterials.length = 0;

      if (o.constellationLayout === 'asterism') {
        console.log('  → drawing ASTERISM segments');
        const pts = [];
        strokes.forEach(s => {
          for (let i = 0; i < s.length - 1; i++) pts.push(s[i], s[i+1]);
        });
        if (pts.length === 0) return;

        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const distArr = new Float32Array(pts.length);
        let acc = 0;
        distArr[0] = 0;
        for (let i = 1; i < pts.length; i++) {
          acc += pts[i].distanceTo(pts[i - 1]);
          distArr[i] = acc;
        }
        geo.setAttribute('lineDistance', new THREE.BufferAttribute(distArr, 1));
        geo.computeBoundingSphere();

        const mesh = new THREE.LineSegments(geo, constellationMaterial);
        mesh.frustumCulled = false;
        sceneObjects.constellations.add(mesh);

        // single render if you’re not in a loop
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
        console.log('  → ASTERISM render complete');

      } else {
        console.log('  → drawing STELLARIUM curves');

        // build curves & collect materials
        strokes.forEach(pts => {
          if (pts.length < 2) return;
          const curve     = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
          const divisions = pts.length * 5;
          const splinePts = curve.getPoints(divisions);

          const geo = new THREE.BufferGeometry().setFromPoints(splinePts);
          const count = splinePts.length;
          const dArr  = new Float32Array(count);
          dArr[0] = 0;
          let totalLen = 0;
          for (let i = 1; i < count; i++) {
            totalLen += splinePts[i].distanceTo(splinePts[i - 1]);
            dArr[i] = totalLen;
          }
          geo.setAttribute('lineDistance', new THREE.BufferAttribute(dArr, 1));
          geo.computeBoundingSphere();

          const mat = drawOnShaderProto.clone();
          mat.uniforms.uTotalLength.value = totalLen;
          mat.uniforms.uColor.value       = constellationMaterial.color.clone();
          drawMaterials.push(mat);

          const line = new THREE.Line(geo, mat);
          line.frustumCulled = false;
          sceneObjects.constellations.add(line);
        });

        console.log(`  → created ${drawMaterials.length} curved lines`);

        if (drawMaterials.length) {
          console.log('  → starting draw-on animation');
          const start    = performance.now();
          const duration = 2000;
          (function animateDraw() {
            const t = Math.min((performance.now() - start) / duration, 1);
            drawMaterials.forEach(m => m.uniforms.uDrawProgress.value = t);
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
            if (t < 1) requestAnimationFrame(animateDraw);
            else console.log('  → draw-on animation complete');
          })();
        }
      }
    })
    .catch(err => console.error('❌ initConstellations error:', err));
}

// — Make sure you have these at the top of your script —
// const bsc5url = 'https://raw.githubusercontent.com/dvansonsbeek/3d/main/public/input/stars.json';
// let starSizeMaterial = null;
// sceneObjects.stars = new THREE.Object3D();  scene.add(sceneObjects.stars);

function initStars() {
  console.log('⏳ initStars(): fetching', bsc5url);
  fetch(bsc5url)
    .then(r => {
      if (!r.ok) throw new Error(`Stars load failed: ${r.status}`);
      return r.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Stars JSON is not an array or is empty');
      }

      // 1) Prepare flat arrays and label holders
      const positions    = [];
      const colors       = [];
      const sizes        = [];
      const labelObjects = [];
      const tmpColor     = new THREE.Color();
      const R            = o.starDistance    || 10000;
      const baseSize     = o.starsizeBase    ||   50;

      data.forEach((star, i) => {
        // 2) Parse & validate fields
        const ra   = raToRadians(star.RA);
        const dec  = decToRadians(star.Dec);
        const mag  = parseFloat(star.V);
        const kel  = parseFloat(star.K);
        const name = star.N;
        if (![ra, dec, mag, kel].every(Number.isFinite) || !name) return;

        // 3) Spherical → Cartesian via THREE.Spherical
        const sph = new THREE.Spherical(
          R,
          Math.PI/2 - dec,  // polar angle
          ra                 // azimuthal angle
        );
        const pos = new THREE.Vector3().setFromSpherical(sph);
        // tiny jitter to avoid z-fighting
        pos.x += (Math.random() - 0.5) * 0.001;
        pos.y += (Math.random() - 0.5) * 0.001;
        pos.z += (Math.random() - 0.5) * 0.001;

        // 4) Collect for BufferGeometry
        positions.push(pos.x, pos.y, pos.z);
        tmpColor.set(colorTemperature2rgb(kel));
        colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
        const s = mag < 1 ? 1.5 : mag < 3 ? 1.0 : mag < 5 ? 0.6 : 0.3;
        sizes.push(s * baseSize);

        // 5) Create CSS2D label inline
        const labelDiv = document.createElement('div');
        labelDiv.className   = 'star-label';
        labelDiv.textContent = name;
        // (All styling comes from your CSS .star-label rules)
        labelDiv.style.pointerEvents = 'none';

        const labelObj = new THREE.CSS2DObject(labelDiv);
        labelObj.position.copy(pos);
        labelObj.visible = o.starNamesVisible;
        labelObjects.push(labelObj);
      });

      console.log(`  → kept ${positions.length/3} stars`);

      // 6) Build one BufferGeometry
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position',  new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('starColor', new THREE.Float32BufferAttribute(colors,    3));
      geo.setAttribute('starSize',  new THREE.Float32BufferAttribute(sizes,     1));
      geo.computeBoundingSphere();
      console.log('  → boundingSphere radius =', geo.boundingSphere.radius);

      // 7) Create ShaderMaterial with additive blending & alpha‐only sprite
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: starTexture },
          uScaleFactor: { value: 2500.0 },
          fadeStart:    { value: 7500.0 },
          fadeEnd:      { value: 30000.0 }
        },
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
          uniform float fadeStart, fadeEnd;
          varying vec3 vColor;
          varying float vDist;
          void main() {
            float a = texture2D(pointTexture, gl_PointCoord).a;
            float f = 1.0 - smoothstep(fadeStart, fadeEnd, vDist);
            gl_FragColor = vec4(vColor * f, a * f);
          }
        `,
        blending:     THREE.AdditiveBlending,
        depthWrite:   false,
        transparent:  true,
        vertexColors: true
      });
      // optional: expose for GUI tweaks
      starSizeMaterial = mat;

      // 8) Create & insert the Points mesh
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;

      // clear any old stars & labels
      while (sceneObjects.stars.children.length) {
        sceneObjects.stars.remove(sceneObjects.stars.children[0]);
      }
      sceneObjects.stars.add(points);

      // 9) Add all CSS2D labels into the same group
      labelObjects.forEach(lo => sceneObjects.stars.add(lo));

      console.log('✅ initStars: complete');
    })
    .catch(err => console.error('❌ initStars error:', err));
}

function loadTexture( url, onLoad ) {
  if ( textureCache.has( url ) ) {
    // reuse
    const tex = textureCache.get( url );
    onLoad && onLoad( tex );
    return tex;
  }
  // first time: load + store
  const tex = textureLoader.load( url, t => {
    onLoad && onLoad( t );
  });
  textureCache.set( url, tex );
  return tex;
}

function updateDomLabel() {
  const label = document.getElementById('planetLabel');

  if (o.lookAtObj?.pivotObj) {
    o.lookAtObj.pivotObj.updateMatrixWorld();
    const worldPos = o.lookAtObj.pivotObj.getWorldPosition(new THREE.Vector3());
    const screenPos = worldPos.clone().project(camera);

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    label.style.display = 'block';
    label.textContent = o.lookAtObj.name || 'Unnamed';
  } else {
    label.style.display = 'none';
  }
}

function updateSunGlow() {
  // 1a) Get the world position of the glow’s pivot into _tempVec
  sunGlow.getWorldPosition(_tempVec);

  // 1b) Compute distance camera→sunGlow
  const sunDistance = camera.position.distanceTo(_tempVec);

  // 1c) Scale the glow based on that distance
  const glowSize = sunDistance / 2;
  sunGlow.scale.set(glowSize, glowSize, 10);
}

function updateStarSizes() {
  sceneObjects.stars.children.forEach(function(starPos) {
    const star = starPos.children[0]; // First child = star Sprite

    if (star && star instanceof THREE.Sprite) {
      const magnitude = star.userData.magnitude; // Saved during creation
      let starsize;

      if (magnitude < 1) {
        starsize = o.starsizeBase * 1.5;
      } else if (magnitude >= 1 && magnitude < 3) {
        starsize = o.starsizeBase * 1.0;
      } else if (magnitude >= 3 && magnitude < 5) {
        starsize = o.starsizeBase * 0.6;
      } else {
        starsize = o.starsizeBase * 0.3;
      }

      star.scale.set(starsize, starsize, 1);
    }
  });
}

function updateFocusRing() {
  if (o.lookAtObj?.name === 'Sun' && o.sun?.pivotObj) {
    o.sun.pivotObj.updateMatrixWorld();
    focusRing.position.copy(
      o.sun.pivotObj.getWorldPosition(new THREE.Vector3())
    );
    focusRing.visible = true;
    focusRing.scale.set(5, 5, 0);
  } else {
    focusRing.visible = false;
  }
}

function createFlare(color, scale) {
  const material = new THREE.SpriteMaterial({
    map: flareTexture || null,
    color: color,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity: 0.5,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  scene.add(sprite);
  return sprite;
}

// The flares need to be added to the position of the Sun
function updateFlares() {
  const sunWorldPos = new THREE.Vector3();
  sunGlow.getWorldPosition(sunWorldPos);

  const cameraWorldPos = new THREE.Vector3();
  camera.getWorldPosition(cameraWorldPos);

  const cameraDir = new THREE.Vector3();
  camera.getWorldDirection(cameraDir);

  const toSun = new THREE.Vector3().subVectors(sunWorldPos, cameraWorldPos).normalize();

  const dot = cameraDir.dot(toSun);

  if (dot > 0.5) { // Sun is roughly in front
    const sunScreenPosition = sunWorldPos.clone().project(camera);

    const flareLineDir = new THREE.Vector3().subVectors(cameraWorldPos, sunWorldPos).normalize();

    flares.forEach((flare, index) => {
      const factor = (index - 0.5) * (index - 2) * 15;  // Spread out spacing (tweak this value)

      // Position along the line starting from the Sun
      const flarePos = new THREE.Vector3().copy(sunWorldPos)
        .add(flareLineDir.clone().multiplyScalar(factor));

      flare.position.copy(flarePos);
      flare.visible = true;
      flare.material.opacity = 1.0 - Math.abs(index - 1) * 0.3; // Center flare brightest
    });

  } else {
    flares.forEach(flare => {
      flare.visible = false;
    });
  }
}

function updateSunlightForPlanet(lightTargetObj, shadowReceiverObj = lightTargetObj) {
  if (!lightTargetObj || !shadowReceiverObj) return;

  // Update world matrices
  sun.planetObj.updateMatrixWorld();
  lightTargetObj.updateMatrixWorld();
  shadowReceiverObj.updateMatrixWorld();

  // Get positions
  const sunPos = new THREE.Vector3();
  const targetPos = new THREE.Vector3();
  sun.planetObj.getWorldPosition(sunPos);
  lightTargetObj.getWorldPosition(targetPos);

  // Light direction: from Sun ➡ target
  const direction = new THREE.Vector3().subVectors(targetPos, sunPos).normalize();
  const distance = sunPos.distanceTo(targetPos);
  const lightDistance = distance + 10;

  // Position light "behind" target along direction
  const lightPos = targetPos.clone().add(direction.clone().multiplyScalar(-lightDistance));
  sunLight.position.copy(lightPos);

  // Always aim the light at the lighting target
  sunLight.target.position.copy(targetPos);
  sunLight.target.updateMatrixWorld();

  // === Shadow Frustum ONLY for the shadow-receiving planet ===
  const box = new THREE.Box3().setFromObject(shadowReceiverObj);
  const size = new THREE.Vector3();
  box.getSize(size);

  const padding = 1.2;
  const halfW = (size.x / 2) * padding;
  const halfH = (size.y / 2) * padding;
  const depth = size.z * padding;

  sunLight.shadow.camera.left = -halfW;
  sunLight.shadow.camera.right = halfW;
  sunLight.shadow.camera.top = halfH;
  sunLight.shadow.camera.bottom = -halfH;
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = depth * 4;

  sunLight.shadow.camera.updateProjectionMatrix();

  if (typeof shadowCameraHelper !== 'undefined') {
    shadowCameraHelper.update();
  }
}

function updateLightingForFocus() {
  const isSun = o.lookAtObj?.name === 'Sun';

  if (isSun) {
    // Disable directional light
    sunLight.visible = false;

    // Enable fallback point light and follow camera
    fallbackLight.visible = true;
    fallbackLight.position.copy(camera.position);
  } else if (o.lookAtObj?.pivotObj) {
    // Enable directional sunlight toward selected planet
    sunLight.visible = true;
    fallbackLight.visible = false;

    updateSunlightForPlanet(o.lookAtObj.pivotObj, o.lookAtObj.pivotObj);
  }
}

// Optional animation (pulsing)
function animateGlow() {
    glowMaterial.opacity = 0.2 + 0.1 * Math.sin(Date.now() * 0.002);
    requestAnimationFrame(animateGlow);
}

function createEarthPolarLine() {
  const material = new THREE.LineBasicMaterial({ color: 0xffffff });

  let geometry;

  // Use BufferGeometry if available (modern Three.js), fallback to Geometry for R97
  if (typeof THREE.BufferGeometry !== 'undefined') {
    geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -100, 0),
      new THREE.Vector3(0, 100, 0)
    ]);
  } else {
    geometry = new THREE.Geometry();
    geometry.vertices.push(
      new THREE.Vector3(0, -100, 0),
      new THREE.Vector3(0, 100, 0)
    );
  }

  const line = new THREE.Line(geometry, material);
  line.visible = o['Polar line'];
  return line;
}

function changeSphereScale() {
      celestialSphere.scale.set(o.cSphereSize, o.cSphereSize, o.cSphereSize);    
  }
  
function changeZodiacScale() {
      zodiac.scale.set(o.zodiacSize, o.zodiacSize, o.zodiacSize);  
  }

function updatePosition() {
  o.pos = sDay * dateToDays(o.Date) + timeToPos(o.Time);
  const p = dayToDateNew(o.julianDay,'julianday','perihelion-calendar');
  o.perihelionDate = `${p.date}`;
}

function changeTraceScale(){
    tracePlanets.forEach(obj => {
      if (obj.traceLine) {
        obj.traceLine.material.size = obj.size*10 * o.traceSize
      }
    });  
  }

function changePlanetScale(){
    planetObjects.forEach(obj => {
      obj.planetObj.scale.x = o.Size
      obj.planetObj.scale.y = o.Size
      obj.planetObj.scale.z = o.Size
    });  
  }
  
function updatePositions() {
  // 1) refresh world matrices
  scene.updateMatrixWorld(true);

  // 2) get the sky‐center origin
  celestialSphere.getWorldPosition(CS_POS);

  // 3) each planet…
  for (let i = 0, L = tracePlanets.length; i < L; i++) {
    const obj = tracePlanets[i];

    // a) world-pos of planet
    obj.planetObj.getWorldPosition(PLANET_POS);

    // b) point your temp look-at helper at that pos
    csLookAtObj.lookAt(PLANET_POS);

    // c) start from (0,0,1), rotate into obj direction
    LOOK_DIR.set(0, 0, 1)
            .applyQuaternion(csLookAtObj.quaternion)
            .setLength(CS_POS.distanceTo(PLANET_POS));

    // d) spherical coords of that vector
    SPHERICAL.setFromVector3(LOOK_DIR);

    // e) raw numeric results
    obj.ra     = SPHERICAL.theta;
    obj.dec    = SPHERICAL.phi;
    const au   = SPHERICAL.radius / 100;     // your units → AU
    obj.dist   = au;
    obj.distKm = (au * AU_IN_KM).toFixed(2);

    // f) formatted for your GUI
    if (o.displayFormat === 'decimal') {
      obj.raDisplay  = ((obj.ra * 180/Math.PI + 360) % 360)
                         .toFixed(4) + '°';
      obj.decDisplay = radiansToDecDecimal(obj.dec) + '°';
    } else {
      obj.raDisplay  = radiansToRa(obj.ra);
      obj.decDisplay = radiansToDec(obj.dec);
    }
  }

  // 4) now the same dance for the camera itself
  camera.getWorldPosition(CAMERA_POS);
  csLookAtObj.lookAt(CAMERA_POS);
  LOOK_DIR.set(0, 0, 1)
          .applyQuaternion(csLookAtObj.quaternion)
          .setLength(CS_POS.distanceTo(CAMERA_POS));
  SPHERICAL.setFromVector3(LOOK_DIR);

  const camAu = SPHERICAL.radius / 100;
  o.worldCamDistKm = (camAu * AU_IN_KM).toFixed(2);
  o.worldCamDist   = camAu.toFixed(8);
  o.worldCamRa     = SPHERICAL.theta;
  o.worldCamDec    = SPHERICAL.phi;
}

function trace(pos) {
    tracePlanets.forEach(obj => {
      tracePlanet(obj, pos)
    });        
}

function resetAllTraces() {
  tracePlanets.forEach(obj => {
    // Remove existing trace line from scene
    if (obj.traceLine && obj.traceLine instanceof THREE.Object3D) {
      scene.remove(obj.traceLine);
    }

    // Clear all trace-related state
    obj.traceLine = undefined;
    obj.traceArrIndex = 0;
    obj.traceStartPos = o.pos;
    obj.traceCurrPos = o.pos;

    // Optionally reinitialize if enabled
    if (obj.traceOn && o.traceBtn) {
      setTraceMaterial(obj);
    }
  });
}

function setTraceMaterial(obj) {
  // 1) Compute how many segments we need
  const vertexCount = Math.round(obj.traceLength / obj.traceStep);

  // 2) If there’s an existing traceLine, remove & dispose it
  if (obj.traceLine && obj.traceLine instanceof THREE.Line) {
    scene.remove(obj.traceLine);

    // dispose old geometry & material to free GPU/JS memory
    obj.traceLine.geometry.dispose();
    obj.traceLine.material.dispose();

    obj.traceLine = null;
  }

  // 3) Build the new geometry and fill its position attribute
  const positions = new Float32Array(vertexCount * 3);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  // 4) Create a simple line material (no texture)
  const lineMaterial = new THREE.LineBasicMaterial({
    color:       obj.color,
    linewidth:   obj.size,    // note: many platforms ignore linewidth > 1
    transparent: true,
    opacity:     0.7
  });

  // 5) Create the Line mesh, hide it, and add to scene
  obj.traceLine = new THREE.Line(lineGeometry, lineMaterial);
  obj.traceLine.visible = false;
  scene.add(obj.traceLine);
}

function tracePlanet(obj, pos) {
  let update = false;

  if (!obj.traceOn || !o.traceBtn) {
    if (obj.traceLine && obj.traceLine instanceof THREE.Object3D) {
      obj.traceLine.visible = false;
    }
    return;
  }

  if (pos < obj.traceStartPos) {
    resetAllTraces(obj);
    update = true;
  }

  if (pos < obj.traceCurrPos) {
    obj.traceCurrPos = obj.traceStartPos;
    obj.traceArrIndex = 0;
    update = true;
  }

  if (obj.traceCurrPos + obj.traceStep > pos && !update) return;

  if (!obj.traceLine || !(obj.traceLine instanceof THREE.Object3D)) {
    setTraceMaterial(obj);
  }

  let nextPos = obj.traceCurrPos;
  const positionAttr = obj.traceLine.geometry.attributes.position;
  const vertArray = positionAttr.array;
  const pointCount = vertArray.length / 3;

  while (nextPos < pos) {
    moveModel(nextPos);
    earth.containerObj.updateMatrixWorld();
    const epos = new THREE.Vector3();
    obj.planetObj.getWorldPosition(epos);

    const writeIndex = (obj.traceArrIndex % pointCount) * 3;
    vertArray[writeIndex + 0] = epos.x;
    vertArray[writeIndex + 1] = epos.y;
    vertArray[writeIndex + 2] = epos.z;

    obj.traceArrIndex++;
    nextPos += obj.traceStep;
  }

  positionAttr.needsUpdate = true;
  obj.traceCurrPos = nextPos - obj.traceStep;
  obj.traceLine.visible = true;
}

function getZodiacRotationSpeed() {
  const earth = planetObjects.find(obj => obj.name === "Earth");
  return earth ? -earth.speed : 0;
}

function moveModel(pos){
  planetObjects.forEach(obj => {
    obj.orbitObj.rotation.y = obj.speed * pos - obj.startPos * (Math.PI/180)
    if (obj.rotationSpeed) {
      obj.planetObj.rotation.y = obj.rotationSpeed * pos 
    }
  })
  zodiac.rotation.y = -Math.PI/3 - earth.orbitObj.rotation.y;
}

//
function getOptimizedPixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 768;

  if (smallScreen && dpr > 1.5) {
    return 1.2; // Lower pixel ratio for small mobile devices
  } else {
    return Math.min(dpr, 2); // Keep max 2 for normal desktop/tablet
  }
}

// And your normal resize function:
function onWindowResize() {
  const width  = window.innerWidth;
  const height = window.innerHeight;

  // 1) update camera
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // 2) resize WebGL
  renderer.setSize(width, height);
  renderer.setPixelRatio(getOptimizedPixelRatio());

  // 3) resize CSS2DRenderer
  labelRenderer.setSize(width, height);
}

function addPolarGridHelper(inplanet, planetSize = 10) {
  const polarGridHelper = new THREE.PolarGridHelper(
    planetSize * 1.1,  // slightly bigger than the planet
    12,                // 12 radial lines (for zodiac / months / seasons)
    6,                 // 6 circles
    32,                // fewer segments per circle (performance)
    0x0000ff,          // radial line color (blue)
    0x808080           // circle line color (gray)
  );
  polarGridHelper.material.opacity = 0.5;
  polarGridHelper.material.transparent = true;
  polarGridHelper.rotation.x = Math.PI / 2; // flat
  inplanet.add(polarGridHelper);
}

function posToDays(pos) {
  pos += sHour*12 //Set the clock to twelve for pos 0
	return Math.floor(pos/sDay)
}

function posToTime(pos) {
  pos += sHour*12 //Set the clock to twelve for pos 0
	let days = pos/sDay - Math.floor(pos/sDay)
  let hours = Math.floor(days*24);
  let minutes = Math.floor((days*24 - hours) * 60);
  let seconds = Math.round(((days*24 - hours) * 60 - minutes) * 60);

  if (seconds === 60) {
    seconds = 0;
    minutes += 1;
  }

  if (minutes === 60) {
    minutes = 0;
    hours += 1;
  }
  
	let hh = ("0" + hours).slice(-2);
  let mm = ("0" + minutes).slice(-2);
  let ss = ("0" + seconds).slice(-2);

  return hh + ":" + mm +":" + ss
}

function timeToPos(value) {
  let aTime = value.split(":");
  let pos = aTime[0] * sHour + aTime[1] * sMinute + aTime[2] * sSecond
  return pos-= sHour*12 //Set the clock to tweleve for pos 0
}

//Returns the angle from the sun to targetPlanet as viewed from earth using the cosine rule.
function getElongationFromSun(targetPlanet) {
  let sunPosition = new THREE.Vector3();
  let earthPosition = new THREE.Vector3();
  let targetPlanetPosition = new THREE.Vector3();

  sun.planetObj.getWorldPosition(sunPosition);
  earth.planetObj.getWorldPosition(earthPosition);
  targetPlanet.planetObj.getWorldPosition(targetPlanetPosition);

  let earthSunDistance = earthPosition.distanceTo(sunPosition);
  let earthTargetPlanetDistance = earthPosition.distanceTo(targetPlanetPosition);
  let sunTargetPlanetDistance = sunPosition.distanceTo(targetPlanetPosition);

  let numerator =
    Math.pow(earthSunDistance, 2) +
    Math.pow(earthTargetPlanetDistance, 2) -
    Math.pow(sunTargetPlanetDistance, 2);

  let denominator = 2.0 * earthSunDistance * earthTargetPlanetDistance;

  let elongationRadians = Math.acos(numerator / denominator);
  return (180.0 * elongationRadians) / Math.PI;
}

function updateElongations() {
  o["moonElongation"]=getElongationFromSun(moon);
  o["mercuryElongation"]=getElongationFromSun(mercury);
  o["venusElongation"]=getElongationFromSun(venus);
  o["marsElongation"]=getElongationFromSun(mars);
  o["jupiterElongation"]=getElongationFromSun(jupiter);
  o["saturnElongation"]=getElongationFromSun(saturn);
  o["uranusElongation"]=getElongationFromSun(uranus);
  o["neptuneElongation"]=getElongationFromSun(neptune);
};

function updatePredictions() {
  // 1. Auto-copy fields with same names
  for (let key in predictions) {
    if (o.hasOwnProperty(key)) {
      predictions[key] = o[key];
    }
  }
  
    //  predictions.lengthofDay = parseFloat(predictions.lengthofDay.toFixed(2));
  //predictions.lengthofDay = computeLengthofDay(o.juliandaysbalancedJD);
  //predictions.lengthofsiderealDay = computeLengthofsiderealDay(o.juliandaysbalancedJD);
  //predictions.predictedDeltat = parseFloat(meanlengthofday);
  
  predictions.lengthofDay = o.lengthofDay = computeLengthofDay(o.currentYear, balancedYear, perihelionCycleLength, o.perihelionprecessioncycleYear, helionpointAmplitude, meansolardayAmplitudeinSeconds, meanlengthofday);
  //predictions.lengthofsiderealDay = o.lengthofsiderealDay = computeLengthofsiderealDay(o.currentYear);
  //predictions.predictedDeltat = o.predictedDeltat = computePredictedDeltat(o.currentYear);
  predictions.lengthofsolarYear = o.lengthofsolarYear = computeLengthofsolarYear(o.currentYear, balancedYear, perihelionCycleLength, o.perihelionprecessioncycleYear, meansolaryearAmplitudeinDays, meansolaryearlengthinDays);
  predictions.lengthofsiderealYear = o.lengthofsiderealYear = computeLengthofsiderealYear(o.currentYear, balancedYear, perihelionCycleLength, o.perihelionprecessioncycleYear, meansiderealyearAmplitudeinSeconds, meansiderealyearlengthinSeconds);
  predictions.lengthofanomalisticYear = computeLengthofanomalisticYear(o.perihelionPrecession, o.lengthofsolarYear);
  predictions.perihelionPrecession = o.perihelionPrecession = computePerihelionPrecession(o.axialPrecession);
  predictions.axialPrecession = o.axialPrecession = computeAxialPrecession(o.lengthofsiderealYear, o.lengthofsolarYear);
  predictions.inclinationPrecession = computeInclinationPrecession(o.axialPrecession);
  predictions.obliquityPrecession = computeObliquityPrecession(o.axialPrecession);
  predictions.eclipticPrecession = computeEclipticPrecession(o.axialPrecession);
  predictions.eccentricityEarth = computeEccentricityEarth(o.currentYear, balancedYear, perihelionCycleLength, eccentricityMean, eccentricityAmplitude, eccentricitySinusCorrection);
  predictions.obliquityEarth = computeObliquityEarth(o.currentYear);
  predictions.inclinationEarth = computeInclinationEarth(o.currentYear, balancedYear, holisticyearLength, earthinclinationMean, tiltandinclinationAmplitude);
  predictions.longitudePerihelion = computeLongitudePerihelion(o.currentYear, balancedYear, perihelionCycleLength, o.perihelionprecessioncycleYear, helionpointAmplitude, mideccentricitypointAmplitude);
  //predictions.lengthofAU = o.lengthofAU = computeLengthofAU(o.currentYear);
  //predictions.anomalisticMercury = o.anomalisticMercury = computeAnomalisticMercury(o.currentYear);

}

// 2000.57860 o.currentYear
// 10315.566 o.perihelionprecessioncycleYear

//function computeLengthofDay(currentYear) {
// const secondsInDay = 86400; // Normal seconds in a day
//  const changeRatePerYear = 0.001 / (100 * 365.25); // millisecond drift per day per year

//  const yearsSinceBalance = juliandaysbalancedJD / 365.25;
//  const changeInSeconds = yearsSinceBalance * changeRatePerYear;

//  return secondsInDay + changeInSeconds; // New length of day
//}

//function computeLengthofsiderealDay(currentYear) {

//  return juliandaysbalancedJD
//}


/**
 * Compute the length of day (in seconds) for a given year.
 *
 * @param {number} currentYear                      – the year you want to compute for
 * @param {number} balancedYear                     – the reference (“balanced”) year
 * @param {number} perihelionCycleLength            – length of the perihelion cycle (in years)
 * @param {number} perihelionprecessioncycleYear    – the precession cycle year threshold
 * @param {number} helionpointAmplitude             – amplitude of the perihelion‐point variation (in degrees)
 * @param {number} meansolardayAmplitudeinSeconds   – amplitude of the mean solar‐day variation (in seconds)
 * @param {number} meanlengthofday                  – the base mean length of day (in seconds)
 * @returns {number} lengthofDay (in seconds)
 */
function computeLengthofDay(
  currentYear,
  balancedYear,
  perihelionCycleLength,
  perihelionprecessioncycleYear,
  helionpointAmplitude,
  meansolardayAmplitudeinSeconds,
  meanlengthofday
) {
  // Δ‐year
  const delta = currentYear - balancedYear;

  // Excel’s IF: if (Δ/length < 1) then Δ else perihelionprecessioncycleYear
  const cycleValue = (delta / perihelionCycleLength) < 1
    ? delta
    : perihelionprecessioncycleYear;

  // factor: helionpointAmplitude / ((360/perihelionCycleLength) * 100)
  const firstFactor = helionpointAmplitude / ((360 / perihelionCycleLength) * 100);

  // angle for the first COS term (in radians):
  // (cycleValue / perihelionCycleLength) * 360°
  const angle1 = (cycleValue / perihelionCycleLength) * 360 * Math.PI / 180;
  const term1 = -meansolardayAmplitudeinSeconds * firstFactor * Math.cos(angle1);

  // angle for the second COS term (in radians):
  // (cycleValue / (perihelionCycleLength/2)) * 360°
  const angle2 = (cycleValue / (perihelionCycleLength / 2)) * 360 * Math.PI / 180;
  const term2 = -meansolardayAmplitudeinSeconds * Math.cos(angle2);

  // sum both terms + base mean length of day
  return term1 + term2 + meanlengthofday;
}

/**
 * Compute the length of the solar year (in days) for a given year.
 *
 * @param {number} currentYear                      – the year you want to compute for
 * @param {number} balancedYear                     – the reference (“balanced”) year
 * @param {number} perihelionCycleLength            – length of the perihelion cycle (in years)
 * @param {number} perihelionprecessioncycleYear    – the precession cycle year threshold
 * @param {number} meansolaryearAmplitudeinDays     – amplitude of the solar‐year variation (in days)
 * @param {number} meansolaryearlengthinDays        – the base mean length of solar year (in days)
 * @returns {number} lengthofsolarYear (in days)
 */
function computeLengthofsolarYear(
  currentYear,
  balancedYear,
  perihelionCycleLength,
  perihelionprecessioncycleYear,
  meansolaryearAmplitudeinDays,
  meansolaryearlengthinDays
) {
  // Δ‐year
  const delta = currentYear - balancedYear;

  // Excel’s IF: if (Δ/length < 1) then Δ else perihelionprecessioncycleYear
  const cycleValue = (delta / perihelionCycleLength) < 1
    ? delta
    : perihelionprecessioncycleYear;

  // angle in radians: (cycleValue/perihelionCycleLength) * 360°
  const angle = (cycleValue / perihelionCycleLength) * 360 * Math.PI / 180;

  // formula: amplitude × sin(angle) + base length
  return meansolaryearAmplitudeinDays * Math.sin(angle)
       + meansolaryearlengthinDays;
}

/**
 * Compute the length of the sidereal year (in seconds) for a given year.
 *
 * @param {number} currentYear                          – the year you want to compute for
 * @param {number} balancedYear                         – the reference (“balanced”) year
 * @param {number} perihelionCycleLength                – length of the perihelion cycle (in years)
 * @param {number} perihelionprecessioncycleYear        – the precession cycle year threshold
 * @param {number} meansiderealyearAmplitudeinSeconds   – amplitude of the sidereal‐year variation (in seconds)
 * @param {number} meansiderealyearlengthinSeconds      – the base mean length of sidereal year (in seconds)
 * @returns {number} lengthofsiderealYear (in seconds)
 */
function computeLengthofsiderealYear(
  currentYear,
  balancedYear,
  perihelionCycleLength,
  perihelionprecessioncycleYear,
  meansiderealyearAmplitudeinSeconds,
  meansiderealyearlengthinSeconds
) {
  // Δ‐year
  const delta = currentYear - balancedYear;

  // Excel’s IF: if (Δ/length < 1) then Δ else perihelionprecessioncycleYear
  const cycleValue = (delta / perihelionCycleLength) < 1
    ? delta
    : perihelionprecessioncycleYear;

  // angle in radians: (cycleValue / perihelionCycleLength) * 360°
  const angle = (cycleValue / perihelionCycleLength) * 360 * Math.PI / 180;

  // formula: − amplitude × sin(angle) + base length
  return -meansiderealyearAmplitudeinSeconds * Math.sin(angle)
         + meansiderealyearlengthinSeconds;
}

/**
 * Compute the length of the anomalistic year (in seconds).
 *
 * @param {number} perihelionPrecession – the perihelion precession value
 * @param {number} lengthofsolarYear    – the length of the solar year (in days)
 * @returns {number} lengthofanomalisticYear (in seconds)
 */
function computeLengthofanomalisticYear(
  perihelionPrecession,
  lengthofsolarYear
) {
  return ((perihelionPrecession * lengthofsolarYear) /
          (perihelionPrecession - 1)) * 86400;
}

/**
 * Compute the perihelion precession.
 *
 * @param {number} axialPrecession – the axial precession value
 * @returns {number} perihelionPrecession
 */
function computePerihelionPrecession(axialPrecession) {
  return axialPrecession * 13 / 16;
}

/**
 * Compute the axial precession.
 *
 * @param {number} lengthofsiderealYear – the length of the sidereal year (in seconds)
 * @param {number} lengthofsolarYear    – the length of the solar year (in days)
 * @returns {number} axialPrecession
 */
function computeAxialPrecession(
  lengthofsiderealYear,
  lengthofsolarYear
) {
  return lengthofsiderealYear /
         (lengthofsiderealYear - (lengthofsolarYear * 86400));
}

/**
 * Compute the inclination precession.
 *
 * @param {number} axialPrecession – the axial precession value
 * @returns {number} inclinationPrecession
 */
function computeInclinationPrecession(axialPrecession) {
  return axialPrecession * 13 / 3;
}

/**
 * Compute the obliquity precession.
 *
 * @param {number} axialPrecession – the axial precession value
 * @returns {number} obliquityPrecession
 */
function computeObliquityPrecession(axialPrecession) {
  return axialPrecession * 13 / 8;
}

/**
 * Compute the ecliptic precession.
 *
 * @param {number} axialPrecession – the axial precession value
 * @returns {number} eclipticPrecession
 */
function computeEclipticPrecession(axialPrecession) {
  return axialPrecession * 13 / 5;
}

/**
 * Compute Earth's orbital eccentricity for a given year.
 *
 * @param {number} currentYear
 * @param {number} balancedYear
 * @param {number} perihelionCycleLength
 * @param {number} eccentricityMean
 * @param {number} eccentricityAmplitude
 * @param {number} eccentricitySinusCorrection
 * @returns {number}
 */
function computeEccentricityEarth(
  currentYear,
  balancedYear,
  perihelionCycleLength,
  eccentricityMean,
  eccentricityAmplitude,
  eccentricitySinusCorrection
) {
  // 1. root = √(eₘ² + a²)
  const root = Math.sqrt(
    eccentricityMean * eccentricityMean +
    eccentricityAmplitude * eccentricityAmplitude
  );

  // 2. θ in radians
  const degrees = ((currentYear - balancedYear) / perihelionCycleLength) * 360;
  const θ = degrees * Math.PI / 180;

  const cosθ = Math.cos(θ);
  const absCosθ = Math.abs(cosθ);
  const signCosθ = Math.sign(cosθ);

  // 3. pull the sign out of the exponentiation
  const term1 = signCosθ * Math.pow(absCosθ, eccentricitySinusCorrection);
  const term2 =      cosθ * Math.pow(absCosθ, eccentricitySinusCorrection);

  // 4. two candidate eccentricities
  const e1 = root +
    (
      -eccentricityAmplitude +
      (eccentricityMean - root) * term1
    ) * cosθ;

  const e2 = root +
    (
      -eccentricityAmplitude +
      (eccentricityMean - root) * term2
    ) * cosθ;

  // 5. pick the branch
  return e1 > root ? e1 : e2;
}

/**
 * Compute Earth's obliquity (tilt) for a given decimal year.
 *
 * Relies on these values being in scope:
 *   - earthtiltMean                  (mean obliquity, in degrees)
 *   - tilandinclinationAmplitude  (amplitude, in degrees)
 *   - balancedYear                   (reference year for phase = 0)
 *   - holisticyearLength             (full cycle length, in years)
 *
 * @param {number} currentYear  – e.g. the decimal year from your JD→year fn
 * @returns {number}            Earth's tilt (in degrees) at that year
 */
function computeObliquityEarth(currentYear) {
  const t = currentYear - balancedYear;

  // two cycle lengths (years) for the cosine terms:
  const cycle3 = holisticyearLength / 3;
  const cycle8 = holisticyearLength / 8;

  // Convert each fractional cycle into radians:
  //    (t / cycle) * 360°  →  in radians = (t / cycle) * 2π
  const phase3 = (t / cycle3) * 2 * Math.PI;
  const phase8 = (t / cycle8) * 2 * Math.PI;

  // obliquityEarth
  //   + [–A * cos(phase3)] 
  //   + [+A * cos(phase8)]
  return earthtiltMean
       - tiltandinclinationAmplitude * Math.cos(phase3)
       + tiltandinclinationAmplitude * Math.cos(phase8);
}

/**
 * Compute Earth’s orbital inclination for a given year.
 *
 * @param {number} currentYear                   – the year you want to compute for
 * @param {number} balancedYear                  – the reference (“balanced”) year
 * @param {number} holisticyearLength            – length of the holistic cycle (in years)
 * @param {number} earthinclinationMean          – the mean inclination (in degrees)
 * @param {number} tiltandinclinationAmplitude   – amplitude of the tilt & inclination variation (in degrees)
 * @returns {number} the computed inclination (in degrees)
 */
function computeInclinationEarth(
  currentYear,
  balancedYear,
  holisticyearLength,
  earthinclinationMean,
  tiltandinclinationAmplitude
) {
  // 1. Compute cycle position in degrees
  const degrees = (
    (currentYear - balancedYear) /
    (holisticyearLength / 3)
  ) * 360;

  // 2. Convert to radians
  const radians = degrees * Math.PI / 180;

  // 3. Apply the formula
  return earthinclinationMean +
         (-tiltandinclinationAmplitude * Math.cos(radians));
}

/**
 * Compute the longitude of perihelion for a given year.
 *
 * @param {number} currentYear                        – the year you want to compute for
 * @param {number} balancedYear                       – the reference (“balanced”) year
 * @param {number} perihelionCycleLength              – length of the perihelion cycle (in years)
 * @param {number} perihelionprecessioncycleYear      – the precession cycle year threshold
 * @param {number} helionpointAmplitude               – amplitude of the perihelion-point variation (in degrees)
 * @param {number} mideccentricitypointAmplitude      – amplitude of the mid-eccentricity-point variation (in degrees)
 * @returns {number} longitudePerihelion (in degrees)
 */
function computeLongitudePerihelion(
  currentYear,
  balancedYear,
  perihelionCycleLength,
  perihelionprecessioncycleYear,
  helionpointAmplitude,
  mideccentricitypointAmplitude
) {
  // 1. Determine which cycle value to use
  const delta = currentYear - balancedYear;
  const cycleValue = (delta / perihelionCycleLength) > 1
    ? delta
    : perihelionprecessioncycleYear;

  // 2. First sinusoidal term:
  //    helionpointAmplitude * sin( (cycleValue / perihelionCycleLength) * 360° )
  const angle1 = (cycleValue / perihelionCycleLength) * 360;
  const term1 = helionpointAmplitude * Math.sin(angle1 * Math.PI / 180);

  // 3. Linear drift term normalized into [0, 360):
  //    270 + delta * (360 / perihelionCycleLength)
  //    then subtract floor(.../360)*360
  const raw = 270 + delta * (360 / perihelionCycleLength);
  const term2 = raw - Math.floor(raw / 360) * 360;

  // 4. Second sinusoidal term:
  //    mideccentricitypointAmplitude * sin( (cycleValue / (perihelionCycleLength/2)) * 360° )
  const angle3 = (cycleValue / (perihelionCycleLength / 2)) * 360;
  const term3 = mideccentricitypointAmplitude * Math.sin(angle3 * Math.PI / 180);

  // 5. Sum all contributions
  return term1 + term2 + term3;
}

/**
 * Calculate the offset into the current 1/16-cycle.
 *
 * @param {number} currentYear               – e.g. your decimal year from JD
 * @param {number} balancedYear              – reference “start” of the cycle
 * @param {number} holisticyearLength        – full cycle length in years
 * @returns {number}  A value in [0, holisticyearLength/16)
 */
function yearInCycle(currentYear, balancedYear, holisticyearLength) {
  const delta       = currentYear - balancedYear;
  // Excel’s ROUNDDOWN(...,0) is truncation toward zero
  const wholeCycles = Math.trunc(delta / perihelionCycleLength);
  return delta - wholeCycles * perihelionCycleLength;
}

/**
 * Convert an astronomical Julian Date to a decimal year, using
 * the Julian calendar before 1582‐10‐15 and the Gregorian calendar thereafter.
 *
 * @param {number} jd  Astronomical Julian Date (can include fractional days).
 * @returns {number}   Decimal year (e.g. 1999.1234).
 */
function julianDateToDecimalYear(jd) {
  // 1) Compute intermediate values
  const J = jd + 0.5;
  const Z = Math.floor(J);
  const F = J - Z;

  // 2) Decide which calendar to use
  //    The switch happens at JD = 2299160.5 (1582-10-15 00:00 UTC)
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  // 3) Convert to calendar date (year, month, day.fraction)
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = (E < 14) ? E - 1 : E - 13;
  const year  = (month > 2) ? C - 4716 : C - 4715;

  // 4) Figure out day‐of‐year, including the fractional part
  //    Build month lengths array according to the calendar in use
  const isGregorian = (Z >= 2299161);
  const isLeap = isGregorian
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))
    : (year % 4 === 0);

  const monthLengths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = day;
  for (let m = 0; m < month - 1; m++) {
    dayOfYear += monthLengths[m];
  }

  // 5) Compute decimal year
  const daysInYear = isLeap ? 366 : 365;
  // At Jan 1 00:00 → dayOfYear = 1 → fraction = 0 → decimalYear = year
  const decimalYear = year + (dayOfYear - 1) / daysInYear;

  return decimalYear;
}

//*************************************************************
// F:CREATE PLANETS
//*************************************************************
function createPlanet(pd) { // pd = Planet Data

  // Orbit container
  const orbitContainer = new THREE.Object3D();
  orbitContainer.rotation.x = pd.orbitTilta * (Math.PI / 180);
  orbitContainer.rotation.z = pd.orbitTiltb * (Math.PI / 180);
  orbitContainer.position.set(pd.orbitCentera, pd.orbitCenterc, pd.orbitCenterb);

  // Orbit object
  const orbit = new THREE.Object3D();

  // Correct orbit: support for eccentricity (ellipse)
  const points = [];
  const segments = 100;
  const semiMajor = pd.orbitSemiMajor !== undefined ? pd.orbitSemiMajor : pd.orbitRadius;
  const semiMinor = pd.orbitSemiMinor !== undefined ? pd.orbitSemiMinor : pd.orbitRadius;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * semiMajor,
      Math.sin(angle) * semiMinor,
      0
    ));
  }

  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const orbitMaterial = new THREE.LineBasicMaterial({ color: pd.color, transparent: true, opacity: 0.4 });
  const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);

  orbitLine.rotation.x = Math.PI / 2; // Rotate into XZ plane
  orbit.add(orbitLine);

  // Material setup (choose texture first if available)
  let materialOptions = {};

  if (pd.textureUrl) {
    const texture = loadTexture(pd.textureUrl);
    materialOptions.map = texture;
    materialOptions.bumpScale = 0.05;
    materialOptions.specular = new THREE.Color('#190909'); // Dark specular for older phong look

    if (pd.textureTransparency) {
      materialOptions.transparent = true;
      materialOptions.opacity = pd.textureTransparency;
    }
  } else {
    // If no texture, fallback to basic color
    materialOptions.color = pd.color;
  }

  // Then optionally add emissive settings
  if (pd.emissive || pd.planetColor) {
    materialOptions.emissive = pd.planetColor || pd.color;
    materialOptions.emissiveIntensity = 2; // <- back to your original intensity
  }

  const planetMaterial = new THREE.MeshPhongMaterial(materialOptions);

  // Planet sphere
  const segmentsSphere = pd.sphereSegments || 32;
  const sphereGeometry = new THREE.SphereGeometry(pd.size, segmentsSphere, segmentsSphere);
  const planetMesh = new THREE.Mesh(sphereGeometry, planetMaterial);
  
  // 🌑 Apply shadow flags only to real planets
  if (/Barycenter|Precession|WOBBLE|HELION|Eccentricity|Helion|Starting|Cycle|Ellipse/i.test(pd.name)) {
    if (pd.textureUrl) {
    const texture = loadTexture(pd.textureUrl);
    planetMesh.material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0x777777, // ← dims the texture
      transparent: !!pd.textureTransparency,
      opacity: pd.textureTransparency || 1.0,
      });
    }
  } else {
  planetMesh.material = planetMaterial; 
  planetMesh.castShadow = true;
  planetMesh.receiveShadow = true;
  }

  // Pivot (center of orbit)
  const pivot = new THREE.Object3D();
  pivot.position.set(semiMajor, 0, 0); // Adjust pivot to semiMajor if eccentric
  orbit.add(pivot);

  // Rotation axis
  const rotationAxis = new THREE.Object3D();
  rotationAxis.position.copy(pivot.position);
  rotationAxis.rotation.z = pd.tilt * (Math.PI / 180);

  if (pd.tiltb) {
    rotationAxis.rotation.x = pd.tiltb * (Math.PI / 180);
  }

  // Ring system (optional)
  if (pd.ringUrl) {
    const texLoader = new THREE.TextureLoader();
    texLoader.load(pd.ringUrl, texture => {
    if (!(isPowerOfTwo(texture.image.width) &&
          isPowerOfTwo(texture.image.height))) {
      console.warn('Ring texture is not POT—will be clamped.');
    }
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( segments, 1 );

    // disable mipmaps so nothing ever clamps to the border
    texture.generateMipmaps = false;
    texture.minFilter     = THREE.LinearFilter;
    texture.needsUpdate   = true;
    texture.center.set(0.5, 0.5);
    texture.rotation = 0;              // rotate if you need to flip inward

    const ring = createRings(pd.ringSize, segments, texture);
    rotationAxis.add(ring);
    pd.ringObj = ring;
    });
  }

  rotationAxis.add(planetMesh);

  // Optional: name tag (commented, activate if needed)
  // const nameTag = createLabel(pd.name);
  // nameTag.position.copy(rotationAxis.position);
  // nameTag.scale.set(10, 10, 10);
  // rotationAxis.add(nameTag);

  orbit.add(rotationAxis);
  orbitContainer.add(orbit);

  // Axis helper (only if explicitly set)
  if (pd.axisHelper === true) {
    const axisHelper = new THREE.AxesHelper(pd.size * 3);
    planetMesh.add(axisHelper);
    pd.axisHelperObj = axisHelper;
  }

  // Save references
  pd.containerObj = orbitContainer;
  pd.orbitObj = orbit;
  pd.orbitLineObj = orbitLine;
  pd.planetObj = planetMesh;
  pd.planetMaterial = planetMaterial;
  pd.pivotObj = pivot;
  pd.rotationAxis = rotationAxis;

  // ✅ Log the material type and settings
  if (!/Barycenter|Precession|Cycle|Ellipse/i.test(pd.name)) {
  console.log(`Created planet: ${pd.name}`);
  console.log('Material type:', planetMaterial.type);
  console.log('Material options:', {
    map: planetMaterial.map ? '✔ texture' : '✖ no texture',
    color: planetMaterial.color.getHexString(),
    emissive: planetMaterial.emissive.getHexString(),
    transparent: planetMaterial.transparent,
    opacity: planetMaterial.opacity,
  });
  console.log('Shadow flags:', {
    castShadow: planetMesh.castShadow,
    receiveShadow: planetMesh.receiveShadow
  });
}

  // Add to scene
  scene.add(orbitContainer);
}

function createRings(radius, segments, texture) {
  const geometry = new THREE.RingGeometry(1.2 * radius, 2 * radius, 2 * segments, 5, 0, Math.PI * 2);

  // Fix UV mapping to wrap around
  const uvs = geometry.attributes.uv;
  const pos = geometry.attributes.position;
  const innerR = 1.2 * radius;
  const outerR = 2   * radius;
  for (let i = 0; i < uvs.count; i++) {
  const x = pos.getX(i), y = pos.getY(i);
  // U: full 0→1 sweep around the circle
  const u = ( Math.atan2(y, x) + Math.PI ) / (2 * Math.PI);
  // V: map the ring-width to 0→1
  const dist = Math.sqrt(x*x + y*y);
  const v = (dist - innerR) / (outerR - innerR);
  uvs.setXY(i, u, v);
  }
  geometry.attributes.uv.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
  //const material = new THREE.MeshPhongMaterial({
    map:         texture,
    side:        THREE.DoubleSide,
    transparent: true,
    opacity:     0.6
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;   // lie flat
  return ring;
}

function createCelestialSphere(radius) {
  const geometry1 = new THREE.SphereGeometry( radius, 40, 40 );
  const material1 = new THREE.MeshNormalMaterial( { transparent: true, wireframe: false, opacity: 0 , depthWrite: false} );
  const mesh1 = new THREE.Mesh( geometry1, material1 );
  const edgesGeometry = new THREE.EdgesGeometry( geometry1 );
  const wireframe = new THREE.LineSegments( edgesGeometry, new THREE.LineBasicMaterial( { color: 0x666666, transparent: true, opacity: 0.3 } ) );
  wireframe.add(new THREE.PolarGridHelper( radius, 4, 1, 60, 0x0000ff, 0x0000ff ));

  mesh1.add( wireframe );
  mesh1.wireFrameObj = wireframe;
  return mesh1;
}

function showHideObject(obj) {
    obj.orbitLineObj.visible = obj.visible;
    if (obj.planetObj) {
       obj.planetObj.visible = obj.visible;
       }
    if (obj.axisHelper) {
      if (obj.visible) {
        obj.axisHelper.visible = o['Axis helpers']
      } else {
        obj.axisHelper.visible = obj.visible;                       
      }
    }  
    if (obj.ringObj) {
    obj.ringObj.visible = obj.visible;
  }
}

function showHideAxisHelpers() {
  planetObjects.forEach(obj => {
    if (obj.axisHelper) {
      obj.axisHelper.visible = o['Axis helpers'];
    }  
  });
}

function showHideOrbits() {
  planetObjects.forEach(obj => {
    if (obj.orbitLineObj && !obj.isDeferent) {
       if (obj.visible) {
        obj.orbitLineObj.visible = o['Orbits'];
       }
    }  
  });
}

function randomPointInSphere(radius) {
  const v = new THREE.Vector3();
  let x, y, z, normalizationFactor;

  do {
    x = THREE.MathUtils.randFloat(-1, 1);
    y = THREE.MathUtils.randFloat(-1, 1);
    z = THREE.MathUtils.randFloat(-1, 1);
    normalizationFactor = Math.sqrt(x * x + y * y + z * z);
  } while (normalizationFactor === 0); // retry if all zero

  normalizationFactor = 1 / normalizationFactor;

  v.x = x * normalizationFactor * radius;
  v.y = y * normalizationFactor * radius;
  v.z = z * normalizationFactor * radius;

  return v;
}

function createStarfield() {  
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  for (let i = 0; i < 100000; i++) {
    const vertex = randomPointInSphere(1000000);
    positions.push(vertex.x, vertex.y, vertex.z);

    // Generate random star temperature (Kelvin range for stars)
    const tempK = THREE.MathUtils.randFloat(2000, 10000);
    const color = colorTemperature2rgb(tempK);

    // Convert to 0–255 RGB integers
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    const rgbValues = [r, g, b]; // Same as what match() would have given

    // Normalize to 0..1 for Three.js colors
    colors.push(parseInt(rgbValues[0]) / 255, parseInt(rgbValues[1]) / 255, parseInt(rgbValues[2]) / 255);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true // or THREE.VertexColors (deprecated in newer versions)
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

function setStarDistance() {
  stars.forEach(obj => {
    obj.starObj.position.x = obj.dist * o['Star distance'];
  })
}

function getCircularText(
  text, diameter, startAngle, align, textInside, inwardFacing, 
  fName, fSize, kerning
) {
    align = align.toLowerCase();
    const mainCanvas = document.createElement('canvas');
    const resolutionFactor = 3;
    const ctxRef = mainCanvas.getContext('2d');
    const clockwise = align === "right" ? 1 : -1;
    startAngle = startAngle * (Math.PI / 180);
    
    // Font height measurement
    const div = document.createElement("div");
    div.innerHTML = text;
    div.style.position = 'absolute';
    div.style.top = '-10000px';
    div.style.left = '-10000px';
    div.style.fontFamily = fName;
    div.style.fontSize = fSize;
    div.style.fontWeight = 'bold';
    document.body.appendChild(div);
    const textHeight = div.offsetHeight;
    document.body.removeChild(div);

    if (!textInside) diameter += textHeight * 2;

    const canvasSize = diameter * resolutionFactor;
    mainCanvas.width = canvasSize;
    mainCanvas.height = canvasSize;

    ctxRef.scale(resolutionFactor, resolutionFactor);
    ctxRef.translate(diameter / 2, diameter / 2);
    ctxRef.font = `bold ${fSize} ${fName}`;
    ctxRef.fillStyle = '#ffffff';
    ctxRef.textBaseline = 'middle';
    ctxRef.textAlign = 'center';
    ctxRef.shadowColor = 'black';
    ctxRef.shadowBlur = 4;

    if (((["left", "center"].includes(align)) && inwardFacing) || (align == "right" && !inwardFacing)) {
        text = text.split("").reverse().join("");
    }

    startAngle += (Math.PI * !inwardFacing);

    if (align == "center") {
        for (let j = 0; j < text.length; j++) {
            const charWid = ctxRef.measureText(text[j]).width;
            startAngle += ((charWid + (j === text.length - 1 ? 0 : kerning)) / (diameter / 2 - textHeight)) / 2 * -clockwise;
        }
    }

    ctxRef.rotate(startAngle);

    for (let j = 0; j < text.length; j++) {
        const charWid = ctxRef.measureText(text[j]).width;
        ctxRef.rotate((charWid / 2) / (diameter / 2 - textHeight) * clockwise);
        ctxRef.fillText(text[j], 0, (inwardFacing ? 1 : -1) * (0 - diameter / 2 + textHeight / 2));
        ctxRef.rotate((charWid / 2 + kerning) / (diameter / 2 - textHeight) * clockwise);
    }
  
  return mainCanvas;
}

function colorTemperature2rgb(kelvin) {
  let temperature = kelvin / 100.0;
  let red, green, blue;

  // Calculate red
  if (temperature < 66.0) {
    red = 255;
  } else {
    let t = temperature - 55.0;
    red = 351.97690566805693 + 0.114206453784165 * t - 40.25366309332127 * Math.log(t);
    red = Math.min(Math.max(red, 0), 255);
  }

  // Calculate green
  if (temperature < 66.0) {
    let t = temperature - 2;
    green = -155.25485562709179 - 0.44596950469579133 * t + 104.49216199393888 * Math.log(t);
  } else {
    let t = temperature - 50.0;
    green = 325.4494125711974 + 0.07943456536662342 * t - 28.0852963507957 * Math.log(t);
  }
  green = Math.min(Math.max(green, 0), 255);

  // Calculate blue
  if (temperature >= 66.0) {
    blue = 255;
  } else if (temperature <= 20.0) {
    blue = 0;
  } else {
    let t = temperature - 10;
    blue = -254.76935184120902 + 0.8274096064007395 * t + 115.67994401066147 * Math.log(t);
    blue = Math.min(Math.max(blue, 0), 255);
  }

  // Return as THREE.Color (normalized to [0, 1] range)
  return new THREE.Color(red / 255, green / 255, blue / 255);
}

/**
 * Check whether a given day (JD or Perihelion-day) falls on a
 * Perihelion-calendar “cycle” date: Year % cycleYears === 0, Month=1, Day=1.
 *
 * @param {number} day           — input day count (JD if julianday, or perihelion-day)
 * @param {'julianday'|'perihelionday'} inputKind
 * @param {number} cycleYears    — length of one cycle in Perihelion years (default 19122)
 * @returns {boolean}
 */
function isPerihelionCycle(day, inputKind, cycleYears = (holisticyearLength/16)) {
  // 1) get the Perihelion‐calendar date
  const p = dayToDateNew(day, inputKind, 'perihelion-calendar');
  // p.date is "YYYY-MM-DD" or "-YYYY-MM-DD"
  
  // 2) extract Y/M/D via regex
  const m = /^(-?\d+)-(\d{2})-(\d{2})$/.exec(p.date);
  if (!m) {
    console.warn('Unexpected perihelion date format:', p.date);
    return false;
  }
  const year  = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const dayOfM= parseInt(m[3], 10);

  // 3) check for Jan 1 of a positive multiple of cycleYears
  return (
    month === 1 &&
    dayOfM === 1 &&
    year > 0 &&
    year % cycleYears === 0
  );
}

function triggerPerihelionEasterEgg() {
  // a) Play your chime
  //const audio = new Audio('sounds/celestial-chime.mp3');
  //audio.play();

  // b) Golden glow: animate a bloom post-process or add a sprite/ Needs Bloompass addpass
  //addGoldenGlow(); 

  // c) Cosmic confetti: particle system of little star/comet sprites
  addConfettiParticles( camera.position.distanceTo(scene.position) );
}

function addConfettiParticles(spawnRadius = 5) {
  const geom = new THREE.BufferGeometry();
  const count = 200;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // random direction in a sphere
    const v = new THREE.Vector3(
      (Math.random()*2-1),
      (Math.random()*2-1),
      (Math.random()*2-1)
    ).normalize().multiplyScalar(spawnRadius);
    pos.set([v.x, v.y, v.z], i*3);
  }
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.1,
    map: loadTexture('https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/lensflare2.png'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pts = new THREE.Points(geom, mat);
  scene.add(pts);

  // animate them shooting outward and fading
  new TWEEN.Tween({ t: 0 })
    .to({ t: 1 }, 3000)
    .onUpdate(({ t }) => {
      geom.attributes.position.array.forEach((_, idx, arr) => {
        arr[idx] *= 1 + 2 * (t);  // move outward
      });
      geom.attributes.position.needsUpdate = true;
      mat.opacity = 1 - t;
    })
    .onComplete(() => {
      scene.remove(pts);
      geom.dispose(); mat.dispose();
    })
    .start();
}

function addGoldenGlow() {
  const initial = bloomPass.strength;
  new TWEEN.Tween({ str: initial })
    .to({ str: initial * 2 }, 1000)
    .yoyo(true)
    .repeat(1)
    .onUpdate(({ str }) => bloomPass.strength = str)
    .start();
}

// helper
function isPowerOfTwo(v) {
  return (v & (v - 1)) === 0;
}
//*************************************************************
// EXTERNAL FUNCTIONS
//*************************************************************
  
// === RA and Dec Conversions ===
function raToRadians(raStr) {
  if (typeof raStr !== 'string') {
    console.warn('raToRadians expected a string but got', typeof raStr);
    return 0;
  }

  raStr = raStr.trim().replace(/\s+/g, ''); // Remove all internal whitespace

  // Match formats like: "23h20m38.2s"
  let match1 = raStr.match(/^(\d+)h(\d+)m([\d.]+)s$/);
  if (match1) {
    let [ , hh, mm, ss ] = match1;
    hh = parseFloat(hh);
    mm = parseFloat(mm);
    ss = parseFloat(ss);
    const degrees = (hh + mm / 60 + ss / 3600) * 15;
    return degrees * (Math.PI / 180);
  }

  // Match colon-separated format: "23:20:38.2"
  let match2 = raStr.match(/^(\d+):(\d+):([\d.]+)$/);
  if (match2) {
    let [ , hh, mm, ss ] = match2;
    hh = parseFloat(hh);
    mm = parseFloat(mm);
    ss = parseFloat(ss);
    const degrees = (hh + mm / 60 + ss / 3600) * 15;
    return degrees * (Math.PI / 180);
  }

  console.warn('Unrecognized RA format:', raStr);
  return 0;
}

function radiansToRa(rad) {
  if (rad < 0) rad += 2 * Math.PI;

  const totalHours = rad * 12 / Math.PI;
  const hh = Math.floor(totalHours);
  const mm = Math.floor((totalHours - hh) * 60);
  const ss = Math.round(((totalHours - hh) * 60 - mm) * 60);

  return (
    String(hh).padStart(2, '0') + 'h' +
    String(mm).padStart(2, '0') + 'm' +
    String(ss).padStart(2, '0') + 's'
  );
}

function decToRadians(decStr) {
  if (typeof decStr !== 'string') {
    console.warn('decToRadians expected a string but got', typeof decStr);
    return 0;
  }

  decStr = decStr.trim().replace(/\s+/g, ''); // Remove all internal whitespace

  // Match formats like: "+23°44′25″" or "-12°30′15.5″"
  let match1 = decStr.match(/^(-?\+?\d+)°(\d+)′([\d.]+)″$/);
  if (match1) {
    let [ , deg, min, sec ] = match1;
    deg = parseFloat(deg);
    min = parseFloat(min);
    sec = parseFloat(sec);
    const sign = Math.sign(deg);
    const absDeg = Math.abs(deg) + min / 60 + sec / 3600;
    return sign * absDeg * (Math.PI / 180);
  }

  // Match colon-separated format: "+23:44:25.2"
  let match2 = decStr.match(/^(-?\+?\d+):(\d+):([\d.]+)$/);
  if (match2) {
    let [ , deg, min, sec ] = match2;
    deg = parseFloat(deg);
    min = parseFloat(min);
    sec = parseFloat(sec);
    const sign = Math.sign(deg);
    const absDeg = Math.abs(deg) + min / 60 + sec / 3600;
    return sign * absDeg * (Math.PI / 180);
  }

  console.warn('Unrecognized declination format:', decStr);
  return 0;
}

function radiansToDec(rad) {
  // Convert spherical phi to standard declination (0 at equator, ±90 at poles)
  rad = (rad <= 0) ? rad + Math.PI / 2 : Math.PI / 2 - rad;
  let degDec = rad * 180 / Math.PI;

  const sign = degDec < 0 ? '-' : '+';
  degDec = Math.abs(degDec);

  const degrees = Math.floor(degDec);
  const minutes = Math.floor((degDec - degrees) * 60);
  const seconds = Math.round(((degDec - degrees) * 60 - minutes) * 60);

  return (
    sign +
    String(degrees).padStart(2, '0') + '°' +
    String(minutes).padStart(2, '0') + "'" +
    String(seconds).padStart(2, '0') + '"'
  );
}

function radiansToDecDecimal(rad) {
  rad = (rad <= 0) ? rad + Math.PI / 2 : Math.PI / 2 - rad;
  return (rad * 180 / Math.PI).toFixed(4);
}

// === Utilities ===
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function leadZero(n, plus){
    let sign;
    n < 0 ? sign = "-": sign = "";
    if (sign === "" && plus) {
      sign = "+"
    }
    n = Math.abs(n);
    return n > 9 ? sign + n: sign + "0" + n;
}

function isValidTime(value) {
  const parts = value.split(':');
  // 1) must be exactly hh:mm:ss
  if (parts.length !== 3) return false;

  const [hStr, mStr, sStr] = parts;
  // 2) each piece must be two digits
  if (!/^\d{2}$/.test(hStr)) return false;
  if (!/^\d{2}$/.test(mStr)) return false;
  if (!/^\d{2}$/.test(sStr)) return false;

  const h = Number(hStr);
  const m = Number(mStr);
  const s = Number(sStr);

  // 3) valid ranges
  if (h < 0 || h > 24)      return false;
  if (m < 0 || m > 59)      return false;
  if (s < 0 || s > 59)      return false;
  // extra: only allow 24:00:00 as a special case
  if (h === 24 && (m !== 0 || s !== 0)) return false;

  return true;
}

/**
 * Validate a calendar date string in your Julian⇄Gregorian system.
 *
 * – Accepts astronomical years (“-4712-01-01” → 4713 BC)
 * – Uses Julian leap-rule for dates < 1582-10-15, Gregorian thereafter
 * – Rejects the 10 “skipped” days in Oct 1582
 *
 * @param {string} value  “YYYY-MM-DD” or “-YYYY-MM-DD”
 * @returns {boolean}
 */
function isValidDate(value) {
  // 1) Parse with a single regex; preserve leading “-” on year
  const m = /^(-?\d+)-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (!m) return false;

  const Y = parseInt(m[1], 10);
  const M = parseInt(m[2], 10);
  const D = parseInt(m[3], 10);

  // 2) Basic range checks
  if (M < 1 || M > 12 || D < 1 || D > 31) {
    return false;
  }

  // 3) Reject the “skipped” days of Oct 5–14, 1582
  if (
    Y === GREGORIAN_START.year &&
    M === GREGORIAN_START.month &&
    D > 4 &&
    D < GREGORIAN_START.day
  ) {
    return false;
  }

  // 4) Decide which leap-rule applies
  const beforeGregorian =
    Y < GREGORIAN_START.year ||
    (Y === GREGORIAN_START.year && (
      M < GREGORIAN_START.month ||
      (M === GREGORIAN_START.month && D < GREGORIAN_START.day)
    ));
  const isLeap = beforeGregorian
               ? (Y % 4 === 0)  // Julian rule
               : (Y % 4 === 0 && (Y % 100 !== 0 || Y % 400 === 0));  // Gregorian

  // 5) Month lengths
  const monthLengths = [
    31,
    isLeap ? 29 : 28,
    31, 30, 31, 30,
    31, 31, 30, 31,
    30, 31
  ];
  if (D > monthLengths[M - 1]) {
    return false;
  }

  return true;
}

function addYears(sDate, year) {
  let aDate = sDate.split("-");
  let y, date;
  if (aDate.length > 3) {
    //We had a minus sign first = a BC date
    y = -Number(aDate[1])
    date = (y + year) + "-" + aDate[2] + "-" + aDate[3];
  } else {
    y = Number(aDate[0])
    date = (y + year) + "-" + aDate[1] + "-" + aDate[2];
  };
  return date
}

// === Perihelion Calendar Conversions ===

// Epoch constant: perihelion-day 0 corresponds to Julian Day 2176142
//const PERIHELION_EPOCH_JD = 2176142 = (startmodelJD-perihelionalignmentJD);

function perihelionDayToJulianDay(pd) {
  if (typeof pd !== 'number' || !Number.isFinite(pd)) {
    throw new Error(`Invalid perihelion day: ${pd}`);
  }
  // Simple offset
  return pd + (startmodelJD-perihelionalignmentJD);
}

function julianDayToPerihelionDay(jd) {
  if (typeof jd !== 'number' || !Number.isFinite(jd)) {
    throw new Error(`Invalid Julian Day: ${jd}`);
  }
  return jd - (startmodelJD-perihelionalignmentJD);
}

/**
 * Convert a Julian Day Number to a UTC calendar date + time.
 *
 * @param {number} jd  The Julian Day Number (can be fractional).
 * @returns {{ date: string, time: string, calendar: 'Julian'|'Gregorian' }}
 * @throws {TypeError} If jd is not a finite number.
 */
function dayToDate(jd) {
  if (typeof jd !== 'number' || !isFinite(jd)) {
    throw new TypeError('dayToDate: julian day must be a finite number');
  }

  // shift origin to midnight
  const J = jd + 0.5;
  const Z = Math.floor(J);
  const F = J - Z;

  // determine whether to use Julian or Gregorian calendar rules
  const isGregorian = jd >= GREGORIAN_START_JD;
  let A;
  if (!isGregorian) {
    // Julian calendar
    A = Z;
  } else {
    // Gregorian calendar correction
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  // common steps
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  // day with fractional part
  const dayWithFrac = B - D - Math.floor(30.6001 * E) + F;
  let day = Math.floor(dayWithFrac);
  let fracDay = dayWithFrac - day;

  // month / year
  const month = (E < 14) ? E - 1 : E - 13;
  const year = (month > 2) ? C - 4716 : C - 4715;

  if (year <= 0) {
    console.warn(
      `dayToDate: resulting year is ${year} (astronomical numbering; year 0 = 1 BC).`
    );
  }

  // convert fractional day to H:M:S
  let hours   = Math.floor(fracDay * 24);
  let minutes = Math.floor((fracDay * 24 - hours) * 60);
  let seconds = Math.floor((((fracDay * 24 - hours) * 60) - minutes) * 60 + 0.5);

  // handle rounding spill-over
  if (seconds >= 60) { seconds -= 60; minutes += 1; }
  if (minutes >= 60) { minutes -= 60; hours   += 1; }
  if (hours   >= 24) { hours   -= 24; day      += 1; 
    // note: on an extremely rare rounding boundary this could push you into the next day —
    // if that matters you could re-run the algorithm on jd + tiny epsilon.
  }

  // zero-pad helpers
  const pad2 = n => n.toString().padStart(2, '0');
  const pad4 = n => n.toString().padStart(4, '0');

  return {
    calendar: isGregorian ? 'Gregorian' : 'Julian',
    date: `${pad4(year)}-${pad2(month)}-${pad2(day)}`,
    time: `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
  };
}

/*––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  Helpers below: you can tuck these in the same module/file.
––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––*/

/**
 * Convert either a Julian or Perihelion day count into a calendar date/time
 * in either the standard Julian→Gregorian switch or a Perihelion calendar.
 *
 * @param {number} day      — the input day count (may be fractional)
 * @param {'julianday'|'perihelionday'} inputKind
 * @param {'julian-gregorian-calendar'|'perihelion-calendar'} outputKind
 * @returns {{ calendar: string, date: string, time: string }}
 * @throws {TypeError|Error} on bad input
 */
function dayToDateNew(day, inputKind, outputKind) {
  // 1) Validate
  // 1) Normalize & validate `day`
  const d = Number(day);
  if (!Number.isFinite(d)) {
    throw new TypeError(
      `dayToDateNew: first argument must be a finite number, got ${day}`
    );
  }
  day = d;

  // 2) Validate your flags
  if (inputKind !== 'julianday' && inputKind !== 'perihelionday') {
    throw new TypeError(
      `dayToDateNew: inputKind must be 'julianday' or 'perihelionday'`
    );
  }
  if (
    outputKind !== 'julian-gregorian-calendar' &&
    outputKind !== 'perihelion-calendar'
  ) {
    throw new TypeError(
      `dayToDateNew: outputKind must be 'julian-gregorian-calendar' or 'perihelion-calendar'`
    );
  }

  // 3) Turn everything into a single JD
  let jd;
  if (inputKind === 'julianday') {
    jd = day;
  } else {
    // PERIHELION → JD
    jd = day + perihelionalignmentJD;  // perihelion-day 0 was exactly JD = perihelionalignmentJD
  }

  // 4) Dispatch to the right formatter
  if (outputKind === 'julian-gregorian-calendar') {
    return dayToDate(jd);
  } else {
    return dayToPerihelionCalendarDate(jd);
  }
}

/**
 * Convert a calendar date at UTC 00:00 into Julian Day Number.
 *
 * – Accepts astronomical years (year 0 = 1 BC, –1 = 2 BC, etc.)
 * – Uses pure Julian rules before 1582-10-15, Gregorian thereafter.
 *
 * @param {number} Y   full year (may be negative or zero)
 * @param {number} M   month 1–12
 * @param {number} D   day   1–31
 * @returns {number}   Julian Day Number at 00:00 UTC
 * @throws {TypeError} on invalid inputs
 */
function dateToJulianDay(Y, M, D) {
  // 1) Validate types & ranges
  if (!Number.isInteger(Y) || !Number.isInteger(M) || !Number.isInteger(D)) {
    throw new TypeError(
      `dateToJulianDay: expected integers, got Y=${Y}, M=${M}, D=${D}`
    );
  }
  if (M < 1 || M > 12) {
    throw new TypeError(`dateToJulianDay: month out of range: ${M}`);
  }
  if (D < 1 || D > 31) {
    throw new TypeError(`dateToJulianDay: day out of range: ${D}`);
  }

  // 2) Shift Jan/Feb to months 13/14 of previous year
  let y = Y, m = M;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  // 3) Julian vs. Gregorian correction
  let B;
  const beforeGregorian =
    Y <  GREGORIAN_START.year ||
    (Y === GREGORIAN_START.year && (
      M  < GREGORIAN_START.month ||
      (M  === GREGORIAN_START.month && D < GREGORIAN_START.day)
    ));
  if (beforeGregorian) {
    B = 0;  // Julian calendar
  } else {
    const A = Math.floor(y / 100);
    B = 2 - A + Math.floor(A / 4);
  }

  // 4) Compute JD at midnight
  const jd = Math.floor(365.25 * (y + 4716))
           + Math.floor(30.6001 * (m + 1))
           + D + B - 1524.5;

  return jd;
}

/**
 * Convert a calendar date+time (UTC) into a (possibly fractional) Julian Day Number.
 *
 * – Years may be negative or zero (astronomical numbering: 0 = 1 BC, –1 = 2 BC, …)
 * – Dates < 1582-10-15 use the Julian calendar (no century correction)
 * – Dates ≥ 1582-10-15 use the Gregorian calendar correction
 * – Time “24:00:00” is allowed and becomes the next day at 00:00
 *
 * @param {string} dateStr  “YYYY-MM-DD” or “-YYYY-MM-DD”
 * @param {string} timeStr  “hh:mm:ss” or “24:00:00”
 * @returns {number}        fractional Julian Day Number
 * @throws {TypeError}      on malformed date or time
 */
function dateTimeToJulianDay(dateStr, timeStr) {
  // — 1) parse the date, allowing a leading “-” for BC years —
  const dateRe = /^(-?\d+)-(\d{1,2})-(\d{1,2})$/;
  const dm     = dateRe.exec(dateStr);
  if (!dm) {
    throw new TypeError(
      `Invalid date "${dateStr}". Expected "YYYY-MM-DD" or "-YYYY-MM-DD".`
    );
  }
  const Y = parseInt(dm[1], 10),
        M = parseInt(dm[2], 10),
        D = parseInt(dm[3], 10);
  if (M < 1 || M > 12) {
    throw new TypeError(`Invalid month ${M} in date "${dateStr}".`);
  }
  if (D < 1 || D > 31) {
    throw new TypeError(`Invalid day ${D} in date "${dateStr}".`);
  }

  // — 2) parse the time —
  const timeRe = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const tm     = timeRe.exec(timeStr);
  if (!tm) {
    throw new TypeError(
      `Invalid time "${timeStr}". Expected "hh:mm:ss".`
    );
  }
  const hh = parseInt(tm[1], 10),
        mm = parseInt(tm[2], 10),
        ss = parseInt(tm[3], 10);

  // — 3) special‐case 24:00:00 as "next day at midnight" —
  if (hh === 24 && mm === 0 && ss === 0) {
    // compute JD at 00:00 of this date, plus one full day
    const jdMidnight = dateToJulianDay(Y, M, D);
    return jdMidnight + 1;
  }

  // — 4) otherwise validate “normal” time ranges —
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) {
    throw new TypeError(`Invalid time components in "${timeStr}".`);
  }

  // — 5) compute the JD at 00:00 UTC for (Y,M,D) —
  const jd0 = dateToJulianDay(Y, M, D);

  // — 6) add fractional day from time —
  const dayFraction = hh / 24 + mm / 1440 + ss / 86400;
  return jd0 + dayFraction;
}

/** Is a year leap under the old Julian rule? */
function isJulianLeapYear(y) {
  return (y % 4) === 0;
}

/** Is a year leap under the Revised-Julian rule? */
function isRevisedJulianLeapYear(y) {
  if (y % 4 !== 0) return false;
  if (y % 100 !== 0) return true;
  const r = y % 900;
  return (r === 200 || r === 600);
}

/**
 * JD → Perihelion calendar date/time (astronomical years, fractional days).
 */
function dayToPerihelionCalendarDate(jd) {
  // 1) offset so that P=0 at perihelion epoch, integer days at midnight
  const P = jd - perihelionalignmentJD + 0.5;
  let   Z = Math.floor(P);
  const F = P - Z;

  // 2) peel off whole years forward or backward
  let year       = 0;
  let daysPassed = 0;    // days from epoch to start of 'year'
  let daysInYear;

  if (Z >= 0) {
    // move forward from year=0
    while (true) {
      const yearStartJD = perihelionalignmentJD + daysPassed;
      const useRevised  = yearStartJD >= REVISION_START_JD;
      const isLeap      = useRevised
                         ? isRevisedJulianLeapYear(year)
                         : isJulianLeapYear(year);
      daysInYear = isLeap ? 366 : 365;

      if (Z >= daysInYear) {
        Z         -= daysInYear;
        daysPassed+= daysInYear;
        year++;
      } else break;
    }
  } else {
    // move backward from year=0
    while (Z < 0) {
      const prevYear = year - 1;
      // start JD of that previous year:
      //   = epoch JD + (daysPassed minus daysInPrevYear)
      const useRevised = (perihelionalignmentJD + daysPassed) >= REVISION_START_JD;
      const isLeapPrev = useRevised 
                        ? isRevisedJulianLeapYear(prevYear)
                        : isJulianLeapYear(prevYear);
      daysInYear = isLeapPrev ? 366 : 365;

      Z         += daysInYear;
      daysPassed-= daysInYear;
      year--;
    }
  }

  // 3) now Z is day-of-year in [0 .. daysInYear-1]; F is time-fraction
  //    determine leap-flag for THIS year:
  const thisYearStartJD = perihelionalignmentJD + daysPassed;
  const thisUseRevised  = thisYearStartJD >= REVISION_START_JD;
  const thisIsLeap      = thisUseRevised
                         ? isRevisedJulianLeapYear(year)
                         : isJulianLeapYear(year);

  // month/day extraction
  const monthLengths = [31, thisIsLeap?29:28,31,30,31,30,31,31,30,31,30,31];
  let  month = 1;
  let  dayOfYear = Z;
  for (const ml of monthLengths) {
    if (dayOfYear >= ml) {
      dayOfYear -= ml;
      month++;
    } else break;
  }
  const dayOfMonth = dayOfYear + 1;

  // 4) time from F
  let hh = Math.floor(F * 24);
  let mm = Math.floor((F*24 - hh)*60);
  let ss = Math.floor(((F*24 - hh)*60 - mm)*60 + 0.5);
  if (ss >= 60) { ss -= 60; mm++; }
  if (mm >= 60) { mm -= 60; hh++; }

  // zero-pad
  const p2 = n => n.toString().padStart(2,'0');
  const p4 = n => {
    const s = Math.abs(n).toString().padStart(4,'0');
    return n<0 ? `-${s}` : s;
  };

  // warn if astronomical year ≤ 0
  // if (year <= 0) {
  //   console.warn(
  //     `dayToPerihelionCalendarDate: year ${year} ≤ 0 (astronomical numbering).`
  //   );
  // }

  return {
    calendar: 'Perihelion',
    date:     `${p4(year)}-${p2(month)}-${p2(dayOfMonth)}`,
    time:     `${p2(hh)}:${p2(mm)}:${p2(ss)}`
  };
}

/**
 * Convert a calendar date/time → either Julian Day or Perihelion Day.
 *
 * @param {string} dateStr
 *   – in "YYYY-MM-DD" or "-YYYY-MM-DD" (astronomical year 0 = 1 BC)
 * @param {string} timeStr
 *   – in "hh:mm:ss" or "24:00:00"
 * @param {'julian-gregorian-date'|'perihelion-date'} inputKind
 * @param {'julianday'|'perihelionday'} outputKind
 * @returns {number}  the desired day (may be fractional)
 * @throws {TypeError} on bad args
 */
function dateToDayNew(dateStr, timeStr, inputKind, outputKind) {
  // 1) validate flags
  if (inputKind !== 'julian-gregorian-date'
   && inputKind !== 'perihelion-date') {
    throw new TypeError(
      `dateToDayNew: inputKind must be `
      +`'julian-gregorian-date' or 'perihelion-date'`
    );
  }
  if (outputKind !== 'julianday'
   && outputKind !== 'perihelionday') {
    throw new TypeError(
      `dateToDayNew: outputKind must be 'julianday' or 'perihelionday'`
    );
  }

  // 2) get a single Julian Day Number (JD) from the input calendar
  let jd;
  if (inputKind === 'julian-gregorian-date') {
    // uses the dateTimeToJulianDay we built earlier
    jd = dateTimeToJulianDay(dateStr, timeStr);
  } else {
    // perihelion-date → JD via our reverse‐perihelion helper
    jd = dateToPerihelionJulianDay(dateStr, timeStr);
  }

  // 3) dispatch to the desired output
  if (outputKind === 'julianday') {
    return jd;
  } else {
    // perihelionday = JD – perihelionalignmentJD
    return julianDayToPerihelionDay(jd);
  }
}



/*––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  Helper: calendar‐date (perihelion) → Julian Day Number
––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––*/

function dateToPerihelionJulianDay(dateStr, timeStr) {
  // parse date (allows "-YYYY")
  const dm = /^(-?\d+)-(\d{1,2})-(\d{1,2})$/.exec(dateStr);
  if (!dm) throw new TypeError(
    `Invalid date "${dateStr}". Expected "YYYY-MM-DD" or "-YYYY-MM-DD".`
  );
  const Y = parseInt(dm[1], 10),
        M = parseInt(dm[2], 10),
        D = parseInt(dm[3], 10);
  if (M < 1 || M > 12) throw new TypeError(`Invalid month ${M}`);
  if (D < 1 || D > 31) throw new TypeError(`Invalid day ${D}`);

  // parse time, special‐case "24:00:00"
  const tm = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(timeStr);
  if (!tm) throw new TypeError(
    `Invalid time "${timeStr}". Expected "hh:mm:ss".`
  );
  let [ hh, mm, ss ] = tm.slice(1).map(x=>parseInt(x,10));
  if (hh === 24 && mm === 0 && ss === 0) {
    // midnight rollover → JD @ next midnight
    return dateToPerihelionJulianDay(dateStr, '00:00:00') + 1;
  }
  if (hh<0||hh>23||mm<0||mm>59||ss<0||ss>59) {
    throw new TypeError(`Invalid time components in "${timeStr}".`);
  }

  // 1) days since perihelion‐epoch to the START of year Y
  let daysAcc = 0, year = 0;
  if (Y >= 0) {
    for (; year < Y; year++) {
      const startJD    = perihelionalignmentJD + daysAcc;
      const useRevised = startJD >= REVISION_START_JD;
      const isLeap     = useRevised
                        ? isRevisedJulianLeapYear(year)
                        : isJulianLeapYear(year);
      daysAcc += (isLeap ? 366 : 365);
    }
  } else {
    for (year = 0; year > Y; year--) {
      const startJD    = perihelionalignmentJD + daysAcc;
      const useRevised = startJD >= REVISION_START_JD;
      const isLeap     = useRevised
                        ? isRevisedJulianLeapYear(year-1)
                        : isJulianLeapYear(year-1);
      daysAcc -= (isLeap ? 366 : 365);
    }
  }

  // 2) add days for the months BEFORE M in year Y
  //    figure out if year Y is leap
  const yearStartJD  = perihelionalignmentJD + daysAcc;
  const useRevisedY  = yearStartJD >= REVISION_START_JD;
  const isLeapY      = useRevisedY
                      ? isRevisedJulianLeapYear(year)
                      : isJulianLeapYear(year);
  const monthLens    = [31, isLeapY?29:28,31,30,31,30,31,31,30,31,30,31];
  let dayOfYear      = D - 1;
  for (let m = 1; m < M; m++) {
    dayOfYear += monthLens[m-1];
  }

  // 3) fold into a Julian Day Number
  //    JD = periAlignJD + daysAcc + dayOfYear + timeFrac - 0.5
  const timeFrac = hh/24 + mm/1440 + ss/86400;
  return perihelionalignmentJD
       + daysAcc
       + dayOfYear
       + timeFrac
       - 0.5;
}

//*************************************************************
// TO BE DELETED, MIGRATED
//*************************************************************

function dateToDays(sDate) {
  // Calculates number of days since 2000-06-21
  // Handles Julian and Gregorian calendar dates, including BC dates (astronomical numbering)
  
  const GREGORIAN_START = { year: 1582, month: 10, day: 15 };
  const GREGORIAN_REFERENCE_DAY = 730597; // days since 0 AD to 2000-06-21 (Gregorian)

  if (typeof sDate !== 'string') {
    console.error('safeDateToDays expected a string but got', typeof sDate);
    return NaN;
  }

  let aDate = sDate.split("-");
  let y, m, d;

  if (sDate.startsWith("-")) {
    // BC date using astronomical numbering
    y = -Number(aDate[1]);
    m = Number(aDate[2]);
    d = Number(aDate[3]);
  } else {
    y = Number(aDate[0]);
    m = Number(aDate[1]);
    d = Number(aDate[2]);
  }

  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    console.error('Invalid date format:', sDate);
    return NaN;
  }

  // Decide calendar: Julian or Gregorian?
  let useJulian = false;
  if (y < GREGORIAN_START.year) useJulian = true;
  if (y === GREGORIAN_START.year && m < GREGORIAN_START.month) useJulian = true;
  if (y === GREGORIAN_START.year && m === GREGORIAN_START.month && d < GREGORIAN_START.day) useJulian = true;

  if (useJulian) {
    // Julian calendar calculation
    if (m < 3) {
      m += 12;
      y -= 1;
    }
    let jd = Math.trunc(365.25 * (y + 4716)) +
             Math.trunc(30.6001 * (m + 1)) +
             d - 1524;
    return jd - startmodelJD;
  } else {
    // Gregorian calendar calculation
    m = (m + 9) % 12;
    y = y - Math.floor(m / 10);

    let days =
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) +
      Math.floor((m * 306 + 5) / 10) +
      (d - 1);

    return days - GREGORIAN_REFERENCE_DAY;
  }
}

function daysToDate(g) {
  if (g < -152556) return julianCalDayToDate(g); //Julian dates earlier than 1582-10-15
  g += 730597;
  let y = Math.floor((10000*g + 14780)/3652425);
  let ddd = g - (365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400));
  if (ddd < 0) {
    y = y - 1
    ddd = g - (365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400));
  };
  let mi = Math.floor((100*ddd + 52)/3060);
  let mm = (mi + 2)%12 + 1
  y = y + Math.floor((mi + 2)/12);
  let dd = ddd - Math.floor((mi*306 + 5)/10) + 1
  
  mm = ("0" + mm).slice(-2);
  dd = ("0" + dd).slice(-2);
  
  return y + "-" + mm + "-" + dd;
};

function julianCalDayToDate(g) {
  var jDay = g + 2451717 //+ 10;
  var z = Math.floor(jDay - 1721116.5);
  var r = jDay - 1721116.5 - z;
  var year = Math.floor((z - 0.25) / 365.25);
  var c = z - Math.floor(365.25 * year);
  var month = Math.trunc((5 * c + 456) / 153);
  var day = c - Math.trunc((153 * month - 457) / 5) + r - 0.5;
  if (month > 12) {
  	year = year + 1;
    month = month -12;
  }
  month = ("0" + month).slice(-2);
  day = ("0" + day).slice(-2);
  // if (year <= 0) year -= 1;
  return year + "-" + month + "-" + day
};