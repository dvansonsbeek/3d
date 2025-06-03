import * as THREE        from 'three';
import Stats             from 'three/examples/jsm/libs/stats.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as dat from 'dat.gui';

/*NO AI TRAINING on this Interactive 3D Solar System Simulation of the Holistic Universe Model unless explicitly authorized by D. van Sonsbeek.

Without in any way limiting the author’s [and publisher’s] exclusive rights under copyright, any use of this publication to “train” generative artificial intelligence (AI) technologies to generate text is expressly prohibited.
The author reserves all rights to license usage of this work for generative AI training and development of machine learning language models.*/

/* The Interactive 3D Solar System Simulation shows the precession / eccentricity / inclination / obliquity / perihelion date movements of Earth, Moon, Sun and Planets modelled from a geo-heliocentric frame of reference, coming together in a Holistic-Year cycle of 305,952 years, an Axial precession cycle of ~23,535 years, an Inclination precession cycle of 101,984 years and a Perihelion precession cycle of 19,122 years.*/

//See https://www.holisticuniverse.com/en & https://github.com/dvansonsbeek/3d

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
// Reference length of solar year in days in 1246 AD according to EPOCH document = ~MEAN
const meansiderealyearlengthinSeconds = 31558149.6846777;
// Reference length of sidereal year in seconds in 1246 AD according to EPOCH document = ~MEAN
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
const currentAUDistance = 149597870.698828;
const speedofSuninKM = 107225.047767317;

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
const meanSiderealday = (meansolaryearlengthinDays/(meansolaryearlengthinDays+1))*meanlengthofday
const meanTrueSiderealday = (meansiderealyearlengthinDays/(meansiderealyearlengthinDays+1))*meanlengthofday
const meanAnomalisticYearinDays = ((meansolaryearlengthinDays)/(perihelionCycleLength-1))+meansolaryearlengthinDays
//sDAY IS USED IN 3D MODEL CALCULATIONS 
const sDay = 1/meansolaryearlengthinDays;
//sDAY IS USED IN 3D MODEL CALCULATIONS
const sYear = sDay*365;
const sMonth = sDay*30;
const sWeek = sDay*7;
const sHour = sDay/24;
const sMinute = sHour/60;
const sSecond = sMinute/60;

//*************************************************************
// ADD PLANETS (Stars, Moons and deferents conunt as planets)
//*************************************************************
const startingPoint = {
  name: "Starting Point",
  startPos: 0,
  speed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.1,
  color: 0x578B7C,
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
  startPos: -112.791336670025,
  speed: 0,
  tilt: 0,
  rotationSpeed: -0.00026697458749521,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.011,
  color: 0x333333,
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
  
  size: 0.011,   
  color: 0x0096FF,
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

const perihelionPointAlternative = {
  name: "Perihelion-of-Earth (Alternative)",
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
  
  size: 0.011,   
  color: 0x333333,
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
  startPos: 0,    
  speed: -0.00026697458749521,
  rotationSpeed: 2301.16782401453,
  tilt: -23.4243449577,
  orbitRadius: -0.27304333159777,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.0852703981708473,
  // 10 times bigger than real 
  color: 0x333333,
  sphereSegments: 320,
  tiltb: 0,
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
  startPos: 98.5866146146096,
  speed: 0.0000616095201912024,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.1,
  color: 0xFEAA0D,
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
  startPos: 164.311024357683,
  speed: 0.000102682533652004,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: -0.58,

  size: 0.1,
  color: 0xFEAA0D,
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
  startPos: 97.1023610277075,
  speed: -0.000164292053843206,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0.58,

  size: 0.1,
  color: 0xFEAA0D,
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
  startPos: -194.204722055415,
  speed: 0.000328584107686413,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: -1.11,
  orbitTiltb: 0,

  size: 0.1,
  color: 0xFEAA0D,
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
  startPos: 194.204722055415,
  speed: -0.000328584107686413,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -1.404974,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.1,
  color: 0xFEAA0D,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const barycenterEarthAndSun = {
  name: "Barycenter Earth and Sun",
  startPos: 0,
  speed: 0,
  tilt: 0,
  orbitRadius: 0.27304333159777,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.01,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const earthPerihelionFromEarth = {
  name: "PERIHELION-OF-EARTH",
  startPos: 0,    
  speed: 0,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.011,   
  color: 0xBF40BF,
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

const barycenterPLANETS = {
  name: "Barycenter Planets",
  startPos: 0,
  speed: 0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.5,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const sun = {
  name: "Sun",
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
  
  size: 0.930951753186224,    
  color: 0x333333,
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
  startPos: 340,
  speed: 0.709905964656497,
  tilt: 0,
  orbitRadius: -0.0141069500625657,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.001,
  color: 0x8b8b8b,
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
  startPos: -90,
  speed: -1.04771096386486,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.001,
  color: 0x8b8b8b,
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
  startPos: 90,
  speed: 1.04771096386486,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.001,
  color: 0x8b8b8b,
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
  startPos: -44.1,
  speed: -0.372100965448132,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.001,
  color: 0xFFFF00,
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
  startPos: 64.1,
  speed: -0.337804999208365,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90+180)*Math.PI)/180)*-5.1453964,
  orbitTiltb: Math.sin(((-90+180)*Math.PI)/180)*-5.1453964,

  size: 0.001,
  color: 0x8b8b8b,
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
  startPos: 126.22,
  speed: 83.9953393526758,
  rotationSpeed: 0,
  tilt: -6.687,
  orbitRadius: 0.25695490731541,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.0232276033326404,
  //10 times bigger than real
  color: 0x8b8b8b,
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

const mercuryPerihelionFromEarth = {
  name: "PERIHELION MERCURY",
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -7.79880291975054,
  orbitCenterb: -1.59456034000496,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/mercury_perihelion.png',
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

const mercurybarycenterPLANETS = {
  name: "Barycenter Mercury Counter movement",
  startPos: 0,
  speed: -0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.5,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const mercuryPerihelionFromSun = {
  name: "Mercury Perihelion From Sun",
  startPos: 141.68,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 3.30123436930967,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 7.004995,
  orbitTiltb: 0,

  size: 1.0,
  color: 0x868485,
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
  startPos: 70.84,
  speed: 26.0876066456551,
  rotationSpeed: 39.1314099684826,
  tilt: -0.03,
  orbitRadius: 38.7106461556524,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  //size: 0.00326167744046522,
  size: 1,
  color: 0x868485,
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

const venusPerihelionFromEarth = {
  name: "PERIHELION VENUS",
  startPos: 0, 
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -0.381861038455445,
  orbitCenterb: 0.306808110775548,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/venus_perihelion.png',
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

const venusbarycenterPLANETS = {
  name: "Barycenter Venus Counter movement",
  startPos: 0,
  speed: -0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.01,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const venusPerihelionFromSun = {
  name: "Venus Perihelion From Sun",
  startPos: 235.054,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0.243275520725271,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 3.394667,
  orbitTiltb: 0,

  size: 0.1,
  color: 0xA57C1B,
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
  startPos: 117.527,
  speed: 10.2132976731898,
  rotationSpeed: -9.4430965247729,
  tilt: -2.6392,
  orbitRadius: 72.3340172922693,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  //size: 0.00809075686937222,
  size: 1,
  color: 0xA57C1B,
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

const marsPerihelionFromEarth = {
  name: "PERIHELION MARS",
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 9.84185006300923,
  orbitCenterb: -20.1331929354344,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/mars_perihelion.png',
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

const marsbarycenterPLANETS = {
  name: "Barycenter Mars Counter movement",
  startPos: 0,
  speed: -0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.01,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const marsPerihelionFromSun = {
  name: "Mars Perihelion From Sun",
  startPos: 243.156,
  speed: 0.398326084542855,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 8.17878252993853,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-49.561729)*Math.PI)/180)*-1.849723,
  orbitTiltb: Math.sin(((-90-49.561729)*Math.PI)/180)*-1.849723,

  size: 0.1,
  color: 0xFEAA0D,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
}; 

const mars = {
  name: "Mars",
  startPos: 121.578,
  speed: -3.34075569586122,
  rotationSpeed: 2236.82429921882,
  tilt: -25.19,
  orbitRadius: 152.366713671252,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  //size: 0.00453148161022128,
  size: 1,
  color: 0xFF0000,
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

  //size: 0.0000148397834115522,
  size: 0.027272727,
  color: 0x8b8b8b,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
};

const deimos = {
  name: "Deimos",
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

  //size: 0.00000842257977412423,
  size: 0.027272727,
  color: 0x8b8b8b,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
};

const jupiterPerihelionFromEarth = {
  name: "PERIHELION JUPITER",
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -12.7649841206703,
  orbitCenterb: -46.3783884222424,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/jupiter_perihelion.png',
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

const jupiterbarycenterPLANETS = {
  name: "Barycenter Jupiter Counter movement",
  startPos: 0,
  speed: -0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.01,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const jupiterPerihelionFromSun = {
  name: "Jupiter Perihelion From Sun",
  startPos: 27.684,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 1.16647398162302,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-100.469215)*Math.PI)/180)*-1.303241,
  orbitTiltb: Math.sin(((-90-100.469215)*Math.PI)/180)*-1.303241,
  
  size: 0.1,
  color: 0xCDC2B2,
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
  startPos: 13.842,
  speed: 0.529924019671262,
  rotationSpeed: 5549.34320193203,
  tilt: -3.13,
  orbitRadius: 519.969067802053,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  //size: 0.0934652340617141,   
  size: 6,
  color: 0xCDC2B2,
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

const saturnPerihelionFromEarth = {
  name: "PERIHELION SATURN",
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -100.18985703282,
  orbitCenterb: 4.92899730245992,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/saturn_perihelion.png',
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

const saturnbarycenterPLANETS = {
  name: "Barycenter Saturn Counter movement",
  startPos: 0,
  speed: -0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.01,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const saturnPerihelionFromSun = {
  name: "Saturn Perihelion From Sun",
  startPos: 22.888,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 2.57197670782462,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-113.669633)*Math.PI)/180)*-2.488861,
  orbitTiltb: Math.sin(((-90-113.669633)*Math.PI)/180)*-2.488861,

  size: 0.1,   
  color: 0xA79662,
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
  startPos: 11.444,    
  speed: 0.213538596982708,
  rotationSpeed: 5215.37251228578,
  tilt: -26.73,
  orbitRadius: 953.093824572666,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  //size: 0.0778513754613971,   
  size: 5,
  color: 0xA79662,
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

const uranusPerihelionFromEarth = {
  name: "PERIHELION URANUS",
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -22.3744267200277,
  orbitCenterb: 168.187625950574,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/uranus_perihelion.png',
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

const uranusbarycenterPLANETS = {
  name: "Barycenter Uranus Counter movement",
  startPos: 0,
  speed: -0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.01,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const uranusPerihelionFromSun = {
  name: "Uranus Perihelion From Sun",
  startPos: 89.708,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 3.93471734577913,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-74.008411)*Math.PI)/180)*-0.773201,
  orbitTiltb: Math.sin(((-90-74.008411)*Math.PI)/180)*-0.773201,

  size: 0.1,   
  color: 0xD2F9FA,
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
  startPos: 44.854,    
  speed: 0.0750403955928845,
  rotationSpeed: -3194.74981995042,
  tilt: -82.23,
  orbitRadius: 1913.91730411169,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  //size: 0.0339068997192601, 
  size: 5,
  color: 0xD2F9FA,
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

const neptunePerihelionFromEarth = {
  name: "PERIHELION NEPTUNE",
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -53.4252786423449,
  orbitCenterb: -44.0137967163906,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/neptune_perihelion.png',
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

const neptunebarycenterPLANETS = {
  name: "Barycenter Neptune Counter movement",
  startPos: 0,
  speed: -0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.01,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const neptunePerihelionFromSun = {
  name: "Neptune Perihelion From Sun",
  startPos: 95.874,    
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0.404247596786746,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-131.789247)*Math.PI)/180)*-1.769909,
  orbitTiltb: Math.sin(((-90-131.789247)*Math.PI)/180)*-1.769909,

  size: 0.1,   
  color: 0x5E93F1,
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
  startPos: 47.937,
  speed: 0.0382800485454671,
  rotationSpeed: 3418.56790376751,
  tilt: -28.32,
  orbitRadius: 2997.8156718939,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  //size: 0.0329175808251566,
  size: 5,
  color: 0x5E93F1,
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
// orbitSemiMajor: 519.969067802053,
// orbitSemiMinor: 519.969067802053*Math.sqrt(1-0.048499*0.048499),

const plutoPerihelionFromEarth = {
  name: "PERIHELION PLUTO",
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 1087.29859326151,
  orbitCenterb: 1123.30838908234,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/pluto_perihelion.png',
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

const plutobarycenterPLANETS = {
  name: "Barycenter Pluto Counter movement",
  startPos: 0,
  speed: -0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.01,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const plutoPerihelionFromSun = {
  name: "Pluto Perihelion From Sun",
  startPos: 143.12,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 194.485802383665,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-110.30347)*Math.PI)/180)*-17.14175,
  orbitTiltb: Math.sin(((-90-110.30347)*Math.PI)/180)*-17.14175,

  size: 0.1,   
  color: 0x5E93F1,
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
  startPos: 71.56,
  speed: 0.025567950879349,
  rotationSpeed: 359.294297168521,
  tilt: -57.47,
  orbitRadius: 3923.3401562492,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  //size: 0.00158865897549076,   
  size: 5,
  color: 0x5E93F1,
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
};

const halleysPerihelionFromEarth = {
  name: "PERIHELION HALLEYS",
  startPos: 0,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -243.812109395506,
  orbitCenterb: 1742.10124111005,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/halleys_perihelion.png',
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

const halleysbarycenterPLANETS = {
  name: "Barycenter Halleys Counter movement",
  startPos: 0,
  speed: -0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.01,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const halleysPerihelionFromSun = {
  name: "Halleys Perihelion From Sun",
  startPos: 80,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 851.344214398387,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-59.56078348)*Math.PI)/180)*(-162.192203847561),
  orbitTiltb: Math.sin(((-90-59.56078348)*Math.PI)/180)*(-162.192203847561),

  size: 0.1,
  color: 0xA57C1B,
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
  startPos: 40,
  speed: 0.0830907062312016,
  rotationSpeed: 1043.12937189584,
  tilt: 0,
  orbitRadius: 1788.20900979424,
  orbitSemiMajor: 0,
  orbitSemiMinor: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  //size: 0.0000073530458345529,
  size: 6,
  color: 0x00FF00,
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
};

const erosPerihelionFromEarth = {
  name: "PERIHELION EROS",
  startPos: 0,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -39.770115595928,
  orbitCenterb: 25.8806954143179,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/eros_perihelion.png',
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

const erosbarycenterPLANETS = {
  name: "Barycenter Eros Counter movement",
  startPos: 0,
  speed: -0.00024643808076481,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: 0.01,
  color: 0xFFFF00,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

const erosPerihelionFromSun = {
  name: "Eros Perihelion From Sun",
  startPos: 114.33,
  speed: 0.852388248352015,
  tilt: 0,
  orbitRadius: 14.957076673965,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-304.4115786)*Math.PI)/180)*-10.82903287,
  orbitTiltb: Math.sin(((-90-304.4115786)*Math.PI)/180)*-10.82903287,

  size: 0.1,
  color: 0xA57C1B,
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
  startPos: 57.165,
  speed: -3.5677867777658,
  rotationSpeed: 10451.0875434594,
  tilt: 0,
  orbitRadius: 145.832387010277,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  //size: 0.0000112568447139883,
  size: 1,
  color: 0xA57C1B,
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
};

//*************************************************************
// ADD CONSTANTS
//*************************************************************
const planetObjects = [startingPoint, earthWobbleCenter, midEccentricityOrbit, earth, earthInclinationPrecession, earthEclipticPrecession, earthObliquityPrecession, earthPerihelionPrecession1, earthPerihelionPrecession2, barycenterEarthAndSun, earthPerihelionFromEarth, mercuryPerihelionFromEarth, venusPerihelionFromEarth, marsPerihelionFromEarth, jupiterPerihelionFromEarth, saturnPerihelionFromEarth, uranusPerihelionFromEarth, neptunePerihelionFromEarth, plutoPerihelionFromEarth, halleysPerihelionFromEarth, erosPerihelionFromEarth, sun, moonApsidalPrecession, moonApsidalNodalPrecession1, moonApsidalNodalPrecession2, moonRoyerCycle, moonNodalPrecession, moon, barycenterPLANETS, mercurybarycenterPLANETS, mercuryPerihelionFromSun, mercury, venusbarycenterPLANETS, venusPerihelionFromSun, venus, marsbarycenterPLANETS, marsPerihelionFromSun, mars, phobos, deimos, jupiterbarycenterPLANETS, jupiterPerihelionFromSun, jupiter, saturnbarycenterPLANETS, saturnPerihelionFromSun, saturn, uranusbarycenterPLANETS, uranusPerihelionFromSun, uranus, neptunebarycenterPLANETS, neptunePerihelionFromSun, neptune, plutobarycenterPLANETS, plutoPerihelionFromSun, pluto, halleysbarycenterPLANETS, halleysPerihelionFromSun, halleys, erosbarycenterPLANETS, erosPerihelionFromSun, eros, perihelionPointAlternative]

const tracePlanets = [earthWobbleCenter, earthPerihelionFromEarth, midEccentricityOrbit, mercuryPerihelionFromEarth, venusPerihelionFromEarth, marsPerihelionFromEarth, jupiterPerihelionFromEarth, saturnPerihelionFromEarth, uranusPerihelionFromEarth, neptunePerihelionFromEarth, sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto, halleys, eros]

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

  mercuryPerihelion: 0,
  venusPerihelion: 0,
  earthPerihelion: 0,
  marsPerihelion: 0,
  jupiterPerihelion: 0,
  saturnPerihelion: 0,
  uranusPerihelion: 0,
  neptunePerihelion: 0,
  
  mercuryArgumentOfPeriapsis: 0,
  venusArgumentOfPeriapsis: 0,
  marsArgumentOfPeriapsis: 0,
  jupiterArgumentOfPeriapsis: 0,
  saturnArgumentOfPeriapsis: 0,
  uranusArgumentOfPeriapsis: 0,
  neptuneArgumentOfPeriapsis: 0,
  
  mercuryAscendingNode: 0,
  venusAscendingNode: 0,
  marsAscendingNode: 0,
  jupiterAscendingNode: 0,
  saturnAscendingNode: 0,
  uranusAscendingNode: 0,
  neptuneAscendingNode: 0,

  mercuryDescendingNode: 0,
  venusDescendingNode: 0,
  marsDescendingNode: 0,
  jupiterDescendingNode: 0,
  saturnDescendingNode: 0,
  uranusDescendingNode: 0,
  neptuneDescendingNode: 0,
  
  Target: "",
  lookAtObj: {}
};

let predictions = {
  juliandaysbalancedJD: 0,
  lengthofDay: 0,
  lengthofsiderealDay: 0,
  lengthofsiderealDayRealLOD: 0,
  predictedDeltat: 0,
  lengthofsolarYear: 0,
  lengthofsolarYearSec: 0,
  lengthofsiderealYear: 0,
  lengthofsiderealYearDays: 0,
  lengthofanomalisticYear: 0,
  lengthofsolarYearSecRealLOD: 0,
  lengthofsiderealYearDaysRealLOD: 0,
  lengthofanomalisticYearRealLOD: 0,
  perihelionPrecession: 0,
  axialPrecession: 0,
  inclinationPrecession: 0,
  obliquityPrecession: 0,
  eclipticPrecession: 0,
  perihelionPrecessionRealLOD: 0,
  axialPrecessionRealLOD: 0,
  inclinationPrecessionRealLOD: 0,
  obliquityPrecessionRealLOD: 0,
  eclipticPrecessionRealLOD: 0,
  eccentricityEarth: 0,
  obliquityEarth: 0,
  inclinationEarth: 0,
  longitudePerihelion: 0,
  longitudePerihelionDatePer: 0,
  longitudePerihelionDateAp: 0,
  lengthofAU: 149597870.698828,
  anomalisticMercury: 0,
};

const planetColorHex = {
  earth:   0x2e64be,
  moon:    0x787878,
  mercury: 0x6e6e6e,
  venus:   0xd5ab37,
  mars:    0xb03a2e,
  jupiter: 0xc97e4f,
  saturn:  0xd9b65c,
  uranus:  0x37c6d0,
  neptune: 0x2c539e,
  sun:     0xffae00
};

//*************************************************************
// SETUP CAMERAS and CONTROLS
//*************************************************************
const camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 10000000);
camera.position.set(0, 500, 0);
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
const labelRenderer = new CSS2DRenderer();
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
  const worldV   = new THREE.Vector3();   // scratch for world pos
  const camV     = new THREE.Vector3();   // scratch for camera‐space pos
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

    // 5) Traverse and append only those labels that are both visible
    //    and in front of the camera
    let totalLabels   = 0;
    let wantVisible   = 0;
    let actuallyShown = 0;

    scene.traverse(obj => {
    if (!(obj instanceof CSS2DObject)) return;
    totalLabels++;

    // skip labels you’ve explicitly hidden
    if (!obj.visible) return;
    wantVisible++;

    //  a) get its world‐position
    worldV.setFromMatrixPosition(obj.matrixWorld);
    //  b) transform into camera‐space
    camV.copy(worldV).applyMatrix4(camera.matrixWorldInverse);
    //  c) cull if it’s behind (camera looks down –Z in three.js)
    if (camV.z > 0) return;

    // project to NDC then to screen
    projV.copy(worldV).project(camera);
    const x = (projV.x * 0.5 + 0.5) * w;
    const y = (-projV.y * 0.5 + 0.5) * h;

    // position & show
    const el = obj.element;
    el.style.transform = 
    `translate(-50%,-50%) translate(${x}px,${y}px) scale(${finalScale})`;
    el.style.display   = '';

    dom.appendChild(el);
    actuallyShown++;
    });

    console.log(`Labels — total: ${totalLabels}, wanted: ${wantVisible}, shown: ${actuallyShown}`);
  };
})(labelRenderer, baseCamDistance);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5; // Try adjusting this
renderer.useLegacyLights = false

document.body.appendChild(renderer.domElement);

// Memory improvement: create one loader, one cache
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

const controls = new OrbitControls(camera, renderer.domElement);
//controls.enableDamping = true; // for smoother motion, optional
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
startingPoint.pivotObj.add(perihelionPointAlternative.containerObj);

earth.pivotObj.add(earthInclinationPrecession.containerObj);
earthInclinationPrecession.pivotObj.add(midEccentricityOrbit.containerObj);
earthInclinationPrecession.pivotObj.add(earthEclipticPrecession.containerObj);
earthEclipticPrecession.pivotObj.add(earthObliquityPrecession.containerObj);
earthObliquityPrecession.pivotObj.add(earthPerihelionPrecession1.containerObj);
earthPerihelionPrecession1.pivotObj.add(earthPerihelionPrecession2.containerObj);
earthPerihelionPrecession2.pivotObj.add(barycenterEarthAndSun.containerObj);

barycenterEarthAndSun.pivotObj.add(sun.containerObj);
barycenterEarthAndSun.pivotObj.add(earthPerihelionFromEarth.containerObj);
barycenterEarthAndSun.pivotObj.add(barycenterPLANETS.containerObj);

barycenterPLANETS.pivotObj.add(mercuryPerihelionFromEarth.containerObj);
barycenterPLANETS.pivotObj.add(venusPerihelionFromEarth.containerObj);
barycenterPLANETS.pivotObj.add(marsPerihelionFromEarth.containerObj);
barycenterPLANETS.pivotObj.add(jupiterPerihelionFromEarth.containerObj);
barycenterPLANETS.pivotObj.add(saturnPerihelionFromEarth.containerObj);
barycenterPLANETS.pivotObj.add(uranusPerihelionFromEarth.containerObj);
barycenterPLANETS.pivotObj.add(neptunePerihelionFromEarth.containerObj);
barycenterPLANETS.pivotObj.add(plutoPerihelionFromEarth.containerObj);
barycenterPLANETS.pivotObj.add(halleysPerihelionFromEarth.containerObj);
barycenterPLANETS.pivotObj.add(erosPerihelionFromEarth.containerObj);

earth.pivotObj.add(moonApsidalPrecession.containerObj);
moonApsidalPrecession.pivotObj.add(moonApsidalNodalPrecession1.containerObj);
moonApsidalNodalPrecession1.pivotObj.add(moonApsidalNodalPrecession2.containerObj);
moonApsidalNodalPrecession2.pivotObj.add(moonRoyerCycle.containerObj);
moonRoyerCycle.pivotObj.add(moonNodalPrecession.containerObj);
moonNodalPrecession.pivotObj.add(moon.containerObj);

mercuryPerihelionFromEarth.pivotObj.add(mercurybarycenterPLANETS.containerObj);
mercurybarycenterPLANETS.pivotObj.add(mercuryPerihelionFromSun.containerObj);
mercuryPerihelionFromSun.pivotObj.add(mercury.containerObj);

venusPerihelionFromEarth.pivotObj.add(venusbarycenterPLANETS.containerObj);
venusbarycenterPLANETS.pivotObj.add(venusPerihelionFromSun.containerObj);
venusPerihelionFromSun.pivotObj.add(venus.containerObj);

marsPerihelionFromEarth.pivotObj.add(marsbarycenterPLANETS.containerObj);
marsbarycenterPLANETS.pivotObj.add(marsPerihelionFromSun.containerObj);
marsPerihelionFromSun.pivotObj.add(mars.containerObj);

mars.pivotObj.add(phobos.containerObj);
mars.pivotObj.add(deimos.containerObj);

jupiterPerihelionFromEarth.pivotObj.add(jupiterbarycenterPLANETS.containerObj);
jupiterbarycenterPLANETS.pivotObj.add(jupiterPerihelionFromSun.containerObj);
jupiterPerihelionFromSun.pivotObj.add(jupiter.containerObj);

saturnPerihelionFromEarth.pivotObj.add(saturnbarycenterPLANETS.containerObj);
saturnbarycenterPLANETS.pivotObj.add(saturnPerihelionFromSun.containerObj);
saturnPerihelionFromSun.pivotObj.add(saturn.containerObj);

uranusPerihelionFromEarth.pivotObj.add(uranusbarycenterPLANETS.containerObj);
uranusbarycenterPLANETS.pivotObj.add(uranusPerihelionFromSun.containerObj);
uranusPerihelionFromSun.pivotObj.add(uranus.containerObj);

neptunePerihelionFromEarth.pivotObj.add(neptunebarycenterPLANETS.containerObj);
neptunebarycenterPLANETS.pivotObj.add(neptunePerihelionFromSun.containerObj);
neptunePerihelionFromSun.pivotObj.add(neptune.containerObj);

plutoPerihelionFromEarth.pivotObj.add(plutobarycenterPLANETS.containerObj);
plutobarycenterPLANETS.pivotObj.add(plutoPerihelionFromSun.containerObj);
plutoPerihelionFromSun.pivotObj.add(pluto.containerObj);

halleysPerihelionFromEarth.pivotObj.add(halleysbarycenterPLANETS.containerObj);
halleysbarycenterPLANETS.pivotObj.add(halleysPerihelionFromSun.containerObj);
halleysPerihelionFromSun.pivotObj.add(halleys.containerObj);

erosPerihelionFromEarth.pivotObj.add(erosbarycenterPLANETS.containerObj);
erosbarycenterPLANETS.pivotObj.add(erosPerihelionFromSun.containerObj);
erosPerihelionFromSun.pivotObj.add(eros.containerObj);

// The model starts on 21 june and not at 0 degrees (equinox) so we need to turn it 90 degrees
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
    obj.distDisplay = '';
    obj.sunDistDisplay  = '';
    obj.dist = "";      
    obj.distKm = ""; 
    obj.distMi = ""; 
    obj.sunDistAU = "";      
    obj.sunDistKm = "";  
    obj.sunDistMi = "";
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

// Set correct color space for color image textures
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

// 3) One dashed‐line material for all constellations
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
    uTotalLength:   { value: 1.0 },
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

// 4) Kick off constellation setup immediately
initConstellations();

// 5) Load star‐glow texture, then build stars
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

// Set correct color space for color image textures
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

// Set correct color space for color image textures
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

// --------------------------------------------------------
// initial setup — run ONCE, right after you create renderer,
// camera, starMaterial, labelRenderer, etc.
// --------------------------------------------------------
const DESIRED_HFOV   = 60;        // horizontal slice you like
const MIN_SIZE       = 2;         // protect against 0-px viewports
const starMaterial   = new THREE.PointsMaterial({ size: 2, sizeAttenuation: false });

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);               // debounce
  resizeTimeout = setTimeout(onWindowResize, 100);
});
onWindowResize();                            // initial call

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
o.distanceUnit = 'AU';
o.RA_Display = '';
o.Dec_Display = '';
o.lengthofAU = '149597870.698828';
o.perihelionDate = "";
let currPos; 
let lastPlanetFocus = earth; // Default fallback

let lastFrameTime = 0;
let smoothedFps   = 60;
let lastCameraX   = 0, lastCameraY = 0, lastCameraZ = 0;
let lowPerformanceMode = false;

// At the top of your file, create reusable vectors
const centerPosVec = new THREE.Vector3();
const starPosVec  = new THREE.Vector3();
const scaleVec = new THREE.Vector3();
const _tempVec = new THREE.Vector3();

let cameraWorldPos = new THREE.Vector3();

const tmpVec = new THREE.Vector3();

const EARTH_POS    = new THREE.Vector3();   // Earth centre (world)
const SUN_POS      = new THREE.Vector3();   // Sun   centre (world)
const DELTA        = new THREE.Vector3();   // reusable difference-vector
const LOCAL        = new THREE.Vector3();   // world-to-Earth local
const CAM_LOCAL    = new THREE.Vector3();   // camera in Earth local
const CAMERA_POS   = new THREE.Vector3();
const PLANET_POS   = new THREE.Vector3();
const LOOK_DIR     = new THREE.Vector3();
const SPHERICAL    = new THREE.Spherical();

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

const DEG = Math.PI / 180;
const KM_TO_MI = 0.62137119;   // 1 kilometre  → 0.621 371 miles

// create the golden-spiral line (returns { line, update })
const golden = goldenspiralPerihelionObjects(
  mercuryPerihelionFromEarth,
  venusPerihelionFromEarth,
  marsPerihelionFromEarth,
  jupiterPerihelionFromEarth,
  neptunePerihelionFromEarth,
  saturnPerihelionFromEarth,
  uranusPerihelionFromEarth,
  camera,
  scene
);

/* ------------------------------------------------------------------ */
/*  CONSTANTS & UTILITIES                                             */
/* ------------------------------------------------------------------ */

/* anchor: 14 Dec 1245 (JD 2176142) when perihelion and December solstice
   were aligned — here taken as M = 0° and ν = 0°                    */
const PERI_ALIGN_JD = 2_176_142;

/* wrap any real angle to 0 … 360° ---------------------------------- */
const wrap360 = x => ((x % 360) + 360) % 360;

// --------------------------------------------------------------
//  GLOBAL helper: store frozen widths per planet name
// --------------------------------------------------------------
const columnCache = {};   // e.g. { earth: "max-content 14ch 6ch", mars: … }

/* ------------------------------------------------------------------ */
/*  Globals used by updateDomLabel()                                  */
/* ------------------------------------------------------------------ */
let labelDismissed = false;
let prevPlanetName = '';
let labelPrevHTML  = '';
const niceName = s => s.charAt(0).toUpperCase() + s.slice(1);

const PLANET_SYMBOL = {
  sun     : '☉',   mercury : '☿',  venus  : '♀',
  earth   : '♁',   moon    : '☾',
  mars    : '♂',   jupiter : '♃',  saturn : '♄',
  uranus  : '♅',   neptune : '♆',  pluto  : '♇'
};

// put every “big-radius” object that must expand / shrink together in one array
const scalableObjects = [
  sceneObjects.stars,
  sceneObjects.constellations,
  celestialSphere,
  plane
];

//const baseCamDistance = camera.position.length(); // distance that feels “100 %” size
const zoomFactor = 1.0;   // identical to your star-label code
const minScale   = 0.01;   // clamp values to taste
const maxScale   = 0.9;

const label        = document.getElementById('planetLabel');
const labelContent = label.querySelector('.labelContent');
const closeBtn     = label.querySelector('.closeBtn');

closeBtn.addEventListener('click', e => {
  e.stopPropagation();         // keeps the click from bubbling to scene
  label.style.display = 'none';
});

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
  const helperRegex = /Barycenter|Phobos|Deimos|Precession|WOBBLE|HELION|Eccentricity|Pluto|Eros|Halleys|Helion|Starting|Cycle|Ellipse/i;

  planetObjects.forEach(obj => {
  if (!helperRegex.test(obj.name)) {
    // not a “helper” → go in the planet list
    planetList[obj.name] = obj.name;
  } else {
    // otherwise → it’s a helper object
    isHelper[obj.name] = obj.name;
    }
  });

  ctrlFolder
  .add(o, 'Target', { 'Please select': "", ...planetList }).name('Look at').onFinishChange(value => {

    /* value === ''  →  no planet selected */
    o.lookAtObj = planetObjects.find(p => p.name === value) || undefined;

    /* hide every orbit-plane helper … */
    planetObjects.forEach(p => {
      if (p.orbitPlaneHelper) p.orbitPlaneHelper.visible = false;
    });

    /* … and show only the helper of the chosen planet (if any) */
    if (o.lookAtObj?.orbitPlaneHelper) {
      o.lookAtObj.orbitPlaneHelper.visible = true;
    }
  });
  
  ctrlFolder.open() 
  
  let astroFolder = gui.addFolder('Predictions Holistic Universe Model');

    let daysFolder = astroFolder.addFolder('Length of Days Predictions');
      daysFolder.add(predictions, 'lengthofDay').name('Length of Day (sec)').step(0.000001).listen();
    daysFolder.open();
  
    let yearsFolder = astroFolder.addFolder('Length of Years Predictions');
 //     yearsFolder.add(predictions, 'lengthofsolarYear').name('Length of Solar Year (days)').step(0.000001).listen();
  
  // 1⃣  create the controller and keep the reference
  const yearCtrl = yearsFolder.add(predictions, 'lengthofsolarYear').name('Length of Solar Year (days)').step(0.00000001).listen();

  // 2⃣  tell dat.gui to render 8 digits after the decimal point
  yearCtrl.__precision = 8;    // undocumented but fully supported
  yearCtrl.updateDisplay();    // redraw once right away
  
      yearsFolder.add(predictions, 'lengthofsiderealYear').name('Length of Sidereal Year (sec)').step(0.000001).listen();
    yearsFolder.open();  

    let precessionFolder = astroFolder.addFolder('86400 sec/day - Predictions'); 
      precessionFolder.add(predictions, 'lengthofsiderealDay').name('Length of Sidereal Day (sec)').step(0.000001).listen();
      //precessionFolder.add(predictions, 'predictedDeltat').name('Delta-T (sec)').step(0.000001).listen();
  
      precessionFolder.add(predictions, 'lengthofsolarYearSec').name('Length of Solar Year (sec)').step(0.000001).listen();
      precessionFolder.add(predictions, 'lengthofsiderealYearDays').name('Length of Sidereal Year (days)').step(0.000001).listen();
      precessionFolder.add(predictions, 'lengthofanomalisticYear').name('Length of Anomalistic Year (sec)').step(0.000001).listen();
  
      precessionFolder.add(predictions, 'perihelionPrecession').name('Perihelion Precession (yrs)').step(0.000001).listen();
      const axialCtrl = precessionFolder.add( predictions, 'axialPrecession' ).name( 'Axial Precession (yrs)' ).step( 0.000001 ).listen();
      addInfoButton(axialCtrl, 'https://en.wikipedia.org/wiki/Axial_precession');
 
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
      //orbitalFolder.add(predictions, 'anomalisticMercury').name('Missing Mercury Advance (arcsec)').step(0.000001).listen();
    orbitalFolder.open();
  
    let precessionRealLODFolder = astroFolder.addFolder('Real Length of Day - Predictions');
      precessionRealLODFolder.add(predictions, 'lengthofsiderealDayRealLOD').name('Real LOD - Length of Sidereal Day (sec)').step(0.000001).listen();
      //precessionRealLODFolder.add(predictions, 'predictedDeltat').name('Delta-T (sec)').step(0.000001).listen();
  
      precessionRealLODFolder.add(predictions, 'lengthofsolarYearSecRealLOD').name('Real LOD - Length of Solar Year (sec)').step(0.000001).listen();
      precessionRealLODFolder.add(predictions, 'lengthofsiderealYearDaysRealLOD').name('Real LOD - Length of Sidereal Year (days)').step(0.000001).listen();
      precessionRealLODFolder.add(predictions, 'lengthofanomalisticYearRealLOD').name('Real LOD - Length of Anomalistic Year (sec)').step(0.000001).listen();
  
      precessionRealLODFolder.add(predictions, 'perihelionPrecessionRealLOD').name('Real LOD - Perihelion Precession (yrs)').step(0.000001).listen();
      precessionRealLODFolder.add(predictions, 'axialPrecessionRealLOD').name('Real LOD - Axial Precession (yrs)').step(0.000001).listen();
      precessionRealLODFolder.add(predictions, 'inclinationPrecessionRealLOD').name('Real LOD - Inclination Precession (yrs)').step(0.000001).listen();
      precessionRealLODFolder.add(predictions, 'eclipticPrecessionRealLOD').name('Real LOD - Length Ecliptic Cycle (yrs)').step(0.000001).listen();
      precessionRealLODFolder.add(predictions, 'obliquityPrecessionRealLOD').name('Real LOD - Length Obliquity Cycle (yrs)').step(0.000001).listen();
    precessionRealLODFolder.close();  
  astroFolder.close();
  
  let posFolder = gui.addFolder('Celestial Positions')
  posFolder
  .add(o, 'displayFormat', ['sexagesimal', 'decimal'])
  .name('RA/Dec Format')
  .onChange(updatePositions); // Recompute output when format changes

  posFolder
  .add(o, 'distanceUnit', ['AU', 'km', 'mi'])
  .name('Distance Format')
  .onChange(updatePositions);
  
  const helperFolder = posFolder.addFolder('Show Helper Objects');
  
  tracePlanets.forEach(obj => {
  const isHelperObj  = Boolean(isHelper[obj.name]);
  // helpers → helperFolder, planets → posFolder directly
  const targetFolder = isHelperObj ? helperFolder : posFolder;

  const sub = targetFolder.addFolder(obj.name);
  sub.add(obj, 'raDisplay').name('RA').listen();
  sub.add(obj, 'decDisplay').name('Dec').listen();
  sub.add(obj, 'distDisplay').name('Distance to Earth').listen();
  sub.add(obj, 'sunDistDisplay').name('Distance to Sun').listen();
  sub.open();
  });
  
  let folderPerihelion = gui.addFolder('Perihelion Planets')
  folderPerihelion.add(golden.goldenLine, 'visible').name('Perihelion Spiral').onChange( v => golden.setHelpersVisible(v) );
  addInfoButton( folderPerihelion, 'https://britastro.org/computing/applets_orbel.html' );
  folderPerihelion.add(o,"mercuryPerihelion").min(0.0).max(360.0).step(0.001).listen().name("Mercury Perihelion")
  folderPerihelion.add(o,"venusPerihelion").min(0.0).max(360.0).step(0.001).listen().name("Venus Perihelion")
  folderPerihelion.add(o,"earthPerihelion").min(0.0).max(360.0).step(0.001).listen().name("Earth Perihelion")
  folderPerihelion.add(o,"marsPerihelion").min(0.0).max(360.0).step(0.001).listen().name("Mars Perihelion")
  folderPerihelion.add(o,"jupiterPerihelion").min(0.0).max(360.0).step(0.001).listen().name("Jupiter Perihelion")
  folderPerihelion.add(o,"saturnPerihelion").min(0.0).max(360.0).step(0.001).listen().name("Saturn Perihelion")  
  folderPerihelion.add(o,"uranusPerihelion").min(0.0).max(360.0).step(0.001).listen().name("Uranus Perihelion") 
  folderPerihelion.add(o,"neptunePerihelion").min(0.0).max(360.0).step(0.001).listen().name("Neptune Perihelion")   
  
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
      if (child instanceof CSS2DObject) {
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
  
  folderO.add(o, 'starDistanceScaleFact', 0.1, 2).step(0.1).name('Star distance').onChange(factor => {

    // scale all Three.js objects (Mesh, Group, etc.)
    scalableObjects.forEach(obj => obj.scale.setScalar(factor));

    // 2 – tell the label renderer that it has to recompute the screen-space position of every CSS2DObject next frame
    needsLabelUpdate = true;
    
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
 
  /* ---------------------------------------------------------
  * width-toggle badge (does NOT consume a controller slot)
  * --------------------------------------------------------- */
  addWidthToggle(gui);
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
  //stats.update();

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
  if (o.lookAtObj && o.lookAtObj.pivotObj) {
    controls.target.copy(
      o.lookAtObj.pivotObj.getWorldPosition(tmpVec)
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
    updatePerihelion();
    updateOrbitOrientations();
    updatePredictions();
    updateDomLabel();
    golden.update();
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

//*************************************************************
// FUNCTIONS
//*************************************************************
function addWidthToggle(gui, sizes = [300, 550]) {
  let idx = 0;

  /* create the floating badge */
  const badge = document.createElement('div');
  badge.id = 'guiWidthToggle';
  badge.textContent = '⇆';
  document.body.appendChild(badge);

  /* positioning — centred beside the panel */
  function align() {
    const r  = gui.domElement.getBoundingClientRect();
    const bh = badge.getBoundingClientRect().height;
    badge.style.left = `${r.left - badge.offsetWidth}px`;
    badge.style.top  = `${r.top + (r.height - bh) / 2}px`;
  }
  align();                               // first run

  /* keep badge in place on window resizes */
  window.addEventListener('resize', align);

  /*—--- feature-detect ResizeObserver ----*/
  if ('ResizeObserver' in window) {
    new ResizeObserver(align).observe(gui.domElement);
  } else {
    /* fallback: re-align every 1 s on browsers without the API */
    setInterval(align, 1000);
  }

  /* click / tap toggles the panel width */
  badge.onclick = () => {
    idx = 1 - idx;
    gui.domElement.style.width = `${sizes[idx]}px`;
    align();                             // badge tracks the new width
  };
}

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

        const labelObj = new CSS2DObject(labelDiv);
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

  // 0 — per-frame stats
  const planetStats = {
    earth: [
      { header : '—  General characteristics —' },
      {info : 'https://en.wikipedia.org/wiki/Earth','Size diameter'        : [ 12756.27, {small :'km'}]},
      {'Orbital speed around the Sun'               : [107225.047767,{small :'km/h'}]},
      null,
      { header : 'Date specific characteristics for ',  date   : () => o.Date } ,
      {''                                           : [ { small : 'mean' },'on date']},
      {'Solar Day in SI seconds'                    : [{ small : meanlengthofday},o.lengthofDay]},
      {'Sidereal day in SI seconds = Earth rotation period' : [{ small: meanSiderealday}, o.lengthofsiderealDayRealLOD ]},
      {'True Sidereal day in SI seconds'                   : [{ small: meanTrueSiderealday}, o.lengthofsiderealYear/((o.lengthofsiderealYear/o.lengthofDay)+1) ]},
      {'Orbit Period Solar = Solar year in REAL days' : [{ small : meansolaryearlengthinDays},o.lengthofsolarYear]},
      {'Solar year in SI seconds'                   : [{ small: meanlengthofday*meansolaryearlengthinDays}, o.lengthofsolarYearSecRealLOD ]},
      {'Orbit Period Sidereal = Sidereal year in SI seconds' : [{ small : meansiderealyearlengthinSeconds},o.lengthofsiderealYear]},
      {'Sidereal year in days'                               : [{ small: meansiderealyearlengthinSeconds/meanlengthofday}, o.lengthofsiderealYear/o.lengthofDay ]},
      {'Anomalistic year in SI seconds'             : [{ small: meanAnomalisticYearinDays*meanlengthofday}, o.lengthofanomalisticYearRealLOD ]},
      {'Anomalistic year in REAL days'              : [{ small: meanAnomalisticYearinDays}, o.lengthofanomalisticYearRealLOD/o.lengthofDay ]},
      {'Orbit distance = AU length in km'           : [{ small : (meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI) },o.lengthofAU]},
      {'Orbital Eccentricity in AU'                 : [{ small : eccentricityMean},o.eccentricityEarth]},
      {'Obliquity in degrees'                       : [{ small : earthtiltMean},o.obliquityEarth]},
      {'Invariable plane inclination in degrees'    : [{ small : earthinclinationMean}, o.inclinationEarth]},
      {'Longitude of perihelionin in degrees'       : [{ small : 'N/A' },o.longitudePerihelion]},
      {'Date of Perihelion'                         : [{ small : 'N/A' },o.longitudePerihelionDatePer]},
      {'Date of Aphelion'                           : [{ small : 'N/A' },o.longitudePerihelionDateAp]},
      null,
      { header : 'Precession calculations for ',  date   : () => o.Date } ,
      {''                                                  : [ { small : 'with fixed 86400 LOD sec/day' },{ small : 'with REAL LOD sec/day'}]},
      {info : 'https://en.wikipedia.org/wiki/Axial_precession','Axial precession _____ - Mean 23,534.76923 years'                            : [ o.axialPrecession,
                                                              o.axialPrecessionRealLOD ]},
      {info : 'https://en.wikipedia.org/wiki/Apsidal_precession','Inclination precession - Mean 101,984 years'                    : [ o.inclinationPrecession,
                                                              o.inclinationPrecessionRealLOD ]},
      {info : 'https://en.wikipedia.org/wiki/Milankovitch_cycles#Apsidal_precession','Perihelion precession - Mean 19,122 years' : [ o.perihelionPrecession,
                                                              o.perihelionPrecessionRealLOD ]},
      {info : 'https://en.wikipedia.org/wiki/Axial_tilt#Long_term','Obliquity precession_ - Mean 38,244 years'                    : [ o.obliquityPrecession,
                                                              o.obliquityPrecessionRealLOD ]},
      {info : 'https://en.wikipedia.org/wiki/Milankovitch_cycles#Orbital_inclination','Ecliptic precession___ - Mean 61,190.4 years'  : [ o.eclipticPrecession,
                                                              o.eclipticPrecessionRealLOD ]},
    ],

    moon: [
    { header : '—  General characteristics —' },
    { info : 'https://en.wikipedia.org/wiki/Moon','Size diameter'    : [3474.8, {small : 'km'}] },
    { 'Mean Orbital Eccentricity'                   : [0.054900489, {small : 'AU'}] },
    { 'Mean Orbital Inclination'                    : [-5.1453964, {small : 'degrees (°)'}] },
    { 'Mean Earth-Moon distance'                    : [384399.07, {small : 'km'}] },
    null,
    { header : 'Date specific characteristics for ',  date   : () => o.Date } ,
    {''                                             : [ { small : 'mean' },'on date']},
    { info : 'https://en.wikipedia.org/wiki/Orbit_of_the_Moon','Sidereal month = rotation period (days)' : [{small : 27.3216579703313}, 27.3216579703313*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Synodic month in days'                       : [ {small : 29.5305755823449}, 29.5305755823449*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Anomalistic month in days'                   : [{small : 27.5545422736556}, 27.5545422736556*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Draconic month or nodal period in days'      : [{small : 27.2122179401074}, 27.2122179401074*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { info : 'https://eclipse.gsfc.nasa.gov/LEcat5/LEcatalog.html','Tropical month (days)'                   : [{small : 27.3215711299373}, 27.3215711299373*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Full Moon cycle ICRF in days'                : [{small : 411.7655868}, 411.7655868*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Full Moon cycle Ecliptic in days'            : [{small : 411.7853124}, 411.7853124*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Draconic year ICRF in days'                  : [{small : 346.6074609}, 346.6074609*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Draconic year Ecliptic in days'              : [{small : 346.6214375}, 346.6214375*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Apsidal precession Ecliptic in days'         : [{small : 3231.444782}, 3231.444782*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Apsidal precession Ecliptic in years'        : [{small : 3231.444782/meansolaryearlengthinDays}, 3231.444782/o.lengthofsolarYear]},
    { 'Apsidal precession ICRF in days'             : [{small : 3232.660032}, 3232.660032*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Apsidal precession ICRF in years'            : [{small : 3232.660032/meansolaryearlengthinDays}, 3232.660032/o.lengthofsolarYear]},
    { 'Nodal precession ICRF in days'               : [{small : 6793.518877}, 6793.518877*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Nodal precession ICRF in years'              : [{small : 6793.518877/meansolaryearlengthinDays}, 6793.518877/o.lengthofsolarYear]},
    { 'Nodal precession Ecliptic in days'           : [{small : 6798.892188}, 6798.892188*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Nodal precession Ecliptic in years'          : [{small : 6798.892188/meansolaryearlengthinDays}, 6798.892188/o.lengthofsolarYear]},
    { 'Nodal meets Apsidal precession in days'      : [{small : 2190.379521}, 2190.379521*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Nodal meets Apsidal precession in years'     : [{small : 2190.379521/meansolaryearlengthinDays}, 2190.379521/o.lengthofsolarYear]},
    { info : 'https://geoenergymath.com/2014/04/05/the-chandler-wobble-and-the-soim/','Royer Cycle in days'                      : [{small : 6167.370826}, 6167.370826*meansolaryearlengthinDays/o.lengthofsolarYear]},
    { 'Royer Cycle in years'                        : [{small : 6167.370826/meansolaryearlengthinDays}, 6167.370826/o.lengthofsolarYear]},
    ],
    sun: [
    { header : '—  General characteristics —' },
    { info : 'https://en.wikipedia.org/wiki/Sun','Size diameter'           : [1392684.00,{small : 'km'}] },
    { 'Mean Axial tilt'                             : [7.155,{small : 'degrees (°)'}] },
    ],
    mercury: [
    { header : '—  General characteristics —' },
    { info : 'https://en.wikipedia.org/wiki/Mercury_(planet)','Size diameter'   : [4879.40,{small :'km'}]},
    { 'Orbital speed around the Sun'                : [172344.662476, {small :'km/h'}]},
    { 'Mean Day length = rotation'                  : [1407.494168, {small :'hours'}]},
    { 'Mean Orbit Period Solar - years'             : [0.240849434, {small : '305,952/1270304'} ]},
    { 'Mean Orbit Period Solar - days'              : [87.96838552, {small : '305,952/1270304*365.2422341'} ]},
    { 'Mean Orbit Period Sidereal - days'           : [87.96928578, {small : '305,952/(1270304-13)*365.2422341'} ]},
    { 'Mean Synodic period with Earth - days'       : [115.8773892, {small : '305,952/(1270304-305,952)*365.2422341'} ]},
    { 'Orbit distance around Sun - AU'              : [0.387106462, {small : '((305,952/1270304)^2)^(1/3)'} ]},
    { 'Orbit distance around Sun - km'              : [57910302.38, {small :'km'}]},
    { 'Mean Orbital Eccentricity (AU)'              : [0.205632,{ small : 'AU' } ]},
    { 'Orbital Inclination'                         : [o.mercuryInclination,{ small : 'degrees (°)' } ]},
    { 'Mean Invariable plane inclination (°)'       : [6.3472858,{ small : 'degrees (°)' } ]},
    { 'Mean Axial tilt (°)'                         : [0.03,{ small : 'degrees (°)' } ]},
    null,
    { header : 'Date specific characteristics for ', date   : () => o.Date } ,
    {''                                             : [ { small : 'mean' },'on date']},
    { 'Longitude of Perihelion'                     : [{ small : 'N/A' },o.mercuryPerihelion]},
    { 'Date of Perihelion (Y-M-D h:m:s)'            : [{ small : 'N/A' }, longitudeToDateTime(o.mercuryPerihelion, o.currentYear) ]},
    { 'Date of Aphelion  (Y-M-D h:m:s)'             : [{ small : 'N/A' }, longitudeToDateTime(o.mercuryPerihelion - 180,        o.currentYear) ]},
    { 'Longitude of Ascending node'                 : [{ small : 'N/A' },o.mercuryAscendingNode]},
    { 'Longitude of Descending node'                : [{ small : 'N/A' },o.mercuryDescendingNode]},
    { 'Argument of Periapsis'                       : [{ small : 'N/A' },o.mercuryArgumentOfPeriapsis]},
    { 'Missing perihelion precession due to Earth Axial precession'  : [1296000/(((((57910302.3826137-(57910302.3826137/100*20.5632))))*2*Math.PI)/((((meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI))/(meansolaryearlengthinDays+1)*2*Math.PI)/(o.axialPrecessionRealLOD)))*100 , { small : 'arcsec/100 yrs'}] },
    ],
    venus: [
    { header : '—  General characteristics —' },
    { info : 'https://en.wikipedia.org/wiki/venus','Size diameter (km)'                    : 12103.60 },
    { 'Orbital speed around the Sun'                : [126078.709624, {small :'km/h'}]},
    { 'Mean Day length = rotation'                  : [5832.539272, {small :'hours'}]},
    { 'Mean Orbit Period Solar - years'             : [0.615196532, {small : '305,952/497324'} ]},
    { 'Mean Orbit Period Solar - days'              : [224.6957557, {small : '305,952/497324*365.2422341'} ]},
    { 'Mean Orbit Period Sidereal - days'           : [224.7016294, {small : '305,952/(497324-13)*365.2422341'} ]},
    { 'Mean Synodic period with Earth - days'       : [583.9234162, {small : '305,952/(497324-305,952)*365.2422341'} ]},
    { 'Orbit distance around Sun - AU'              : [0.723340173, {small : '((305,952/497324)^2)^(1/3)'} ]},
    { 'Orbit distance around Sun - km'              : [108210149.66, {small :'km'}]},
    { 'Mean Orbital Eccentricity (AU)'              : [0.006772,{ small : 'AU' } ]},
    { 'Orbital Inclination'                         : [o.venusInclination,{ small : 'degrees (°)' } ]},
    { 'Mean Invariable plane inclination (°)'       : [2.1545441,{ small : 'degrees (°)' } ]},
    { 'Mean Axial tilt (°)'                         : [2.6392,{ small : 'degrees (°)' }] },
    null,
    { header : 'Date specific characteristics for ',  date   : () => o.Date } ,
    {''                                             : [ { small : 'mean' },'on date']},
    { 'Longitude of Perihelion'                     : [{ small : 'N/A' },o.venusPerihelion]},
    { 'Date of Perihelion (Y-M-D h:m:s)'            : [{ small : 'N/A' }, longitudeToDateTime(o.venusPerihelion, o.currentYear) ]},
    { 'Date of Aphelion  (Y-M-D h:m:s)'             : [{ small : 'N/A' }, longitudeToDateTime(o.venusPerihelion - 180,        o.currentYear) ]},
    { 'Longitude of Ascending node'                 : [{ small : 'N/A' },o.venusAscendingNode]},
    { 'Longitude of Descending node'                : [{ small : 'N/A' },o.venusDescendingNode]},
    { 'Argument of Periapsis'                       : [{ small : 'N/A' },o.venusArgumentOfPeriapsis]},
    { 'Missing perihelion precession due to Earth Axial precession'               : [1296000/(((((108210149.66-(108210149.66/100*0.6772))))*2*Math.PI)/((((meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI))/(meansolaryearlengthinDays+1)*2*Math.PI)/(o.axialPrecessionRealLOD)))*100 , { small : 'arcsec/100 yrs'}] },
    ],

    mars: [
    { header : '—  General characteristics —' },
    { info : 'https://en.wikipedia.org/wiki/mars','Size diameter (km)'                    : 6779.00 },
    { 'Orbital speed around the Sun'                : [86869.635222, {small :'km/h'}]},
    { 'Mean Day length = rotation'                  : [24.62295825, {small :'hours'}]},
    { 'Mean Orbit Period Solar - years'             : [1.88076767, {small : '305,952/162674'} ]},
    { 'Mean Orbit Period Solar - days'              : [686.9357857, {small : '305,952/162674*365.2422341'} ]},
    { 'Mean Orbit Period Sidereal - days'           : [686.9906862, {small : '305,952/(162674-13)*365.2422341'} ]},
    { 'Mean Synodic period with Earth - days'       : [779.9284747, {small : '305,952/(162674-305,952)*365.2422341'} ]},
    { 'Orbit distance around Sun - AU'              : [1.523667137, {small : '((305,952/162674)^2)^(1/3)'} ]},
    { 'Orbit distance around Sun - km'              : [227937359.31, {small :'km'}]},
    { 'Mean Orbital Eccentricity (AU)'              : [0.093401,{ small : 'AU' } ]},
    { 'Orbital Inclination'                         : [o.marsInclination,{ small : 'degrees (°)' } ]},
    { 'Mean Invariable plane inclination (°)'       : [1.6311858,{ small : 'degrees (°)' } ]},
    { 'Mean Axial tilt (°)'                         : [25.19,{ small : 'degrees (°)' }] },
    null,
    { header : 'Date specific characteristics for ',  date   : () => o.Date } ,
    {''                                             : [ { small : 'mean' },'on date']},
    { 'Longitude of Perihelion'                     : [{ small : 'N/A' },o.marsPerihelion]},
    { 'Date of Perihelion (Y-M-D h:m:s)'            : [{ small : 'N/A' }, longitudeToDateTime(o.marsPerihelion - 180, o.currentYear) ]},
    { 'Date of Aphelion  (Y-M-D h:m:s)'             : [{ small : 'N/A' }, longitudeToDateTime(o.marsPerihelion,        o.currentYear) ]},
    { 'Longitude of Ascending node'                 : [{ small : 'N/A' },o.marsAscendingNode]},
    { 'Longitude of Descending node'                : [{ small : 'N/A' },o.marsDescendingNode]},
    { 'Argument of Periapsis'                       : [{ small : 'N/A' },o.marsArgumentOfPeriapsis]},
    { 'Missing perihelion precession due to Earth Axial precession'               : [1296000/(((((227937359.31-(227937359.31/100*9.3401))))*2*Math.PI)/((((meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI))/(meansolaryearlengthinDays+1)*2*Math.PI)/(o.axialPrecessionRealLOD)))*100 , { small : 'arcsec/100 yrs'}] },
    ],
   
    jupiter: [
    { header : '—  General characteristics —' }, 
    { info : 'https://en.wikipedia.org/wiki/jupiter','Size diameter (km)'                    : 139822.00 },
    { 'Orbital speed around the Sun'                : [47024.511607, {small :'km/h'}]},
    { 'Mean Day length = rotation'                  : [9.925000009, {small :'hours'}]},
    { 'Mean Orbit Period Solar - years'             : [11.85676639, {small : '305,952/25804'} ]},
    { 'Mean Orbit Period Solar - days'              : [4330.591846, {small : '305,952/25804*365.2422341'} ]},
    { 'Mean Orbit Period Sidereal - days'           : [4332.774689, {small : '305,952/(25804-13)*365.2422341'} ]},
    { 'Mean Synodic period with Earth - days'       : [398.8841327, {small : '305,952/(25804-305,952)*365.2422341'} ]},
    { 'Orbit distance around Sun - AU'              : [5.199690678, {small : '((305,952/25804)^2)^(1/3)'} ]},
    { 'Orbit distance around Sun - km'              : [777862653.72, {small :'km'}]},
    { 'Mean Orbital Eccentricity (AU)'              : [0.048499,{ small : 'AU' } ]},
    { 'Orbital Inclination'                         : [o.jupiterInclination,{ small : 'degrees (°)' } ]},
    { 'Mean Invariable plane inclination (°)'       : [0.3219652,{ small : 'degrees (°)' } ]},
    { 'Mean Axial tilt (°)'                         : [3.13,{ small : 'degrees (°)' }] },
    null,
    { header : 'Date specific characteristics for ',  date   : () => o.Date } ,
    {''                                             : [ { small : 'mean' },'on date']},
    { 'Longitude of Perihelion'                     : [{ small : 'N/A' },o.jupiterPerihelion]},
    { 'Date of Perihelion (Y-M-D h:m:s)'            : [{ small : 'N/A' }, longitudeToDateTime(o.jupiterPerihelion, o.currentYear) ]},
    { 'Date of Aphelion  (Y-M-D h:m:s)'             : [{ small : 'N/A' }, longitudeToDateTime(o.jupiterPerihelion - 180,        o.currentYear) ]},
    { 'Longitude of Ascending node'                 : [{ small : 'N/A' },o.jupiterAscendingNode]},
    { 'Longitude of Descending node'                : [{ small : 'N/A' },o.jupiterDescendingNode]},
    { 'Argument of Periapsis'                       : [{ small : 'N/A' },o.jupiterArgumentOfPeriapsis]},
    { 'Missing perihelion precession due to Earth Axial precession'               : [1296000/(((((777862653.72-(777862653.72/100*4.8499))))*2*Math.PI)/((((meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI))/(meansolaryearlengthinDays+1)*2*Math.PI)/(o.axialPrecessionRealLOD)))*100 , { small : 'arcsec/100 yrs'}] },
    ],
    
    saturn: [
    { header : '—  General characteristics —' },
    { info : 'https://en.wikipedia.org/wiki/saturn','Size diameter (km)'                    : 116464.00 },
    { 'Orbital speed around the Sun'                : [34733.233849, {small :'km/h'}]},
    { 'Mean Day length = rotation'                  : [10.56055559, {small :'hours'}]},
    { 'Mean Orbit Period Solar - years'             : [29.42412002, {small : '305,952/10398'} ]},
    { 'Mean Orbit Period Solar - days'              : [10746.93133, {small : '305,952/10398*365.2422341'} ]},
    { 'Mean Orbit Period Sidereal - days'           : [10760.3844, {small : '305,952/(10398-13)*365.2422341'} ]},
    { 'Mean Synodic period with Earth - days'       : [378.0919629, {small : '305,952/(10398-305,952)*365.2422341'} ]},
    { 'Orbit distance around Sun - AU'              : [9.530938246, {small : '((305,952/10398)^2)^(1/3)'} ]},
    { 'Orbit distance around Sun - km'              : [1425808067.32, {small :'km'}]},
    { 'Mean Orbital Eccentricity (AU)'              : [0.055547,{ small : 'AU' } ]},
    { 'Orbital Inclination'                         : [o.saturnInclination,{ small : 'degrees (°)' } ]},
    { 'Mean Invariable plane inclination (°)'       : [0.9254704,{ small : 'degrees (°)' } ]},
    { 'Mean Axial tilt (°)'                         : [26.73,{ small : 'degrees (°)' }]},
    null,
    { header : 'Date specific characteristics for ',  date   : () => o.Date } ,
    {''                                             : [ { small : 'mean' },'on date']},
    { 'Longitude of Perihelion'                     : [{ small : 'N/A' },o.saturnPerihelion]},
    { 'Date of Perihelion (Y-M-D h:m:s)'            : [{ small : 'N/A' }, longitudeToDateTime(o.saturnPerihelion, o.currentYear) ]},
    { 'Date of Aphelion  (Y-M-D h:m:s)'             : [{ small : 'N/A' }, longitudeToDateTime(o.saturnPerihelion - 180,        o.currentYear) ]},
    { 'Longitude of Ascending node'                 : [{ small : 'N/A' },o.saturnAscendingNode]},
    { 'Longitude of Descending node'                : [{ small : 'N/A' },o.saturnDescendingNode]},
    { 'Argument of Periapsis'                       : [{ small : 'N/A' },o.saturnArgumentOfPeriapsis]},
    { 'Missing perihelion precession due to Earth Axial precession'               : [1296000/(((((1425808067.32-(1425808067.32/100*5.5547))))*2*Math.PI)/((((meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI))/(meansolaryearlengthinDays+1)*2*Math.PI)/(o.axialPrecessionRealLOD)))*100 , { small : 'arcsec/100 yrs'}] },
    ],
    
    uranus: [
    { header : '—  General characteristics —' },
    { info : 'https://en.wikipedia.org/wiki/uranus','Size diameter (km)'                    : 50724.00 },
    { 'Orbital speed around the Sun'                : [24510.460095, {small :'km/h'}]},
    { 'Mean Day length = rotation'                  : [17.23992, {small :'hours'}]},
    { 'Mean Orbit Period Solar - years'             : [83.73070608, {small : '305,952/3654'} ]},
    { 'Mean Orbit Period Solar - days'              : [30581.99015, {small : '305,952/3654*365.2422341'} ]},
    { 'Mean Orbit Period Sidereal - days'           : [30691.18154, {small : '305,952/(3654-13)*365.2422341'} ]},
    { 'Mean Synodic period with Earth - days'       : [369.6570669, {small : '305,952/(3654-305,952)*365.2422341'} ]},
    { 'Orbit distance around Sun - AU'              : [19.13917304, {small : '((305,952/3654)^2)^(1/3)'} ]},
    { 'Orbit distance around Sun - km'              : [2863179533.89, {small :'km'}]},
    { 'Mean Orbital Eccentricity (AU)'              : [0.046381,{ small : 'AU' } ]},
    { 'Orbital Inclination'                         : [o.uranusInclination,{ small : 'degrees (°)' } ]},
    { 'Mean Invariable plane inclination (°)'       : [0.9946692,{ small : 'degrees (°)' } ]},
    { 'Mean Axial tilt (°)'                         : [82.23,{ small : 'degrees (°)' }] },
    null,
    { header : 'Date specific characteristics for ',  date   : () => o.Date } ,
    {''                                             : [ { small : 'mean' },'on date']},
    { 'Longitude of Perihelion'                     : [{ small : 'N/A' }, o.uranusPerihelion]},
    { 'Date of Perihelion (Y-M-D h:m:s)'            : [{ small : 'N/A' }, longitudeToDateTime(o.uranusPerihelion, o.currentYear) ]},
    { 'Date of Aphelion  (Y-M-D h:m:s)'             : [{ small : 'N/A' }, longitudeToDateTime(o.uranusPerihelion - 180,        o.currentYear) ]},
    { 'Longitude of Ascending node'                 : [{ small : 'N/A' },o.uranusAscendingNode]},
    { 'Longitude of Descending node'                : [{ small : 'N/A' },o.uranusDescendingNode]},
    { 'Argument of Periapsis'                       : [{ small : 'N/A' },o.uranusArgumentOfPeriapsis]},
    { 'Missing perihelion precession due to Earth Axial precession'               : [1296000/(((((2863179533.89-(2863179533.89/100*4.6381))))*2*Math.PI)/((((meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI))/(meansolaryearlengthinDays+1)*2*Math.PI)/(o.axialPrecessionRealLOD)))*100 , { small : 'arcsec/100 yrs'}] },
    ],

    neptune: [
    { header : '—  General characteristics —' },
    { info : 'https://en.wikipedia.org/wiki/neptune','Size diameter (km)'                    : 49244.00 },
    { 'Orbital speed around the Sun'                : [19584.414183, {small :'km/h'}]},
    { 'Mean Day length = rotation'                  : [16.11120003, {small :'hours'}]},
    { 'Mean Orbit Period Solar - years'             : [164.1373391, {small : '305,952/1864'} ]},
    { 'Mean Orbit Period Solar - days'              : [59949.88841, {small : '305,952/1864*365.2422341'} ]},
    { 'Mean Orbit Period Sidereal - days'           : [60370.93031, {small : '305,952/(1864-13)*365.2422341'} ]},
    { 'Mean Synodic period with Earth - days'       : [367.4810976, {small : '305,952/(1864-305,952)*365.2422341'} ]},
    { 'Orbit distance around Sun - AU'              : [29.97815672, {small : '((305,952/1864)^2)^(1/3)'} ]},
    { 'Orbit distance around Sun - km'              : [4484668412.63, {small :'km'}]},
    { 'Mean Orbital Eccentricity (AU)'              : [0.01168,{ small : 'AU' } ]},
    { 'Orbital Inclination'                         : [o.neptuneInclination,{ small : 'degrees (°)' } ]},
    { 'Mean Invariable plane inclination (°)'       : [0.7354155,{ small : 'degrees (°)' } ]},
    { 'Mean Axial tilt (°)'                         : [28.32,{ small : 'degrees (°)' }] },
    null,
    { header : 'Date specific characteristics for ',  date   : () => o.Date } ,
    {''                                             : [ { small : 'mean' },'on date']},
    { 'Longitude of Perihelion'                     : [{ small : 'N/A' },o.neptunePerihelion]},
    { 'Date of Perihelion (Y-M-D h:m:s)'            : [{ small : 'N/A' }, longitudeToDateTime(o.neptunePerihelion, o.currentYear) ]},
    { 'Date of Aphelion  (Y-M-D h:m:s)'             : [{ small : 'N/A' }, longitudeToDateTime(o.neptunePerihelion - 180,        o.currentYear) ]},
    { 'Longitude of Ascending node'                 : [{ small : 'N/A' },o.neptuneAscendingNode]},
    { 'Longitude of Descending'                     : [{ small : 'N/A' },o.neptuneDescendingNode]},
    { 'Argument of Periapsis'                       : [{ small : 'N/A' },o.neptuneArgumentOfPeriapsis]},
    { 'Missing perihelion precession due to Earth Axial precession'               : [1296000/(((((4484668412.63-(4484668412.63/100*1.168))))*2*Math.PI)/((((meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI))/(meansolaryearlengthinDays+1)*2*Math.PI)/(o.axialPrecessionRealLOD)))*100 , { small : 'arcsec/100 yrs'}] },
    ],
  };

  // 1 — build / fetch the DOM elements
  const label = document.getElementById('planetLabel');
  if (!label) { console.error('#planetLabel element missing'); return; }

  if (!label.dataset.init) {
    label.innerHTML = '';
    const closeBtn = document.createElement('span');
    closeBtn.className = 'closeBtn'; 
    closeBtn.textContent = '×';
    closeBtn.style.cssText =
      'position:absolute;top:4px;right:12px;font-weight:bold;cursor:pointer;' +
      'opacity:.65;user-select:none;pointer-events:auto;';
    closeBtn.addEventListener('pointerdown', e => e.stopPropagation());
    closeBtn.addEventListener('click', e => {
      e.stopPropagation();
      labelDismissed = true;
      label.style.display = 'none';
      
      /* -- turn off the helper of the planet that was being looked at */
      if (o.lookAtObj && o.lookAtObj.orbitPlaneHelper) {
      o.lookAtObj.orbitPlaneHelper.visible = false;
      }
      
    });

    const content = document.createElement('div');
    content.className = 'labelContent';

    label.appendChild(closeBtn);
    label.appendChild(content);
    label.style.pointerEvents = 'auto';
    label.dataset.init = '1';
  }
  const content = label.querySelector('.labelContent');

  // 2 — should we show anything?
  const selObj   = o.lookAtObj;
  const selName  = selObj?.name?.toLowerCase() || '';
  const pivot    = selObj?.pivotObj;

  const showCard =
    pivot &&
    selName &&
    selName !== 'unnamed' &&
    planetStats[selName];

  
  // 3 - Apply per-planet colour theme to the panel
  if (showCard) {                         // only bother when the card is visible
  const labelEl  = document.getElementById('planetLabel');
  const themeCls = `theme-${selName}`;  // e.g. "theme-mars"

  for (const c of [...labelEl.classList]) {
    if (c.startsWith('theme-') && c !== themeCls) {
      labelEl.classList.remove(c);
    }
  }
  // 4 - add the new theme if it’s not there yet
  if (!labelEl.classList.contains(themeCls)) {
    labelEl.classList.add(themeCls);
  }
  }
  
  if (!showCard) {
    label.style.display = 'none';
    labelDismissed   = false;
    prevPlanetName   = '';
    return;
  }

  if (selName !== prevPlanetName) {
    labelDismissed = false;
    prevPlanetName = selName;
  }
  if (labelDismissed) {
    label.style.display = 'none';
    return;
  }

  // 5 — build the HTML with the *fresh* numbers
  const fmt = v =>
  (typeof v === 'number' && Number.isFinite(v)) ? +v.toFixed(8) : (v ?? '');

  const mkCell = (cls, content) =>
  `<span class="${cls}">${content ?? ''}</span>`;

  const symbol = PLANET_SYMBOL[selName] || '';
  let nextHTML = `
  <div class="pl-title">
    ${symbol ? `<span class="pl-symbol">${symbol}</span>` : ''}
    <span class="pl-name">${niceName(selName)}</span>
  </div>
  <div class="scrollBox"><div class="pl-grid">
  `;

  for (const row of planetStats[selName]) {

  // 6 Header row logic
  if (row && row.header) {

  // 7 Date row logic (string | number | Date | undefined)
  const raw = (typeof row.date === 'function')
                ? row.date()           // call the getter every rebuild
                : row.date;

  // 7b) convert to "dd/mm/yyyy" when possible, otherwise show raw string
  let dateStr = '';
  if (raw !== undefined && raw !== null) {
    let d;

    if (raw instanceof Date) {
      d = raw;
    } else if (typeof raw === 'number') {
      d = new Date(raw);               // milliseconds-since-epoch
    } else if (typeof raw === 'string') {
      // accept "YYYY/MM/DD", "YYYY-MM-DD", or any ISO-8601 Date string
      const parts = raw.split(/[\/-]/);
      d = (parts.length === 3)
            ? new Date(parts[0], parts[1] - 1, parts[2])
            : new Date(raw);
    }

    // if we got a usable Date, localise to en-GB; otherwise keep the string
    dateStr = (d instanceof Date && !isNaN(d))
                ? d.toLocaleDateString('en-GB')
                : String(raw);
  }

  // 7c) — compose the header HTML and insert it
  const headHTML =
        row.header +
        (dateStr ? ` <span class="date">${dateStr}</span>` : '');

  nextHTML += `<span class="pl-head">${headHTML}</span>`;
  continue;
  }

  // 8 - blank row
  if (row === null) {
    nextHTML += mkCell('pl-blank','') + mkCell('pl-blank','') + mkCell('pl-blank','');
    continue;
  }

  // 9 - normal data rows
  // find the first entry that is NOT a meta-key
  const [ labelTxt, rawVal ] = Object.entries(row)
     .find(([k]) => k !== 'info' && k !== 'header');
  const unit = (labelTxt.match(/\(([^)]+)\)/) || [,''])[1];
  const label = labelTxt.replace(/\s*\([^)]+\)\s*$/, '');
    
  // pick up an info-URL supplied at row level
  const rowInfo = row.info;
  const labelHTML = rowInfo
    ? `${label} <a href="${rowInfo}" class="pl-info" target="_blank" title="${labelTxt}">ⓘ</a>`
    : label;

  // get primary + secondary cells
  let v1 = rawVal, v2 = '';
  if (Array.isArray(rawVal)) {
    v1 = rawVal[0]; v2 = rawVal[1];
  }
  if (!Array.isArray(rawVal) && !unit && typeof rawVal !== 'object') {
    v2 = '';               // single value, no unit
  }
  if (!Array.isArray(rawVal) && unit) {
    v2 = unit;             // single value + implicit unit
  }

  // unwrap bold / info meta
  const render = val =>
  (val && typeof val === 'object')
    ? (
        // info-icon (if any)
        (val.info
          ? `<a href="${val.info}" class="pl-info" target="_blank" title="${labelTxt}">ⓘ</a>`
          : '') +

        // bold ⇢ italic ⇢ small ⇢ plain
        (val.bold   ? `<strong>${fmt(val.bold)}</strong>`  :
         val.italic ? `<em>${fmt(val.italic)}</em>`        :
         val.small  ? `<small>${fmt(val.small)}</small>`   :
                       fmt(val))
      ).trim()
    : fmt(val);

  nextHTML +=
      mkCell('pl-key', labelHTML) +
      mkCell('pl-val', render(v1)) +
      mkCell('pl-alt', render(v2));
  }

  nextHTML += '</div></div>';

  if (nextHTML !== labelPrevHTML) {
  content.innerHTML = nextHTML;
  labelPrevHTML     = nextHTML;

  // freeze / reuse column widths
  let templateCols = columnCache[selName];
  if (!templateCols) {                          // first build for this planet
    const grid  = content.querySelector('.pl-grid');
    const vals  = [...grid.querySelectorAll('.pl-val')];
    const alts  = [...grid.querySelectorAll('.pl-alt')];

    const maxValCh = Math.max(...vals.map(s => s.textContent.length)) + 1;
    const maxAltCh = Math.max(...alts.map(s => s.textContent.length)) + 1;

    templateCols = `max-content ${maxValCh}ch ${maxAltCh}ch`;
    columnCache[selName] = templateCols;
  }
  content.querySelector('.pl-grid').style.gridTemplateColumns = templateCols;
  }
  
  // 10 — position & scale  (fixed to top-left)
  label.style.position  = 'fixed';   // stay in viewport space
  label.style.top       = '16px';
  label.style.left      = '16px';

  // keep it the same size, no zoom-scaling
  label.style.transform = 'none';
  label.style.display   = 'block';
  
  // position & scale
  pivot.updateMatrixWorld();
  const pos = pivot.getWorldPosition(new THREE.Vector3()).project(camera);

  const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;

  const raw   = baseCamDistance / camera.position.length();
  const scale = Math.max(minScale,
                 Math.min(maxScale, Math.pow(raw, zoomFactor)));

  label.style.transform =
    `translate(-50%,-50%) translate(${x}px,${y}px) scale(1)`;
  label.style.transformOrigin = 'center';
  label.style.display = 'block';
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

  /* ── 1  Nothing is selected → ring off and exit early ─────────── */
  if (!o.lookAtObj) {
    focusRing.visible = false;
    return;
  }

  /* ── 2  Show the ring only when we are looking at the Sun ─────── */
  const isSun = o.lookAtObj.name === 'Sun';

  if (isSun && o.sun?.pivotObj) {
    o.sun.pivotObj.updateMatrixWorld();

    focusRing.position.copy(
      o.sun.pivotObj.getWorldPosition(tmpVec)
    );
    focusRing.scale.set(5, 5, 0);   // whatever size you need
    focusRing.visible = true;
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

  /* — 1 ────────────────────────────────────────────────────────────
     If no planet is selected, restore the default lighting state
  */
  if (!o.lookAtObj) {
    sunLight.visible      = true;   // normal directional sunlight
    fallbackLight.visible = false;  // camera-following point light off
    return;                         // nothing more to do
  }

  /* — 2 ────────────────────────────────────────────────────────────
     A planet *is* selected → decide what to do with the lights
  */
  const isSun = o.lookAtObj.name === 'Sun';

  if (isSun) {
    // Looking directly at the Sun: switch to the point light on camera
    sunLight.visible      = false;
    fallbackLight.visible = true;
    fallbackLight.position.copy(camera.position);
  }
  else if (o.lookAtObj.pivotObj) {
    // Any other body: keep the directional light and aim it correctly
    sunLight.visible      = true;
    fallbackLight.visible = false;

    updateSunlightForPlanet(
      o.lookAtObj.pivotObj,   // the planet
      o.lookAtObj.pivotObj    // (same object here if your helper expects both)
    );
  }
}

// Animation (pulsing)
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

function auToKm(au) { return au * o.lengthofAU; }  // live conversion

/*──────────────────────────────────────────────────────────────────────────╮
│  updatePositions – reference sheet                                        │
│                                                                           │
│  What each output means and precisely how it is derived                   │
╞═══════════════════════════════════════════════════════════════════════════╡
│  SYMBOLS                                                                  │
│    EARTH_POS   world-space centre of the Earth            (Vector3)       │
│    SUN_POS     world-space centre of the Sun              (Vector3)       │
│    PLANET_POS  world-space centre of current planet       (Vector3)       │
│    LOCAL       PLANET_POS expressed in Earth-equatorial   (Vector3)       │
│                coordinates – i.e. the local space of                      │
│                earth.rotationAxis (includes axial tilt                    │
│                and 21-June spin)                                          │
│    DELTA       reusable difference vector                                 │
│    SPHERICAL   THREE.Spherical used to extract θ (RA), φ (Dec), r         │
│                                                                           │
│───────────────────────────────────────────────────────────────────────────│
│ 1. EARTH → planet  (distance)                                             │
│      DELTA     = PLANET_POS − EARTH_POS      // world coords              │
│      AU        = |DELTA| / 100               // scene-units → AU          │
│      km        = AU × currentAUDistance                                   │
│                                                                           │
│ 2. EARTH → planet  (RA / Dec)                                             │
│      LOCAL     = worldToLocal( PLANET_POS, earth.rotationAxis )           │
│      SPHERICAL.setFromVector3( LOCAL )                                    │
│      RA(rad)  = θ  = SPHERICAL.theta                                      │
│      Dec(rad) = φ  = SPHERICAL.phi                                        │
│                                                                           │
│      • LOCAL is expressed in the Earth-equatorial frame,                  │
│        so θ already measures from 0 h at the                              │
│        intersection of the equator & ecliptic *including* the             │
│        90° spin you applied for 21 June.                                  │
│                                                                           │
│ 3. SUN  → planet  (distance)                                              │
│      DELTA     = PLANET_POS − SUN_POS       // world coords               │
│      AU / km   computed exactly as in step 1                              │
│                                                                           │
│ 4. EARTH → camera (GUI read-out)                                          │
│      Same recipe as steps 1 & 2, but                                      │
│      PLANET_POS → CAMERA_POS.                                             │
│                                                                           │
│───────────────────────────────────────────────────────────────────────────│
│  Notes                                                                    │
│  • Switching o.distanceUnit between “AU”, "km" and “km” picks which       │
│    formatted string is exposed to dat.GUI (distDisplay, sunDistDisplay).  │
│  • Any future changes to axial tilt, solstice offsets,                    │
│    or precession automatically propagate, because we                      │
│    always convert world vectors into earth.rotationAxis local space       │
│    *before* reading θ / φ from THREE.Spherical.                           │
╰───────────────────────────────────────────────────────────────────────────*/
function updatePositions() {
  // 0.  ensure every Object3D has a fresh world matrix
  scene.updateMatrixWorld(true);

  // 1.  anchor points in world space
  earth.rotationAxis.getWorldPosition(EARTH_POS);  // Earth centre
  sun.planetObj.getWorldPosition(SUN_POS);         // Sun   centre

  // ───────────────────────── each planet ───────────────────────────
  for (let i = 0, L = tracePlanets.length; i < L; i++) {
    const obj = tracePlanets[i];
    obj.planetObj.getWorldPosition(PLANET_POS);

    /*  EARTH → PLANET  (distance)  */
    DELTA.subVectors(PLANET_POS, EARTH_POS);         // world coords
    obj.distAU = DELTA.length() / 100;               // scene → AU
    obj.distKm = auToKm(obj.distAU);                 // AU → km (live)
    obj.distMi = obj.distKm * KM_TO_MI;

    obj.distDisplay =
      (o.distanceUnit === 'AU') ? obj.distAU.toFixed(8) + ' AU' :
      (o.distanceUnit === 'km') ? obj.distKm.toFixed(2) + ' km'  :
                                  obj.distMi.toFixed(2) + ' mi';

    /*  EARTH → PLANET  (direction for RA/Dec)  
        We need the vector expressed in the Earth-equatorial frame, which
        already includes axial tilt *and* the 90° spin you applied on
        21 June (earth.containerObj.rotation.y = π/2).  The quickest way
        is to transform the planet’s world position into the local
        coordinates of earth.rotationAxis.                                  */
    LOCAL.copy(PLANET_POS);
    earth.rotationAxis.worldToLocal(LOCAL);          // in-place

    SPHERICAL.setFromVector3(LOCAL);                 // Earth local frame
    obj.ra  = SPHERICAL.theta;                       // radians
    obj.dec = SPHERICAL.phi;                         // radians

    if (o.displayFormat === 'decimal') {
      obj.raDisplay  = ((obj.ra * 180 / Math.PI + 360) % 360).toFixed(4) + '°';
      obj.decDisplay = radiansToDecDecimal(obj.dec) + '°';
    } else {
      obj.raDisplay  = radiansToRa(obj.ra);
      obj.decDisplay = radiansToDec(obj.dec);
    }

    /*  SUN → PLANET (distance)  */
    DELTA.subVectors(PLANET_POS, SUN_POS);           // reuse DELTA
    const sunRadius   = DELTA.length();
    obj.sunDistAU     = sunRadius / 100;
    obj.sunDistKm     = auToKm(obj.sunDistAU);
    obj.sunDistMi     = obj.sunDistKm * KM_TO_MI;
    obj.sunDistDisplay =
      (o.distanceUnit === 'AU') ? obj.sunDistAU.toFixed(8) + ' AU' :
      (o.distanceUnit === 'km') ? obj.sunDistKm.toFixed(2) + ' km'  :
                                  obj.sunDistMi.toFixed(2) + ' mi';
  }

  // ─────────────────────── camera read-out ─────────────────────────
  camera.getWorldPosition(CAMERA_POS);

  /*  Earth → Camera (distance & RA/Dec)  */
  CAM_LOCAL.copy(CAMERA_POS);
  earth.rotationAxis.worldToLocal(CAM_LOCAL);        // into Earth frame
  SPHERICAL.setFromVector3(CAM_LOCAL);

  const camDistAU = SPHERICAL.radius / 100;
  const camDistKm = auToKm(camDistAU);
  const camDistMi = camDistKm * KM_TO_MI;

  o.worldCamDistDisplay =
    (o.distanceUnit === 'AU') ? camDistAU.toFixed(8) + ' AU' :
    (o.distanceUnit === 'km') ? camDistKm.toFixed(2) + ' km'  :
                                camDistMi.toFixed(2) + ' mi';

  o.worldCamRa  = SPHERICAL.theta;
  o.worldCamDec = SPHERICAL.phi;
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

function moveModel(pos) {

  let earthTheta = 0;                     // we need this afterwards

  planetObjects.forEach(obj => {

    // current mean (or true) anomaly, same formula you already used
    const θ = obj.speed * pos - obj.startPos * (Math.PI / 180);

    const a = obj.a ?? obj.orbitRadius;   // semi-major (or radius)
    const b = obj.b ?? obj.orbitRadius;   // semi-minor (or radius)
    const isEllipse = a !== b;            // true only when the axes differ

    if (isEllipse) {
      // -------- analytic curve --------
      const x = Math.cos(θ) * a;
      const z = Math.sin(θ) * b;

      obj.pivotObj.position.set(x, 0, z);
      obj.rotationAxis.position.set(x, 0, z);   // planet + rings

      obj.orbitObj.rotation.y = 0;              // keep the path still
    } else {
      // -------- orbitradius circular logic ----
      obj.orbitObj.rotation.y = θ; 
    }

    // planet’s own day-night spin
    if (obj.rotationSpeed) {
      obj.planetObj.rotation.y = obj.rotationSpeed * pos;
    }

    // remember Earth’s anomaly for the zodiac strip
    if (obj.name === 'Earth') earthTheta = θ;
  });

  // zodiac band keeps its old behaviour
  zodiac.rotation.y = -Math.PI / 3 - earthTheta;
}

function getOptimizedPixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 768;

  if (smallScreen && dpr > 1.5) {
    return 1.2; // Lower pixel ratio for small mobile devices
  } else {
    return Math.min(dpr, 2); // Keep max 2 for normal desktop/tablet
  }
}

// resize function:
function onWindowResize() {
  /* ---------- safe viewport ---------- */
  const width  = Math.max(MIN_SIZE, window.innerWidth);
  const height = Math.max(MIN_SIZE, window.innerHeight);
  const aspect = width / height;

  /* ---------- camera (fixed hFOV) ---- */
  const hFovRad = THREE.MathUtils.degToRad(DESIRED_HFOV);
  const vFovRad = 2 * Math.atan( Math.tan(hFovRad / 2) / aspect );
  camera.fov    = THREE.MathUtils.radToDeg(vFovRad);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  /* ---------- renderer sizes --------- */
  renderer.setSize(width, height);
  renderer.setPixelRatio(getOptimizedPixelRatio());
  labelRenderer.setSize(width, height);

  /* ---------- star sprite size ------- */
  const dpr = renderer.getPixelRatio();      // 1, 2, 3, …
  starMaterial.size = 2 / dpr;               // stays ~2 CSS-px on any screen
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

/**
 * Computes the apparent RA of pdB as seen from pdA (in the ecliptic plane),
 * then returns the 180°–opposite of that angle.
 *
 * @param {object} pdA – planet‐data with .name, .raDisplay (HHhMMmSSs) & .distKm
 * @param {object} pdB – another planet‐data object
 * @returns {number} opposite apparent RA in [0,360)
 * @throws  TypeError / RangeError on invalid input
 */
function apparentRaFromPdA(pdA, pdB) {
  /* ---- 1  RA strings → degrees -------------------------------------- */
  const RA1 = raToDeg(pdA.raDisplay);
  const RA2 = raToDeg(pdB.raDisplay);

  /* ---- 2  distances -------------------------------------------------- */
  const r1 = Number(pdA.distKm);
  const r2 = Number(pdB.distKm);

  if (!Number.isFinite(r1) || r1 < 0) {
    throw new TypeError(`distKm for ${pdA.name} is invalid: ${pdA.distKm}`);
  }
  if (!Number.isFinite(r2) || r2 < 0) {
    throw new TypeError(`distKm for ${pdB.name} is invalid: ${pdB.distKm}`);
  }

  /* ---- 3  positions in XZ plane ------------------------------------- */
  const DEG2RAD = Math.PI / 180;

  const x1 = r1 * Math.cos(RA1 * DEG2RAD);
  const z1 = r1 * Math.sin(RA1 * DEG2RAD);
  const x2 = r2 * Math.cos(RA2 * DEG2RAD);
  const z2 = r2 * Math.sin(RA2 * DEG2RAD);

  /* ---- 4  vector from pdA → pdB ------------------------------------- */
  const dx = x2 - x1;
  const dz = z2 - z1;

  // If the two bodies project to the same ecliptic coordinates,
  // the apparent direction is undefined.
  if (dx === 0 && dz === 0) {
    throw new RangeError(
      `${pdA.name} and ${pdB.name} share identical ecliptic coords`
    );
  }

  /* ---- 5  apparent RA (0° = +X, CCW) -------------------------------- */
  let apar = Math.atan2(dz, dx) / DEG2RAD; // convert rad→deg
  apar = (apar + 360) % 360;

  /* ---- 6  opposite angle -------------------------------------------- */
  const opposite = (apar + 180) % 360;

  // 7) final log
  //console.log(
  //  `${pdB.name} from ${pdA.name} → apparent RA: ${apar.toFixed(4)}°, `,
  //  ` opposite RA: ${opposite.toFixed(4)}°`
  //);
  
  /* ---- 7  final return ---------------------------------------------- */
  return opposite;
}

function updatePerihelion() {
  o["mercuryPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, mercuryPerihelionFromEarth);
  o["venusPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, venusPerihelionFromEarth);
  o["earthPerihelion"] = o.longitudePerihelion;
  o["marsPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, marsPerihelionFromEarth);
  o["jupiterPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, jupiterPerihelionFromEarth);
  o["saturnPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, saturnPerihelionFromEarth);
  o["uranusPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, uranusPerihelionFromEarth);
  o["neptunePerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, neptunePerihelionFromEarth);
};

/**
 * Derive orbital inclination i, ascending node Ω, descending node Ωd,
 * and argument of periapsis ω from the two stored tilt components plus
 * the already-known longitude of perihelion ϖ.
 *
 * @param {object} pd    – planet data with .name, .orbitTilta, .orbitTiltb
 * @param {number} peri  – ϖ, the ecliptic longitude of perihelion [0,360)
 * @returns {{inclination:number, ascending:number,
 *            descending:number, argument:number}}
 */
function orbitalAnglesFromTilts(pd, peri) {
  const ax = pd.orbitTilta;   // degrees
  const az = pd.orbitTiltb;   // degrees

  /* ---- 1  inclination --------------------------------------------- */
  const i = Math.hypot(ax, az);       // √(ax² + az²)

  if (i < 1e-6) {
    // Orbit lies exactly in the ecliptic: nodes & ω are undefined.
    throw new RangeError(`${pd.name}: i ≃ 0°, nodes undefined`);
  }

  /* ---- 2  longitude of the ascending node ------------------------- */
  let Ω = Math.atan2(ax, az) * 180 / Math.PI;   // atan2(sinΩ, cosΩ)
  if (Ω < 0) Ω += 360;

  const Ωd = (Ω + 180) % 360;                   // descending node

  /* ---- 3  argument of periapsis ----------------------------------- */
  let ω = (peri - Ω) % 360;
  if (ω < 0) ω += 360;

  return { inclination: i, ascending: Ω, descending: Ωd, argument: ω };
}

function updateOrbitOrientations() {
  const planets = [
    ["mercury",  mercuryPerihelionFromSun,  o.mercuryPerihelion],
    ["venus",    venusPerihelionFromSun,    o.venusPerihelion],
    ["mars",     marsPerihelionFromSun,     o.marsPerihelion],
    ["jupiter",  jupiterPerihelionFromSun,  o.jupiterPerihelion],
    ["saturn",   saturnPerihelionFromSun,   o.saturnPerihelion],
    ["uranus",   uranusPerihelionFromSun,   o.uranusPerihelion],
    ["neptune",  neptunePerihelionFromSun,  o.neptunePerihelion]
  ];

  for (const [name, pd, peri] of planets) {
    const r = orbitalAnglesFromTilts(pd, peri);

    o[`${name}Inclination`]        = r.inclination;      // (optional)
    o[`${name}AscendingNode`]      = r.ascending;        // Ω
    o[`${name}DescendingNode`]     = r.descending;       // Ω + 180°
    o[`${name}ArgumentOfPeriapsis`] = r.argument;        // ω
  }
}

/**
 * Make a transparent GridHelper that lies exactly in the orbital plane
 * defined by pd.orbitTilta / pd.orbitTiltb and attach it to `parent`.
 *
 * @param {object}           pd           – planet-data object (needs .name,
 *                                          .orbitTilta, .orbitTiltb)
 * @param {THREE.Object3D}   parent       – usually the planet’s orbitContainer
 * @param {number}           size         – overall grid span
 * @param {number} [divs=90]              – grid divisions
 * @returns {THREE.GridHelper}
 */
function addOrbitPlaneHelper(pd, parent, size, divs = 90) {

  /* --- 1  colour picked from a name→hex map ------------------------ */
  const majorCol = planetColorHex[pd.name.toLowerCase()] ?? 0xffffff;
  const minorCol = brighten(majorCol, 0.55);   // a bit lighter

  /* --- 2  build and beautify the grid ------------------------------ */
  const grid = new THREE.GridHelper(size, divs, majorCol, minorCol);

  // visibility tweaks: brighter & always in front of the orbit line
  grid.material.opacity      = 0.65;
  grid.material.transparent  = true;
  grid.material.blending     = THREE.AdditiveBlending;
  grid.material.depthWrite   = false;      // never occlude itself
  grid.renderOrder = -1;                   // draw after solid meshes

  /* --- 3  rotate into orbital plane -------------------------------- */
  const DEG2RAD = Math.PI / 180;
  grid.rotation.x = pd.orbitTilta * DEG2RAD;
  grid.rotation.z = pd.orbitTiltb * DEG2RAD;

  parent.add(grid);
  return grid;
}

/**
 * goldenspiralPerihelionObjects
 * -----------------------------
 * Creates a golden-coloured THREE.Line that dynamically links every perihelion
 * helper that is visible in the camera frustum.
 *
 * @param {...THREE.Object3D} perihelionObjs  The perihelion helpers (must expose pivotObj).
 *        Pass them in the order you want them connected.
 *        👉  The last two arguments **must** be the camera and the scene.
 *
 * @returns {Function} update() – call this once per frame inside your render loop.
 *
 * Usage:
 * const updateLine = goldenspiralPerihelionObjects(
 *     earthPerihelionFromEarth,
 *     venusPerihelionFromEarth,
 *     marsPerihelionFromEarth,
 *     jupiterPerihelionFromEarth,
 *     saturnPerihelionFromEarth,
 *     uranusPerihelionFromEarth,
 *     neptunePerihelionFromEarth,   // 7th object? No problem – pass as many as you like.
 *     camera,
 *     scene
 * );
 *
 * function animate() {
 *   requestAnimationFrame( animate );
 *   updateLine();                   // refresh positions & visibility
 *   renderer.render( scene, camera );
 * }
 */
function goldenspiralPerihelionObjects(...args) {

  /* ---------- 0. unpack parameters ---------------------------------- */
  const camera = args[args.length - 2];
  const scene  = args[args.length - 1];
  const pds    = args.slice(0, -2);

  for (const pd of pds) (pd.planetObj ?? pd).visible = false;
  
  /* ---------- 1. constants ------------------------------------------ */
  const SMOOTH_SEGMENTS   = 32;   // Catmull-Rom samples / segment
  const TUBE_RADIUS       = 0.08; // 0.02-0.06 looks nice
  const TUBE_RADIAL_SEGS  = 24;

  /* ---------- 2. dummy geometry / material -------------------------- */
  const goldenTube = new THREE.Mesh(
    new THREE.BufferGeometry(),                       // placeholder
    new THREE.MeshBasicMaterial({
      color: 0xfff7b3,              // pale–gold – the brighter, the better
      transparent: true,
      opacity: 0.95,                // tiny transparency helps bloom later
      toneMapped: false,            // <-- crucial: bypass tone-mapping curve
      blending: THREE.AdditiveBlending,
      depthWrite: false,             // keeps the glow from killing depth buffer
    })
  );
  goldenTube.visible       = false;   // off by default
  goldenTube.frustumCulled = false;   // never culled
  scene.add(goldenTube);

  /* ---------- 3. updater -------------------------------------------- */
  const world = new THREE.Vector3();
  const ndc   = new THREE.Vector3();
  const visiblePts = [];                    // reused every frame

  function updateGoldenSpiralLine() {

    /* 3-a. gather **all** perihelion helpers ----------------------- */
     visiblePts.length = 0;
     for (const pd of pds) {
       pd.pivotObj.getWorldPosition(world);
       visiblePts.push(world.clone());
     }

    /* 3-b. build Catmull-Rom curve & sample points ------------------ */
    const curve = new THREE.CatmullRomCurve3(visiblePts);
    const curvePts = curve.getPoints(
      (visiblePts.length - 1) * SMOOTH_SEGMENTS
    );

    /* 3-c. ---------- rebuild tube RIGHT HERE ----------------------- */
    if (goldenTube.visible) {                 // skip if user has it hidden
      const oldGeom = goldenTube.geometry;    // dispose afterwards

      const tubeGeom = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(curvePts),
        curvePts.length * 2,                  // tubularSegments
        TUBE_RADIUS,
        TUBE_RADIAL_SEGS,
        false
      );

      goldenTube.geometry = tubeGeom;
      oldGeom.dispose();
    }
  }
 
  /* ---------- NEW utility: flip markers on/off ------------------- */
  function setHelpersVisible(v) {
    for (const pd of pds) (pd.planetObj ?? pd).visible = v;
  }
  
  /* ---------- 4. export -------------------------------------------- */
  return {
    goldenLine: goldenTube,         // public name stays goldenLine for GUI
    update: updateGoldenSpiralLine,
    setHelpersVisible                 // expose the helper toggler
  };
}

/* ------------------------------------------------------------------ */
/*  1.  LAST PERIHELION BEFORE A GIVEN JD                             */
/*      (≈ 1″ accuracy over ±150 000 yr)                              */
/* ------------------------------------------------------------------ */

/**
 * Return the Julian Day of the *last* perihelion preceding `JD`.
 * Uses the *current* sidereal-year length supplied in `o`.
 *
 * @param  {number} JD  – target epoch
 * @return {number} JD  of the most recent perihelion
 */
function lastPerihelionJD(JD) {
  const siderealDays = o.lengthofsiderealYear / o.lengthofDay;   // days
  const cycles       = Math.floor((JD - PERI_ALIGN_JD) / siderealDays);
  return PERI_ALIGN_JD + cycles * siderealDays;
}

/* ------------------------------------------------------------------ */
/*  2.  EQUATION–OF–CENTRE  (series, pre-compressed)                  */
/*      good to < 0.01″ for e ≤ 0.08                                  */
/* ------------------------------------------------------------------ */

/**
 * Fast series for C = ν − M  (rad) up to e⁵.
 * M must be in **radians**.
 */
function equationOfCentre(e, M) {

  const e2 =  e * e;
  const e3 =  e2 * e;
  const e4 =  e2 * e2;
  const e5 =  e4 * e;

  const sinM  = Math.sin(M);
  const sin2M = Math.sin(2*M);
  const sin3M = Math.sin(3*M);
  const sin4M = Math.sin(4*M);
  const sin5M = Math.sin(5*M);

  /* Laskar / Sterne series through e⁵, but written with
     numeric coefficients only – no iterations needed              */
  return (  (2*e      - 0.25*e3      + (5/96)*e5) * sinM
          + (1.25*e2  - (11/24)*e4 ) * sin2M
          + ((13/12)*e3 - (43/64)*e5) * sin3M
          +  (103/96)*e4             * sin4M
          + (1097/960)*e5            * sin5M     );
}

/* ------------------------------------------------------------------ */
/*  3.  MAIN ROUTINE – TRUE SOLAR LONGITUDE                           */
/* ------------------------------------------------------------------ */

/**
 * True ecliptic longitude of the Sun (deg, 0-360) in the **ecliptic of date**.
 *
 * Inputs taken from global `o`:
 *   • o.eccentricityEarth        (unitless, 0.0 … 0.1)
 *   • o.longitudePerihelion      (deg, ecliptic-of-date)
 *   • o.lengthofsiderealYear     (seconds)
 *   • o.lengthofDay              (seconds)
 *
 * The function is kepler-exact, but the mean anomaly is built from a single
 * anchor perihelion (14 Dec 1245) plus the *current* sidereal-year length.
 * Accuracy:  better than 1″ for |JD − current JD| ≲ 50 000 yr provided
 *            you keep `o.*` values self-consistent with that JD.
 *
 * @param  {number} JD  – barycentric dynamical time Julian Day
 * @return {number} λ   – true longitude (deg 0-360)
 */
function solarLongitudeDegLong(JD) {

  /* --- orbital elements for *this* JD ---------------------------- */
  const e     = o.eccentricityEarth;        // current eccentricity
  const omega = wrap360(o.longitudePerihelion);   // deg

  /* mean motion (deg/day) from the *sidereal* year ---------------- */
  const siderealDays = o.lengthofsiderealYear / o.lengthofDay;
  const nDegPerDay   = 360 / siderealDays;

  /* time since the last perihelion preceding JD ------------------- */
  const JDp  = lastPerihelionJD(JD);        // JD of most recent perihelion
  const dt   = JD - JDp;                    // days

  /* mean anomaly --------------------------------------------------- */
  const Mdeg = wrap360(nDegPerDay * dt);    // deg
  const Mrad = Mdeg * DEG;                  // rad

  /* equation of centre (rad) -------------------------------------- */
  const C    = equationOfCentre(e, Mrad);   // rad
  const Cdeg = C / DEG;                     // deg

  /* true longitude ------------------------------------------------- */
  const lambda = wrap360(omega + Mdeg + Cdeg);
  return lambda;
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
  
  predictions.lengthofDay = o.lengthofDay = computeLengthofDay(o.currentYear, balancedYear, perihelionCycleLength, o.perihelionprecessioncycleYear, helionpointAmplitude, meansolardayAmplitudeinSeconds, meanlengthofday);
  
  predictions.lengthofsolarYear = o.lengthofsolarYear = computeLengthofsolarYear(o.currentYear, balancedYear, perihelionCycleLength, o.perihelionprecessioncycleYear, meansolaryearAmplitudeinDays, meansolaryearlengthinDays);
  predictions.lengthofsiderealYear = o.lengthofsiderealYear = computeLengthofsiderealYear(o.currentYear, balancedYear, perihelionCycleLength, o.perihelionprecessioncycleYear, meansiderealyearAmplitudeinSeconds, meansiderealyearlengthinSeconds);
  
  predictions.lengthofsiderealDay = o.lengthofsolarYearSec/(o.lengthofsolarYear+1);
  //predictions.predictedDeltat = o.predictedDeltat = computePredictedDeltat(o.currentYear);
  
  predictions.lengthofsolarYearSec = o.lengthofsolarYearSec = o.lengthofsolarYear*86400;
  predictions.lengthofsiderealYearDays = o.lengthofsiderealYear/86400;
  predictions.lengthofanomalisticYear = computeLengthofanomalisticYear(o.perihelionPrecession, o.lengthofsolarYear); 
  
  predictions.perihelionPrecession = o.perihelionPrecession = o.axialPrecession*13/16;
  predictions.axialPrecession = o.axialPrecession = computeAxialPrecession(o.lengthofsiderealYear, o.lengthofsolarYear);
  predictions.inclinationPrecession = o.inclinationPrecession = o.axialPrecession*13/3;
  predictions.obliquityPrecession = o.obliquityPrecession = o.axialPrecession*13/8;
  predictions.eclipticPrecession = o.eclipticPrecession = o.axialPrecession*13/5;
  
  predictions.lengthofsiderealDayRealLOD = o.lengthofsiderealDayRealLOD = o.lengthofsolarYearSecRealLOD/(o.lengthofsolarYear+1);
  //predictions.predictedDeltat = o.predictedDeltat = computePredictedDeltat(o.currentYear);
  
  predictions.lengthofsolarYearSecRealLOD = o.lengthofsolarYearSecRealLOD = o.lengthofsolarYear*o.lengthofDay;
  predictions.lengthofsiderealYearDaysRealLOD = o.lengthofsiderealYear/o.lengthofDay;
  predictions.lengthofanomalisticYearRealLOD = o.lengthofanomalisticYearRealLOD = computeLengthofanomalisticYearRealLOD(o.perihelionPrecessionRealLOD, o.lengthofsolarYear, o.lengthofDay);
  
  predictions.perihelionPrecessionRealLOD = o.perihelionPrecessionRealLOD = o.axialPrecessionRealLOD*13/16;
  predictions.computeAxialPrecessionRealLOD = o.axialPrecessionRealLOD = computeAxialPrecessionRealLOD(o.lengthofsiderealYear, o.lengthofsolarYear, o.lengthofDay);
  predictions.inclinationPrecessionRealLOD = o.inclinationPrecessionRealLOD = o.axialPrecessionRealLOD*13/3;
  predictions.obliquityPrecessionRealLOD = o.obliquityPrecessionRealLOD = o.axialPrecessionRealLOD*13/8;
  predictions.eclipticPrecessionRealLOD =o.eclipticPrecessionRealLOD = o.axialPrecessionRealLOD*13/5;
  
  predictions.eccentricityEarth = o.eccentricityEarth = computeEccentricityEarth(o.currentYear, balancedYear, perihelionCycleLength, eccentricityMean, eccentricityAmplitude, eccentricitySinusCorrection);
  predictions.obliquityEarth = o.obliquityEarth = computeObliquityEarth(o.currentYear);
  predictions.inclinationEarth = o.inclinationEarth = computeInclinationEarth(o.currentYear, balancedYear, holisticyearLength, earthinclinationMean, tiltandinclinationAmplitude);
  predictions.longitudePerihelion = o.longitudePerihelion = computeLongitudePerihelion(o.currentYear, balancedYear, perihelionCycleLength, o.perihelionprecessioncycleYear, helionpointAmplitude, mideccentricitypointAmplitude);
  
  predictions.longitudePerihelionDatePer = o.longitudePerihelionDatePer = longitudeToDateTime((o.longitudePerihelion-180), o.currentYear)
  predictions.longitudePerihelionDateAp = o.longitudePerihelionDateAp = longitudeToDateTime(o.longitudePerihelion, o.currentYear)
  
  predictions.lengthofAU = o.lengthofAU = (o.lengthofsiderealYear/60/60 * speedofSuninKM) / (2 * Math.PI);
  //predictions.anomalisticMercury = o.anomalisticMercury = computeAnomalisticMercury(o.currentYear);

}

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
 * Compute the length of the anomalistic year (in seconds) with Real LOD.
 *
 * @param {number} perihelionPrecession – the perihelion precession value
 * @param {number} lengthofsolarYear    – the length of the solar year (in days)
 * @returns {number} lengthofanomalisticYearRealLOD (in seconds)
 */
function computeLengthofanomalisticYearRealLOD(
  perihelionPrecession,
  lengthofsolarYear,
  lengthofDay
  ) {
  return ((perihelionPrecession * lengthofsolarYear) /
          (perihelionPrecession - 1)) * lengthofDay;
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
 * Compute the axial precession with Real LOD.
 *
 * @param {number} lengthofsiderealYear – the length of the sidereal year (in seconds)
 * @param {number} lengthofsolarYear    – the length of the solar year (in days)
 * @param {number} lengthofDay          – number of seconds in one solar day (e.g. 86400)
 * @returns {number} axialPrecession
 */
function computeAxialPrecessionRealLOD(
  lengthofsiderealYear,
  lengthofsolarYear,
  lengthofDay
  ) {
  return lengthofsiderealYear /
         (lengthofsiderealYear - (lengthofsolarYear * lengthofDay));
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

  pd.a = semiMajor;      // store semi-major axis
  pd.b = semiMinor;      // store semi-minor axis
  
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
  
  pd.orbitPlaneHelper = addOrbitPlaneHelper(pd, orbitContainer, o.starDistance * 2);
  pd.orbitPlaneHelper.visible = false;          // start hidden

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

function solarLongitudeDegMeeusLimited(JD) {
  const Y = 2000 + (JD - 2451545.0) / 365.2422;   // civil year estimate
  if (Y < -4000 || Y > 4000) {
    return null;                                  // ← outside validity
  }
  return solarLongitudeDeg(JD);                   // ← your old routine
}

/* -----------------------------------------------------------------
   Ecliptic longitude ➜ calendar date *with time*  (±1 s accuracy)
   – uses the dateTimeToJulianDay() + dayToDateNew()
   – ONLY valid for roughly 1000 AD … 2500 AD (But according to Theory from 4000 BC to 4000 AD)
------------------------------------------------------------------ */

/* Meeus – Sun’s true longitude  ---------------------------------- */
function solarLongitudeDeg(JD){
  const T  = (JD - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983*T + 0.0003032*T*T;
  const M  = 357.52911 + 35999.05029*T - 0.0001537*T*T;
  const C  = (1.914602 - 0.004817*T - 0.000014*T*T)*Math.sin(M*DEG) +
             (0.019993 - 0.000101*T)*Math.sin(2*M*DEG) +
              0.000289*Math.sin(3*M*DEG);
  return (L0 + C) % 360;
}

/**
 * Convert an ecliptic longitude to an exact civil date-time.
 *
 * @param {number} lonDeg        – true solar longitude (deg, any real number)
 * @param {number} [currentYear] – civil year; may be fractional (e.g. 2025.37)
 *                                 If omitted or non-finite, the function
 *                                 uses Math.floor(o.currentYear) when that
 *                                 is finite, otherwise the computer’s UTC year.
 * @returns {string}  "YYYY-MM-DD hh:mm:ss"
 */
function longitudeToDateTime(lonDeg, currentYear) {

  /* 1 — validate & normalise longitude --------------------------------- */
  lonDeg = Number(lonDeg);
  if (!Number.isFinite(lonDeg)) {
    throw new TypeError(
      `longitudeToDateTime: first argument must be a finite number, got ${lonDeg}`
    );
  }
  lonDeg = ((lonDeg % 360) + 360) % 360;      // wrap −∞…∞ → 0–360

  /* 2 — decide which civil year to use --------------------------------- */
  let yr = Number.isFinite(currentYear)
           ? Math.floor(currentYear)
           : (Number.isFinite(o.currentYear)
                ? Math.floor(o.currentYear)
                : new Date().getUTCFullYear());

  /* 3 — crude day-of-year guess (linear anchors) ----------------------- */
  const anchorLon = [  0,  90, 180, 270, 360];
  const anchorDOY = [ 79, 172, 266, 355, 444];   // mean dates in non-leap year
  let i = 0;
  while (lonDeg >= anchorLon[i + 1]) i++;
  const f   = (lonDeg - anchorLon[i]) / 90;
  const doy = anchorDOY[i] + f * (anchorDOY[i + 1] - anchorDOY[i]);

  /* 4 — JD at 00:00 UTC, 1 Jan of chosen year -------------------------- */
  let JD = dateTimeToJulianDay(`${yr}-01-01`, '00:00:00') + doy;

  /* 5 — Newton iterations to refine JD to the exact longitude ---------- */
  const dλdT = 0.98564736;                     // mean solar motion °/day
  for (let k = 0; k < 8; k++) {
    const λ = solarLongitudeDeg(JD);
    if (λ === null) return "no formula";
    const diff = ((λ - lonDeg + 540) % 360) - 180;   // signed −180…+180
    if (Math.abs(diff) < 1e-8) break;                // ~0.00001 °
    JD -= diff / dλdT;
  }

  /* 6 — JD → calendar date-time via your helper ------------------------ */
  const { date, time } = dayToDateNew(
    JD,
    'julianday',
    'julian-gregorian-calendar'
  );

  return `${date} ${time}`;
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

/**
 * raToDeg                                           v2 · MIT
 * ---------------------------------------------------------
 * Convert Right Ascension → ecliptic longitude (degrees)
 *
 * Accepts …
 *   •  "12h34m56.7s"
 *   •  "12:34:56.7"
 *   •  "12 34 56.7"
 *   •  "12.5824h"           (decimal hours)
 *   •  12.5824             ← number ⇒ decimal hours
 *   •  "189.785°" / "189.785 deg"
 *   •  189.785              ← number ≥ 24 ⇒ degrees
 *
 * Throws TypeError on anything it can’t parse.
 * Always returns a finite number 0 ≤ λ < 360
 */
function raToDeg(ra) {
  /* 0 — blank & NaN guards -------------------------------------------- */
  if (ra == null || (typeof ra === 'string' && !ra.trim())) {
    throw new TypeError('raToDeg: value is blank or nullish');
  }

  /* 1 — purely numeric input ------------------------------------------ */
  if (typeof ra === 'number') {
    if (!Number.isFinite(ra)) {
      throw new TypeError(`raToDeg: number is not finite: ${ra}`);
    }
    // 0–24  ⇒ hours,  others ⇒ degrees
    return ((ra < 24 ? ra * 15 : ra) % 360 + 360) % 360;
  }

  /* 2 — normalise string ---------------------------------------------- */
  const s = ra.trim().toLowerCase();

  /* 2a — explicit degree string (“deg” or “°”) ------------------------ */
  if (/[°d]/.test(s)) {
    const deg = parseFloat(s.replace(/[^\d.+-eE]/g, ''));
    if (!Number.isFinite(deg)) {
      throw new TypeError(`raToDeg: cannot parse degree string: "${ra}"`);
    }
    return ((deg % 360) + 360) % 360;
  }

  /* 2b — split into [h, m, s] ----------------------------------------- */
  const parts = s
    .replace(/[hms]/g, ' ')
    .replace(/:/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);

  if (parts.some(n => !Number.isFinite(n))) {
    throw new TypeError(`raToDeg: cannot parse RA string: "${ra}"`);
  }

  const [h, m = 0, sec = 0] = parts;

  /* Accept decimal-hour forms like "12.345" or "12.345h" -------------- */
  if (parts.length === 1) {
    if (h < 0) throw new RangeError(`raToDeg: negative hour value: "${ra}"`);
    return ((h * 15) % 360 + 360) % 360;
  }

  /* ---- validation (only negatives are forbidden) -------------------- */
  if (h < 0 || m < 0 || sec < 0) {
    throw new RangeError(`raToDeg: negative H M S value: "${ra}"`);
  }

  /* ---- convert, allowing overflow ----------------------------------- */
  const totalHours = h + m / 60 + sec / 3600;   // 60 s ⇒ +1 min, 60 min ⇒ +1 h
  return ((totalHours * 15) % 360 + 360) % 360; // wrap to 0–360°
}

// === Utilities ===
/** return a colour brightened toward white by `f` (0–1) */
function brighten(hex, f = 0.5) {
  const r = ((hex >> 16) & 0xff) + f * (0xff - ((hex >> 16) & 0xff));
  const g = ((hex >>  8) & 0xff) + f * (0xff - ((hex >>  8) & 0xff));
  const b = ( hex        & 0xff) + f * (0xff - ( hex        & 0xff));
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function addInfoButton ( ctrl, url ) {
  const labelEl =
        ctrl.$name ||                                        // lil-gui
        ( ctrl.domElement &&                                 // dat.gui ≥0.7
          ctrl.domElement.querySelector('.property-name') ) ||
        ( ctrl.__li &&
          ctrl.__li.querySelector('.property-name') );

  if ( !labelEl || labelEl.querySelector('.gui-info') ) return;

  const a = document.createElement('a');
  a.className     = 'gui-info';
  a.href          = url;
  a.target        = '_blank';
  a.rel           = 'noopener';
  a.title         = 'Background information';
  a.textContent   = ' ⓘ';                  // NBSP + circled-I
  a.style.cssText = 'margin-left:4px; text-decoration:none; ' +
                    'cursor:pointer; user-select:none; font-weight:600;';

  labelEl.appendChild( a );
}

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
// TO BE MIGRATED?
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