import * as THREE        from 'three';
import Stats             from 'three/examples/jsm/libs/stats.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as dat from 'dat.gui';

/*This software is licensed under the GNU General Public License (GPL-3.0). For more information, visit <https://www.gnu.org/licenses/>.

The Interactive 3D Solar System Simulation shows the precession / eccentricity / inclination / obliquity / perihelion date movements of Earth, Moon, Sun and Planets modelled from a geo-heliocentric frame of reference, coming together in a Holistic-Year cycle of 298,176 years, an Axial precession cycle of ~22,937 years, an Inclination precession cycle of 99,392 years and a Perihelion precession cycle of 18,636 years.

Earths solar system movements and observations for length of day/year can be exactly simulated by tuning ~20 parameters. Additionally with ~10 parameters per planet/moon our complete solar system appears.

For more information, see https://holisticuniverse.com */

//*************************************************************
// ALL INPUT CONSTANTS
//*************************************************************
const holisticyearLength = 298176;
// Input Length of Holistic-Year in Years
const perihelionalignmentYear = 1246;
// Last YEAR longitude of perihelion aligned with solstice (according to J. Meeus around 1246 AD)
const perihelionalignmentJD = 2176142;
// Last YEAR longitude of perihelion aligned with solstice (according to J. Meeus around 1246 AD) in Juliandate
const lengthsolaryearindaysin1246 = 31556929.19/86399.9913;
// Reference length of solar year in days in 1246 AD according to formula  J. Laskar + predicted LOD due to historic Delta-T values = ~MEAN
const meansiderealyearlengthinSeconds = 31558149.6846777;
// Reference length of sidereal year in seconds in 1246 AD according to EPOCH document = MEAN
const startmodelJD = 2451716.5;
// By default the model is pointing to the June Solstice in year 2000. Value in Juliandate and dates need to start at 00:00 (so only julianday with values of 0.5). IF YOU CHANGE THIS VALUE, ALSO OTHER VALUES NEED TO CHANGE.
const startmodelYear = 2000.5;
// By default the model is pointing to the June Solstice in year 2000. IF YOU CHANGE THIS VALUE, ALSO OTHER VALUES NEED TO CHANGE.
const whichSolsticeOrEquinox = 1;
// By default the model is pointing to the June Solstice (=1). Possible values: 0 = March Equinox, 1 = June Solstice, 2 = September Equinox, 3= December Solstice. IF YOU CHANGE THIS VALUE, ALSO OTHER VALUES NEED TO CHANGE.
const correctionDays = -0.294993564486504;
// Small correction in days because the startmodel on 21 june 00:00 UTC is not exactly aligned with Solstice + to make sure the juliandate is with exact rounded numbers in the Balanced year
const correctionSun = 0.28;
// Small correction in degrees because the startmodel on 21 june 00:00 UTC is not exactly aligned with Solstice but needs to be around 01:47 UTC See https://www.timeanddate.com/calendar/seasons.html?year=2000&n=1440.
const temperatureGraphMostLikely = 14.5;                  
// 3D model = Choose from 0 to 16, with steps of 0.5 where we are in our obliquity cycle (so 32 options). If you change this value, also the earthRAAngle value will change and depending if you make it an whole or a half value you need to make tiltandinclinationAmplitude negative/positive. Value 14.5 means in 1246 we were 14.5/16 * holistic year length on our journey calculated from the balanced year so - relatively - almost nearing a new balanced year.
const earthRAAngle = 1.12;                                
// 3D model = the only value which is very hard to derive. Determined by temperatureGraphMostLikely, earthtiltMean & tiltandinclinationAmplitude values.
const earthtiltMean = 23.42723;                           // 3D model + formula
const tiltandinclinationAmplitude = 0.564;                // 3D model + formula
const earthinclinationMean = 1.49514053;                  // Formula only
const eccentricityMean = 0.01370018;                      // 3D model + formula = aligned needs to be 102.9553 on startdate 2000-06-21 in order 2000-01-01 was ~102.947
const eccentricityAmplitude = 0.00308211;                 // 3D model + formula = aligned needs to be 102.9553 on startdate 2000-06-21 in order 2000-01-01 was ~102.947
const eccentricitySinusCorrection = 0.652;                // Formula only
const mideccentricitypointAmplitude = 2.461586;           // Formula only
const helionpointAmplitude = 11.2153826318;               // Formula only
const meansiderealyearAmplitudeinSeconds = 0.2960802;     // Formula only
const meansolardayAmplitudeinSeconds = 0.270111704;       // Formula only 
const meansolaryearAmplitudeinDays = 0.0003806795;        // Formula only
const meansolaryearAmplitude = 2.575;                     // Formula only
const currentAUDistance = 149597870.698828;               // 3D model + formula
const speedofSuninKM = 107225.047767317;                  // Formula only
const speedOfLight = 299792.458;                          // Speed of light in km/s (fundamental constant)
const deltaTStart = 63.63;                                // Formula only ; usage in delta-T is commented out by default (see render loop)
const startAngleModel = 89.91949879;                      // The startdate of the model is set to 21 june 2000 00:00 UTC which is just before it reaches 90 degrees which is at 01:47 UTC (89.91949879)
const earthPerihelionEclipticYears = holisticyearLength/3;// Duration of Earth's orbital plane precession ~99,392 years against ICRF
const inclinationPathZodiacOffsetDeg = 7;                 // Visual calibration offset for inclination path alignment with zodiac. Shifts the path 7° counterclockwise so lowest inclination appears in early Libra

// Debg button on flag (set to true when needed)
const debugOn = false;

// Reference lengths used as INPUT for the Sun
const sunTilt = 7.155;
const milkywayDistance = 27500;
const sunSpeed = 828000;
const greatattractorDistance = 200000000;
const milkywaySpeed = 2160000;

// Reference lengths used as INPUT for the Moon
const moonSiderealMonthInput = 27.32166156;
const moonAnomalisticMonthInput = 27.55454988;
const moonNodalMonthInput = 27.21222082;
const moonDistance = 384399.07;
const moonAtApogee = 405400;                    // km - Moon's apogee distance
const moonOrbitalInclination = 5.1453964;
const moonOrbitalEccentricity = 0.054900489;
const moonTilt = 6.687;
const moonStartposApsidal = 330;             // Aligned with stellarium data.
const moonStartposNodal = 64;                // Aligned to major lunar standstill and minor lunar standstill
const moonStartposMoon = 132.105;            // Needs to be at ~21h09m57s if start model is 2451716.5

// Reference lengths used as INPUT for Mercury
const mercurySolarYearInput = 87.96877;
const mercuryOrbitalInclination =  7.00501638;
const mercuryOrbitalEccentricity = 0.20562928;
const mercuryInclination = 6.3472858;
const mercuryTilt = 0.03;
const mercuryLongitudePerihelion = 77.4569131;
const mercuryAscendingNode = 48.33033155;
const mercuryMeanAnomaly = 156.6364301;
const mercuryTrueAnomaly = 164.1669319;
const mercuryAngleCorrection = 0.984431;     // To align the perihelion exactly. According to formula ~77.4569131
const mercuryPerihelionEclipticYears = 243455.906064; // Duration of perihelion precession to explain ~570 arcseconds per century
const mercuryStartpos = 86.25;               // Needs to be at ~7h24m46.43 if start model is 2451716.5

// Reference lengths used as INPUT for Venus
const venusSolarYearInput = 224.6958;
const venusOrbitalInclination = 3.3946018;
const venusOrbitalEccentricity = 0.00674819;
const venusInclination = 2.1545441;
const venusTilt = 2.6392;
const venusLongitudePerihelion = 131.5765919;
const venusAscendingNode = 76.67877109;
const venusMeanAnomaly = 324.9668371;
const venusTrueAnomaly = 324.5198504;
const venusAngleCorrection = -2.78364;       // To align the perihelion exactly. According to formula ~131.5765919
const venusPerihelionEclipticYears = holisticyearLength*20000000; // Duration of perihelion precession to explain ~200 arcseconds per century
const venusStartpos = 249.68;                // Needs to be at ~6h11m08.61 if start model is 2451716.5 (34.715?)

// Reference lengths used as INPUT for Mars
const marsSolarYearInput = 686.942;
const marsOrbitalInclination = 1.84971028;
const marsOrbitalEccentricity = 0.09344726;
const marsInclination = 1.6311858;
const marsTilt = 25.19;
const marsLongitudePerihelion = 336.0650681;
const marsAscendingNode = 49.55737662;
const marsMeanAnomaly = 109.2630844;
const marsTrueAnomaly = 118.9501056;
const marsAngleCorrection = -2.10526;        // To align the perihelion exactly. According to formula ~336.0650681
const marsPerihelionEclipticYears = holisticyearLength/4; // Duration of perihelion precession to explain ~1700 arcseconds per century
const marsStartpos = 121.514;                // Needs to be at ~6h13m09.72 if start model is 2451716.5

// Reference lengths used as INPUT for Jupiter
const jupiterSolarYearInput = 4330.595;
const jupiterOrbitalInclination = 1.30450732;
const jupiterOrbitalEccentricity = 0.04966799;
const jupiterInclination = 0.3219652;
const jupiterTilt = 3.13;
const jupiterLongitudePerihelion = 14.70659401;
const jupiterAscendingNode = 100.4877868;
const jupiterMeanAnomaly = 32.47179744;
const jupiterTrueAnomaly = 35.69428061;
const jupiterAngleCorrection = 1.1019;       // To align the perihelion exactly. According to formula ~14.70659401
const jupiterPerihelionEclipticYears = holisticyearLength; // Duration of perihelion precession to explain ~400 arcseconds per century
const jupiterStartpos = 13.79;               // Needs to be at ~3h43m48.25 if start model is 2451716.5

// Reference lengths used as INPUT for Saturn
const saturnSolarYearInput = 10744.6;
const saturnOrbitalInclination = 2.4853834;
const saturnOrbitalEccentricity = 0.0564781;
const saturnInclination = 0.9254704;
const saturnTilt = 26.73;
const saturnLongitudePerihelion = 92.12794343;
const saturnAscendingNode = 113.6452856;
const saturnMeanAnomaly = 325.663876;
const saturnTrueAnomaly = 321.7910116;
const saturnAngleCorrection = -0.175456;     // To align the perihelion exactly. According to formula ~92.12794343
const saturnPerihelionEclipticYears = -holisticyearLength; // Duration of perihelion precession to explain ~-400 arcseconds per century
const saturnStartpos = 11.344;               // Needs to be at ~3h34m49.4 if start model is 2451716.5

// Reference lengths used as INPUT for Uranus
const uranusSolarYearInput = 30589;
const uranusOrbitalInclination = 0.77234317;
const uranusOrbitalEccentricity = 0.04519611;
const uranusInclination = 0.9946692;
const uranusTilt = 82.23;
const uranusLongitudePerihelion = 170.7308251;
const uranusAscendingNode = 73.98118815;
const uranusMeanAnomaly = 145.7292678;
const uranusTrueAnomaly = 148.5142459;
const uranusAngleCorrection = -0.77209;      // To align the perihelion exactly. According to formula ~170.7308251
const uranusPerihelionEclipticYears = holisticyearLength/3; // Duration of perihelion precession to explain ~1200 arcseconds per century
const uranusStartpos = 44.676;               // Needs to be at ~21h32m43.04 if start model is 2451716.5

// Reference lengths used as INPUT for Neptune
const neptuneSolarYearInput = 59926;
const neptuneOrbitalInclination = 1.768273;
const neptuneOrbitalEccentricity = 0.009457;
const neptuneInclination = 0.7354155;
const neptuneTilt = 28.32;
const neptuneLongitudePerihelion = 45.80124471;
const neptuneAscendingNode = 131.7853754;
const neptuneMeanAnomaly = 262.5003424;
const neptuneTrueAnomaly = 261.2242728;
const neptuneAngleCorrection = 2.406717;     // To align the perihelion exactly. According to formula ~45.80124471
const neptunePerihelionEclipticYears = -holisticyearLength; // Duration of perihelion precession to explain ~-400 arcseconds per century
const neptuneStartpos = 47.917;              // Needs to be at ~20h33m40.34 if start model is 2451716.5

//*************************************************************
// The accurate orbits of Pluto and Halleys and Eros can be added later. They are switched off via the visibility flag.
//*************************************************************

// Reference lengths used as INPUT for Pluto
const plutoSolarYearInput = 89760;
const plutoOrbitalInclination = 17.14175;
const plutoOrbitalEccentricity = 0.24880766;
const plutoInclination = 15.5639473;  // Adjusted from 15.5541473 for J2000 apparent inclination match
const plutoTilt = 57.47;
const plutoLongitudePerihelion = 224.06676;
const plutoAscendingNode = 110.30347;
const plutoMeanAnomaly = 15.83341625;
const plutoTrueAnomaly = 26.51719941;
const plutoAngleCorrection = 2.468;          // To align the perihelion exactly. According to formula ~224.06676
const plutoPerihelionEclipticYears = holisticyearLength; // Duration of perihelion precession to explain TODO arcseconds per century
const plutoStartpos = 71.555;                // Needs to be at ~16h44m12.72 if start model is 2451716.5

// Reference lengths used as INPUT for Halleys
const halleysSolarYearInput = 27618;
const halleysOrbitalInclination = 162.192203847561;
const halleysOrbitalEccentricity = 0.9679427911271;
const halleysInclination = 0.7354155;
const halleysTilt = 0;
const halleysLongitudePerihelion = 172.033036745069;
const halleysAscendingNode = 59.5607834844014;
const halleysMeanAnomaly = 13;               // TODO
const halleysTrueAnomaly = 13;               // TODO
const halleysAngleCorrection = -0.701;       // To align the perihelion exactly. According to formula ~172.03304
const halleysPerihelionEclipticYears = holisticyearLength; // Duration of perihelion precession to explain TODO arcseconds per century
const halleysStartpos = 80;                  // Needs to be at ~08h43m12.79 if start model is 2451716.5

// Reference lengths used as INPUT for Eros
const erosSolarYearInput = 643.22295;
const erosOrbitalInclination = 10.8290328658513;
const erosOrbitalEccentricity = 0.222807894458402;
const erosInclination = 10.8290328658513;
const erosTilt = 0;
const erosLongitudePerihelion = 123.054362100533;
const erosAscendingNode = 304.411578580454;
const erosMeanAnomaly = 153.67797646;
const erosTrueAnomaly = 162.69081884;
const erosAngleCorrection = -2.202;          // To align the perihelion exactly. According to formula ~123.05436
const erosPerihelionEclipticYears = holisticyearLength; // Duration of perihelion precession to explain TODO arcseconds per century
const erosStartpos = 57.402;                 // Needs to be at ~20h38m24.47 if start model is 2451716.5

// Ascending nodes on invariable plane (from Souami & Souchay 2012, Table 9)
// These are DIFFERENT from <planet>AscendingNode which is on the ecliptic!
// Units: degrees at J2000.0 epoch
const earthAscendingNodeInvPlaneSouamiSouchay = 284.51;   // Precesses with period holisticyearLength/3 against ICRF which is holisticyearLength/5 against ecliptic
const mercuryAscendingNodeInvPlaneSouamiSouchay = 32.22;
const venusAscendingNodeInvPlaneSouamiSouchay = 52.31;
const marsAscendingNodeInvPlaneSouamiSouchay = 352.95;
const jupiterAscendingNodeInvPlaneSouamiSouchay = 306.92;
const saturnAscendingNodeInvPlaneSouamiSouchay = 122.27;
const uranusAscendingNodeInvPlaneSouamiSouchay = 308.44;
const neptuneAscendingNodeInvPlaneSouamiSouchay = 189.28;
const plutoAscendingNodeInvPlaneSouamiSouchay = 107.06;
// TODO: Halley's and Eros invariable plane data are approximations (not from Souami & Souchay 2012)
// Using ecliptic ascending node as placeholder - should be calculated from orbital elements
const halleysAscendingNodeInvPlaneSouamiSouchay = 59.56;  // Approximation from ecliptic value
const erosAscendingNodeInvPlaneSouamiSouchay = 304.41;    // Approximation from ecliptic value

// J2000-verified ascending nodes - optimized to reproduce exact J2000 apparent inclinations
// These use the existing <planet>Inclination values (Souami & Souchay 2012) and only adjust ascending nodes
// Calibrated with earthAscendingNodeInvPlaneVerified = 284.492° and o.inclinationEarth = 1.578° at J2000
// Result: All planets match J2000 OrbitalInclination values with error < 0.0001°
const earthAscendingNodeInvPlaneVerified = 284.492;   // Adjusted from S&S 284.51°
const mercuryAscendingNodeInvPlaneVerified = 32.8118;   // was 32.22, Δ = +0.61° (from S&S)
const venusAscendingNodeInvPlaneVerified = 54.68;     // was 52.31, Δ = +2.41° (from S&S)
const marsAscendingNodeInvPlaneVerified = 354.853;     // was 352.95, Δ = +1.92° (from S&S)
const jupiterAscendingNodeInvPlaneVerified = 312.9;  // was 306.92, Δ = +6.19° (from S&S)
const saturnAscendingNodeInvPlaneVerified = 119.04;   // was 122.27, Δ = -3.50° (from S&S)
const uranusAscendingNodeInvPlaneVerified = 307.76;   // was 308.44, Δ = -0.64° (from S&S)
const neptuneAscendingNodeInvPlaneVerified = 192.175;  // was 189.28, Δ = +2.84° (from S&S)
const plutoAscendingNodeInvPlaneVerified = 105.44;    // was 107.06, Δ = -1.62° (from S&S)
const halleysAscendingNodeInvPlaneVerified = 59.56;   // No solution - retrograde orbit
const erosAscendingNodeInvPlaneVerified = 10.36;      // was 10.58, Δ = -0.22° (from S&S)

// Really fixed values
const diameters = {
  sunDiameter      : 1392684.00,
  moonDiameter     : 3474.8,
  earthDiameter    : 12756.27,
  mercuryDiameter  : 4879.40,
  venusDiameter    : 12103.60,
  marsDiameter     : 6779,
  jupiterDiameter  : 139822,
  saturnDiameter   : 116464,
  uranusDiameter   : 50724,
  neptuneDiameter  : 49244,
  plutoDiameter    : 2376.6,
  halleysDiameter  : 11,
  erosDiameter     : 16.84,
};

//*************************************************************
// ALL CONSTANTS ARE CALCULATED FROM HERE ONWARDS
//*************************************************************

const perihelionCycleLength = holisticyearLength / 16;
const meansolaryearlengthinDays = Math.round(lengthsolaryearindaysin1246 * (holisticyearLength / 16)) / (holisticyearLength / 16);
const meanearthRotationsinDays = meansolaryearlengthinDays+1;
const startmodelyearwithCorrection = startmodelYear+(correctionDays/meansolaryearlengthinDays);
const balancedYear = perihelionalignmentYear-(temperatureGraphMostLikely*(holisticyearLength/16));
const balancedJD = startmodelJD-(meansolaryearlengthinDays*(startmodelyearwithCorrection-balancedYear));
const meansiderealyearlengthinDays = meansolaryearlengthinDays *(holisticyearLength/13)/((holisticyearLength/13)-1);
const meanlengthofday = meansiderealyearlengthinSeconds/meansiderealyearlengthinDays;
const meanSiderealday = (meansolaryearlengthinDays/(meansolaryearlengthinDays+1))*meanlengthofday;
const meanStellarday = ((meansiderealyearlengthinSeconds-(meansolaryearlengthinDays*meanlengthofday))/(1/eccentricityAmplitude/13*16))/(meansolaryearlengthinDays+1)+meanSiderealday;
const meanAnomalisticYearinDays = ((meansolaryearlengthinDays)/(perihelionCycleLength-1))+meansolaryearlengthinDays;

//sDAY IS USED IN 3D MODEL CALCULATIONS 
const sDay = 1/meansolaryearlengthinDays;
const sYear = sDay*365;
const sMonth = sDay*30;
const sWeek = sDay*7;
const sHour = sDay/24;
const sMinute = sHour/60;
const sSecond = sMinute/60;

const lightYear = speedOfLight*meanlengthofday*meansolaryearlengthinDays;
const sunOrbitPeriod = (lightYear*milkywayDistance*Math.PI*2)/(sunSpeed/60/60*meanlengthofday*meansolaryearlengthinDays);
const milkywayOrbitPeriod = (lightYear*greatattractorDistance*Math.PI*2)/(milkywaySpeed/60/60*meanlengthofday*meansolaryearlengthinDays);

// Moon calculations
const moonSiderealMonth = (holisticyearLength*meansolaryearlengthinDays)/Math.ceil(((holisticyearLength*meansolaryearlengthinDays)/moonSiderealMonthInput)-0);
// You can tweak the last number +/-1 (See Moon characteristics)
const moonAnomalisticMonth = (holisticyearLength*meansolaryearlengthinDays)/Math.ceil(((holisticyearLength*meansolaryearlengthinDays)/moonAnomalisticMonthInput)-1);
// You can tweak the last number +/-1 (See Moon characteristics)
const moonNodalMonth = (holisticyearLength*meansolaryearlengthinDays)/Math.ceil(((holisticyearLength*meansolaryearlengthinDays)/moonNodalMonthInput)-0);
// You can tweak the last number +/-1 (See Moon characteristics)

const moonSynodicMonth = (holisticyearLength*meansolaryearlengthinDays)/(Math.ceil(((holisticyearLength*meansolaryearlengthinDays)/moonSiderealMonthInput)-1)+13-holisticyearLength);
const moonTropicalMonth = (holisticyearLength*meansolaryearlengthinDays)/(Math.ceil(((holisticyearLength*meansolaryearlengthinDays)/moonSiderealMonthInput)-1)+13);
const moonFullMoonCycleEarth = (moonSynodicMonth/(moonSynodicMonth-moonAnomalisticMonth))*moonAnomalisticMonth;
const moonFullMoonCycleICRF = (holisticyearLength*meansolaryearlengthinDays)/(((holisticyearLength*meansolaryearlengthinDays)/moonFullMoonCycleEarth)+13);
const moonNodalPrecessionindaysEarth = (moonSiderealMonth/(moonSiderealMonth-moonNodalMonth))*moonNodalMonth;
const moonNodalPrecessionindaysICRF = (holisticyearLength*meansolaryearlengthinDays)/(((holisticyearLength*meansolaryearlengthinDays)/moonNodalPrecessionindaysEarth)-13);
const moonApsidalPrecessionindaysEarth = (1/((moonAnomalisticMonth/moonSiderealMonth)-1))*moonAnomalisticMonth;
const moonApsidalPrecessionindaysICRF = (holisticyearLength*meansolaryearlengthinDays)/(((holisticyearLength*meansolaryearlengthinDays)/moonApsidalPrecessionindaysEarth)+13);
const moonApsidalMeetsNodalindays = ((moonNodalMonth/(moonAnomalisticMonth-moonNodalMonth))*moonAnomalisticMonth);
const moonRoyerCycleindays = (moonNodalPrecessionindaysEarth/(moonNodalPrecessionindaysEarth-moonApsidalPrecessionindaysEarth)*(moonApsidalPrecessionindaysEarth/meansolaryearlengthinDays))*meansolaryearlengthinDays;
const moonDraconicYearICRF = 1/((1/meansolaryearlengthinDays)+(1/moonNodalPrecessionindaysEarth));
const moonDraconicYearEarth = (holisticyearLength*meansolaryearlengthinDays)/(((holisticyearLength*meansolaryearlengthinDays)/moonDraconicYearICRF)-13);
const moonSpeed = (moonDistance*Math.PI*2)/(meansolaryearlengthinDays*(1/(meansolaryearlengthinDays/moonSiderealMonth)))/24;

// Mean AU distance derived from mean sidereal year and mean orbital speed
// meanAU = (P_seconds / 3600 * v_km/h) / (2π) = orbital circumference / 2π
const meanAUDistance = (meansiderealyearlengthinSeconds / 60 / 60 * speedofSuninKM) / (2 * Math.PI);
// Result: 149,597,870.345632 km

// Gravitational parameter of the Sun (derived from Kepler's 3rd Law)
// GM = (2π)² × a³ / P² where a = mean AU in km, P = mean sidereal year in seconds
// The 0.029% difference represents the inherent limitation of deriving GM_SUN from Kepler's law in a multi-body Solar System. Kepler's law assumes a perfect two-body system. The real Solar System is an N-body problem.
const GM_SUN = (4 * Math.PI * Math.PI * Math.pow(meanAUDistance, 3)) / Math.pow(meansiderealyearlengthinSeconds, 2);
// Result: ~1.32712 × 10¹¹ km³/s²

// Gravitational constant (km³/(kg·s²))
const G_CONSTANT = 6.6743e-20;  // 6.6743 × 10⁻¹¹ m³/(kg·s²) converted to km³/(kg·s²)

// Sun's mass derived from gravitational parameter (kg)
// M_SUN = GM_SUN / G ≈ 1.989 × 10³⁰ kg
const M_SUN = GM_SUN / G_CONSTANT;

// Earth-Moon mass ratio ≈ 81.30
// Earth is 81.3 times more massive than Moon
// TODO: Derive from orbital geometry relationship
const MASS_RATIO_EARTH_MOON = 81.3007;

// Earth+Moon system gravitational parameter from Moon's orbit (km³/s²)
// GM_system = (2π)² × a³ / P² - this gives G(M_Earth + M_Moon)
const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistance, 3)) / Math.pow(moonSiderealMonth * meanlengthofday, 2);

// Solar perturbation correction factor using Moon's apogee ratio to AU
// The 1/(1 - moonApogee/AU) factor ≈ 1.00271 corrects for solar perturbation effects:
// - Kepler's law applied to Moon's orbit uses observed distance/period which include solar effects
// - At apogee, Moon is closest to Earth's Hill sphere edge, maximizing solar influence
// - The quadrupole solar perturbation (~5.6×10⁻³) scales with orbital size ratio. https://farside.ph.utexas.edu/teaching/celestial/Celestial/node100.html
// - This represents the "effective radius" reconciling Kepler-derived with measured GM values

// Earth's gravitational parameter (corrected for Moon's mass and solar perturbation)
// GM_Earth = GM_system × (ratio / (ratio + 1)) / (1 - moonApogee/AU)
const GM_EARTH = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1)) / (1 - moonAtApogee / meanAUDistance);
// Result: ~398,600 km³/s² (matches JPL value)

// Earth's mass derived from gravitational parameter (kg)
// M_EARTH = GM_EARTH / G ≈ 5.97 × 10²⁴ kg
const M_EARTH = GM_EARTH / G_CONSTANT;

// Moon's gravitational parameter (km³/s²)
// GM_Moon = GM_system / (ratio + 1) with same solar perturbation correction
// The entire GM_EARTH_MOON_SYSTEM is affected by solar perturbation
const GM_MOON = GM_EARTH_MOON_SYSTEM / (MASS_RATIO_EARTH_MOON + 1) / (1 - moonAtApogee / meanAUDistance);
// Result: ~4,902.8 km³/s² (matches GRAIL value)

// Moon's mass derived from gravitational parameter (kg)
// M_MOON = GM_MOON / G ≈ 7.35 × 10²² kg
const M_MOON = GM_MOON / G_CONSTANT;

// Mass ratio Sun/Earth ≈ 332,946
const MASS_RATIO_SUN_EARTH = M_SUN / M_EARTH;

// ═══════════════════════════════════════════════════════════════════════════
// Planetary Mass Ratios (Sun/Planet) - From IAU/JPL measurements
// These ratios were determined from moon observations and spacecraft tracking
// GM_planet = GM_SUN / ratio, then M_planet = GM_planet / G
// ═══════════════════════════════════════════════════════════════════════════

// Mercury: No moons, mass determined from Mariner 10 and MESSENGER spacecraft
const MASS_RATIO_SUN_MERCURY = 6023600;
const GM_MERCURY = GM_SUN / MASS_RATIO_SUN_MERCURY;  // ~22,032 km³/s²
const M_MERCURY = GM_MERCURY / G_CONSTANT;           // ~3.30 × 10²³ kg

// Venus: No moons, mass determined from Venera, Magellan spacecraft
const MASS_RATIO_SUN_VENUS = 408523.71;
const GM_VENUS = GM_SUN / MASS_RATIO_SUN_VENUS;      // ~324,859 km³/s²
const M_VENUS = GM_VENUS / G_CONSTANT;               // ~4.87 × 10²⁴ kg

// Mars: Mass from Phobos/Deimos orbits and spacecraft tracking
const MASS_RATIO_SUN_MARS = 3098703.59;
const GM_MARS = GM_SUN / MASS_RATIO_SUN_MARS;        // ~42,828 km³/s²
const M_MARS = GM_MARS / G_CONSTANT;                 // ~6.42 × 10²³ kg

// Jupiter: Mass from Galilean moon orbits (Io, Europa, Ganymede, Callisto)
const MASS_RATIO_SUN_JUPITER = 1047.3486;
const GM_JUPITER = GM_SUN / MASS_RATIO_SUN_JUPITER;  // ~126,686,534 km³/s²
const M_JUPITER = GM_JUPITER / G_CONSTANT;           // ~1.90 × 10²⁷ kg

// Saturn: Mass from Titan and other moon orbits
const MASS_RATIO_SUN_SATURN = 3497.898;
const GM_SATURN = GM_SUN / MASS_RATIO_SUN_SATURN;    // ~37,931,187 km³/s²
const M_SATURN = GM_SATURN / G_CONSTANT;             // ~5.68 × 10²⁶ kg

// Uranus: Mass from moon orbits (Titania, Oberon, etc.)
const MASS_RATIO_SUN_URANUS = 22902.98;
const GM_URANUS = GM_SUN / MASS_RATIO_SUN_URANUS;    // ~5,793,939 km³/s²
const M_URANUS = GM_URANUS / G_CONSTANT;             // ~8.68 × 10²⁵ kg

// Neptune: Mass from Triton orbit and Voyager 2 flyby
const MASS_RATIO_SUN_NEPTUNE = 19412.24;
const GM_NEPTUNE = GM_SUN / MASS_RATIO_SUN_NEPTUNE;  // ~6,836,529 km³/s²
const M_NEPTUNE = GM_NEPTUNE / G_CONSTANT;           // ~1.02 × 10²⁶ kg

// Pluto: Mass from Charon orbit (binary system)
const MASS_RATIO_SUN_PLUTO = 135200000;
const GM_PLUTO = GM_SUN / MASS_RATIO_SUN_PLUTO;      // ~982 km³/s²
const M_PLUTO = GM_PLUTO / G_CONSTANT;               // ~1.47 × 10²² kg

// Halley's Comet: Mass estimated from size (~11×8×8 km) and density (~0.6 g/cm³)
// No spacecraft has orbited it, so mass is approximate
const M_HALLEYS = 2.2e14;                            // ~2.2 × 10¹⁴ kg (estimated)
const GM_HALLEYS = M_HALLEYS * G_CONSTANT;           // ~1.47 × 10⁻⁵ km³/s²

// 433 Eros: Mass precisely measured by NEAR Shoemaker spacecraft (2000-2001)
const M_EROS = 6.687e15;                             // 6.687 × 10¹⁵ kg (measured)
const GM_EROS = M_EROS * G_CONSTANT;                 // ~4.46 × 10⁻⁴ km³/s²

// Orbital Formulas Helper Object
// Contains functions to calculate derived orbital elements
const OrbitalFormulas = {
  // Solve Kepler's equation for Eccentric Anomaly using Newton-Raphson
  // M = E - e·sin(E)  →  solve for E given M and e
  // Input: M in degrees, e (eccentricity)
  // Output: E in degrees
  eccentricAnomaly: (M_deg, e) => {
    const M = M_deg * Math.PI / 180;
    let E = M; // Initial guess
    for (let i = 0; i < 30; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-10) break;
    }
    return E * 180 / Math.PI;
  },

  // Mean motion in degrees per day
  // n = 360° / P
  meanMotion: (P_days) => 360 / P_days,

  // Semi-minor axis (AU)
  // b = a × √(1 - e²)
  semiMinorAxis: (a, e) => a * Math.sqrt(1 - e * e),

  // Perihelion distance (AU)
  // q = a × (1 - e)
  perihelionDist: (a, e) => a * (1 - e),

  // Aphelion distance (AU)
  // Q = a × (1 + e)
  aphelionDist: (a, e) => a * (1 + e),

  // Semi-latus rectum (AU)
  // p = a × (1 - e²)
  semiLatusRectum: (a, e) => a * (1 - e * e),

  // Focal distance (AU)
  // c = a × e
  focalDistance: (a, e) => a * e,

  // Heliocentric distance from true anomaly (AU)
  // r = a × (1 - e²) / (1 + e × cos(ν))
  heliocentricDist: (a, e, nu_deg) => {
    const nu = nu_deg * Math.PI / 180;
    return a * (1 - e * e) / (1 + e * Math.cos(nu));
  },

  // Flight path angle (degrees)
  // tan(γ) = e × sin(ν) / (1 + e × cos(ν))
  flightPathAngle: (e, nu_deg) => {
    const nu = nu_deg * Math.PI / 180;
    return Math.atan2(e * Math.sin(nu), 1 + e * Math.cos(nu)) * 180 / Math.PI;
  },

  // Mean longitude (degrees)
  // L = M + ϖ (mod 360°)
  meanLongitude: (M_deg, lonPerihelion_deg) => ((M_deg + lonPerihelion_deg) % 360 + 360) % 360,

  // True longitude (degrees)
  // λ = ν + ϖ (mod 360°)
  trueLongitude: (nu_deg, lonPerihelion_deg) => ((nu_deg + lonPerihelion_deg) % 360 + 360) % 360,

  // Argument of latitude (degrees)
  // u = ω + ν
  argumentOfLatitude: (omega_deg, nu_deg) => ((omega_deg + nu_deg) % 360 + 360) % 360,

  // Time since perihelion (days)
  // t = P × M / 360°
  timeSincePerihelion: (P_days, M_deg) => P_days * M_deg / 360,

  // Time to next perihelion (days)
  // t_next = P × (360° - M) / 360°
  timeToNextPerihelion: (P_days, M_deg) => P_days * (360 - M_deg) / 360,

  // Orbital velocity using vis-viva equation (km/s)
  // v = √(GM × (2/r - 1/a))
  // Input: r in km, a in km
  orbitalVelocity: (r_km, a_km) => {
    return Math.sqrt(GM_SUN * (2 / r_km - 1 / a_km));
  },

  // Perihelion velocity (km/s)
  // v_p = √(GM × (1 + e) / (a × (1 - e)))
  perihelionVelocity: (a_km, e) => {
    return Math.sqrt(GM_SUN * (1 + e) / (a_km * (1 - e)));
  },

  // Aphelion velocity (km/s)
  // v_a = √(GM × (1 - e) / (a × (1 + e)))
  aphelionVelocity: (a_km, e) => {
    return Math.sqrt(GM_SUN * (1 - e) / (a_km * (1 + e)));
  },

  // Specific orbital energy (km²/s²)
  // ε = -GM / (2a)
  specificEnergy: (a_km) => {
    return -GM_SUN / (2 * a_km);
  },

  // Specific angular momentum (km²/s)
  // h = √(GM × a × (1 - e²))
  specificAngularMomentum: (a_km, e) => {
    return Math.sqrt(GM_SUN * a_km * (1 - e * e));
  },

  // Radial velocity (km/s)
  // v_r = √(GM/p) × e × sin(ν)
  // where p = a(1-e²) is the semi-latus rectum
  radialVelocity: (a_km, e, nu_deg) => {
    const nu = nu_deg * Math.PI / 180;
    const p = a_km * (1 - e * e);
    return Math.sqrt(GM_SUN / p) * e * Math.sin(nu);
  },

  // Transverse velocity (km/s)
  // v_t = √(GM/p) × (1 + e × cos(ν))
  // where p = a(1-e²) is the semi-latus rectum
  transverseVelocity: (a_km, e, nu_deg) => {
    const nu = nu_deg * Math.PI / 180;
    const p = a_km * (1 - e * e);
    return Math.sqrt(GM_SUN / p) * (1 + e * Math.cos(nu));
  },

  // ═══════════════════════════════════════════════════════════════
  // Part 2 Formulas - Added December 2024
  // ═══════════════════════════════════════════════════════════════

  // Escape velocity from Sun at distance r (km/s)
  // v_esc = √(2GM/r)
  escapeVelocity: (r_km) => Math.sqrt(2 * GM_SUN / r_km),

  // Circular orbit velocity at distance r (km/s)
  // v_circ = √(GM/r)
  circularVelocity: (r_km) => Math.sqrt(GM_SUN / r_km),

  // Velocity ratio (current velocity / circular velocity)
  // Shows orbital dynamics: >1 near perihelion, <1 near aphelion, =√2 at escape
  velocityRatio: (v_km_s, r_km) => v_km_s / Math.sqrt(GM_SUN / r_km),

  // Heliocentric latitude (degrees)
  // sin(β) = sin(i) × sin(u) where u = ω + ν
  heliocentricLatitude: (inclination_deg, omega_deg, nu_deg) => {
    const i = inclination_deg * Math.PI / 180;
    const u = (omega_deg + nu_deg) * Math.PI / 180;
    return Math.asin(Math.sin(i) * Math.sin(u)) * 180 / Math.PI;
  },

  // True anomaly rate (degrees/day)
  // dν/dt = n × (1 + e×cos(ν))² / (1 - e²)^(3/2)
  // Fastest at perihelion, slowest at aphelion
  trueAnomalyRate: (n_deg_day, e, nu_deg) => {
    const nu = nu_deg * Math.PI / 180;
    const factor = Math.pow(1 + e * Math.cos(nu), 2) / Math.pow(1 - e * e, 1.5);
    return n_deg_day * factor;
  },

  // Eccentric anomaly rate (degrees/day)
  // dE/dt = n / (1 - e×cos(E))
  eccentricAnomalyRate: (n_deg_day, e, E_deg) => {
    const E = E_deg * Math.PI / 180;
    return n_deg_day / (1 - e * Math.cos(E));
  },

  // Area sweep rate (km²/s) - Kepler's 2nd Law
  // dA/dt = h/2 (constant throughout orbit)
  areaSweepRate: (a_km, e) => OrbitalFormulas.specificAngularMomentum(a_km, e) / 2,

  // Synodic period between any two planets (days)
  // P_syn = |P₁ × P₂ / (P₁ - P₂)|
  synodicPeriod: (P1_days, P2_days) => {
    if (P1_days === P2_days) return Infinity;
    return Math.abs(P1_days * P2_days / (P1_days - P2_days));
  },

  // Phase angle between two planets (degrees, 0-180)
  // Angular separation as seen from Sun
  phaseAngle: (lambda1_deg, lambda2_deg) => {
    let diff = Math.abs(lambda1_deg - lambda2_deg);
    if (diff > 180) diff = 360 - diff;
    return diff;
  },

  // Radius of curvature (km)
  // ρ = p × (1 + e² + 2e×cos(ν))^(3/2) / (1 + e×cos(ν))²
  radiusOfCurvature: (a_km, e, nu_deg) => {
    const p = a_km * (1 - e * e);
    const nu = nu_deg * Math.PI / 180;
    const cosNu = Math.cos(nu);
    const numerator = Math.pow(1 + e*e + 2*e*cosNu, 1.5);
    const denominator = Math.pow(1 + e*cosNu, 2);
    return p * numerator / denominator;
  },

  // Velocity ratio at perihelion vs aphelion
  // v_p/v_a = (1 + e) / (1 - e)
  velocityRatioPeriApo: (e) => (1 + e) / (1 - e),

  // Distance ratio aphelion vs perihelion
  // Q/q = (1 + e) / (1 - e)
  distanceRatioApoPerip: (e) => (1 + e) / (1 - e),

  // Kepler's 3rd Law: Orbital period from semi-major axis
  // P = 2π√(a³/GM) - returns days
  keplerPeriod: (a_km) => {
    const P_seconds = 2 * Math.PI * Math.sqrt(Math.pow(a_km, 3) / GM_SUN);
    return P_seconds / o.lengthofDay;
  },

  // ═══════════════════════════════════════════════════════════════
  // Part 3 Formulas - Added December 2024
  // Gravitational Influence Zones, Relativistic, and Barycenter
  // ═══════════════════════════════════════════════════════════════

  // Hill Sphere Radius (km)
  // r_Hill = a × (m / 3M)^(1/3)
  // Region where body's gravity dominates over the primary's gravity
  // Satellites must orbit within this radius to remain bound
  hillSphereRadius: (a_km, m_body, M_primary) => {
    return a_km * Math.pow(m_body / (3 * M_primary), 1/3);
  },

  // Sphere of Influence - Laplace definition (km)
  // r_SOI = a × (m / M)^(2/5)
  // Region where body's gravitational influence exceeds perturbation from primary
  // Used in patched conic approximation for spacecraft trajectories
  sphereOfInfluence: (a_km, m_body, M_primary) => {
    return a_km * Math.pow(m_body / M_primary, 2/5);
  },

  // Lagrange L1/L2 Distance from smaller body (km) - approximate
  // Same formula as Hill sphere: r_L1 ≈ r_L2 ≈ a × (m / 3M)^(1/3)
  // L1 is between the bodies, L2 is on the far side (unstable equilibrium points)
  lagrangeL1L2Distance: (a_km, m_body, M_primary) => {
    return a_km * Math.pow(m_body / (3 * M_primary), 1/3);
  },

  // Earth-Moon Barycenter distance from Earth center (km)
  // d_bary = moonDistance / (1 + mass_ratio)
  // Result: ~4,670 km (inside Earth, which has radius ~6,371 km)
  barycenterDistance: (moonDist_km, massRatio) => {
    return moonDist_km / (1 + massRatio);
  },

  // Schwarzschild Radius (km) - theoretical
  // r_s = 2GM / c²
  // The radius at which escape velocity equals speed of light
  // If all mass were compressed within this radius, it would form a black hole
  schwarzschildRadius: (GM) => {
    return 2 * GM / (speedOfLight * speedOfLight);
  },

  // Tidal Force Ratio (dimensionless)
  // Compares tidal force from body1 vs body2 at given distances
  // F_ratio = (M1 / M2) × (r2 / r1)³
  // For Sun/Moon on Earth: ~0.46 (Sun's tidal force is ~46% of Moon's)
  tidalForceRatio: (M1, M2, r1_km, r2_km) => {
    return (M1 / M2) * Math.pow(r2_km / r1_km, 3);
  },

  // Gravitational Potential at distance r (km²/s²)
  // Φ = -GM/r
  // Gravitational potential energy per unit mass at distance r
  gravitationalPotential: (GM, r_km) => {
    return -GM / r_km;
  },

  // ═══════════════════════════════════════════════════════════════
  // Surface & Physical Properties (require radius)
  // ═══════════════════════════════════════════════════════════════

  // Surface Gravity (m/s²)
  // g = GM / R²
  // Gravitational acceleration at the surface
  surfaceGravity: (GM_km3_s2, R_km) => {
    // GM in km³/s², R in km, result in m/s²
    return GM_km3_s2 / (R_km * R_km) * 1000;  // Convert km/s² to m/s²
  },

  // Surface Escape Velocity (km/s)
  // v_esc = √(2GM/R)
  // Minimum velocity needed to escape from the surface
  surfaceEscapeVelocity: (GM, R_km) => {
    return Math.sqrt(2 * GM / R_km);
  },

  // Mean Density (kg/m³)
  // ρ = M / V = 3M / (4πR³)
  // Average density of the body
  meanDensity: (M_kg, R_km) => {
    const R_m = R_km * 1000;
    const V = (4/3) * Math.PI * Math.pow(R_m, 3);
    return M_kg / V;
  },

  // Orbital Energy Ratio (dimensionless)
  // ratio = r/a - shows position relative to semi-major axis
  // < 1: closer than semi-major axis (moving toward aphelion)
  // = 1: at semi-major axis distance
  // > 1: farther than semi-major axis (moving toward perihelion)
  orbitalEnergyRatio: (r_km, a_km) => r_km / a_km,

  // Tidal Acceleration (m/s²)
  // a_tidal = 2 × GM × Δr / r³
  // Differential gravitational acceleration across an extended body
  tidalAcceleration: (GM, r_km, delta_r_km) => {
    return 2 * GM * delta_r_km / Math.pow(r_km, 3) * 1000;  // Convert to m/s²
  },

  // Semi-major Axis from Period (km)
  // a = (GM × P² / 4π²)^(1/3)
  // Inverse of Kepler's 3rd Law
  semiMajorAxisFromPeriod: (P_seconds, GM) => {
    return Math.pow(GM * P_seconds * P_seconds / (4 * Math.PI * Math.PI), 1/3);
  },

  // Mean Motion from GM (rad/s)
  // n = √(GM / a³)
  // Angular velocity in radians per second
  meanMotionFromGM: (GM, a_km) => Math.sqrt(GM / Math.pow(a_km, 3)),

  // ═══════════════════════════════════════════════════════════════
  // Part 4 Formulas - Precession & Newtonian Dynamics
  // ═══════════════════════════════════════════════════════════════

  // Precession rate from precession period (arcsec/century)
  // Rate = 360° × 3600"/° × 100 years / Period_years = 129,600,000 / Period_years
  precessionRateFromPeriod: (period_years) => {
    if (!isFinite(period_years) || period_years === 0) return 0;
    return 129600000 / period_years;
  },

  // Precession period from rate (years for full 360° cycle)
  // Period = 129,600,000 / Rate_arcsec_per_century
  precessionPeriodFromRate: (arcsec_per_century) => {
    if (!isFinite(arcsec_per_century) || arcsec_per_century === 0) return Infinity;
    return 129600000 / arcsec_per_century;
  },

  // Convert precession against Ecliptic to precession against ICRF
  // ICRF_period = (ecliptic × reference) / (ecliptic - reference)
  // Reference is typically holisticyearLength/13 (nodal precession contribution)
  precessionEclipticToICRF: (ecliptic_years, reference_years) => {
    const diff = ecliptic_years - reference_years;
    if (diff === 0) return Infinity;
    return (ecliptic_years * reference_years) / diff;
  },

  // Convert precession against ICRF to precession against Ecliptic
  // Inverse transformation: ecliptic = (ICRF × reference) / (ICRF + reference)
  precessionICRFToEcliptic: (ICRF_years, reference_years) => {
    const sum = ICRF_years + reference_years;
    if (sum === 0) return Infinity;
    return (ICRF_years * reference_years) / sum;
  },

  // Ratio of holistic year to precession period
  // Shows resonance structure in Newtonian precession (e.g., Mars = 4, Earth = 3)
  holisticPrecessionRatio: (precession_period, holistic_year) => {
    if (precession_period === 0) return Infinity;
    return holistic_year / precession_period;
  },

  // Precession period from holistic year ratio
  // period = holisticyearLength / n (where n is integer ratio)
  precessionFromHolisticRatio: (holistic_year, ratio) => {
    if (ratio === 0) return Infinity;
    return holistic_year / ratio;
  },

  // Precession angular velocity (rad/year) from arcsec/century
  // Converts observational units to angular velocity
  precessionAngularVelocity: (arcsec_per_century) => {
    // 1 arcsec = π/(180×3600) rad, 1 century = 100 years
    return (arcsec_per_century / 100) * (Math.PI / 648000);
  },

  // Newtonian perturbation strength estimate (dimensionless)
  // Shows relative influence of perturbing planet on another
  // strength = (m_perturber/M_sun) × (a_inner/a_outer)²
  perturbationStrength: (a_planet_km, a_perturber_km, m_perturber, M_sun) => {
    const ratio = a_planet_km < a_perturber_km
      ? Math.pow(a_planet_km / a_perturber_km, 2)
      : Math.pow(a_perturber_km / a_planet_km, 2);
    return (m_perturber / M_sun) * ratio;
  },

  // Precession ratio between two planets
  // Useful for identifying resonance patterns
  precessionRatio: (rate1_arcsec, rate2_arcsec) => {
    if (rate2_arcsec === 0) return Infinity;
    return rate1_arcsec / rate2_arcsec;
  },

  // Decompose total precession into ecliptic and perturbation components
  // Returns object with total, ecliptic contribution, and planetary perturbations
  precessionDecomposition: (total_arcsec, ecliptic_contribution_arcsec) => {
    return {
      total: total_arcsec,
      ecliptic: ecliptic_contribution_arcsec,
      perturbations: total_arcsec - ecliptic_contribution_arcsec
    };
  },

  // Format holistic ratio as readable fraction (e.g., "1/4" for ratio=4)
  // Returns string like "Holistic Year / 4" or "Holistic Year × 1.22"
  holisticRatioDescription: (ratio) => {
    if (!isFinite(ratio) || ratio === 0) return 'N/A';
    const absRatio = Math.abs(ratio);
    const sign = ratio < 0 ? ' (retrograde)' : '';
    // Check if it's close to an integer
    if (Math.abs(absRatio - Math.round(absRatio)) < 0.01) {
      const n = Math.round(absRatio);
      if (n === 1) return `= Holistic Year${sign}`;
      return `= Holistic Year / ${n}${sign}`;
    }
    return `≈ Holistic Year / ${absRatio.toFixed(2)}${sign}`;
  }
};

// Planet calculations TYPE I
const mercurySolarYearCount = (Math.round((holisticyearLength*meansolaryearlengthinDays)/mercurySolarYearInput));
const mercuryOrbitDistance = (((holisticyearLength/mercurySolarYearCount)**2)**(1/3));
const mercuryPerihelionDistance = mercuryOrbitDistance*mercuryOrbitalEccentricity*100;
const mercuryElipticOrbit = mercuryPerihelionDistance/2;
const mercurySpeed = (mercuryOrbitDistance*currentAUDistance*Math.PI*2)/(meansolaryearlengthinDays*(holisticyearLength/mercurySolarYearCount))/24;
const mercuryRotationPeriod = 24*(meansolaryearlengthinDays*holisticyearLength)/(mercurySolarYearCount*3/2);
const mercuryEccentricityPerihelion = (mercuryPerihelionDistance/2)*mercuryOrbitalEccentricity;
const mercuryLowestPoint = 180-mercuryAscendingNode;

const venusSolarYearCount = (Math.round((holisticyearLength*meansolaryearlengthinDays)/venusSolarYearInput));
const venusOrbitDistance = (((holisticyearLength/venusSolarYearCount)**2)**(1/3));
const venusPerihelionDistance = (venusOrbitDistance*venusOrbitalEccentricity*100);
const venusElipticOrbit = venusPerihelionDistance/2;
const venusSpeed = (venusOrbitDistance*currentAUDistance*Math.PI*2)/(meansolaryearlengthinDays*(holisticyearLength/venusSolarYearCount))/24;
const venusRotationPeriod = 24*(meansolaryearlengthinDays*holisticyearLength)/(Math.round((meansolaryearlengthinDays*holisticyearLength)/243.022699230302));
const venusEccentricityPerihelion = (venusPerihelionDistance/2)*venusOrbitalEccentricity;
const venusLowestPoint = 180-venusAscendingNode;

// Planet calculations TYPE II
const marsSolarYearCount = (Math.round((holisticyearLength*meansolaryearlengthinDays)/marsSolarYearInput));
const marsOrbitDistance = (((holisticyearLength/marsSolarYearCount)**2)**(1/3));
const marsRealOrbitalEccentricity = marsOrbitalEccentricity/(1+marsOrbitalEccentricity);
const marsElipticOrbit = (((marsRealOrbitalEccentricity*marsOrbitDistance)/2))*100+((marsOrbitalEccentricity*marsOrbitDistance)-(marsRealOrbitalEccentricity*marsOrbitDistance))*100;
const marsPerihelionDistance = (marsOrbitDistance*marsOrbitalEccentricity*100)+marsElipticOrbit;
const marsSpeed = (marsOrbitDistance*currentAUDistance*Math.PI*2)/(meansolaryearlengthinDays*(holisticyearLength/marsSolarYearCount))/24;
const marsRotationPeriod = 24*(meansolaryearlengthinDays*holisticyearLength)/(Math.round((meansolaryearlengthinDays*holisticyearLength)/1.02595659586635));

const erosSolarYearCount = (Math.round((holisticyearLength*meansolaryearlengthinDays)/erosSolarYearInput));
const erosOrbitDistance = (((holisticyearLength/erosSolarYearCount)**2)**(1/3));
const erosRealOrbitalEccentricity = erosOrbitalEccentricity/(1+erosOrbitalEccentricity);
const erosElipticOrbit = (((erosRealOrbitalEccentricity*erosOrbitDistance)/2))*100+((erosOrbitalEccentricity*erosOrbitDistance)-(erosRealOrbitalEccentricity*erosOrbitDistance))*100;
const erosPerihelionDistance = (erosOrbitDistance*erosOrbitalEccentricity*100)+erosElipticOrbit;
const erosSpeed = (erosOrbitDistance*currentAUDistance*Math.PI*2)/(meansolaryearlengthinDays*(holisticyearLength/erosSolarYearCount))/24;
const erosRotationPeriod = 24*(meansolaryearlengthinDays*holisticyearLength)/(Math.round((meansolaryearlengthinDays*holisticyearLength)/0.21958333344885));

// Planet calculations TYPE III
const jupiterSolarYearCount = (Math.round((holisticyearLength*meansolaryearlengthinDays)/jupiterSolarYearInput));
const jupiterOrbitDistance = (((holisticyearLength/jupiterSolarYearCount)**2)**(1/3));
const jupiterRealOrbitalEccentricity = jupiterOrbitalEccentricity/(1+jupiterOrbitalEccentricity);
const jupiterElipticOrbit = ((jupiterOrbitalEccentricity*jupiterOrbitDistance)-(jupiterRealOrbitalEccentricity*jupiterOrbitDistance))*100; 
const jupiterPerihelionDistance = jupiterRealOrbitalEccentricity*jupiterOrbitDistance*2*100;
const jupiterSpeed = (jupiterOrbitDistance*currentAUDistance*Math.PI*2)/(meansolaryearlengthinDays*(holisticyearLength/jupiterSolarYearCount))/24;
const jupiterRotationPeriod = 24*(meansolaryearlengthinDays*holisticyearLength)/(Math.round((meansolaryearlengthinDays*holisticyearLength)/0.413541666975253));

const saturnSolarYearCount = (Math.round((holisticyearLength*meansolaryearlengthinDays)/saturnSolarYearInput));
const saturnOrbitDistance = (((holisticyearLength/saturnSolarYearCount)**2)**(1/3));
const saturnRealOrbitalEccentricity = saturnOrbitalEccentricity/(1+saturnOrbitalEccentricity);
const saturnElipticOrbit = ((saturnOrbitalEccentricity*saturnOrbitDistance)-(saturnRealOrbitalEccentricity*saturnOrbitDistance))*100; 
const saturnPerihelionDistance = saturnRealOrbitalEccentricity*saturnOrbitDistance*2*100;
const saturnSpeed = (saturnOrbitDistance*currentAUDistance*Math.PI*2)/(meansolaryearlengthinDays*(holisticyearLength/saturnSolarYearCount))/24;
const saturnRotationPeriod = 24*(meansolaryearlengthinDays*holisticyearLength)/(Math.round((meansolaryearlengthinDays*holisticyearLength)/0.440023148755863));

const uranusSolarYearCount = (Math.round((holisticyearLength*meansolaryearlengthinDays)/uranusSolarYearInput));
const uranusOrbitDistance = (((holisticyearLength/uranusSolarYearCount)**2)**(1/3));
const uranusRealOrbitalEccentricity = uranusOrbitalEccentricity/(1+uranusOrbitalEccentricity);
const uranusElipticOrbit = ((uranusOrbitalEccentricity*uranusOrbitDistance)-(uranusRealOrbitalEccentricity*uranusOrbitDistance))*100; 
const uranusPerihelionDistance = uranusRealOrbitalEccentricity*uranusOrbitDistance*2*100;
const uranusSpeed = (uranusOrbitDistance*currentAUDistance*Math.PI*2)/(meansolaryearlengthinDays*(holisticyearLength/uranusSolarYearCount))/24;
const uranusRotationPeriod = 24*(meansolaryearlengthinDays*holisticyearLength)/(Math.round((meansolaryearlengthinDays*holisticyearLength)/0.718329998141018));

const neptuneSolarYearCount = (Math.round((holisticyearLength*meansolaryearlengthinDays)/neptuneSolarYearInput));
const neptuneOrbitDistance = (((holisticyearLength/neptuneSolarYearCount)**2)**(1/3));
const neptuneRealOrbitalEccentricity = neptuneOrbitalEccentricity/(1+neptuneOrbitalEccentricity);
const neptuneElipticOrbit = ((neptuneOrbitalEccentricity*neptuneOrbitDistance)-(neptuneRealOrbitalEccentricity*neptuneOrbitDistance))*100; 
const neptunePerihelionDistance = neptuneRealOrbitalEccentricity*neptuneOrbitDistance*2*100;
const neptuneSpeed = (neptuneOrbitDistance*currentAUDistance*Math.PI*2)/(meansolaryearlengthinDays*(holisticyearLength/neptuneSolarYearCount))/24;
const neptuneRotationPeriod = 24*(meansolaryearlengthinDays*holisticyearLength)/(Math.round((meansolaryearlengthinDays*holisticyearLength)/0.671300001591743));

const plutoSolarYearCount = (Math.round((holisticyearLength*meansolaryearlengthinDays)/plutoSolarYearInput));
const plutoOrbitDistance = (((holisticyearLength/plutoSolarYearCount)**2)**(1/3));
const plutoPerihelionDistance = plutoOrbitalEccentricity*plutoOrbitDistance*100;
const plutoElipticOrbit = plutoPerihelionDistance/2;
const plutoSpeed = (plutoOrbitDistance*currentAUDistance*Math.PI*2)/(meansolaryearlengthinDays*(holisticyearLength/plutoSolarYearCount))/24;
const plutoRotationPeriod = 24*(meansolaryearlengthinDays*holisticyearLength)/(Math.round((meansolaryearlengthinDays*holisticyearLength)/6.38720012152536));

const halleysSolarYearCount = (Math.round((holisticyearLength*meansolaryearlengthinDays)/halleysSolarYearInput));
const halleysOrbitDistance = (((holisticyearLength/halleysSolarYearCount)**2)**(1/3));
const halleysRealOrbitalEccentricity = halleysOrbitalEccentricity/(1+halleysOrbitalEccentricity);
const halleysElipticOrbit = ((halleysOrbitalEccentricity*halleysOrbitDistance)-(halleysRealOrbitalEccentricity*halleysOrbitDistance))*100; 
const halleysPerihelionDistance = halleysRealOrbitalEccentricity*halleysOrbitDistance*2*100;
const halleysSpeed = (halleysOrbitDistance*currentAUDistance*Math.PI*2)/(meansolaryearlengthinDays*(holisticyearLength/halleysSolarYearCount))/24;
const halleysRotationPeriod = 24*(meansolaryearlengthinDays*holisticyearLength)/(Math.round((meansolaryearlengthinDays*holisticyearLength)/2.2));

/* formats numbers with X decimals and a custom thousands separator */
const fmtNum = (n, dec = 6, sep = ',') =>
  Number(n).toLocaleString('en-US', {
    minimumFractionDigits:dec,
    maximumFractionDigits:dec
  }).replace(/,/g, sep);

// Format number in proper scientific notation with Unicode superscripts (e.g., 1.988415709678 × 10³⁰)
const fmtScientific = (n, dec = 12) => {
  const superscripts = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻'};
  const expStr = n.toExponential(dec);
  const [mantissa, exp] = expStr.split('e');
  const expNum = parseInt(exp, 10);
  const superExp = String(expNum).split('').map(c => superscripts[c] || c).join('');
  return `${mantissa} × 10${superExp}`;
};

/* ──────────────────────────────────────────────────────────────
   Universal cell renderer
   • numbers   → thousands-sep + decimals
   • dates     → dd/mm/yyyy, HH:MM:SS   (en-GB, 24 h)
   • bold / italic / small meta
   • getters (functions) evaluated each frame
   ────────────────────────────────────────────────────────────── */
const renderVal = val => {

  /* 0 ─ whole value may itself be a function */
  if (typeof val === 'function')
    return renderVal(val());

  /* ──────────────────────────────────────────────────
     A.  DIRECT  Date  or ISO-string  (no wrappers)
     ────────────────────────────────────────────────── */
  if (val instanceof Date)
    return val.toLocaleString('en-GB', { hour12:false });

  if (typeof val === 'string' && /^\d{4}-\d\d-\d\d/.test(val)) {
    const d = new Date(val.replace(' ', 'T'));
    if (!isNaN(d)) return d.toLocaleString('en-GB', { hour12:false });
  }

  /* ──────────────────────────────────────────────────
     B.  BOXED VALUE  { v, dec?, sep? }   ← new date branch
     ────────────────────────────────────────────────── */
  if (val && typeof val === 'object' && 'v' in val) {

    /* 1. unwrap getter if needed */
    let raw = (typeof val.v === 'function') ? val.v() : val.v;

    /* 2. same date logic as above */
    if (raw instanceof Date)
      return raw.toLocaleString('en-GB', { hour12:false });

    if (typeof raw === 'string' && /^\d{4}-\d\d-\d\d/.test(raw)) {
      const d = new Date(raw.replace(' ', 'T'));
      if (!isNaN(d)) return d.toLocaleString('en-GB', { hour12:false });
    }

    /* 3. if it's already a string (non-date), return it directly */
    if (typeof raw === 'string') return raw;

    /* 4. fall back to numeric formatting */
    const num = Number(raw);
    if (!Number.isFinite(num)) return '';          // guard NaN or ±∞

    const dec = val.dec ?? 0;
    const sep = val.sep ?? ',';
    return fmtNum(num, dec, sep);
  }

  /* ──────────────────────────────────────────────────
     C.  meta wrappers { bold | italic | small : … }
     ────────────────────────────────────────────────── */
  if (val && typeof val === 'object') {
    const inner = renderVal(val.bold ?? val.italic ?? val.small ?? val);
    if (val.bold)   return `<strong>${inner}</strong>`;
    if (val.italic) return `<em>${inner}</em>`;
    if (val.small)  return `<small>${inner}</small>`;
    return inner;
  }

  /* ──────────────────────────────────────────────────
     D.  plain scalar → default numeric formatting
     ────────────────────────────────────────────────── */
  if (Number.isFinite(val)) return fmtNum(val);
  return val ?? '';
};

const planetMeta = {
  earth : {
    intro : 'Earth is the third planet from the Sun and is the largest of the terrestrial planets. It is the only planet in our solar system not to be named after a Greek or Roman deity. The Earth was formed approximately ~4.5 billion years ago and is the only known planet to support life. It has a significant atmosphere, active geology, and a large moon, distinguished by its vast oceans of liquid water and diverse ecosystems that make it unique in the Solar System.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Earth_OLD.jpg',
    imgRatio : 35 / 9
  },
  sun  : {
    intro : 'The Sun (or Sol), is the star at the centre of our solar system and is responsible for the Earth’s climate and weather. The Sun is an almost perfect sphere with a difference of just 10 km in diameter between the poles and the equator. The average radius of the Sun is 695,508 km (109.2 x that of the Earth) of which 20–25% is the core. Our Sun is a ~4.5 billion-year-old yellow dwarf star that contains 99.86% of the Solar Systems mass and powers almost all life and weather on Earth through nuclear fusion of hydrogen into helium in its core.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Sun.jpg',
    imgRatio : 35 / 9
  },
  moon  : {
    intro : 'The Moon is Earths only natural satellite. It orbits around Earth at an average distance of 384,399 km. The Moon is just less than a third of the width of Earth which is really large compared to other Moon-Planet sizes in our solar system. The Moon rotates, but keeps facing Earth with the exact same near side. The origin of the Moon is usually explained by a Mars-sized body, known as Theia, striking the Earth, creating a debris ring that eventually collected into a single natural satellite, the Moon, but there are a number of variations on this giant-impact hypothesis, as well as alternative explanations, and research continues into how the Moon came to be formed.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Moon.jpg',
    imgRatio : 35 / 9
  },
  mercury  : {
    intro : 'Mercury is the smallest and closest planet to the Sun and due to its proximity it is not easily seen except during twilight. It is a heavily cratered, airless world that experiences extreme temperature swings due to its proximity to the Sun and lack of atmosphere. For every two orbits of the Sun, Mercury completes three rotations about its axis and up until 1965 it was thought that the same side of Mercury constantly faced the Sun. Thirteen times a century Mercury can be observed from the Earth passing across the face of the Sun in an event called a transit, the next will occur on the 13th November 2032.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Mercury.jpg',
    imgRatio : 35 / 9
  },
  venus  : {
    intro : 'Venus is the second planet from the Sun and is the second brightest object in the night sky after the Moon. Named after the Roman goddess of love and beauty, Venus is the second largest terrestrial planet and is sometimes referred to as the Earth’s sister planet due the their similar size and mass. The surface of this hot rocky planet is obscured by an opaque layer of clouds made up of sulphuric acid, crushing atmospheric pressure 90 times that of Earth, and a surface hot enough to melt lead due to a runaway greenhouse effect.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/VenusAtmosphere.jpg',
    imgRatio : 35 / 9
  },
  mars  : {
    intro : 'Mars is the fourth planet from the Sun and is the second smallest planet in the solar system. Named after the Roman god of war, Mars is also often described as the “Red Planet” due to its reddish appearance. Mars is a terrestrial planet with a thin atmosphere composed primarily of carbon dioxide. It is a cold, dusty red planet with massive extinct volcanoes, deep canyons, frozen polar caps, and evidence of ancient water flows, making it the most Earth-like planet in the Solar System.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Mars.jpg',
    imgRatio : 35 / 9
  },
  jupiter  : {
    intro : 'The planet Jupiter is the fifth planet out from the Sun, and is two and a half times more massive than all the other planets in the solar system combined. It is made primarily of gases and is therefore known as a “gas giant”. It has distinctive bands of swirling clouds, a powerful magnetic field, at least 95 moons, and an ongoing storm called the Great Red Spot that has raged for centuries',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Jupiter.jpg',
    imgRatio : 35 / 9
  },
  saturn  : {
    intro : 'Saturn is the sixth planet from the Sun and the most distant that can be seen with the naked eye. Saturn is the second largest planet and is best known for its fabulous ring system that was first observed in 1610 by the astronomer Galileo Galilei. Like Jupiter, Saturn is a gas giant and is composed of similar gasses including hydrogen, helium and methane. It has a distinctive yellow-orange hue, known for its extensive system of icy rings and more than 80 moons, including Titan, the only moon in the Solar System with a thick atmosphere. Saturns has a very strange persistent hexagonal cloud pattern around the north pole of the planet',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Saturn.jpg',
    imgRatio : 35 / 9
  },
  uranus  : {
    intro : 'Uranus is the seventh planet from the Sun. While being visible to the naked eye, it was not recognised as a planet due to its dimness and slow orbit. Uranus became the first planet discovered with the use of a telescope. Uranus is tipped over on its side with an axial tilt of over 82 degrees. It is often described as “rolling around the Sun on its side”. It is a cold, blue-green ice giant planet, with a set of narrow rings and a family of at least 28 moons named after literary characters.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Uranus.jpg',
    imgRatio : 35 / 9
  },
  neptune  : {
    intro : 'Neptune is the eighth planet from the Sun making it the most distant in the solar system. This gas giant planet may have formed much closer to the Sun in early solar system history before migrating to its present position. Neptune is a cold, windy ice giant with a vivid blue color, powerful storms, supersonic winds reaching 2,000 km/h (1,200 mph), a faint ringsystem and a collection of 16 known moons including the geologically active Triton.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Neptune.jpg',
    imgRatio : 35 / 9
  },
  pluto  : {
    intro : 'Pluto is a dwarf planet located in a distant region of our solar system beyond Neptune known as the Kuiper Belt. Pluto was long considered our ninth planet, but the International Astronomical Union reclassified Pluto as a dwarf planet in 2006. It is the largest known trans-Neptunian object by volume by a small margin, but is less massive than Eris. Like other Kuiper belt objects, Pluto is made primarily of ice and rock and is much smaller than the inner planets. Pluto has roughly one-sixth the mass of the Moon and one-third its volume.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/FictionalMakemake.jpg',
    imgRatio : 35 / 9
  },
  halleys  : {
    intro : 'Halleys Comet is the only known short-period comet that is consistently visible to the naked eye from Earth, appearing every 72–80 years. Halleys periodic returns to the inner Solar System have been observed and recorded by astronomers around the world since at least 240 BC, but it was not until 1705 that the English astronomer Edmond Halley understood that these appearances were re-appearances of the same comet. As a result of this discovery, the comet is named after Halley.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/FictionalCeres.jpg',
    imgRatio : 35 / 9
  },
  eros  : {
    intro : '433 Eros is a stony asteroid of the Amor group, and the first discovered, and second-largest near-Earth object. It has an elongated shape and a volume-equivalent diameter of approximately 16.8 kilometers (10.4 miles). Visited by the NEAR Shoemaker space probe in 1998, it became the first asteroid ever studied from its own orbit. The asteroid was discovered by German astronomer C. G. Witt at the Berlin Observatory on 13 August 1898 in an eccentric orbit between Mars and Earth. It was later named after Eros, a god from Greek mythology, the son of Aphrodite.',
    img   : 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/FictionalEris.jpg',
    imgRatio : 35 / 9
  },
  // …
};

//*************************************************************
// Create Planets logic
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
  isNotPhysicalObject: true,
};

const earthWobbleCenter = {
  name: "EARTH-WOBBLE-CENTER",
  startPos: -(((balancedYear-startmodelyearwithCorrection)/(holisticyearLength/3)*360)-(((balancedYear-startmodelyearwithCorrection)/(holisticyearLength/16)*360)-180)),
  speed: 0,
  tilt: 0,
  rotationSpeed: -Math.PI*2/(holisticyearLength/13),
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
  traceOn: false,
  isNotPhysicalObject: true,
};

const midEccentricityOrbit = {
  name: "EARTH-MID-ECCENTRICITY-ORBIT",
  startPos: -(((balancedYear-startmodelyearwithCorrection)/(holisticyearLength/3)*360)-(((balancedYear-startmodelyearwithCorrection)/(holisticyearLength/16)*360)-180)),
  speed: Math.PI*2/(holisticyearLength/13),
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: eccentricityMean*100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.011,   
  color: 0x0096FF,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/earth_mean_eccentricity.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear,
  traceOn: true,
  isNotPhysicalObject: true,
};

const earth = {
  name: "Earth",
  startPos: 0,    
  speed: -Math.PI*2/(holisticyearLength/13),
  rotationSpeed: Math.PI*2*(meansolaryearlengthinDays+1),
  tilt: -earthtiltMean,
  orbitRadius: -eccentricityAmplitude*100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.earthDiameter/ currentAUDistance)*100,
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Earth.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear,
  traceOn: false,
};

const earthInclinationPrecession = {
  name: "Earth Inclination Precession",
  startPos: ((balancedYear-startmodelyearwithCorrection)/(holisticyearLength/3)*360),
  speed: Math.PI*2/(holisticyearLength/3),
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
  isNotPhysicalObject: true,
};

const earthEclipticPrecession = {
  name: "Earth Ecliptic Precession",
  startPos: ((balancedYear-startmodelyearwithCorrection)/(holisticyearLength/5)*360),
  speed: Math.PI*2/(holisticyearLength/5),
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: -tiltandinclinationAmplitude,

  size: 0.1,
  color: 0xFEAA0D,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const earthObliquityPrecession = {
  name: "Earth Obliquity Precession",
  startPos: -((balancedYear-startmodelyearwithCorrection)/(holisticyearLength/8)*360),
  speed: -Math.PI*2/(holisticyearLength/8),
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: tiltandinclinationAmplitude,

  size: 0.1,
  color: 0xFEAA0D,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const earthPerihelionPrecession1 = {
  name: "Earth Perihelion Precession1",
  startPos: ((balancedYear-startmodelyearwithCorrection)/(holisticyearLength/16)*360),
  speed: Math.PI*2/(holisticyearLength/16),
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: -earthRAAngle,
  orbitTiltb: 0,

  size: 0.1,
  color: 0xFEAA0D,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const earthPerihelionPrecession2 = {
  name: "Earth Perihelion Precession2",
  startPos: -((balancedYear-startmodelyearwithCorrection)/(holisticyearLength/16)*360),
  speed: -Math.PI*2/(holisticyearLength/16),
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: -eccentricityMean*100,
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
  isNotPhysicalObject: true,
};

const barycenterEarthAndSun = {
  name: "Barycenter Earth and Sun",
  startPos: 0,
  speed: 0,
  tilt: 0,
  orbitRadius: eccentricityAmplitude*100,
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
  isNotPhysicalObject: true,
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
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceOn: true,
  traceLength : sYear * 1000000,
  traceStep : sYear,
  isNotPhysicalObject: true,
};

const sun = {
  name: "Sun",
  startPos: correctionSun,
  speed: Math.PI*2,
  rotationSpeed: (Math.PI*2)/(1/(meansolaryearlengthinDays/moonTropicalMonth)),
  tilt: -7.155,
  orbitRadius: 100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.sunDiameter/ currentAUDistance)*100,   
  color: 0x333333,
  visible: true,
  emissive: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear,
  traceOn: false,
};

const moonApsidalPrecession = {
  name: "Moon Apsidal Precession",
  startPos: moonStartposApsidal,
  speed: (Math.PI*2)/(moonApsidalPrecessionindaysEarth/meansolaryearlengthinDays),
  tilt: 0,
  orbitRadius: -(moonDistance/currentAUDistance)*(moonOrbitalEccentricity*100),
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: moonOrbitalInclination-moonTilt,
  orbitTiltb: 0,

  size: 0.01,
  color: 0x8b8b8b,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
}; 

const moonApsidalNodalPrecession1 = {
  name: "Moon Apsidal Nodal Precession1",
  startPos: moonStartposApsidal-moonStartposNodal,
  speed: -(Math.PI*2)/(moonApsidalMeetsNodalindays/meansolaryearlengthinDays),
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
  isNotPhysicalObject: true,
}; 

const moonApsidalNodalPrecession2 = {
  name: "Moon Apsidal Nodal Precession2",
  startPos: -(moonStartposApsidal-moonStartposNodal),
  speed: (Math.PI*2)/(moonApsidalMeetsNodalindays/meansolaryearlengthinDays),
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
  isNotPhysicalObject: true,
}; 

const moonRoyerCyclePrecession = {
  name: "Moon Royer Cycle",
  startPos: 360-moonStartposApsidal-moonStartposNodal,
  speed: -(Math.PI*2)/(moonRoyerCycleindays/meansolaryearlengthinDays),
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
  isNotPhysicalObject: true,
};

const moonNodalPrecession = {
  name: "Moon Nodal Precession",
  startPos: moonStartposNodal,
  speed: -(Math.PI*2)/(moonNodalPrecessionindaysEarth/meansolaryearlengthinDays),
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90+180)*Math.PI)/180)*-moonOrbitalInclination,
  orbitTiltb: Math.sin(((-90+180)*Math.PI)/180)*-moonOrbitalInclination,
  
  size: 0.001,
  color: 0x8b8b8b,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
}; 

const moon = {
  name: "Moon",
  startPos: moonStartposMoon,
  speed: (Math.PI*2)/(1/(meansolaryearlengthinDays/moonTropicalMonth)),
  rotationSpeed: 0,
  tilt: -moonTilt,
  orbitRadius: (moonDistance/currentAUDistance)*100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: (diameters.moonDiameter/ currentAUDistance)*100,
  color: 0x8b8b8b,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Moon.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 19,
  traceStep : sDay,
  traceOn: false,
};

const mercuryPerihelionDurationEcliptic1 = {
  name: "Mercury Perihelion Duration Ecliptic1",
  startPos: 0,
  speed: Math.PI*2/mercuryPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const mercuryPerihelionFromEarth = {
  name: "PERIHELION MERCURY",
  startPos: correctionSun,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: Math.cos(((mercuryLongitudePerihelion+mercuryAngleCorrection+90))*Math.PI/180)*mercuryPerihelionDistance,
  orbitCenterb: Math.cos((90-(mercuryLongitudePerihelion+mercuryAngleCorrection-90))*Math.PI/180)*mercuryPerihelionDistance,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/mercury_perihelion.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear, 
  traceOn: false,
  isNotPhysicalObject: true,
};

const mercuryPerihelionDurationEcliptic2 = {
  name: "Mercury Perihelion Duration Ecliptic2",
  startPos: 0,
  speed: -Math.PI*2/mercuryPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const mercuryRealPerihelionAtSun = {
  name: "Mercury Real Perihelion At Sun",
  startPos: mercuryLowestPoint,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: mercuryElipticOrbit,
  orbitCentera: 100,
  orbitCenterb: mercuryEccentricityPerihelion,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-mercuryAscendingNode)*Math.PI)/180)*-mercuryOrbitalInclination,
  orbitTiltb: Math.sin(((-90-mercuryAscendingNode)*Math.PI)/180)*-mercuryOrbitalInclination,

  size: 1.0,
  color: 0x868485,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const mercuryFixedPerihelionAtSun = {
  name: "Mercury Fixed Perihelion At Sun",
  startPos: mercuryLowestPoint,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-mercuryAscendingNode)*Math.PI)/180)*-mercuryOrbitalInclination,
  orbitTiltb: Math.sin(((-90-mercuryAscendingNode)*Math.PI)/180)*-mercuryOrbitalInclination,

  size: 1.0,
  color: 0x868485,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const mercury = {
  name: "Mercury",
  startPos: mercuryStartpos,
  speed: Math.PI*2/(holisticyearLength/mercurySolarYearCount),
  rotationSpeed: Math.PI*2*((mercuryRotationPeriod/24)/meansolaryearlengthinDays),
  tilt: -mercuryTilt,
  orbitRadius: (((holisticyearLength/mercurySolarYearCount) ** 2) **(1/3)) *100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,

  size: (diameters.mercuryDiameter/ currentAUDistance)*100,
  color: 0x868485,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Mercury.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 16,
  traceStep : sWeek,
  traceOn: false,
};

const venusPerihelionDurationEcliptic1 = {
  name: "Venus Perihelion Duration Ecliptic1",
  startPos: 0,
  speed: Math.PI*2/venusPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const venusPerihelionFromEarth = {
  name: "PERIHELION VENUS",
  startPos: correctionSun, 
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: Math.cos(((venusLongitudePerihelion+venusAngleCorrection+90))*Math.PI/180)*venusPerihelionDistance,
  orbitCenterb: Math.cos((90-(venusLongitudePerihelion+venusAngleCorrection-90))*Math.PI/180)*venusPerihelionDistance,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.1,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/venus_perihelion.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear, 
  traceOn: false,
  isNotPhysicalObject: true,
};

const venusPerihelionDurationEcliptic2 = {
  name: "Venus Perihelion Duration Ecliptic2",
  startPos: 0,
  speed: -Math.PI*2/venusPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const venusRealPerihelionAtSun = {
  name: "Venus Real Perihelion At Sun",
  startPos: venusLowestPoint,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: venusElipticOrbit,
  orbitCentera: 100,
  orbitCenterb: venusEccentricityPerihelion,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-venusAscendingNode)*Math.PI)/180)*-venusOrbitalInclination,
  orbitTiltb: Math.sin(((-90-venusAscendingNode)*Math.PI)/180)*-venusOrbitalInclination,

  size: 0.1,
  color: 0xA57C1B,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const venusFixedPerihelionAtSun = {
  name: "Venus Fixed Perihelion At Sun",
  startPos: venusLowestPoint,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-venusAscendingNode)*Math.PI)/180)*-venusOrbitalInclination,
  orbitTiltb: Math.sin(((-90-venusAscendingNode)*Math.PI)/180)*-venusOrbitalInclination,

  size: 0.1,
  color: 0xA57C1B,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const venus = {
  name: "Venus",
  startPos: venusStartpos,
  speed: Math.PI*2/(holisticyearLength/venusSolarYearCount),
  rotationSpeed: -Math.PI*2*((venusRotationPeriod/24)/meansolaryearlengthinDays),
  tilt: -venusTilt,
  orbitRadius: (((holisticyearLength/venusSolarYearCount) ** 2) **(1/3)) *100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.venusDiameter/ currentAUDistance)*100,
  color: 0xA57C1B,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/VenusAtmosphere.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 16,
  traceStep : sWeek,
  traceOn: false,
};

const marsPerihelionDurationEcliptic1 = {
  name: "Mars Perihelion Duration Ecliptic1",
  startPos: 0,
  speed: Math.PI*2/marsPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const marsPerihelionFromEarth = {
  name: "PERIHELION MARS",
  startPos: correctionSun,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: Math.cos(((marsLongitudePerihelion+marsAngleCorrection+90))*Math.PI/180)*marsPerihelionDistance,
  orbitCenterb: Math.cos((90-(marsLongitudePerihelion+marsAngleCorrection-90))*Math.PI/180)*marsPerihelionDistance,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/mars_perihelion.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear,
  traceOn: false,
  isNotPhysicalObject: true,
};

const marsPerihelionDurationEcliptic2 = {
  name: "Mars Perihelion Duration Ecliptic2",
  startPos: 0,
  speed: -Math.PI*2/marsPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const marsRealPerihelionAtSun = {
  name: "Mars Real Perihelion At Sun",
  startPos: marsStartpos*2,
  speed: -Math.PI*2+(2*Math.PI*2/(holisticyearLength/marsSolarYearCount)),
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: marsElipticOrbit,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-marsAscendingNode)*Math.PI)/180)*-marsOrbitalInclination,
  orbitTiltb: Math.sin(((-90-marsAscendingNode)*Math.PI)/180)*-marsOrbitalInclination,

  size: 0.1,
  color: 0xFEAA0D,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
}; 

const marsFixedPerihelionAtSun = {
  name: "Mars Fixed Perihelion At Sun",
  startPos: marsStartpos*2,
  speed: -Math.PI*2+(2*Math.PI*2/(holisticyearLength/marsSolarYearCount)),
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-marsAscendingNode)*Math.PI)/180)*-marsOrbitalInclination,
  orbitTiltb: Math.sin(((-90-marsAscendingNode)*Math.PI)/180)*-marsOrbitalInclination,

  size: 0.1,
  color: 0xFEAA0D,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
}; 

const mars = {
  name: "Mars",
  startPos: marsStartpos,
  speed: -Math.PI*2/(holisticyearLength/marsSolarYearCount),
  rotationSpeed: Math.PI*2*((marsRotationPeriod/24)/meansolaryearlengthinDays),
  tilt: -marsTilt,
  orbitRadius: (((holisticyearLength/marsSolarYearCount) ** 2) **(1/3)) *100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.marsDiameter/ currentAUDistance)*100,
  color: 0xFF0000,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Mars.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 16,
  traceStep : sWeek, 
  traceOn: false,
};

const jupiterPerihelionDurationEcliptic1 = {
  name: "Jupiter Perihelion Duration Ecliptic1",
  startPos: 0,
  speed: Math.PI*2/jupiterPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const jupiterPerihelionFromEarth = {
  name: "PERIHELION JUPITER",
  startPos: correctionSun,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: Math.cos(((jupiterLongitudePerihelion+jupiterAngleCorrection+90))*Math.PI/180)*jupiterPerihelionDistance,
  orbitCenterb: Math.cos((90-(jupiterLongitudePerihelion+jupiterAngleCorrection-90))*Math.PI/180)*jupiterPerihelionDistance,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/jupiter_perihelion.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear,
  traceOn: false,
  isNotPhysicalObject: true,
};

const jupiterPerihelionDurationEcliptic2 = {
  name: "Jupiter Perihelion Duration Ecliptic2",
  startPos: 0,
  speed: -Math.PI*2/jupiterPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const jupiterRealPerihelionAtSun = {
  name: "Jupiter Real Perihelion At Sun",
  startPos: jupiterStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: jupiterElipticOrbit,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-jupiterAscendingNode)*Math.PI)/180)*-jupiterOrbitalInclination,
  orbitTiltb: Math.sin(((-90-jupiterAscendingNode)*Math.PI)/180)*-jupiterOrbitalInclination,
  
  size: 1.0,
  color: 0xCDC2B2,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const jupiterFixedPerihelionAtSun = {
  name: "Jupiter Fixed Perihelion At Sun",
  startPos: jupiterStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-jupiterAscendingNode)*Math.PI)/180)*-jupiterOrbitalInclination,
  orbitTiltb: Math.sin(((-90-jupiterAscendingNode)*Math.PI)/180)*-jupiterOrbitalInclination,
  
  size: 1.0,
  color: 0xCDC2B2,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const jupiter = {
  name: "Jupiter",
  startPos: jupiterStartpos,
  speed: Math.PI*2/(holisticyearLength/jupiterSolarYearCount),
  rotationSpeed: Math.PI*2*((jupiterRotationPeriod/24)/meansolaryearlengthinDays),
  tilt: -jupiterTilt,
  orbitRadius: (((holisticyearLength/jupiterSolarYearCount) ** 2) **(1/3)) *100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.jupiterDiameter/ currentAUDistance)*100,
  color: 0xCDC2B2,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Jupiter.jpg',
  ringUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/other-rings.png',
  ringSize   : 11/6*(diameters.jupiterDiameter/ currentAUDistance)*100,
  ringInnerMult : 1.70,
  ringOuterMult : 1.90,
  ringOpacity   : 0.03,
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 16,
  traceStep : sWeek,
  traceOn: false,
};

const saturnPerihelionDurationEcliptic1 = {
  name: "Saturn Perihelion Duration Ecliptic1",
  startPos: 0,
  speed: Math.PI*2/saturnPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const saturnPerihelionFromEarth = {
  name: "PERIHELION SATURN",
  startPos: correctionSun,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: Math.cos(((saturnLongitudePerihelion+saturnAngleCorrection+90))*Math.PI/180)*saturnPerihelionDistance,
  orbitCenterb: Math.cos((90-(saturnLongitudePerihelion+saturnAngleCorrection-90))*Math.PI/180)*saturnPerihelionDistance,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/saturn_perihelion.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear,  
  traceOn: false,
  isNotPhysicalObject: true,
};

const saturnPerihelionDurationEcliptic2 = {
  name: "Saturn Perihelion Duration Ecliptic2",
  startPos: 0,
  speed: -Math.PI*2/saturnPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const saturnRealPerihelionAtSun = {
  name: "Saturn Real Perihelion At Sun",
  startPos: saturnStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: -saturnElipticOrbit,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-saturnAscendingNode)*Math.PI)/180)*-saturnOrbitalInclination,
  orbitTiltb: Math.sin(((-90-saturnAscendingNode)*Math.PI)/180)*-saturnOrbitalInclination,

  size: 0.1,   
  color: 0xA79662,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const saturnFixedPerihelionAtSun = {
  name: "Saturn Fixed Perihelion At Sun",
  startPos: saturnStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-saturnAscendingNode)*Math.PI)/180)*-saturnOrbitalInclination,
  orbitTiltb: Math.sin(((-90-saturnAscendingNode)*Math.PI)/180)*-saturnOrbitalInclination,

  size: 0.1,   
  color: 0xA79662,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const saturn = {
  name: "Saturn",
  startPos: saturnStartpos,    
  speed: Math.PI*2/(holisticyearLength/saturnSolarYearCount),
  rotationSpeed: Math.PI*2*((saturnRotationPeriod/24)/meansolaryearlengthinDays),
  tilt: -saturnTilt,
  orbitRadius: (((holisticyearLength/saturnSolarYearCount) ** 2) **(1/3)) *100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.saturnDiameter/ currentAUDistance)*100,
  color: 0xA79662,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Saturn.jpg',
  ringUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/saturn-rings.png',
  ringSize   : 2*(diameters.saturnDiameter/ currentAUDistance)*100,
  ringInnerMult: 1.23,
  ringOuterMult: 2.27,
  ringOpacity : 0.4,
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 250,
  traceStep : sWeek,
  traceOn: false,
};

const uranusPerihelionDurationEcliptic1 = {
  name: "Uranus Perihelion Duration Ecliptic1",
  startPos: 0,
  speed: Math.PI*2/uranusPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const uranusPerihelionFromEarth = {
  name: "PERIHELION URANUS",
  startPos: correctionSun,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: Math.cos(((uranusLongitudePerihelion+uranusAngleCorrection+90))*Math.PI/180)*uranusPerihelionDistance,
  orbitCenterb: Math.cos((90-(uranusLongitudePerihelion+uranusAngleCorrection-90))*Math.PI/180)*uranusPerihelionDistance,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/uranus_perihelion.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear,
  traceOn: false,
  isNotPhysicalObject: true,
};

const uranusPerihelionDurationEcliptic2 = {
  name: "Uranus Perihelion Duration Ecliptic2",
  startPos: 0,
  speed: -Math.PI*2/uranusPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const uranusRealPerihelionAtSun = {
  name: "Uranus Real Perihelion At Sun",
  startPos: uranusStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: uranusElipticOrbit,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-uranusAscendingNode)*Math.PI)/180)*-uranusOrbitalInclination,
  orbitTiltb: Math.sin(((-90-uranusAscendingNode)*Math.PI)/180)*-uranusOrbitalInclination,

  size: 0.1,   
  color: 0xD2F9FA,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const uranusFixedPerihelionAtSun = {
  name: "Uranus Fixed Perihelion At Sun",
  startPos: uranusStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-uranusAscendingNode)*Math.PI)/180)*-uranusOrbitalInclination,
  orbitTiltb: Math.sin(((-90-uranusAscendingNode)*Math.PI)/180)*-uranusOrbitalInclination,

  size: 0.1,   
  color: 0xD2F9FA,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const uranus = {
  name: "Uranus",
  startPos: uranusStartpos,
  speed: Math.PI*2/(holisticyearLength/uranusSolarYearCount),
  rotationSpeed: -Math.PI*2*((uranusRotationPeriod/24)/meansolaryearlengthinDays),
  tilt: -uranusTilt,
  orbitRadius: (((holisticyearLength/uranusSolarYearCount) ** 2) **(1/3)) *100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.uranusDiameter/ currentAUDistance)*100,
  color: 0xD2F9FA,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Uranus.jpg',
  ringUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/other-rings.png',
  ringSize   : 6/5*(diameters.uranusDiameter/ currentAUDistance)*100,
  ringInnerMult : 1.50,
  ringOuterMult : 2.00,
  ringOpacity   : 0.05,
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 250,
  traceStep : sWeek,  
  traceOn: false,
};

const neptunePerihelionDurationEcliptic1 = {
  name: "Neptune Perihelion Duration Ecliptic1",
  startPos: 0,
  speed: Math.PI*2/neptunePerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const neptunePerihelionFromEarth = {
  name: "PERIHELION NEPTUNE",
  startPos: correctionSun,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: Math.cos(((neptuneLongitudePerihelion+neptuneAngleCorrection+90))*Math.PI/180)*neptunePerihelionDistance,
  orbitCenterb: Math.cos((90-(neptuneLongitudePerihelion+neptuneAngleCorrection-90))*Math.PI/180)*neptunePerihelionDistance,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/neptune_perihelion.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear,
  traceOn: false,
  isNotPhysicalObject: true,
};

const neptunePerihelionDurationEcliptic2 = {
  name: "Neptune Perihelion Duration Ecliptic2",
  startPos: 0,
  speed: -Math.PI*2/neptunePerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const neptuneRealPerihelionAtSun = {
  name: "Neptune Real Perihelion At Sun",
  startPos: neptuneStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: neptuneElipticOrbit,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-neptuneAscendingNode)*Math.PI)/180)*-neptuneOrbitalInclination,
  orbitTiltb: Math.sin(((-90-neptuneAscendingNode)*Math.PI)/180)*-neptuneOrbitalInclination,

  size: 0.1,   
  color: 0x5E93F1,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const neptuneFixedPerihelionAtSun = {
  name: "Neptune Fixed Perihelion At Sun",
  startPos: neptuneStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-neptuneAscendingNode)*Math.PI)/180)*-neptuneOrbitalInclination,
  orbitTiltb: Math.sin(((-90-neptuneAscendingNode)*Math.PI)/180)*-neptuneOrbitalInclination,

  size: 0.1,   
  color: 0x5E93F1,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const neptune = {
  name: "Neptune",
  startPos: neptuneStartpos,
  speed: Math.PI*2/(holisticyearLength/neptuneSolarYearCount),
  rotationSpeed: Math.PI*2*((neptuneRotationPeriod/24)/meansolaryearlengthinDays),
  tilt: -neptuneTilt,
  orbitRadius: (((holisticyearLength/neptuneSolarYearCount) ** 2) **(1/3)) *100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.neptuneDiameter/ currentAUDistance)*100,
  color: 0x5E93F1,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Neptune.jpg',
  ringUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/other-rings.png',
  ringSize   : 4/5*(diameters.neptuneDiameter/ currentAUDistance)*100,
  ringInnerMult : 1.80,
  ringOuterMult : 2.05,
  ringOpacity   : 0.03,
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 250,
  traceStep : sWeek,
  traceOn: false,
};

// The accurate orbits of Pluto and Halleys and Eros can be added later
// You might be able to make eccentric orbits with these settings but not sure if it works (helpfull for hallays?)
// orbitSemiMajor: 519.969067802053,
// orbitSemiMinor: 519.969067802053*Math.sqrt(1-0.048499*0.048499),

const plutoPerihelionDurationEcliptic1 = {
  name: "Pluto Perihelion Duration Ecliptic1",
  startPos: 0,
  speed: Math.PI*2/plutoPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const plutoPerihelionFromEarth = {
  name: "PERIHELION PLUTO",
  startPos: correctionSun,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: Math.cos(((plutoLongitudePerihelion+plutoAngleCorrection+90))*Math.PI/180)*plutoPerihelionDistance,
  orbitCenterb: Math.cos((90-(plutoLongitudePerihelion+plutoAngleCorrection-90))*Math.PI/180)*plutoPerihelionDistance,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/pluto_perihelion.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear,
  traceOn: false,
  isNotPhysicalObject: true,
};

const plutoPerihelionDurationEcliptic2 = {
  name: "Pluto Perihelion Duration Ecliptic2",
  startPos: 0,
  speed: -Math.PI*2/plutoPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const plutoRealPerihelionAtSun = {
  name: "Pluto Real Perihelion At Sun",
  startPos: plutoStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: plutoElipticOrbit,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-plutoAscendingNode)*Math.PI)/180)*-plutoOrbitalInclination,
  orbitTiltb: Math.sin(((-90-plutoAscendingNode)*Math.PI)/180)*-plutoOrbitalInclination,

  size: 0.1,   
  color: 0x5E93F1,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const plutoFixedPerihelionAtSun = {
  name: "Pluto Fixed Perihelion At Sun",
  startPos: plutoStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-plutoAscendingNode)*Math.PI)/180)*-plutoOrbitalInclination,
  orbitTiltb: Math.sin(((-90-plutoAscendingNode)*Math.PI)/180)*-plutoOrbitalInclination,

  size: 0.1,   
  color: 0x5E93F1,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const pluto = {
  name: "Pluto",
  startPos: plutoStartpos,
  speed: Math.PI*2/(holisticyearLength/plutoSolarYearCount),
  rotationSpeed: Math.PI*2*((plutoRotationPeriod/24)/meansolaryearlengthinDays),
  tilt: -plutoTilt,
  orbitRadius: (((holisticyearLength/plutoSolarYearCount) ** 2) **(1/3)) *100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.plutoDiameter/ currentAUDistance)*100,
  color: 0x5E93F1,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/FictionalMakemake.jpg',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 250,
  traceStep : sWeek,  
  traceOn: false,
};

const halleysPerihelionDurationEcliptic1 = {
  name: "Halleys Perihelion Duration Ecliptic1",
  startPos: 0,
  speed: Math.PI*2/halleysPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const halleysPerihelionFromEarth = {
  name: "PERIHELION HALLEYS",
  startPos: correctionSun,    
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: Math.cos(((halleysLongitudePerihelion+halleysAngleCorrection+90))*Math.PI/180)*halleysPerihelionDistance,
  orbitCenterb: Math.cos((90-(halleysLongitudePerihelion+halleysAngleCorrection-90))*Math.PI/180)*halleysPerihelionDistance,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/halleys_perihelion.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear,  
  traceOn: false,
  isNotPhysicalObject: true,
};

const halleysPerihelionDurationEcliptic2 = {
  name: "Halleys Perihelion Duration Ecliptic2",
  startPos: 0,
  speed: -Math.PI*2/halleysPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const halleysRealPerihelionAtSun = {
  name: "Halleys Real Perihelion At Sun",
  startPos: halleysStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: halleysElipticOrbit,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-halleysAscendingNode)*Math.PI)/180)*(-halleysOrbitalInclination),
  orbitTiltb: Math.sin(((-90-halleysAscendingNode)*Math.PI)/180)*(-halleysOrbitalInclination),

  size: 0.1,
  color: 0xA57C1B,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const halleysFixedPerihelionAtSun = {
  name: "Halleys Fixed Perihelion At Sun",
  startPos: halleysStartpos*2,
  speed: -Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-halleysAscendingNode)*Math.PI)/180)*(-halleysOrbitalInclination),
  orbitTiltb: Math.sin(((-90-halleysAscendingNode)*Math.PI)/180)*(-halleysOrbitalInclination),

  size: 0.1,
  color: 0xA57C1B,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const halleys = {
  name: "Halleys",
  startPos: halleysStartpos,
  speed: Math.PI*2/(holisticyearLength/halleysSolarYearCount),
  rotationSpeed: Math.PI*2*((halleysRotationPeriod/24)/meansolaryearlengthinDays),
  tilt: halleysTilt,
  orbitRadius: (((holisticyearLength/halleysSolarYearCount) ** 2) **(1/3)) *100,
  orbitSemiMajor: 0,
  orbitSemiMinor: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.halleysDiameter/ currentAUDistance)*100,
  color: 0x00FF00,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/FictionalCeres.jpg',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 250,
  traceStep : sWeek,
  traceOn: false,
};

const erosPerihelionDurationEcliptic1 = {
  name: "Eros Perihelion Duration Ecliptic1",
  startPos: 0,
  speed: Math.PI*2/erosPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const erosPerihelionFromEarth = {
  name: "PERIHELION EROS",
  startPos: correctionSun,
  speed: Math.PI*2,
  rotationSpeed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: Math.cos(((erosLongitudePerihelion+erosAngleCorrection+90))*Math.PI/180)*erosPerihelionDistance,
  orbitCenterb: Math.cos((90-(erosLongitudePerihelion+erosAngleCorrection-90))*Math.PI/180)*erosPerihelionDistance,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: 0.5,   
  color: 0x333333,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/eros_perihelion.png',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 1000000,
  traceStep : sYear, 
  traceOn: false,
  isNotPhysicalObject: true,
};

const erosPerihelionDurationEcliptic2 = {
  name: "Eros Perihelion Duration Ecliptic2",
  startPos: 0,
  speed: -Math.PI*2/erosPerihelionEclipticYears,
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
  isNotPhysicalObject: true,
};

const erosRealPerihelionAtSun = {
  name: "Eros Real Perihelion At Sun",
  startPos: erosStartpos*2,
  speed: -Math.PI*2+(2*Math.PI*2/(holisticyearLength/erosSolarYearCount)),
  tilt: 0,
  orbitRadius: erosElipticOrbit,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-erosAscendingNode)*Math.PI)/180)*-erosOrbitalInclination,
  orbitTiltb: Math.sin(((-90-erosAscendingNode)*Math.PI)/180)*-erosOrbitalInclination,

  size: 0.1,
  color: 0xA57C1B,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const erosFixedPerihelionAtSun = {
  name: "Eros Fixed Perihelion At Sun",
  startPos: erosStartpos*2,
  speed: -Math.PI*2+(2*Math.PI*2/(holisticyearLength/erosSolarYearCount)),
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 100,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: Math.cos(((-90-erosAscendingNode)*Math.PI)/180)*-erosOrbitalInclination,
  orbitTiltb: Math.sin(((-90-erosAscendingNode)*Math.PI)/180)*-erosOrbitalInclination,

  size: 0.1,
  color: 0xA57C1B,
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isNotPhysicalObject: true,
};

const eros = {
  name: "Eros",
  startPos: erosStartpos,
  speed: -Math.PI*2/(holisticyearLength/erosSolarYearCount),
  rotationSpeed: Math.PI*2*((erosRotationPeriod/24)/meansolaryearlengthinDays),
  tilt: erosTilt,
  orbitRadius: (((holisticyearLength/erosSolarYearCount) ** 2) **(1/3)) *100,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  
  size: (diameters.erosDiameter/ currentAUDistance)*100,
  color: 0xA57C1B,
  textureUrl: 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/FictionalEris.jpg',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  traceLength : sYear * 16,
  traceStep : sWeek,
  traceOn: false,
};

//*************************************************************
// ADD CONSTANTS
//*************************************************************
const planetObjects = [startingPoint, earthWobbleCenter, midEccentricityOrbit, earth, earthInclinationPrecession, earthEclipticPrecession, earthObliquityPrecession, earthPerihelionPrecession1, earthPerihelionPrecession2, barycenterEarthAndSun, earthPerihelionFromEarth, mercuryPerihelionFromEarth, venusPerihelionFromEarth, marsPerihelionFromEarth, jupiterPerihelionFromEarth, saturnPerihelionFromEarth, uranusPerihelionFromEarth, neptunePerihelionFromEarth, plutoPerihelionFromEarth, halleysPerihelionFromEarth, erosPerihelionFromEarth, sun, moonApsidalPrecession, moonApsidalNodalPrecession1, moonApsidalNodalPrecession2, moonRoyerCyclePrecession, moonNodalPrecession, moon, mercuryPerihelionDurationEcliptic1, venusPerihelionDurationEcliptic1, marsPerihelionDurationEcliptic1, jupiterPerihelionDurationEcliptic1, saturnPerihelionDurationEcliptic1, uranusPerihelionDurationEcliptic1, neptunePerihelionDurationEcliptic1, plutoPerihelionDurationEcliptic1, halleysPerihelionDurationEcliptic1, erosPerihelionDurationEcliptic1, mercuryPerihelionDurationEcliptic2, mercuryRealPerihelionAtSun, mercury, mercuryFixedPerihelionAtSun, venusPerihelionDurationEcliptic2, venusRealPerihelionAtSun, venus, venusFixedPerihelionAtSun, marsPerihelionDurationEcliptic2, marsRealPerihelionAtSun, mars, marsFixedPerihelionAtSun, jupiterPerihelionDurationEcliptic2, jupiterRealPerihelionAtSun, jupiter, jupiterFixedPerihelionAtSun, saturnPerihelionDurationEcliptic2, saturnRealPerihelionAtSun, saturn, saturnFixedPerihelionAtSun, uranusPerihelionDurationEcliptic2, uranusRealPerihelionAtSun, uranus, uranusFixedPerihelionAtSun, neptunePerihelionDurationEcliptic2, neptuneRealPerihelionAtSun, neptune, neptuneFixedPerihelionAtSun, plutoPerihelionDurationEcliptic2, plutoRealPerihelionAtSun, pluto, plutoFixedPerihelionAtSun, halleysPerihelionDurationEcliptic2, halleysRealPerihelionAtSun, halleys, halleysFixedPerihelionAtSun, erosPerihelionDurationEcliptic2, erosRealPerihelionAtSun, eros, erosFixedPerihelionAtSun]

const tracePlanets = [earthWobbleCenter, earthPerihelionFromEarth, midEccentricityOrbit, mercuryPerihelionFromEarth, venusPerihelionFromEarth, marsPerihelionFromEarth, jupiterPerihelionFromEarth, saturnPerihelionFromEarth, uranusPerihelionFromEarth, neptunePerihelionFromEarth, plutoPerihelionFromEarth, halleysPerihelionFromEarth, erosPerihelionFromEarth, sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto, halleys, eros]

//*************************************************************
// ADD ALL CALENDAR CONSTANTS
//*************************************************************
const GREGORIAN_START = { year: 1582, month: 10, day: 15};
// Start of the Gregorian Calendar
const GREGORIAN_START_JD = 2299160.5;
// Start of the Gregorian Calendar in Juliandate
const REVISION_START_JD = perihelionalignmentJD;
// Start of the Revised Julian Calendar in Juliandate

/* vertex: pass UV + world-space normal & position */
const EARTH_VERT = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;

void main(){
    vUv     = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPos    = (modelMatrix * vec4(position,1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;

/* fragment: on-the-fly TBN via screen-space derivatives */
const EARTH_FRAG = `
precision mediump float;

uniform sampler2D u_dayTexA;
uniform sampler2D u_dayTexB;
uniform sampler2D u_niteTexA;
uniform sampler2D u_niteTexB;
uniform float     u_dayMix;
uniform float     u_niteMix;
uniform sampler2D u_normalTexture;
uniform sampler2D u_specTexture;

uniform vec3  u_sunRelPosition;   /* vector Earth → Sun (world) */
uniform float u_normalPower;      /* 0-1 mix of normal-map shading */
uniform vec3  u_position;         /* planet centre (world) */
uniform float u_dayGain; 
uniform float u_termWidth;        /* terminator width */
uniform float u_iceGlowStrength;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;

/* build TBN on the fly */
mat3 cotangent_frame(vec3 N, vec3 p, vec2 uv){
    vec3  dp1 = dFdx(p),   dp2 = dFdy(p);
    vec2  duv1 = dFdx(uv), duv2 = dFdy(uv);
    vec3  T = dp2 * duv1.x - dp1 * duv2.x;
    vec3  B = dp2 * duv1.y - dp1 * duv2.y;
    float invMax = inversesqrt(max(dot(T,T), dot(B,B)));
    return mat3(T*invMax, B*invMax, N);
}

void main(){

    vec3 sunDir = normalize(u_sunRelPosition);

    /* normal-map shading */
    vec3 texN = texture2D(u_normalTexture, vUv).xyz*2.0 - 1.0;
    mat3 tbn  = cotangent_frame(vNormal, vPos, vUv);
    vec3 nMap = normalize( mix( vNormal, normalize( tbn * texN ), u_normalPower ) );

    /* day-night mix */
    float hemi = dot(vNormal, sunDir)*0.5 + 0.5;  /* geometry only */
    float edge0 = 0.5 - 0.5 * u_termWidth;
    float edge1 = 0.5 + 0.5 * u_termWidth;
    hemi = smoothstep(edge0, edge1, clamp(hemi, 0.07, 1.0));

    /* day map ------------------------------------------------------------- */
    vec3 dayA = texture2D(u_dayTexA, vUv).rgb;
    vec3 dayB = texture2D(u_dayTexB, vUv).rgb;
    vec3 day  = mix(dayA, dayB, u_dayMix) * u_dayGain;

    /* night map ----------------------------------------------------------- */
    vec3 niteA = texture2D(u_niteTexA, vUv).rgb;
    vec3 niteB = texture2D(u_niteTexB, vUv).rgb;
    vec3 night = mix(niteA, niteB, u_niteMix);
    vec3 color = mix(night, day, hemi);

    /* --- polar ice glow ----------------------------------------------- */

    /* latitude mask: 0 at equator ➔ 1 at the poles                       *
    * change 0.5 to 0.6 if you want the band thinner                     */
    float latMask = smoothstep(0.5, 0.8, abs(vNormal.y));

    /* night-side weight (1 = full night, 0 = full day)                   */
    float nightMask = 1.0 - hemi;

    /* add faint bluish subsurface scatter                                */
    color += vec3(0.05, 0.07, 0.12)
       * latMask
       * nightMask
       * u_iceGlowStrength;     // 0-1 slider

    /* softer, Fresnel-weighted ocean specular */
    float specMask = texture2D(u_specTexture, vUv).r;          // oceans = 1, land = 0
    vec3  reflDir  = reflect(-sunDir, nMap);
    vec3  viewDir  = normalize(cameraPosition - vPos);

    float rough   = 0.08;                                      // 0 = mirror, ↑ = blurrier
    float spec    = pow(max(dot(reflDir, viewDir), 0.0), 1.0 / rough);

    float fresnel = pow(1.0 - max(dot(viewDir, nMap), 0.0), 5.0);
    float ocean   = specMask * hemi;                          // day-side water only

    color += spec * fresnel * ocean * 0.6; 

    gl_FragColor = vec4(color, 1.0);
}`;

/* atmosphere shell shaders */
const ATM_VERT = `
varying vec3 vN;
varying vec3 vPos;

void main(){
    vN   = normalize(normalMatrix * normal);
    vPos = (modelMatrix * vec4(position,1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;
const ATM_FRAG = `
precision mediump float;

uniform vec3 u_sunRelPosition;     /* Earth → Sun (world) */
varying vec3 vN;
varying vec3 vPos;

void main(){

    vec3 sunDir  = normalize(u_sunRelPosition);
    vec3 viewDir = normalize(cameraPosition - vPos);

    /* classic rim term */
    float rim = pow(1.0 - max(dot(viewDir, vN), 0.0), 2.0);   // strongest at the edge

    /* forward-scattering haze on the day side */
    float dayGlow = pow(max(dot(sunDir, vN), 0.0), 3.0);

    float alpha  = clamp(rim * 0.45 + dayGlow * 0.25, 0.0, 1.0) * 0.7; // mix factors
    vec3  col   = vec3(0.35, 0.55, 1.0);                      // soft blue-sky tint

    gl_FragColor = vec4(col * alpha, alpha * 0.8);
}`;

const CLOUD_FRAG = `
precision mediump float;

uniform sampler2D u_cloudTexture;
uniform vec3      u_sunRelPosition;
uniform float     u_alpha;        /* global cloud thickness */
uniform float     u_nightCloudFactor;

varying vec2 vUv;
varying vec3 vNormal;

void main(){
    /* direction to the sun and raw “hemi” term (1 = day-side, 0 = night-side) */
    vec3  sunDir   = normalize(u_sunRelPosition);
    float hemi     = dot(vNormal, sunDir) * 0.5 + 0.5;   // range 0-1

    /* optional softness around the terminator */
    float termWidth = 0.15;                              // 0 = razor, 0.5 = very wide
    hemi = smoothstep(0.5 - termWidth, 0.5 + termWidth, hemi);

    /* visibility falls from 1.0 (noon) ➜ u_nightCloudFactor (mid-night) */
    float visibility = mix(u_nightCloudFactor, 1.0, hemi);

    /* sample once: RGB = colour,  A = mask                                   */
    vec4 cloudTex = texture2D(u_cloudTexture, vUv);

    vec3  colour = cloudTex.rgb * visibility;
    float alpha  = cloudTex.a  * u_alpha * visibility;

    gl_FragColor = vec4(colour, alpha);
}`;

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
    positionChanged = true;
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
    positionChanged = true;
  },

  'Reset': function () {
    this.pos = 0;
    controls.reset();
    positionChanged = true;
  },

  'Now (time in UTC)': function () {
    const now = new Date();
    // Get UTC date string (YYYY-MM-DD)
    const dateStr = now.toISOString().slice(0, 10);
    // Get UTC time string (HH:MM:SS)
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    const timeStr = `${hh}:${mm}:${ss}`;
    // Calculate position: days + time offset
    const newPos = sDay * dateToDays(dateStr) + timeToPos(timeStr);
    this.pos = newPos;
    controls.reset();
    positionChanged = true;
  },

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
  lengthofAU : 149597870.698828,
  pos : 0,
  sun : {pivotObj: new THREE.Object3D()},
  earth : {pivotObj: new THREE.Object3D()},
  displayFormat : 'sexagesimal',
  distanceUnit : 'AU',
  RA_Display : '',
  Dec_Display : '',
  perihelionDate : "",

  'Line trace': true,
  'Camera Lat': 0,
  'Camera Long': 0,
  'Polar line': false,
  polarLineLength: 1,
  Performance: false,
  debugAscendingNode: false,
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
  plutoElongation: 0.01,
  halleysElongation: 0.01,
  erosElongation: 0.01,

  mercuryPerihelion: 0,
  venusPerihelion: 0,
//  mercuryPerihelion2: 0,
  earthPerihelion: 0,
  marsPerihelion: 0,
  jupiterPerihelion: 0,
  saturnPerihelion: 0,
  uranusPerihelion: 0,
  neptunePerihelion: 0,
  plutoPerihelion: 0,
  halleysPerihelion: 0,
  erosPerihelion: 0,
  
  mercuryArgumentOfPeriapsis: 0,
  venusArgumentOfPeriapsis: 0,
  marsArgumentOfPeriapsis: 0,
  jupiterArgumentOfPeriapsis: 0,
  saturnArgumentOfPeriapsis: 0,
  uranusArgumentOfPeriapsis: 0,
  neptuneArgumentOfPeriapsis: 0,
  plutoArgumentOfPeriapsis: 0,
  halleysArgumentOfPeriapsis: 0,
  erosArgumentOfPeriapsis: 0,
  
  mercuryAscendingNode: 0,
  venusAscendingNode: 0,
  marsAscendingNode: 0,
  jupiterAscendingNode: 0,
  saturnAscendingNode: 0,
  uranusAscendingNode: 0,
  neptuneAscendingNode: 0,
  plutoAscendingNode: 0,
  halleysAscendingNode: 0,
  erosAscendingNode: 0,

  mercuryDescendingNode: 0,
  venusDescendingNode: 0,
  marsDescendingNode: 0,
  jupiterDescendingNode: 0,
  saturnDescendingNode: 0,
  uranusDescendingNode: 0,
  neptuneDescendingNode: 0,
  plutoDescendingNode: 0,
  halleysDescendingNode: 0,
  erosDescendingNode: 0,

  mercuryMeanAnomaly: 0,
  mercuryTrueAnomaly: 0,
  mercuryEccentricAnomaly: 0,
  venusMeanAnomaly: 0,
  venusTrueAnomaly: 0,
  venusEccentricAnomaly: 0,
  marsMeanAnomaly: 0,
  marsTrueAnomaly: 0,
  marsEccentricAnomaly: 0,
  jupiterMeanAnomaly: 0,
  jupiterTrueAnomaly: 0,
  jupiterEccentricAnomaly: 0,
  saturnMeanAnomaly: 0,
  saturnTrueAnomaly: 0,
  saturnEccentricAnomaly: 0,
  uranusMeanAnomaly: 0,
  uranusTrueAnomaly: 0,
  uranusEccentricAnomaly: 0,
  neptuneMeanAnomaly: 0,
  neptuneTrueAnomaly: 0,
  neptuneEccentricAnomaly: 0,
  plutoMeanAnomaly: 0,
  plutoTrueAnomaly: 0,
  plutoEccentricAnomaly: 0,
  halleysMeanAnomaly: 0,
  halleysTrueAnomaly: 0,
  halleysEccentricAnomaly: 0,
  erosMeanAnomaly: 0,
  erosTrueAnomaly: 0,
  erosEccentricAnomaly: 0,

  // Earth anomalies (calculated from Sun's position)
  earthMeanAnomaly: 0,
  earthTrueAnomaly: 0,
  earthEccentricAnomaly: 0,
  earthArgumentOfPeriapsis: 0,

  // Height above invariable plane for each planet (in AU, positive = above)
  mercuryHeightAboveInvPlane: 0,
  venusHeightAboveInvPlane: 0,
  earthHeightAboveInvPlane: 0,
  marsHeightAboveInvPlane: 0,
  jupiterHeightAboveInvPlane: 0,
  saturnHeightAboveInvPlane: 0,
  uranusHeightAboveInvPlane: 0,
  neptuneHeightAboveInvPlane: 0,
  plutoHeightAboveInvPlane: 0,

  // Boolean flags for above/below invariable plane
  mercuryAboveInvPlane: true,
  venusAboveInvPlane: true,
  earthAboveInvPlane: true,
  marsAboveInvPlane: true,
  jupiterAboveInvPlane: true,
  saturnAboveInvPlane: true,
  uranusAboveInvPlane: true,
  neptuneAboveInvPlane: true,
  plutoAboveInvPlane: true,
  halleysHeightAboveInvPlane: 0,
  halleysAboveInvPlane: true,
  erosHeightAboveInvPlane: 0,
  erosAboveInvPlane: true,

  // Dynamic ascending nodes on invariable plane - J2000-verified values (primary, precess over time)
  mercuryAscendingNodeInvPlane: 0,
  venusAscendingNodeInvPlane: 0,
  earthAscendingNodeInvPlane: 0,
  marsAscendingNodeInvPlane: 0,
  jupiterAscendingNodeInvPlane: 0,
  saturnAscendingNodeInvPlane: 0,
  uranusAscendingNodeInvPlane: 0,
  neptuneAscendingNodeInvPlane: 0,
  plutoAscendingNodeInvPlane: 0,
  halleysAscendingNodeInvPlane: 0,
  erosAscendingNodeInvPlane: 0,

  // Dynamic ascending nodes on invariable plane - Souami & Souchay (2012) values (for comparison, precess over time)
  mercuryAscendingNodeInvPlaneSouamiSouchay: 0,
  venusAscendingNodeInvPlaneSouamiSouchay: 0,
  marsAscendingNodeInvPlaneSouamiSouchay: 0,
  jupiterAscendingNodeInvPlaneSouamiSouchay: 0,
  saturnAscendingNodeInvPlaneSouamiSouchay: 0,
  uranusAscendingNodeInvPlaneSouamiSouchay: 0,
  neptuneAscendingNodeInvPlaneSouamiSouchay: 0,
  plutoAscendingNodeInvPlaneSouamiSouchay: 0,
  halleysAscendingNodeInvPlaneSouamiSouchay: 0,
  erosAscendingNodeInvPlaneSouamiSouchay: 0,

  // Dynamic apparent inclination using J2000-verified ascending nodes
  // These match J2000 reference values exactly at year 2000
  mercuryApparentInclination: 0,
  venusApparentInclination: 0,
  marsApparentInclination: 0,
  jupiterApparentInclination: 0,
  saturnApparentInclination: 0,
  uranusApparentInclination: 0,
  neptuneApparentInclination: 0,
  plutoApparentInclination: 0,
  halleysApparentInclination: 0,
  erosApparentInclination: 0,

  // Dynamic apparent inclination using Souami & Souchay (2012) ascending nodes
  // For comparison with original published data
  mercuryApparentInclinationSouamiSouchay: 0,
  venusApparentInclinationSouamiSouchay: 0,
  marsApparentInclinationSouamiSouchay: 0,
  jupiterApparentInclinationSouamiSouchay: 0,
  saturnApparentInclinationSouamiSouchay: 0,
  uranusApparentInclinationSouamiSouchay: 0,
  neptuneApparentInclinationSouamiSouchay: 0,
  plutoApparentInclinationSouamiSouchay: 0,
  halleysApparentInclinationSouamiSouchay: 0,
  erosApparentInclinationSouamiSouchay: 0,

  Target: "",
  lookAtObj: {},
  
  testMode        : 'Range',         // 'Range' | 'List'
  testJDsText     : "2451717, 2627033, etc.",    // list of Julian Days you want to probe
  rangeStart      : startmodelJD-(meansolaryearlengthinDays*25200), 
  rangeEnd        : startmodelJD+(meansolaryearlengthinDays*23800),
  rangePieces     : ((25200+23800)/100)+1,
  runRATestToggle : false,
  _raTestBusy     : false,
  
  solMode        : 'Range',          // 'Range' | 'List'
  solYearsText   : '2000, 2005, etc.',
  solRangeStart  : 2000,
  solRangeEnd    : 2025,
  runSolToggle   : false,
  _solBusy       : false 
};

const params = { sizeBoost: 0 }; 

let predictions = {
  juliandaysbalancedJD: 0,
  lengthofDay: 0,
  lengthofsolarDay: 86400,
  lengthofsiderealDay: 0,
  lengthofstellarDay : 0,
  lengthofsiderealDayRealLOD: 0,
  lengthofstellarDayRealLOD: 0,
  predictedDeltat: 0,
  predictedDeltatPerYear: 0,
  lengthofsolarYear: 0,
  lengthofsolarYearinDays: 0,
  lengthofsiderealYear: 0,
  lengthofsiderealYearDays: 0,
  lengthofanomalisticYearinDays: 0,
  lengthofsolarYearSecRealLOD: 0,
  lengthofsiderealYearDaysRealLOD: 0,
  lengthofanomalisticDaysRealLOD: 0,
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
  lengthofAU: currentAUDistance,
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
  sun:     0xffae00,
  pluto:   0xc9b29a,
  halleys: 0x9ecbff,
  eros:    0x8e8074,
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

    // console.groupCollapsed('[Label Debug] render start');
    // console.log('starNamesVisible =', o.starNamesVisible);

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
    // console.log('Computed label scale:', finalScale.toFixed(3));

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

    // console.log(`Labels — total: ${totalLabels}, wanted: ${wantVisible}, shown: ${actuallyShown}`);
  };
})(labelRenderer, baseCamDistance);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5; // Try adjusting this
renderer.useLegacyLights = false

document.body.appendChild(renderer.domElement);

// Memory improvement: create one loader, one cache
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // for smoother motion, optional
controls.dampingFactor = 0.5;  // Lower = smoother, higher = snappier
controls.enableKeys = false;
controls.zoomSpeed = 8.0;
controls.dollySpeed = 8.0;

// Per-planet minimum distance multipliers (distance = radius * multiplier)
const cameraMinDistMultiplier = {
  'Sun': 5.0,
  'Earth': 2.5,
  'Moon': 6.0,
  'Mercury': 5.0,
  'Venus': 5.0,
  'Mars': 5.0,
  'Jupiter': 5.0,
  'Saturn': 5.0,
  'Uranus': 5.0,
  'Neptune': 5.0,
  'Pluto': 5.0,
  'default': 5.0
};

function getCameraMinDistMultiplier(name) {
  return cameraMinDistMultiplier[name] ?? cameraMinDistMultiplier['default'];
}

// Prevent zooming inside planets by intercepting wheel events
renderer.domElement.addEventListener('wheel', (event) => {
  // Skip zoom prevention when hierarchy inspector is controlling camera
  if (hierarchyInspector._cameraControlActive) return;

  if (!o.lookAtObj?.planetObj || !o.lookAtObj.size) return;

  // Get current distance from camera to target
  const currentDistance = camera.position.distanceTo(controls.target);

  // Calculate minimum distance based on planet's visual size
  // Use rotationAxis scale (where blow-up slider applies) not planetObj scale
  const scale = o.lookAtObj.rotationAxis?.scale?.x ?? 1;
  const visualRadius = o.lookAtObj.size * scale;
  const multiplier = getCameraMinDistMultiplier(o.lookAtObj.name);
  const minDistance = visualRadius * multiplier;

  // If zooming in and already at or below minimum, block it
  // deltaY < 0 = scroll up = zoom in (on most systems)
  const zoomingIn = event.deltaY < 0;
  if (zoomingIn && currentDistance <= minDistance * 1.1) {
    event.preventDefault();
    event.stopPropagation();
  }
}, { passive: false, capture: true });

//*************************************************************
// CREATE AND CONFIGURE PLANETS
//*************************************************************
//First add the default settings of the planets
planetObjects.forEach(obj => createPlanet(obj));
updatePlanetSizes(0);

//Now adding the order of all objects 
startingPoint.pivotObj.add(earth.containerObj);

earth.pivotObj.add(earthInclinationPrecession.containerObj);
earthInclinationPrecession.pivotObj.add(midEccentricityOrbit.containerObj);
earthInclinationPrecession.pivotObj.add(earthEclipticPrecession.containerObj);
earthEclipticPrecession.pivotObj.add(earthObliquityPrecession.containerObj);
earthObliquityPrecession.pivotObj.add(earthPerihelionPrecession1.containerObj);
earthPerihelionPrecession1.pivotObj.add(earthPerihelionPrecession2.containerObj);
earthPerihelionPrecession2.pivotObj.add(barycenterEarthAndSun.containerObj);

barycenterEarthAndSun.pivotObj.add(sun.containerObj);
barycenterEarthAndSun.pivotObj.add(earthPerihelionFromEarth.containerObj);

earth.pivotObj.add(moonApsidalPrecession.containerObj);
moonApsidalPrecession.pivotObj.add(moonApsidalNodalPrecession1.containerObj);
moonApsidalNodalPrecession1.pivotObj.add(moonApsidalNodalPrecession2.containerObj);
moonApsidalNodalPrecession2.pivotObj.add(moonRoyerCyclePrecession.containerObj);
moonRoyerCyclePrecession.pivotObj.add(moonNodalPrecession.containerObj);
moonNodalPrecession.pivotObj.add(moon.containerObj);

barycenterEarthAndSun.pivotObj.add(mercuryPerihelionDurationEcliptic1.containerObj);
mercuryPerihelionDurationEcliptic1.pivotObj.add(mercuryPerihelionFromEarth.containerObj);
mercuryPerihelionFromEarth.pivotObj.add(mercuryPerihelionDurationEcliptic2.containerObj);
mercuryPerihelionDurationEcliptic2.pivotObj.add(mercuryRealPerihelionAtSun.containerObj);
mercuryRealPerihelionAtSun.pivotObj.add(mercury.containerObj);

mercuryPerihelionDurationEcliptic2.pivotObj.add(mercuryFixedPerihelionAtSun.containerObj);

barycenterEarthAndSun.pivotObj.add(venusPerihelionDurationEcliptic1.containerObj);
venusPerihelionDurationEcliptic1.pivotObj.add(venusPerihelionFromEarth.containerObj);
venusPerihelionFromEarth.pivotObj.add(venusPerihelionDurationEcliptic2.containerObj);
venusPerihelionDurationEcliptic2.pivotObj.add(venusRealPerihelionAtSun.containerObj);
venusRealPerihelionAtSun.pivotObj.add(venus.containerObj);

venusPerihelionDurationEcliptic2.pivotObj.add(venusFixedPerihelionAtSun.containerObj);

barycenterEarthAndSun.pivotObj.add(marsPerihelionDurationEcliptic1.containerObj);
marsPerihelionDurationEcliptic1.pivotObj.add(marsPerihelionFromEarth.containerObj);
marsPerihelionFromEarth.pivotObj.add(marsPerihelionDurationEcliptic2.containerObj);
marsPerihelionDurationEcliptic2.pivotObj.add(marsRealPerihelionAtSun.containerObj);
marsRealPerihelionAtSun.pivotObj.add(mars.containerObj);

marsPerihelionDurationEcliptic2.pivotObj.add(marsFixedPerihelionAtSun.containerObj);

barycenterEarthAndSun.pivotObj.add(jupiterPerihelionDurationEcliptic1.containerObj);
jupiterPerihelionDurationEcliptic1.pivotObj.add(jupiterPerihelionFromEarth.containerObj);
jupiterPerihelionFromEarth.pivotObj.add(jupiterPerihelionDurationEcliptic2.containerObj);
jupiterPerihelionDurationEcliptic2.pivotObj.add(jupiterRealPerihelionAtSun.containerObj);
jupiterRealPerihelionAtSun.pivotObj.add(jupiter.containerObj);

jupiterPerihelionDurationEcliptic2.pivotObj.add(jupiterFixedPerihelionAtSun.containerObj);

barycenterEarthAndSun.pivotObj.add(saturnPerihelionDurationEcliptic1.containerObj);
saturnPerihelionDurationEcliptic1.pivotObj.add(saturnPerihelionFromEarth.containerObj);
saturnPerihelionFromEarth.pivotObj.add(saturnPerihelionDurationEcliptic2.containerObj);
saturnPerihelionDurationEcliptic2.pivotObj.add(saturnRealPerihelionAtSun.containerObj);
saturnRealPerihelionAtSun.pivotObj.add(saturn.containerObj);

saturnPerihelionDurationEcliptic2.pivotObj.add(saturnFixedPerihelionAtSun.containerObj);

barycenterEarthAndSun.pivotObj.add(uranusPerihelionDurationEcliptic1.containerObj);
uranusPerihelionDurationEcliptic1.pivotObj.add(uranusPerihelionFromEarth.containerObj);
uranusPerihelionFromEarth.pivotObj.add(uranusPerihelionDurationEcliptic2.containerObj);
uranusPerihelionDurationEcliptic2.pivotObj.add(uranusRealPerihelionAtSun.containerObj);
uranusRealPerihelionAtSun.pivotObj.add(uranus.containerObj);

uranusPerihelionDurationEcliptic2.pivotObj.add(uranusFixedPerihelionAtSun.containerObj);

barycenterEarthAndSun.pivotObj.add(neptunePerihelionDurationEcliptic1.containerObj);
neptunePerihelionDurationEcliptic1.pivotObj.add(neptunePerihelionFromEarth.containerObj);
neptunePerihelionFromEarth.pivotObj.add(neptunePerihelionDurationEcliptic2.containerObj);
neptunePerihelionDurationEcliptic2.pivotObj.add(neptuneRealPerihelionAtSun.containerObj);
neptuneRealPerihelionAtSun.pivotObj.add(neptune.containerObj);

neptunePerihelionDurationEcliptic2.pivotObj.add(neptuneFixedPerihelionAtSun.containerObj);

barycenterEarthAndSun.pivotObj.add(plutoPerihelionDurationEcliptic1.containerObj);
plutoPerihelionDurationEcliptic1.pivotObj.add(plutoPerihelionFromEarth.containerObj);
plutoPerihelionFromEarth.pivotObj.add(plutoPerihelionDurationEcliptic2.containerObj);
plutoPerihelionDurationEcliptic2.pivotObj.add(plutoRealPerihelionAtSun.containerObj);
plutoRealPerihelionAtSun.pivotObj.add(pluto.containerObj);

plutoPerihelionDurationEcliptic2.pivotObj.add(plutoFixedPerihelionAtSun.containerObj);

barycenterEarthAndSun.pivotObj.add(halleysPerihelionDurationEcliptic1.containerObj);
halleysPerihelionDurationEcliptic1.pivotObj.add(halleysPerihelionFromEarth.containerObj);
halleysPerihelionFromEarth.pivotObj.add(halleysPerihelionDurationEcliptic2.containerObj);
halleysPerihelionDurationEcliptic2.pivotObj.add(halleysRealPerihelionAtSun.containerObj);
halleysRealPerihelionAtSun.pivotObj.add(halleys.containerObj);

halleysPerihelionDurationEcliptic2.pivotObj.add(halleysFixedPerihelionAtSun.containerObj);

barycenterEarthAndSun.pivotObj.add(erosPerihelionDurationEcliptic1.containerObj);
erosPerihelionDurationEcliptic1.pivotObj.add(erosPerihelionFromEarth.containerObj);
erosPerihelionFromEarth.pivotObj.add(erosPerihelionDurationEcliptic2.containerObj);
erosPerihelionDurationEcliptic2.pivotObj.add(erosRealPerihelionAtSun.containerObj);
erosRealPerihelionAtSun.pivotObj.add(eros.containerObj);

erosPerihelionDurationEcliptic2.pivotObj.add(erosFixedPerihelionAtSun.containerObj);

// The model starts on 21 june and not at 0 degrees (March equinox) so we need to turn it 90 degrees
// Why 21 june 2000?
// a) We need a solstice date
// b) We need to be able to point to polaris + pointing to the EARTH-WOBBLE-CENTER at RA 6h
// c) Close to J2000 values so we can check and compare all values
earth.containerObj.rotation.y = (Math.PI/2)*whichSolsticeOrEquinox;
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
    obj.perihelionDistAU = "";
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

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.castShadow = true;

// Optional: adjust shadow quality
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.bias = -0.0001;
sunLight.shadow.radius = 1;
sunLight.shadow.camera.far = 1000; // Increase only if necessary

// Optional: helper for debugging shadow frustum
//const shadowCameraHelper = new THREE.CameraHelper(sunLight.shadow.camera);
//scene.add(shadowCameraHelper);

// Add the light to the scene
scene.add(sunLight);
scene.add(sunLight.target);

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

const zLabelGeometry = new THREE.RingGeometry(235, 250, 64);
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
zodiac.position.z = -(eccentricityAmplitude*Math.PI*2)/(holisticyearLength/13)*(startmodelyearwithCorrection-(perihelionalignmentYear-(1.5*(holisticyearLength/16))+(Math.round((startmodelyearwithCorrection-perihelionalignmentYear+((1.5*(holisticyearLength/16))))/(holisticyearLength/156)))*(holisticyearLength/156)))*100; //To align to start Aquarius
zodiac.visible = false;

// Add Glow effect of zodiac (64 segments is sufficient for a smooth glow ring)
const glowGeometry = new THREE.RingGeometry(255, 265, 64);
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
// INVARIABLE PLANE VISUALIZATION
//*************************************************************

// Helper function to create the invariable plane (tilted grid/disc)
function createInvariablePlaneVisualization(size = 500, divisions = 20) {
  const group = new THREE.Group();
  group.name = 'InvariablePlaneVisualization';

  const MEAN_INCLINATION_RAD = earthinclinationMean * Math.PI / 180;

  // Phase offset to align HIGH/LOW/MEAN markers with zodiac signs
  // Uses global inclinationPathZodiacOffsetDeg constant
  const MARKER_PHASE_OFFSET = inclinationPathZodiacOffsetDeg * Math.PI / 180;

  // Grid helper (tilted to represent invariable plane) - fewer divisions for performance
  // Use a more visible purple/magenta color to distinguish from ecliptic
  const gridHelper = new THREE.GridHelper(size, divisions, 0xaa44aa, 0x663366);
  gridHelper.material.opacity = 0.4;
  gridHelper.material.transparent = true;
  gridHelper.rotation.x = -MEAN_INCLINATION_RAD; // Tilt DOWN from ecliptic
  group.add(gridHelper);

  // Solid disc for better visibility (fewer segments) - purple tint
  const discGeometry = new THREE.CircleGeometry(size / 2, 32);
  const discMaterial = new THREE.MeshBasicMaterial({
    color: 0x8844aa,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  });
  const disc = new THREE.Mesh(discGeometry, discMaterial);
  disc.rotation.x = -Math.PI / 2 - MEAN_INCLINATION_RAD;
  group.add(disc);

  // Edge ring - thicker and more visible (magenta)
  const ringGeometry = new THREE.RingGeometry(size/2 - 4, size/2, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xff44ff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2 - MEAN_INCLINATION_RAD;
  group.add(ring);

  // Add a "tilt indicator" using a cylinder (tube) for better visibility
  // This shows the tilt axis - from lowest point to highest point
  const halfSize = size / 2;
  const tubeRadius = 3;
  const tubeLength = size * 0.9;
  const indicatorGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLength, 8);
  const indicatorMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.8
  });
  const indicatorTube = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
  // Cylinder is vertical by default, rotate to horizontal along X axis
  indicatorTube.rotation.z = Math.PI / 2;
  // Then apply the tilt
  indicatorTube.rotation.x = -MEAN_INCLINATION_RAD;
  // Apply the same phase offset as the markers (rotate around Y axis, negated)
  indicatorTube.rotation.y = -MARKER_PHASE_OFFSET;
  group.add(indicatorTube);

  // Add a second tube at 90° for the MEAN axis (magenta color to match mean markers)
  // This creates a cross showing both HIGH-LOW axis and MEAN-MEAN axis
  const meanIndicatorGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLength, 8);
  const meanIndicatorMaterial = new THREE.MeshBasicMaterial({
    color: 0xff88ff, // Magenta to match mean markers
    transparent: true,
    opacity: 0.8
  });
  const meanIndicatorTube = new THREE.Mesh(meanIndicatorGeometry, meanIndicatorMaterial);
  // Cylinder is vertical by default, rotate to horizontal along X axis
  meanIndicatorTube.rotation.z = Math.PI / 2;
  // Apply phase offset + 90° to be perpendicular to the HIGH-LOW axis
  meanIndicatorTube.rotation.y = -MARKER_PHASE_OFFSET - Math.PI / 2;
  group.add(meanIndicatorTube);

  // Add larger spheres at the high and low points of the tilt
  const markerGeom = new THREE.SphereGeometry(12, 12, 12); // Larger spheres

  // Calculate inclination range values
  const maxInclination = earthinclinationMean + tiltandinclinationAmplitude; // 2.059°
  const minInclination = earthinclinationMean - tiltandinclinationAmplitude; // 0.931°

  // High point marker (yellow) - where Earth reaches MAXIMUM inclination (2.059°)
  const highMarkerMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const highMarker = new THREE.Mesh(markerGeom, highMarkerMat);
  // Position at edge of disc, rotated by MARKER_PHASE_OFFSET for zodiac alignment
  const markerDist = halfSize * 0.95;
  // HIGH is at angle 0 + offset, LOW is at angle π + offset
  const highAngle = MARKER_PHASE_OFFSET;
  const highXpos = Math.cos(highAngle) * markerDist;
  const highZpos = Math.sin(highAngle) * markerDist;
  const highYpos = Math.sin(MEAN_INCLINATION_RAD) * Math.cos(highAngle) * markerDist; // Y from tilt
  highMarker.position.set(Math.cos(MEAN_INCLINATION_RAD) * highXpos, highYpos, highZpos);
  group.add(highMarker);

  // Low point marker (cyan) - where Earth reaches MINIMUM inclination (0.931°)
  const lowMarkerMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const lowMarker = new THREE.Mesh(markerGeom, lowMarkerMat);
  const lowAngle = Math.PI + MARKER_PHASE_OFFSET;
  const lowXpos = Math.cos(lowAngle) * markerDist;
  const lowZpos = Math.sin(lowAngle) * markerDist;
  const lowYpos = Math.sin(MEAN_INCLINATION_RAD) * Math.cos(lowAngle) * markerDist;
  lowMarker.position.set(Math.cos(MEAN_INCLINATION_RAD) * lowXpos, lowYpos, lowZpos);
  group.add(lowMarker);

  // Add labels for high/low points with inclination values
  const highLabelDiv = document.createElement('div');
  highLabelDiv.innerHTML = '<span style="font-size:16px;font-weight:bold;">HIGH</span><br>' + maxInclination.toFixed(4) + '°';
  highLabelDiv.style.color = '#ffff00';
  highLabelDiv.style.fontSize = '14px';
  highLabelDiv.style.fontFamily = 'Arial, sans-serif';
  highLabelDiv.style.textShadow = '2px 2px 4px black, -1px -1px 2px black';
  highLabelDiv.style.pointerEvents = 'none';
  highLabelDiv.style.textAlign = 'center';
  highLabelDiv.style.lineHeight = '1.3';
  highLabelDiv.style.display = 'none'; // Hidden by default
  const highLabelObj = new CSS2DObject(highLabelDiv);
  highLabelObj.position.set(Math.cos(MEAN_INCLINATION_RAD) * highXpos, highYpos + 20, highZpos);
  group.add(highLabelObj);

  const lowLabelDiv = document.createElement('div');
  lowLabelDiv.innerHTML = '<span style="font-size:16px;font-weight:bold;">LOW</span><br>' + minInclination.toFixed(4) + '°';
  lowLabelDiv.style.color = '#00ffff';
  lowLabelDiv.style.fontSize = '14px';
  lowLabelDiv.style.fontFamily = 'Arial, sans-serif';
  lowLabelDiv.style.textShadow = '2px 2px 4px black, -1px -1px 2px black';
  lowLabelDiv.style.pointerEvents = 'none';
  lowLabelDiv.style.textAlign = 'center';
  lowLabelDiv.style.lineHeight = '1.3';
  lowLabelDiv.style.display = 'none'; // Hidden by default
  const lowLabelObj = new CSS2DObject(lowLabelDiv);
  lowLabelObj.position.set(Math.cos(MEAN_INCLINATION_RAD) * lowXpos, lowYpos - 20, lowZpos);
  group.add(lowLabelObj);

  // Add mean labels perpendicular to tilt axis (rotated by MARKER_PHASE_OFFSET)
  // These show where Earth crosses the mean inclination
  const meanMarkerGeom = new THREE.SphereGeometry(10, 12, 12);
  const meanMarkerMat = new THREE.MeshBasicMaterial({ color: 0xff88ff }); // Magenta

  // Mean markers at 90° and 270° from HIGH, plus the offset
  const mean1Angle = Math.PI / 2 + MARKER_PHASE_OFFSET;
  const mean2Angle = 3 * Math.PI / 2 + MARKER_PHASE_OFFSET;
  const mean1X = Math.cos(mean1Angle) * markerDist;
  const mean1Z = Math.sin(mean1Angle) * markerDist;
  const mean2X = Math.cos(mean2Angle) * markerDist;
  const mean2Z = Math.sin(mean2Angle) * markerDist;

  // Mean marker 1
  const meanMarker1 = new THREE.Mesh(meanMarkerGeom, meanMarkerMat);
  meanMarker1.position.set(mean1X, 0, mean1Z);
  group.add(meanMarker1);

  // Mean marker 2
  const meanMarker2 = new THREE.Mesh(meanMarkerGeom, meanMarkerMat);
  meanMarker2.position.set(mean2X, 0, mean2Z);
  group.add(meanMarker2);

  // Mean labels
  const meanLabel1Div = document.createElement('div');
  meanLabel1Div.innerHTML = '<span style="font-size:14px;font-weight:bold;">MEAN</span><br>' + earthinclinationMean.toFixed(4) + '°';
  meanLabel1Div.style.color = '#ff88ff';
  meanLabel1Div.style.fontSize = '12px';
  meanLabel1Div.style.fontFamily = 'Arial, sans-serif';
  meanLabel1Div.style.textShadow = '2px 2px 4px black, -1px -1px 2px black';
  meanLabel1Div.style.pointerEvents = 'none';
  meanLabel1Div.style.textAlign = 'center';
  meanLabel1Div.style.lineHeight = '1.3';
  meanLabel1Div.style.display = 'none'; // Hidden by default
  const meanLabel1Obj = new CSS2DObject(meanLabel1Div);
  meanLabel1Obj.position.set(mean1X, 15, mean1Z);
  group.add(meanLabel1Obj);

  const meanLabel2Div = document.createElement('div');
  meanLabel2Div.innerHTML = '<span style="font-size:14px;font-weight:bold;">MEAN</span><br>' + earthinclinationMean.toFixed(4) + '°';
  meanLabel2Div.style.color = '#ff88ff';
  meanLabel2Div.style.fontSize = '12px';
  meanLabel2Div.style.fontFamily = 'Arial, sans-serif';
  meanLabel2Div.style.textShadow = '2px 2px 4px black, -1px -1px 2px black';
  meanLabel2Div.style.pointerEvents = 'none';
  meanLabel2Div.style.textAlign = 'center';
  meanLabel2Div.style.lineHeight = '1.3';
  meanLabel2Div.style.display = 'none'; // Hidden by default
  const meanLabel2Obj = new CSS2DObject(meanLabel2Div);
  meanLabel2Obj.position.set(mean2X, 15, mean2Z);
  group.add(meanLabel2Obj);

  // Store references to all labels for visibility control
  // Store both the div elements and CSS2DObject instances
  group.userData.highLabelDiv = highLabelDiv;
  group.userData.lowLabelDiv = lowLabelDiv;
  group.userData.meanLabel1Div = meanLabel1Div;
  group.userData.meanLabel2Div = meanLabel2Div;
  group.userData.highLabelObj = highLabelObj;
  group.userData.lowLabelObj = lowLabelObj;
  group.userData.meanLabel1Obj = meanLabel1Obj;
  group.userData.meanLabel2Obj = meanLabel2Obj;

  // Set all CSS2DObjects to not visible initially (this is what the patched renderer checks)
  highLabelObj.visible = false;
  lowLabelObj.visible = false;
  meanLabel1Obj.visible = false;
  meanLabel2Obj.visible = false;

  return group;
}

// Helper function to create the inclination path (wobble curve)
// The path should align with zodiac so mean crossings are at Cancer/Capricorn (solstice axis)
function createInclinationPath(radius = 250, numPoints = 120, yScale = 50) {
  const group = new THREE.Group();
  group.name = 'InclinationPath';

  const points = [];
  const colors = [];
  const CYCLE_LENGTH = holisticyearLength / 3; // 99,392 years

  // Phase offset to align the path with the zodiac
  // The path is now a child of zodiac, so it's in zodiac's local coordinate system.
  // Uses global inclinationPathZodiacOffsetDeg constant
  const PHASE_OFFSET = Math.PI + inclinationPathZodiacOffsetDeg * Math.PI / 180;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const year = balancedYear + t * CYCLE_LENGTH;

    const incl = computeInclinationEarth(
      year, balancedYear, holisticyearLength,
      earthinclinationMean, tiltandinclinationAmplitude
    );

    // Calculate angle with phase offset
    // Negate to make marker move counterclockwise (same direction as Earth's orbit)
    const angle = -(t * Math.PI * 2) + PHASE_OFFSET;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const deviationFromMean = incl - earthinclinationMean;
    // Higher inclination (further from invariable plane) = HIGHER in visualization (positive Y)
    const y = deviationFromMean * yScale;

    points.push(new THREE.Vector3(x, y, z));

    // Color: yellow at max incl, blue at min incl
    const minIncl = earthinclinationMean - tiltandinclinationAmplitude;
    const maxIncl = earthinclinationMean + tiltandinclinationAmplitude;
    const norm = (incl - minIncl) / (maxIncl - minIncl);
    colors.push(norm, norm * 0.8, 1 - norm * 0.5);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 });
  const pathLine = new THREE.Line(geometry, material);
  group.add(pathLine);

  // Current position marker group (contains sphere, arrow, and label)
  const markerGroup = new THREE.Group();
  markerGroup.name = 'CurrentInclinationMarker';

  // Yellow sphere
  const markerGeom = new THREE.SphereGeometry(3, 8, 8);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const markerSphere = new THREE.Mesh(markerGeom, markerMat);
  markerGroup.add(markerSphere);

  // Direction arrow (points in direction of motion along the path)
  const arrowLength = 25;
  const arrowHeadLength = 8;
  const arrowHeadWidth = 5;
  const arrowDir = new THREE.Vector3(1, 0, 0); // Will be updated dynamically
  const arrowOrigin = new THREE.Vector3(0, 0, 0);
  const arrowHelper = new THREE.ArrowHelper(arrowDir, arrowOrigin, arrowLength, 0xff8800, arrowHeadLength, arrowHeadWidth);
  arrowHelper.name = 'DirectionArrow';
  markerGroup.add(arrowHelper);

  // Inclination value label (using CSS2DObject for crisp text)
  const labelDiv = document.createElement('div');
  labelDiv.className = 'inclination-label';
  labelDiv.style.color = '#ffff00';
  labelDiv.style.fontSize = '14px';
  labelDiv.style.fontFamily = 'Arial, sans-serif';
  labelDiv.style.fontWeight = 'bold';
  labelDiv.style.textShadow = '1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black';
  labelDiv.style.pointerEvents = 'none';
  labelDiv.style.whiteSpace = 'nowrap';
  labelDiv.textContent = '';
  const labelObject = new CSS2DObject(labelDiv);
  labelObject.position.set(0, 12, 0); // Position above the marker
  labelObject.name = 'InclinationLabel';
  labelObject.visible = false; // Hidden initially (patched renderer checks this)
  markerGroup.add(labelObject);

  // Hide marker group initially (will be shown when path becomes visible)
  markerGroup.visible = false;

  group.add(markerGroup);

  // Store references for update function
  group.userData.marker = markerGroup;
  group.userData.markerSphere = markerSphere;
  group.userData.arrowHelper = arrowHelper;
  group.userData.labelObject = labelObject;
  group.userData.labelDiv = labelDiv;
  group.userData.radius = radius;
  group.userData.yScale = yScale;
  group.userData.phaseOffset = PHASE_OFFSET;

  return group;
}

// Update function for inclination path marker (called in render loop, throttled)
let _lastInclinationUpdateYear = null;
const _inclinationArrowDir = new THREE.Vector3(); // Reusable vector for arrow direction
function updateInclinationPathMarker() {
  const marker = inclinationPathGroup.userData.marker;
  const labelDiv = inclinationPathGroup.userData.labelDiv;
  const labelObject = inclinationPathGroup.userData.labelObject;

  // Hide marker and label when path is not visible
  if (!inclinationPathGroup.visible) {
    if (marker.visible) {
      marker.visible = false;
      labelObject.visible = false; // Use CSS2DObject.visible (patched renderer checks this)
    }
    return;
  }

  // Check if this is a fresh show (marker was hidden, now path is visible)
  const needsImmediateUpdate = !marker.visible;

  // Throttle: only update if year changed significantly (0.1 year = ~36 days)
  // But always update on fresh show
  if (!needsImmediateUpdate && _lastInclinationUpdateYear !== null &&
      Math.abs(o.currentYear - _lastInclinationUpdateYear) < 0.1) {
    return;
  }
  _lastInclinationUpdateYear = o.currentYear;

  const arrowHelper = inclinationPathGroup.userData.arrowHelper;
  const radius = inclinationPathGroup.userData.radius;
  const yScale = inclinationPathGroup.userData.yScale;
  const phaseOffset = inclinationPathGroup.userData.phaseOffset || 0;

  const CYCLE_LENGTH = holisticyearLength / 3;
  let progress = ((o.currentYear - balancedYear) % CYCLE_LENGTH) / CYCLE_LENGTH;
  if (progress < 0) progress += 1;

  // Apply same angle calculation as the path (negated for counterclockwise motion)
  const angle = -(progress * Math.PI * 2) + phaseOffset;
  const deviation = o.inclinationEarth - earthinclinationMean;

  // Higher inclination = higher Y (positive deviation = above mean line)
  const x = Math.cos(angle) * radius;
  const y = deviation * yScale;
  const z = Math.sin(angle) * radius;

  // Set position BEFORE showing marker (prevents flash at wrong position)
  marker.position.set(x, y, z);

  // Now show marker if it was hidden (label will be shown after text is set)
  if (needsImmediateUpdate) {
    marker.visible = true;
  }

  // Calculate direction of motion (tangent to path, pointing counterclockwise)
  // Derivative of position with respect to angle (negated because angle decreases with time)
  // dx/dangle = -sin(angle) * radius, dz/dangle = cos(angle) * radius
  // But since angle = -progress*2π, motion is in direction of increasing angle visually
  // The tangent pointing in direction of motion (counterclockwise):
  const tangentX = Math.sin(angle) * radius;  // -d(cos)/dangle = sin
  const tangentZ = -Math.cos(angle) * radius; // d(sin)/dangle = cos, negated for CCW

  // Also include Y component based on rate of change of inclination
  // At progress p, inclination uses cos, so derivative is sin (positive when rising)
  const progressNext = progress + 0.001;
  const angleNext = -(progressNext * Math.PI * 2) + phaseOffset;
  const yearNext = balancedYear + progressNext * CYCLE_LENGTH;
  const inclNext = computeInclinationEarth(yearNext, balancedYear, holisticyearLength, earthinclinationMean, tiltandinclinationAmplitude);
  const deviationNext = inclNext - earthinclinationMean;
  const tangentY = (deviationNext - deviation) * yScale * 1000; // Scale for visibility

  _inclinationArrowDir.set(tangentX, tangentY, tangentZ).normalize();
  arrowHelper.setDirection(_inclinationArrowDir);

  // Update inclination label with current value
  labelDiv.textContent = o.inclinationEarth.toFixed(3) + '°';

  // Show label after all updates are complete (if this was a fresh show)
  // This happens after position, arrow direction, and text are all set
  if (needsImmediateUpdate) {
    labelObject.visible = true; // Use CSS2DObject.visible (patched renderer checks this)
  }
}

// Update invariable plane Y position based on current inclination
// The invariable plane should appear BELOW Earth when inclination > mean
// and ABOVE Earth when inclination < mean
// This makes Earth visually "above" or "below" the invariable plane correctly
function updateInvariablePlanePosition() {
  if (!invariablePlaneGroup || !invariablePlaneGroup.visible) return;

  // Use same yScale as inclination path (50)
  const yScale = 50;
  const deviation = o.inclinationEarth - earthinclinationMean;

  // Offset the invariable plane DOWN when Earth is above mean (positive deviation)
  // So Earth appears ABOVE the plane
  invariablePlaneGroup.position.y = -deviation * yScale;
}

// Create invariable plane (tilted grid/disc)
const invariablePlaneGroup = createInvariablePlaneVisualization(o.starDistance * 2, 30);
earth.pivotObj.add(invariablePlaneGroup);
invariablePlaneGroup.visible = false; // Off by default (labels also hidden by default)

// Create inclination path (wobble curve showing 99,392-year cycle)
// Add to earth.pivotObj (same as zodiac) so it can be toggled independently
// The rotation is applied in moveModel() to match zodiac alignment
const inclinationPathGroup = createInclinationPath(250, 360, 50);
earth.pivotObj.add(inclinationPathGroup);
inclinationPathGroup.visible = false; // Off by default

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

o.lookAtObj = earth;
let currPos; 

let lastFrameTime = 0;
let smoothedFps   = 60;
let lastCameraX   = 0, lastCameraY = 0, lastCameraZ = 0;
let lowPerformanceMode = false;

// At the top of your file, create reusable vectors
const centerPosVec = new THREE.Vector3();
const starPosVec  = new THREE.Vector3();
const scaleVec = new THREE.Vector3();
const _tempVec = new THREE.Vector3();

/* scratch vectors – avoid per-frame allocations */
const tmp1 = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const tmp3 = new THREE.Vector3();

let cameraWorldPos = new THREE.Vector3();

const tmpVec = new THREE.Vector3();

const _ctrWS  = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _scale  = new THREE.Vector3();

const _sunWS      = new THREE.Vector3();          // Sun (world space)
const _planetWS   = new THREE.Vector3();          // Planet (world space)
const _cornersLS  = [...Array(8)].map(() => new THREE.Vector3());
const _wsBox      = new THREE.Box3();
const _lsBox      = new THREE.Box3();             // Light-space AABB (reusable)
const _invMat     = new THREE.Matrix4();
const _camDir     = new THREE.Vector3();          // Camera direction (reusable in render loop)

const EARTH_POS    = new THREE.Vector3();   // Earth centre (world)
const SUN_POS      = new THREE.Vector3();   // Sun   centre (world)
const WOBBLE_POS  = new THREE.Vector3();   // WOBBLE   centre (world)
const PERIHELION_OF_EARTH_POS  = new THREE.Vector3();   // PERIHELION-OF-EARTH   centre (world)
const DELTA        = new THREE.Vector3();   // reusable difference-vector
const LOCAL        = new THREE.Vector3();   // world-to-Earth local
const CAM_LOCAL    = new THREE.Vector3();   // camera in Earth local
const CAMERA_POS   = new THREE.Vector3();
const PLANET_POS   = new THREE.Vector3();
const LOOK_DIR     = new THREE.Vector3();
const SPHERICAL    = new THREE.Spherical();

// Reusable vectors for updateFlares()
const _flareSunPos   = new THREE.Vector3();
const _flareCamPos   = new THREE.Vector3();
const _flareCamDir   = new THREE.Vector3();
const _flareToSun    = new THREE.Vector3();
const _flareLineDir  = new THREE.Vector3();
const _flarePos      = new THREE.Vector3();

// Reusable vector for tracePlanet()
const _tracePos = new THREE.Vector3();

const _elSunPos = new THREE.Vector3();
const _elEarthPos = new THREE.Vector3();
const _elTargetPos = new THREE.Vector3();

// Pooled vectors for dynamic inclination calculations
const _eclipticNormalVerified = new THREE.Vector3();
const _eclipticNormalSS = new THREE.Vector3();
const _planetNormal = new THREE.Vector3();

const world = new THREE.Vector3();
const ndc   = new THREE.Vector3();

const _pos        = new THREE.Vector3();
const _camPos     = new THREE.Vector3();
const _starPos    = new THREE.Vector3();
const _linePos    = new THREE.Vector3();

const starsArr = sceneObjects.stars.children;
const constArr = sceneObjects.constellations.children;

let tlapsed = 0;
let posElapsed =0;
let domElapsed =0;  // Separate throttle for DOM label updates (5 Hz)
let uiElapsed =0;
let lightElapsed =0;
let updatePredictionElapsed = 0;
let astroCalcElapsed = 0;  // Throttle for heavy astronomical calculations (10 Hz)
let visualElapsed = 0;  // Throttle for visual effects (30 Hz)

let cameraMoved = true; // Force first update
let positionChanged = false; // Set true when date/time changed externally (GUI, jump, etc.)
let eggTriggered = false;

const DEG = Math.PI / 180;
const KM_TO_MI = 0.62137119;   // 1 kilometre  → 0.621 371 miles

const state = {
  prevJD  : startmodelJD,     // JD at previous animation tick
  deltaT  : deltaTStart    // accumulated ΔT (seconds)
};

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

/* ------------------------------------------------------------------ */
/*  Static value cache for planetStats performance optimization       */
/*  Values with static:true are computed once when planet changes     */
/* ------------------------------------------------------------------ */
const staticValueCache = {};  // { planetName: { rowIndex: renderedHTML } }
const niceName = s => s.charAt(0).toUpperCase() + s.slice(1);

const PLANET_SYMBOL = {
  sun     : '☉',   mercury : '☿',  venus  : '♀',
  earth   : '♁',   moon    : '☾',
  mars    : '♂',   jupiter : '♃',  saturn : '♄',
  uranus  : '♅',   neptune : '♆',  pluto  : '♇'
};

// put every "big-radius" object that must expand / shrink together in one array
const scalableObjects = [
  sceneObjects.stars,
  sceneObjects.constellations,
  celestialSphere,
  plane,
  invariablePlaneGroup,
  inclinationPathGroup
];

//const baseCamDistance = camera.position.length(); // distance that feels “100 %” size
const zoomFactor = 1.0;   // identical to your star-label code
const minScale   = 0.01;   // clamp values to taste
const maxScale   = 0.9;

const label        = document.getElementById('planetLabel');
const labelContent = label.querySelector('.labelContent');

//*************************************************************
// PLANET HIERARCHY INSPECTOR
//*************************************************************

// Planet registry - maps planet names to their hierarchy chain
const PLANET_HIERARCHIES = {
  mercury: {
    label: 'Mercury',
    fixedPerihelion: () => mercuryFixedPerihelionAtSun,
    perihelionOf: () => mercuryPerihelionFromEarth,
    steps: () => [
      { obj: mercuryPerihelionDurationEcliptic1, name: 'mercuryPerihelionDurationEcliptic1', parentName: 'startingPoint' },
      { obj: mercuryPerihelionFromEarth, name: 'mercuryPerihelionFromEarth', parentName: 'mercuryPerihelionDurationEcliptic1' },
      { obj: mercuryPerihelionDurationEcliptic2, name: 'mercuryPerihelionDurationEcliptic2', parentName: 'mercuryPerihelionFromEarth' },
      { obj: mercuryRealPerihelionAtSun, name: 'mercuryRealPerihelionAtSun', parentName: 'mercuryPerihelionDurationEcliptic2' },
      { obj: mercury, name: 'mercury', parentName: 'mercuryRealPerihelionAtSun' }
    ]
  },
  venus: {
    label: 'Venus',
    fixedPerihelion: () => venusFixedPerihelionAtSun,
    perihelionOf: () => venusPerihelionFromEarth,
    steps: () => [
      { obj: venusPerihelionDurationEcliptic1, name: 'venusPerihelionDurationEcliptic1', parentName: 'startingPoint' },
      { obj: venusPerihelionFromEarth, name: 'venusPerihelionFromEarth', parentName: 'venusPerihelionDurationEcliptic1' },
      { obj: venusPerihelionDurationEcliptic2, name: 'venusPerihelionDurationEcliptic2', parentName: 'venusPerihelionFromEarth' },
      { obj: venusRealPerihelionAtSun, name: 'venusRealPerihelionAtSun', parentName: 'venusPerihelionDurationEcliptic2' },
      { obj: venus, name: 'venus', parentName: 'venusRealPerihelionAtSun' }
    ]
  },
  mars: {
    label: 'Mars',
    fixedPerihelion: () => marsFixedPerihelionAtSun,
    perihelionOf: () => marsPerihelionFromEarth,
    steps: () => [
      { obj: marsPerihelionDurationEcliptic1, name: 'marsPerihelionDurationEcliptic1', parentName: 'startingPoint' },
      { obj: marsPerihelionFromEarth, name: 'marsPerihelionFromEarth', parentName: 'marsPerihelionDurationEcliptic1' },
      { obj: marsPerihelionDurationEcliptic2, name: 'marsPerihelionDurationEcliptic2', parentName: 'marsPerihelionFromEarth' },
      { obj: marsRealPerihelionAtSun, name: 'marsRealPerihelionAtSun', parentName: 'marsPerihelionDurationEcliptic2' },
      { obj: mars, name: 'mars', parentName: 'marsRealPerihelionAtSun' }
    ]
  },
  jupiter: {
    label: 'Jupiter',
    fixedPerihelion: () => jupiterFixedPerihelionAtSun,
    perihelionOf: () => jupiterPerihelionFromEarth,
    steps: () => [
      { obj: jupiterPerihelionDurationEcliptic1, name: 'jupiterPerihelionDurationEcliptic1', parentName: 'startingPoint' },
      { obj: jupiterPerihelionFromEarth, name: 'jupiterPerihelionFromEarth', parentName: 'jupiterPerihelionDurationEcliptic1' },
      { obj: jupiterPerihelionDurationEcliptic2, name: 'jupiterPerihelionDurationEcliptic2', parentName: 'jupiterPerihelionFromEarth' },
      { obj: jupiterRealPerihelionAtSun, name: 'jupiterRealPerihelionAtSun', parentName: 'jupiterPerihelionDurationEcliptic2' },
      { obj: jupiter, name: 'jupiter', parentName: 'jupiterRealPerihelionAtSun' }
    ]
  },
  saturn: {
    label: 'Saturn',
    fixedPerihelion: () => saturnFixedPerihelionAtSun,
    perihelionOf: () => saturnPerihelionFromEarth,
    steps: () => [
      { obj: saturnPerihelionDurationEcliptic1, name: 'saturnPerihelionDurationEcliptic1', parentName: 'startingPoint' },
      { obj: saturnPerihelionFromEarth, name: 'saturnPerihelionFromEarth', parentName: 'saturnPerihelionDurationEcliptic1' },
      { obj: saturnPerihelionDurationEcliptic2, name: 'saturnPerihelionDurationEcliptic2', parentName: 'saturnPerihelionFromEarth' },
      { obj: saturnRealPerihelionAtSun, name: 'saturnRealPerihelionAtSun', parentName: 'saturnPerihelionDurationEcliptic2' },
      { obj: saturn, name: 'saturn', parentName: 'saturnRealPerihelionAtSun' }
    ]
  },
  uranus: {
    label: 'Uranus',
    fixedPerihelion: () => uranusFixedPerihelionAtSun,
    perihelionOf: () => uranusPerihelionFromEarth,
    steps: () => [
      { obj: uranusPerihelionDurationEcliptic1, name: 'uranusPerihelionDurationEcliptic1', parentName: 'startingPoint' },
      { obj: uranusPerihelionFromEarth, name: 'uranusPerihelionFromEarth', parentName: 'uranusPerihelionDurationEcliptic1' },
      { obj: uranusPerihelionDurationEcliptic2, name: 'uranusPerihelionDurationEcliptic2', parentName: 'uranusPerihelionFromEarth' },
      { obj: uranusRealPerihelionAtSun, name: 'uranusRealPerihelionAtSun', parentName: 'uranusPerihelionDurationEcliptic2' },
      { obj: uranus, name: 'uranus', parentName: 'uranusRealPerihelionAtSun' }
    ]
  },
  neptune: {
    label: 'Neptune',
    fixedPerihelion: () => neptuneFixedPerihelionAtSun,
    perihelionOf: () => neptunePerihelionFromEarth,
    steps: () => [
      { obj: neptunePerihelionDurationEcliptic1, name: 'neptunePerihelionDurationEcliptic1', parentName: 'startingPoint' },
      { obj: neptunePerihelionFromEarth, name: 'neptunePerihelionFromEarth', parentName: 'neptunePerihelionDurationEcliptic1' },
      { obj: neptunePerihelionDurationEcliptic2, name: 'neptunePerihelionDurationEcliptic2', parentName: 'neptunePerihelionFromEarth' },
      { obj: neptuneRealPerihelionAtSun, name: 'neptuneRealPerihelionAtSun', parentName: 'neptunePerihelionDurationEcliptic2' },
      { obj: neptune, name: 'neptune', parentName: 'neptuneRealPerihelionAtSun' }
    ]
  },
  pluto: {
    label: 'Pluto',
    fixedPerihelion: () => plutoFixedPerihelionAtSun,
    perihelionOf: () => plutoPerihelionFromEarth,
    steps: () => [
      { obj: plutoPerihelionDurationEcliptic1, name: 'plutoPerihelionDurationEcliptic1', parentName: 'startingPoint' },
      { obj: plutoPerihelionFromEarth, name: 'plutoPerihelionFromEarth', parentName: 'plutoPerihelionDurationEcliptic1' },
      { obj: plutoPerihelionDurationEcliptic2, name: 'plutoPerihelionDurationEcliptic2', parentName: 'plutoPerihelionFromEarth' },
      { obj: plutoRealPerihelionAtSun, name: 'plutoRealPerihelionAtSun', parentName: 'plutoPerihelionDurationEcliptic2' },
      { obj: pluto, name: 'pluto', parentName: 'plutoRealPerihelionAtSun' }
    ]
  },
  halleys: {
    label: "Halley's Comet",
    fixedPerihelion: () => halleysFixedPerihelionAtSun,
    perihelionOf: () => halleysPerihelionFromEarth,
    steps: () => [
      { obj: halleysPerihelionDurationEcliptic1, name: 'halleysPerihelionDurationEcliptic1', parentName: 'startingPoint' },
      { obj: halleysPerihelionFromEarth, name: 'halleysPerihelionFromEarth', parentName: 'halleysPerihelionDurationEcliptic1' },
      { obj: halleysPerihelionDurationEcliptic2, name: 'halleysPerihelionDurationEcliptic2', parentName: 'halleysPerihelionFromEarth' },
      { obj: halleysRealPerihelionAtSun, name: 'halleysRealPerihelionAtSun', parentName: 'halleysPerihelionDurationEcliptic2' },
      { obj: halleys, name: 'halleys', parentName: 'halleysRealPerihelionAtSun' }
    ]
  },
  eros: {
    label: 'Eros',
    fixedPerihelion: () => erosFixedPerihelionAtSun,
    perihelionOf: () => erosPerihelionFromEarth,
    steps: () => [
      { obj: erosPerihelionDurationEcliptic1, name: 'erosPerihelionDurationEcliptic1', parentName: 'startingPoint' },
      { obj: erosPerihelionFromEarth, name: 'erosPerihelionFromEarth', parentName: 'erosPerihelionDurationEcliptic1' },
      { obj: erosPerihelionDurationEcliptic2, name: 'erosPerihelionDurationEcliptic2', parentName: 'erosPerihelionFromEarth' },
      { obj: erosRealPerihelionAtSun, name: 'erosRealPerihelionAtSun', parentName: 'erosPerihelionDurationEcliptic2' },
      { obj: eros, name: 'eros', parentName: 'erosRealPerihelionAtSun' }
    ]
  }
};

// ================================================================
// PLANET TEST DATES CONFIGURATION
// ================================================================
// Each planet has its own list of Julian Day dates to test.
// - jd: Julian Day number
// - type: 'position', 'longitude', or 'both'
// - label: Human-readable description
// - showOnScreen: true = show in inspector panel, false = Excel only
//
// DATA SOURCES:
// - Mercury transits: https://eclipse.gsfc.nasa.gov/transit/catalog/MercuryCatalog.html (NASA GSFC)
// - Venus transits: https://eclipse.gsfc.nasa.gov/transit/catalog/VenusCatalog.html (NASA GSFC)
// - Mars oppositions: https://stjerneskinn.com/mars-at-opposition.htm (Jean Meeus tables)
//                     https://www.nakedeyeplanets.com/mars-oppositions.htm
// - Jupiter/Saturn conjunctions: https://astropixels.com/ephemeris/planets/jupiter2020.html (JPL DE405)
//                                https://www.astropro.com/features/tables/geo/ju-sa/ju000sa.html
// - Mutual planetary occultations: https://en.wikipedia.org/wiki/List_of_mutual_planetary_eclipses
//                                  https://www.projectpluto.com/mut_pln.htm
//                                  https://www.bogan.ca/astro/occultations/occltlst.htm
// ================================================================
const PLANET_TEST_DATES = {
  mercury: [
    // Model start date: ra is in decimal hours (e.g., 7.682 = 7h 40m 55s)
    { jd: 2451716.5, ra: '7.412897222', dec: '20.8486', type: 'both', label: 'Model start date (21 Jun 2000)', showOnScreen: true },
    // NASA Mercury Transit Catalog: https://eclipse.gsfc.nasa.gov/transit/catalog/MercuryCatalog.html
    { jd: 2307579.3, dec: '-14.68', type: 'position', label: 'NASA date', showOnScreen: true },
    { jd: 2311048.9, dec: '15.61', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2312330.1, dec: '-15.49', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2315800.2, dec: '16.52', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2317080.8, dec: '-16.27', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2321831.5, dec: '-17.02', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2324381.5, dec: '-15.01', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2327851.2, dec: '15.94', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2329132.3, dec: '-15.81', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2332602.5, dec: '16.84', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2333883.0, dec: '-16.58', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2338633.7, dec: '-17.32', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2341183.7, dec: '-15.33', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2344653.5, dec: '16.27', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2345934.5, dec: '-16.12', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2350685.2, dec: '-16.87', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2355435.9, dec: '-17.59', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2356704.5, dec: '15.68', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2357985.9, dec: '-15.65', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2361455.8, dec: '16.59', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2362736.7, dec: '-16.42', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2367487.4, dec: '-17.17', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2370037.4, dec: '-14.91', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2372238.1, dec: '-17.88', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2373506.7, dec: '16.02', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2374788.1, dec: '-15.96', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2378258.0, dec: '16.90', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2379538.9, dec: '-16.73', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2384289.6, dec: '-17.45', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2386839.6, dec: '-15.50', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2390309.0, dec: '16.34', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2391590.3, dec: '-16.27', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2395060.3, dec: '17.21', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2396341.1, dec: '-17.02', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2401091.8, dec: '-17.74', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2403641.8, dec: '-15.81', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2407111.3, dec: '16.66', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2408392.5, dec: '-16.58', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2411862.6, dec: '17.52', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2413143.3, dec: '-17.31', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2417894.0, dec: '-18.01', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2420444.0, dec: '-16.12', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2423913.6, dec: '16.97', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2425194.7, dec: '-16.87', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2428664.9, dec: '17.81', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2429945.5, dec: '-17.59', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2434696.2, dec: '-18.28', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2435964.6, dec: '16.41', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2437246.2, dec: '-16.42', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2440715.8, dec: '17.28', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2441996.9, dec: '-17.17', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2446747.7, dec: '-17.87', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2449297.7, dec: '-15.97', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2451498.4, dec: '-18.54', type: 'position', label: 'NASA date', showOnScreen: true },
    { jd: 2452766.8, dec: '16.73', type: 'position', label: 'NASA date', showOnScreen: true },
    { jd: 2454048.4, dec: '-16.73', type: 'position', label: 'NASA date', showOnScreen: true },
    { jd: 2457518.1, dec: '17.58', type: 'position', label: 'NASA date', showOnScreen: true },
    { jd: 2458799.1, dec: '-17.45', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2463549.9, dec: '-18.14', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2466099.9, dec: '-16.27', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2469569.1, dec: '17.04', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2470850.6, dec: '-17.02', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2474320.4, dec: '17.88', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2475601.3, dec: '-17.73', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2480352.1, dec: '-18.41', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2482902.1, dec: '-16.58', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2486371.4, dec: '17.35', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2487652.8, dec: '-17.31', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2491122.7, dec: '18.16', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2492403.5, dec: '-18.01', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2497154.3, dec: '-18.67', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2499704.3, dec: '-16.87', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2503173.7, dec: '17.65', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2504455.0, dec: '-17.59', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2507925.0, dec: '18.45', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2509205.7, dec: '-18.28', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2513956.5, dec: '-18.92', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2515224.6, dec: '17.12', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2516506.5, dec: '-17.17', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2519975.9, dec: '17.94', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2521257.2, dec: '-17.87', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2526007.9, dec: '-18.54', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2528557.9, dec: '-16.73', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2532026.9, dec: '17.41', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2533308.7, dec: '-17.45', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2536778.2, dec: '18.23', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2538059.4, dec: '-18.14', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2542810.1, dec: '-18.80', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2545360.1, dec: '-17.02', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2548829.2, dec: '17.71', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2550110.9, dec: '-17.73', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2553580.5, dec: '18.50', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2554861.6, dec: '-18.41', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2559612.3, dec: '-19.04', type: 'position', label: 'NASA date', showOnScreen: false },
  ],
  // VENUS TRANSIT DATA
  // NASA Venus Transit Catalog: https://eclipse.gsfc.nasa.gov/transit/catalog/VenusCatalog.html
  venus: [
    { jd: 2451716.5, ra: '6.185725', dec: '23.8844', type: 'both', label: 'Model start date (21 Jun 2000)', showOnScreen: true },
    { jd: 991610.0, dec: '-15.31', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1030146.3, dec: '16.16', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1033066.0, dec: '15.50', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1077446.5, dec: '-16.65', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1080366.0, dec: '-15.91', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1118902.5, dec: '16.83', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1121822.3, dec: '16.20', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1166202.5, dec: '-17.21', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1169122.0, dec: '-16.48', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1207658.7, dec: '17.47', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1210578.5, dec: '16.86', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1254958.5, dec: '-17.74', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1257878.1, dec: '-17.04', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1296415.0, dec: '18.08', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1299334.7, dec: '17.50', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1343714.5, dec: '-18.25', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1346634.1, dec: '-17.58', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1385171.2, dec: '18.67', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1388090.9, dec: '18.11', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1432470.5, dec: '-18.74', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1435390.1, dec: '-18.10', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1476847.1, dec: '18.69', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1521226.5, dec: '-19.21', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1524146.1, dec: '-18.59', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1565603.3, dec: '19.25', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1609982.5, dec: '-19.66', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1654359.5, dec: '19.76', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1698738.5, dec: '-20.08', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1743115.6, dec: '20.25', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1787494.5, dec: '-20.48', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1831871.8, dec: '20.71', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1876250.5, dec: '-20.86', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1920628.0, dec: '21.13', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1923547.7, dec: '20.72', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 1965006.4, dec: '-21.21', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2009384.1, dec: '21.52', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2012303.9, dec: '21.14', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2053762.4, dec: '-21.53', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2098140.3, dec: '21.87', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2101060.0, dec: '21.52', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2142518.4, dec: '-21.83', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2186896.4, dec: '22.18', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2189816.2, dec: '21.87', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2231274.3, dec: '-22.10', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2275652.6, dec: '22.45', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2278572.3, dec: '22.18', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2317110.7, dec: '-22.64', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2320030.3, dec: '-22.34', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2364408.7, dec: '22.69', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2367328.4, dec: '22.44', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2405866.7, dec: '-22.82', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2408786.2, dec: '-22.56', type: 'position', label: 'NASA date', showOnScreen: true },
    { jd: 2453164.8, dec: '22.89', type: 'position', label: 'NASA date', showOnScreen: true },
    { jd: 2456084.6, dec: '22.68', type: 'position', label: 'NASA date', showOnScreen: true },
    { jd: 2494622.6, dec: '-22.97', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2497542.2, dec: '-22.74', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2541921.0, dec: '23.05', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2544840.7, dec: '22.87', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2583378.6, dec: '-23.09', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2586298.1, dec: '-22.90', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2630677.1, dec: '23.17', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2633596.8, dec: '23.02', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2672134.5, dec: '-23.18', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2675054.1, dec: '-23.03', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2719433.2, dec: '23.24', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2722352.9, dec: '23.14', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2760890.5, dec: '-23.24', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2763810.0, dec: '-23.12', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2808189.3, dec: '23.28', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2811109.0, dec: '23.21', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2849646.4, dec: '-23.27', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2896945.4, dec: '23.28', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2899865.1, dec: '23.25', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2938402.3, dec: '-23.26', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2985701.5, dec: '23.24', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 2988621.2, dec: '23.25', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 3027158.3, dec: '-23.23', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 3074457.6, dec: '23.16', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 3077377.3, dec: '23.21', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 3115914.2, dec: '-23.16', type: 'position', label: 'NASA date', showOnScreen: false },
    { jd: 3166133.4, dec: '23.13', type: 'position', label: 'NASA date', showOnScreen: false },
// VENUS OCCULTATIONS (9 events) https://en.wikipedia.org/wiki/List_of_mutual_planetary_eclipses    , https://www.projectpluto.com/mut_pln.htm   , https://www.bogan.ca/astro/occultations/occltlst.htm
// ============================================================
     { jd: 1388944.5, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1601453.0, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1618742.0, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1864578.6, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1997689.4, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2012028.8, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2222501.8, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2355634.4, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2500459.1, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
  ],
  // MARS OPPOSITION DATA
  // Sources: https://stjerneskinn.com/mars-at-opposition.htm (Jean Meeus tables)
  //          https://www.nakedeyeplanets.com/mars-oppositions.htm
  mars: [
    { jd: 2451716.5, ra: '6.219366667', dec: '24.2058', type: 'both', label: 'Model start date (21 Jun 2000)', showOnScreen: true },
    // Mars Opposition dates - declination values from astronomical tables
    { jd: 2414673.5, dec: '24.70', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2415437.8, dec: '14.53', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2416202.8, dec: '-0.08', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2416974.3, dec: '-16.95', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2417763.1, dec: '-27.98', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2418573.9, dec: '-4.22', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2419365.7, dec: '21.72', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2420138.3, dec: '26.57', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2420903.6, dec: '19.13', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2421667.8, dec: '5.92', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2422435.9, dec: '-10.35', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2423216.1, dec: '-25.93', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2424021.2, dec: '-17.68', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2424823.9, dec: '14.45', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2425602.1, dec: '26.65', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2426369.3, dec: '22.90', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2427133.3, dec: '11.43', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2427899.2, dec: '-3.87', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2428673.3, dec: '-20.67', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2429467.8, dec: '-26.40', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2430278.0, dec: '3.50', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2431064.3, dec: '24.40', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2431834.5, dec: '25.60', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2432599.2, dec: '16.42', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2433363.7, dec: '2.33', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2434133.6, dec: '-14.28', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2434918.2, dec: '-27.68', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2435727.4, dec: '-10.13', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2436524.1, dec: '19.13', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2437298.9, dec: '26.82', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2438065.0, dec: '20.70', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2438829.0, dec: '8.13', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2439596.0, dec: '-7.72', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2440373.2, dec: '-23.95', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2441173.8, dec: '-22.25', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2441980.6, dec: '10.30', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2442762.1, dec: '26.05', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2443530.5, dec: '24.10', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2444294.7, dec: '13.45', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2445059.9, dec: '-1.35', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2445831.9, dec: '-18.10', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2446621.7, dec: '-27.73', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2447432.6, dec: '-2.12', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2448223.4, dec: '22.63', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2448995.4, dec: '26.27', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2449760.6, dec: '18.17', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2450524.8, dec: '4.67', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2451293.2, dec: '-11.62', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2452074.2, dec: '-26.50', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2452880.2, dec: '-15.82', type: 'position', label: 'Opposition', showOnScreen: true},
    { jd: 2453681.8, dec: '15.90', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2454459.3, dec: '26.77', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2455226.3, dec: '22.15', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2455990.3, dec: '10.28', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2456756.4, dec: '-5.13', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2457531.0, dec: '-21.65', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2458326.7, dec: '-25.50', type: 'position', label: 'Opposition', showOnScreen: true },
    { jd: 2459136.5, dec: '5.45', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2459921.7, dec: '25.00', type: 'position', label: 'Opposition', showOnScreen: true },
    { jd: 2460691.6, dec: '25.12', type: 'position', label: 'Opposition', showOnScreen: true },
    { jd: 2461456.2, dec: '15.37', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2462220.8, dec: '1.07', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2462991.0, dec: '-15.48', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2463776.6, dec: '-27.82', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2464586.3, dec: '-8.03', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2465381.9, dec: '20.27', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2466156.1, dec: '26.68', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2466922.0, dec: '19.83', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2467686.0, dec: '6.93', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2468453.2, dec: '-9.00', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2469231.1, dec: '-24.75', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2470032.8, dec: '-20.73', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2470838.8, dec: '11.97', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2471619.4, dec: '26.33', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2472387.6, dec: '23.45', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2473151.7, dec: '12.33', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2473917.0, dec: '-2.63', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2474689.4, dec: '-19.18', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2475480.4, dec: '-27.32', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2476291.3, dec: '-0.02', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2477080.9, dec: '23.43', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2477852.5, dec: '25.92', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2478617.6, dec: '17.20', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2479381.9, dec: '3.43', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2480150.6, dec: '-12.85', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2480932.3, dec: '-26.97', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2481739.2, dec: '-13.88', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2482539.8, dec: '17.27', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2483316.6, dec: '26.80', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2484083.3, dec: '21.35', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2484847.3, dec: '9.10', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2485613.6, dec: '-6.42', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2486388.8, dec: '-22.60', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2487185.6, dec: '-24.43', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2487994.8, dec: '7.33', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2488779.2, dec: '25.48', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2489548.7, dec: '24.57', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2490313.1, dec: '14.30', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2491077.9, dec: '-0.18', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2491848.4, dec: '-16.62', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2492635.0, dec: '-27.82', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2493445.2, dec: '-5.92', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2494239.6, dec: '21.32', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2495013.3, dec: '26.47', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2495779.0, dec: '18.92', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2496543.1, dec: '5.70', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2497310.5, dec: '-10.25', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2498089.0, dec: '-25.43', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2498891.8, dec: '-19.10', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2499696.9, dec: '13.57', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2500476.8, dec: '26.55', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2501244.6, dec: '22.73', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2502008.7, dec: '11.20', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2502774.2, dec: '-3.92', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2503547.1, dec: '-20.25', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2504339.1, dec: '-26.72', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2505149.9, dec: '2.02', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2505938.4, dec: '24.15', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2506709.7, dec: '25.48', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2507474.6, dec: '16.18', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2508238.9, dec: '2.18', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2509007.9, dec: '-14.05', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2509790.5, dec: '-27.30', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2510598.3, dec: '-11.85', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2511397.6, dec: '18.55', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2512173.8, dec: '26.73', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2512940.3, dec: '20.52', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2513704.3, dec: '7.92', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2514470.8, dec: '-7.68', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2515246.5, dec: '-23.47', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2516044.5, dec: '-23.23', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2516853.1, dec: '9.15', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2517636.6, dec: '25.90', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2518405.8, dec: '23.95', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2519170.1, dec: '13.20', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2519935.0, dec: '-1.45', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2520706.0, dec: '-17.77', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2521493.5, dec: '-27.68', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2522304.0, dec: '-3.78', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2523097.3, dec: '22.27', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2523870.4, dec: '26.18', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2524636.0, dec: '17.95', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2525400.1, dec: '4.48', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2526167.8, dec: '-11.47', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2526947.0, dec: '-26.02', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2527750.9, dec: '-17.33', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2528554.9, dec: '15.10', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2529334.0, dec: '26.67', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2530101.6, dec: '21.98', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2530865.7, dec: '10.03', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2531631.3, dec: '-5.17', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2532404.7, dec: '-21.23', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2533197.8, dec: '-25.98', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2534008.4, dec: '4.02', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2534796.0, dec: '24.78', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2535566.8, dec: '25.00', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2536331.5, dec: '15.13', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2537096.0, dec: '0.93', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2537865.3, dec: '-15.23', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2538648.8, dec: '-27.52', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2539457.3, dec: '-9.77', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2540255.5, dec: '19.73', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2541031.0, dec: '26.60', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2541797.3, dec: '19.63', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2542561.3, dec: '6.72', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2543328.0, dec: '-8.92', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2544104.3, dec: '-24.25', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2544903.5, dec: '-21.87', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2545711.4, dec: '10.90', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2546494.0, dec: '26.22', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2547262.8, dec: '23.30', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2548027.1, dec: '12.10', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2548792.1, dec: '-2.72', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2549563.5, dec: '-18.83', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2550352.0, dec: '-27.38', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2551162.7, dec: '-1.68', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2551954.9, dec: '23.10', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2552727.6, dec: '25.82', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2553493.0, dec: '16.97', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2554257.1, dec: '3.25', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2555025.1, dec: '-12.68', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2555805.1, dec: '-26.53', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2556610.0, dec: '-15.47', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2557413.0, dec: '16.53', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2558191.3, dec: '26.70', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2558958.6, dec: '21.17', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2559722.7, dec: '8.87', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2560488.5, dec: '-6.42', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2561262.3, dec: '-22.15', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2562056.6, dec: '-25.08', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2562866.9, dec: '5.97', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2563653.5, dec: '25.30', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2564423.8, dec: '24.45', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2565188.5, dec: '14.07', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2565953.0, dec: '-0.32', type: 'position', label: 'Opposition', showOnScreen: false },
    { jd: 2566722.7, dec: '-16.37', type: 'position', label: 'Opposition', showOnScreen: false },
// MARS OCCULTATIONS (12 events) https://en.wikipedia.org/wiki/List_of_mutual_planetary_eclipses    , https://www.projectpluto.com/mut_pln.htm   , https://www.bogan.ca/astro/occultations/occltlst.htm
// ============================================================
     { jd: 1382451.4, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1541461.1, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1561025.1, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1623446.3, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1705389.5, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1837063.3, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1932304.3, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2083530.1, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2302080.7, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2480621.6, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2497775.2, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2571132.5, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
  ],
  // JUPITER-SATURN GREAT CONJUNCTIONS (Occultations)
  // Sources: https://astropixels.com/ephemeris/planets/jupiter2020.html (JPL DE405 ephemeris)
  //          https://www.astropro.com/features/tables/geo/ju-sa/ju000sa.html (3000-year table)
  //          https://en.wikipedia.org/wiki/Great_conjunction
  // Longitude values in ecliptic coordinates (tropical zodiac)
  jupiter: [
    { jd: 2451716.5, ra: '3.730069444', dec: '18.8969', type: 'both', label: 'Model start date (21 Jun 2000)', showOnScreen: true },
    // Jupiter-Saturn conjunctions with ecliptic longitude reference
    { jd: 2161655.0, longitude: '55.77', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2168918.0, longitude: '302.97', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: true },
    { jd: 2176423.0, longitude: '199.12', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2183305.0, longitude: '69.70', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2190769.0, longitude: '308.03', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2198068.0, longitude: '210.82', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2198184.0, longitude: '208.08', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2198274.0, longitude: '206.02', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2205166.0, longitude: '77.88', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2212402.0, longitude: '319.02', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2219922.0, longitude: '217.02', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2227028.0, longitude: '85.90', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2234250.0, longitude: '323.77', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2241584.0, longitude: '227.30', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2241616.0, longitude: '226.55', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2241777.0, longitude: '222.67', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2248674.0, longitude: '98.95', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2255882.0, longitude: '334.58', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2263411.0, longitude: '233.18', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2270539.0, longitude: '106.42', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2277729.0, longitude: '339.23', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2285265.0, longitude: '238.08', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2292180.0, longitude: '119.17', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2299361.0, longitude: '350.18', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2306895.0, longitude: '248.32', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2314045.0, longitude: '126.60', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: true },
    { jd: 2321208.0, longitude: '355.12', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2328747.0, longitude: '252.97', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2335695.0, longitude: '139.15', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2335803.0, longitude: '136.72', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2335901.0, longitude: '134.50', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2342843.0, longitude: '6.60', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2350377.0, longitude: '263.32', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2357554.0, longitude: '147.15', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2364694.0, longitude: '12.35', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2372231.0, longitude: '268.12', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2379424.0, longitude: '155.13', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2386336.0, longitude: '24.65', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2393862.0, longitude: '278.90', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2401070.0, longitude: '168.37', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2408189.0, longitude: '31.60', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2415717.0, longitude: '284.00', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2422943.0, longitude: '176.60', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2429850.0, longitude: '44.45', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2429923.0, longitude: '42.47', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2430041.0, longitude: '39.12', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2437350.0, longitude: '295.20', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2444605.0, longitude: '189.50', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2444668.0, longitude: '188.10', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2444810.0, longitude: '184.93', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2451693.0, longitude: '52.72', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2459205.0, longitude: '300.48', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: true },
    { jd: 2466459.0, longitude: '197.93', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2473557.0, longitude: '60.77', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2480839.0, longitude: '311.87', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: true },
    { jd: 2488330.0, longitude: '205.53', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2495204.0, longitude: '74.87', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2502692.0, longitude: '317.08', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2509973.0, longitude: '217.98', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2517071.0, longitude: '83.05', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2524325.0, longitude: '328.32', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2531836.0, longitude: '224.70', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2538722.0, longitude: '96.63', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2538850.0, longitude: '93.42', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2538918.0, longitude: '91.68', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2546176.0, longitude: '333.25', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2553484.0, longitude: '235.98', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2553574.0, longitude: '233.85', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2553690.0, longitude: '231.12', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2560580.0, longitude: '104.73', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2567808.0, longitude: '344.22', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2575332.0, longitude: '242.02', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2582444.0, longitude: '112.53', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2589655.0, longitude: '348.95', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
    { jd: 2597186.0, longitude: '247.42', type: 'position', label: 'Occultation', comparePlanet: 'saturn', showOnScreen: false },
// JUPITER OCCULTATIONS (42 events) https://en.wikipedia.org/wiki/List_of_mutual_planetary_eclipses   , https://www.projectpluto.com/mut_pln.htm    , https://www.bogan.ca/astro/occultations/occltlst.htm
// ============================================================
     { jd: 1363901.0, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1367887.0, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1395865.3, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1423361.5, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1439704.0, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1458892.9, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1479205.5, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1494378.0, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1508687.2, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 1519101.5, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1534273.1, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1552248.4, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1624407.2, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1653936.2, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 1667476.2, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1720860.4, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1820586.9, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 1853752.3, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1877682.6, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1901285.5, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 1907175.3, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1970158.4, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1976993.2, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1988594.1, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2024120.8, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2102311.3, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2148655.4, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 2156435.3, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2160931.3, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 2163270.0, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2227923.5, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 2294535.8, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2343999.5, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2345171.0, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2385073.4, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2475612.0, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2483987.1, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2485975.0, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2496726.1, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2533329.0, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 2574181.1, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2626372.5, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
  ],
  // SATURN-JUPITER GREAT CONJUNCTIONS (Occultations)
  // Sources: https://astropixels.com/ephemeris/planets/saturn2020.html (JPL DE405 ephemeris)
  //          https://www.astropro.com/features/tables/geo/ju-sa/ju000sa.html (3000-year table)
  //          https://en.wikipedia.org/wiki/Great_conjunction
  // Longitude values in ecliptic coordinates (tropical zodiac)
  saturn: [
    { jd: 2451716.5, ra: '3.580388889', dec: '17.1936', type: 'both', label: 'Model start date (21 Jun 2000)', showOnScreen: true },
    // Saturn-Jupiter conjunctions with ecliptic longitude reference
    { jd: 2161655.0, longitude: '55.77', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2168918.0, longitude: '302.97', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: true },
    { jd: 2176423.0, longitude: '199.12', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2183305.0, longitude: '69.70', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2190769.0, longitude: '308.03', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2198068.0, longitude: '210.82', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2198184.0, longitude: '208.08', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2198274.0, longitude: '206.02', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2205166.0, longitude: '77.88', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2212402.0, longitude: '319.02', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2219922.0, longitude: '217.02', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2227028.0, longitude: '85.90', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2234250.0, longitude: '323.77', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2241584.0, longitude: '227.30', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2241616.0, longitude: '226.55', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2241777.0, longitude: '222.67', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2248674.0, longitude: '98.95', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2255882.0, longitude: '334.58', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2263411.0, longitude: '233.18', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2270539.0, longitude: '106.42', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2277729.0, longitude: '339.23', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2285265.0, longitude: '238.08', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2292180.0, longitude: '119.17', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2299361.0, longitude: '350.18', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2306895.0, longitude: '248.32', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2314045.0, longitude: '126.60', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: true },
    { jd: 2321208.0, longitude: '355.12', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2328747.0, longitude: '252.97', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2335695.0, longitude: '139.15', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2335803.0, longitude: '136.72', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2335901.0, longitude: '134.50', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2342843.0, longitude: '6.60', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2350377.0, longitude: '263.32', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2357554.0, longitude: '147.15', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2364694.0, longitude: '12.35', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2372231.0, longitude: '268.12', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2379424.0, longitude: '155.13', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2386336.0, longitude: '24.65', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2393862.0, longitude: '278.90', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2401070.0, longitude: '168.37', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2408189.0, longitude: '31.60', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2415717.0, longitude: '284.00', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2422943.0, longitude: '176.60', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2429850.0, longitude: '44.45', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2429923.0, longitude: '42.47', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2430041.0, longitude: '39.12', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2437350.0, longitude: '295.20', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2444605.0, longitude: '189.50', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2444668.0, longitude: '188.10', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2444810.0, longitude: '184.93', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2451693.0, longitude: '52.72', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2459205.0, longitude: '300.48', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: true },
    { jd: 2466459.0, longitude: '197.93', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2473557.0, longitude: '60.77', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2480839.0, longitude: '311.87', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: true },
    { jd: 2488330.0, longitude: '205.53', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2495204.0, longitude: '74.87', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2502692.0, longitude: '317.08', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2509973.0, longitude: '217.98', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2517071.0, longitude: '83.05', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2524325.0, longitude: '328.32', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2531836.0, longitude: '224.70', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2538722.0, longitude: '96.63', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2538850.0, longitude: '93.42', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2538918.0, longitude: '91.68', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2546176.0, longitude: '333.25', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2553484.0, longitude: '235.98', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2553574.0, longitude: '233.85', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2553690.0, longitude: '231.12', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2560580.0, longitude: '104.73', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2567808.0, longitude: '344.22', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2575332.0, longitude: '242.02', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2582444.0, longitude: '112.53', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2589655.0, longitude: '348.95', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2597186.0, longitude: '247.42', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
// SATURN OCCULTATIONS (19 events) https://en.wikipedia.org/wiki/List_of_mutual_planetary_eclipses    , https://www.projectpluto.com/mut_pln.htm   , https://www.bogan.ca/astro/occultations/occltlst.htm
// ============================================================
     { jd: 1359023.9, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1661510.6, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1717800.1, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 1750343.0, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1797617.4, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1809331.7, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1933280.6, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2055100.3, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2056972.0, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2095910.3, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2179057.9, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2238472.5, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2260754.3, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2260814.1, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 2276995.8, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 2368145.3, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2381761.4, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2540521.7, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2640765.4, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
  ],
  uranus: [
    { jd: 2451716.5, ra: '21.54528889', dec: '-15.3240', type: 'both', label: 'Model start date (21 Jun 2000)', showOnScreen: true },
    { jd: 2314075.2, longitude: 'N/A', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2345089.0, longitude: 'N/A', type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
    { jd: 2376141.7, longitude: 'N/A', type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
// URANUS OCCULTATIONS (14 events) https://en.wikipedia.org/wiki/List_of_mutual_planetary_eclipses   , https://www.projectpluto.com/mut_pln.htm    , https://www.bogan.ca/astro/occultations/occltlst.htm
// ============================================================
     { jd: 1466919.5, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 1517868.3, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1707826.8, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1842746.6, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2073791.2, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2218697.0, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2226429.1, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2314075.2, type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
     { jd: 2345089.0, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2376141.7, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2543283.0, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2563927.4, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2579841.2, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2604944.6, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
  ],
  neptune: [
    { jd: 2451716.5, ra: '20.56120556', dec: '-18.5374', type: 'both', label: 'Model start date (21 Jun 2000)', showOnScreen: true },
    { jd: 2361567.0, longitude: '125.08', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2366314.0, longitude: '152.67', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2371065.0, longitude: '180.20', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2375586.0, longitude: '233.75', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2375660.0, longitude: '239.07', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2375811.0, longitude: '237.65', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2380321.0, longitude: '267.17', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2385064.0, longitude: '294.35', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2389802.0, longitude: '321.42', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2394300.0, longitude: '320.95', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2394455.0, longitude: '319.33', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2394488.0, longitude: '318.73', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2399010.0, longitude: '344.35', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2403755.0, longitude: '15.58', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2408250.0, longitude: '45.58', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2412981.0, longitude: '73.17', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2417718.0, longitude: '100.83', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2422226.0, longitude: '130.82', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2422392.0, longitude: '129.20', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2422439.0, longitude: '128.75', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2426970.0, longitude: '155.42', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2431721.0, longitude: '185.90', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2436471.0, longitude: '213.30', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2440984.0, longitude: '242.78', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2441094.0, longitude: '241.73', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2441211.0, longitude: '240.62', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2445719.0, longitude: '270.15', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2450458.0, longitude: '297.15', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: true },
    { jd: 2454979.0, longitude: '326.48', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: true },
    { jd: 2455023.0, longitude: '326.03', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2455187.0, longitude: '324.30', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
    { jd: 2459682.0, longitude: '353.30', type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false }, 
// NEPTUNE OCCULTATIONS (16 events) https://en.wikipedia.org/wiki/List_of_mutual_planetary_eclipses    , https://www.projectpluto.com/mut_pln.htm     , https://www.bogan.ca/astro/occultations/occltlst.htm
// ============================================================
     { jd: 1405723.6, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 1439150.7, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1442495.5, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1528047.9, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 1918050.3, type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
     { jd: 1981572.8, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2157251.0, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2188084.1, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
     { jd: 2191071.7, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2242510.8, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2249744.9, type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
     { jd: 2310199.4, type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
     { jd: 2342964.1, type: 'position', label: 'Occultation', comparePlanet: 'jupiter', showOnScreen: false },
     { jd: 2476212.0, type: 'position', label: 'Occultation', comparePlanet: 'mercury', showOnScreen: false },
     { jd: 2489762.6, type: 'position', label: 'Occultation', comparePlanet: 'venus', showOnScreen: false },
     { jd: 2639740.9, type: 'position', label: 'Occultation', comparePlanet: 'mars', showOnScreen: false },
  ],
  pluto: [
    { jd: 2451716.5, ra: '16.73686667', dec: '-10.9377', type: 'both', label: 'Model start date (21 Jun 2000)', showOnScreen: true },
  ],
  halleys: [
    { jd: 2451716.5, ra: '8.720219444', dec: '0.5128', type: 'both', label: 'Model start date (21 Jun 2000)', showOnScreen: true },
  ],
  eros: [
    { jd: 2451716.5, ra: '20.64013056', dec: '-26.1392', type: 'both', label: 'Model start date (21 Jun 2000)', showOnScreen: true },
  ]
};

// Reference constants for longitude validation
const LONGITUDE_PERIHELION_REFS = {
  mercury: mercuryLongitudePerihelion,
  venus: venusLongitudePerihelion,
  mars: marsLongitudePerihelion,
  jupiter: jupiterLongitudePerihelion,
  saturn: saturnLongitudePerihelion,
  uranus: uranusLongitudePerihelion,
  neptune: neptuneLongitudePerihelion,
  pluto: plutoLongitudePerihelion,
  halleys: halleysLongitudePerihelion,
  eros: erosLongitudePerihelion
};

const ASCENDING_NODE_REFS = {
  mercury: mercuryAscendingNode,
  venus: venusAscendingNode,
  mars: marsAscendingNode,
  jupiter: jupiterAscendingNode,
  saturn: saturnAscendingNode,
  uranus: uranusAscendingNode,
  neptune: neptuneAscendingNode,
  pluto: plutoAscendingNode,
  halleys: halleysAscendingNode,
  eros: erosAscendingNode
};

// Planet object references for report generation
const PLANET_OBJECTS = {
  mercury: () => mercury,
  venus: () => venus,
  mars: () => mars,
  jupiter: () => jupiter,
  saturn: () => saturn,
  uranus: () => uranus,
  neptune: () => neptune,
  pluto: () => pluto,
  halleys: () => halleys,
  eros: () => eros
};

// Hierarchy inspector state
const hierarchyInspector = {
  panel: null,
  currentPlanet: 'mercury',
  currentStep: 0,
  highlightActive: false,
  axesHelper: null,
  startPosArrow: null,
  currentPosArrow: null,
  orbitCenterArrow: null,
  rotationArrow: null,
  inclinationPlane: null,
  ascendingNode: null,
  descendingNode: null,
  aboveHalfPlane: null,  // GREEN half-plane (above ecliptic)
  belowHalfPlane: null,  // RED half-plane (below ecliptic)
  highestPointMarker: null,  // GREEN sphere at highest point (90° after ascending node)
  lowestPointMarker: null,   // RED sphere at lowest point (90° after descending node)
  perihelionDot: null,
  perihelionArrow: null,
  earthPerihelionArrow: null,  // Green arrow from planet perihelion to Earth perihelion (Step 2)
  // Anomaly visualization elements (updated live)
  anomalyGroup: null,
  perihelionLine: null,
  trueAnomalyLine: null,
  meanAnomalyLine: null,
  trueAnomalyArc: null,
  meanAnomalyArc: null,
  // New anomaly visualization elements (P→Planet, Sun→Planet lines and arcs)
  pToPlanetLine: null,
  sunToPlanetLine: null,
  meanAnomalyArcAtP: null,
  trueAnomalyArcAtSun: null,
  _meanArcAtPRadius: null,
  _trueArcAtSunRadius: null,
  // Temporary perihelion visibility state (for step-based camera focus)
  _tempPerihelionVisible: null,
  _tempPerihelionOriginalVisible: null,
  _tempPerihelionOrbitOriginalVisible: null,
  // Camera control flag - when true, hierarchy inspector controls camera target
  _cameraControlActive: false,
  _cameraTarget: null,  // The object to focus on (for animation loop)
  helpers: {
    showAxes: true,
    showStartPos: true,
    showOrbitCenter: false,  // Solar period reference - off by default
    showRotationDir: true,
    showInclinationPlane: true,
    showPerihelionPoint: true,
    showAnomalies: true
  }
};

// Get parent object by name
function getParentObject(parentName) {
  if (parentName === 'startingPoint') return startingPoint;
  // Search through all hierarchies for the object
  for (const planetKey of Object.keys(PLANET_HIERARCHIES)) {
    const steps = PLANET_HIERARCHIES[planetKey].steps();
    for (const step of steps) {
      if (step.name === parentName) return step.obj;
    }
  }
  return null;
}

// Calculate period from speed (preserves sign to indicate direction)
function speedToPeriod(speed) {
  if (!speed || speed === 0) return Infinity;
  // Preserve sign: negative speed = negative period (opposite direction)
  return (2 * Math.PI) / speed;
}

// Calculate arcseconds per century from period (preserves sign)
function periodToArcsecPerCentury(periodYears) {
  if (!isFinite(periodYears) || periodYears === 0) return 0;
  // Preserve sign: negative period = negative arcsec/century (retrograde precession)
  return 129600000 / periodYears; // 360° * 3600 arcsec/degree * 100 years = 129,600,000 arcsec/century
}

// Format number with precision
function formatNum(val, precision = 4) {
  if (val === undefined || val === null) return 'undefined';
  if (typeof val !== 'number') return String(val);
  if (isNaN(val)) return 'NaN';
  if (!isFinite(val)) return val > 0 ? 'Infinity' : '-Infinity';
  return val.toFixed(precision);
}

// Validate a step and return issues
function validateStep(stepData, stepIndex, steps) {
  const issues = [];
  const obj = stepData.obj;

  // Check for NaN values
  if (isNaN(obj.speed)) issues.push({ type: 'error', msg: 'Speed is NaN' });
  if (isNaN(obj.startPos)) issues.push({ type: 'error', msg: 'StartPos is NaN' });
  if (isNaN(obj.orbitRadius)) issues.push({ type: 'error', msg: 'OrbitRadius is NaN' });
  if (isNaN(obj.orbitCentera) || isNaN(obj.orbitCenterb) || isNaN(obj.orbitCenterc)) {
    issues.push({ type: 'error', msg: 'OrbitCenter has NaN values' });
  }

  // Check for zero speed on precession steps (steps 0, 2)
  if ((stepIndex === 0 || stepIndex === 2) && obj.speed === 0) {
    issues.push({ type: 'warning', msg: 'Speed is 0 - no precession will occur' });
  }

  // Check runtime objects exist
  if (!obj.containerObj) issues.push({ type: 'error', msg: 'containerObj not created' });
  if (!obj.pivotObj) issues.push({ type: 'error', msg: 'pivotObj not created' });
  if (!obj.orbitObj) issues.push({ type: 'warning', msg: 'orbitObj not created' });

  // Check parent-child connection
  if (stepIndex > 0) {
    const parentObj = getParentObject(stepData.parentName);
    if (parentObj && parentObj.pivotObj && obj.containerObj) {
      if (obj.containerObj.parent !== parentObj.pivotObj) {
        issues.push({ type: 'error', msg: `Not attached to parent's pivot (${stepData.parentName})` });
      }
    }
  }

  // Check if orbitRadius and orbitCenter both have non-zero values
  if (obj.orbitRadius > 0 && (obj.orbitCentera !== 0 || obj.orbitCenterb !== 0 || obj.orbitCenterc !== 0)) {
    issues.push({ type: 'warning', msg: 'Both orbitRadius and orbitCenter are set' });
  }

  // Step 2 (PerihelionFromEarth) should point at the Sun - calculate angle to Sun
  if (stepIndex === 1 && obj.pivotObj && sun.pivotObj) {
    // Get world positions (using reusable temp vectors)
    obj.pivotObj.getWorldPosition(_hiObjWorldPos);
    sun.pivotObj.getWorldPosition(_hiSunWorldPos);

    // Calculate angle from object to Sun in XZ plane
    const dx = _hiSunWorldPos.x - _hiObjWorldPos.x;
    const dz = _hiSunWorldPos.z - _hiObjWorldPos.z;
    const angleToSunRad = Math.atan2(-dz, dx); // Note: -dz because of coordinate system
    const angleToSunDeg = angleToSunRad * 180 / Math.PI;

    // Get current rotation (startPos + accumulated rotation)
    const startPosRad = (obj.startPos || 0) * Math.PI / 180;
    const currentRotation = obj.orbitObj?.rotation?.y ?? 0;
    const currentAngleRad = startPosRad + currentRotation;
    const currentAngleDeg = currentAngleRad * 180 / Math.PI;

    // Normalize angles to -180 to 180
    const normalizeAngle = (a) => ((a + 180) % 360 + 360) % 360 - 180;
    const normalizedCurrent = normalizeAngle(currentAngleDeg);
    const normalizedToSun = normalizeAngle(angleToSunDeg);
    const angleDiff = Math.abs(normalizeAngle(normalizedCurrent - normalizedToSun));

    issues.push({
      type: 'info',
      msg: `Angle between Perihelion and Sun: ${(normalizedToSun - 90).toFixed(2)}°`
    });

    // Calculate distance between earthPerihelionFromEarth and the planet's perihelion
    if (earthPerihelionFromEarth?.pivotObj && obj.pivotObj) {
      earthPerihelionFromEarth.pivotObj.getWorldPosition(_hiEarthPeriPos);

      const distanceSceneUnits = Math.sqrt(
        Math.pow(_hiObjWorldPos.x - _hiEarthPeriPos.x, 2) +
        Math.pow(_hiObjWorldPos.y - _hiEarthPeriPos.y, 2) +
        Math.pow(_hiObjWorldPos.z - _hiEarthPeriPos.z, 2)
      );
      const distanceAU = distanceSceneUnits / 100; // scene units to AU

      issues.push({
        type: 'info',
        msg: `Calculated distance perihelion Sun barycenter: ${distanceAU.toFixed(6)} AU`
      });
    }

    // Calculate angle from earthPerihelionFromEarth to planet perihelion using apparentRaFromPdA
    // This uses the astronomical Right Ascension calculation for accuracy
    if (earthPerihelionFromEarth && obj) {
      // Reference longitude of perihelion values (expected on model start date)
      const referenceLongitudes = {
        mercury: mercuryLongitudePerihelion,
        venus: venusLongitudePerihelion,
        mars: marsLongitudePerihelion,
        jupiter: jupiterLongitudePerihelion,
        saturn: saturnLongitudePerihelion,
        uranus: uranusLongitudePerihelion,
        neptune: neptuneLongitudePerihelion,
        pluto: plutoLongitudePerihelion,
        halleys: halleysLongitudePerihelion,
        eros: erosLongitudePerihelion
      };

      const currentPlanet = hierarchyInspector.currentPlanet;
      const referenceLong = referenceLongitudes[currentPlanet];

      try {
        const angleDeg = apparentRaFromPdA(earthPerihelionFromEarth, obj);
        issues.push({
          type: 'info',
          msg: `Calculated longitude of perihelion: ${angleDeg.toFixed(6)}°`
        });
      } catch (e) {
        // If calculation fails (e.g., missing ra/distKm), skip silently
      }

      if (referenceLong !== undefined) {
        issues.push({
          type: 'reference',
          msg: `Reference longitude of perihelion: ${referenceLong.toFixed(6)}°`
        });
      }
    }
  }

  // Step 4 (RealPerihelionAtSun) - comprehensive orbital diagnostics
  if (stepIndex === 3) {
    const tiltaDeg = obj.orbitTilta || 0;
    const tiltbDeg = obj.orbitTiltb || 0;
    const startPosDeg = obj.startPos || 0;

    // Calculate the total inclination magnitude
    const totalInclinationDeg = Math.sqrt(tiltaDeg * tiltaDeg + tiltbDeg * tiltbDeg);

    // Calculate the longitude of ascending node from tilt components
    // The encoding formula used in RealPerihelionAtSun objects is:
    //   orbitTilta = cos((-90-Ω) * π/180) * -inclination
    //   orbitTiltb = sin((-90-Ω) * π/180) * -inclination
    // The negative inclination flips signs, equivalent to adding 180°:
    //   orbitTilta = cos((90-Ω) * π/180) * inclination
    //   orbitTiltb = sin((90-Ω) * π/180) * inclination
    // To reverse: θ = atan2(tiltb, tilta) = (90 - Ω), so Ω = 90 - θ
    const theta = Math.atan2(tiltbDeg, tiltaDeg) * 180 / Math.PI;
    let ascNodeAngleDeg = 90 - theta;
    // Normalize to 0-360 range
    ascNodeAngleDeg = ((ascNodeAngleDeg % 360) + 360) % 360;

    issues.push({
      type: 'valid',
      msg: `orbitTilta: ${tiltaDeg.toFixed(4)}° (rotation around X)`
    });
    issues.push({
      type: 'valid',
      msg: `orbitTiltb: ${tiltbDeg.toFixed(4)}° (rotation around Z)`
    });
    issues.push({
      type: 'valid',
      msg: `Total inclination: ${totalInclinationDeg.toFixed(4)}°`
    });

  }

  // Step 5 (actual planet) - RA validation now shown in Position Report section

  if (issues.length === 0) {
    issues.push({ type: 'valid', msg: 'All checks passed' });
  }

  return issues;
}

// Create visual helpers for current step
// Options:
//   skipClear: if true, don't call clearVisualHelpers (caller has already done it)
function createVisualHelpers(stepData, options = {}) {
  const { skipClear = false } = options;
  if (!skipClear) {
    // Force clean all anomaly elements since we're recreating for potentially a new step
    clearVisualHelpers({ forceCleanAnomalies: true });
  }

  const obj = stepData.obj;
  if (!obj.pivotObj) return;

  const scale = Math.max(50, obj.orbitRadius || 50);

  // Axes helper (XYZ)
  if (hierarchyInspector.helpers.showAxes) {
    hierarchyInspector.axesHelper = new THREE.AxesHelper(scale * 0.5);
    obj.pivotObj.add(hierarchyInspector.axesHelper);
  }

  // StartPos direction arrow (WHITE - initial/to-be position)
  if (hierarchyInspector.helpers.showStartPos && obj.startPos !== undefined) {
    const startPosRad = (obj.startPos || 0) * Math.PI / 180;
    const arrowDir = new THREE.Vector3(Math.cos(startPosRad), 0, -Math.sin(startPosRad));
    const arrowLength = scale * 0.4;
    hierarchyInspector.startPosArrow = new THREE.ArrowHelper(
      arrowDir, new THREE.Vector3(0, 0, 0), arrowLength, 0xffd700, arrowLength * 0.15, arrowLength * 0.08
    );
    obj.pivotObj.add(hierarchyInspector.startPosArrow);

    // Current position arrow (WHITE - where object currently is)
    // The current rotation is stored in orbitObj.rotation.y
    const currentRotation = obj.orbitObj?.rotation?.y ?? 0;
    const currentPosRad = startPosRad + currentRotation;
    const currentDir = new THREE.Vector3(Math.cos(currentPosRad), 0, -Math.sin(currentPosRad));
    hierarchyInspector.currentPosArrow = new THREE.ArrowHelper(
      currentDir, new THREE.Vector3(0, 0, 0), arrowLength * 1.1, 0xffffff, arrowLength * 0.15, arrowLength * 0.08
    );
    obj.pivotObj.add(hierarchyInspector.currentPosArrow);
  }

  // Orbit center offset arrow
  if (hierarchyInspector.helpers.showOrbitCenter) {
    const offsetX = obj.orbitCentera || 0;
    const offsetY = obj.orbitCenterc || 0;
    const offsetZ = obj.orbitCenterb || 0;
    if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0) {
      const offsetVec = new THREE.Vector3(offsetX, offsetY, offsetZ);
      const offsetLength = offsetVec.length();
      hierarchyInspector.orbitCenterArrow = new THREE.ArrowHelper(
        offsetVec.clone().normalize(), new THREE.Vector3(0, 0, 0), offsetLength, 0x00ffff, offsetLength * 0.15, offsetLength * 0.08
      );
      obj.pivotObj.add(hierarchyInspector.orbitCenterArrow);
    }
  }

  // Rotation direction indicator
  if (hierarchyInspector.helpers.showRotationDir && obj.speed !== 0) {
    const isCounterClockwise = obj.speed > 0;
    const color = isCounterClockwise ? 0x00ff00 : 0xff0000;
    const curve = new THREE.EllipseCurve(0, 0, scale * 0.3, scale * 0.3, 0, Math.PI * 1.5, !isCounterClockwise);
    const points = curve.getPoints(32);
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0, p.y)));
    const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
    hierarchyInspector.rotationArrow = new THREE.Line(geometry, material);
    obj.pivotObj.add(hierarchyInspector.rotationArrow);
  }

  // Green arrow from planet perihelion to Earth perihelion (Step 2 only)
  if (hierarchyInspector.currentStep === 1 && earthPerihelionFromEarth?.pivotObj && obj.pivotObj) {
    obj.pivotObj.getWorldPosition(_hiPlanetPeriPos);
    earthPerihelionFromEarth.pivotObj.getWorldPosition(_hiEarthPeriPos);

    // Calculate direction and distance (reusing temp vector)
    _hiDirection.subVectors(_hiEarthPeriPos, _hiPlanetPeriPos);
    const distance = _hiDirection.length();

    if (distance > 0.001) {
      _hiDirection.normalize();
      // Create green arrow from planet perihelion pointing to Earth perihelion
      hierarchyInspector.earthPerihelionArrow = new THREE.ArrowHelper(
        _hiDirection,
        _hiPlanetPeriPos,
        distance,
        0x00ff00,  // Green color
        distance * 0.1,  // Head length
        distance * 0.05  // Head width
      );
      scene.add(hierarchyInspector.earthPerihelionArrow);
    }
  }

  // Inclination plane with ascending/descending nodes (Step 4 only - RealPerihelionAtSun)
  // Step 4 is index 3 (0-based), and it has orbitTilta for orbital inclination
  if (hierarchyInspector.helpers.showInclinationPlane &&
      hierarchyInspector.currentStep === 3 &&
      (obj.orbitTilta !== undefined || obj.orbitTiltb !== undefined)) {

    // Get the actual tilt values in degrees (as stored in the object)
    const tiltaDeg = obj.orbitTilta || 0;
    const tiltbDeg = obj.orbitTiltb || 0;
    const tiltaRad = tiltaDeg * Math.PI / 180;
    const tiltbRad = tiltbDeg * Math.PI / 180;

    const planeRadius = scale * 0.5;

    // Create a group to hold the inclined plane and nodes
    hierarchyInspector.inclinationPlane = new THREE.Group();

    // Create ecliptic plane reference (flat ring at y=0) - BLUE DASHED
    const eclipticCurve = new THREE.EllipseCurve(0, 0, planeRadius * 1.05, planeRadius * 1.05, 0, Math.PI * 2, false);
    const eclipticPoints = eclipticCurve.getPoints(64);
    const eclipticGeometry = new THREE.BufferGeometry().setFromPoints(
      eclipticPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
    );
    const eclipticMaterial = new THREE.LineDashedMaterial({
      color: 0x4488ff,
      linewidth: 1,
      dashSize: 5,
      gapSize: 3
    });
    const eclipticLine = new THREE.Line(eclipticGeometry, eclipticMaterial);
    eclipticLine.computeLineDistances();
    hierarchyInspector.inclinationPlane.add(eclipticLine);

    // COORDINATE SYSTEM EXPLANATION:
    // The inclinationPlane is added to obj.pivotObj, which is INSIDE orbitContainer.
    // orbitContainer already has the tilt applied (rotation.x and rotation.z).
    // Therefore, our LOCAL y=0 plane IS the tilted orbital plane in world space.
    // The WORLD ecliptic (world y=0) appears tilted relative to our local frame.
    //
    // To find nodes and color the half-planes correctly, we need to transform
    // LOCAL points to WORLD space to check which side of the ecliptic they're on.
    //
    // The parent (orbitContainer) applies rotation via Euler angles:
    //   rotation.x = tiltaRad, rotation.z = tiltbRad (default 'XYZ' order)
    // We must match this EXACTLY by using the same Euler approach
    const localToWorld = new THREE.Matrix4();
    localToWorld.makeRotationFromEuler(new THREE.Euler(tiltaRad, 0, tiltbRad, 'XYZ'));

    // Get the ACTUAL ascending node angle from the o.xxxAscendingNode property
    // This is the authoritative value that's dynamically calculated for the current date
    const ascNodePropertyMap = {
      mercury: 'mercuryAscendingNode',
      venus: 'venusAscendingNode',
      mars: 'marsAscendingNode',
      jupiter: 'jupiterAscendingNode',
      saturn: 'saturnAscendingNode',
      uranus: 'uranusAscendingNode',
      neptune: 'neptuneAscendingNode',
      pluto: 'plutoAscendingNode',
      halleys: 'halleysAscendingNode',
      eros: 'erosAscendingNode'
    };
    const ascNodeProp = ascNodePropertyMap[hierarchyInspector.currentPlanet];
    const ascNodeAngleDeg = ascNodeProp ? (o[ascNodeProp] || 0) : 0;
    const ascNodeAngleRad = ascNodeAngleDeg * Math.PI / 180;

    // Calculate ascending node position in LOCAL coordinates
    // The ascending node angle is in ecliptic longitude (measured from vernal equinox)
    // Our model is 90° rotated (from March 21 to June 21), so we add 90° counterclockwise
    // Original: X = cos(angle), Z = -sin(angle)
    // After 90° CCW rotation: X = -sin(angle), Z = -cos(angle)
    let ascendingNodePos = new THREE.Vector3(
      planeRadius * -Math.sin(ascNodeAngleRad),
      0,
      planeRadius * -Math.cos(ascNodeAngleRad)
    );

    // Descending node is 180° opposite the ascending node
    let descendingNodePos = new THREE.Vector3(
      -ascendingNodePos.x,
      0,
      -ascendingNodePos.z
    );

    // Find highest and lowest points by sampling the orbit
    // These are 90° after the ascending/descending nodes
    const numSamples = 360;
    let highestLocalPos = new THREE.Vector3();
    let lowestLocalPos = new THREE.Vector3();
    let maxWorldY = -Infinity;
    let minWorldY = Infinity;

    for (let i = 0; i < numSamples; i++) {
      const angle = (i / numSamples) * Math.PI * 2;

      // Point on LOCAL orbital plane (flat circle at local y=0)
      const pLocal = new THREE.Vector3(planeRadius * Math.cos(angle), 0, planeRadius * Math.sin(angle));

      // Transform to WORLD space to check ecliptic position
      const pWorld = pLocal.clone().applyMatrix4(localToWorld);

      // Track highest and lowest points (in WORLD y), but store LOCAL positions for markers
      if (pWorld.y > maxWorldY) {
        maxWorldY = pWorld.y;
        highestLocalPos.copy(pLocal);
      }
      if (pWorld.y < minWorldY) {
        minWorldY = pWorld.y;
        lowestLocalPos.copy(pLocal);
      }
    }

    // ===== BUILD THE ORBITAL PLANE WITH TWO COLORED HALVES =====
    // Geometry is FLAT in LOCAL space (y=0). The parent transform tilts it in world.
    // We color segments based on their WORLD y position (above/below ecliptic).

    // Generate points for the orbit outline (LOCAL y=0 plane)
    const numPoints = 64;
    const orbitPoints = [];        // LOCAL positions for geometry
    const orbitPointsWorld = [];   // WORLD positions for coloring logic
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const localPoint = new THREE.Vector3(
        planeRadius * Math.cos(angle),
        0,
        planeRadius * Math.sin(angle)
      );
      orbitPoints.push(localPoint);
      orbitPointsWorld.push(localPoint.clone().applyMatrix4(localToWorld));
    }

    // Create the tilted orbit outline - WHITE LINE
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    hierarchyInspector.inclinationPlane.add(orbitLine);

    // Create two half-disc meshes for ABOVE and BELOW ecliptic portions
    // Geometry uses LOCAL positions, but we check WORLD y to determine coloring

    // Helper function to create a half-disc mesh
    // localPoints: positions for geometry (in local space)
    // worldPoints: positions for above/below check (in world space)
    const createHalfDisc = (localPoints, worldPoints, color, isAbove) => {
      const vertices = [];
      const indices = [];
      const center = new THREE.Vector3(0, 0, 0);

      // Add center point (local origin)
      vertices.push(center.x, center.y, center.z);

      // Add edge points from LOCAL positions (for geometry)
      for (let i = 0; i < localPoints.length; i++) {
        const p = localPoints[i];
        vertices.push(p.x, p.y, p.z);
      }

      // Create triangles from center to each pair of adjacent points
      // Use WORLD y to determine if segment is above/below ecliptic
      for (let i = 1; i < localPoints.length; i++) {
        const p1World = worldPoints[i - 1];
        const p2World = worldPoints[i];

        // Check if midpoint of this segment is above or below WORLD ecliptic (y=0)
        const midWorldY = (p1World.y + p2World.y) / 2;
        const segmentIsAbove = midWorldY > 0;

        if (segmentIsAbove === isAbove) {
          indices.push(0, i, i + 1);
        }
      }

      if (indices.length === 0) return null;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const material = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
      });

      return new THREE.Mesh(geometry, material);
    };

    // Create GREEN half for segments ABOVE world ecliptic (world y > 0)
    const aboveHalf = createHalfDisc(orbitPoints, orbitPointsWorld, 0x00ff00, true);
    if (aboveHalf) {
      hierarchyInspector.inclinationPlane.add(aboveHalf);
      hierarchyInspector.aboveHalfPlane = aboveHalf;
    }

    // Create RED half for segments BELOW world ecliptic (world y < 0)
    const belowHalf = createHalfDisc(orbitPoints, orbitPointsWorld, 0xff0000, false);
    if (belowHalf) {
      hierarchyInspector.inclinationPlane.add(belowHalf);
      hierarchyInspector.belowHalfPlane = belowHalf;
    }

    // ===== NODE MARKERS =====

    // Ascending node marker - MAGENTA sphere with UP arrow (planet rises above ecliptic here)
    const ascNodeGeometry = new THREE.SphereGeometry(planeRadius * 0.08, 16, 16);
    const ascNodeMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Magenta
    hierarchyInspector.ascendingNode = new THREE.Mesh(ascNodeGeometry, ascNodeMaterial);
    hierarchyInspector.ascendingNode.position.copy(ascendingNodePos);
    hierarchyInspector.inclinationPlane.add(hierarchyInspector.ascendingNode);

    // Ascending node arrow pointing up
    const ascArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      ascendingNodePos,
      planeRadius * 0.3,
      0xff00ff, // Magenta
      planeRadius * 0.1,
      planeRadius * 0.05
    );
    hierarchyInspector.inclinationPlane.add(ascArrow);
    hierarchyInspector._ascNodeArrow = ascArrow; // Cache for performance

    // Descending node marker - CYAN sphere with DOWN arrow (planet drops below ecliptic here)
    const descNodeGeometry = new THREE.SphereGeometry(planeRadius * 0.08, 16, 16);
    const descNodeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan
    hierarchyInspector.descendingNode = new THREE.Mesh(descNodeGeometry, descNodeMaterial);
    hierarchyInspector.descendingNode.position.copy(descendingNodePos);
    hierarchyInspector.inclinationPlane.add(hierarchyInspector.descendingNode);

    // Descending node arrow pointing down
    const descArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      descendingNodePos,
      planeRadius * 0.3,
      0x00ffff, // Cyan
      planeRadius * 0.1,
      planeRadius * 0.05
    );
    hierarchyInspector.inclinationPlane.add(descArrow);
    hierarchyInspector._descNodeArrow = descArrow; // Cache for performance

    // Line of nodes (yellow dashed) - connects ascending and descending nodes
    const nodesLineGeometry = new THREE.BufferGeometry().setFromPoints([
      ascendingNodePos, descendingNodePos
    ]);
    const nodesLineMaterial = new THREE.LineDashedMaterial({
      color: 0xffff00,
      linewidth: 2,
      dashSize: 3,
      gapSize: 2
    });
    const nodesLine = new THREE.Line(nodesLineGeometry, nodesLineMaterial);
    nodesLine.computeLineDistances();
    hierarchyInspector.inclinationPlane.add(nodesLine);
    hierarchyInspector._nodesLine = nodesLine; // Cache for performance

    // ===== HIGHEST/LOWEST POINT MARKERS =====
    // Use LOCAL positions (the parent transform will place them correctly in world)

    // Highest point marker - GREEN small sphere (maximum altitude above ecliptic)
    const highGeometry = new THREE.SphereGeometry(planeRadius * 0.05, 12, 12);
    const highMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green
    const highMarker = new THREE.Mesh(highGeometry, highMaterial);
    highMarker.position.copy(highestLocalPos);
    hierarchyInspector.inclinationPlane.add(highMarker);
    hierarchyInspector.highestPointMarker = highMarker;

    const highArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),  // UP arrow - highest point above ecliptic
      highestLocalPos,
      planeRadius * 0.15,
      0x00ff00, // Green
      planeRadius * 0.05,
      planeRadius * 0.03
    );
    hierarchyInspector.inclinationPlane.add(highArrow);
    hierarchyInspector._highArrow = highArrow;

    // Lowest point marker - RED small sphere (maximum depth below ecliptic)
    const lowGeometry = new THREE.SphereGeometry(planeRadius * 0.05, 12, 12);
    const lowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red
    const lowMarker = new THREE.Mesh(lowGeometry, lowMaterial);
    lowMarker.position.copy(lowestLocalPos);
    hierarchyInspector.inclinationPlane.add(lowMarker);
    hierarchyInspector.lowestPointMarker = lowMarker;

    const lowArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),  // DOWN arrow - lowest point below ecliptic
      lowestLocalPos,
      planeRadius * 0.15,
      0xff0000, // Red
      planeRadius * 0.05,
      planeRadius * 0.03
    );
    hierarchyInspector.inclinationPlane.add(lowArrow);
    hierarchyInspector._lowArrow = lowArrow;

    // Add to containerObj (orbitContainer) NOT pivotObj!
    // The inclinationPlane should only inherit the orbital tilt (rotation.x, rotation.z)
    // but NOT the orbit.rotation.y which changes with startPos and animation.
    // The ascending/descending nodes are fixed points in space relative to the ecliptic.
    obj.containerObj.add(hierarchyInspector.inclinationPlane);
  }

  // Arrow from P (FixedPerihelionAtSun) to Sun (Step 4 only)
  // This arrow will be updated dynamically in updateHierarchyLiveData()
  if (hierarchyInspector.helpers.showPerihelionPoint && hierarchyInspector.currentStep === 3) {
    // Get the FixedPerihelionAtSun object for the current planet
    const planetKey = hierarchyInspector.currentPlanet;
    const fixedPerihelionObjects = {
      mercury: mercuryFixedPerihelionAtSun,
      venus: venusFixedPerihelionAtSun,
      mars: marsFixedPerihelionAtSun,
      jupiter: jupiterFixedPerihelionAtSun,
      saturn: saturnFixedPerihelionAtSun,
      uranus: uranusFixedPerihelionAtSun,
      neptune: neptuneFixedPerihelionAtSun,
      pluto: plutoFixedPerihelionAtSun,
      halleys: halleysFixedPerihelionAtSun,
      eros: erosFixedPerihelionAtSun
    };
    const fixedPerihelion = fixedPerihelionObjects[planetKey];

    // Store reference for dynamic updates
    hierarchyInspector._fixedPerihelionObj = fixedPerihelion;
    hierarchyInspector._perihelionArrowScale = scale;

    // Create arrow group that will be updated dynamically
    hierarchyInspector.perihelionArrow = new THREE.Group();

    // Create initial line geometry (will be updated each frame)
    const lineLength = scale * 1.5;
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -lineLength, 0, 0, lineLength], 3));
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    hierarchyInspector._perihelionLine = new THREE.Line(lineGeometry, lineMaterial);
    hierarchyInspector.perihelionArrow.add(hierarchyInspector._perihelionLine);

    // Create arrowhead (will be updated each frame)
    hierarchyInspector._perihelionArrowHead = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, lineLength * 0.85),
      lineLength * 0.15,
      0x00ff00,
      lineLength * 0.1,
      lineLength * 0.05
    );
    hierarchyInspector.perihelionArrow.add(hierarchyInspector._perihelionArrowHead);

    // Add to scene (will be positioned in updateHierarchyLiveData)
    scene.add(hierarchyInspector.perihelionArrow);

    // Initialize arrow position immediately to avoid misplacement on first frame
    if (fixedPerihelion) {
      const sourceObj = fixedPerihelion.planetObj || fixedPerihelion.pivotObj;
      if (sourceObj) {
        // Initialize cached vectors
        hierarchyInspector._sunPosVec3 = new THREE.Vector3();
        hierarchyInspector._dirVec3 = new THREE.Vector3();
        hierarchyInspector._defaultDir = new THREE.Vector3(0, 0, 1);
        hierarchyInspector._arrowQuat = new THREE.Quaternion();

        // Get initial positions
        const initialPos = new THREE.Vector3();
        sourceObj.getWorldPosition(initialPos);
        hierarchyInspector.perihelionArrow.position.copy(initialPos);

        // Get Sun's position and calculate direction
        if (sun && sun.pivotObj) {
          sun.pivotObj.getWorldPosition(hierarchyInspector._sunPosVec3);
          hierarchyInspector._dirVec3.subVectors(hierarchyInspector._sunPosVec3, initialPos).normalize();

          // Set initial rotation
          if (hierarchyInspector._dirVec3.lengthSq() > 0.0001) {
            hierarchyInspector._arrowQuat.setFromUnitVectors(hierarchyInspector._defaultDir, hierarchyInspector._dirVec3);
            hierarchyInspector.perihelionArrow.setRotationFromQuaternion(hierarchyInspector._arrowQuat);
          }
        }
      }
    }
  }

  // Anomaly visualization (Step 4 only - RealPerihelionAtSun)
  // Shows True Anomaly and Mean Anomaly as lines/arcs from Sun through orbit
  // Note: currentStep is 0-indexed, so step 4 = index 3
  if (hierarchyInspector.helpers.showAnomalies && hierarchyInspector.currentStep === 3) {
    const anomalyRadius = scale * 0.5; // Match inclination plane radius

    // Arc radii based on the planet's elliptic orbit size (distance between P and orbit center)
    // This makes the visualization proportional to the actual orbit eccentricity
    const ellipticOrbitRadius = obj.orbitRadius || anomalyRadius * 0.5;

    // Only create the anomalyGroup and its contents if it doesn't exist
    // This allows the visualization to persist when toggling OTHER helper checkboxes
    if (!hierarchyInspector.anomalyGroup) {
      // Create a group for anomaly visuals - will be added to scene at Sun's position
      hierarchyInspector.anomalyGroup = new THREE.Group();

      const arcSegments = 32;
      const trueArcRadius = ellipticOrbitRadius * 1.2;   // True anomaly arc (outer)
      const meanArcRadius = ellipticOrbitRadius * 1.0;   // Mean anomaly arc (inner)
      hierarchyInspector._trueArcRadius = trueArcRadius;
      hierarchyInspector._meanArcRadius = meanArcRadius;

      const trueArcGeo = new THREE.BufferGeometry();
      const trueArcPositions = new Float32Array((arcSegments + 1) * 3);
      trueArcGeo.setAttribute('position', new THREE.BufferAttribute(trueArcPositions, 3));
      const trueArcMat = new THREE.LineBasicMaterial({ color: 0xff9800, linewidth: 2 });
      hierarchyInspector.trueAnomalyArc = new THREE.Line(trueArcGeo, trueArcMat);
      hierarchyInspector.anomalyGroup.add(hierarchyInspector.trueAnomalyArc);

      // Mean Anomaly arc (yellow dashed) - shows the uniform angle
      const meanArcGeo = new THREE.BufferGeometry();
      const meanArcPositions = new Float32Array((arcSegments + 1) * 3);
      meanArcGeo.setAttribute('position', new THREE.BufferAttribute(meanArcPositions, 3));
      const meanArcMat = new THREE.LineDashedMaterial({
        color: 0xffeb3b,
        dashSize: 1,
        gapSize: 1,
        linewidth: 2
      });
      hierarchyInspector.meanAnomalyArc = new THREE.Line(meanArcGeo, meanArcMat);
      hierarchyInspector.anomalyGroup.add(hierarchyInspector.meanAnomalyArc);

      // Start marker for True Anomaly arc (small sphere at 0°)
      const trueStartMarkerGeo = new THREE.SphereGeometry(ellipticOrbitRadius * 0.04, 8, 8);
      const trueStartMarkerMat = new THREE.MeshBasicMaterial({ color: 0xff9800 });
      hierarchyInspector.trueAnomalyStartMarker = new THREE.Mesh(trueStartMarkerGeo, trueStartMarkerMat);
      hierarchyInspector.trueAnomalyStartMarker.position.set(trueArcRadius, 0, 0); // At arc start (0°)
      hierarchyInspector.anomalyGroup.add(hierarchyInspector.trueAnomalyStartMarker);

      // Start marker for Mean Anomaly arc (small sphere at 0°)
      const meanStartMarkerGeo = new THREE.SphereGeometry(ellipticOrbitRadius * 0.035, 8, 8);
      const meanStartMarkerMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
      hierarchyInspector.meanAnomalyStartMarker = new THREE.Mesh(meanStartMarkerGeo, meanStartMarkerMat);
      hierarchyInspector.meanAnomalyStartMarker.position.set(meanArcRadius, 0, 0); // At arc start (0°)
      hierarchyInspector.anomalyGroup.add(hierarchyInspector.meanAnomalyStartMarker);

      // Direction arrow for True Anomaly (shows counter-clockwise direction)
      // Arrow points in the direction of increasing anomaly (counter-clockwise = -Z in Three.js when starting from +X)
      const trueArrowDir = new THREE.Vector3(0, 0, -1); // Counter-clockwise direction
      hierarchyInspector.trueAnomalyArrow = new THREE.ArrowHelper(
        trueArrowDir,
        new THREE.Vector3(trueArcRadius, 0, 0), // Start at 0° position
        ellipticOrbitRadius * 0.1, // Length
        0xff9800, // Orange
        ellipticOrbitRadius * 0.05, // Head length
        ellipticOrbitRadius * 0.03 // Head width
      );
      hierarchyInspector.anomalyGroup.add(hierarchyInspector.trueAnomalyArrow);

      // Direction arrow for Mean Anomaly (shows counter-clockwise direction)
      const meanArrowDir = new THREE.Vector3(0, 0, -1); // Counter-clockwise direction
      hierarchyInspector.meanAnomalyArrow = new THREE.ArrowHelper(
        meanArrowDir,
        new THREE.Vector3(meanArcRadius, 0, 0), // Start at 0° position
        ellipticOrbitRadius * 0.08, // Length
        0xffeb3b, // Yellow
        ellipticOrbitRadius * 0.04, // Head length
        ellipticOrbitRadius * 0.025 // Head width
      );
      hierarchyInspector.anomalyGroup.add(hierarchyInspector.meanAnomalyArrow);

      // Earth-Sun reference line
      // This shows the direction from Earth through Sun to the opposite side
      // - From Earth to Sun: subtle/transparent
      // - From Sun to beyond mean anomaly circle: same color as mean anomaly
      const earthSunLineLength = meanArcRadius * 1.15; // Extends just past the mean anomaly arc

      // Create a group for the Earth-Sun line (will be rotated to point away from Earth)
      hierarchyInspector.earthSunLine = new THREE.Group();

      // Part 1: Sun to beyond mean anomaly circle (yellow, same as mean anomaly)
      const sunToArcGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(earthSunLineLength, 0, 0)
      ]);
      const sunToArcMat = new THREE.LineBasicMaterial({
        color: 0xffeb3b,
        linewidth: 2
      });
      const sunToArcLine = new THREE.Line(sunToArcGeo, sunToArcMat);
      hierarchyInspector.earthSunLine.add(sunToArcLine);

      // Part 2: Earth to Sun (subtle/transparent) - this will be in negative X direction
      // We'll get the actual Earth distance dynamically, but use a reasonable estimate for now
      const earthToSunGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-meanArcRadius * 3, 0, 0) // Extends toward Earth (will be clipped by scene)
      ]);
      const earthToSunMat = new THREE.LineBasicMaterial({
        color: 0xffeb3b,
        transparent: true,
        opacity: 0.2
      });
      const earthToSunLine = new THREE.Line(earthToSunGeo, earthToSunMat);
      hierarchyInspector.earthSunLine.add(earthToSunLine);

      hierarchyInspector.anomalyGroup.add(hierarchyInspector.earthSunLine);

      // Add to scene (will be positioned at Sun in updateHierarchyLiveData)
      scene.add(hierarchyInspector.anomalyGroup);
    }

    // P → Planet line (Red) - for Mean Anomaly visualization
    // Shows direction from orbit center (P) to planet position
    // Only create if doesn't already exist (these persist across helper checkbox toggles)
    if (!hierarchyInspector.pToPlanetLine) {
      const pToPlanetGeo = new THREE.BufferGeometry();
      pToPlanetGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const pToPlanetMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
      hierarchyInspector.pToPlanetLine = new THREE.Line(pToPlanetGeo, pToPlanetMat);
      scene.add(hierarchyInspector.pToPlanetLine); // Add to scene, not group (world coords)
    }

    // Sun → Planet line (Amber) - for True Anomaly visualization
    // Shows direction from Sun (focus) to planet position
    if (!hierarchyInspector.sunToPlanetLine) {
      const sunToPlanetGeo = new THREE.BufferGeometry();
      sunToPlanetGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const sunToPlanetMat = new THREE.LineBasicMaterial({ color: 0xffbf00, linewidth: 2 });
      hierarchyInspector.sunToPlanetLine = new THREE.Line(sunToPlanetGeo, sunToPlanetMat);
      scene.add(hierarchyInspector.sunToPlanetLine); // Add to scene, not group (world coords)
    }

    // Mean Anomaly Arc (Cyan, dashed) - centered at P (orbit center)
    if (!hierarchyInspector.meanAnomalyArcAtP) {
      const newArcSegments = 64;
      const meanArcAtPGeo = new THREE.BufferGeometry();
      const meanArcAtPPositions = new Float32Array((newArcSegments + 1) * 3);
      meanArcAtPGeo.setAttribute('position', new THREE.BufferAttribute(meanArcAtPPositions, 3));
      const meanArcAtPMat = new THREE.LineDashedMaterial({
        color: 0x00ffff,
        linewidth: 2,
        dashSize: 3,
        gapSize: 2
      });
      hierarchyInspector.meanAnomalyArcAtP = new THREE.Line(meanArcAtPGeo, meanArcAtPMat);
      scene.add(hierarchyInspector.meanAnomalyArcAtP); // Add to scene (world coords)
    }

    // True Anomaly Arc (Amber, solid) - centered at Sun (focus)
    if (!hierarchyInspector.trueAnomalyArcAtSun) {
      const trueArcSegments = 64;
      const trueArcAtSunGeo = new THREE.BufferGeometry();
      const trueArcAtSunPositions = new Float32Array((trueArcSegments + 1) * 3);
      trueArcAtSunGeo.setAttribute('position', new THREE.BufferAttribute(trueArcAtSunPositions, 3));
      const trueArcAtSunMat = new THREE.LineBasicMaterial({ color: 0xffbf00, linewidth: 2 });
      hierarchyInspector.trueAnomalyArcAtSun = new THREE.Line(trueArcAtSunGeo, trueArcAtSunMat);
      scene.add(hierarchyInspector.trueAnomalyArcAtSun); // Add to scene (world coords)
    }

    // Store arc radii for dynamic updates
    if (!hierarchyInspector._meanArcAtPRadius) {
      hierarchyInspector._meanArcAtPRadius = ellipticOrbitRadius * 0.3;
    }
    if (!hierarchyInspector._trueArcAtSunRadius) {
      hierarchyInspector._trueArcAtSunRadius = ellipticOrbitRadius * 0.4;
    }

    // Initialize anomaly group position and arc geometry immediately to avoid misplacement on first frame
    // Position at the SUN (center of solar system), not at the orbital container
    if (sun && sun.pivotObj) {
      sun.pivotObj.getWorldPosition(_hiSunPos);
      hierarchyInspector.anomalyGroup.position.copy(_hiSunPos);

      // Calculate initial rotation to align with perihelion direction
      const planetKey = hierarchyInspector.currentPlanet;
      const initFixedPerihelionObjects = {
        mercury: mercuryFixedPerihelionAtSun,
        venus: venusFixedPerihelionAtSun,
        mars: marsFixedPerihelionAtSun,
        jupiter: jupiterFixedPerihelionAtSun,
        saturn: saturnFixedPerihelionAtSun,
        uranus: uranusFixedPerihelionAtSun,
        neptune: neptuneFixedPerihelionAtSun,
        pluto: plutoFixedPerihelionAtSun,
        halleys: halleysFixedPerihelionAtSun,
        eros: erosFixedPerihelionAtSun
      };
      const initFixedPerihelion = initFixedPerihelionObjects[planetKey];

      if (initFixedPerihelion) {
        const sourceObj = initFixedPerihelion.planetObj || initFixedPerihelion.pivotObj;
        if (sourceObj) {
          sourceObj.getWorldPosition(_hiPerihelionPos);

          // Calculate direction from Sun to Perihelion (P point)
          const dx = _hiPerihelionPos.x - _hiSunPos.x;
          const dz = _hiPerihelionPos.z - _hiSunPos.z;
          // atan2(dz, dx) gives angle from +X to Sun→P direction
          // Add PI to flip 180° so markers are on P side, not Sun side
          const perihelionAngle = Math.atan2(dz, dx);

          // Rotate so local +X points toward P (away from Sun center)
          hierarchyInspector.anomalyGroup.rotation.y = -perihelionAngle + Math.PI;

          // Apply orbital plane tilt
          if (obj && obj.containerObj) {
            hierarchyInspector.anomalyGroup.rotation.x = obj.containerObj.rotation.x;
            hierarchyInspector.anomalyGroup.rotation.z = obj.containerObj.rotation.z;
          }

          // Initialize Earth-Sun line rotation
          if (hierarchyInspector.earthSunLine && earth && earth.pivotObj) {
            earth.pivotObj.getWorldPosition(_hiEarthPos);

            // Direction from Earth to Sun
            const dxE = _hiSunPos.x - _hiEarthPos.x;
            const dzE = _hiSunPos.z - _hiEarthPos.z;
            const earthToSunAngle = Math.atan2(dzE, dxE);

            // Convert to local space
            const groupRotY = hierarchyInspector.anomalyGroup.rotation.y;
            const localAngle = earthToSunAngle + groupRotY;

            hierarchyInspector.earthSunLine.rotation.y = -localAngle;
          }
        }
      }

      // Calculate the Earth-Sun angle in local space for arc initialization
      // This should match what updateHierarchyLiveData does
      let initEarthSunLocalAngle = 0;
      if (earth && earth.pivotObj) {
        earth.pivotObj.getWorldPosition(_hiEarthPos);

        // Direction from Earth to Sun
        const dxE = _hiSunPos.x - _hiEarthPos.x;
        const dzE = _hiSunPos.z - _hiEarthPos.z;
        const earthToSunAngle = Math.atan2(dzE, dxE);

        // Convert to local space
        const groupRotY = hierarchyInspector.anomalyGroup.rotation.y;
        initEarthSunLocalAngle = earthToSunAngle + groupRotY;
      }

      // Use the same angle for both arcs (true anomaly will be adjusted for eccentricity later)
      const trueAnomalyRad = initEarthSunLocalAngle;
      const meanAnomalyRad = initEarthSunLocalAngle;

      // Initialize true anomaly arc geometry
      if (hierarchyInspector.trueAnomalyArc) {
        const arcSegments = 32;
        const arcRadius = hierarchyInspector._trueArcRadius || 50;
        const positions = hierarchyInspector.trueAnomalyArc.geometry.attributes.position.array;
        for (let i = 0; i <= arcSegments; i++) {
          const t = i / arcSegments;
          const angle = t * trueAnomalyRad;
          positions[i * 3] = arcRadius * Math.cos(angle);
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = -arcRadius * Math.sin(angle);
        }
        hierarchyInspector.trueAnomalyArc.geometry.attributes.position.needsUpdate = true;
      }

      // Initialize mean anomaly arc geometry
      if (hierarchyInspector.meanAnomalyArc) {
        const arcSegments = 32;
        const arcRadius = hierarchyInspector._meanArcRadius || 40;
        const positions = hierarchyInspector.meanAnomalyArc.geometry.attributes.position.array;
        for (let i = 0; i <= arcSegments; i++) {
          const t = i / arcSegments;
          const angle = t * meanAnomalyRad;
          positions[i * 3] = arcRadius * Math.cos(angle);
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = -arcRadius * Math.sin(angle);
        }
        hierarchyInspector.meanAnomalyArc.geometry.attributes.position.needsUpdate = true;
        hierarchyInspector.meanAnomalyArc.computeLineDistances();
      }
    }
  }

  // Make RealPerihelionAtSun and FixedPerihelionAtSun visible at Step 4
  // This helps visualize the perihelion movement around the real perihelion point
  if (hierarchyInspector.currentStep === 3) {
    const planetKey = hierarchyInspector.currentPlanet;

    // Mapping of planet keys to their RealPerihelionAtSun and FixedPerihelionAtSun objects
    const perihelionObjects = {
      mercury: { fromSun: mercuryRealPerihelionAtSun, atSun: mercuryFixedPerihelionAtSun },
      venus: { fromSun: venusRealPerihelionAtSun, atSun: venusFixedPerihelionAtSun },
      mars: { fromSun: marsRealPerihelionAtSun, atSun: marsFixedPerihelionAtSun },
      jupiter: { fromSun: jupiterRealPerihelionAtSun, atSun: jupiterFixedPerihelionAtSun },
      saturn: { fromSun: saturnRealPerihelionAtSun, atSun: saturnFixedPerihelionAtSun },
      uranus: { fromSun: uranusRealPerihelionAtSun, atSun: uranusFixedPerihelionAtSun },
      neptune: { fromSun: neptuneRealPerihelionAtSun, atSun: neptuneFixedPerihelionAtSun },
      pluto: { fromSun: plutoRealPerihelionAtSun, atSun: plutoFixedPerihelionAtSun },
      halleys: { fromSun: halleysRealPerihelionAtSun, atSun: halleysFixedPerihelionAtSun },
      eros: { fromSun: erosRealPerihelionAtSun, atSun: erosFixedPerihelionAtSun }
    };

    const objects = perihelionObjects[planetKey];
    if (objects) {
      // Store original state to restore later
      hierarchyInspector._perihelionFromSunOriginalVisible = objects.fromSun.planetObj?.visible;
      hierarchyInspector._perihelionAtSunOriginalVisible = objects.atSun.planetObj?.visible;
      hierarchyInspector._perihelionFromSunOrbitOriginalVisible = objects.fromSun.orbitLineObj?.visible;

      // Make RealPerihelionAtSun visible (purple sphere and orbit line)
      if (objects.fromSun.planetObj) {
        objects.fromSun.planetObj.visible = true;
        // Store original scale and set consistent size (base size varies between objects)
        hierarchyInspector._perihelionFromSunOriginalScale = objects.fromSun.planetObj.scale.clone();
        // Calculate scale to achieve size 1.5: scale = 1.5 / baseSize
        const fromSunScale = 1.5 / (objects.fromSun.size || 1);
        objects.fromSun.planetObj.scale.setScalar(fromSunScale);
        // Change color to purple to distinguish it
        if (objects.fromSun.planetObj.material) {
          hierarchyInspector._perihelionFromSunOriginalColor = objects.fromSun.planetObj.material.color.clone();
          objects.fromSun.planetObj.material.color.setHex(0x9932cc); // Purple
          objects.fromSun.planetObj.material.emissive = new THREE.Color(0x9932cc);
          objects.fromSun.planetObj.material.emissiveIntensity = 0.5;
          // Render on top of scene objects, but below green dot (which has renderOrder 999)
          objects.fromSun.planetObj.material.depthTest = false;
          objects.fromSun.planetObj.renderOrder = 997;
        }

        // Create "P2" label sprite and attach to the planetObj
        // Only show P2 label if purple dot is far enough from green dot
        let showP2Label = true;
        if (objects.atSun.planetObj && objects.fromSun.planetObj) {
          objects.fromSun.planetObj.getWorldPosition(_hiPurpleWorldPos);
          objects.atSun.planetObj.getWorldPosition(_hiGreenWorldPos);
          const distance = _hiPurpleWorldPos.distanceTo(_hiGreenWorldPos);
          // If dots are closer than 3 units, don't show P2 label (green dot would overlap it)
          if (distance < 3) {
            showP2Label = false;
          }
        }

        if (showP2Label) {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 36px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('P2', 32, 32);

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            transparent: true
          });
          const sprite = new THREE.Sprite(spriteMaterial);
          // Counter-scale to achieve consistent size regardless of parent's scale
          const labelSize = 1.5 / fromSunScale;
          sprite.scale.set(labelSize, labelSize, 1);
          sprite.renderOrder = 998; // Above purple dot (997), below green dot (999)
          objects.fromSun.planetObj.add(sprite);
          hierarchyInspector._perihelionFromSunLabel = sprite;
        }
      }
      // Also make the orbit line visible (this is the elliptical path)
      if (objects.fromSun.orbitLineObj) {
        objects.fromSun.orbitLineObj.visible = true;
        // Store original color and change to purple
        hierarchyInspector._perihelionFromSunOrbitOriginalColor = objects.fromSun.orbitLineObj.material?.color?.clone();
        if (objects.fromSun.orbitLineObj.material) {
          objects.fromSun.orbitLineObj.material.color.setHex(0x9932cc); // Purple
          objects.fromSun.orbitLineObj.material.opacity = 0.8;
        }
      }

      // Make FixedPerihelionAtSun visible (green sphere - the "real" perihelion)
      if (objects.atSun.planetObj) {
        objects.atSun.planetObj.visible = true;
        // Store original scale and set consistent size (base size varies between objects)
        hierarchyInspector._perihelionAtSunOriginalScale = objects.atSun.planetObj.scale.clone();
        // Calculate scale to achieve size 1.5 (slightly bigger): scale = 1.5 / baseSize
        const atSunScale = 1.5 / (objects.atSun.size || 1);
        objects.atSun.planetObj.scale.setScalar(atSunScale);
        // Change color to bright green to distinguish it as the "real" perihelion point
        if (objects.atSun.planetObj.material) {
          hierarchyInspector._perihelionAtSunOriginalColor = objects.atSun.planetObj.material.color.clone();
          objects.atSun.planetObj.material.color.setHex(0x00ff00); // Bright green
          objects.atSun.planetObj.material.emissive = new THREE.Color(0x00ff00);
          objects.atSun.planetObj.material.emissiveIntensity = 0.5;
          // Render on top of other objects, and write to depth buffer so it can occlude P2
          objects.atSun.planetObj.material.depthTest = false;
          objects.atSun.planetObj.material.depthWrite = true;
          objects.atSun.planetObj.renderOrder = 999;
        }

        // Create "P" label sprite and attach to the planetObj
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          depthTest: false,
          transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        // Counter-scale to achieve consistent size regardless of parent's scale
        // Parent is scaled by atSunScale, so we divide by it to get consistent world size
        const labelSize = 2.5 / atSunScale;
        sprite.scale.set(labelSize, labelSize, 1);
        sprite.renderOrder = 1001; // Highest - always on top
        objects.atSun.planetObj.add(sprite);
        hierarchyInspector._perihelionLabel = sprite;
      }

      // Store references for cleanup
      hierarchyInspector._perihelionFromSunObj = objects.fromSun;
      hierarchyInspector._perihelionAtSunObj = objects.atSun;
    }
  }

  // Planet locator circle (Step 4 and Step 5 only)
  // Creates a bright circle around the planet to make it easier to find
  if (hierarchyInspector.currentStep === 3 || hierarchyInspector.currentStep === 4) {
    const planetKey = hierarchyInspector.currentPlanet;
    const hierarchy = PLANET_HIERARCHIES[planetKey];
    if (hierarchy) {
      const steps = hierarchy.steps();
      // Get the actual planet (Step 5, index 4)
      const planetStepObj = steps[4]?.obj;
      if (planetStepObj && planetStepObj.planetObj) {
        // Create a circle that will surround the planet
        // Size based on planet's actual size or a minimum visible size
        const planetSize = planetStepObj.size || 1;
        const circleRadius = Math.max(planetSize * 3, 2); // At least 3x planet size, minimum 2 units

        // Create ring geometry (torus for 3D visibility from any angle)
        const ringGeometry = new THREE.TorusGeometry(circleRadius, circleRadius * 0.1, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff, // Cyan color
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          depthTest: false // Always visible
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.renderOrder = 998; // Render on top

        // Add to scene (will be positioned in updateHierarchyLiveData)
        scene.add(ring);
        hierarchyInspector._planetLocatorCircle = ring;
        hierarchyInspector._planetLocatorTarget = planetStepObj;

        // Initialize position immediately
        if (planetStepObj.planetObj) {
          planetStepObj.planetObj.getWorldPosition(_hiTempPos);
          ring.position.copy(_hiTempPos);
        }
      }
    }
  }
}

// Clear visual helpers
// Options:
//   forceCleanAnomalies: if true, always clean anomaly elements; if false, only clean if showAnomalies is off or not step 3
function clearVisualHelpers(options = {}) {
  const { forceCleanAnomalies = false } = options;

  // Determine if we should clean anomaly elements
  // Clean them if: forced OR showAnomalies is off OR not on step 3
  const shouldCleanAnomalies = forceCleanAnomalies ||
                               !hierarchyInspector.helpers.showAnomalies ||
                               hierarchyInspector.currentStep !== 3;

  // Restore temporary perihelion visibility (used by step-based camera focus)
  if (hierarchyInspector._tempPerihelionVisible) {
    const prevObj = hierarchyInspector._tempPerihelionVisible;
    if (prevObj.planetObj) {
      prevObj.planetObj.visible = hierarchyInspector._tempPerihelionOriginalVisible ?? false;
    }
    if (prevObj.orbitLineObj) {
      prevObj.orbitLineObj.visible = hierarchyInspector._tempPerihelionOrbitOriginalVisible ?? false;
    }
    hierarchyInspector._tempPerihelionVisible = null;
    hierarchyInspector._tempPerihelionOriginalVisible = null;
    hierarchyInspector._tempPerihelionOrbitOriginalVisible = null;
  }

  if (hierarchyInspector.axesHelper) {
    hierarchyInspector.axesHelper.parent?.remove(hierarchyInspector.axesHelper);
    hierarchyInspector.axesHelper.dispose?.();
    hierarchyInspector.axesHelper = null;
  }
  if (hierarchyInspector.startPosArrow) {
    hierarchyInspector.startPosArrow.parent?.remove(hierarchyInspector.startPosArrow);
    hierarchyInspector.startPosArrow = null;
  }
  if (hierarchyInspector.currentPosArrow) {
    hierarchyInspector.currentPosArrow.parent?.remove(hierarchyInspector.currentPosArrow);
    hierarchyInspector.currentPosArrow = null;
  }
  if (hierarchyInspector.orbitCenterArrow) {
    hierarchyInspector.orbitCenterArrow.parent?.remove(hierarchyInspector.orbitCenterArrow);
    hierarchyInspector.orbitCenterArrow = null;
  }
  if (hierarchyInspector.earthPerihelionArrow) {
    hierarchyInspector.earthPerihelionArrow.parent?.remove(hierarchyInspector.earthPerihelionArrow);
    hierarchyInspector.earthPerihelionArrow.dispose?.();
    hierarchyInspector.earthPerihelionArrow = null;
  }
  if (hierarchyInspector.rotationArrow) {
    hierarchyInspector.rotationArrow.parent?.remove(hierarchyInspector.rotationArrow);
    hierarchyInspector.rotationArrow.geometry?.dispose();
    hierarchyInspector.rotationArrow.material?.dispose();
    hierarchyInspector.rotationArrow = null;
  }
  if (hierarchyInspector.inclinationPlane) {
    hierarchyInspector.inclinationPlane.parent?.remove(hierarchyInspector.inclinationPlane);
    // Dispose all children geometries and materials
    hierarchyInspector.inclinationPlane.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    hierarchyInspector.inclinationPlane = null;
    hierarchyInspector.ascendingNode = null;
    hierarchyInspector.descendingNode = null;
    hierarchyInspector.aboveHalfPlane = null;
    hierarchyInspector.belowHalfPlane = null;
    hierarchyInspector.highestPointMarker = null;
    hierarchyInspector.lowestPointMarker = null;
    hierarchyInspector._highArrow = null;
    hierarchyInspector._lowArrow = null;
    hierarchyInspector._ascNodeArrow = null;
    hierarchyInspector._descNodeArrow = null;
    hierarchyInspector._nodesLine = null;
    // Reset tilt cache to force recalculation on next creation
    _lastAscNodeTiltA = null;
    _lastAscNodeTiltB = null;
  }
  if (hierarchyInspector.perihelionDot) {
    hierarchyInspector.perihelionDot.parent?.remove(hierarchyInspector.perihelionDot);
    hierarchyInspector.perihelionDot.geometry?.dispose();
    hierarchyInspector.perihelionDot.material?.dispose();
    hierarchyInspector.perihelionDot = null;
  }
  if (hierarchyInspector.perihelionArrow) {
    hierarchyInspector.perihelionArrow.parent?.remove(hierarchyInspector.perihelionArrow);
    hierarchyInspector.perihelionArrow = null;
    hierarchyInspector._perihelionLine = null;
    hierarchyInspector._perihelionArrowHead = null;
    hierarchyInspector._fixedPerihelionObj = null;
    hierarchyInspector._perihelionArrowScale = null;
    // Clear cached vectors (they'll be recreated if needed)
    hierarchyInspector._sunPosVec3 = null;
    hierarchyInspector._dirVec3 = null;
    hierarchyInspector._defaultDir = null;
    hierarchyInspector._arrowQuat = null;
  }
  // Clean up anomaly visualization elements only when appropriate
  // (when showAnomalies is off, not on step 3, or forced)
  if (shouldCleanAnomalies && hierarchyInspector.anomalyGroup) {
    hierarchyInspector.anomalyGroup.parent?.remove(hierarchyInspector.anomalyGroup);
    hierarchyInspector.anomalyGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    hierarchyInspector.anomalyGroup = null;
    hierarchyInspector.trueAnomalyArc = null;
    hierarchyInspector.meanAnomalyArc = null;
    hierarchyInspector.trueAnomalyStartMarker = null;
    hierarchyInspector.meanAnomalyStartMarker = null;
    hierarchyInspector.trueAnomalyArrow = null;
    hierarchyInspector.meanAnomalyArrow = null;
    hierarchyInspector.earthSunLine = null;
    hierarchyInspector._trueArcRadius = null;
    hierarchyInspector._meanArcRadius = null;
  }
  // Clean up new anomaly visualization elements (added to scene directly)
  // Only clean when shouldCleanAnomalies is true
  if (shouldCleanAnomalies) {
    if (hierarchyInspector.pToPlanetLine) {
      hierarchyInspector.pToPlanetLine.parent?.remove(hierarchyInspector.pToPlanetLine);
      hierarchyInspector.pToPlanetLine.geometry?.dispose();
      hierarchyInspector.pToPlanetLine.material?.dispose();
      hierarchyInspector.pToPlanetLine = null;
    }
    if (hierarchyInspector.sunToPlanetLine) {
      hierarchyInspector.sunToPlanetLine.parent?.remove(hierarchyInspector.sunToPlanetLine);
      hierarchyInspector.sunToPlanetLine.geometry?.dispose();
      hierarchyInspector.sunToPlanetLine.material?.dispose();
      hierarchyInspector.sunToPlanetLine = null;
    }
    if (hierarchyInspector.meanAnomalyArcAtP) {
      hierarchyInspector.meanAnomalyArcAtP.parent?.remove(hierarchyInspector.meanAnomalyArcAtP);
      hierarchyInspector.meanAnomalyArcAtP.geometry?.dispose();
      hierarchyInspector.meanAnomalyArcAtP.material?.dispose();
      hierarchyInspector.meanAnomalyArcAtP = null;
    }
    if (hierarchyInspector.trueAnomalyArcAtSun) {
      hierarchyInspector.trueAnomalyArcAtSun.parent?.remove(hierarchyInspector.trueAnomalyArcAtSun);
      hierarchyInspector.trueAnomalyArcAtSun.geometry?.dispose();
      hierarchyInspector.trueAnomalyArcAtSun.material?.dispose();
      hierarchyInspector.trueAnomalyArcAtSun = null;
    }
    hierarchyInspector._meanArcAtPRadius = null;
    hierarchyInspector._trueArcAtSunRadius = null;
  }

  // Restore original state of RealPerihelionAtSun and FixedPerihelionAtSun objects
  if (hierarchyInspector._perihelionFromSunObj) {
    const obj = hierarchyInspector._perihelionFromSunObj;
    if (obj.planetObj) {
      obj.planetObj.visible = hierarchyInspector._perihelionFromSunOriginalVisible ?? false;
      // Restore original scale
      if (hierarchyInspector._perihelionFromSunOriginalScale) {
        obj.planetObj.scale.copy(hierarchyInspector._perihelionFromSunOriginalScale);
      }
      // Restore original color and depth settings
      if (hierarchyInspector._perihelionFromSunOriginalColor && obj.planetObj.material) {
        obj.planetObj.material.color.copy(hierarchyInspector._perihelionFromSunOriginalColor);
        obj.planetObj.material.emissive = new THREE.Color(0x000000);
        obj.planetObj.material.emissiveIntensity = 0;
        obj.planetObj.material.depthTest = true;
        obj.planetObj.renderOrder = 0;
      }
    }
    // Restore orbit line visibility and color
    if (obj.orbitLineObj) {
      obj.orbitLineObj.visible = hierarchyInspector._perihelionFromSunOrbitOriginalVisible ?? false;
      if (hierarchyInspector._perihelionFromSunOrbitOriginalColor && obj.orbitLineObj.material) {
        obj.orbitLineObj.material.color.copy(hierarchyInspector._perihelionFromSunOrbitOriginalColor);
        obj.orbitLineObj.material.opacity = 0.4;
      }
    }
    hierarchyInspector._perihelionFromSunObj = null;
    hierarchyInspector._perihelionFromSunOriginalVisible = null;
    hierarchyInspector._perihelionFromSunOriginalScale = null;
    hierarchyInspector._perihelionFromSunOriginalColor = null;
    hierarchyInspector._perihelionFromSunOrbitOriginalVisible = null;
    hierarchyInspector._perihelionFromSunOrbitOriginalColor = null;
  }
  // Remove RealPerihelionAtSun label sprite (P2)
  if (hierarchyInspector._perihelionFromSunLabel) {
    hierarchyInspector._perihelionFromSunLabel.parent?.remove(hierarchyInspector._perihelionFromSunLabel);
    hierarchyInspector._perihelionFromSunLabel.material?.map?.dispose();
    hierarchyInspector._perihelionFromSunLabel.material?.dispose();
    hierarchyInspector._perihelionFromSunLabel = null;
  }
  if (hierarchyInspector._perihelionAtSunObj) {
    const obj = hierarchyInspector._perihelionAtSunObj;
    if (obj.planetObj) {
      obj.planetObj.visible = hierarchyInspector._perihelionAtSunOriginalVisible ?? false;
      // Restore original scale
      if (hierarchyInspector._perihelionAtSunOriginalScale) {
        obj.planetObj.scale.copy(hierarchyInspector._perihelionAtSunOriginalScale);
      }
      // Restore original color and depth settings
      if (hierarchyInspector._perihelionAtSunOriginalColor && obj.planetObj.material) {
        obj.planetObj.material.color.copy(hierarchyInspector._perihelionAtSunOriginalColor);
        obj.planetObj.material.emissive = new THREE.Color(0x000000);
        obj.planetObj.material.emissiveIntensity = 0;
        obj.planetObj.material.depthTest = true;
        obj.planetObj.renderOrder = 0;
      }
    }
    hierarchyInspector._perihelionAtSunObj = null;
    hierarchyInspector._perihelionAtSunOriginalVisible = null;
    hierarchyInspector._perihelionAtSunOriginalScale = null;
    hierarchyInspector._perihelionAtSunOriginalColor = null;
  }
  // Remove perihelion label sprite
  if (hierarchyInspector._perihelionLabel) {
    hierarchyInspector._perihelionLabel.parent?.remove(hierarchyInspector._perihelionLabel);
    hierarchyInspector._perihelionLabel.material?.map?.dispose();
    hierarchyInspector._perihelionLabel.material?.dispose();
    hierarchyInspector._perihelionLabel = null;
  }
  // Remove planet locator circle
  if (hierarchyInspector._planetLocatorCircle) {
    hierarchyInspector._planetLocatorCircle.parent?.remove(hierarchyInspector._planetLocatorCircle);
    hierarchyInspector._planetLocatorCircle.geometry?.dispose();
    hierarchyInspector._planetLocatorCircle.material?.dispose();
    hierarchyInspector._planetLocatorCircle = null;
    hierarchyInspector._planetLocatorTarget = null;
  }
}

// Focus camera on the current step's pivot object with step-aware positioning
function focusOnStepObject(stepData) {
  const obj = stepData.obj;
  if (!obj.pivotObj) return;

  const step = hierarchyInspector.currentStep;
  const planetKey = hierarchyInspector.currentPlanet;
  const planetData = PLANET_HIERARCHIES[planetKey];

  // Get perihelion object for this planet
  const perihelionObj = planetData.perihelionOf?.();

  // Clean up any previously temporarily shown perihelion
  if (hierarchyInspector._tempPerihelionVisible) {
    const prevObj = hierarchyInspector._tempPerihelionVisible;
    if (prevObj.planetObj) {
      prevObj.planetObj.visible = hierarchyInspector._tempPerihelionOriginalVisible ?? false;
    }
    if (prevObj.orbitLineObj) {
      prevObj.orbitLineObj.visible = hierarchyInspector._tempPerihelionOrbitOriginalVisible ?? false;
    }
    hierarchyInspector._tempPerihelionVisible = null;
    hierarchyInspector._tempPerihelionOriginalVisible = null;
    hierarchyInspector._tempPerihelionOrbitOriginalVisible = null;
  }

  let targetPos = new THREE.Vector3();
  let viewDistance;
  let focusObj = null;  // The object to track in animation loop

  if (step === 0) {
    // Step 1 (index 0): Focus on earthPerihelionFromEarth
    if (earthPerihelionFromEarth?.pivotObj) {
      // Store original visibility and make visible temporarily
      hierarchyInspector._tempPerihelionOriginalVisible = earthPerihelionFromEarth.planetObj?.visible;
      hierarchyInspector._tempPerihelionOrbitOriginalVisible = earthPerihelionFromEarth.orbitLineObj?.visible;
      hierarchyInspector._tempPerihelionVisible = earthPerihelionFromEarth;

      if (earthPerihelionFromEarth.planetObj) earthPerihelionFromEarth.planetObj.visible = true;
      if (earthPerihelionFromEarth.orbitLineObj) earthPerihelionFromEarth.orbitLineObj.visible = true;

      focusObj = earthPerihelionFromEarth;
      earthPerihelionFromEarth.pivotObj.updateMatrixWorld(true);
      earthPerihelionFromEarth.pivotObj.getWorldPosition(targetPos);
      viewDistance = Math.max(100, (earthPerihelionFromEarth.orbitRadius || 50) * 2);
    } else {
      // Fallback to step object
      focusObj = obj;
      obj.pivotObj.updateMatrixWorld(true);
      obj.pivotObj.getWorldPosition(targetPos);
      viewDistance = Math.max(100, (obj.orbitRadius || 50) * 2);
    }
  } else if (step <= 2) {
    // Steps 2, 3 (indices 1, 2): Focus on PERIHELION object
    if (perihelionObj?.pivotObj) {
      // Store original visibility and make visible temporarily
      hierarchyInspector._tempPerihelionOriginalVisible = perihelionObj.planetObj?.visible;
      hierarchyInspector._tempPerihelionOrbitOriginalVisible = perihelionObj.orbitLineObj?.visible;
      hierarchyInspector._tempPerihelionVisible = perihelionObj;

      if (perihelionObj.planetObj) perihelionObj.planetObj.visible = true;
      if (perihelionObj.orbitLineObj) perihelionObj.orbitLineObj.visible = true;

      focusObj = perihelionObj;
      perihelionObj.pivotObj.updateMatrixWorld(true);
      perihelionObj.pivotObj.getWorldPosition(targetPos);
      viewDistance = Math.max(100, (perihelionObj.orbitRadius || 50) * 2);
    } else {
      // Fallback to step object if no perihelion
      focusObj = obj;
      obj.pivotObj.updateMatrixWorld(true);
      obj.pivotObj.getWorldPosition(targetPos);
      viewDistance = Math.max(100, (obj.orbitRadius || 50) * 2);
    }
  } else if (step === 3) {
    // Step 4 (index 3): Focus on Sun
    focusObj = sun;
    sun.pivotObj.updateMatrixWorld(true);
    sun.pivotObj.getWorldPosition(targetPos);
    viewDistance = Math.max(200, (obj.orbitRadius || 100) * 2);
  } else {
    // Step 5 (index 4): Focus on planet
    focusObj = obj;
    obj.pivotObj.updateMatrixWorld(true);
    obj.pivotObj.getWorldPosition(targetPos);
    viewDistance = Math.max(100, (obj.orbitRadius || 50) * 2);
  }

  // Enable hierarchy inspector camera control
  hierarchyInspector._cameraControlActive = true;
  hierarchyInspector._cameraTarget = focusObj;

  // Set camera target
  controls.target.copy(targetPos);

  // Position camera based on step
  if (step <= 3) {
    // Steps 1-4: Looking down on celestial plane (Y+ is up, Earth below, Sun on top)
    camera.position.set(targetPos.x, targetPos.y + viewDistance, targetPos.z);
  } else {
    // Step 5: Looking from Sun towards planet (camera behind planet, looking towards Sun)
    const sunPos = new THREE.Vector3();
    sun.pivotObj.updateMatrixWorld(true);
    sun.pivotObj.getWorldPosition(sunPos);

    const direction = new THREE.Vector3().subVectors(targetPos, sunPos).normalize();
    camera.position.copy(targetPos).add(direction.multiplyScalar(viewDistance));
  }

  // Update controls
  controls.minDistance = 0;
  controls.maxDistance = Infinity;
  controls.update();

  // Reset near plane to default for unrestricted zooming
  camera.near = 0.1;
  camera.updateProjectionMatrix();
}

// Build hierarchy tree HTML
function buildHierarchyTree(steps, currentIdx) {
  let html = '<span style="color:rgba(255,255,255,0.4)">startingPoint</span>\n';
  const indent = '    ';
  steps.forEach((step, idx) => {
    const prefix = indent.repeat(idx + 1) + '\u2514\u2500\u2500 ';
    if (idx === currentIdx) {
      html += `${prefix}<span class="hi-current">\u2605 ${step.name}</span>  \u2190 CURRENT\n`;
    } else {
      html += `${prefix}${step.name}\n`;
    }
  });
  return html;
}

// Update inspector display
function updateInspectorDisplay() {
  const panel = hierarchyInspector.panel;
  if (!panel) return;

  const planetData = PLANET_HIERARCHIES[hierarchyInspector.currentPlanet];
  if (!planetData) return;

  const steps = planetData.steps();
  const stepData = steps[hierarchyInspector.currentStep];
  const obj = stepData.obj;

  // Update step indicator
  panel.querySelector('.hi-step-indicator').textContent =
    `STEP ${hierarchyInspector.currentStep + 1} of ${steps.length}: ${obj.name || stepData.name}`;

  // Step 4 (index 3): Turn off some helpers by default for cleaner anomaly visualization
  const isStep4 = hierarchyInspector.currentStep === 3;
  const step4OffHelpers = ['showAxes', 'showStartPos', 'showRotationDir'];
  step4OffHelpers.forEach(helper => {
    const checkbox = panel.querySelector(`input[data-helper="${helper}"]`);
    if (checkbox) {
      if (isStep4) {
        checkbox.checked = false;
        hierarchyInspector.helpers[helper] = false;
      } else {
        checkbox.checked = true;
        hierarchyInspector.helpers[helper] = true;
      }
    }
  });

  // Show/hide Visual Legend section (only visible on Step 4)
  const legendSection = panel.querySelector('.hi-legend-section');
  if (legendSection) {
    legendSection.style.display = isStep4 ? 'block' : 'none';
  }

  // Show/hide Live Data section (only visible on Step 4)
  const liveSection = panel.querySelector('.hi-live-section');
  if (liveSection) {
    liveSection.style.display = isStep4 ? 'block' : 'none';
  }

  // Show/hide Report section (only visible on Step 5 - index 4)
  const isStep5 = hierarchyInspector.currentStep === 4;
  const reportSection = panel.querySelector('.hi-report-section');
  if (reportSection) {
    reportSection.style.display = isStep5 ? 'block' : 'none';
    if (isStep5) {
      // Generate and display report for Step 5
      generateAndDisplayReport(hierarchyInspector.currentPlanet);
    }
  }

  // Show/hide Step 4 specific helper checkboxes
  const step4Helpers = ['showOrbitCenter', 'showInclinationPlane', 'showPerihelionPoint', 'showAnomalies'];
  step4Helpers.forEach(helper => {
    const label = panel.querySelector(`input[data-helper="${helper}"]`)?.parentElement;
    if (label) {
      label.style.display = isStep4 ? '' : 'none';
    }
  });
  // Also hide the solar period section when not on Step 4
  const solarPeriodSection = panel.querySelector('.hi-solar-period-section');
  if (solarPeriodSection && !isStep4) {
    solarPeriodSection.style.display = 'none';
  }

  // Calculate derived values
  const periodYears = speedToPeriod(obj.speed);
  const arcsecPerCentury = periodToArcsecPerCentury(periodYears);
  const currentRotation = obj.orbitObj?.rotation?.y ?? 0;
  if (obj.pivotObj) obj.pivotObj.getWorldPosition(_hiWorldPos);

  // Build settings section
  const settingsHtml = `
    <div class="hi-props">
      <span class="hi-key">name</span><span class="hi-val">"${obj.name || 'unnamed'}"</span>
      <span class="hi-key">startPos</span><span class="hi-val">${formatNum(obj.startPos, 2)}\u00b0</span>
      <span class="hi-key">speed (raw)</span><span class="hi-val">${formatNum(obj.speed, 8)} rad/yr</span>
      <span class="hi-key">speed (period)</span><span class="hi-val">${formatNum(periodYears, 2)} years</span>
      <span class="hi-key">speed (arcsec)</span><span class="hi-val">${formatNum(arcsecPerCentury, 2)} "/century</span>
      <span class="hi-key">tilt</span><span class="hi-val">${formatNum(obj.tilt, 2)}\u00b0</span>
      <span class="hi-key">orbitRadius</span><span class="hi-val">${formatNum(obj.orbitRadius, 4)}</span>
      <span class="hi-key">orbitCenter</span><span class="hi-val">(${formatNum(obj.orbitCentera, 4)}, ${formatNum(obj.orbitCenterb, 4)}, ${formatNum(obj.orbitCenterc, 4)})</span>
      <span class="hi-key">orbitTilt</span><span class="hi-val">(${formatNum(obj.orbitTilta, 2)}\u00b0, ${formatNum(obj.orbitTiltb, 2)}\u00b0)</span>
      <span class="hi-key">visible</span><span class="hi-val">${obj.visible}</span>
      <span class="hi-key">isNotPhysical</span><span class="hi-val">${obj.isNotPhysicalObject ?? false}</span>
    </div>
  `;
  panel.querySelector('.hi-settings-content').innerHTML = settingsHtml;

  // Build runtime section
  const runtimeHtml = `
    <div class="hi-props">
      <span class="hi-key">Current rotation</span><span class="hi-val">${formatNum(currentRotation, 4)} rad (${formatNum(currentRotation * 180 / Math.PI, 2)}\u00b0)</span>
      <span class="hi-key">World position</span><span class="hi-val">(${formatNum(_hiWorldPos.x, 2)}, ${formatNum(_hiWorldPos.y, 2)}, ${formatNum(_hiWorldPos.z, 2)})</span>
      <span class="hi-key">containerObj</span><span class="hi-val">${obj.containerObj ? '\u2713 exists' : '\u2717 missing'}</span>
      <span class="hi-key">orbitObj</span><span class="hi-val">${obj.orbitObj ? '\u2713 exists' : '\u2717 missing'}</span>
      <span class="hi-key">pivotObj</span><span class="hi-val">${obj.pivotObj ? '\u2713 exists' : '\u2717 missing'}</span>
      <span class="hi-key">planetObj</span><span class="hi-val">${obj.planetObj ? '\u2713 exists' : '\u2717 missing'}</span>
    </div>
  `;
  panel.querySelector('.hi-runtime-content').innerHTML = runtimeHtml;

  // Build validation section
  const issues = validateStep(stepData, hierarchyInspector.currentStep, steps);
  let validationHtml = '';
  issues.forEach(issue => {
    const icon = issue.type === 'valid' ? '\u2713' : issue.type === 'warning' ? '\u26a0' : issue.type === 'info' ? '\u2139' : issue.type === 'reference' ? '\u2192' : '\u2717';
    validationHtml += `<div class="hi-validation-item ${issue.type}"><span class="hi-validation-icon">${icon}</span>${issue.msg}</div>`;
  });
  panel.querySelector('.hi-validation-content').innerHTML = validationHtml;

  // Build hierarchy tree
  panel.querySelector('.hi-tree').innerHTML = buildHierarchyTree(steps, hierarchyInspector.currentStep);

  // Clear Live Data section when not on Step 4 (the section is hidden, but reset cached elements)
  if (hierarchyInspector.currentStep !== 3) {
    _liveDataElements = null;
  }
  // If on Step 4, updateHierarchyLiveData() will populate it

  // Update nav buttons
  panel.querySelector('.hi-prev-btn').disabled = hierarchyInspector.currentStep === 0;
  panel.querySelector('.hi-next-btn').disabled = hierarchyInspector.currentStep === steps.length - 1;

  // Always show visual helpers and focus on the object when panel is open
  createVisualHelpers(stepData);
  focusOnStepObject(stepData);

  // Update highlight button state
  const highlightBtn = panel.querySelector('.hi-highlight-btn');
  highlightBtn.classList.add('active');
  highlightBtn.textContent = 'Hide Helpers';
  hierarchyInspector.highlightActive = true;
}

// Create inspector panel HTML
function createInspectorPanel() {
  const panel = document.createElement('div');
  panel.id = 'hierarchyInspector';
  panel.innerHTML = `
    <div class="hi-header">
      <h2>Planet Inspector</h2>
      <div class="hi-close" title="Close"></div>
    </div>
    <div class="hi-selector">
      <label>Planet:</label>
      <select class="hi-planet-select">
        ${Object.entries(PLANET_HIERARCHIES).map(([key, val]) =>
          `<option value="${key}">${val.label}</option>`
        ).join('')}
      </select>
    </div>
    <div class="hi-step-indicator">STEP 1 of 5</div>
    <div class="hi-body">
      <div class="hi-section">
        <div class="hi-section-title">Settings</div>
        <div class="hi-settings-content"></div>
      </div>
      <div class="hi-section">
        <div class="hi-section-title">Runtime State</div>
        <div class="hi-runtime-content"></div>
      </div>
      <div class="hi-section">
        <div class="hi-section-title">Validation</div>
        <div class="hi-validation-content"></div>
      </div>
      <div class="hi-section hi-live-section" style="display: none;">
        <div class="hi-section-title">Live Data <span style="color:#4caf50; font-size:10px;">(updates in real-time)</span></div>
        <div class="hi-live-content" style="font-family: var(--pl-mono-font); color: #4caf50;"></div>
      </div>
      <div class="hi-section hi-report-section" style="display: none;">
        <div class="hi-section-title">Position Report <span style="color:#64b5f6; font-size:10px;">(Step 5)</span></div>
        <div class="hi-report-content">
          <div class="hi-report-loading">Generating report...</div>
          <pre class="hi-report"></pre>
          <div class="hi-report-buttons">
            <button class="hi-report-btn download">Download Excel</button>
            <button class="hi-report-btn copy">Copy Report</button>
            <label class="hi-report-checkbox-label">
              <input type="checkbox" class="hi-report-show-all">
              <span>Show all results</span>
            </label>
          </div>
        </div>
      </div>
      <div class="hi-section hi-legend-section" style="display: none;">
        <div class="hi-section-title">Visual Legend</div>
        <div class="hi-legend-content" style="font-size: 11px; line-height: 1.6;">
          <div><span style="color:#00ff00">GREEN</span> half-plane: Above ecliptic</div>
          <div><span style="color:#ff0000">RED</span> half-plane: Below ecliptic</div>
          <div><span style="color:#ff00ff">Magenta</span> sphere ↑: Ascending node</div>
          <div><span style="color:#00ffff">Cyan</span> sphere ↓: Descending node</div>
          <div><span style="color:#00ff00">Green</span> sphere ↑: Highest point (max north)</div>
          <div><span style="color:#ff0000">Red</span> sphere ↓: Lowest point (max south)</div>
          <div><span style="color:#800080">Purple</span> line →: Current angle perihelion to Sun</div>
          <div><span style="color:#00ffff">Cyan</span> arrow →: Mean Anomaly angle to perihelion</div>
          <div><span style="color:#ffbf00">Amber</span> arrow →: True Anomaly angle to perihelion</div>
          <div>P point →: Fixed perihelion point</div>
          <div>P2 point →: Real perihelion point (ellipse)</div>
        </div>
      </div>
      <div class="hi-section">
        <div class="hi-section-title">Hierarchy Path</div>
        <div class="hi-tree"></div>
      </div>
      <div class="hi-helpers">
        <div class="hi-helpers-title">Visual Helpers</div>
        <label class="hi-helper-row"><input type="checkbox" data-helper="showAxes" checked> Show Axes (XYZ)</label>
        <label class="hi-helper-row"><input type="checkbox" data-helper="showStartPos" checked> Show StartPos Direction</label>
        <label class="hi-helper-row"><input type="checkbox" data-helper="showRotationDir" checked> Show Rotation Direction</label>
        <label class="hi-helper-row"><input type="checkbox" data-helper="showOrbitCenter"> Show Startpos Reference Information (Step 4)</label>
        <div class="hi-solar-period-section" style="display: none; margin-left: 20px; margin-bottom: 8px; padding: 8px; background: rgba(0,255,255,0.05); border-left: 2px solid #00ffff; font-size: 11px;">
          <div style="color: rgba(255,255,255,0.5); font-size: 10px; margin-bottom: 4px;">SOLAR PERIOD REFERENCE</div>
          <div style="color: rgba(255,255,255,0.4); font-size: 9px; margin-bottom: 6px;">(Planet's position on its orbit around the Sun)</div>
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 2px 8px;">
            <span style="color: #00ffff;">Reference angle on Solar period</span>
            <span data-id="refAngleHelper" style="color: #00ffff;"></span>
            <span style="color: rgba(255,255,255,0.6);">Orbit Period Solar</span>
            <span data-id="orbitPeriodSolarHelper" style="color: rgba(255,255,255,0.6);"></span>
            <span style="color: #00ffff;">Days before next alignment</span>
            <span data-id="daysUntilAlignmentHelper" style="color: #00ffff;"></span>
          </div>
          <div style="color: rgba(255,255,255,0.4); font-size: 9px; margin-top: 4px;">(planet alignment with the cyan arrow = start of planet orbit)</div>
        </div>
        <label class="hi-helper-row"><input type="checkbox" data-helper="showInclinationPlane" checked> Show Inclination Plane (Step 4)</label>
        <label class="hi-helper-row"><input type="checkbox" data-helper="showPerihelionPoint" checked> Show Perihelion Point & Arrow (Step 4)</label>
        <label class="hi-helper-row"><input type="checkbox" data-helper="showAnomalies" checked> Show Anomalies Visualization (Step 4)</label>
      </div>
    </div>
    <div class="hi-footer">
      <button class="hi-nav-btn hi-prev-btn">\u25c0 Prev</button>
      <button class="hi-nav-btn hi-highlight-btn">Highlight in Scene</button>
      <button class="hi-nav-btn hi-next-btn">Next \u25b6</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Event listeners
  panel.querySelector('.hi-close').addEventListener('click', closeHierarchyInspector);

  panel.querySelector('.hi-planet-select').addEventListener('change', (e) => {
    hierarchyInspector.currentPlanet = e.target.value;
    hierarchyInspector.currentStep = 0;
    updateInspectorDisplay();
  });

  panel.querySelector('.hi-prev-btn').addEventListener('click', () => {
    if (hierarchyInspector.currentStep > 0) {
      hierarchyInspector.currentStep--;
      updateInspectorDisplay();
    }
  });

  panel.querySelector('.hi-next-btn').addEventListener('click', () => {
    const steps = PLANET_HIERARCHIES[hierarchyInspector.currentPlanet].steps();
    if (hierarchyInspector.currentStep < steps.length - 1) {
      hierarchyInspector.currentStep++;
      updateInspectorDisplay();
    }
  });

  panel.querySelector('.hi-highlight-btn').addEventListener('click', (e) => {
    hierarchyInspector.highlightActive = !hierarchyInspector.highlightActive;
    e.target.classList.toggle('active', hierarchyInspector.highlightActive);
    e.target.textContent = hierarchyInspector.highlightActive ? 'Hide Helpers' : 'Highlight in Scene';
    if (hierarchyInspector.highlightActive) {
      const steps = PLANET_HIERARCHIES[hierarchyInspector.currentPlanet].steps();
      createVisualHelpers(steps[hierarchyInspector.currentStep]);
    } else {
      // Highlight turned off - force clean everything
      clearVisualHelpers({ forceCleanAnomalies: true });
    }
  });

  // Helper checkboxes
  panel.querySelectorAll('.hi-helper-row input').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const helperName = e.target.dataset.helper;
      hierarchyInspector.helpers[helperName] = e.target.checked;

      // Toggle solar period section visibility when showOrbitCenter is toggled
      if (helperName === 'showOrbitCenter') {
        const solarPeriodSection = panel.querySelector('.hi-solar-period-section');
        if (solarPeriodSection) {
          solarPeriodSection.style.display = e.target.checked ? 'block' : 'none';
        }
      }

      if (hierarchyInspector.highlightActive) {
        // Only force clean anomaly elements if the showAnomalies checkbox was toggled
        const forceCleanAnomalies = (helperName === 'showAnomalies');
        clearVisualHelpers({ forceCleanAnomalies });
        const steps = PLANET_HIERARCHIES[hierarchyInspector.currentPlanet].steps();
        // Skip clear since we just did it with the right forceCleanAnomalies setting
        createVisualHelpers(steps[hierarchyInspector.currentStep], { skipClear: true });
      }
    });
  });

  // Report buttons (Step 5)
  panel.querySelector('.hi-report-btn.download').addEventListener('click', async () => {
    if (_currentReportData && _currentReportData.excelData) {
      await exportPlanetReportToExcel(_currentReportData.planetKey, _currentReportData.excelData);
    }
  });

  panel.querySelector('.hi-report-btn.copy').addEventListener('click', () => {
    if (_currentReportData && _currentReportData.screenReport) {
      copyReportToClipboard(_currentReportData.screenReport);
    }
  });

  // Show all results checkbox (Step 5)
  panel.querySelector('.hi-report-show-all').addEventListener('change', async (e) => {
    const showAll = e.target.checked;
    hierarchyInspector.showAllResults = showAll;

    // Regenerate report with new setting
    if (_currentReportData && _currentReportData.planetKey) {
      const reportElement = panel.querySelector('.hi-report');
      const loadingElement = panel.querySelector('.hi-report-loading');

      loadingElement.style.display = 'block';
      reportElement.style.display = 'none';

      const result = await generatePlanetReport(_currentReportData.planetKey, showAll);

      _currentReportData.screenReport = result.screenReport;
      reportElement.innerHTML = result.screenReport;

      loadingElement.style.display = 'none';
      reportElement.style.display = 'block';
    }
  });

  // Keyboard navigation
  const keyHandler = (e) => {
    if (!panel.classList.contains('visible')) return;

    // Don't intercept keyboard events when user is typing in an input field
    // (e.g., editing date/time in dat.GUI)
    const activeEl = document.activeElement;
    const isTyping = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.isContentEditable
    );
    if (isTyping) return;

    if (e.key === 'ArrowLeft' || e.key === 'p') {
      panel.querySelector('.hi-prev-btn').click();
    } else if (e.key === 'ArrowRight' || e.key === 'n') {
      panel.querySelector('.hi-next-btn').click();
    } else if (e.key === 'Escape' || e.key === 'q') {
      closeHierarchyInspector();
    }
  };
  document.addEventListener('keydown', keyHandler);

  return panel;
}

// Open the hierarchy inspector
function openHierarchyInspector() {
  if (!hierarchyInspector.panel) {
    hierarchyInspector.panel = createInspectorPanel();
  }
  hierarchyInspector.panel.classList.add('visible');
  hierarchyInspector.panel.querySelector('.hi-planet-select').value = hierarchyInspector.currentPlanet;
  updateInspectorDisplay();
  // Hide the planet data panel while hierarchy inspector is open
  labelDismissed = true;
  const planetLabel = document.getElementById('planetLabel');
  if (planetLabel) {
    planetLabel.style.display = 'none';
  }
  // Hide orbit plane helper of current lookAtObj
  if (o.lookAtObj?.orbitPlaneHelper) {
    o.lookAtObj.orbitPlaneHelper.visible = false;
  }
  // Hide focus ring (shown when looking at Sun)
  if (focusRing) {
    focusRing.visible = false;
  }
}

// Close the hierarchy inspector
function closeHierarchyInspector() {
  if (hierarchyInspector.panel) {
    hierarchyInspector.panel.classList.remove('visible');
    // Set highlightActive to false BEFORE clearVisualHelpers so anomaly elements are cleaned up
    hierarchyInspector.highlightActive = false;
    // Disable hierarchy inspector camera control
    hierarchyInspector._cameraControlActive = false;
    hierarchyInspector._cameraTarget = null;
    // Force clean everything when closing inspector
    clearVisualHelpers({ forceCleanAnomalies: true });
    const highlightBtn = hierarchyInspector.panel.querySelector('.hi-highlight-btn');
    highlightBtn.classList.remove('active');
    highlightBtn.textContent = 'Highlight in Scene';
    // Reset view to Earth with default bird's eye view (same as initial load)
    o.lookAtObj = earth;
    camera.position.set(0, 500, 0);
    controls.target.set(0, 0, 0);
    focusPlanet(earth);
    // Show the planet data panel with Earth data
    labelDismissed = false;
    const planetLabel = document.getElementById('planetLabel');
    if (planetLabel) {
      planetLabel.style.display = 'block';
    }
    // Update the "Look at" dropdown to show Earth
    o.Target = 'Earth';
    // Hide all orbit plane helpers
    planetObjects.forEach(p => {
      if (p.orbitPlaneHelper) p.orbitPlaneHelper.visible = false;
    });
    // Update the GUI dropdown by finding the select element
    const guiContainer = document.getElementById('gui');
    if (guiContainer) {
      const selectElements = guiContainer.querySelectorAll('select');
      selectElements.forEach(select => {
        // Find the "Look at" dropdown by checking its options
        const hasEarthOption = Array.from(select.options).some(opt => opt.value === 'Earth');
        if (hasEarthOption) {
          select.value = 'Earth';
        }
      });
    }
  }
}

// Update live data in hierarchy inspector (called from render loop)
let _lastLiveDataJD = null;
let _lastLiveDataPlanet = null; // Track planet changes to force refresh
let _lastLiveDataStep = null; // Track step changes to force refresh when returning to Step 4
const _liveDataVec3 = new THREE.Vector3(); // Reusable vector for performance
const _liveDataVec3b = new THREE.Vector3(); // Second reusable vector for sun position
const _liveDataInvTiltMatrix = new THREE.Matrix4(); // Reusable inverse tilt matrix
const _liveDataTiltMatrix = new THREE.Matrix4(); // Reusable tilt matrix
const _liveDataFlatPos = new THREE.Vector3(); // Reusable vector for flat orbital position
const _liveDataP1 = new THREE.Vector3(); // Reusable vectors for node sampling
const _liveDataP2 = new THREE.Vector3();
const _liveDataP1World = new THREE.Vector3(); // Reusable vectors for world positions
const _liveDataP2World = new THREE.Vector3();
const _liveDataLocalPt = new THREE.Vector3(); // Reusable for orbit point sampling
const _liveDataWorldPt = new THREE.Vector3();
const _liveDataLocalToWorld = new THREE.Matrix4(); // Reusable transform matrix for node updates
const _liveDataNewAscPos = new THREE.Vector3(); // Reusable for ascending node position
const _liveDataNewDescPos = new THREE.Vector3(); // Reusable for descending node position
const _liveDataNewHighPos = new THREE.Vector3(); // Reusable for highest point position
const _liveDataNewLowPos = new THREE.Vector3(); // Reusable for lowest point position
const _liveDataEuler = new THREE.Euler(); // Reusable Euler for rotation calculations
const _liveDataDebugLocal = new THREE.Vector3(); // Reusable for debug local position
const _liveDataDebugWorld = new THREE.Vector3(); // Reusable for debug world position
const _liveDataDebugMarker = new THREE.Vector3(); // Reusable for debug marker world position
// Pre-allocated arrays for half-disc geometry (64 points + 1 wrap + 1 center = 66 vertices * 3 = 198 floats)
const _halfDiscVertices = new Float32Array(198);
const _halfDiscIndices = []; // Indices array reused between calls
// Reusable vectors for hierarchy inspector validation and display
const _hiObjWorldPos = new THREE.Vector3();
const _hiSunWorldPos = new THREE.Vector3();
const _hiEarthPeriPos = new THREE.Vector3();
const _hiPlanetPeriPos = new THREE.Vector3();
const _hiDirection = new THREE.Vector3();
const _hiWorldPos = new THREE.Vector3();
// Reusable vectors for Step 3 visual helpers
const _hiSunPos = new THREE.Vector3();
const _hiPerihelionPos = new THREE.Vector3();
const _hiEarthPos = new THREE.Vector3();
const _hiPPos = new THREE.Vector3(); // P = orbit center position
const _hiPlanetPos = new THREE.Vector3(); // Current planet position
// Reusable vectors for updatePlanetAnomalies
const _anomalySunPos = new THREE.Vector3();
const _anomalyPPos = new THREE.Vector3();
const _anomalyPlanetPos = new THREE.Vector3();
const _hiPurpleWorldPos = new THREE.Vector3();
const _hiGreenWorldPos = new THREE.Vector3();
const _hiTempPos = new THREE.Vector3();
// Reusable vectors for camera positioning
const _hiTargetPos = new THREE.Vector3();
const _hiCamSunPos = new THREE.Vector3();
const _hiCamDirection = new THREE.Vector3();
let _cachedAscNodeOrbitalAngle = null; // Cached ascending node orbital angle
let _cachedTiltA = null, _cachedTiltB = null; // Cached tilt values to detect changes
let _liveDataElements = null; // Cached DOM element references for live data updates
let _lastAscNodeTiltA = null, _lastAscNodeTiltB = null; // Cache to skip unchanged ascending node updates
let _lastArcTrueAnomaly = null, _lastArcMeanAnomaly = null; // Cache for arc update throttling
function updateHierarchyLiveData() {
  try {
    if (!hierarchyInspector.panel || !hierarchyInspector.panel.classList.contains('visible')) return;

    // If not on Step 4, reset tracking so we refresh when returning to Step 4
    if (hierarchyInspector.currentStep !== 3) {
      _lastLiveDataStep = null;
      return;
    }

  // Only update when simulation is running OR Julian Day has changed OR planet/step changed
  // This allows copy/paste when paused
  const currentJD = o.julianDay;
  const currentPlanet = hierarchyInspector.currentPlanet;
  const currentStep = hierarchyInspector.currentStep;
  const planetChanged = _lastLiveDataPlanet !== currentPlanet;
  const stepChanged = _lastLiveDataStep !== currentStep;

  if (!o.Run && _lastLiveDataJD !== null && Math.abs(currentJD - _lastLiveDataJD) < 0.0001 && !planetChanged && !stepChanged) {
    return; // Simulation paused, no JD change, same planet, and same step - skip update
  }
  _lastLiveDataJD = currentJD;
  _lastLiveDataPlanet = currentPlanet;
  _lastLiveDataStep = currentStep;

  const liveContent = hierarchyInspector.panel.querySelector('.hi-live-content');
  if (!liveContent) return;

  const steps = PLANET_HIERARCHIES[hierarchyInspector.currentPlanet].steps();
  const stepData = steps[hierarchyInspector.currentStep];
  const obj = stepData.obj;

  if (!obj) return;

  // Get the actual planet object (Step 5) to check its real world position
  const planetStep = steps[4]; // Step 5 is the actual planet
  const planetObj = planetStep?.obj;

  // Get tilt values for ascending node calculation
  const tiltaDeg = obj.orbitTilta || 0;
  const tiltbDeg = obj.orbitTiltb || 0;

  // The tilt encoding is:
  //   orbitTilta = cos((-90 - Ω) * π/180) * (-inclination)
  //   orbitTiltb = sin((-90 - Ω) * π/180) * (-inclination)
  // The negative inclination flips signs, equivalent to:
  //   atan2(tiltb, tilta) = 90 - Ω
  // Therefore: Ω = 90 - atan2(tiltb, tilta)
  // But we now use the DYNAMIC ascending node from o.<planet>AscendingNode
  // which accounts for changes in Earth's obliquity over time
  // Map planet keys to their o.xxxAscendingNode property names
  const ascendingNodePropertyMap = {
    mercury: 'mercuryAscendingNode',
    venus: 'venusAscendingNode',
    mars: 'marsAscendingNode',
    jupiter: 'jupiterAscendingNode',
    saturn: 'saturnAscendingNode',
    uranus: 'uranusAscendingNode',
    neptune: 'neptuneAscendingNode',
    pluto: 'plutoAscendingNode',
    halleys: 'halleysAscendingNode',
    eros: 'erosAscendingNode'
  };

  // Use dynamic value if available, otherwise fall back to static calculation
  let ascNodeAngleDeg;
  const ascNodeProperty = ascendingNodePropertyMap[hierarchyInspector.currentPlanet];
  if (ascNodeProperty && o[ascNodeProperty] !== undefined && o[ascNodeProperty] !== 0) {
    ascNodeAngleDeg = o[ascNodeProperty];
  } else {
    // Fallback to static calculation
    const theta = Math.atan2(tiltbDeg, tiltaDeg) * 180 / Math.PI;
    ascNodeAngleDeg = 90 - theta;
    ascNodeAngleDeg = ((ascNodeAngleDeg % 360) + 360) % 360;
  }

  // Get world positions (reuse vector for performance)
  let planetWorldY = 0;
  let planetWorldX = 0, planetWorldZ = 0;

  if (planetObj?.pivotObj) {
    planetObj.pivotObj.getWorldPosition(_liveDataVec3);
    planetWorldX = _liveDataVec3.x;
    planetWorldY = _liveDataVec3.y;
    planetWorldZ = _liveDataVec3.z;
  }

  // Calculate orbital plane height metrics
  const inclinationRad = Math.sqrt(tiltaDeg*tiltaDeg + tiltbDeg*tiltbDeg) * Math.PI / 180;
  const orbitRadius = Math.sqrt(planetWorldX*planetWorldX + planetWorldZ*planetWorldZ);
  const maxY = orbitRadius * Math.sin(inclinationRad);

  // Calculate angle from planet to ascending node
  // The planet's ecliptic longitude from its world position:
  let planetEclipticLong = Math.atan2(-planetWorldZ, planetWorldX) * 180 / Math.PI;
  planetEclipticLong = ((planetEclipticLong % 360) + 360) % 360;

  // Angular distance from the ascending node (measured along the ecliptic)
  let eclipticAngleFromAscNode = planetEclipticLong - ascNodeAngleDeg;
  eclipticAngleFromAscNode = ((eclipticAngleFromAscNode + 180) % 360 + 360) % 360 - 180;

  // The "angle from ascending node" in orbital terms is the argument of latitude (u)
  // u = 0° at ascending node, 90° at highest point, 180° at descending node, 270° at lowest
  //
  // We can calculate this from the planet's Y height relative to maxY:
  // Y/maxY = sin(u) for the ascending half (0° to 180°)
  //
  // To determine which half of the orbit we're in (ascending vs descending),
  // we check if the ecliptic angle is in [0°, 180°] or [-180°, 0°]
  let anglePlanetFromAscNode = 0;
  if (maxY > 0.001) {
    const yRatio = Math.max(-1, Math.min(1, planetWorldY / maxY));
    const yAngle = Math.asin(yRatio) * 180 / Math.PI; // -90 to +90

    // Determine which half of orbit based on ecliptic position
    if (eclipticAngleFromAscNode >= 0 && eclipticAngleFromAscNode <= 180) {
      // Ascending half: angle is directly the yAngle (0 to 90 to 0)
      // But we need to distinguish 0-90 from 90-180
      if (eclipticAngleFromAscNode <= 90) {
        anglePlanetFromAscNode = yAngle; // 0 to 90
      } else {
        anglePlanetFromAscNode = 180 - yAngle; // 90 to 180 (but yAngle goes 90 to 0)
      }
    } else {
      // Descending half: angle is -yAngle (0 to -90 to 0)
      if (eclipticAngleFromAscNode >= -90) {
        anglePlanetFromAscNode = yAngle; // 0 to -90 (yAngle is already negative here)
      } else {
        anglePlanetFromAscNode = -180 - yAngle; // -90 to -180
      }
    }
  }

  // Calculate angle from ascending node (ecliptic longitude based)
  // sun.ra gives the Sun's ecliptic longitude directly (in radians)
  // At June 21 (model start), sun.ra ≈ 90° (summer solstice)
  const sunEclipticLongitude = (sun.ra * 180 / Math.PI + 360) % 360;
  // Angle from ascending node = current ecliptic longitude - ascending node longitude
  let angleFromAscNode = sunEclipticLongitude - ascNodeAngleDeg;
  // Normalize to 0-360 first, then convert to ±180 range
  angleFromAscNode = ((angleFromAscNode % 360) + 360) % 360;
  if (angleFromAscNode > 180) {
    angleFromAscNode = angleFromAscNode - 360; // Convert 181-359 to -179 to -1
  }

  // Calculate angle from longitude of perihelion
  // Get the longitude of perihelion for this planet
  const perihelionLongValues = {
    mercury: o.mercuryPerihelion,
    venus: o.venusPerihelion,
    mars: o.marsPerihelion,
    jupiter: o.jupiterPerihelion,
    saturn: o.saturnPerihelion,
    uranus: o.uranusPerihelion,
    neptune: o.neptunePerihelion,
    pluto: o.plutoPerihelion,
    halleys: o.halleysPerihelion,
    eros: o.erosPerihelion
  };
  const perihelionLong = perihelionLongValues[hierarchyInspector.currentPlanet] ?? 0;
  // Angle from perihelion = current ecliptic longitude - longitude of perihelion
  let angleFromPerihelion = sunEclipticLongitude - perihelionLong;
  // Normalize to 0-360 first, then convert to ±180 range
  angleFromPerihelion = ((angleFromPerihelion % 360) + 360) % 360;
  if (angleFromPerihelion > 180) {
    angleFromPerihelion = angleFromPerihelion - 360; // Convert 181-359 to -179 to -1
  }

  // Get planet label for display
  const planetLabel = PLANET_HIERARCHIES[hierarchyInspector.currentPlanet]?.label || 'Planet';

  // Get celestial coordinates directly from planet/sun objects
  // These are the same values used in info panels
  const planetRA = planetObj?.raDisplay || 'N/A';
  const planetDec = planetObj?.decDisplay || 'N/A';
  const sunDecDisplay = sun.decDisplay || 'N/A';

  // Get raw Dec values in degrees for comparison
  const planetDecValue = planetObj?.dec ? 90 - (planetObj.dec * 180 / Math.PI) : 0;
  const sunDecValue = 90 - (sun.dec * 180 / Math.PI);

  // Determine ecliptic position based on World Y (model's ecliptic plane)
  let orbitalPlanePos, orbitalPlanePosColor;
  const actuallyAbove = planetWorldY > 0.001;
  const actuallyBelow = planetWorldY < -0.001;

  if (!actuallyAbove && !actuallyBelow) {
    orbitalPlanePos = 'ON ecliptic plane';
    orbitalPlanePosColor = '#64b5f6';
  } else if (actuallyAbove) {
    orbitalPlanePos = 'NORTH of ecliptic';
    orbitalPlanePosColor = '#4caf50';
  } else {
    orbitalPlanePos = 'SOUTH of ecliptic';
    orbitalPlanePosColor = '#ffc107';
  }

  // Calculate Dec difference (planet relative to Sun)
  const decDiff = planetDecValue - sunDecValue;
  let decComparison, decComparisonColor;
  if (Math.abs(decDiff) < 0.01) {
    decComparison = 'SAME as Sun';
    decComparisonColor = '#64b5f6';
  } else if (decDiff > 0) {
    decComparison = `${decDiff.toFixed(2)}° NORTH of Sun`;
    decComparisonColor = '#4caf50';
  } else {
    decComparison = `${Math.abs(decDiff).toFixed(2)}° SOUTH of Sun`;
    decComparisonColor = '#ffc107';
  }

  // Calculate reference angle on Solar period (live update)
  // Option A: Starts at startPos value (e.g., 115.71° for Venus at model start)
  // Increases as planet moves, wraps at 360° → 0°
  // Shows 0° when planet aligns with the cyan arrow
  let refAngleDeg = 0;
  if (obj.speed !== undefined && obj.startPos !== undefined) {
    // Get the child planet's speed (actual orbital speed) for the Solar period
    const planetKey = hierarchyInspector.currentPlanet;
    const hierarchy = PLANET_HIERARCHIES[planetKey];
    let childPlanetSpeed = obj.speed;
    let childStartPos = 0;
    if (hierarchy) {
      const steps = hierarchy.steps();
      if (steps.length > 4 && steps[4].obj) {
        if (steps[4].obj.speed !== undefined) childPlanetSpeed = steps[4].obj.speed;
        if (steps[4].obj.startPos !== undefined) childStartPos = steps[4].obj.startPos;
      }
    }

    // Calculate initial angle based on child planet's startPos
    // The RealPerihelionAtSun.startPos = 2 * childStartPos (e.g., mercuryStartpos * 2 = 588)
    //
    // Rules for initial angle (counting DOWN from this value to 0):
    // - If 2 * childStartPos >= 360: initialAngle = childStartPos (e.g., Mercury: 294°)
    // - If 2 * childStartPos < 360: initialAngle = 2 * childStartPos (e.g., Mars: 243.31°)
    //
    // This represents "degrees remaining until alignment with cyan arrow"
    const doubleStartPos = childStartPos * 2;
    let initialAngle;
    if (doubleStartPos >= 360) {
      initialAngle = childStartPos; // Mercury: 294°
    } else {
      initialAngle = doubleStartPos; // Mars: 243.31°
    }

    // Calculate how many degrees the planet has traveled in its Solar period
    // childPlanetSpeed is in rad/year, o.pos is in years (where 1 = meansolaryearlengthinDays)
    // Note: outer planets (Mars, Jupiter, etc.) have NEGATIVE speed, so use absolute value
    const traveledDeg = Math.abs(childPlanetSpeed) * o.pos * 180 / Math.PI;

    // Reference angle COUNTS DOWN: starts at initialAngle, decreases to 0
    // refAngleDeg = initialAngle - traveledDeg (mod 360)
    refAngleDeg = (initialAngle - traveledDeg) % 360;
    if (refAngleDeg < 0) refAngleDeg += 360;

    // Calculate days until next alignment (when refAngleDeg reaches 0)
    // Solar orbit length in days = (holisticyearLength / planetSolarYearCount) * meansolaryearlengthinDays
    const solarYearCounts = {
      mercury: mercurySolarYearCount,
      venus: venusSolarYearCount,
      mars: marsSolarYearCount,
      jupiter: jupiterSolarYearCount,
      saturn: saturnSolarYearCount,
      uranus: uranusSolarYearCount,
      neptune: neptuneSolarYearCount,
      pluto: plutoSolarYearCount,
      halleys: halleysSolarYearCount,
      eros: erosSolarYearCount
    };
    const planetSolarYearCount = solarYearCounts[planetKey];
    const planetSolarOrbitDays = planetSolarYearCount ? (holisticyearLength / planetSolarYearCount) * meansolaryearlengthinDays : 0;
    window._orbitPeriodSolar = planetSolarOrbitDays;
    window._daysUntilAlignment = planetSolarOrbitDays > 0 ? (refAngleDeg / 360) * planetSolarOrbitDays : 0;

  }

  // Calculate True Anomaly and Mean Anomaly dynamically from the model
  // The child planet orbits inside RealPerihelionAtSun container.
  // Its orbital angle θ = speed * pos - startPos * (π/180) [from moveModel]
  // This θ represents the True Anomaly (angle from perihelion direction)

  // Get the child planet object (Step 5 in hierarchy)
  const anomalyPlanetKey = hierarchyInspector.currentPlanet;
  const anomalyHierarchy = PLANET_HIERARCHIES[anomalyPlanetKey];
  let childPlanet = null;
  if (anomalyHierarchy) {
    const steps = anomalyHierarchy.steps();
    if (steps.length > 4 && steps[4].obj) {
      childPlanet = steps[4].obj;
    }
  }

  // Note: The Mean/True Anomaly values are now calculated dynamically
  // in the anomaly visualization update section below, based on the
  // actual Earth-Sun line angle. This ensures the arc always ends
  // exactly at the Earth-Sun line.

  // Check if we need to rebuild DOM structure (planet changed or first time)
  const needsRebuild = !_liveDataElements || _liveDataElements.planet !== hierarchyInspector.currentPlanet;

  if (needsRebuild) {
    // Build the DOM structure once with data-id attributes for efficient updates
    liveContent.innerHTML = `
      <div style="display: grid; grid-template-columns: 200px 1fr; gap: 6px 12px; font-size: 12px;">
        <span style="color: rgba(255,255,255,0.5); font-size: 10px; grid-column: 1 / -1; margin-top: 4px;">CELESTIAL COORDINATES</span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(Position relative to Earth's equator)</span>
        <span style="color: rgba(255,255,255,0.6);">${planetLabel} RA</span>
        <span data-id="planetRA" style="color: #4caf50;"></span>
        <span style="color: rgba(255,255,255,0.6);">${planetLabel} Dec</span>
        <span data-id="planetDec" style="color: #4caf50;"></span>
        <span style="color: rgba(255,255,255,0.6);">Sun Dec</span>
        <span data-id="sunDec" style="color: #4caf50;"></span>
        <span style="color: rgba(255,255,255,0.6);">${planetLabel} vs Sun Dec</span>
        <span data-id="decComparison"></span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(At transit: ${planetLabel} Dec ≈ Sun Dec)</span>

        <span style="color: rgba(255,255,255,0.5); font-size: 10px; grid-column: 1 / -1; margin-top: 8px;">ECLIPTIC POSITION OF PLANET</span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(Height above/below ecliptic plane in 3D model)</span>
        <span style="color: rgba(255,255,255,0.6);">Ecliptic position</span>
        <span data-id="eclipticPos"></span>
        <span style="color: rgba(255,255,255,0.6);">Height above ecliptic</span>
        <span data-id="heightEcliptic"></span>
        <span style="color: rgba(255,255,255,0.6);">Height ratio (% of max)</span>
        <span data-id="heightRatio" style="color: #4caf50;"></span>
        <span style="color: rgba(255,255,255,0.6);">Angle planet from asc. node</span>
        <span data-id="anglePlanetAsc" style="color: #4caf50;"></span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(±90° based on Y height)</span>

        <span style="color: rgba(255,255,255,0.5); font-size: 10px; grid-column: 1 / -1; margin-top: 8px;">CONTROL PERIHELION PLACEMENT IN 3D MODEL</span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(Verify P position matches Long.Peri - startAngle)</span>
        <span style="color: rgba(255,255,255,0.6);">Start Angle of Model</span>
        <span data-id="startAngleModel" style="color: rgba(255,255,255,0.6);"></span>
        <span style="color: rgba(255,255,255,0.6);">Expected P angle (Long.Peri - ${startAngleModel.toFixed(1)}°)</span>
        <span data-id="perihelionExpected" style="color: rgba(255,255,255,0.6);"></span>
        <span style="color: rgba(255,255,255,0.6);">Expected P distance (Sun → P)</span>
        <span data-id="perihelionDistanceExpected" style="color: rgba(255,255,255,0.6);"></span>
        <span style="color: #00ff00;">Actual P angle (Sun → P)</span>
        <span data-id="perihelionAngle3D" style="color: #00ff00;"></span>
        <span style="color: #00ff00;">Actual P distance (Sun → P)</span>
        <span data-id="perihelionDistance3D" style="color: #00ff00;"></span>

        <span style="color: rgba(255,255,255,0.5); font-size: 10px; grid-column: 1 / -1; margin-top: 8px;">CURRENT ASCENDING NODE DISTANCE</span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(Current angle of Earth-Sun view to ascending node & longitude of perihelion)</span>
        <span style="color: #ffff00;">Current Angle from asc. node</span>
        <span data-id="angleFromAsc" style="color: #ffff00;"></span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(±180° Sun ecliptic longitude - ascending node)</span>
        <span style="color: #ffff00;">Current Angle from long. perihelion</span>
        <span data-id="angleFromPeri" style="color: #ffff00;"></span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(±180° Sun ecliptic longitude - longitude of perihelion)</span>

        <span style="color: rgba(255,255,255,0.5); font-size: 10px; grid-column: 1 / -1; margin-top: 8px;">ORBITAL ELEMENTS</span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(The orientation of the plane of the orbit)</span>
        <span style="color: #ff00ff;">Longitude of Ascending Node (Ω)</span>
        <span data-id="ascendingNodeLong" style="color: #ff00ff;"></span>
        <span style="color: #ffffff;">Argument of Periapsis (ω)</span>
        <span data-id="argumentOfPeriapsis" style="color: #ffffff;"></span>
        <span style="color: #00ff00;">Longitude of Perihelion (ϖ)</span>
        <span data-id="longitudeOfPerihelion" style="color: #00ff00;"></span>

        <span style="color: rgba(255,255,255,0.5); font-size: 10px; grid-column: 1 / -1; margin-top: 8px;">ORBITAL ANOMALIES</span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(Angle from perihelion in planet's orbit)</span>
        <span style="color: #00ffff;">Mean Anomaly (M)</span>
        <span data-id="meanAnomaly" style="color: #00ffff;"></span>
        <span style="color: #ffbf00;">True Anomaly (ν)</span>
        <span data-id="trueAnomaly" style="color: #ffbf00;"></span>
        <span style="color: #ff69b4;">Equation of Center (ν − M)</span>
        <span data-id="equationOfCenter" style="color: #ff69b4;"></span>
        <span style="color: rgba(255,255,255,0.4); font-size: 9px; grid-column: 1 / -1;">(M = uniform motion, ν = actual position from perihelion)</span>
        <span style="color: rgba(255,255,255,0.5); font-size: 10px; grid-column: 1 / -1; margin-top: 8px;">REFERENCE ANOMALIES (21 Jun 2000)</span>
        <span style="color: rgba(255,255,255,0.6);">Mean Anomaly (ref)</span>
        <span data-id="refMeanAnomaly" style="color: rgba(255,255,255,0.6);"></span>
        <span style="color: rgba(255,255,255,0.6);">True Anomaly (ref)</span>
        <span data-id="refTrueAnomaly" style="color: rgba(255,255,255,0.6);"></span>
        <span style="color: rgba(255,255,255,0.6);">Equation of Center (ref)</span>
        <span data-id="refEquationOfCenter" style="color: rgba(255,255,255,0.6);"></span>
      </div>
    `;

    // Cache element references for fast updates
    _liveDataElements = {
      planet: hierarchyInspector.currentPlanet,
      planetRA: liveContent.querySelector('[data-id="planetRA"]'),
      planetDec: liveContent.querySelector('[data-id="planetDec"]'),
      sunDec: liveContent.querySelector('[data-id="sunDec"]'),
      decComparison: liveContent.querySelector('[data-id="decComparison"]'),
      eclipticPos: liveContent.querySelector('[data-id="eclipticPos"]'),
      heightEcliptic: liveContent.querySelector('[data-id="heightEcliptic"]'),
      heightRatio: liveContent.querySelector('[data-id="heightRatio"]'),
      anglePlanetAsc: liveContent.querySelector('[data-id="anglePlanetAsc"]'),
      angleFromAsc: liveContent.querySelector('[data-id="angleFromAsc"]'),
      angleFromPeri: liveContent.querySelector('[data-id="angleFromPeri"]'),
      ascendingNodeLong: liveContent.querySelector('[data-id="ascendingNodeLong"]'),
      argumentOfPeriapsis: liveContent.querySelector('[data-id="argumentOfPeriapsis"]'),
      // Solar period reference elements are now in the helper section, not live content
      refAngle: hierarchyInspector.panel.querySelector('[data-id="refAngleHelper"]'),
      orbitPeriodSolar: hierarchyInspector.panel.querySelector('[data-id="orbitPeriodSolarHelper"]'),
      daysUntilAlignment: hierarchyInspector.panel.querySelector('[data-id="daysUntilAlignmentHelper"]'),
      meanAnomaly: liveContent.querySelector('[data-id="meanAnomaly"]'),
      trueAnomaly: liveContent.querySelector('[data-id="trueAnomaly"]'),
      equationOfCenter: liveContent.querySelector('[data-id="equationOfCenter"]'),
      refMeanAnomaly: liveContent.querySelector('[data-id="refMeanAnomaly"]'),
      refTrueAnomaly: liveContent.querySelector('[data-id="refTrueAnomaly"]'),
      refEquationOfCenter: liveContent.querySelector('[data-id="refEquationOfCenter"]'),
      longitudeOfPerihelion: liveContent.querySelector('[data-id="longitudeOfPerihelion"]'),
      startAngleModel: liveContent.querySelector('[data-id="startAngleModel"]'),
      perihelionExpected: liveContent.querySelector('[data-id="perihelionExpected"]'),
      perihelionDistanceExpected: liveContent.querySelector('[data-id="perihelionDistanceExpected"]'),
      perihelionAngle3D: liveContent.querySelector('[data-id="perihelionAngle3D"]'),
      perihelionDistance3D: liveContent.querySelector('[data-id="perihelionDistance3D"]')
    };

    // Get reference anomaly values for current planet (21 Jun 2000 00:00 UTC)
    const refAnomalies = {
      mercury: { mean: mercuryMeanAnomaly, true: mercuryTrueAnomaly },
      venus: { mean: venusMeanAnomaly, true: venusTrueAnomaly },
      mars: { mean: marsMeanAnomaly, true: marsTrueAnomaly },
      jupiter: { mean: jupiterMeanAnomaly, true: jupiterTrueAnomaly },
      saturn: { mean: saturnMeanAnomaly, true: saturnTrueAnomaly },
      uranus: { mean: uranusMeanAnomaly, true: uranusTrueAnomaly },
      neptune: { mean: neptuneMeanAnomaly, true: neptuneTrueAnomaly },
      pluto: { mean: plutoMeanAnomaly, true: plutoTrueAnomaly },
      halleys: { mean: halleysMeanAnomaly, true: halleysTrueAnomaly },
      eros: { mean: erosMeanAnomaly, true: erosTrueAnomaly }
    };
    const refAnomaly = refAnomalies[hierarchyInspector.currentPlanet];
    if (refAnomaly) {
      _liveDataElements.refMeanAnomaly.textContent = refAnomaly.mean.toFixed(2) + '°';
      _liveDataElements.refTrueAnomaly.textContent = refAnomaly.true.toFixed(2) + '°';
      const refEoc = refAnomaly.true - refAnomaly.mean;
      _liveDataElements.refEquationOfCenter.textContent = (refEoc >= 0 ? '+' : '') + refEoc.toFixed(2) + '°';
    }

    // Set expected perihelion distance (one-time, static value)
    // These values are in scene units (AU * 100), so divide by 100 to get AU
    const perihelionDistances = {
      mercury: mercuryPerihelionDistance,
      venus: venusPerihelionDistance,
      mars: marsPerihelionDistance,
      jupiter: jupiterPerihelionDistance,
      saturn: saturnPerihelionDistance,
      uranus: uranusPerihelionDistance,
      neptune: neptunePerihelionDistance,
      pluto: plutoPerihelionDistance,
      halleys: halleysPerihelionDistance,
      eros: erosPerihelionDistance
    };
    const expectedPeriDist = perihelionDistances[hierarchyInspector.currentPlanet];
    if (expectedPeriDist !== undefined) {
      _liveDataElements.perihelionDistanceExpected.textContent = (expectedPeriDist / 100).toFixed(6) + ' AU';
    }
  }

  // Update only the text content (much faster than innerHTML)
  const el = _liveDataElements;
  el.planetRA.textContent = planetRA;
  el.planetDec.textContent = planetDec;
  el.sunDec.textContent = sunDecDisplay;
  el.decComparison.textContent = decComparison;
  el.decComparison.style.color = decComparisonColor;
  el.eclipticPos.textContent = orbitalPlanePos;
  el.eclipticPos.style.color = orbitalPlanePosColor;
  el.heightEcliptic.textContent = planetWorldY.toFixed(4);
  el.heightEcliptic.style.color = planetWorldY > 0 ? '#4caf50' : '#ffc107';
  el.heightRatio.textContent = maxY > 0.001 ? (planetWorldY / maxY * 100).toFixed(1) + '%' : 'N/A';
  el.heightRatio.style.color = planetWorldY > 0 ? '#4caf50' : '#ffc107';
  el.anglePlanetAsc.textContent = anglePlanetFromAscNode.toFixed(2) + '°';
  el.anglePlanetAsc.style.color = planetWorldY > 0 ? '#4caf50' : '#ffc107';
  el.angleFromAsc.textContent = angleFromAscNode.toFixed(2) + '°';
  el.angleFromPeri.textContent = angleFromPerihelion.toFixed(2) + '°';
  el.ascendingNodeLong.textContent = ascNodeAngleDeg.toFixed(4) + '°';

  // Get argument of periapsis for current planet
  const argumentOfPeriapsisValues = {
    mercury: o.mercuryArgumentOfPeriapsis,
    venus: o.venusArgumentOfPeriapsis,
    mars: o.marsArgumentOfPeriapsis,
    jupiter: o.jupiterArgumentOfPeriapsis,
    saturn: o.saturnArgumentOfPeriapsis,
    uranus: o.uranusArgumentOfPeriapsis,
    neptune: o.neptuneArgumentOfPeriapsis,
    pluto: o.plutoArgumentOfPeriapsis,
    halleys: o.halleysArgumentOfPeriapsis,
    eros: o.erosArgumentOfPeriapsis
  };
  const argPeri = argumentOfPeriapsisValues[hierarchyInspector.currentPlanet] ?? 0;
  el.argumentOfPeriapsis.textContent = argPeri.toFixed(4) + '°';

  // Get longitude of perihelion for current planet
  const longitudeOfPerihelionValues = {
    mercury: o.mercuryPerihelion,
    venus: o.venusPerihelion,
    mars: o.marsPerihelion,
    jupiter: o.jupiterPerihelion,
    saturn: o.saturnPerihelion,
    uranus: o.uranusPerihelion,
    neptune: o.neptunePerihelion,
    pluto: o.plutoPerihelion,
    halleys: o.halleysPerihelion,
    eros: o.erosPerihelion
  };
  const longPeri = longitudeOfPerihelionValues[hierarchyInspector.currentPlanet] ?? 0;
  el.longitudeOfPerihelion.textContent = longPeri.toFixed(4) + '°';

  // Show the fixed start angle of the model (Earth→Sun at June 21, 2000 00:00 UTC)
  el.startAngleModel.textContent = startAngleModel.toFixed(8) + '°';

  // Calculate expected perihelion angle: longitude of perihelion - start angle
  let periExpected = ((longPeri - startAngleModel) % 360 + 360) % 360;
  el.perihelionExpected.textContent = periExpected.toFixed(4) + '°';

  // Calculate the actual Sun → P angle from the 3D model
  // Define fixedPerihelionObjects once for reuse below
  const fixedPerihelionObjects = {
    mercury: mercuryFixedPerihelionAtSun,
    venus: venusFixedPerihelionAtSun,
    mars: marsFixedPerihelionAtSun,
    jupiter: jupiterFixedPerihelionAtSun,
    saturn: saturnFixedPerihelionAtSun,
    uranus: uranusFixedPerihelionAtSun,
    neptune: neptuneFixedPerihelionAtSun,
    pluto: plutoFixedPerihelionAtSun,
    halleys: halleysFixedPerihelionAtSun,
    eros: erosFixedPerihelionAtSun
  };
  const fixedPerihelion = fixedPerihelionObjects[hierarchyInspector.currentPlanet];

  // Get sun and perihelion world positions once for reuse throughout this function
  let sunWorldPosX = 0, sunWorldPosZ = 0;
  let periWorldPosX = 0, periWorldPosZ = 0;
  let hasSunPos = false, hasPeriPos = false;

  if (sun && sun.pivotObj) {
    sun.pivotObj.getWorldPosition(_liveDataVec3);
    sunWorldPosX = _liveDataVec3.x;
    sunWorldPosZ = _liveDataVec3.z;
    hasSunPos = true;
  }

  if (fixedPerihelion) {
    const sourceObj = fixedPerihelion.planetObj || fixedPerihelion.pivotObj;
    if (sourceObj) {
      sourceObj.getWorldPosition(_liveDataVec3b);
      periWorldPosX = _liveDataVec3b.x;
      periWorldPosZ = _liveDataVec3b.z;
      hasPeriPos = true;
    }
  }

  if (hasSunPos && hasPeriPos) {
    // Calculate Sun → P angle
    const dxSP = periWorldPosX - sunWorldPosX;
    const dzSP = periWorldPosZ - sunWorldPosZ;
    const sunPAngleRad = Math.atan2(-dzSP, dxSP);
    const sunPAngleDeg = ((sunPAngleRad * 180 / Math.PI) % 360 + 360) % 360;

    // Combined angle = fixed startAngleModel + Sun→P
    const combinedAngle = ((startAngleModel + sunPAngleDeg) % 360 + 360) % 360;

    el.perihelionAngle3D.textContent = combinedAngle.toFixed(4) + '°';

    // Calculate Sun → P distance in AU (scene units / 100 = AU)
    const distanceSceneUnits = Math.sqrt(dxSP * dxSP + dzSP * dzSP);
    const distanceAU = distanceSceneUnits / 100;
    el.perihelionDistance3D.textContent = distanceAU.toFixed(6) + ' AU';
  } else {
    el.perihelionAngle3D.textContent = 'N/A';
    el.perihelionDistance3D.textContent = 'N/A';
  }

  el.refAngle.textContent = refAngleDeg.toFixed(2) + '°';
  el.orbitPeriodSolar.textContent = (window._orbitPeriodSolar?.toFixed(2) ?? '0.00') + ' days';
  el.daysUntilAlignment.textContent = (window._daysUntilAlignment?.toFixed(2) ?? '0.00') + ' days';
  el.meanAnomaly.textContent = (window._meanAnomaly?.toFixed(2) ?? '0.00') + '°';
  el.trueAnomaly.textContent = (window._trueAnomaly?.toFixed(2) ?? '0.00') + '°';
  const eocValue = (window._trueAnomaly ?? 0) - (window._meanAnomaly ?? 0);
  el.equationOfCenter.textContent = (eocValue >= 0 ? '+' : '') + eocValue.toFixed(2) + '°';

  // Update anomaly visualization if it exists
  // The anomaly visualization shows True Anomaly and Mean Anomaly as angles from perihelion
  // It should be centered at the SUN (the focus of the ellipse)
  // Reuse sun and perihelion positions fetched above
  if (hierarchyInspector.anomalyGroup && hasSunPos) {
    // Position the anomaly group at the SUN (center of the solar system)
    // Use _liveDataVec3 which still contains sun position from above
    hierarchyInspector.anomalyGroup.position.set(sunWorldPosX, _liveDataVec3.y, sunWorldPosZ);

    // Calculate the rotation to align the anomaly 0° direction with the perihelion direction
    // The anomaly arcs should start (0°) pointing toward the fixed perihelion point
    // Reuse fixedPerihelionObjects and perihelion position defined above

    if (hasPeriPos) {
      // Calculate direction from Sun to Perihelion (P) in the XZ plane (ecliptic)
      // Using already-fetched positions
      const dx = periWorldPosX - sunWorldPosX;
      const dz = periWorldPosZ - sunWorldPosZ;

      // Calculate the angle to align the anomaly visualization with the perihelion direction
      //
      // Goal: Start markers (at local +X) should be on the P side (far from Sun),
      //       and arcs should sweep counter-clockwise from there toward Earth
      //
      // In Three.js (looking down from +Y / north pole view):
      // - +X is right, +Z is toward viewer (Earth is at -Z roughly)
      // - atan2(dz, dx) gives angle from +X axis to Sun→P direction
      // - Add PI to flip 180° so markers are on the P side, not the Sun side
      const perihelionAngle = Math.atan2(dz, dx);

      // Rotate so local +X points toward P (away from Sun center, toward perihelion)
      hierarchyInspector.anomalyGroup.rotation.y = -perihelionAngle + Math.PI;

      // Apply orbital plane tilt (if any) - this tilts the entire anomaly visualization
      if (obj && obj.containerObj) {
        hierarchyInspector.anomalyGroup.rotation.x = obj.containerObj.rotation.x;
        hierarchyInspector.anomalyGroup.rotation.z = obj.containerObj.rotation.z;
      }
    }

    // Calculate the Earth-Sun line angle in local space of the anomalyGroup
    // This angle is used for both the Earth-Sun line AND the mean anomaly arc
    // so they always align perfectly
    let earthSunLocalAngle = 0;

    if (earth && earth.pivotObj) {
      // Get Earth's world position (Sun position already stored above)
      earth.pivotObj.getWorldPosition(_liveDataVec3b);

      // Calculate direction from Earth to Sun in world space (using stored sun position)
      const dxWorld = sunWorldPosX - _liveDataVec3b.x;
      const dzWorld = sunWorldPosZ - _liveDataVec3b.z;
      const earthToSunAngleWorld = Math.atan2(dzWorld, dxWorld);

      // Convert to local space of anomalyGroup
      // The anomalyGroup is rotated so +X points toward perihelion
      const groupRotY = hierarchyInspector.anomalyGroup.rotation.y;
      earthSunLocalAngle = earthToSunAngleWorld + groupRotY;

      // Update the Earth-Sun reference line to point in this direction
      if (hierarchyInspector.earthSunLine) {
        hierarchyInspector.earthSunLine.rotation.y = -earthSunLocalAngle;
      }
    }

    // =====================================================================
    // PROPER TRUE ANOMALY AND MEAN ANOMALY CALCULATION
    // Based on actual 3D positions, not Earth-Sun line angle
    // - True Anomaly (ν): Angle at SUN from perihelion to planet
    // - Mean Anomaly (M): Angle at P (orbit center) from perihelion to planet
    // =====================================================================

    // Get the fixedPerihelion object for this planet (P = orbit center)
    const fixedPerihelionObj = anomalyHierarchy.fixedPerihelion ? anomalyHierarchy.fixedPerihelion() : null;

    let trueAnomalyRad = 0;
    let meanAnomalyRad = 0;
    let periAngleSun = 0;  // Perihelion direction angle from Sun (for arc drawing)
    let periAngleP = 0;    // Perihelion direction angle from P (for arc drawing)

    // We need: Sun position, P position (orbit center), Planet position, Perihelion position
    if (fixedPerihelionObj && childPlanet && sun && sun.pivotObj) {
      // Get world positions (using pooled vectors for performance)
      sun.pivotObj.getWorldPosition(_hiSunPos);
      fixedPerihelionObj.pivotObj.getWorldPosition(_hiPPos);  // P = orbit center
      if (childPlanet.planetObj) {
        childPlanet.planetObj.getWorldPosition(_hiPlanetPos);
      } else if (childPlanet.pivotObj) {
        childPlanet.pivotObj.getWorldPosition(_hiPlanetPos);
      }
      // Perihelion point (the marker on the orbit)
      if (fixedPerihelionObj.planetObj) {
        fixedPerihelionObj.planetObj.getWorldPosition(_hiPerihelionPos);
      }

      // Calculate direction vectors (in XZ plane - ecliptic)
      // In an elliptical orbit:
      // - P (center) is at the geometric center of the ellipse
      // - Sun (focus) is between P and perihelion, at distance a*e from P
      // - Perihelion is in the direction from P toward Sun, beyond the Sun
      //
      // Layout: P -------- Sun ------- Perihelion
      //
      // So perihelion direction from both P and Sun is: P → Sun direction

      // Perihelion direction (from P toward Sun and perihelion)
      const periDirX = _hiSunPos.x - _hiPPos.x;
      const periDirZ = _hiSunPos.z - _hiPPos.z;

      // For both True Anomaly and Mean Anomaly, the perihelion reference is the same direction
      const periDirFromSunX = periDirX;
      const periDirFromSunZ = periDirZ;
      const periDirFromPX = periDirX;
      const periDirFromPZ = periDirZ;

      // Planet direction from Sun (for True Anomaly)
      const planetDirFromSunX = _hiPlanetPos.x - _hiSunPos.x;
      const planetDirFromSunZ = _hiPlanetPos.z - _hiSunPos.z;

      // Planet direction from P (for Mean Anomaly)
      const planetDirFromPX = _hiPlanetPos.x - _hiPPos.x;
      const planetDirFromPZ = _hiPlanetPos.z - _hiPPos.z;

      // Calculate angles using atan2 (counter-clockwise from +X axis)
      // Note: Three.js uses right-handed coords, +Z toward viewer
      // Negate Z for standard counter-clockwise angle measurement
      periAngleSun = Math.atan2(-periDirFromSunZ, periDirFromSunX);
      const planetAngleSun = Math.atan2(-planetDirFromSunZ, planetDirFromSunX);

      periAngleP = Math.atan2(-periDirFromPZ, periDirFromPX);
      const planetAngleP = Math.atan2(-planetDirFromPZ, planetDirFromPX);

      // True Anomaly: angle at Sun from perihelion to planet
      trueAnomalyRad = planetAngleSun - periAngleSun;

      // Mean Anomaly: angle at P from perihelion to planet
      meanAnomalyRad = planetAngleP - periAngleP;

      // Normalize to 0 to 2*PI range
      trueAnomalyRad = ((trueAnomalyRad % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
      meanAnomalyRad = ((meanAnomalyRad % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

      // Update the new visualization lines (P→Planet and Sun→Planet)
      if (hierarchyInspector.pToPlanetLine) {
        const positions = hierarchyInspector.pToPlanetLine.geometry.attributes.position.array;
        positions[0] = _hiPPos.x; positions[1] = _hiPPos.y; positions[2] = _hiPPos.z;
        positions[3] = _hiPlanetPos.x; positions[4] = _hiPlanetPos.y; positions[5] = _hiPlanetPos.z;
        hierarchyInspector.pToPlanetLine.geometry.attributes.position.needsUpdate = true;
      }

      if (hierarchyInspector.sunToPlanetLine) {
        const positions = hierarchyInspector.sunToPlanetLine.geometry.attributes.position.array;
        positions[0] = _hiSunPos.x; positions[1] = _hiSunPos.y; positions[2] = _hiSunPos.z;
        positions[3] = _hiPlanetPos.x; positions[4] = _hiPlanetPos.y; positions[5] = _hiPlanetPos.z;
        hierarchyInspector.sunToPlanetLine.geometry.attributes.position.needsUpdate = true;
      }

      // Update Mean Anomaly Arc (centered at P, sweeps from perihelion to planet)
      if (hierarchyInspector.meanAnomalyArcAtP) {
        const arcRadius = hierarchyInspector._meanArcAtPRadius || 20;
        const positions = hierarchyInspector.meanAnomalyArcAtP.geometry.attributes.position.array;
        const arcSegments = 64;

        for (let i = 0; i <= arcSegments; i++) {
          const t = i / arcSegments;
          const angle = periAngleP + t * meanAnomalyRad;
          positions[i * 3] = _hiPPos.x + arcRadius * Math.cos(angle);
          positions[i * 3 + 1] = _hiPPos.y;
          positions[i * 3 + 2] = _hiPPos.z - arcRadius * Math.sin(angle);
        }
        hierarchyInspector.meanAnomalyArcAtP.geometry.attributes.position.needsUpdate = true;
        hierarchyInspector.meanAnomalyArcAtP.computeLineDistances();
      }

      // Update True Anomaly Arc (centered at Sun, sweeps from perihelion to planet)
      if (hierarchyInspector.trueAnomalyArcAtSun) {
        const arcRadius = hierarchyInspector._trueArcAtSunRadius || 25;
        const positions = hierarchyInspector.trueAnomalyArcAtSun.geometry.attributes.position.array;
        const arcSegments = 64;

        for (let i = 0; i <= arcSegments; i++) {
          const t = i / arcSegments;
          const angle = periAngleSun + t * trueAnomalyRad;
          positions[i * 3] = _hiSunPos.x + arcRadius * Math.cos(angle);
          positions[i * 3 + 1] = _hiSunPos.y;
          positions[i * 3 + 2] = _hiSunPos.z - arcRadius * Math.sin(angle);
        }
        hierarchyInspector.trueAnomalyArcAtSun.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Update display values (convert to degrees)
    const meanAnomalyDeg = meanAnomalyRad * 180 / Math.PI;
    const trueAnomalyDeg = trueAnomalyRad * 180 / Math.PI;
    window._meanAnomaly = meanAnomalyDeg;
    window._trueAnomaly = trueAnomalyDeg;

    // Update the UI display immediately after calculation
    // (The earlier display update in the function runs before these values are calculated)
    if (_liveDataElements && _liveDataElements.meanAnomaly) {
      _liveDataElements.meanAnomaly.textContent = meanAnomalyDeg.toFixed(2) + '°';
    }
    if (_liveDataElements && _liveDataElements.trueAnomaly) {
      _liveDataElements.trueAnomaly.textContent = trueAnomalyDeg.toFixed(2) + '°';
    }
    if (_liveDataElements && _liveDataElements.equationOfCenter) {
      const equationOfCenter = trueAnomalyDeg - meanAnomalyDeg;
      _liveDataElements.equationOfCenter.textContent = (equationOfCenter >= 0 ? '+' : '') + equationOfCenter.toFixed(2) + '°';
    }

    // Keep existing arc visualization for Earth-Sun line (legacy, still useful)
    // The arc should sweep counter-clockwise from perihelion (0°) to the Earth-Sun line
    let arcAngle = -earthSunLocalAngle;
    arcAngle = ((arcAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

    // Update true anomaly arc (from perihelion 0° to Earth-Sun line)
    // NOTE: This OLD arc uses arcAngle (Earth-Sun angle), not the new trueAnomalyRad
    if (hierarchyInspector.trueAnomalyArc) {
      const arcSegments = 32;
      const arcRadius = hierarchyInspector._trueArcRadius || 50;
      const positions = hierarchyInspector.trueAnomalyArc.geometry.attributes.position.array;

      for (let i = 0; i <= arcSegments; i++) {
        const t = i / arcSegments;
        const angle = t * arcAngle; // From 0 to Earth-Sun line (NOT trueAnomalyRad!)
        positions[i * 3] = arcRadius * Math.cos(angle);     // X
        positions[i * 3 + 1] = 0;                            // Y
        positions[i * 3 + 2] = -arcRadius * Math.sin(angle); // Z (negative for counter-clockwise)
      }
      hierarchyInspector.trueAnomalyArc.geometry.attributes.position.needsUpdate = true;
    }

    // Update mean anomaly arc (from perihelion 0° to Earth-Sun line)
    // NOTE: This OLD arc uses arcAngle (Earth-Sun angle), not the new meanAnomalyRad
    if (hierarchyInspector.meanAnomalyArc) {
      const arcSegments = 32;
      const arcRadius = hierarchyInspector._meanArcRadius || 40;
      const positions = hierarchyInspector.meanAnomalyArc.geometry.attributes.position.array;

      for (let i = 0; i <= arcSegments; i++) {
        const t = i / arcSegments;
        const angle = t * arcAngle; // From 0 to Earth-Sun line (NOT meanAnomalyRad!)
        positions[i * 3] = arcRadius * Math.cos(angle);     // X
        positions[i * 3 + 1] = 0;                            // Y
        positions[i * 3 + 2] = -arcRadius * Math.sin(angle); // Z (negative for clockwise in Three.js)
      }
      hierarchyInspector.meanAnomalyArc.geometry.attributes.position.needsUpdate = true;
      hierarchyInspector.meanAnomalyArc.computeLineDistances();
    }
  }

  // Update ascending/descending node marker positions based on dynamic ascending node
  // The inclinationPlane is attached to containerObj, which rotates based on dynamic ascending node.
  // We need to recalculate the LOCAL positions where the orbital plane intersects the ecliptic.

  // DEBUG: Check if hierarchy inspector visuals exist
  if (_debugAscendingNodeLogEnabled && hierarchyInspector.currentPlanet === 'mercury') {
    const now = Date.now();
    if (now - _debugAscendingNodeLastLog < _debugAscendingNodeInterval + 150) {
      const hasPlane = !!hierarchyInspector.inclinationPlane;
      const hasAsc = !!hierarchyInspector.ascendingNode;
      const hasDesc = !!hierarchyInspector.descendingNode;
      console.log(`📐 Hierarchy inspector: plane=${hasPlane}, ascNode=${hasAsc}, descNode=${hasDesc}`);
    }
  }

  if (hierarchyInspector.inclinationPlane && hierarchyInspector.ascendingNode && hierarchyInspector.descendingNode) {
    const planetKey = hierarchyInspector.currentPlanet;
    const realPerihelionObjects = {
      mercury: mercuryRealPerihelionAtSun,
      venus: venusRealPerihelionAtSun,
      mars: marsRealPerihelionAtSun,
      jupiter: jupiterRealPerihelionAtSun,
      saturn: saturnRealPerihelionAtSun,
      uranus: uranusRealPerihelionAtSun,
      neptune: neptuneRealPerihelionAtSun,
      pluto: plutoRealPerihelionAtSun,
      halleys: halleysRealPerihelionAtSun,
      eros: erosRealPerihelionAtSun
    };
    const obj = realPerihelionObjects[planetKey];

    if (obj && obj.containerObj) {
      // Get the current container rotation (which reflects the dynamic ascending node)
      const tiltaRad = obj.containerObj.rotation.x;
      const tiltbRad = obj.containerObj.rotation.z;

      // PERFORMANCE: Skip expensive recalculation if tilt hasn't changed significantly (>0.0001 rad ≈ 0.006°)
      const tiltChanged = _lastAscNodeTiltA === null ||
        Math.abs(tiltaRad - _lastAscNodeTiltA) > 0.0001 ||
        Math.abs(tiltbRad - _lastAscNodeTiltB) > 0.0001;

      // DEBUG: Check if tiltChanged is blocking the update
      if (_debugAscendingNodeLogEnabled && hierarchyInspector.currentPlanet === 'mercury') {
        const now = Date.now();
        if (now - _debugAscendingNodeLastLog < _debugAscendingNodeInterval + 200) {
          console.log(`🔄 tiltChanged=${tiltChanged}, tiltaRad=${tiltaRad.toFixed(6)}, lastA=${_lastAscNodeTiltA?.toFixed(6) || 'null'}`);
        }
      }

      if (tiltChanged) {
        _lastAscNodeTiltA = tiltaRad;
        _lastAscNodeTiltB = tiltbRad;

        // Build the local-to-world transformation matrix (reuse pooled matrix and euler)
        _liveDataEuler.set(tiltaRad, 0, tiltbRad, 'XYZ');
        _liveDataLocalToWorld.makeRotationFromEuler(_liveDataEuler);

        // Get the scale used for the inclination plane
        const scale = hierarchyInspector._perihelionArrowScale || 100;
        const planeRadius = scale * 0.5;

        // Get the ACTUAL ascending node angle from the o.xxxAscendingNode property
        // This is the authoritative value that's dynamically calculated for the current date
        const ascNodePropertyMap = {
          mercury: 'mercuryAscendingNode',
          venus: 'venusAscendingNode',
          mars: 'marsAscendingNode',
          jupiter: 'jupiterAscendingNode',
          saturn: 'saturnAscendingNode',
          uranus: 'uranusAscendingNode',
          neptune: 'neptuneAscendingNode',
          pluto: 'plutoAscendingNode',
          halleys: 'halleysAscendingNode',
          eros: 'erosAscendingNode'
        };
        const ascNodeProp = ascNodePropertyMap[hierarchyInspector.currentPlanet];
        const ascNodeAngleDeg = ascNodeProp ? (o[ascNodeProp] || 0) : 0;
        const ascNodeAngleRad = ascNodeAngleDeg * Math.PI / 180;

        // Calculate ascending node position in LOCAL coordinates
        // Our model is 90° rotated (from March 21 to June 21), so we add 90° counterclockwise
        // After 90° CCW rotation: X = -sin(angle), Z = -cos(angle)
        _liveDataNewAscPos.set(
          planeRadius * -Math.sin(ascNodeAngleRad),
          0,
          planeRadius * -Math.cos(ascNodeAngleRad)
        );

        // Descending node is 180° opposite
        _liveDataNewDescPos.set(
          -_liveDataNewAscPos.x,
          0,
          -_liveDataNewAscPos.z
        );

        // Update marker positions
        hierarchyInspector.ascendingNode.position.copy(_liveDataNewAscPos);
        hierarchyInspector.descendingNode.position.copy(_liveDataNewDescPos);

        // Update the arrows attached to the nodes using cached references if available
        // PERFORMANCE: Use cached references instead of searching children
        if (hierarchyInspector._ascNodeArrow) {
          hierarchyInspector._ascNodeArrow.position.copy(_liveDataNewAscPos);
        }
        if (hierarchyInspector._descNodeArrow) {
          hierarchyInspector._descNodeArrow.position.copy(_liveDataNewDescPos);
        }

        // Update the line of nodes using cached reference
        if (hierarchyInspector._nodesLine) {
          const positions = hierarchyInspector._nodesLine.geometry.attributes.position.array;
          positions[0] = _liveDataNewAscPos.x;
          positions[1] = _liveDataNewAscPos.y;
          positions[2] = _liveDataNewAscPos.z;
          positions[3] = _liveDataNewDescPos.x;
          positions[4] = _liveDataNewDescPos.y;
          positions[5] = _liveDataNewDescPos.z;
          hierarchyInspector._nodesLine.geometry.attributes.position.needsUpdate = true;
          hierarchyInspector._nodesLine.computeLineDistances();
        }

        // Update the half-plane geometries (green above / red below ecliptic)
        // PERFORMANCE: Reuse orbit point arrays instead of recreating
        if (hierarchyInspector.aboveHalfPlane && hierarchyInspector.belowHalfPlane) {
          const numPoints = 64;

          // DEBUG: Test if ascending node world Y is ~0 (it should be, since that's where orbit crosses ecliptic)
          if (_debugAscendingNodeLogEnabled && hierarchyInspector.currentPlanet === 'mercury') {
            const now = Date.now();
            if (now - _debugAscendingNodeLastLog < _debugAscendingNodeInterval + 500) {
              const testX = planeRadius * -Math.sin(ascNodeAngleRad);
              const testZ = planeRadius * -Math.cos(ascNodeAngleRad);
              _liveDataDebugLocal.set(testX, 0, testZ);
              _liveDataDebugWorld.copy(_liveDataDebugLocal).applyMatrix4(_liveDataLocalToWorld);
              // Also get actual marker world position
              if (hierarchyInspector.ascendingNode) {
                hierarchyInspector.ascendingNode.getWorldPosition(_liveDataDebugMarker);
              }
              console.log(`🟢🔴 Asc node: local(${testX.toFixed(1)}, 0, ${testZ.toFixed(1)}) → matrixY: ${_liveDataDebugWorld.y.toFixed(4)}, actualWorldPos: (${_liveDataDebugMarker.x.toFixed(1)}, ${_liveDataDebugMarker.y.toFixed(4)}, ${_liveDataDebugMarker.z.toFixed(1)})`);
            }
          }

          // Helper to rebuild half-disc geometry (uses pooled arrays for performance)
          const rebuildHalfDiscGeometry = (mesh, isAbove) => {
            // Center point at index 0
            _halfDiscVertices[0] = 0;
            _halfDiscVertices[1] = 0;
            _halfDiscVertices[2] = 0;

            // Generate points
            for (let i = 0; i <= numPoints; i++) {
              const angle = (i / numPoints) * Math.PI * 2;
              const idx = (i + 1) * 3;
              _halfDiscVertices[idx] = planeRadius * Math.cos(angle);
              _halfDiscVertices[idx + 1] = 0;
              _halfDiscVertices[idx + 2] = planeRadius * Math.sin(angle);
            }

            // Clear and rebuild indices based on world Y position
            _halfDiscIndices.length = 0;
            for (let i = 1; i <= numPoints; i++) {
              const angle1 = ((i - 1) / numPoints) * Math.PI * 2;
              const angle2 = (i / numPoints) * Math.PI * 2;

              // Calculate world Y for midpoint (reuse pooled vectors)
              _liveDataLocalPt.set(planeRadius * Math.cos(angle1), 0, planeRadius * Math.sin(angle1));
              _liveDataWorldPt.copy(_liveDataLocalPt).applyMatrix4(_liveDataLocalToWorld);
              const y1 = _liveDataWorldPt.y;

              _liveDataLocalPt.set(planeRadius * Math.cos(angle2), 0, planeRadius * Math.sin(angle2));
              _liveDataWorldPt.copy(_liveDataLocalPt).applyMatrix4(_liveDataLocalToWorld);
              const y2 = _liveDataWorldPt.y;

              const midWorldY = (y1 + y2) / 2;
              const segmentIsAbove = midWorldY > 0;

              if (segmentIsAbove === isAbove) {
                _halfDiscIndices.push(0, i, i + 1);
              }
            }

            // Update geometry - reuse existing BufferAttribute if possible
            const posAttr = mesh.geometry.attributes.position;
            if (posAttr && posAttr.array.length === _halfDiscVertices.length) {
              posAttr.array.set(_halfDiscVertices);
              posAttr.needsUpdate = true;
            } else {
              mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(_halfDiscVertices.slice(), 3));
            }
            mesh.geometry.setIndex(_halfDiscIndices);
            mesh.geometry.computeVertexNormals();
            if (mesh.geometry.index) mesh.geometry.index.needsUpdate = true;
          };

          rebuildHalfDiscGeometry(hierarchyInspector.aboveHalfPlane, true);
          rebuildHalfDiscGeometry(hierarchyInspector.belowHalfPlane, false);
        }

        // Update highest/lowest point markers (90° after ascending/descending nodes)
        // PERFORMANCE: Use pooled vectors
        if (hierarchyInspector.highestPointMarker && hierarchyInspector.lowestPointMarker) {
          let maxWorldY = -Infinity;
          let minWorldY = Infinity;
          _liveDataNewHighPos.set(0, 0, 0);
          _liveDataNewLowPos.set(0, 0, 0);

          const numSamples = 360;
          for (let i = 0; i < numSamples; i++) {
            const angle = (i / numSamples) * Math.PI * 2;
            _liveDataLocalPt.set(planeRadius * Math.cos(angle), 0, planeRadius * Math.sin(angle));
            _liveDataWorldPt.copy(_liveDataLocalPt).applyMatrix4(_liveDataLocalToWorld);

            if (_liveDataWorldPt.y > maxWorldY) {
              maxWorldY = _liveDataWorldPt.y;
              _liveDataNewHighPos.copy(_liveDataLocalPt);
            }
            if (_liveDataWorldPt.y < minWorldY) {
              minWorldY = _liveDataWorldPt.y;
              _liveDataNewLowPos.copy(_liveDataLocalPt);
            }
          }

          // Update marker positions
          hierarchyInspector.highestPointMarker.position.copy(_liveDataNewHighPos);
          hierarchyInspector.lowestPointMarker.position.copy(_liveDataNewLowPos);

          // Update arrows
          if (hierarchyInspector._highArrow) {
            hierarchyInspector._highArrow.position.copy(_liveDataNewHighPos);
          }
          if (hierarchyInspector._lowArrow) {
            hierarchyInspector._lowArrow.position.copy(_liveDataNewLowPos);
          }
        }
      } // End of tiltChanged block
    }
  }

  // Update perihelion arrow (green line from P to Sun)
  if (hierarchyInspector.perihelionArrow && hierarchyInspector._fixedPerihelionObj) {
    const fixedPerihelion = hierarchyInspector._fixedPerihelionObj;

    // Use planetObj if available, otherwise fall back to pivotObj
    const sourceObj = fixedPerihelion.planetObj || fixedPerihelion.pivotObj;
    if (sourceObj) {
      // Reuse vectors for performance (using existing _liveDataVec3 pattern)
      sourceObj.getWorldPosition(_liveDataVec3);

      // Get Sun's world position using a second reusable vector
      if (!hierarchyInspector._sunPosVec3) {
        hierarchyInspector._sunPosVec3 = new THREE.Vector3();
      }
      if (sun && sun.pivotObj) {
        sun.pivotObj.getWorldPosition(hierarchyInspector._sunPosVec3);
      }

      // Position the arrow group at the P point
      hierarchyInspector.perihelionArrow.position.copy(_liveDataVec3);

      // Calculate direction to Sun and make the arrow look at it
      if (!hierarchyInspector._dirVec3) {
        hierarchyInspector._dirVec3 = new THREE.Vector3();
        hierarchyInspector._defaultDir = new THREE.Vector3(0, 0, 1);
        hierarchyInspector._arrowQuat = new THREE.Quaternion();
      }
      hierarchyInspector._dirVec3.subVectors(hierarchyInspector._sunPosVec3, _liveDataVec3).normalize();

      // Only update rotation if direction is valid (not zero length)
      if (hierarchyInspector._dirVec3.lengthSq() > 0.0001) {
        hierarchyInspector._arrowQuat.setFromUnitVectors(hierarchyInspector._defaultDir, hierarchyInspector._dirVec3);
        hierarchyInspector.perihelionArrow.setRotationFromQuaternion(hierarchyInspector._arrowQuat);
      }
    }
  }

  // Update planet locator circle position (follows the planet)
  if (hierarchyInspector._planetLocatorCircle && hierarchyInspector._planetLocatorTarget) {
    const target = hierarchyInspector._planetLocatorTarget;
    if (target.planetObj) {
      target.planetObj.getWorldPosition(_liveDataVec3);
      hierarchyInspector._planetLocatorCircle.position.copy(_liveDataVec3);
      // Make the circle face the camera for better visibility
      hierarchyInspector._planetLocatorCircle.lookAt(camera.position);
    }
  }
  } catch (err) {
    console.error('[HierarchyLiveData] Error:', err);
  }
}

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

//  gui.add(o, 'julianDay').name('Julian day').listen().onFinishChange(() => {
//    if (isNumeric(o.julianDay)) {
//      o.Day = o.julianDay - startmodelJD;
//      o.pos = sDay * o.Day + timeToPos(o.Time);
//      const p = dayToDateNew(o.julianDay,'julianday','perihelion-calendar');
//      o.perihelionDate = `${p.date}`;
//    }
//  });
  
  gui.add(o, 'julianDay').name('Julian day').listen()
  .onFinishChange(() => {
    if (!isNumeric(o.julianDay)) return;
    
    const newJD = Number(o.julianDay);
    const currentJD = dateTimeToJulianDay(o.Date, o.Time);
    
    // Skip if value hasn't meaningfully changed
    if (Math.abs(newJD - currentJD) < 0.0000001) {
      return;
    }

    // Convert Julian Day to date and time  <-- THIS IS THE MISSING PART
    const converted = dayToDate(newJD);
    o.Date = converted.date;
    o.Time = converted.time;

    // Update internal state (now using the NEW o.Time)
    o.Day = newJD - startmodelJD;
    o.pos = sDay * o.Day;  // Day already includes the time fraction

    // Update perihelion calendar display
    const p = dayToDateNew(newJD, 'julianday', 'perihelion-calendar');
    o.perihelionDate = `${p.date}`;

    positionChanged = true; // Signal animation loop to update scene
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
  
  function toggleCtrl (ctrl, show) {
  if (ctrl && ctrl.__li) ctrl.__li.style.display = show ? '' : 'none';
  }
  
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
  ctrlFolder.add(o, 'Now (time in UTC)' );
  
  let planetList = {}
  let isHelper = {}
  
  planetObjects.forEach(obj => {
    const isHelperObj =
        (obj.isNotPhysicalObject === true) || (obj.visible === false);
    if (isHelperObj) {
      isHelper[obj.name]  = obj.name;   // put in helper list
    } else {
      planetList[obj.name] = obj.name;  // put in normal-planet list
    }
  });

  ctrlFolder
  .add(o, 'Target', { 'Please select': "", ...planetList }).name('Look at').onFinishChange(value => {

    /* value === ''  →  no planet selected */
    o.lookAtObj = planetObjects.find(p => p.name === value) || undefined;

    /* Disable hierarchy inspector camera control when user manually changes target */
    hierarchyInspector._cameraControlActive = false;
    hierarchyInspector._cameraTarget = null;

    /* Signal animation loop to update scene (needed when idle) */
    positionChanged = true;

    /* Reset camera parameters for the new target */
    focusPlanet(o.lookAtObj);

    /* hide every orbit-plane helper … */
    planetObjects.forEach(p => {
      if (p.orbitPlaneHelper) p.orbitPlaneHelper.visible = false;
    });

    /* … and show only the helper of the chosen planet (if any) */
    if (o.lookAtObj?.orbitPlaneHelper) {
      o.lookAtObj.orbitPlaneHelper.visible = true;
    }
  });
  focusPlanet(o.lookAtObj);
  ctrlFolder.open() 
  
  let astroFolder = gui.addFolder('Predictions Holistic Universe Model');

    let daysFolder = astroFolder.addFolder('Length of Days Predictions');
      daysFolder.add(predictions, 'lengthofDay').name('Length of Day (sec)').step(0.000001).listen();
      daysFolder.add(predictions, 'lengthofsiderealDayRealLOD').name('Length of Sidereal Day (sec)').step(0.000001).listen();
      daysFolder.add(predictions, 'lengthofstellarDayRealLOD').name('Length of Stellar Day (sec)').step(0.000001).listen();  
    daysFolder.open();
  
    let yearsFolder = astroFolder.addFolder('Length of Solar Year Predictions'); 
      yearsFolder.add(predictions, 'lengthofsolarYearSecRealLOD').name('Length of Solar Year (sec)').step(0.000001).listen();
      yearsFolder.add(predictions, 'lengthofsolarYear').name('Length of Solar Year (days)').step(0.000001).listen();
    yearsFolder.open(); 
  
    let siderealFolder = astroFolder.addFolder('Length of Sidreal Year Predictions'); 
      siderealFolder.add(predictions, 'lengthofsiderealYear').name('Length of Sidereal Year (sec)').step(0.000001).listen(); 
      siderealFolder.add(predictions, 'lengthofsiderealYearDaysRealLOD').name('Length of Sidereal Year (days)').step(0.000001).listen();
    siderealFolder.open(); 
  
    let anomalisticFolder = astroFolder.addFolder('Length of Anomalistic Year - Predictions');
      anomalisticFolder.add(predictions, 'lengthofanomalisticYearRealLOD').name('Length of Anomalistic Year (sec)').step(0.000001).listen();
      anomalisticFolder.add(predictions, 'lengthofanomalisticDaysRealLOD').name('Length of Anomalistic Year (days)').step(0.000001).listen();
    anomalisticFolder.open(); 
  
    let precessionFolder = astroFolder.addFolder('Length of Precession - Predictions');
      precessionFolder.add(predictions, 'perihelionPrecessionRealLOD').name('Perihelion Precession (yrs)').step(0.000001).listen();
      precessionFolder.add(predictions, 'axialPrecessionRealLOD').name('Axial Precession (yrs)').step(0.000001).listen();
      precessionFolder.add(predictions, 'inclinationPrecessionRealLOD').name('Inclination Precession (yrs)').step(0.000001).listen();
      precessionFolder.add(predictions, 'eclipticPrecessionRealLOD').name('Length Ecliptic Cycle (yrs)').step(0.000001).listen();
      precessionFolder.add(predictions, 'obliquityPrecessionRealLOD').name('Length Obliquity Cycle (yrs)').step(0.000001).listen();
    precessionFolder.open(); 
  
    let orbitalFolder = astroFolder.addFolder('Orbital Elements Predictions');
      orbitalFolder.add(predictions, 'eccentricityEarth').name('Earth Orbital Eccentricity (AU)').step(0.000001).listen();
      orbitalFolder.add(predictions, 'obliquityEarth').name('Earth Obliquity (°)').step(0.000001).listen();
      orbitalFolder.add(predictions, 'inclinationEarth').name('Earth Inclination to invariable plane (°)').step(0.000001).listen();
      orbitalFolder.add(predictions, 'longitudePerihelion').name('Earth Longitude of Perihelion (°)').step(0.000001).listen();
      orbitalFolder.add(predictions, 'lengthofAU').name('Length of AU (km)').step(0.000001).listen();
      //orbitalFolder.add(predictions, 'anomalisticMercury').name('Missing Mercury Advance (arcsec)').step(0.000001).listen();
    orbitalFolder.open(); 
  
      let ephemerisFolder = astroFolder.addFolder('86400 sec/day - Predictions'); 
  //      ephemerisFolder.add(predictions, 'predictedDeltat').name('Delta-T (sec)').step(0.000001).listen();
  //      ephemerisFolder.add(predictions, 'predictedDeltatPerYear').name('ΔT change (sec/year)').step(0.000001).listen();
      ephemerisFolder.add(predictions, 'lengthofsolarDay').name('86400 sec/day - Length of Solar Day (sec)').step(0.000001).listen();
      ephemerisFolder.add(predictions, 'lengthofsiderealDay').name('86400 sec/day - Length of Sidereal Day (sec)').step(0.000001).listen();
      ephemerisFolder.add(predictions, 'lengthofstellarDay').name('86400 sec/day - Length of Stellar Day (sec)').step(0.000001).listen();
      ephemerisFolder.add(predictions, 'lengthofsolarYearinDays').name('86400 sec/day - Length of Solar Year (days)').step(0.000001).listen();
      ephemerisFolder.add(predictions, 'lengthofsiderealYearDays').name('86400 sec/day - Length of Sidereal Year (days)').step(0.000001).listen();
      ephemerisFolder.add(predictions, 'lengthofanomalisticYearinDays').name('86400 sec/day - Length of Anomalistic Year (days)').step(0.000001).listen();
    ephemerisFolder.open();
  
  astroFolder.close();
  
  let posFolder = gui.addFolder('Celestial Positions')
  posFolder
  .add(o, 'displayFormat', ['sexagesimal', 'decimal'])
  .name('RA/Dec Format')
  .onChange(() => {
    updatePositions();
    updatePositionDisplayStrings(); // Update display strings immediately
  });

  posFolder
  .add(o, 'distanceUnit', ['AU', 'km', 'mi'])
  .name('Distance Format')
  .onChange(() => {
    updatePositions();
    updatePositionDisplayStrings(); // Update display strings immediately
  });
  
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
  addInfoButton( folderPerihelion, 'https://wgc.jpl.nasa.gov:8443/webgeocalc/#OrbitalElements' );
  folderPerihelion.add(o,"mercuryPerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Mercury Perihelion")
//  folderPerihelion.add(o,"mercuryPerihelion2").min(0.0).max(360.0).step(0.000001).listen().name("Mercury Perihelion2")
  folderPerihelion.add(o,"venusPerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Venus Perihelion")
  folderPerihelion.add(o,"earthPerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Earth Perihelion")
  folderPerihelion.add(o,"marsPerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Mars Perihelion")
  folderPerihelion.add(o,"jupiterPerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Jupiter Perihelion")
  folderPerihelion.add(o,"saturnPerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Saturn Perihelion")  
  folderPerihelion.add(o,"uranusPerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Uranus Perihelion") 
  folderPerihelion.add(o,"neptunePerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Neptune Perihelion")
  folderPerihelion.add(o,"plutoPerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Pluto Perihelion")
  folderPerihelion.add(o,"halleysPerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Halleys Perihelion")
  folderPerihelion.add(o,"erosPerihelion").min(0.0).max(360.0).step(0.000001).listen().name("Eros Perihelion")   
  
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
  folderO.add(invariablePlaneGroup, 'visible').name('Invariable plane').onChange(function(value) {
    // Show/hide all labels when toggling the plane
    // Must set CSS2DObject.visible property (not just div.style.display)
    // because the patched labelRenderer checks obj.visible and overrides display style
    if (invariablePlaneGroup.userData.highLabelObj) {
      invariablePlaneGroup.userData.highLabelObj.visible = value;
    }
    if (invariablePlaneGroup.userData.lowLabelObj) {
      invariablePlaneGroup.userData.lowLabelObj.visible = value;
    }
    if (invariablePlaneGroup.userData.meanLabel1Obj) {
      invariablePlaneGroup.userData.meanLabel1Obj.visible = value;
    }
    if (invariablePlaneGroup.userData.meanLabel2Obj) {
      invariablePlaneGroup.userData.meanLabel2Obj.visible = value;
    }
    needsLabelUpdate = true; // Force label renderer to redraw immediately
  });
  folderO.add(inclinationPathGroup, 'visible').name('Inclination path').onChange(function(value) {
    if (value) {
      // Force immediate position update when becoming visible
      _lastInclinationUpdateYear = null; // Reset throttle
      updateInclinationPathMarker();
    } else {
      // Hide label immediately when toggling off
      const labelObject = inclinationPathGroup.userData.labelObject;
      if (labelObject) labelObject.visible = false;
    }
    needsLabelUpdate = true; // Force label renderer to redraw immediately
  })

  let sFolder = gui.addFolder('Settings')

  // Hierarchy Inspector - first item in Settings
  sFolder.add({ inspect: openHierarchyInspector }, 'inspect').name('Planet Inspector');

  sFolder.add(params, 'sizeBoost', 0, 1, 0.01).name('Planet size  0  = real').onChange(updatePlanetSizes);
  
  /* --- Output file  -------------------------------------------- */
  const testSettings = sFolder.addFolder('Create Object File');

  const modeCtrl   = testSettings.add(o, 'testMode', ['List', 'Range']).name('Mode');
  const listCtrl   = testSettings.add(o, 'testJDsText').name('JD list (CSV)');
  const startCtrl  = testSettings.add(o, 'rangeStart').name('Start JD');
  const endCtrl    = testSettings.add(o, 'rangeEnd').name('End JD');
  const pieceCtrl  = testSettings.add(o, 'rangePieces').name('# points').min(2).step(1);

  //testSettings.add(o, 'runRATestButton').name('Create file (be patient)');
  const runCtrl = testSettings
  .add(o, 'runRATestToggle')
  .name('Create file (be patient)')
  .listen();
  
  runCtrl.onChange(async val => {
  if (!val || o._raTestBusy) return;   // only react on first tick

  o._raTestBusy = true;
  try {
    await runRATest();                // heavy work runs **after** the UI paints
  } finally {
    o.runRATestToggle = false;        // untick when finished
    runCtrl.updateDisplay();
    o._raTestBusy = false;
  }
  });
  
  /* --- show only the relevant rows ------------------------------- */
  function syncVis () {
  const list = o.testMode === 'List';
  toggleCtrl(listCtrl,  list);
  toggleCtrl(startCtrl, !list);
  toggleCtrl(endCtrl,   !list);
  toggleCtrl(pieceCtrl, !list);
  }
  syncVis();
  modeCtrl.onChange(syncVis);
  
  /* --- Solstice file --------------------------------------------------- */
  const solFolder = sFolder.addFolder('Create Solstice File');

  const modeCtrl2  = solFolder.add(o, 'solMode', ['Range', 'List']).name('Mode');
  const yearList   = solFolder.add(o, 'solYearsText').name('Year list (CSV)');
  const startCtrl2 = solFolder.add(o, 'solRangeStart').name('Start year').step(1);
  const endCtrl2   = solFolder.add(o, 'solRangeEnd').name('End year').step(1);

  const runCtrl2 = solFolder
  .add(o, 'runSolToggle')
  .name('Create file (be patient)')
  .listen();

  /* --- show only the relevant rows ------------------------------------ */
  function syncSolVis() {
  const list = o.solMode === 'List';
  toggleCtrl(yearList,  list);      // show list box only in List mode
  toggleCtrl(startCtrl2, !list);    // show range fields only in Range mode
  toggleCtrl(endCtrl2,   !list);
  }
  syncSolVis();
  modeCtrl2.onChange(syncSolVis);

  /* --- run button ------------------------------------------------------ */
  runCtrl2.onChange(async ticked => {
  if (!ticked || o._solBusy) return;   // ignore untick or double-click
  o._solBusy = true;
  try {
    const yrs = buildYearArray();      // builds array from List or Range
    if (!yrs.length) {
      alert('No valid years — check your input.');
      return;
    }
    await runSolsticeExport(yrs);      // heavy work
  } finally {
    o.runSolToggle = false;            // untick when finished
    runCtrl2.updateDisplay();
    o._solBusy = false;
  }
  });
  
  let folderPlanets = sFolder.addFolder('Planets show/hide');
  folderPlanets.add(o, 'Orbits' ).onFinishChange(()=>{
    showHideOrbits();
  });

  folderPlanets.add(o, 'Size', 0.4, 1.4).onChange(()=>{changePlanetScale()})
  planetObjects.forEach(obj => {
    if (!obj.isNotPhysicalObject) {
      folderPlanets.add(obj, 'visible').name(obj.name).onFinishChange(()=>{
        showHideObject(obj);
      });
    }
  })
 
  let folderDef = sFolder.addFolder('Objects show/hide');
  planetObjects.forEach(obj => {
    if (obj.isNotPhysicalObject) {
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
  folderElongations.add(o,"plutoElongation").min(0.0).max(180.0).listen().name("Pluto") 
  folderElongations.add(o,"halleysElongation").min(0.0).max(180.0).listen().name("Halleys") 
  folderElongations.add(o,"erosElongation").min(0.0).max(180.0).listen().name("Eros") 
  
  let folderCamera = sFolder.addFolder('Camera show/hide')

  folderCamera.add(o, 'worldCamRa').name('RA').listen()
  folderCamera.add(o, 'worldCamDec').name('Dec').listen()
  folderCamera.add(o, 'worldCamDist').name('AU distance').listen()

  // Debug folder for ascending node debugging (only shown when debugOn flag is true)
  if (debugOn) {
    let debugFolder = sFolder.addFolder('Debug');
    debugFolder.add(o, 'debugAscendingNode').name('Log Ascending Nodes').onChange((val) => {
      _debugAscendingNodeLogEnabled = val;
      if (val) {
        console.log('🔍 Ascending Node debugging ENABLED - check console for logs every second');
        console.log('   Go to a date like 12000-07-16 to see drift behavior');
      } else {
        console.log('🔍 Ascending Node debugging DISABLED');
      }
    });
  }

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
  // If hierarchy inspector is controlling camera, use its target instead
  if (hierarchyInspector._cameraControlActive && hierarchyInspector._cameraTarget?.pivotObj) {
    controls.target.copy(
      hierarchyInspector._cameraTarget.pivotObj.getWorldPosition(tmpVec)
    );
  } else if (o.lookAtObj && o.lookAtObj.pivotObj) {
    controls.target.copy(
      o.lookAtObj.pivotObj.getWorldPosition(tmpVec)
    );
  }
  controls.update();

  // Enforce minimum distance after damping (prevents drifting into planet)
  // Skip when hierarchy inspector is controlling camera (it has its own targets)
  if (!hierarchyInspector._cameraControlActive && o.lookAtObj?.planetObj && o.lookAtObj.size) {
    // Use rotationAxis scale (where blow-up slider applies) not planetObj scale
    const scale = o.lookAtObj.rotationAxis?.scale?.x ?? 1;
    const visualRadius = o.lookAtObj.size * scale;
    const multiplier = getCameraMinDistMultiplier(o.lookAtObj.name);
    const minDist = visualRadius * multiplier;
    const dist = camera.position.distanceTo(controls.target);
    if (dist < minDist) {
      // Push camera back to minimum distance
      _camDir.copy(camera.position).sub(controls.target).normalize();
      camera.position.copy(controls.target).add(_camDir.multiplyScalar(minDist));
    }
  }

  // 4) Throttle the human-readable GUI (20 Hz)
  //    Also force update when positionChanged (position jumped externally)
  let uiUpdateThisFrame = false;
  uiElapsed += delta;
  if (uiElapsed >= 0.05 || positionChanged) {
    if (uiElapsed >= 0.05) uiElapsed = 0;
    uiUpdateThisFrame = true;
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

  // 6) Skip heavy updates when idle (not running and camera not moving)
  const needsUpdate = o.Run || cameraMoved || positionChanged;
  const forceAllUpdates = positionChanged; // When position jumps, force all throttled updates immediately

  if (needsUpdate) {
    positionChanged = false; // Reset flag after handling
    // 6a) Must-run-every-frame: updates your models
    trace(o.pos);
    moveModel(o.pos);
    //detectAndUpdateDeltaT(); // can calculate Delta T but is quite heavy. If you switch it on, also switch on the menu-items/ info-box-itms.
    updatePositions();
    // Throttle display string updates (20 Hz) - must be after updatePositions() sets numeric values
    if (uiUpdateThisFrame || forceAllUpdates) {
      updatePositionDisplayStrings();
    }
    // 6b) Throttle heavy astronomical calculations (10 Hz)
    astroCalcElapsed += delta;
    if (astroCalcElapsed >= 0.1 || forceAllUpdates) {
      astroCalcElapsed = 0;
      updatePredictions(); // Heavy - 50+ computations, values change slowly
      updateAscendingNodes(); // Must be before updateHierarchyLiveData() so dynamic values are current
      updatePlanetAnomalies(); // Must be after updateAscendingNodes(), calculates Mean/True Anomaly for all planets
      updatePlanetInvariablePlaneHeights(); // Must be after updatePlanetAnomalies(), calculates height above invariable plane
      updateDynamicInclinations(); // Must be after updatePlanetInvariablePlaneHeights(), calculates apparent inclination to ecliptic
      updateHierarchyLiveData(); // Must be after updatePositions() which sets raDisplay/decDisplay
      updateInclinationPathMarker();
      updateInvariablePlanePosition();
    }
    // 6c) Throttle visual effects (30 Hz) - smooth enough for eye, saves CPU
    visualElapsed += delta;
    if (visualElapsed >= 0.033 || forceAllUpdates) {
      visualElapsed = 0;
      updateLightingForFocus();
      updateFlares();
    }
    if (earth._updateSunDirFunc) earth._updateSunDirFunc(sun.planetObj);
    if (earth._updateEraFunc)    earth._updateEraFunc(o.julianDay);
    updateSunGlow();

    // 7) Throttle astro-heavy updates (10 Hz)
    posElapsed += delta;
    if (posElapsed >= 0.1 || forceAllUpdates) {
      posElapsed = 0;
      updateElongations();
      updatePerihelion();
      // updateAscendingNodes() is now called every frame before updateHierarchyLiveData()
      updateOrbitOrientations();
      golden.update();
    }

    // 7b) Throttle DOM label updates (5 Hz) - separated from astro updates for performance
    domElapsed += delta;
    if (domElapsed >= 0.2 || forceAllUpdates) {
      domElapsed = 0;
      updateDomLabel();
    }

    // 8) Throttle lighting/glow (10 Hz)
    lightElapsed += delta;
    if (lightElapsed >= 0.1 || forceAllUpdates) {
      lightElapsed = 0;
      updateFocusRing();
      animateGlow(); // zodiac animation
    }
  }

  // Always run cloud animation (even when idle)
  if (earth._updateCloudsFunc) earth._updateCloudsFunc(delta);

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
function solsticeForYear(year) {

  const approxJD = startmodelJD +
        ((year + 0.5) - startmodelYear) * meansolaryearlengthinDays;

  const step    = 0.5 / 24;         // 0.5 h in days
  let bestJD    = NaN;
  let bestObliq = -Infinity;

  for (let k = -288; k <= 288; ++k) {             // 288*2+1 samples of 30 minutes interval around the approxJD.
    const jd   = approxJD + k * step;
    const frac = jd - Math.floor(jd);

    o.Time = fracDayToTimeStr(frac);              // sync viewer clock
    jumpToJulianDay(jd);
    forceSceneUpdate();

    if (!Number.isFinite(sun?.dec)) continue;

    const obDeg = 90 - sun.dec * 180 / Math.PI;
    if (obDeg > bestObliq) { bestObliq = obDeg; bestJD = jd; }
  }

  if (!Number.isFinite(bestJD)) return null;

  /* final, unrounded values */
  const bestFrac = bestJD - Math.floor(bestJD);
  o.Time = fracDayToTimeStr(bestFrac);
  jumpToJulianDay(bestJD);
  forceSceneUpdate();

  return {
    jd      : bestJD,
    raDeg   : (sun.ra * 180 / Math.PI + 360) % 360,
    obliqDeg: bestObliq
  };
}

async function runSolsticeExport(years) {

  console.log('Solstice export for years:', years);

  /* A · freeze viewer */
  const oldRun  = o.Run;
  const oldJD   = o.julianDay;
  const oldTime = o.Time;
  o.Run = false;

  /* B · rows */
  const rows = [['Date', 'Time', 'Year', 'JD', 'RA (°)', 'Obliquity (°)']];
  const YIELD_EVERY = 25;
  let done = 0;

  for (const y of years) {
    const r = solsticeForYear(y);
    if (!r) continue;

    rows.push([
      o.Date,
      o.Time,
      y,
      r.jd.toFixed(6),
      r.raDeg.toFixed(6),
      r.obliqDeg.toFixed(6)
    ]);
    if (++done % YIELD_EVERY === 0) {
      await new Promise(requestAnimationFrame);
    }
  }

  /* C · restore viewer */
  o.Time = oldTime;
  jumpToJulianDay(oldJD);
  o.Run  = oldRun;

  /* D · write file */
  if (done) {
    await ensureSheetJs();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,
        XLSX.utils.aoa_to_sheet(rows), 'Solstice Dates');
    const url = URL.createObjectURL(workbookToBlob(wb));
    Object.assign(document.createElement('a'), {
      href: url,
      download: 'Holistic_solstice_results.xlsx'
    }).click();
    URL.revokeObjectURL(url);
    console.log(`Export finished – ${done} rows`);
  } else {
    console.error('No valid years – nothing written');
  }
}

/* ----------------------------------------------------------------------
   fracDayToTimeStr() helper  (unchanged)
---------------------------------------------------------------------- */
function fracDayToTimeStr(frac) {
  const totalSec = Math.round(frac * 86400);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${String(hh).padStart(2,'0')}:` +
         `${String(mm).padStart(2,'0')}:` +
         `${String(ss).padStart(2,'0')}`;
}

/* ----------------------------------------------------------------------
   Build array of integer years according to the current GUI mode.
---------------------------------------------------------------------- */
function buildYearArray() {

  if (o.solMode === 'List') {
    const raw = document.querySelector('input[data-property="solYearsText"]')
               ?.value || o.solYearsText;
    return (raw.match(/-?\d+/g) || [])          // ['1999','2000', …]
           .map(Number)
           .filter(Number.isFinite);
  }

  /* --- Range mode ---------------------------------------------------- */
  const s = Number(o.solRangeStart);
  const e = Number(o.solRangeEnd);

  if (!Number.isFinite(s) || !Number.isFinite(e)) {
    console.error('Solstice “Range” values must be numbers:', s, e);
    return [];
  }
  const step = s <= e ? 1 : -1;
  const yrs  = [];
  for (let y = s; step > 0 ? y <= e : y >= e; y += step) yrs.push(y);
  return yrs;
}

function buildJdArray () {

  if (o.testMode === 'List') {
    const field = document.querySelector('input[data-property="testJDsText"]');
    const raw   = field ? field.value : o.testJDsText;

    //    ┌─ optional sign ─┐┌──── digits ───┐┌─ optional .fraction ──┐┌ optional exponent ┐
    const numRE = /[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

    return (raw.match(numRE) || [])
           .map(Number)             // Number/parseFloat both keep decimals
           .filter(Number.isFinite);
  }

  /* ── Range mode ────────────────────────────────────────── */
  const s = Number(o.rangeStart);
  const e = Number(o.rangeEnd);
  const n = Math.max(2, Number(o.rangePieces) | 0);   // force integer ≥ 2

  if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(n)) {
    console.error('RA-test “Range” values must be numbers:', s, e, n);
    return [];
  }
  const step = (e - s) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round(s + i * step));
}

/* ────────────────────────────────────────────────────────── */
/*  Helper – do exactly what the “Julian day” GUI field does */
/* ────────────────────────────────────────────────────────── */
function jumpToJulianDay (jd) {
  o.julianDay = jd;

  // replicate the onFinishChange() logic you already have
  o.Day = o.julianDay - startmodelJD;
  o.pos = sDay * o.Day + timeToPos(o.Time);

  const p = dayToDateNew(o.julianDay,'julianday','perihelion-calendar');
  o.perihelionDate = `${p.date}`;

  positionChanged = true; // Signal animation loop to update scene
}

/* Force all the astro calculations that the render loop usually so RA & DEC are up-to-date. */
function forceSceneUpdate () {
  o.Day           = posToDays(o.pos);
  o.Date          = daysToDate(o.Day);
  o.Time          = posToTime(o.pos);
  o.currentYear   = julianDateToDecimalYear(o.julianDay); // Required for updatePredictions & updateAscendingNodes
  trace(o.pos);
  moveModel(o.pos);
  updatePredictions();
  updatePositions();
  updatePerihelion();
  updateAscendingNodes();
  updatePlanetAnomalies();
  updatePlanetInvariablePlaneHeights();
  updateDynamicInclinations();
  updateOrbitOrientations();
  // -- anything else your render loop does that affects .ra/.dec
}

/*  Load SheetJS the first time we need it  */
function ensureSheetJs () {
  return new Promise(res => {
    if (window.XLSX) return res();
    const s = document.createElement('script');
    s.src   = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = res;
    document.head.appendChild(s);
  });
}

/*  Convert workbook → Blob  */
function workbookToBlob (wb) {
  const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });
  return new Blob([wbout], { type:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

async function runRATest() {

  const jds = buildJdArray();
  if (!jds.length) {
    alert('No valid Julian dates — please check your input.');
    return;
  }

  /* headers */
  const earthRows  = [['JD', 'Date', 'Time', 'Year', 'Earth Wobble RA', 'Earth Wobble Dec', 'Earth Wobble Dist Earth', 'Earth Wobble Dist Sun', 'Earth Longitude RA', 'Earth Longitude Dec', 'Earth Longitude Dist Earth', 'Earth Longitude Dist Sun', 'Mid-eccentricity RA', 'Mid-eccentricity Dec', 'Mid-eccentricity Dist Earth', 'Mid-eccentricity Dist Sun']];
  const periRows   = [['JD', 'Date', 'Time', 'Year',
    'Mercury Perihelion', 'Mercury Asc Node', 'Mercury Arg Peri', 'Mercury Asc Node InvPlane', 'Mercury Apparent Incl',
    'Venus Perihelion', 'Venus Asc Node', 'Venus Arg Peri', 'Venus Asc Node InvPlane', 'Venus Apparent Incl',
    'Earth Perihelion', 'Earth Asc Node InvPlane', 'Earth Incl to InvPlane',
    'Mars Perihelion', 'Mars Asc Node', 'Mars Arg Peri', 'Mars Asc Node InvPlane', 'Mars Apparent Incl',
    'Jupiter Perihelion', 'Jupiter Asc Node', 'Jupiter Arg Peri', 'Jupiter Asc Node InvPlane', 'Jupiter Apparent Incl',
    'Saturn Perihelion', 'Saturn Asc Node', 'Saturn Arg Peri', 'Saturn Asc Node InvPlane', 'Saturn Apparent Incl',
    'Uranus Perihelion', 'Uranus Asc Node', 'Uranus Arg Peri', 'Uranus Asc Node InvPlane', 'Uranus Apparent Incl',
    'Neptune Perihelion', 'Neptune Asc Node', 'Neptune Arg Peri', 'Neptune Asc Node InvPlane', 'Neptune Apparent Incl'
  ]];
  //const periRows   = [['JD', 'Date', 'Time', 'Mercury Perihelion', 'Venus Perihelion', 'Earth Perihelion', 'Mars Perihelion', 'Jupiter Perihelion', 'Saturn Perihelion', 'Uranus Perihelion', 'Neptune Perihelion', 'Pluto Perihelion', 'Halleys Perihelion', 'Eros Perihelion']]; 
  const planetRows = [['JD', 'Date', 'Time', 'Year', 'Sun RA', 'Sun Dec', 'Sun Dist Earth', 'Mercury RA', 'Mercury Dec', 'Mercury Dist Earth', 'Mercury Dist Sun', 'Venus RA', 'Venus Dec', 'Venus Dist Earth', 'Venus Dist Sun','Mars RA', 'Mars Dec', 'Mars Dist Earth', 'Mars Dist Sun','Jupiter RA', 'Jupiter Dec', 'Jupiter Dist Earth', 'Jupiter Dist Sun','Saturn RA', 'Saturn Dec', 'Saturn Dist Earth', 'Saturn Dist Sun','Uranus RA', 'Uranus Dec', 'Uranus Dist Earth', 'Uranus Dist Sun','Neptune RA', 'Neptune Dec', 'Neptune Dist Earth', 'Neptune Dist Sun']]; 
  //const planetRows = [['JD', 'Date', 'Time', 'Sun RA', 'Sun Dec', 'Sun Dist Earth', 'Mercury RA', 'Mercury Dec', 'Mercury Dist Earth', 'Mercury Dist Sun', 'Venus RA', 'Venus Dec', 'Venus Dist Earth', 'Venus Dist Sun','Mars RA', 'Mars Dec', 'Mars Dist Earth', 'Mars Dist Sun','Jupiter RA', 'Jupiter Dec', 'Jupiter Dist Earth', 'Jupiter Dist Sun','Saturn RA', 'Saturn Dec', 'Saturn Dist Earth', 'Saturn Dist Sun','Uranus RA', 'Uranus Dec', 'Uranus Dist Earth', 'Uranus Dist Sun','Neptune RA', 'Neptune Dec', 'Neptune Dist Earth', 'Neptune Dist Sun','Pluto RA', 'Pluto Dec', 'Pluto Dist Earth', 'Pluto Dist Sun','Halleys RA', 'Halleys Dec', 'Halleys Dist Earth', 'Halleys Dist Sun', 'Eros RA', 'Eros Dec', 'Eros Dist Earth', 'Eros Dist Sun']]; 

  /* freeze viewer */
  const oldRun = o.Run;
  const oldJD  = o.julianDay;
  const oldTime = o.Time; 
  
  o.Run = false;
  o.Time = '12:00:00';

  for (const jd of jds) {
    jumpToJulianDay(jd);
    forceSceneUpdate();
    
    const date = o.Date
    const time = o.Time

    const earthWobbRA    = (earthWobbleCenter.ra * 180 / Math.PI + 360) % 360;
    const earthWobbDec   = 90-(earthWobbleCenter.dec * 180 / Math.PI);
    const earthWobbDistE = earthWobbleCenter.distAU;
    const earthWobbDistS = earthWobbleCenter.sunDistAU;
    const earthPerRA     = (earthPerihelionFromEarth.ra * 180 / Math.PI + 360) % 360;
    const earthPerDec    = 90-(earthPerihelionFromEarth.dec * 180 / Math.PI);
    const earthPerDistE  = earthPerihelionFromEarth.distAU;
    const earthPerDistS  = earthPerihelionFromEarth.sunDistAU;
    const earthMidRA     = (midEccentricityOrbit.ra   * 180 / Math.PI + 360) % 360;
    const earthMidDec    = 90-(midEccentricityOrbit.dec * 180 / Math.PI);
    const earthMidDistE  = midEccentricityOrbit.distAU;
    const earthMidDistS  = midEccentricityOrbit.sunDistAU;
                            
    const mercuryPer   = o.mercuryPerihelion;
    const mercuryAsc   = o.mercuryAscendingNode;
    const mercuryArg   = o.mercuryArgumentOfPeriapsis;
    const mercuryAscInv = o.mercuryAscendingNodeInvPlane;
    const mercuryAppIncl = o.mercuryApparentInclination;
    const venusPer     = o.venusPerihelion;
    const venusAsc     = o.venusAscendingNode;
    const venusArg     = o.venusArgumentOfPeriapsis;
    const venusAscInv  = o.venusAscendingNodeInvPlane;
    const venusAppIncl = o.venusApparentInclination;
    const earthAscInv  = o.earthAscendingNodeInvPlane;
    const earthIncl    = o.inclinationEarth;
    const marsPer      = o.marsPerihelion;
    const marsAsc      = o.marsAscendingNode;
    const marsArg      = o.marsArgumentOfPeriapsis;
    const marsAscInv   = o.marsAscendingNodeInvPlane;
    const marsAppIncl  = o.marsApparentInclination;
    const jupiterPer   = o.jupiterPerihelion;
    const jupiterAsc   = o.jupiterAscendingNode;
    const jupiterArg   = o.jupiterArgumentOfPeriapsis;
    const jupiterAscInv = o.jupiterAscendingNodeInvPlane;
    const jupiterAppIncl = o.jupiterApparentInclination;
    const saturnPer    = o.saturnPerihelion;
    const saturnAsc    = o.saturnAscendingNode;
    const saturnArg    = o.saturnArgumentOfPeriapsis;
    const saturnAscInv = o.saturnAscendingNodeInvPlane;
    const saturnAppIncl = o.saturnApparentInclination;
    const uranusPer    = o.uranusPerihelion;
    const uranusAsc    = o.uranusAscendingNode;
    const uranusArg    = o.uranusArgumentOfPeriapsis;
    const uranusAscInv = o.uranusAscendingNodeInvPlane;
    const uranusAppIncl = o.uranusApparentInclination;
    const neptunePer   = o.neptunePerihelion;
    const neptuneAsc   = o.neptuneAscendingNode;
    const neptuneArg   = o.neptuneArgumentOfPeriapsis;
    const neptuneAscInv = o.neptuneAscendingNodeInvPlane;
    const neptuneAppIncl = o.neptuneApparentInclination;
    const plutoPer     = o.plutoPerihelion;
    const halleysPer   = o.halleysPerihelion;
    const erosPer      = o.erosPerihelion;
    
    const sunRA         = (sun.ra   * 180 / Math.PI + 360) % 360;
    const sunDec        = 90-(sun.dec * 180 / Math.PI);
    const sunDistE      = sun.distAU;
    
    const mercuryRA     = (mercury.ra   * 180 / Math.PI + 360) % 360;
    const mercuryDec    = 90-(mercury.dec * 180 / Math.PI);
    const mercuryDistE  = mercury.distAU;
    const mercuryDistS  = mercury.sunDistAU;
    const venusRA       = (venus.ra   * 180 / Math.PI + 360) % 360;
    const venusDec      = 90-(venus.dec * 180 / Math.PI);
    const venusDistE    = venus.distAU;
    const venusDistS    = venus.sunDistAU;
    const marsRA        = (mars.ra   * 180 / Math.PI + 360) % 360;
    const marsDec       = 90-(mars.dec * 180 / Math.PI);
    const marsDistE     = mars.distAU;
    const marsDistS     = mars.sunDistAU;
    const jupiterRA     = (jupiter.ra   * 180 / Math.PI + 360) % 360;
    const jupiterDec    = 90-(jupiter.dec * 180 / Math.PI);
    const jupiterDistE  = jupiter.distAU;
    const jupiterDistS  = jupiter.sunDistAU;
    const saturnRA      = (saturn.ra   * 180 / Math.PI + 360) % 360;
    const saturnDec     = 90-(saturn.dec * 180 / Math.PI);
    const saturnDistE   = saturn.distAU;
    const saturnDistS   = saturn.sunDistAU;
    const uranusRA      = (uranus.ra   * 180 / Math.PI + 360) % 360;
    const uranusDec     = 90-(uranus.dec * 180 / Math.PI);
    const uranusDistE   = uranus.distAU;
    const uranusDistS   = uranus.sunDistAU;
    const neptuneRA     = (neptune.ra   * 180 / Math.PI + 360) % 360;
    const neptuneDec    = 90-(neptune.dec * 180 / Math.PI);
    const neptuneDistE  = neptune.distAU;
    const neptuneDistS  = neptune.sunDistAU;
    const plutoRA       = (pluto.ra   * 180 / Math.PI + 360) % 360;
    const plutoDec      = 90-(pluto.dec * 180 / Math.PI);
    const plutoDistE    = pluto.distAU;
    const plutoDistS    = pluto.sunDistAU;
    const halleysRA     = (halleys.ra   * 180 / Math.PI + 360) % 360;
    const halleysDec    = 90-(halleys.dec * 180 / Math.PI);
    const halleysDistE  = halleys.distAU;
    const halleysDistS  = halleys.sunDistAU;
    const erosRA        = (eros.ra   * 180 / Math.PI + 360) % 360;
    const erosDec       = 90-(eros.dec * 180 / Math.PI);
    const erosDistE     = eros.distAU;
    const erosDistS     = eros.sunDistAU;
        
        const year = Math.floor(o.currentYear);
        earthRows.push([jd, date, time, year, earthWobbRA.toFixed(6), earthWobbDec.toFixed(6), earthWobbDistE.toFixed(8), earthWobbDistS.toFixed(8), earthPerRA.toFixed(6), earthPerDec.toFixed(6), earthPerDistE.toFixed(8), earthPerDistS.toFixed(8), earthMidRA.toFixed(6), earthMidDec.toFixed(6), earthMidDistE.toFixed(8), earthMidDistS.toFixed(8)]);
    
//    periRows.push([jd, date, time, mercuryPer.toFixed(6), venusPer.toFixed(6), earthPerRA.toFixed(6), marsPer.toFixed(6), jupiterPer.toFixed(6), saturnPer.toFixed(6), uranusPer.toFixed(6), neptunePer.toFixed(6), plutoPer.toFixed(6), halleysPer.toFixed(6), erosPer.toFixed(6)]);

        periRows.push([jd, date, time, year,
          mercuryPer.toFixed(6), mercuryAsc.toFixed(6), mercuryArg.toFixed(6), mercuryAscInv.toFixed(6), mercuryAppIncl.toFixed(6),
          venusPer.toFixed(6), venusAsc.toFixed(6), venusArg.toFixed(6), venusAscInv.toFixed(6), venusAppIncl.toFixed(6),
          earthPerRA.toFixed(6), earthAscInv.toFixed(6), earthIncl.toFixed(6),
          marsPer.toFixed(6), marsAsc.toFixed(6), marsArg.toFixed(6), marsAscInv.toFixed(6), marsAppIncl.toFixed(6),
          jupiterPer.toFixed(6), jupiterAsc.toFixed(6), jupiterArg.toFixed(6), jupiterAscInv.toFixed(6), jupiterAppIncl.toFixed(6),
          saturnPer.toFixed(6), saturnAsc.toFixed(6), saturnArg.toFixed(6), saturnAscInv.toFixed(6), saturnAppIncl.toFixed(6),
          uranusPer.toFixed(6), uranusAsc.toFixed(6), uranusArg.toFixed(6), uranusAscInv.toFixed(6), uranusAppIncl.toFixed(6),
          neptunePer.toFixed(6), neptuneAsc.toFixed(6), neptuneArg.toFixed(6), neptuneAscInv.toFixed(6), neptuneAppIncl.toFixed(6)
        ]);
    
//    planetRows.push([jd, date, time, sunRA.toFixed(6), sunDec.toFixed(6), sunDistE.toFixed(6), mercuryRA.toFixed(6), mercuryDec.toFixed(6), mercuryDistE.toFixed(6), mercuryDistS.toFixed(6), venusRA.toFixed(6),  venusDec.toFixed(6), venusDistE.toFixed(6), venusDistS.toFixed(6), marsRA.toFixed(6), marsDec.toFixed(6), marsDistE.toFixed(6), marsDistS.toFixed(6), jupiterRA.toFixed(6), jupiterDec.toFixed(6), jupiterDistE.toFixed(6), jupiterDistS.toFixed(6), saturnRA.toFixed(6), saturnDec.toFixed(6),  saturnDistE.toFixed(6), saturnDistS.toFixed(6), uranusRA.toFixed(6), uranusDec.toFixed(6), uranusDistE.toFixed(6), uranusDistS.toFixed(6), neptuneRA.toFixed(6), neptuneDec.toFixed(6), neptuneDistE.toFixed(6), neptuneDistS.toFixed(6), plutoRA.toFixed(6), plutoDec.toFixed(6), plutoDistE.toFixed(6), plutoDistS.toFixed(6), halleysRA.toFixed(6), halleysDec.toFixed(6), halleysDistE.toFixed(6), halleysDistS.toFixed(6), erosRA.toFixed(6), erosDec.toFixed(6), erosDistE.toFixed(6), erosDistS.toFixed(6)]);
    
        planetRows.push([jd, date, time, year, sunRA.toFixed(6), sunDec.toFixed(6), sunDistE.toFixed(6), mercuryRA.toFixed(6), mercuryDec.toFixed(6), mercuryDistE.toFixed(6), mercuryDistS.toFixed(6), venusRA.toFixed(6),  venusDec.toFixed(6), venusDistE.toFixed(6), venusDistS.toFixed(6), marsRA.toFixed(6), marsDec.toFixed(6), marsDistE.toFixed(6), marsDistS.toFixed(6), jupiterRA.toFixed(6), jupiterDec.toFixed(6), jupiterDistE.toFixed(6), jupiterDistS.toFixed(6), saturnRA.toFixed(6), saturnDec.toFixed(6),  saturnDistE.toFixed(6), saturnDistS.toFixed(6), uranusRA.toFixed(6), uranusDec.toFixed(6), uranusDistE.toFixed(6), uranusDistS.toFixed(6), neptuneRA.toFixed(6), neptuneDec.toFixed(6), neptuneDistE.toFixed(6), neptuneDistS.toFixed(6)]);
    
  }

  /* restore viewer */
  o.Time = oldTime; 
  jumpToJulianDay(oldJD);
  o.Run = oldRun;
  

  /* build & download XLSX */
  await ensureSheetJs();                   // load SheetJS if needed
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet(earthRows),  'Earth Longitude');
  XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet(periRows),   'Perihelion Planets');
  XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet(planetRows), 'Sun & Planets');

  const wbBlob = workbookToBlob(wb);
  const url    = URL.createObjectURL(wbBlob);
  Object.assign(document.createElement('a'),
    { href: url, download: 'Holistic_objects_results.xlsx' }).click();
  URL.revokeObjectURL(url);
}

// ================================================================
// PLANET POSITION REPORT - Step 5 of Planet Hierarchy Inspector
// ================================================================

/**
 * Convert RA in radians to HMS format string (matches radiansToRa but with more precision)
 */
function raToHMSFromRadians(rad) {
  if (rad < 0) rad += 2 * Math.PI;
  const totalHours = rad * 12 / Math.PI;
  const h = Math.floor(totalHours);
  const mFloat = (totalHours - h) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toFixed(2).padStart(5, '0')}s`;
}

/**
 * Convert RA in decimal hours (e.g., 7.682) to HMS format string
 */
function raDecimalHoursToHMS(decimalHours) {
  const totalHours = parseFloat(decimalHours);
  if (isNaN(totalHours)) return decimalHours;
  const h = Math.floor(totalHours);
  const mFloat = (totalHours - h) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toFixed(2).padStart(5, '0')}s`;
}

/**
 * Convert Dec from decimal degrees (e.g., 18.8969 or -23.5) to DMS format string
 */
function decDecimalDegreesToDMS(decimalDegrees) {
  const deg = parseFloat(decimalDegrees);
  if (isNaN(deg)) return decimalDegrees;

  const sign = deg < 0 ? '-' : '+';
  const absDeg = Math.abs(deg);

  const d = Math.floor(absDeg);
  const mFloat = (absDeg - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${sign}${d}° ${m.toString().padStart(2, '0')}' ${s.toFixed(1).padStart(4, '0')}"`;
}

/**
 * Convert Dec in radians (spherical phi) to DMS format string (matches radiansToDec but with more precision)
 */
function decToDMSFromRadians(rad) {
  // Convert spherical phi to standard declination (0 at equator, ±90 at poles)
  rad = (rad <= 0) ? rad + Math.PI / 2 : Math.PI / 2 - rad;
  let degDec = rad * 180 / Math.PI;

  const sign = degDec < 0 ? '-' : '+';
  degDec = Math.abs(degDec);

  const d = Math.floor(degDec);
  const mFloat = (degDec - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${sign}${d}° ${m.toString().padStart(2, '0')}' ${s.toFixed(1).padStart(4, '0')}"`;
}

/**
 * Convert Julian Day to calendar date string
 */
function jdToDateString(jd) {
  // Julian Day to calendar date conversion
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;

  // Time from fractional day
  const totalHours = f * 24;
  const hours = Math.floor(totalHours);
  const mins = Math.floor((totalHours - hours) * 60);
  const secs = Math.floor(((totalHours - hours) * 60 - mins) * 60);

  return {
    date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
    time: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  };
}

/**
 * Collect position and longitude data for a specific planet at current simulation state
 */
function collectPlanetDataForDate(planetKey, testDate) {
  const planet = PLANET_OBJECTS[planetKey]();
  const dateInfo = jdToDateString(testDate.jd);

  // Position data - store raw radians for proper conversion
  const planetRARad = planet.ra;
  const planetDecRad = planet.dec;
  const planetDistE = planet.distAU;
  const planetDistS = planet.sunDistAU;
  const sunRARad = sun.ra;
  const sunDecRad = sun.dec;
  const sunDistE = sun.distAU;

  // Reference values from test date (if provided, for position types)
  const refDec = testDate.dec || '';
  const refRA = testDate.ra;  // Reference RA in decimal hours (e.g., 7.682)
  const refLongitude = testDate.longitude;  // Reference longitude in degrees (for Occultation)
  const comparePlanet = testDate.comparePlanet;  // Companion planet key (for Occultation)

  // Longitude data from o object
  const longPeriCalc = o[`${planetKey}Perihelion`];
  const longPeriRef = LONGITUDE_PERIHELION_REFS[planetKey];
  const ascNodeCalc = o[`${planetKey}AscendingNode`];
  const ascNodeRef = ASCENDING_NODE_REFS[planetKey];
  const argPeriCalc = o[`${planetKey}ArgumentOfPeriapsis`];

  return {
    dateInfo,
    position: {
      planetRARad,
      planetDecRad,
      planetDistE,
      planetDistS,
      sunRARad,
      sunDecRad,
      sunDistE,
      refDec,
      refRA,
      refLongitude,
      comparePlanet
    },
    longitude: {
      longPeriCalc,
      longPeriRef,
      longPeriDiff: longPeriCalc - longPeriRef,
      ascNodeCalc,
      ascNodeRef,
      ascNodeDiff: ascNodeCalc - ascNodeRef,
      argPeriCalc,
      argPeriDerived: ((longPeriCalc - ascNodeCalc) % 360 + 360) % 360
    },
    positionRow: (() => {
      // Get companion planet data if comparePlanet is specified
      let companionRA = '';
      let companionDec = '';
      if (comparePlanet && PLANET_OBJECTS[comparePlanet]) {
        const companion = PLANET_OBJECTS[comparePlanet]();
        companionRA = raToHMSFromRadians(companion.ra);
        companionDec = decToDMSFromRadians(companion.dec);
      }

      // Format reference RA (from decimal hours if provided)
      const refRAFormatted = refRA ? raDecimalHoursToHMS(refRA) : '';

      // Format reference longitude-derived RA (if longitude provided)
      const refLongitudeRA = refLongitude ? longitudeToRAHMS(refLongitude) : '';

      return [
        String(testDate.jd),  // Force as string to avoid comma/dot issues
        dateInfo.date,
        dateInfo.time,
        testDate.label,
        raToHMSFromRadians(planetRARad),
        decToDMSFromRadians(planetDecRad),
        refRAFormatted || refLongitudeRA,  // Reference RA (from ra field or longitude)
        refDec,  // Reference Dec (empty if not provided)
        refLongitude || '',  // Reference Longitude
        comparePlanet || '',  // Compare Planet
        companionRA,  // Companion RA
        companionDec,  // Companion Dec
        planetDistE.toFixed(8),
        planetDistS.toFixed(8),
        raToHMSFromRadians(sunRARad),
        decToDMSFromRadians(sunDecRad),
        sunDistE.toFixed(8)
      ];
    })(),
    longitudeRow: [
      String(testDate.jd),  // Force as string to avoid comma/dot issues
      dateInfo.date,
      dateInfo.time,
      testDate.label,
      longPeriCalc.toFixed(6),
      longPeriRef.toFixed(6),
      (longPeriCalc - longPeriRef).toFixed(6),
      ascNodeCalc.toFixed(6),
      ascNodeRef.toFixed(6),
      (ascNodeCalc - ascNodeRef).toFixed(6),
      argPeriCalc.toFixed(6)
    ]
  };
}

/**
 * Build the report header for screen display
 */
function buildReportHeader(planetKey) {
  const planetLabel = PLANET_HIERARCHIES[planetKey]?.label || planetKey;
  return `POSITION REPORT: ${planetLabel}\n${'='.repeat(50)}\n\n`;
}

/**
 * Compare calculated Dec with reference Dec and determine match status
 * Returns: 'match' if within 1 degree, 'mismatch' otherwise, or 'none' if no reference
 */
function compareDecValues(calculatedDecRad, refDecStr) {
  if (!refDecStr) return 'none';

  // Convert calculated Dec from radians to degrees (same as decToDMSFromRadians)
  let rad = calculatedDecRad;
  rad = (rad <= 0) ? rad + Math.PI / 2 : Math.PI / 2 - rad;
  const calculatedDeg = rad * 180 / Math.PI;

  // Parse reference Dec (it's in decimal degrees as a string like "-14.68" or "15.61")
  const refDeg = parseFloat(refDecStr);

  if (isNaN(refDeg)) return 'none';

  // Compare - within 1 degree is a match
  const diff = Math.abs(calculatedDeg - refDeg);
  return diff <= 1.0 ? 'match' : 'mismatch';
}

/**
 * Compare Planet RA vs Sun RA (for NASA transit dates)
 * Returns: 'green' if within 5 minutes, 'amber' if 5-15 minutes, 'red' if > 15 minutes
 */
function compareRAToSun(planetRARad, sunRARad) {
  // Convert both to total minutes (0-1440 for 24 hours)
  let planetMinutes = (planetRARad * 12 / Math.PI) * 60;
  let sunMinutes = (sunRARad * 12 / Math.PI) * 60;

  // Normalize to 0-1440 range
  if (planetMinutes < 0) planetMinutes += 1440;
  if (sunMinutes < 0) sunMinutes += 1440;

  // Calculate difference in minutes, accounting for wrap-around at 24h
  let diffMinutes = Math.abs(planetMinutes - sunMinutes);
  if (diffMinutes > 720) diffMinutes = 1440 - diffMinutes;

  // Return status based on thresholds
  if (diffMinutes <= 5) return 'green';
  if (diffMinutes <= 15) return 'amber';
  return 'red';
}

/**
 * Compare Planet RA vs Sun RA for Opposition (should be 12 hours / 720 minutes apart)
 * Returns: 'green' if within 5 minutes of 12h, 'amber' if 5-15 minutes, 'red' if > 15 minutes
 */
function compareRAOpposition(planetRARad, sunRARad) {
  // Convert both to total minutes (0-1440 for 24 hours)
  let planetMinutes = (planetRARad * 12 / Math.PI) * 60;
  let sunMinutes = (sunRARad * 12 / Math.PI) * 60;

  // Normalize to 0-1440 range
  if (planetMinutes < 0) planetMinutes += 1440;
  if (sunMinutes < 0) sunMinutes += 1440;

  // Calculate difference in minutes, accounting for wrap-around at 24h
  let diffMinutes = Math.abs(planetMinutes - sunMinutes);
  if (diffMinutes > 720) diffMinutes = 1440 - diffMinutes;

  // For opposition, we expect 720 minutes (12 hours) difference
  // Calculate how far from 720 minutes we are
  const deviationFromOpposition = Math.abs(diffMinutes - 720);

  // Return status based on thresholds (deviation from perfect 12h opposition)
  if (deviationFromOpposition <= 5) return 'green';
  if (deviationFromOpposition <= 15) return 'amber';
  return 'red';
}

/**
 * Compare Planet RA vs Reference RA (for model validation dates)
 * refRA is in decimal hours (e.g., 7.682 for ~7h 40m)
 * Returns: 'green' if within 5 minutes, 'amber' if 5-15 minutes, 'red' if > 15 minutes, 'none' if no reference
 */
function compareRAToReference(planetRARad, refRA) {
  if (refRA === undefined || refRA === null) return 'none';

  // Convert planet RA from radians to minutes
  let planetMinutes = (planetRARad * 12 / Math.PI) * 60;
  if (planetMinutes < 0) planetMinutes += 1440;

  // Convert reference RA from decimal hours to minutes
  let refMinutes = parseFloat(refRA) * 60;
  if (isNaN(refMinutes)) return 'none';
  if (refMinutes < 0) refMinutes += 1440;

  // Calculate difference in minutes, accounting for wrap-around at 24h
  let diffMinutes = Math.abs(planetMinutes - refMinutes);
  if (diffMinutes > 720) diffMinutes = 1440 - diffMinutes;

  // Return status based on thresholds
  if (diffMinutes <= 5) return 'green';
  if (diffMinutes <= 15) return 'amber';
  return 'red';
}

/**
 * Convert ecliptic longitude (degrees) to RA (radians)
 * Uses proper ecliptic-to-equatorial coordinate transformation
 * Assumes ecliptic latitude ≈ 0 (appropriate for Jupiter-Saturn conjunctions near the ecliptic)
 * @param {number|string} longitudeDeg - Ecliptic longitude in degrees
 * @param {number} obliquityDeg - Obliquity of the ecliptic in degrees (defaults to o.obliquityEarth)
 */
function longitudeToRARad(longitudeDeg, obliquityDeg) {
  const lon = parseFloat(longitudeDeg);
  if (isNaN(lon)) return null;

  // Use provided obliquity or get from global o object
  const obliquity = obliquityDeg !== undefined ? obliquityDeg : (o.obliquityEarth || 23.4393);
  const obliquityRad = obliquity * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;

  // For a point on the ecliptic (ecliptic latitude = 0):
  // tan(RA) = sin(λ) * cos(ε) / cos(λ)
  // RA = atan2(sin(λ) * cos(ε), cos(λ))
  let raRad = Math.atan2(Math.sin(lonRad) * Math.cos(obliquityRad), Math.cos(lonRad));

  // Normalize to [0, 2π)
  if (raRad < 0) raRad += 2 * Math.PI;
  return raRad;
}

/**
 * Convert ecliptic longitude (degrees) to RA in HMS format string
 * Uses proper ecliptic-to-equatorial coordinate transformation
 * @param {number|string} longitudeDeg - Ecliptic longitude in degrees
 * @param {number} obliquityDeg - Obliquity of the ecliptic in degrees (defaults to o.obliquityEarth)
 */
function longitudeToRAHMS(longitudeDeg, obliquityDeg) {
  const lon = parseFloat(longitudeDeg);
  if (isNaN(lon)) return longitudeDeg;

  // Use provided obliquity or get from global o object
  const obliquity = obliquityDeg !== undefined ? obliquityDeg : (o.obliquityEarth || 23.4393);
  const obliquityRad = obliquity * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;

  // For a point on the ecliptic (ecliptic latitude = 0):
  // RA = atan2(sin(λ) * cos(ε), cos(λ))
  let raRad = Math.atan2(Math.sin(lonRad) * Math.cos(obliquityRad), Math.cos(lonRad));
  if (raRad < 0) raRad += 2 * Math.PI;

  // Convert radians to decimal hours (RA in hours = radians * 12 / π)
  const decimalHours = raRad * 12 / Math.PI;
  const h = Math.floor(decimalHours);
  const mFloat = (decimalHours - h) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toFixed(2).padStart(5, '0')}s`;
}

/**
 * Compare Planet RA vs Longitude-derived RA (for Occultation dates)
 * Uses proper ecliptic-to-equatorial coordinate transformation
 * @param {number} planetRARad - Planet RA in radians
 * @param {number|string} longitudeDeg - Ecliptic longitude in degrees (e.g., 55.77)
 * @param {number} obliquityDeg - Obliquity of the ecliptic in degrees (defaults to o.obliquityEarth)
 * @returns {'green'|'amber'|'red'|'none'} - Status based on difference thresholds
 */
function compareRAToLongitude(planetRARad, longitudeDeg, obliquityDeg) {
  if (longitudeDeg === undefined || longitudeDeg === null) return 'none';

  // Convert planet RA from radians to minutes
  let planetMinutes = (planetRARad * 12 / Math.PI) * 60;
  if (planetMinutes < 0) planetMinutes += 1440;

  // Convert ecliptic longitude to RA using proper transformation
  const refRARad = longitudeToRARad(longitudeDeg, obliquityDeg);
  if (refRARad === null) return 'none';

  // Convert reference RA to minutes
  let refMinutes = (refRARad * 12 / Math.PI) * 60;
  if (refMinutes < 0) refMinutes += 1440;

  // Calculate difference in minutes, accounting for wrap-around at 24h
  let diffMinutes = Math.abs(planetMinutes - refMinutes);
  if (diffMinutes > 720) diffMinutes = 1440 - diffMinutes;

  // Return status based on thresholds
  if (diffMinutes <= 5) return 'green';
  if (diffMinutes <= 15) return 'amber';
  return 'red';
}

/**
 * Get companion planet RA for Occultation comparison
 * Returns the RA in radians of the specified planet at current simulation state
 */
function getCompanionPlanetRA(companionKey) {
  const planetGetter = PLANET_OBJECTS[companionKey];
  if (!planetGetter) return null;
  const planet = planetGetter();
  return planet.ra;
}

/**
 * Build a date section for screen display (HTML format with color coding)
 */
function buildDateSection(planetKey, testDate, data) {
  const planetLabel = PLANET_HIERARCHIES[planetKey]?.label || planetKey;
  let section = '';

  // Use ASCII box drawing for consistent width across all fonts
  const W = 48; // content width
  const HR = '-'.repeat(W); // horizontal rule

  section += `+${HR}+\n`;
  section += `|  ${testDate.label.padEnd(W - 2)}|\n`;
  section += `|  JD: ${testDate.jd}  |  ${data.dateInfo.date} ${data.dateInfo.time}`.padEnd(W + 1) + `|\n`;
  section += `+${HR}+\n`;

  // Position data
  if (testDate.type === 'position' || testDate.type === 'both') {
    // Determine comparison mode based on label and comparePlanet field
    const isNasaDate = testDate.label.toLowerCase().includes('nasa');
    const isOpposition = testDate.label.toLowerCase().includes('opposition');
    const isOccultation = !!data.position.comparePlanet;  // Has companion planet to compare

    // Helper to get color from status
    const getColorFromStatus = (status) => {
      if (status === 'green') return '#4caf50';
      if (status === 'amber') return '#ffb300';
      if (status === 'red') return '#ff5252';
      return '#e8e8e8'; // 'none' - no reference, use default white
    };

    section += `|  POSITION DATA`.padEnd(W + 1) + `|\n`;
    section += `|  ${'-'.repeat(W - 4)}  |\n`;

    if (isOccultation) {
      // Occultation: Compare both planets against reference longitude-derived RA
      const refLongitude = data.position.refLongitude;
      const companionKey = data.position.comparePlanet;
      const companionLabel = PLANET_HIERARCHIES[companionKey]?.label || companionKey;
      const companionRARad = getCompanionPlanetRA(companionKey);

      // Compare current planet RA to longitude reference (only if longitude provided)
      const planetRAStatus = refLongitude != null ? compareRAToLongitude(data.position.planetRARad, refLongitude) : 'none';
      const planetRAColor = getColorFromStatus(planetRAStatus);

      // Compare companion planet RA to longitude reference (only if longitude provided)
      const companionRAStatus = refLongitude != null ? compareRAToLongitude(companionRARad, refLongitude) : 'none';
      const companionRAColor = getColorFromStatus(companionRAStatus);

      // Reference RA from longitude (only show if longitude provided)
      if (refLongitude != null) {
        const refRAValue = longitudeToRAHMS(refLongitude);
        const refRAContent = 'Reference RA:'.padEnd(24) + refRAValue.padStart(22);
        section += `|  ${refRAContent}|\n`;

        // Show longitude value
        const longContent = `(from longitude ${refLongitude}°)`.padEnd(46);
        section += `|  ${longContent}|\n`;

        section += `|  ${'-'.repeat(W - 4)}  |\n`;
      }

      // Current planet RA (color-coded)
      const planetRAValue = raToHMSFromRadians(data.position.planetRARad);
      const planetRAContentLine = `${planetLabel} RA:`.padEnd(24) + planetRAValue.padStart(22);
      section += `|  <span style="color:${planetRAColor}">${planetRAContentLine}</span>|\n`;

      // Current planet Dec
      const decValue = decToDMSFromRadians(data.position.planetDecRad);
      section += `|  ${(`${planetLabel} Dec:`.padEnd(24) + decValue.padStart(22))}|\n`;

      section += `|  ${'-'.repeat(W - 4)}  |\n`;

      // Companion planet RA (color-coded independently)
      const companionRAValue = raToHMSFromRadians(companionRARad);
      const companionRAContentLine = `${companionLabel} RA:`.padEnd(24) + companionRAValue.padStart(22);
      section += `|  <span style="color:${companionRAColor}">${companionRAContentLine}</span>|\n`;

      // Companion planet Dec
      const companionPlanet = PLANET_OBJECTS[companionKey]();
      const companionDecValue = decToDMSFromRadians(companionPlanet.dec);
      section += `|  ${(`${companionLabel} Dec:`.padEnd(24) + companionDecValue.padStart(22))}|\n`;

    } else {
      // Standard comparison (NASA, Opposition, Model start date, etc.)
      let raStatus;
      if (isOpposition) {
        // Opposition dates: Planet RA should be ~12h away from Sun RA
        raStatus = compareRAOpposition(data.position.planetRARad, data.position.sunRARad);
      } else if (isNasaDate) {
        // NASA dates: compare Planet RA vs Sun RA (transit check)
        raStatus = compareRAToSun(data.position.planetRARad, data.position.sunRARad);
      } else {
        // Other dates (e.g., Model start date): compare Planet RA vs Reference RA
        raStatus = compareRAToReference(data.position.planetRARad, data.position.refRA);
      }

      const raColor = getColorFromStatus(raStatus);

      // Color-coded Planet RA
      const planetRAValue = raToHMSFromRadians(data.position.planetRARad);
      const planetRAContent = `${planetLabel} RA:`.padEnd(24) + planetRAValue.padStart(22);
      section += `|  <span style="color:${raColor}">${planetRAContent}</span>|\n`;

      // Show reference RA if provided (for non-NASA dates) - same color as Planet RA
      if (!isNasaDate && !isOpposition && data.position.refRA) {
        const refRAValue = raDecimalHoursToHMS(data.position.refRA);
        const refRAContent = 'Reference RA:'.padEnd(24) + refRAValue.padStart(22);
        section += `|  <span style="color:${raColor}">${refRAContent}</span>|\n`;
      }

      // Dec line (no color coding)
      const decValue = decToDMSFromRadians(data.position.planetDecRad);
      section += `|  ${(`${planetLabel} Dec:`.padEnd(24) + decValue.padStart(22))}|\n`;

      // Show reference Dec if provided (no color coding)
      if (data.position.refDec) {
        const refDecValue = decDecimalDegreesToDMS(data.position.refDec);
        section += `|  ${('Reference Dec:'.padEnd(24) + refDecValue.padStart(22))}|\n`;
      }
      section += `|  ${(`${planetLabel} Dist Earth:`.padEnd(24) + (data.position.planetDistE.toFixed(6) + ' AU').padStart(22))}|\n`;
      section += `|  ${(`${planetLabel} Dist Sun:`.padEnd(24) + (data.position.planetDistS.toFixed(6) + ' AU').padStart(22))}|\n`;

      // Show Sun data for NASA dates (transit) and Opposition dates
      if (isNasaDate || isOpposition) {
        section += `|  ${'-'.repeat(W - 4)}  |\n`;

        // Color-coded Sun RA (same color as Planet RA since they're being compared)
        const sunRAValue = raToHMSFromRadians(data.position.sunRARad);
        const sunRAContent = 'Sun RA:'.padEnd(24) + sunRAValue.padStart(22);
        section += `|  <span style="color:${raColor}">${sunRAContent}</span>|\n`;

        section += `|  ${('Sun Dec:'.padEnd(24) + decToDMSFromRadians(data.position.sunDecRad).padStart(22))}|\n`;
        section += `|  ${('Sun Dist Earth:'.padEnd(24) + (data.position.sunDistE.toFixed(6) + ' AU').padStart(22))}|\n`;
      }
    }
  }

  // Longitude data
  if (testDate.type === 'longitude' || testDate.type === 'both') {
    if (testDate.type === 'both') {
      section += `+${HR}+\n`;
    }
    section += `|  LONGITUDE DATA`.padEnd(W + 1) + `|\n`;
    section += `|  ${'-'.repeat(W - 4)}  |\n`;
    section += `|  Longitude of Perihelion (ϖ)`.padEnd(W + 1) + `|\n`;
    section += `|  ${('  Calculated:'.padEnd(24) + (data.longitude.longPeriCalc.toFixed(6) + '°').padStart(22))}|\n`;
    section += `|  ${('  Reference:'.padEnd(24) + (data.longitude.longPeriRef.toFixed(6) + '°').padStart(22))}|\n`;
    section += `|  ${('  Difference:'.padEnd(24) + (data.longitude.longPeriDiff.toFixed(6) + '°').padStart(22))}|\n`;
    section += `|  ${'-'.repeat(W - 4)}  |\n`;
    section += `|  Longitude of Ascending Node (Ω)`.padEnd(W + 1) + `|\n`;
    section += `|  ${('  Calculated:'.padEnd(24) + (data.longitude.ascNodeCalc.toFixed(6) + '°').padStart(22))}|\n`;
    section += `|  ${('  Reference:'.padEnd(24) + (data.longitude.ascNodeRef.toFixed(6) + '°').padStart(22))}|\n`;
    section += `|  ${('  Difference:'.padEnd(24) + (data.longitude.ascNodeDiff.toFixed(6) + '°').padStart(22))}|\n`;
    section += `|  ${'-'.repeat(W - 4)}  |\n`;
    section += `|  Argument of Periapsis (ω)`.padEnd(W + 1) + `|\n`;
    section += `|  ${('  Calculated:'.padEnd(24) + (data.longitude.argPeriCalc.toFixed(6) + '°').padStart(22))}|\n`;
    section += `|  ${('  (ϖ - Ω):'.padEnd(24) + (data.longitude.argPeriDerived.toFixed(6) + '°').padStart(22))}|\n`;
  }

  section += `+${HR}+\n\n`;
  return section;
}

/**
 * Generate the planet position report for Step 5
 * @param {string} planetKey - The planet identifier
 * @param {boolean} showAll - If true, show all results regardless of showOnScreen flag
 */
async function generatePlanetReport(planetKey, showAll = false) {
  const testDates = PLANET_TEST_DATES[planetKey];
  if (!testDates || testDates.length === 0) {
    return { screenReport: 'No test dates configured for this planet.', excelData: null };
  }

  // Save current state
  const savedState = {
    run: o.Run,
    julianDay: o.julianDay,
    time: o.Time,
    pos: o.pos
  };

  o.Run = false;

  let screenReport = buildReportHeader(planetKey);
  const positionRows = [[
    'JD', 'Date', 'Time', 'Label',
    'Planet RA', 'Planet Dec',
    'Reference RA', 'Reference Dec', 'Reference Longitude',
    'Compare Planet', 'Companion RA', 'Companion Dec',
    'Planet Dist Earth (AU)', 'Planet Dist Sun (AU)',
    'Sun RA', 'Sun Dec', 'Sun Dist Earth (AU)'
  ]];
  const longitudeRows = [['JD', 'Date', 'Time', 'Label', 'Long Perihelion Calc (°)', 'Long Perihelion Ref (°)', 'Long Perihelion Diff (°)', 'Asc Node Calc (°)', 'Asc Node Ref (°)', 'Asc Node Diff (°)', 'Arg Periapsis Calc (°)']];

  // Process each test date
  for (const testDate of testDates) {
    jumpToJulianDay(testDate.jd);
    forceSceneUpdate();

    const data = collectPlanetDataForDate(planetKey, testDate);

    // Always add to Excel data
    if (testDate.type === 'position' || testDate.type === 'both') {
      positionRows.push(data.positionRow);
    }
    if (testDate.type === 'longitude' || testDate.type === 'both') {
      longitudeRows.push(data.longitudeRow);
    }

    // Add to screen report if showOnScreen is true OR showAll is enabled
    if (testDate.showOnScreen || showAll) {
      screenReport += buildDateSection(planetKey, testDate, data);
    }
  }

  // Restore state
  o.Run = savedState.run;
  jumpToJulianDay(savedState.julianDay);
  o.Time = savedState.time;
  o.pos = savedState.pos;
  forceSceneUpdate();

  return {
    screenReport,
    excelData: { positionRows, longitudeRows }
  };
}

/**
 * Export planet report to Excel file
 */
async function exportPlanetReportToExcel(planetKey, excelData) {
  await ensureSheetJs();

  const planetLabel = PLANET_HIERARCHIES[planetKey]?.label || planetKey;
  const wb = XLSX.utils.book_new();

  // Create Documentation front sheet
  const docRows = [
    ['PLANET POSITION REPORT - DOCUMENTATION'],
    [''],
    ['Planet:', planetLabel],
    ['Generated:', new Date().toISOString()],
    ['Model Start Date:', 'JD 2451716.5 (June 21, 2000 00:00 UTC)'],
    [''],
    ['DATA SOURCES'],
    ['─'.repeat(60)],
    ['Mercury transits:', 'https://eclipse.gsfc.nasa.gov/transit/catalog/MercuryCatalog.html (NASA GSFC)'],
    ['Venus transits:', 'https://eclipse.gsfc.nasa.gov/transit/catalog/VenusCatalog.html (NASA GSFC)'],
    ['Mars oppositions:', 'https://stjerneskinn.com/mars-at-opposition.htm (Jean Meeus tables)'],
    ['', 'https://www.nakedeyeplanets.com/mars-oppositions.htm'],
    ['Jupiter/Saturn conjunctions:', 'https://astropixels.com/ephemeris/planets/jupiter2020.html (JPL DE405)'],
    ['', 'https://www.astropro.com/features/tables/geo/ju-sa/ju000sa.html'],
    ['Mutual planetary occultations:', 'https://en.wikipedia.org/wiki/List_of_mutual_planetary_eclipses'],
    ['', 'https://www.projectpluto.com/mut_pln.htm'],
    ['', 'https://www.bogan.ca/astro/occultations/occltlst.htm'],
    [''],
    ['COLUMN DESCRIPTIONS'],
    ['─'.repeat(60)],
    ['JD:', 'Julian Day number'],
    ['Date/Time:', 'Calendar date and time (UTC)'],
    ['Label:', 'Event type (NASA date, Opposition, Occultation, etc.)'],
    ['Planet RA:', 'Calculated Right Ascension of the planet'],
    ['Planet Dec:', 'Calculated Declination of the planet'],
    ['Reference RA:', 'Reference Right Ascension from source data (if provided)'],
    ['Reference Dec:', 'Reference Declination from source data (if provided)'],
    ['Reference Longitude:', 'Ecliptic longitude from source data (for conjunctions)'],
    ['Compare Planet:', 'Companion planet for occultation comparisons'],
    ['Companion RA/Dec:', 'Position of companion planet at same date'],
    ['Planet Dist Earth/Sun:', 'Distance in AU from Earth/Sun'],
    [''],
    ['CALCULATIONS'],
    ['─'.repeat(60)],
    ['Longitude to RA conversion:', 'Uses proper ecliptic-to-equatorial transformation'],
    ['Formula:', 'RA = atan2(sin(λ) × cos(ε), cos(λ))'],
    ['', 'where λ = ecliptic longitude, ε = obliquity (~23.44°)'],
    ['Obliquity source:', 'Dynamic value from o.obliquityEarth at simulation date'],
    [''],
    ['COLOR CODING (in screen report)'],
    ['─'.repeat(60)],
    ['Green:', 'Difference ≤ 5 minutes of RA'],
    ['Amber:', 'Difference 5-15 minutes of RA'],
    ['Red:', 'Difference > 15 minutes of RA'],
  ];
  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.aoa_to_sheet(docRows),
    'Documentation');

  if (excelData.positionRows.length > 1) {
    XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet(excelData.positionRows),
      `${planetLabel} Position`);
  }

  if (excelData.longitudeRows.length > 1) {
    XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet(excelData.longitudeRows),
      `${planetLabel} Longitude`);
  }

  const wbBlob = workbookToBlob(wb);
  const url = URL.createObjectURL(wbBlob);
  Object.assign(document.createElement('a'),
    { href: url, download: `${planetKey}_position_report.xlsx` }).click();
  URL.revokeObjectURL(url);
}

/**
 * Copy report text to clipboard
 * Strips HTML tags (like color spans) from the text before copying
 */
function copyReportToClipboard(reportText) {
  // Remove HTML tags (e.g., <span style="color:...">...</span>) for plain text copy
  const plainText = reportText.replace(/<[^>]*>/g, '');
  navigator.clipboard.writeText(plainText)
    .then(() => {
      // Show brief feedback
      const copyBtn = document.querySelector('.hi-report-btn.copy');
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = originalText; }, 1500);
      }
    })
    .catch(err => {
      console.error('Failed to copy report:', err);
    });
}

// Store current report data for button handlers
let _currentReportData = null;

/**
 * Generate and display the planet position report in the inspector panel
 */
async function generateAndDisplayReport(planetKey) {
  const panel = hierarchyInspector.panel;
  if (!panel) return;

  const reportElement = panel.querySelector('.hi-report');
  const loadingElement = panel.querySelector('.hi-report-loading');
  const buttonsElement = panel.querySelector('.hi-report-buttons');

  if (!reportElement || !loadingElement) return;

  // Show loading state
  loadingElement.style.display = 'block';
  reportElement.style.display = 'none';
  buttonsElement.style.display = 'none';

  try {
    // Get current showAll state from checkbox
    const showAllCheckbox = panel.querySelector('.hi-report-show-all');
    const showAll = showAllCheckbox ? showAllCheckbox.checked : false;

    // Generate the report
    const result = await generatePlanetReport(planetKey, showAll);

    // Store for button handlers
    _currentReportData = {
      planetKey,
      screenReport: result.screenReport,
      excelData: result.excelData
    };

    // Display the report (use innerHTML to render color-coded spans)
    reportElement.innerHTML = result.screenReport;
    loadingElement.style.display = 'none';
    reportElement.style.display = 'block';
    buttonsElement.style.display = 'flex';
  } catch (err) {
    console.error('Error generating report:', err);
    reportElement.textContent = `Error generating report: ${err.message}`;
    loadingElement.style.display = 'none';
    reportElement.style.display = 'block';
    buttonsElement.style.display = 'none';
  }
}

// ---------------------------------------------------------------------------
//  HELPER — "excess seconds per (mean) day" at the *current* JD
//  Positive  => Earth day is longer than 86 400 s  ➜ ΔT increases
//  Negative  => Earth day is shorter            ➜ ΔT decreases
// ---------------------------------------------------------------------------
function secondsExcessPerDay () {
  // `o.lengthofDay` must already hold the length of *this* day in seconds.
  // (If you compute that elsewhere each tick, just reference the same value.)
  return o.lengthofDay - 86400;
}

// ---------------------------------------------------------------------------
//  CALL THIS ONCE *EACH* SIMULATION STEP *AFTER* YOU ADVANCE YOUR CLOCK
//  (`currentJD` must be the new Julian Day number for the model)
// ---------------------------------------------------------------------------
function updateDeltaT() {
  const currentJD = o.julianDay;                       // use your existing value
  const daysElapsed = currentJD - state.prevJD;
  const excess = o.lengthofDay - 86400;

  if (isNaN(excess) || isNaN(daysElapsed)) {
    console.warn("Bad input to updateDeltaT", { excess, daysElapsed });
    return;
  }

  state.deltaT += excess * daysElapsed;
  state.prevJD = currentJD;
}

function resetDeltaTForJump() {
  /* ------------------------------------------------------------------ */
  const BASE_YEAR          = startmodelYear;
  const SUBSTEPS_PER_YEAR  = 10; 
  /* ------------------------------------------------------------------ */

  const targetYear = o.currentYear;
  const startYear  = Math.min(BASE_YEAR, targetYear);
  const endYear    = Math.max(BASE_YEAR, targetYear);

  let deltaTsum = 0;           // total change to apply to deltaTStart

  /* ── integrate whole years, sampling “one-year-before” each slice ── */
  for (let y = startYear; y < endYear; y++) {
    for (let i = 0; i < SUBSTEPS_PER_YEAR; i++) {

      /* sample ***one year earlier*** than the slice we are adding   */
      const subYear    = y + i / SUBSTEPS_PER_YEAR;
      const sourceYear = subYear - 1;

      const lod = computeLengthofDay(
        sourceYear,
        balancedYear,
        perihelionCycleLength,
        o.perihelionprecessioncycleYear,
        helionpointAmplitude,
        meansolardayAmplitudeinSeconds,
        meanlengthofday
      );

      const solarYear = computeLengthofsolarYear(
        sourceYear,
        balancedYear,
        perihelionCycleLength,
        o.perihelionprecessioncycleYear,
        meansolaryearAmplitudeinDays,
        meansolaryearlengthinDays
      );

      const dTchangePerYr = (lod - 86_400) * solarYear;       // seconds/yr
      deltaTsum += dTchangePerYr / SUBSTEPS_PER_YEAR;         // fraction
    }
  }

  /* ── fractional part of the final calendar year (if any) ─────────── */
  const frac = targetYear - Math.floor(targetYear);           // 0 … <1
  if (frac !== 0) {
    const y = Math.floor(targetYear);
    const slices = Math.round(SUBSTEPS_PER_YEAR * frac);

    for (let i = 0; i < slices; i++) {
      const subYear    = y + i / SUBSTEPS_PER_YEAR;
      const sourceYear = subYear - 1;

      const lod = computeLengthofDay(
        sourceYear,
        balancedYear,
        perihelionCycleLength,
        o.perihelionprecessioncycleYear,
        helionpointAmplitude,
        meansolardayAmplitudeinSeconds,
        meanlengthofday
      );

      const solarYear = computeLengthofsolarYear(
        sourceYear,
        balancedYear,
        perihelionCycleLength,
        o.perihelionprecessioncycleYear,
        meansolaryearAmplitudeinDays,
        meansolaryearlengthinDays
      );

      const dTchangePerYr = (lod - 86_400) * solarYear;
      deltaTsum += dTchangePerYr / SUBSTEPS_PER_YEAR;
    }
  }

  /* ── final ΔT: add for future, subtract for past ─────────────────── */
  const deltaT = (targetYear >= BASE_YEAR)
    ? deltaTStart + deltaTsum   // stepping FORWARD  → grows
    : deltaTStart - deltaTsum;  // stepping BACKWARD → shrinks

  state.deltaT = deltaT;
  state.prevJD = o.julianDay;     // avoid monster step on next frame
}

// ---------------------------------------------------------------------------
//  CONVENIENCE GETTERS — call whenever you need to *display* the values
// ---------------------------------------------------------------------------

// predicted change *per* tropical year at "right now"
function getDeltaTChangePerYear () {
  return secondsExcessPerDay() * o.lengthofsolarYear;  // seconds / yr
}

// total accumulated ΔT (seconds) since 2000-06-21
function getDeltaT () {
  return state.deltaT;
}

function detectAndUpdateDeltaT() {
  const currentJD = o.julianDay;
  const jumpThreshold = 5; // days – tune this as needed

  if (Math.abs(currentJD - state.prevJD) > jumpThreshold) {
    resetDeltaTForJump();
  } else {
    updateDeltaT();
  }
}

function focusPlanet(pd, pad = 1.01) {
  if (!pd?.planetObj) {
    // user picked "Please select" → remove limits
    controls.minDistance = 0;
    controls.maxDistance = Infinity;
    return;
  }

  /* — planet world-space centre — */
  // Update from root of hierarchy to ensure all parent transforms are current
  // (needed when called while simulation is paused/idle)
  startingPoint.pivotObj.updateMatrixWorld(true);
  pd.planetObj.getWorldPosition(_ctrWS);

  /* — scaled radius (uniform scaling assumed) — */
  pd.planetObj.getWorldScale(_scale);
  const R = pd.size * _scale.x;          // pd.size = "pretty" radius
  const minD = R * pad;

  controls.target.copy(_ctrWS);
  controls.minDistance = minD;
  controls.maxDistance = Infinity;        // generous zoom-out

  /* — if camera is *inside* new shell → pop it to the skin — */
  _offset.subVectors(camera.position, _ctrWS);
  if (_offset.length() < minD) {
    camera.position.copy(_ctrWS).add(_offset.setLength(minD));
    controls.update();                   // rebuild spherical coords
  }

  /* — near plane: 20 % of min distance for good z-precision — */
  camera.near = Math.max(0.01, minD * 0.2);
  camera.updateProjectionMatrix();
}

/**
 * Blow-up slider for the physical planets only.
 * Pass a slider value `t` ∈ [0, 1].
 */
function updatePlanetSizes(t) {

  t = THREE.MathUtils.clamp(t, 0, 1);   // safety against out-of-range
  const BOOST = 250.0;                    // max multiple at t = 1

  planetObjects.forEach(pd => {

    /* ignore helpers / ghost objects */
    if (pd.isNotPhysicalObject === true || pd.visible === false) return;
    if (!pd.rotationAxis) return;

    /* linear scale from 1 → BOOST */
    const scale = 1 + t * (BOOST - 1);  // 0 ↦ 1, 1 ↦ BOOST
    pd.rotationAxis.scale.setScalar(scale);
  });
}

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

// 0 — per-frame stats
const planetStats = {
    earth: [
      {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => holisticyearLength-13, dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Earth orbits the Sun ${fmtNum((holisticyearLength-13),0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.earthDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/Earth',
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => o.obliquityEarth, dec:8, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '1' }],
       static: true},
      {label : () => `Mass (M⊕)`,
       value : [ { v: () => fmtScientific(M_EARTH, 12) },{ small: 'kg' }],
       hover : [`Earth's mass derived from Moon's orbital data using Kepler's 3rd Law: GM = 4π²a³/P² ≈ 5.97 × 10²⁴ kg`],
       info  : 'https://en.wikipedia.org/wiki/Earth_mass',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_EARTH, dec:2, sep:',' },{ small: 'km³/s²' }],
       hover : [`Derived from Moon's orbit, corrected for Moon's mass: GM_Earth = GM_system × (ratio/(ratio+1)) ≈ 398,600 km³/s²`],
       static: true},
      {label : () => `Mass ratio (M⊕/M☽)`,
       value : [ { v: () => MASS_RATIO_EARTH_MOON, dec:6, sep:',' },{ small: '' }],
       hover : [`Earth is ~81.3 times more massive than Moon`],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => o.eccentricityEarth, dec:8, sep:',' },{ small: '' }]},
      {label : () => `Orbital Inclination (i)`,
       value : [ { v: () => o.obliquityEarth-radiansToDecDecimal(earthWobbleCenter.dec), dec:8, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => o.inclinationEarth, dec:8, sep:',' },{ small: 'degrees (°)' }]},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(o.lengthofAU, M_EARTH, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Region where Earth's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 1.5 million km. Moon orbits at ~384,400 km (25% of Hill sphere)`]},
      {label : () => `Hill Sphere`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(o.lengthofAU, M_EARTH, M_SUN) / o.lengthofAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Hill sphere radius as fraction of semi-major axis ≈ 0.01 AU`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(o.lengthofAU, M_EARTH, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 925,000 km. Used for spacecraft trajectory calculations`]},
      {label : () => `Lagrange L1 Distance`,
       value : [ { v: () => OrbitalFormulas.lagrangeL1L2Distance(o.lengthofAU, M_EARTH, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`L1 point distance from Earth toward Sun ≈ r_Hill. Location of SOHO, DSCOVR spacecraft`]},
      {label : () => `Lagrange L2 Distance`,
       value : [ { v: () => OrbitalFormulas.lagrangeL1L2Distance(o.lengthofAU, M_EARTH, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`L2 point distance from Earth away from Sun ≈ r_Hill. Location of JWST, Gaia spacecraft`]},
    null,
      {label : () => `Earth-Moon Barycenter`,
       value : [ { v: () => OrbitalFormulas.barycenterDistance(moonDistance, MASS_RATIO_EARTH_MOON), dec:2, sep:',' },{ small: 'km from Earth center' }],
       hover : [`d_bary = r_Moon/(1+M⊕/M☽) ≈ 4,670 km. The barycenter is inside Earth (radius 6,371 km)`],
       static: true},
      {label : () => `Barycenter (% of Earth radius)`,
       value : [ { v: () => (OrbitalFormulas.barycenterDistance(moonDistance, MASS_RATIO_EARTH_MOON) / (diameters.earthDiameter/2)) * 100, dec:2, sep:',' },{ small: '%' }],
       hover : [`Barycenter is at ~73% of Earth's radius from center - about 1,700 km below the surface`],
       static: true},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_EARTH) * 1000000, dec:3, sep:',' },{ small: 'mm' }],
       hover : [`r_s = 2GM/c² ≈ 8.87 mm. If Earth compressed to this size, it would become a black hole`],
       static: true},
      {label : () => `Tidal Force Ratio (Sun/Moon)`,
       value : [ { v: () => OrbitalFormulas.tidalForceRatio(M_SUN, M_MOON, o.lengthofAU, moonDistance), dec:4, sep:',' },{ small: '' }],
       hover : [`Sun's tidal force on Earth is ~46% of Moon's: (M_Sun/M_Moon) × (r_Moon/r_Sun)³`]},

    {header : '—  Surface & Physical Properties —' },
      {label : () => `Surface Gravity (g)`,
       value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_EARTH, diameters.earthDiameter/2), dec:4, sep:',' },{ small: 'm/s²' }],
       hover : [`g = GM/R² ≈ 9.82 m/s². Standard gravity defined as 9.80665 m/s² at the Earth's surface`],
       static: true},
      {label : () => `Surface Escape Velocity`,
       value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_EARTH, diameters.earthDiameter/2), dec:3, sep:',' },{ small: 'km/s' }],
       hover : [`v_esc = √(2GM/R) ≈ 11.19 km/s. Minimum velocity to escape Earth's gravity`],
       static: true},
      {label : () => `Mean Density (ρ)`,
       value : [ { v: () => OrbitalFormulas.meanDensity(M_EARTH, diameters.earthDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
       hover : [`ρ = 3M/(4πR³) ≈ 5,515 kg/m³. Earth is the densest planet in the Solar System`],
       static: true},
      {label : () => `Gravitational Potential at Moon`,
       value : [ { v: () => OrbitalFormulas.gravitationalPotential(GM_EARTH, moonDistance), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Φ = -GM/r. Potential energy per unit mass at Moon's distance`],
       static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => o.lengthofsolarYear/meansolaryearlengthinDays, dec:6, sep:',' },{ small : 'years' }]},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => o.lengthofsolarYear, dec:8, sep:',' },{ small : 'days' }]},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => o.lengthofsiderealYear/o.lengthofDay, dec:8, sep:',' },{ small : 'days' }]},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion(o.lengthofsolarYear), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`]},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => o.lengthofDay/86400*24, dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => o.lengthofsiderealDayRealLOD/86400*24, dec:6, sep:',' },{ small: 'hours' }]},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => o.lengthofAU/((meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI)), dec:6, sep:',' },{ small : 'AU' }]},
      {label : () => `Semi-major axis`,
       value : [ { v: () => o.lengthofAU, dec:6, sep:',' },{ small : 'km' }]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(1, o.eccentricityEarth), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`]},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(1, o.eccentricityEarth), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`]},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(1, o.eccentricityEarth), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`]},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => sun.distAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Earth's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(1, o.eccentricityEarth), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`]},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(1, o.eccentricityEarth), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`]},
      {label : () => `PERIHELION-OF-EARTH Distance`,
       value : [ { v: () => eccentricityMean, dec:8, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => speedofSuninKM, dec:2, sep:',' },{ small: 'km/h' }],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(sun.distAU * o.lengthofAU, o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a))`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(o.lengthofAU, o.eccentricityEarth, o.earthTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(o.lengthofAU, o.eccentricityEarth, o.earthTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(o.lengthofAU, o.eccentricityEarth) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(o.lengthofAU, o.eccentricityEarth) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(o.eccentricityEarth), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`]},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(sun.distAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(sun.distAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(sun.distAU * o.lengthofAU, o.lengthofAU), sun.distAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(o.lengthofAU, o.eccentricityEarth), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(o.lengthofAU, o.eccentricityEarth), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => ((earthPerihelionFromEarth.ra * 180 / Math.PI + 360) % 360).toFixed(8), dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.earthArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from ascending node to perihelion, measured in orbital plane: ω = ϖ - Ω`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_periapsis'},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => 0, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Earth's ascending node on ecliptic is 0° by definition (ecliptic reference)`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node'},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => 180, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Point where orbit crosses ecliptic going south: descending node = Ω + 180°`]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.earthAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Longitude where Earth's orbit crosses the invariable plane going north`],
       info  : 'https://en.wikipedia.org/wiki/Invariable_plane'},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.earthHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Current vertical distance from the solar system's invariable plane: z = r × sin(i) × sin(u)`]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.earthAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }],
       hover : [`Whether planet is currently north (above) or south (below) of the invariable plane`]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.earthMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.earthEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.earthTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.earthTrueAnomaly - o.earthMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.earthMeanAnomaly, o.earthPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.earthArgumentOfPeriapsis, o.earthTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to planet: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(o.eccentricityEarth, o.earthTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(o.inclinationEarth, o.earthArgumentOfPeriapsis, o.earthTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion(o.lengthofsolarYear), o.eccentricityEarth, o.earthTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion(o.lengthofsolarYear), o.eccentricityEarth, o.earthEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(o.lengthofAU, o.eccentricityEarth, o.earthTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(o.lengthofsolarYear, o.earthMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(o.lengthofsolarYear, o.earthMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},
      {label : () => `Approximate Date of Perihelion`,
       value : [ { v: () => o.longitudePerihelionDatePer },{ small: 'D/M/Y, h:m:s' }],
       hover : [`Estimated date when Earth will be closest to the Sun`],
       info  : 'https://en.wikipedia.org/wiki/Perihelion_and_aphelion'},
      {label : () => `Approximate Date of Aphelion`,
       value : [ { v: () => o.longitudePerihelionDateAp },{ small: 'D/M/Y, h:m:s' }],
       hover : [`Estimated date when Earth will be farthest from the Sun`]},

    {header : '—  Date Specific Characteristics —', date: () => o.Date },
      {''                                           : [ { small : 'mean' },'on date']},
      {label : () => `Solar Day (SI seconds)`,
       value : [ { small: meanlengthofday },{ v: () => o.lengthofDay, dec:10, sep:',' }]},
      {label : () => `Sidereal day (SI seconds)`,
       value : [ { small: meanSiderealday },{ v: () => o.lengthofsiderealDayRealLOD, dec:10, sep:',' }]},
      {label : () => `Stellar day (SI seconds)`,
       value : [ { small: meanStellarday },{ v: () => o.lengthofstellarDayRealLOD, dec:10, sep:',' }]},
     null,
      {label : () => `Solar year (SI seconds)`,
       value : [ { small: meanlengthofday*meansolaryearlengthinDays },{ v: () => o.lengthofsolarYearSecRealLOD, dec:6, sep:',' }]},
      {label : () => `Solar year (days)`,
       value : [ { small: meansolaryearlengthinDays },{ v: () => o.lengthofsolarYear, dec:11, sep:',' }]},
     null,
      {label : () => `Sidereal year (SI seconds)`,
       value : [ { small: meansiderealyearlengthinSeconds },{ v: () => o.lengthofsiderealYear, dec:6, sep:',' }]},
      {label : () => `Sidereal year (days)`,
       value : [ { small: meansiderealyearlengthinSeconds/meanlengthofday },{ v: () => o.lengthofsiderealYear/o.lengthofDay, dec:11, sep:',' }]},
     null,
      {label : () => `Anomalistic year (SI seconds)`,
       value : [ { small: meanAnomalisticYearinDays*meanlengthofday },{ v: () => o.lengthofanomalisticYearRealLOD, dec:6, sep:',' }]},
      {label : () => `Anomalistic year (days)`,
       value : [ { small: meanAnomalisticYearinDays },{ v: () => o.lengthofanomalisticYearRealLOD/o.lengthofDay, dec:11, sep:',' }]},
     null,
      {label : () => `Obliquity (degrees)`,
       value : [ { small: earthtiltMean },{ v: () => o.obliquityEarth, dec:12, sep:',' }]},
      {label : () => `Orbital Eccentricity`,
       value : [ { small: eccentricityMean },{ v: () => o.eccentricityEarth, dec:13, sep:',' }]},
      {label : () => `Inclination to Invariable plane (degrees)`,
       value : [ { small: earthinclinationMean },{ v: () => o.inclinationEarth, dec:13, sep:',' }]},
     null,
      {label : () => `Length of AU (km)`,
       value : [ { small:{ v: () => (meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI), dec:6, sep:',' }},{ v: () => o.lengthofAU, dec:5, sep:',' }]},

    {header : '—  Precession Cycles —' },
      {label : () => `Axial precession (years)`,
       value : [ { small: { v: () => holisticyearLength/13, dec:2, sep:',' }},{ v: () => o.axialPrecessionRealLOD, dec:9, sep:',' }],
       hover : [`The mean value for axial precession is calculated as ${fmtNum(holisticyearLength,0,',')}/13`],
       info  : 'https://en.wikipedia.org/wiki/Axial_precession'},
      {label : () => `Inclination precession (years)`,
       value : [ { small: { v: () => holisticyearLength/3, dec:2, sep:',' }},{ v: () => o.inclinationPrecessionRealLOD, dec:8, sep:',' }],
       hover : [`The mean value for inclination precession is calculated as ${fmtNum(holisticyearLength,0,',')}/3`],
       info  : 'https://en.wikipedia.org/wiki/Apsidal_precession'},
      {label : () => `Perihelion precession (years)`,
       value : [ { small: { v: () => holisticyearLength/16, dec:2, sep:',' }},{ v: () => o.perihelionPrecessionRealLOD, dec:9, sep:',' }],
       hover : [`The mean value for perihelion precession is calculated as ${fmtNum(holisticyearLength,0,',')}/16`],
       info  : 'https://en.wikipedia.org/wiki/Milankovitch_cycles#Apsidal_precession'},
      {label : () => `Obliquity precession (years)`,
       value : [ { small: { v: () => holisticyearLength/8, dec:2, sep:',' }},{ v: () => o.obliquityPrecessionRealLOD, dec:9, sep:',' }],
       hover : [`The mean value for obliquity precession is calculated as ${fmtNum(holisticyearLength,0,',')}/8`],
       info  : 'https://en.wikipedia.org/wiki/Axial_tilt#Long_term'},
      {label : () => `Ecliptic precession (years)`,
       value : [ { small: { v: () => holisticyearLength/5, dec:2, sep:',' }},{ v: () => o.eclipticPrecessionRealLOD, dec:9, sep:',' }],
       hover : [`The mean value for ecliptic precession is calculated as ${fmtNum(holisticyearLength,0,',')}/5`],
       info  : 'https://en.wikipedia.org/wiki/Milankovitch_cycles#Orbital_inclination'},
    ],

    moon: [
    {header : '—  General characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (meansolaryearlengthinDays*holisticyearLength)/moonSiderealMonth, dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`The Moon orbits Earth ${fmtNum((meansolaryearlengthinDays*holisticyearLength)/moonSiderealMonth,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.moonDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/Moon',
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => moonTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Mass (M☽)`,
       value : [ { v: () => fmtScientific(M_MOON, 12) },{ small: 'kg' }],
       hover : [`Moon's mass derived from Earth-Moon system: M_Moon = M_Earth / ${MASS_RATIO_EARTH_MOON.toFixed(2)} ≈ 7.35 × 10²² kg`],
       info  : 'https://en.wikipedia.org/wiki/Moon',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_MOON, dec:6, sep:',' },{ small: 'km³/s²' }],
       hover : [`GM_Moon = GM_system / (1 + mass_ratio) ≈ 4,903 km³/s²`],
       static: true},
     null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => moonOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination (i)`,
       value : [ { v: () => moonOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(moonDistance, M_MOON, M_EARTH), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Region where Moon's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 60,000 km`],
       static: true},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(moonDistance, M_MOON, M_EARTH), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 66,000 km`],
       static: true},
      {label : () => `Earth-Moon Barycenter`,
       value : [ { v: () => moonDistance - OrbitalFormulas.barycenterDistance(moonDistance, MASS_RATIO_EARTH_MOON), dec:2, sep:',' },{ small: 'km from Moon center' }],
       hover : [`Moon's distance from the Earth-Moon barycenter ≈ 379,700 km`],
       static: true},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_MOON) * 1000000, dec:4, sep:',' },{ small: 'mm' }],
       hover : [`r_s = 2GM/c² ≈ 0.11 mm. If Moon compressed to this size, it would become a black hole`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_MOON, diameters.moonDiameter/2), dec:4, sep:',' },{ small: 'm/s²' }],
      hover : [`g = GM/R² ≈ 1.62 m/s². About 16.5% of Earth's surface gravity`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_MOON, diameters.moonDiameter/2), dec:3, sep:',' },{ small: 'km/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 2.38 km/s. About 21% of Earth's escape velocity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_MOON, diameters.moonDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ = 3M/(4πR³) ≈ 3,346 kg/m³. About 61% of Earth's density`],
      static: true},
     {label : () => `Gravitational Potential at Surface`,
      value : [ { v: () => OrbitalFormulas.gravitationalPotential(GM_MOON, diameters.moonDiameter/2), dec:4, sep:',' },{ small: 'km²/s²' }],
      hover : [`Φ = -GM/r. Potential energy per unit mass at Moon's surface`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Sidereal month`,
       value : [ { v: () => moonSiderealMonth, dec:10, sep:',' },{ small: 'days' }],
       info  : 'https://en.wikipedia.org/wiki/Orbit_of_the_Moon',
       static: true},
      {label : () => `Synodic month`,
       value : [ { v: () => moonSynodicMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `Anomalistic month`,
       value : [ { v: () => moonAnomalisticMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `Draconic month (a.k.a. nodal period)`,
       value : [ { v: () => moonNodalMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `Tropical month`,
       value : [ { v: () => moonTropicalMonth, dec:10, sep:',' },{ small: 'days' }],
       info  : 'https://eclipse.gsfc.nasa.gov/LEcat5/LEcatalog.html',
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Orbit distance to Earth`,
       value : [ { v: () => moonDistance, dec:2, sep:',' },{ small: 'km' }],
       static: true},
      {label : () => `Orbital speed around Earth`,
       value : [ { v: () => moonSpeed, dec:6, sep:',' },{ small: 'km/h' }],
       static: true},

    {header : '—  Moon Cycles & Precession —' },
      {label : () => `Full Moon cycle ICRF`,
       value : [ { v: () => moonFullMoonCycleICRF, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `Full Moon cycle Earth`,
       value : [ { v: () => moonFullMoonCycleEarth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
     null,
      {label : () => `Draconic year ICRF`,
       value : [ { v: () => moonDraconicYearICRF, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `Draconic year Earth`,
       value : [ { v: () => moonDraconicYearEarth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
    null,
      {label : () => `Apsidal precession ICRF`,
       value : [ { v: () => moonApsidalPrecessionindaysICRF, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => ``,
       value : [ { v: () => moonApsidalPrecessionindaysICRF/meansolaryearlengthinDays, dec:10, sep:',' },{ small: 'years' }],
       static: true},
      {label : () => `Apsidal precession Earth`,
       value : [ { v: () => moonApsidalPrecessionindaysEarth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => ``,
       value : [ { v: () => moonApsidalPrecessionindaysEarth/meansolaryearlengthinDays, dec:10, sep:',' },{ small: 'years' }],
       static: true},
     null,
      {label : () => `Nodal precession ICRF`,
       value : [ { v: () => moonNodalPrecessionindaysICRF, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => ``,
       value : [ { v: () => moonNodalPrecessionindaysICRF/meansolaryearlengthinDays, dec:10, sep:',' },{ small: 'years' }],
       static: true},
      {label : () => `Nodal precession Earth`,
       value : [ { v: () => moonNodalPrecessionindaysEarth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => ``,
       value : [ { v: () => moonNodalPrecessionindaysEarth/meansolaryearlengthinDays, dec:10, sep:',' },{ small: 'years' }],
       static: true},
    null,
      {label : () => `Nodal meets Apsidal precession`,
       value : [ { v: () => moonApsidalMeetsNodalindays, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => ``,
       value : [ { v: () => moonApsidalMeetsNodalindays/meansolaryearlengthinDays, dec:10, sep:',' },{ small: 'years' }],
       static: true},
    null,
      {label : () => `Royer Cycle`,
       value : [ { v: () => moonRoyerCycleindays, dec:10, sep:',' },{ small: 'days' }],
       info  : 'https://geoenergymath.com/2014/04/05/the-chandler-wobble-and-the-soim/',
       static: true},
      {label : () => ``,
       value : [ { v: () => moonRoyerCycleindays/meansolaryearlengthinDays, dec:10, sep:',' },{ small: 'years' }],
       static: true},

    {header : '—  Eclipse Cycles: Metonic —' },
      {label : () => `235 Synodic Months`,
       value : [ { v: () => 235*moonSynodicMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `255 Draconic months`,
       value : [ { v: () => 255*moonNodalMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `19 Solar years`,
       value : [ { v: () => 19*o.lengthofsolarYear, dec:10, sep:',' },{ small: 'days' }]},

    {header : '—  Eclipse Cycles: Saros —' },
      {label : () => `223 Synodic Months`,
       value : [ { v: () => 223*moonSynodicMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `239 Anomalistic Months`,
       value : [ { v: () => 239*moonAnomalisticMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `242 Draconic months`,
       value : [ { v: () => 242*moonNodalMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `19 Draconic year cycles`,
       value : [ { v: () => 19*moonDraconicYearEarth, dec:10, sep:',' },{ small: 'days' }],
       static: true},

    {header : '—  Eclipse Cycles: Exeligmos (3× Saros) —' },
      {label : () => `3 * 223 Synodic Months`,
       value : [ { v: () => 3*223*moonSynodicMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `3 * 239 Anomalistic Months`,
       value : [ { v: () => 3*239*moonAnomalisticMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `3 * 242 Draconic months`,
       value : [ { v: () => 3*242*moonNodalMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `3 * 19 Draconic year cycles`,
       value : [ { v: () => 3*19*moonDraconicYearEarth, dec:10, sep:',' },{ small: 'days' }],
       static: true},

    {header : '—  Eclipse Cycles: Callippic —' },
      {label : () => `940 Synodic Months`,
       value : [ { v: () => 940*moonSynodicMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `1020 Draconic months`,
       value : [ { v: () => 1020*moonNodalMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `1016 Sidereal Months`,
       value : [ { v: () => 1016*moonSiderealMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `1016 Tropical Months`,
       value : [ { v: () => 1016*moonTropicalMonth, dec:10, sep:',' },{ small: 'days' }],
       static: true},
      {label : () => `76 Solar years`,
       value : [ { v: () => 76*o.lengthofsolarYear, dec:10, sep:',' },{ small: 'days' }]},
    ],
  
    sun: [
    { header : '—  General characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => 0, dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`The Sun is responsible for the length of the Holistic-Year of ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.sunDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/Sun',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_SUN, dec:0, sep:',' },{ small: 'km³/s²' }],
       hover : [`Derived from Kepler's 3rd Law: GM = (2π)² × a³ / P² ≈ 1.327 × 10¹¹ km³/s²`],
       info  : 'https://en.wikipedia.org/wiki/Standard_gravitational_parameter',
       static: true},
      {label : () => `Mass (M☉)`,
       value : [ { v: () => fmtScientific(M_SUN, 12) },{ small: 'kg' }],
       hover : [`Sun's mass derived from GM/G ≈ 1.989 × 10³⁰ kg`],
       info  : 'https://en.wikipedia.org/wiki/Solar_mass',
       static: true},
      {label : () => `Mass ratio (M☉/M⊕)`,
       value : [ { v: () => MASS_RATIO_SUN_EARTH, dec:0, sep:',' },{ small: '' }],
       hover : [`Sun is ~332,946 times more massive than Earth`],
       static: true},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_SUN), dec:3, sep:',' },{ small: 'km' }],
       hover : [`r_s = 2GM/c² ≈ 2.95 km. If Sun compressed to this size, it would become a black hole. Sun's actual radius is 695,700 km`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => sunTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '0' }],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_SUN, diameters.sunDiameter/2), dec:2, sep:',' },{ small: 'm/s²' }],
      hover : [`g = GM/R² ≈ 274 m/s². About 28 times Earth's surface gravity`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_SUN, diameters.sunDiameter/2), dec:2, sep:',' },{ small: 'km/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 617.5 km/s. About 55 times Earth's escape velocity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_SUN, diameters.sunDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ = 3M/(4πR³) ≈ 1,408 kg/m³. Only about 25% of Earth's density`],
      static: true},
     null,
      { header : 'Our Sun is orbiting the Milky Way' },
     null,
      {label : () => `Orbit period of our Sun`,
       value : [ { v: () => sunOrbitPeriod, dec:0, sep:',' },{ small: 'years' }],
       static: true},
      {label : () => `Orbit distance of Sun to the Milky Way center`,
       value : [ { v: () => milkywayDistance, dec:0, sep:',' },{ small: 'light-years' }],
       static: true},
      {label : () => `Orbital speed of Sun around Milky Way galaxy`,
       value : [ { v: () => sunSpeed, dec:0, sep:',' },{ small: 'km/h' }],
       info  : 'https://en.wikipedia.org/wiki/Galactic_year',
       static: true},
    null,
      { header : 'Our Milky Way is orbiting the Great Attractor' },
    null,
      {label : () => `Orbit period of our Milky Way galaxy`,
       value : [ { v: () => milkywayOrbitPeriod, dec:0, sep:',' },{ small: 'years' }],
       hover : [`Calculated based upon 2 mln light-years to the great attractor center, so (${fmtNum(greatattractorDistance,0,',')}*${fmtNum(lightYear,0,',')}*2*PI)/${fmtNum(milkywaySpeed,0,',')}/60/60*${fmtNum(meanlengthofday,6,',')}*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit distance to the Great Attractor`,
       value : [ { v: () => greatattractorDistance, dec:0, sep:',' },{ small: 'light-years' }],
       static: true},
      {label : () => `Orbital speed of Milky Way to Great Attractor`,
       value : [ { v: () => milkywaySpeed, dec:0, sep:',' },{ small: 'km/h' }],
       info  : 'https://en.wikipedia.org/wiki/Great_Attractor',
       static: true},
    null,
      { header : 'The age of the universe' },
    null,
      {label : () => `Visible age of the universe`,
       value : [ { v: () => ((((((meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI)*Math.PI*2)/1296000)*(648000/(Math.PI))**2)/speedOfLight)/meanlengthofday/meansolaryearlengthinDays)*4.22*1000000000, dec:0, sep:',' },{ small: 'years' }],
       hover : [`Calculated based upon 4.220 billion parsecs visible`],
       info  : 'https://en.wikipedia.org/wiki/Observable_universe',
       static: true},
    null,
      { header : 'New Constants which can be used for long term calculations' },
    null,
      {label : () => `NEW-AU`,
       value : [ { small:{ v: () => (meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI), dec:6, sep:',' }},{ small: 'km' }],
       static: true},
      {label : () => `NEW-Light-year`,
       value : [ { small:{ v: () => lightYear, dec:0, sep:',' }},{ small: 'km' }],
       static: true},
      {label : () => `NEW-Arcsecond`,
       value : [ { small:{ v: () => ((meansiderealyearlengthinSeconds/60/60 * speedofSuninKM) / (2 * Math.PI)*Math.PI*2)/1296000, dec:6, sep:',' }},{ small: 'km' }],
       hover : [`The angular diameter in km of an object at a distance of 1 NEW-AU`],
       static: true},
      {label : () => `NEW-SI second`,
       value : [ { small:{ v: () => meanlengthofday/86400, dec:8, sep:',' }},{ small: 'SI second' }],
       hover : [`A NEW-SI second is ${fmtNum(meanlengthofday,8,',')}/86,400 times the current SI second to make sure we can keep using 86,400 seconds a day`],
       static: true},
      {label : () => ``,
       value : [ { small:{ v: () => 9192631770/ 86400*meanlengthofday, dec:0, sep:',' }},{ small: 'transitions' }],
       hover : [`A NEW-SI second is 9,192,631,770/86,400*${fmtNum(meanlengthofday,8,',')} periods of the radiation corresponding to the transition between the two hyperfine levels of the ground state of the caesium-133 atom`],
       static: true},
    ],
    
    mercury: [
    {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (mercurySolarYearCount), dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Mercury orbits the Sun ${fmtNum(mercurySolarYearCount,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.mercuryDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/Mercury_(planet)',
       static: true},
      {label : () => `Mass (M)`,
       value : [ { v: () => fmtScientific(M_MERCURY, 12) },{ small: 'kg' }],
       hover : [`Mass derived from Sun/Mercury mass ratio (1:${fmtNum(MASS_RATIO_SUN_MERCURY,0,',')}), originally measured via MESSENGER spacecraft`],
       info  : 'https://en.wikipedia.org/wiki/Mercury_(planet)',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_MERCURY, dec:2, sep:',' },{ small: 'km³/s²' }],
       hover : [`GM = GM_SUN / mass_ratio ≈ 22,032 km³/s². Mercury has no moons, so mass was determined via spacecraft tracking`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => mercuryTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '0' }],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => mercuryOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination J2000 (i)`,
       value : [ { v: () => mercuryOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Apparent Inclination (i)`,
       value : [ { v: () => o.mercuryApparentInclination, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Apparent Incl. (Souami&Souchay)`,
       value : [ { v: () => o.mercuryApparentInclinationSouamiSouchay, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => mercuryInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(mercuryOrbitDistance * o.lengthofAU, M_MERCURY, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Region where Mercury's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 175,000 km`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(mercuryOrbitDistance * o.lengthofAU, M_MERCURY, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 112,000 km`]},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_MERCURY) * 1000000, dec:6, sep:',' },{ small: 'mm' }],
       hover : [`r_s = 2GM/c² ≈ 0.49 mm. If Mercury compressed to this size, it would become a black hole`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_MERCURY, diameters.mercuryDiameter/2), dec:4, sep:',' },{ small: 'm/s²' }],
      hover : [`g = GM/R² ≈ 3.70 m/s². About 38% of Earth's surface gravity`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_MERCURY, diameters.mercuryDiameter/2), dec:3, sep:',' },{ small: 'km/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 4.25 km/s. About 38% of Earth's escape velocity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_MERCURY, diameters.mercuryDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ = 3M/(4πR³) ≈ 5,427 kg/m³. Second densest planet after Earth`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => (holisticyearLength/mercurySolarYearCount), dec:6, sep:',' },{ small: 'years' }],
       hover : [`Mercury's Solar orbit period in years is calculated as ${fmtNum(holisticyearLength,0,',')}/${fmtNum(mercurySolarYearCount,0,',')}`],
       static: true},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => (holisticyearLength/mercurySolarYearCount)*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Mercury's Solar orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/${fmtNum(mercurySolarYearCount,0,',')})*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => (holisticyearLength/(mercurySolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Mercury's Sidereal orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(mercurySolarYearCount,0,',')}-13))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Synodic`,
       value : [ { v: () => (holisticyearLength/(mercurySolarYearCount-holisticyearLength))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Mercury's synodic period with Earth in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(mercurySolarYearCount,0,',')}-${fmtNum(holisticyearLength,0,',')}))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion((holisticyearLength/(mercurySolarYearCount-13))*meansolaryearlengthinDays), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`],
       static: true},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(mercuryOrbitDistance * o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => (mercuryRotationPeriod*(((holisticyearLength/mercurySolarYearCount)*meansolaryearlengthinDays)*24))/((((holisticyearLength/mercurySolarYearCount)*meansolaryearlengthinDays)*24)-mercuryRotationPeriod), dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => mercuryRotationPeriod, dec:6, sep:',' },{ small: 'hours' }],
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => mercuryOrbitDistance, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Mercury distance to Sun in AU is calculated as ((${fmtNum(holisticyearLength,0,',')}/${fmtNum(mercurySolarYearCount,0,',')})^2)^(1/3)`],
       static: true},
      {label : () => `Semi-major axis`,
       value : [ { v: () => mercuryOrbitDistance*o.lengthofAU, dec:2, sep:',' },{ small: 'km' }],
       hover : [`Mercury distance to Sun in km is calculated as (((${fmtNum(holisticyearLength,0,',')}/${fmtNum(mercurySolarYearCount,0,',')})^2)^(1/3))*${fmtNum(o.lengthofAU,6,',')}`]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(mercuryOrbitDistance, mercuryOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`],
       static: true},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(mercuryOrbitDistance, mercuryOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`],
       static: true},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(mercuryOrbitDistance, mercuryOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`],
       static: true},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => mercury.sunDistAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Mercury's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(mercuryOrbitDistance, mercuryOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`],
       static: true},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(mercuryOrbitDistance, mercuryOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`],
       static: true},
      {label : () => `PERIHELION-OF-MERCURY Distance`,
       value : [ { v: () => mercuryPerihelionDistance/100, dec:6, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => mercurySpeed, dec:6, sep:',' },{ small: 'km/h' }],
       hover : [`Mercury mean speed around the sun is calculated as (${fmtNum(mercuryOrbitDistance*o.lengthofAU,0,',')}*2*PI)/(${fmtNum(meansolaryearlengthinDays,6,',')}*${fmtNum((holisticyearLength/mercurySolarYearCount),6,',')})/24`],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(mercury.sunDistAU * o.lengthofAU, mercuryOrbitDistance * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a)). Varies from ${fmtNum(OrbitalFormulas.perihelionVelocity(mercuryOrbitDistance * o.lengthofAU, mercuryOrbitalEccentricity) * 3600, 0, ',')} km/h at perihelion to ${fmtNum(OrbitalFormulas.aphelionVelocity(mercuryOrbitDistance * o.lengthofAU, mercuryOrbitalEccentricity) * 3600, 0, ',')} km/h at aphelion`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(mercuryOrbitDistance * o.lengthofAU, mercuryOrbitalEccentricity, o.mercuryTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(mercuryOrbitDistance * o.lengthofAU, mercuryOrbitalEccentricity, o.mercuryTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(mercuryOrbitDistance * o.lengthofAU, mercuryOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(mercuryOrbitDistance * o.lengthofAU, mercuryOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(mercuryOrbitalEccentricity), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`],
       static: true},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(mercury.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(mercury.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(mercury.sunDistAU * o.lengthofAU, mercuryOrbitDistance * o.lengthofAU), mercury.sunDistAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(mercuryOrbitDistance * o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(mercuryOrbitDistance * o.lengthofAU, mercuryOrbitalEccentricity), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(mercuryOrbitDistance * o.lengthofAU, mercuryOrbitalEccentricity), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => o.mercuryPerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.mercuryArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from ascending node to perihelion, measured in orbital plane: ω = ϖ - Ω`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_periapsis'},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => o.mercuryAscendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from vernal equinox to ascending node, measured in ecliptic plane`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node'},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => o.mercuryDescendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Point where orbit crosses ecliptic going south: descending node = Ω + 180°`]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.mercuryAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Longitude where orbit crosses the invariable plane going north`],
       info  : 'https://en.wikipedia.org/wiki/Invariable_plane'},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.mercuryHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Current vertical distance from the solar system's invariable plane: z = r × sin(i) × sin(u)`]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.mercuryAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }],
       hover : [`Whether planet is currently north (above) or south (below) of the invariable plane`]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.mercuryMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.mercuryEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.mercuryTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.mercuryTrueAnomaly-o.mercuryMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.mercuryMeanAnomaly, o.mercuryPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.mercuryTrueAnomaly, o.mercuryPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.mercuryArgumentOfPeriapsis, o.mercuryTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to planet: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(mercuryOrbitalEccentricity, o.mercuryTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(mercuryInclination, o.mercuryArgumentOfPeriapsis, o.mercuryTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
      {label : () => `Phase Angle to Earth (α)`,
       value : [ { v: () => OrbitalFormulas.phaseAngle(OrbitalFormulas.trueLongitude(o.mercuryTrueAnomaly, o.mercuryPerihelion), OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion)), dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular separation from Earth as seen from Sun: 0° = conjunction, 180° = opposition`],
       info  : 'https://en.wikipedia.org/wiki/Phase_angle_(astronomy)'},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(mercurySolarYearCount-13))*meansolaryearlengthinDays), mercuryOrbitalEccentricity, o.mercuryTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(mercurySolarYearCount-13))*meansolaryearlengthinDays), mercuryOrbitalEccentricity, o.mercuryEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(mercuryOrbitDistance * o.lengthofAU, mercuryOrbitalEccentricity, o.mercuryTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(mercurySolarYearInput, o.mercuryMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(mercurySolarYearInput, o.mercuryMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},

    {header : '—  Perihelion Precession —' },
      {label : () => `Perihelion Precession Duration against Ecliptic`,
       value : [ { v: () => mercuryPerihelionEclipticYears, dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period for perihelion to complete one full revolution relative to the ecliptic plane`],
       static: true},
      {label : () => `Perihelion Precession Duration against ICRF`,
       value : [ { v: () => OrbitalFormulas.precessionEclipticToICRF(mercuryPerihelionEclipticYears, holisticyearLength/13), dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period in the inertial ICRF frame: T_ICRF = (T_ecl × T_ref) / (T_ecl - T_ref)`],
       static: true},
      {label : () => `Perihelion precession per century`,
       value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears), dec:2, sep:',' },{ small: 'arcsec/100 yrs' }],
       hover : [`Rate = 129,600,000 / period_years arcseconds per century`],
       static: true},
      {label : () => `Holistic Precession Ratio`,
       value : [ { v: () => OrbitalFormulas.holisticPrecessionRatio(mercuryPerihelionEclipticYears, holisticyearLength), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Holistic Year to precession period: ${fmtNum(holisticyearLength,0,',')} / ${fmtNum(mercuryPerihelionEclipticYears,2,',')}`],
       static: true},
      {label : () => `Precession Angular Velocity`,
       value : [ { v: () => OrbitalFormulas.precessionAngularVelocity(OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)) * 1e9, dec:6, sep:',' },{ small: '×10⁻⁹ rad/yr' }],
       hover : [`Angular velocity: ω = (arcsec/century / 100) × (π / 648000) rad/yr`],
       static: true},
      {label : () => `Jupiter Perturbation Strength`,
       value : [ { v: () => OrbitalFormulas.perturbationStrength(mercuryOrbitDistance * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN) * 1e6, dec:4, sep:',' },{ small: '×10⁻⁶' }],
       hover : [`Newtonian perturbation: (M_Jupiter/M_Sun) × (a_Mercury/a_Jupiter)² - Jupiter's gravitational influence`]},
    ],
    venus: [
    {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (venusSolarYearCount), dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Venus orbits the Sun ${fmtNum(venusSolarYearCount,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.venusDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/venus',
       static: true},
      {label : () => `Mass (M)`,
       value : [ { v: () => fmtScientific(M_VENUS, 12) },{ small: 'kg' }],
       hover : [`Mass derived from Sun/Venus mass ratio (1:${fmtNum(MASS_RATIO_SUN_VENUS,2,',')}), originally measured via Venera and Magellan spacecraft`],
       info  : 'https://en.wikipedia.org/wiki/Venus',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_VENUS, dec:2, sep:',' },{ small: 'km³/s²' }],
       hover : [`GM = GM_SUN / mass_ratio ≈ 324,859 km³/s². Venus has no moons, so mass was determined via spacecraft tracking`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => venusTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '0' }],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => venusOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination J2000 (i)`,
       value : [ { v: () => venusOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Apparent Inclination (i)`,
       value : [ { v: () => o.venusApparentInclination, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Apparent Incl. (Souami&Souchay)`,
       value : [ { v: () => o.venusApparentInclinationSouamiSouchay, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => venusInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(venusOrbitDistance * o.lengthofAU, M_VENUS, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Region where Venus's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 1,000,000 km`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(venusOrbitDistance * o.lengthofAU, M_VENUS, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 616,000 km`]},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_VENUS) * 1000000, dec:3, sep:',' },{ small: 'mm' }],
       hover : [`r_s = 2GM/c² ≈ 7.22 mm. If Venus compressed to this size, it would become a black hole`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_VENUS, diameters.venusDiameter/2), dec:4, sep:',' },{ small: 'm/s²' }],
      hover : [`g = GM/R² ≈ 8.87 m/s². About 90% of Earth's surface gravity`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_VENUS, diameters.venusDiameter/2), dec:3, sep:',' },{ small: 'km/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 10.36 km/s. About 93% of Earth's escape velocity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_VENUS, diameters.venusDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ = 3M/(4πR³) ≈ 5,243 kg/m³. About 95% of Earth's density`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => (holisticyearLength/venusSolarYearCount), dec:6, sep:',' },{ small: 'years' }],
       hover : [`Venus's Solar orbit period in years is calculated as ${fmtNum(holisticyearLength,0,',')}/${fmtNum(venusSolarYearCount,0,',')}`],
       static: true},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => (holisticyearLength/venusSolarYearCount)*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Venus's Solar orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/${fmtNum(venusSolarYearCount,0,',')})*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => (holisticyearLength/(venusSolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Venus's Sidereal orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(venusSolarYearCount,0,',')}-13))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Synodic`,
       value : [ { v: () => (holisticyearLength/(venusSolarYearCount-holisticyearLength))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Venus's synodic period with Earth in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(venusSolarYearCount,0,',')}-${fmtNum(holisticyearLength,0,',')}))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion((holisticyearLength/(venusSolarYearCount-13))*meansolaryearlengthinDays), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`],
       static: true},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(venusOrbitDistance * o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => (venusRotationPeriod*(((holisticyearLength/venusSolarYearCount)*meansolaryearlengthinDays)*24))/((((holisticyearLength/venusSolarYearCount)*meansolaryearlengthinDays)*24)+venusRotationPeriod), dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => venusRotationPeriod, dec:6, sep:',' },{ small: 'hours' }],
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => venusOrbitDistance, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Venus distance to Sun in AU is calculated as ((${fmtNum(holisticyearLength,0,',')}/${fmtNum(venusSolarYearCount,0,',')})^2)^(1/3)`],
       static: true},
      {label : () => `Semi-major axis`,
       value : [ { v: () => venusOrbitDistance*o.lengthofAU, dec:2, sep:',' },{ small: 'km' }],
       hover : [`Venus distance to Sun in km is calculated as (((${fmtNum(holisticyearLength,0,',')}/${fmtNum(venusSolarYearCount,0,',')})^2)^(1/3))*${fmtNum(o.lengthofAU,6,',')}`]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(venusOrbitDistance, venusOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`],
       static: true},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(venusOrbitDistance, venusOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`],
       static: true},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(venusOrbitDistance, venusOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`],
       static: true},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => venus.sunDistAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Venus's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(venusOrbitDistance, venusOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`],
       static: true},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(venusOrbitDistance, venusOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`],
       static: true},
      {label : () => `PERIHELION-OF-VENUS Distance`,
       value : [ { v: () => venusPerihelionDistance/100, dec:6, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => venusSpeed, dec:6, sep:',' },{ small: 'km/h' }],
       hover : [`Venus mean speed around the sun is calculated as (${fmtNum(venusOrbitDistance*o.lengthofAU,0,',')}*2*PI)/(${fmtNum(meansolaryearlengthinDays,6,',')}*${fmtNum((holisticyearLength/venusSolarYearCount),6,',')})/24`],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(venus.sunDistAU * o.lengthofAU, venusOrbitDistance * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a)). Varies from ${fmtNum(OrbitalFormulas.perihelionVelocity(venusOrbitDistance * o.lengthofAU, venusOrbitalEccentricity) * 3600, 0, ',')} km/h at perihelion to ${fmtNum(OrbitalFormulas.aphelionVelocity(venusOrbitDistance * o.lengthofAU, venusOrbitalEccentricity) * 3600, 0, ',')} km/h at aphelion`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(venusOrbitDistance * o.lengthofAU, venusOrbitalEccentricity, o.venusTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(venusOrbitDistance * o.lengthofAU, venusOrbitalEccentricity, o.venusTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(venusOrbitDistance * o.lengthofAU, venusOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(venusOrbitDistance * o.lengthofAU, venusOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(venusOrbitalEccentricity), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`],
       static: true},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(venus.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(venus.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(venus.sunDistAU * o.lengthofAU, venusOrbitDistance * o.lengthofAU), venus.sunDistAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(venusOrbitDistance * o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(venusOrbitDistance * o.lengthofAU, venusOrbitalEccentricity), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(venusOrbitDistance * o.lengthofAU, venusOrbitalEccentricity), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => o.venusPerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.venusArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from ascending node to perihelion, measured in orbital plane: ω = ϖ - Ω`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_periapsis'},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => o.venusAscendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from vernal equinox to ascending node, measured in ecliptic plane`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node'},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => o.venusDescendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Point where orbit crosses ecliptic going south: descending node = Ω + 180°`]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.venusAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Longitude where orbit crosses the invariable plane going north`],
       info  : 'https://en.wikipedia.org/wiki/Invariable_plane'},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.venusHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Current vertical distance from the solar system's invariable plane: z = r × sin(i) × sin(u)`]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.venusAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }],
       hover : [`Whether planet is currently north (above) or south (below) of the invariable plane`]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.venusMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.venusEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.venusTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.venusTrueAnomaly-o.venusMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.venusMeanAnomaly, o.venusPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.venusTrueAnomaly, o.venusPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.venusArgumentOfPeriapsis, o.venusTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to planet: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(venusOrbitalEccentricity, o.venusTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(venusInclination, o.venusArgumentOfPeriapsis, o.venusTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
      {label : () => `Phase Angle to Earth (α)`,
       value : [ { v: () => OrbitalFormulas.phaseAngle(OrbitalFormulas.trueLongitude(o.venusTrueAnomaly, o.venusPerihelion), OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion)), dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular separation from Earth as seen from Sun: 0° = conjunction, 180° = opposition`],
       info  : 'https://en.wikipedia.org/wiki/Phase_angle_(astronomy)'},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(venusSolarYearCount-13))*meansolaryearlengthinDays), venusOrbitalEccentricity, o.venusTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(venusSolarYearCount-13))*meansolaryearlengthinDays), venusOrbitalEccentricity, o.venusEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(venusOrbitDistance * o.lengthofAU, venusOrbitalEccentricity, o.venusTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(venusSolarYearInput, o.venusMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(venusSolarYearInput, o.venusMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},

    {header : '—  Perihelion Precession —' },
      {label : () => `Perihelion Precession Duration against Ecliptic`,
       value : [ { v: () => venusPerihelionEclipticYears, dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period for perihelion to complete one full revolution relative to the ecliptic plane`],
       static: true},
      {label : () => `Perihelion Precession Duration against ICRF`,
       value : [ { v: () => OrbitalFormulas.precessionEclipticToICRF(venusPerihelionEclipticYears, holisticyearLength/13), dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period in the inertial ICRF frame: T_ICRF = (T_ecl × T_ref) / (T_ecl - T_ref)`],
       static: true},
      {label : () => `Perihelion precession per century`,
       value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(venusPerihelionEclipticYears), dec:2, sep:',' },{ small: 'arcsec/100 yrs' }],
       hover : [`Rate = 129,600,000 / period_years arcseconds per century`],
       static: true},
      {label : () => `Holistic Precession Ratio`,
       value : [ { v: () => OrbitalFormulas.holisticPrecessionRatio(venusPerihelionEclipticYears, holisticyearLength), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Holistic Year to precession period: ${fmtNum(holisticyearLength,0,',')} / ${fmtNum(venusPerihelionEclipticYears,2,',')}`],
       static: true},
      {label : () => `Precession Angular Velocity`,
       value : [ { v: () => OrbitalFormulas.precessionAngularVelocity(OrbitalFormulas.precessionRateFromPeriod(venusPerihelionEclipticYears)) * 1e9, dec:6, sep:',' },{ small: '×10⁻⁹ rad/yr' }],
       hover : [`Angular velocity: ω = (arcsec/century / 100) × (π / 648000) rad/yr`],
       static: true},
      {label : () => `Jupiter Perturbation Strength`,
       value : [ { v: () => OrbitalFormulas.perturbationStrength(venusOrbitDistance * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN) * 1e6, dec:4, sep:',' },{ small: '×10⁻⁶' }],
       hover : [`Newtonian perturbation: (M_Jupiter/M_Sun) × (a_Venus/a_Jupiter)² - Jupiter's gravitational influence`]},
      {label : () => `Precession Ratio to Mercury`,
       value : [ { v: () => OrbitalFormulas.precessionRatio(OrbitalFormulas.precessionRateFromPeriod(venusPerihelionEclipticYears), OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Venus precession rate to Mercury's rate - useful for resonance analysis`],
       static: true},
    ],

    mars: [
    {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (marsSolarYearCount), dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Mars orbits the Sun ${fmtNum(marsSolarYearCount,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.marsDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/mars',
       static: true},
      {label : () => `Mass (M)`,
       value : [ { v: () => fmtScientific(M_MARS, 12) },{ small: 'kg' }],
       hover : [`Mass derived from Sun/Mars mass ratio (1:${fmtNum(MASS_RATIO_SUN_MARS,2,',')}), measured from Phobos/Deimos orbits and spacecraft`],
       info  : 'https://en.wikipedia.org/wiki/Mars',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_MARS, dec:2, sep:',' },{ small: 'km³/s²' }],
       hover : [`GM = GM_SUN / mass_ratio ≈ 42,828 km³/s². Derived from moon orbits (Phobos, Deimos) and spacecraft tracking`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => marsTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '2' }],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => marsOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination J2000 (i)`,
       value : [ { v: () => marsOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Apparent Inclination (i)`,
       value : [ { v: () => o.marsApparentInclination, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Apparent Incl. (Souami&Souchay)`,
       value : [ { v: () => o.marsApparentInclinationSouamiSouchay, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => marsInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(marsOrbitDistance * o.lengthofAU, M_MARS, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Region where Mars's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 1,080,000 km`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(marsOrbitDistance * o.lengthofAU, M_MARS, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 577,000 km`]},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_MARS) * 1000000, dec:4, sep:',' },{ small: 'mm' }],
       hover : [`r_s = 2GM/c² ≈ 0.95 mm. If Mars compressed to this size, it would become a black hole`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_MARS, diameters.marsDiameter/2), dec:4, sep:',' },{ small: 'm/s²' }],
      hover : [`g = GM/R² ≈ 3.71 m/s². About 38% of Earth's surface gravity`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_MARS, diameters.marsDiameter/2), dec:3, sep:',' },{ small: 'km/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 5.03 km/s. About 45% of Earth's escape velocity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_MARS, diameters.marsDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ = 3M/(4πR³) ≈ 3,933 kg/m³. About 71% of Earth's density`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => (holisticyearLength/marsSolarYearCount), dec:6, sep:',' },{ small: 'years' }],
       hover : [`Mars's Solar orbit period in years is calculated as ${fmtNum(holisticyearLength,0,',')}/${fmtNum(marsSolarYearCount,0,',')}`],
       static: true},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => (holisticyearLength/marsSolarYearCount)*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Mars's Solar orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/${fmtNum(marsSolarYearCount,0,',')})*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => (holisticyearLength/(marsSolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Mars's Sidereal orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(marsSolarYearCount,0,',')}-13))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Synodic`,
       value : [ { v: () => -(holisticyearLength/(marsSolarYearCount-holisticyearLength))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Mars's synodic period with Earth in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(marsSolarYearCount,0,',')}-${fmtNum(holisticyearLength,0,',')}))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion((holisticyearLength/(marsSolarYearCount-13))*meansolaryearlengthinDays), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`],
       static: true},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(marsOrbitDistance * o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => (marsRotationPeriod*(((holisticyearLength/marsSolarYearCount)*meansolaryearlengthinDays)*24))/((((holisticyearLength/marsSolarYearCount)*meansolaryearlengthinDays)*24)-marsRotationPeriod), dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => marsRotationPeriod, dec:6, sep:',' },{ small: 'hours' }],
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => marsOrbitDistance, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Mars distance to Sun in AU is calculated as ((${fmtNum(holisticyearLength,0,',')}/${fmtNum(marsSolarYearCount,0,',')})^2)^(1/3)`],
       static: true},
      {label : () => `Semi-major axis`,
       value : [ { v: () => marsOrbitDistance*o.lengthofAU, dec:2, sep:',' },{ small: 'km' }],
       hover : [`Mars distance to Sun in km is calculated as (((${fmtNum(holisticyearLength,0,',')}/${fmtNum(marsSolarYearCount,0,',')})^2)^(1/3))*${fmtNum(o.lengthofAU,6,',')}`]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(marsOrbitDistance, marsOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`],
       static: true},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(marsOrbitDistance, marsOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`],
       static: true},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(marsOrbitDistance, marsOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`],
       static: true},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => mars.sunDistAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Mars's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(marsOrbitDistance, marsOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`],
       static: true},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(marsOrbitDistance, marsOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`],
       static: true},
      {label : () => `PERIHELION-OF-MARS Distance`,
       value : [ { v: () => marsPerihelionDistance/100, dec:6, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => marsSpeed, dec:6, sep:',' },{ small: 'km/h' }],
       hover : [`Mars mean speed around the sun is calculated as (${fmtNum(marsOrbitDistance*o.lengthofAU,0,',')}*2*PI)/(${fmtNum(meansolaryearlengthinDays,6,',')}*${fmtNum((holisticyearLength/marsSolarYearCount),6,',')})/24`],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(mars.sunDistAU * o.lengthofAU, marsOrbitDistance * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a)). Varies from ${fmtNum(OrbitalFormulas.perihelionVelocity(marsOrbitDistance * o.lengthofAU, marsOrbitalEccentricity) * 3600, 0, ',')} km/h at perihelion to ${fmtNum(OrbitalFormulas.aphelionVelocity(marsOrbitDistance * o.lengthofAU, marsOrbitalEccentricity) * 3600, 0, ',')} km/h at aphelion`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(marsOrbitDistance * o.lengthofAU, marsOrbitalEccentricity, o.marsTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(marsOrbitDistance * o.lengthofAU, marsOrbitalEccentricity, o.marsTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(marsOrbitDistance * o.lengthofAU, marsOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(marsOrbitDistance * o.lengthofAU, marsOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(marsOrbitalEccentricity), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`],
       static: true},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(mars.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(mars.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(mars.sunDistAU * o.lengthofAU, marsOrbitDistance * o.lengthofAU), mars.sunDistAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(marsOrbitDistance * o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(marsOrbitDistance * o.lengthofAU, marsOrbitalEccentricity), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(marsOrbitDistance * o.lengthofAU, marsOrbitalEccentricity), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => o.marsPerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.marsArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from ascending node to perihelion, measured in orbital plane: ω = ϖ - Ω`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_periapsis'},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => o.marsAscendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from vernal equinox to ascending node, measured in ecliptic plane`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node'},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => o.marsDescendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Point where orbit crosses ecliptic going south: descending node = Ω + 180°`]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.marsAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Longitude where orbit crosses the invariable plane going north`],
       info  : 'https://en.wikipedia.org/wiki/Invariable_plane'},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.marsHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Current vertical distance from the solar system's invariable plane: z = r × sin(i) × sin(u)`]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.marsAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }],
       hover : [`Whether planet is currently north (above) or south (below) of the invariable plane`]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.marsMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.marsEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.marsTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.marsTrueAnomaly-o.marsMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.marsMeanAnomaly, o.marsPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.marsTrueAnomaly, o.marsPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.marsArgumentOfPeriapsis, o.marsTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to planet: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(marsOrbitalEccentricity, o.marsTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(marsInclination, o.marsArgumentOfPeriapsis, o.marsTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
      {label : () => `Phase Angle to Earth (α)`,
       value : [ { v: () => OrbitalFormulas.phaseAngle(OrbitalFormulas.trueLongitude(o.marsTrueAnomaly, o.marsPerihelion), OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion)), dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular separation from Earth as seen from Sun: 0° = conjunction, 180° = opposition`],
       info  : 'https://en.wikipedia.org/wiki/Phase_angle_(astronomy)'},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(marsSolarYearCount+13))*meansolaryearlengthinDays), marsOrbitalEccentricity, o.marsTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(marsSolarYearCount+13))*meansolaryearlengthinDays), marsOrbitalEccentricity, o.marsEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(marsOrbitDistance * o.lengthofAU, marsOrbitalEccentricity, o.marsTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(marsSolarYearInput, o.marsMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(marsSolarYearInput, o.marsMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},

    {header : '—  Perihelion Precession —' },
      {label : () => `Precession Period (Ecliptic)`,
       value : [ { v: () => marsPerihelionEclipticYears, dec:2, sep:',' },{ small: 'years' }],
       hover : [`Time for Mars' perihelion to complete one 360° rotation relative to the ecliptic`],
       static: true},
      {label : () => `Holistic Resonance`,
       value : [ { v: () => OrbitalFormulas.holisticRatioDescription(OrbitalFormulas.holisticPrecessionRatio(marsPerihelionEclipticYears, holisticyearLength)) }],
       hover : [`Mars' precession is in 4:1 resonance with the Holistic Year (298,176 / 4 = 74,544 years)`],
       static: true},
      {label : () => `Precession Rate`,
       value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(marsPerihelionEclipticYears), dec:2, sep:',' },{ small: 'arcsec/century' }],
       hover : [`Mars' perihelion advances ~29 arcminutes (0.48°) per century due to planetary perturbations`],
       static: true},
      {label : () => `Precession Period (ICRF)`,
       value : [ { v: () => OrbitalFormulas.precessionEclipticToICRF(marsPerihelionEclipticYears, holisticyearLength/13), dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period relative to fixed stars - shorter because ecliptic itself precesses`],
       static: true},
      {label : () => `Jupiter Perturbation`,
       value : [ { v: () => OrbitalFormulas.perturbationStrength(marsOrbitDistance * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN) * 1e6, dec:2, sep:',' },{ small: '×10⁻⁶' }],
       hover : [`Jupiter's gravitational tug on Mars (82×10⁻⁶) - Mars feels 15× more Jupiter influence than Mercury`]},
      {label : () => `Precession vs Mercury`,
       value : [ { v: () => OrbitalFormulas.precessionRatio(OrbitalFormulas.precessionRateFromPeriod(marsPerihelionEclipticYears), OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)), dec:2, sep:',' },{ small: '× faster' }],
       hover : [`Mars precesses 3.27× faster than Mercury - closer to Jupiter means stronger perturbations`],
       static: true},
    ],

    jupiter: [
    {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (jupiterSolarYearCount), dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Jupiter orbits the Sun ${fmtNum(jupiterSolarYearCount,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.jupiterDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/jupiter',
       static: true},
      {label : () => `Mass (M)`,
       value : [ { v: () => fmtScientific(M_JUPITER, 12) },{ small: 'kg' }],
       hover : [`Mass derived from Sun/Jupiter mass ratio (1:${fmtNum(MASS_RATIO_SUN_JUPITER,4,',')}), measured from Galilean moon orbits`],
       info  : 'https://en.wikipedia.org/wiki/Jupiter',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_JUPITER, dec:0, sep:',' },{ small: 'km³/s²' }],
       hover : [`GM = GM_SUN / mass_ratio ≈ 126,686,534 km³/s². Derived from Io, Europa, Ganymede, Callisto orbits`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => jupiterTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '95' }],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => jupiterOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination J2000 (i)`,
       value : [ { v: () => jupiterOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Apparent Inclination (i)`,
       value : [ { v: () => o.jupiterApparentInclination, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Apparent Incl. (Souami&Souchay)`,
       value : [ { v: () => o.jupiterApparentInclinationSouamiSouchay, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => jupiterInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Region where Jupiter's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 53,000,000 km`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 48,200,000 km`]},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_JUPITER), dec:3, sep:',' },{ small: 'm' }],
       hover : [`r_s = 2GM/c² ≈ 2.82 m. If Jupiter compressed to this size, it would become a black hole`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_JUPITER, diameters.jupiterDiameter/2), dec:2, sep:',' },{ small: 'm/s²' }],
      hover : [`g = GM/R² ≈ 24.79 m/s². About 2.53 times Earth's surface gravity`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_JUPITER, diameters.jupiterDiameter/2), dec:2, sep:',' },{ small: 'km/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 59.5 km/s. About 5.3 times Earth's escape velocity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_JUPITER, diameters.jupiterDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ = 3M/(4πR³) ≈ 1,326 kg/m³. Only about 24% of Earth's density`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => (holisticyearLength/jupiterSolarYearCount), dec:6, sep:',' },{ small: 'years' }],
       hover : [`Jupiter's Solar orbit period in years is calculated as ${fmtNum(holisticyearLength,0,',')}/${fmtNum(jupiterSolarYearCount,0,',')}`],
       static: true},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => (holisticyearLength/jupiterSolarYearCount)*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Jupiter's Solar orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/${fmtNum(jupiterSolarYearCount,0,',')})*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => (holisticyearLength/(jupiterSolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Jupiter's Sidereal orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(jupiterSolarYearCount,0,',')}-13))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Synodic`,
       value : [ { v: () => -(holisticyearLength/(jupiterSolarYearCount-holisticyearLength))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Jupiter's synodic period with Earth in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(jupiterSolarYearCount,0,',')}-${fmtNum(holisticyearLength,0,',')}))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion((holisticyearLength/(jupiterSolarYearCount-13))*meansolaryearlengthinDays), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`],
       static: true},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(jupiterOrbitDistance * o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => (jupiterRotationPeriod*(((holisticyearLength/jupiterSolarYearCount)*meansolaryearlengthinDays)*24))/((((holisticyearLength/jupiterSolarYearCount)*meansolaryearlengthinDays)*24)-jupiterRotationPeriod), dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => jupiterRotationPeriod, dec:6, sep:',' },{ small: 'hours' }],
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => jupiterOrbitDistance, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Jupiter distance to Sun in AU is calculated as ((${fmtNum(holisticyearLength,0,',')}/${fmtNum(jupiterSolarYearCount,0,',')})^2)^(1/3)`],
       static: true},
      {label : () => `Semi-major axis`,
       value : [ { v: () => jupiterOrbitDistance*o.lengthofAU, dec:2, sep:',' },{ small: 'km' }],
       hover : [`Jupiter distance to Sun in km is calculated as (((${fmtNum(holisticyearLength,0,',')}/${fmtNum(jupiterSolarYearCount,0,',')})^2)^(1/3))*${fmtNum(o.lengthofAU,6,',')}`]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(jupiterOrbitDistance, jupiterOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`],
       static: true},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(jupiterOrbitDistance, jupiterOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`],
       static: true},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(jupiterOrbitDistance, jupiterOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`],
       static: true},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => jupiter.sunDistAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Jupiter's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(jupiterOrbitDistance, jupiterOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`],
       static: true},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(jupiterOrbitDistance, jupiterOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`],
       static: true},
      {label : () => `PERIHELION-OF-JUPITER Distance`,
       value : [ { v: () => jupiterPerihelionDistance/100, dec:6, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => jupiterSpeed, dec:6, sep:',' },{ small: 'km/h' }],
       hover : [`Jupiter mean speed around the sun is calculated as (${fmtNum(jupiterOrbitDistance*o.lengthofAU,0,',')}*2*PI)/(${fmtNum(meansolaryearlengthinDays,6,',')}*${fmtNum((holisticyearLength/jupiterSolarYearCount),6,',')})/24`],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(jupiter.sunDistAU * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a)). Varies from ${fmtNum(OrbitalFormulas.perihelionVelocity(jupiterOrbitDistance * o.lengthofAU, jupiterOrbitalEccentricity) * 3600, 0, ',')} km/h at perihelion to ${fmtNum(OrbitalFormulas.aphelionVelocity(jupiterOrbitDistance * o.lengthofAU, jupiterOrbitalEccentricity) * 3600, 0, ',')} km/h at aphelion`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(jupiterOrbitDistance * o.lengthofAU, jupiterOrbitalEccentricity, o.jupiterTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(jupiterOrbitDistance * o.lengthofAU, jupiterOrbitalEccentricity, o.jupiterTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(jupiterOrbitDistance * o.lengthofAU, jupiterOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(jupiterOrbitDistance * o.lengthofAU, jupiterOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(jupiterOrbitalEccentricity), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`],
       static: true},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(jupiter.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(jupiter.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(jupiter.sunDistAU * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU), jupiter.sunDistAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(jupiterOrbitDistance * o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(jupiterOrbitDistance * o.lengthofAU, jupiterOrbitalEccentricity), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(jupiterOrbitDistance * o.lengthofAU, jupiterOrbitalEccentricity), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => o.jupiterPerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.jupiterArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }]},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => o.jupiterAscendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => o.jupiterDescendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.jupiterAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }]},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.jupiterHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.jupiterAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.jupiterMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.jupiterEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.jupiterTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.jupiterTrueAnomaly-o.jupiterMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.jupiterMeanAnomaly, o.jupiterPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.jupiterTrueAnomaly, o.jupiterPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.jupiterArgumentOfPeriapsis, o.jupiterTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to planet: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(jupiterOrbitalEccentricity, o.jupiterTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(jupiterInclination, o.jupiterArgumentOfPeriapsis, o.jupiterTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
      {label : () => `Phase Angle to Earth (α)`,
       value : [ { v: () => OrbitalFormulas.phaseAngle(OrbitalFormulas.trueLongitude(o.jupiterTrueAnomaly, o.jupiterPerihelion), OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion)), dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular separation from Earth as seen from Sun: 0° = conjunction, 180° = opposition`],
       info  : 'https://en.wikipedia.org/wiki/Phase_angle_(astronomy)'},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(jupiterSolarYearCount+13))*meansolaryearlengthinDays), jupiterOrbitalEccentricity, o.jupiterTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(jupiterSolarYearCount+13))*meansolaryearlengthinDays), jupiterOrbitalEccentricity, o.jupiterEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(jupiterOrbitDistance * o.lengthofAU, jupiterOrbitalEccentricity, o.jupiterTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(jupiterSolarYearInput, o.jupiterMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(jupiterSolarYearInput, o.jupiterMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},

    {header : '—  Perihelion Precession —' },
      {label : () => `Perihelion Precession Duration against Ecliptic`,
       value : [ { v: () => jupiterPerihelionEclipticYears, dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period for perihelion to complete one full revolution relative to the ecliptic plane`],
       static: true},
      {label : () => `Perihelion Precession Duration against ICRF`,
       value : [ { v: () => OrbitalFormulas.precessionEclipticToICRF(jupiterPerihelionEclipticYears, holisticyearLength/13), dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period in the inertial ICRF frame: T_ICRF = (T_ecl × T_ref) / (T_ecl - T_ref)`],
       static: true},
      {label : () => `Perihelion precession per century`,
       value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(jupiterPerihelionEclipticYears), dec:2, sep:',' },{ small: 'arcsec/100 yrs' }],
       hover : [`Rate = 129,600,000 / period_years arcseconds per century`],
       static: true},
      {label : () => `Holistic Precession Ratio`,
       value : [ { v: () => OrbitalFormulas.holisticPrecessionRatio(jupiterPerihelionEclipticYears, holisticyearLength), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Holistic Year to precession period: ${fmtNum(holisticyearLength,0,',')} / ${fmtNum(jupiterPerihelionEclipticYears,2,',')}`],
       static: true},
      {label : () => `Precession Angular Velocity`,
       value : [ { v: () => OrbitalFormulas.precessionAngularVelocity(OrbitalFormulas.precessionRateFromPeriod(jupiterPerihelionEclipticYears)) * 1e9, dec:6, sep:',' },{ small: '×10⁻⁹ rad/yr' }],
       hover : [`Angular velocity: ω = (arcsec/century / 100) × (π / 648000) rad/yr`],
       static: true},
      {label : () => `Saturn Perturbation Strength`,
       value : [ { v: () => OrbitalFormulas.perturbationStrength(jupiterOrbitDistance * o.lengthofAU, saturnOrbitDistance * o.lengthofAU, M_SATURN, M_SUN) * 1e6, dec:4, sep:',' },{ small: '×10⁻⁶' }],
       hover : [`Newtonian perturbation: (M_Saturn/M_Sun) × (a_Jupiter/a_Saturn)² - Saturn's gravitational influence`]},
      {label : () => `Precession Ratio to Mercury`,
       value : [ { v: () => OrbitalFormulas.precessionRatio(OrbitalFormulas.precessionRateFromPeriod(jupiterPerihelionEclipticYears), OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Jupiter precession rate to Mercury's rate - useful for resonance analysis`],
       static: true},
    ],

    saturn: [
    {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (saturnSolarYearCount), dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Saturn orbits the Sun ${fmtNum(saturnSolarYearCount,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.saturnDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/saturn',
       static: true},
      {label : () => `Mass (M)`,
       value : [ { v: () => fmtScientific(M_SATURN, 12) },{ small: 'kg' }],
       hover : [`Mass derived from Sun/Saturn mass ratio (1:${fmtNum(MASS_RATIO_SUN_SATURN,3,',')}), measured from Titan and other moon orbits`],
       info  : 'https://en.wikipedia.org/wiki/Saturn',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_SATURN, dec:0, sep:',' },{ small: 'km³/s²' }],
       hover : [`GM = GM_SUN / mass_ratio ≈ 37,931,187 km³/s². Derived from Titan and other moon orbits`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => saturnTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '274' }],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => saturnOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination J2000 (i)`,
       value : [ { v: () => saturnOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Apparent Inclination (i)`,
       value : [ { v: () => o.saturnApparentInclination, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Apparent Incl. (Souami&Souchay)`,
       value : [ { v: () => o.saturnApparentInclinationSouamiSouchay, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => saturnInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(saturnOrbitDistance * o.lengthofAU, M_SATURN, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Region where Saturn's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 65,000,000 km`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(saturnOrbitDistance * o.lengthofAU, M_SATURN, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 54,500,000 km`]},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_SATURN) * 1000, dec:0, sep:',' },{ small: 'mm' }],
       hover : [`r_s = 2GM/c² ≈ 843 mm. If Saturn compressed to this size, it would become a black hole`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_SATURN, diameters.saturnDiameter/2), dec:2, sep:',' },{ small: 'm/s²' }],
      hover : [`g = GM/R² ≈ 10.44 m/s². About 1.07 times Earth's surface gravity`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_SATURN, diameters.saturnDiameter/2), dec:2, sep:',' },{ small: 'km/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 35.5 km/s. About 3.2 times Earth's escape velocity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_SATURN, diameters.saturnDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ = 3M/(4πR³) ≈ 687 kg/m³. Least dense planet - would float in water!`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => (holisticyearLength/saturnSolarYearCount), dec:6, sep:',' },{ small: 'years' }],
       hover : [`Saturn's Solar orbit period in years is calculated as ${fmtNum(holisticyearLength,0,',')}/${fmtNum(saturnSolarYearCount,0,',')}`],
       static: true},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => (holisticyearLength/saturnSolarYearCount)*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Saturn's Solar orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/${fmtNum(saturnSolarYearCount,0,',')})*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => (holisticyearLength/(saturnSolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Saturn's Sidereal orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(saturnSolarYearCount,0,',')}-13))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Synodic`,
       value : [ { v: () => -(holisticyearLength/(saturnSolarYearCount-holisticyearLength))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Saturn's synodic period with Earth in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(saturnSolarYearCount,0,',')}-${fmtNum(holisticyearLength,0,',')}))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion((holisticyearLength/(saturnSolarYearCount-13))*meansolaryearlengthinDays), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`],
       static: true},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(saturnOrbitDistance * o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => (saturnRotationPeriod*(((holisticyearLength/saturnSolarYearCount)*meansolaryearlengthinDays)*24))/((((holisticyearLength/saturnSolarYearCount)*meansolaryearlengthinDays)*24)-saturnRotationPeriod), dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => saturnRotationPeriod, dec:6, sep:',' },{ small: 'hours' }],
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => saturnOrbitDistance, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Saturn distance to Sun in AU is calculated as ((${fmtNum(holisticyearLength,0,',')}/${fmtNum(saturnSolarYearCount,0,',')})^2)^(1/3)`],
       static: true},
      {label : () => `Semi-major axis`,
       value : [ { v: () => saturnOrbitDistance*o.lengthofAU, dec:2, sep:',' },{ small: 'km' }],
       hover : [`Saturn distance to Sun in km is calculated as (((${fmtNum(holisticyearLength,0,',')}/${fmtNum(saturnSolarYearCount,0,',')})^2)^(1/3))*${fmtNum(o.lengthofAU,6,',')}`]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(saturnOrbitDistance, saturnOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`],
       static: true},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(saturnOrbitDistance, saturnOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`],
       static: true},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(saturnOrbitDistance, saturnOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`],
       static: true},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => saturn.sunDistAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Saturn's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(saturnOrbitDistance, saturnOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`],
       static: true},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(saturnOrbitDistance, saturnOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`],
       static: true},
      {label : () => `PERIHELION-OF-SATURN Distance`,
       value : [ { v: () => saturnPerihelionDistance/100, dec:6, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => saturnSpeed, dec:6, sep:',' },{ small: 'km/h' }],
       hover : [`Saturn mean speed around the sun is calculated as (${fmtNum(saturnOrbitDistance*o.lengthofAU,0,',')}*2*PI)/(${fmtNum(meansolaryearlengthinDays,6,',')}*${fmtNum((holisticyearLength/saturnSolarYearCount),6,',')})/24`],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(saturn.sunDistAU * o.lengthofAU, saturnOrbitDistance * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a)). Varies from ${fmtNum(OrbitalFormulas.perihelionVelocity(saturnOrbitDistance * o.lengthofAU, saturnOrbitalEccentricity) * 3600, 0, ',')} km/h at perihelion to ${fmtNum(OrbitalFormulas.aphelionVelocity(saturnOrbitDistance * o.lengthofAU, saturnOrbitalEccentricity) * 3600, 0, ',')} km/h at aphelion`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(saturnOrbitDistance * o.lengthofAU, saturnOrbitalEccentricity, o.saturnTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(saturnOrbitDistance * o.lengthofAU, saturnOrbitalEccentricity, o.saturnTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(saturnOrbitDistance * o.lengthofAU, saturnOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(saturnOrbitDistance * o.lengthofAU, saturnOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(saturnOrbitalEccentricity), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`],
       static: true},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(saturn.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(saturn.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(saturn.sunDistAU * o.lengthofAU, saturnOrbitDistance * o.lengthofAU), saturn.sunDistAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(saturnOrbitDistance * o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(saturnOrbitDistance * o.lengthofAU, saturnOrbitalEccentricity), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(saturnOrbitDistance * o.lengthofAU, saturnOrbitalEccentricity), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => o.saturnPerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.saturnArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from ascending node to perihelion, measured in orbital plane: ω = ϖ - Ω`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_periapsis'},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => o.saturnAscendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from vernal equinox to ascending node, measured in ecliptic plane`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node'},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => o.saturnDescendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Point where orbit crosses ecliptic going south: descending node = Ω + 180°`]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.saturnAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Longitude where orbit crosses the invariable plane going north`],
       info  : 'https://en.wikipedia.org/wiki/Invariable_plane'},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.saturnHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Current vertical distance from the solar system's invariable plane: z = r × sin(i) × sin(u)`]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.saturnAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }],
       hover : [`Whether planet is currently north (above) or south (below) of the invariable plane`]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.saturnMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.saturnEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.saturnTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.saturnTrueAnomaly-o.saturnMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.saturnMeanAnomaly, o.saturnPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.saturnTrueAnomaly, o.saturnPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.saturnArgumentOfPeriapsis, o.saturnTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to planet: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(saturnOrbitalEccentricity, o.saturnTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(saturnInclination, o.saturnArgumentOfPeriapsis, o.saturnTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
      {label : () => `Phase Angle to Earth (α)`,
       value : [ { v: () => OrbitalFormulas.phaseAngle(OrbitalFormulas.trueLongitude(o.saturnTrueAnomaly, o.saturnPerihelion), OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion)), dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular separation from Earth as seen from Sun: 0° = conjunction, 180° = opposition`],
       info  : 'https://en.wikipedia.org/wiki/Phase_angle_(astronomy)'},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(saturnSolarYearCount+13))*meansolaryearlengthinDays), saturnOrbitalEccentricity, o.saturnTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(saturnSolarYearCount+13))*meansolaryearlengthinDays), saturnOrbitalEccentricity, o.saturnEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(saturnOrbitDistance * o.lengthofAU, saturnOrbitalEccentricity, o.saturnTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(saturnSolarYearInput, o.saturnMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(saturnSolarYearInput, o.saturnMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},

    {header : '—  Perihelion Precession —' },
      {label : () => `Perihelion Precession Duration against Ecliptic`,
       value : [ { v: () => saturnPerihelionEclipticYears, dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period for perihelion to complete one full revolution relative to the ecliptic plane`],
       static: true},
      {label : () => `Perihelion Precession Duration against ICRF`,
       value : [ { v: () => OrbitalFormulas.precessionEclipticToICRF(saturnPerihelionEclipticYears, holisticyearLength/13), dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period in the inertial ICRF frame: T_ICRF = (T_ecl × T_ref) / (T_ecl - T_ref)`],
       static: true},
      {label : () => `Perihelion precession per century`,
       value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(saturnPerihelionEclipticYears), dec:2, sep:',' },{ small: 'arcsec/100 yrs' }],
       hover : [`Rate = 129,600,000 / period_years arcseconds per century`],
       static: true},
      {label : () => `Holistic Precession Ratio`,
       value : [ { v: () => OrbitalFormulas.holisticPrecessionRatio(saturnPerihelionEclipticYears, holisticyearLength), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Holistic Year to precession period: ${fmtNum(holisticyearLength,0,',')} / ${fmtNum(saturnPerihelionEclipticYears,2,',')}`],
       static: true},
      {label : () => `Precession Angular Velocity`,
       value : [ { v: () => OrbitalFormulas.precessionAngularVelocity(OrbitalFormulas.precessionRateFromPeriod(saturnPerihelionEclipticYears)) * 1e9, dec:6, sep:',' },{ small: '×10⁻⁹ rad/yr' }],
       hover : [`Angular velocity: ω = (arcsec/century / 100) × (π / 648000) rad/yr`],
       static: true},
      {label : () => `Jupiter Perturbation Strength`,
       value : [ { v: () => OrbitalFormulas.perturbationStrength(saturnOrbitDistance * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN) * 1e6, dec:4, sep:',' },{ small: '×10⁻⁶' }],
       hover : [`Newtonian perturbation: (M_Jupiter/M_Sun) × (a_Jupiter/a_Saturn)² - Jupiter's gravitational influence`]},
      {label : () => `Precession Ratio to Mercury`,
       value : [ { v: () => OrbitalFormulas.precessionRatio(OrbitalFormulas.precessionRateFromPeriod(saturnPerihelionEclipticYears), OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Saturn precession rate to Mercury's rate - useful for resonance analysis`],
       static: true},
    ],

    uranus: [
    {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (uranusSolarYearCount), dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Uranus orbits the Sun ${fmtNum(uranusSolarYearCount,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.uranusDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/uranus',
       static: true},
      {label : () => `Mass (M)`,
       value : [ { v: () => fmtScientific(M_URANUS, 12) },{ small: 'kg' }],
       hover : [`Mass derived from Sun/Uranus mass ratio (1:${fmtNum(MASS_RATIO_SUN_URANUS,2,',')}), measured from moon orbits (Titania, Oberon, etc.)`],
       info  : 'https://en.wikipedia.org/wiki/Uranus',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_URANUS, dec:0, sep:',' },{ small: 'km³/s²' }],
       hover : [`GM = GM_SUN / mass_ratio ≈ 5,793,939 km³/s². Derived from Uranian moon orbits`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => uranusTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '28' }],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => uranusOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination J2000 (i)`,
       value : [ { v: () => uranusOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Apparent Inclination (i)`,
       value : [ { v: () => o.uranusApparentInclination, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Apparent Incl. (Souami&Souchay)`,
       value : [ { v: () => o.uranusApparentInclinationSouamiSouchay, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => uranusInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(uranusOrbitDistance * o.lengthofAU, M_URANUS, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Region where Uranus's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 70,000,000 km`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(uranusOrbitDistance * o.lengthofAU, M_URANUS, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 51,800,000 km`]},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_URANUS) * 1000, dec:0, sep:',' },{ small: 'mm' }],
       hover : [`r_s = 2GM/c² ≈ 129 mm. If Uranus compressed to this size, it would become a black hole`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_URANUS, diameters.uranusDiameter/2), dec:2, sep:',' },{ small: 'm/s²' }],
      hover : [`g = GM/R² ≈ 8.87 m/s². About 90% of Earth's surface gravity`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_URANUS, diameters.uranusDiameter/2), dec:2, sep:',' },{ small: 'km/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 21.3 km/s. About 1.9 times Earth's escape velocity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_URANUS, diameters.uranusDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ = 3M/(4πR³) ≈ 1,271 kg/m³. About 23% of Earth's density`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => (holisticyearLength/uranusSolarYearCount), dec:6, sep:',' },{ small: 'years' }],
       hover : [`Uranus's Solar orbit period in years is calculated as ${fmtNum(holisticyearLength,0,',')}/${fmtNum(uranusSolarYearCount,0,',')}`],
       static: true},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => (holisticyearLength/uranusSolarYearCount)*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Uranus's Solar orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/${fmtNum(uranusSolarYearCount,0,',')})*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => (holisticyearLength/(uranusSolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Uranus's Sidereal orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(uranusSolarYearCount,0,',')}-13))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Synodic`,
       value : [ { v: () => -(holisticyearLength/(uranusSolarYearCount-holisticyearLength))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Uranus's synodic period with Earth in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(uranusSolarYearCount,0,',')}-${fmtNum(holisticyearLength,0,'),')}))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion((holisticyearLength/(uranusSolarYearCount-13))*meansolaryearlengthinDays), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`],
       static: true},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(uranusOrbitDistance * o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => (uranusRotationPeriod*(((holisticyearLength/uranusSolarYearCount)*meansolaryearlengthinDays)*24))/((((holisticyearLength/uranusSolarYearCount)*meansolaryearlengthinDays)*24)+uranusRotationPeriod), dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => uranusRotationPeriod, dec:6, sep:',' },{ small: 'hours' }],
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => uranusOrbitDistance, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Uranus distance to Sun in AU is calculated as ((${fmtNum(holisticyearLength,0,',')}/${fmtNum(uranusSolarYearCount,0,',')})^2)^(1/3)`],
       static: true},
      {label : () => `Semi-major axis`,
       value : [ { v: () => uranusOrbitDistance*o.lengthofAU, dec:2, sep:',' },{ small: 'km' }],
       hover : [`Uranus distance to Sun in km is calculated as (((${fmtNum(holisticyearLength,0,',')}/${fmtNum(uranusSolarYearCount,0,',')})^2)^(1/3))*${fmtNum(o.lengthofAU,6,',')}`]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(uranusOrbitDistance, uranusOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`],
       static: true},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(uranusOrbitDistance, uranusOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`],
       static: true},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(uranusOrbitDistance, uranusOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`],
       static: true},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => uranus.sunDistAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Uranus's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(uranusOrbitDistance, uranusOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`],
       static: true},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(uranusOrbitDistance, uranusOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`],
       static: true},
      {label : () => `PERIHELION-OF-URANUS Distance`,
       value : [ { v: () => uranusPerihelionDistance/100, dec:6, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => uranusSpeed, dec:6, sep:',' },{ small: 'km/h' }],
       hover : [`Uranus mean speed around the sun is calculated as (${fmtNum(uranusOrbitDistance*o.lengthofAU,0,',')}*2*PI)/(${fmtNum(meansolaryearlengthinDays,6,',')}*${fmtNum((holisticyearLength/uranusSolarYearCount),6,',')})/24`],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(uranus.sunDistAU * o.lengthofAU, uranusOrbitDistance * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a)). Varies from ${fmtNum(OrbitalFormulas.perihelionVelocity(uranusOrbitDistance * o.lengthofAU, uranusOrbitalEccentricity) * 3600, 0, ',')} km/h at perihelion to ${fmtNum(OrbitalFormulas.aphelionVelocity(uranusOrbitDistance * o.lengthofAU, uranusOrbitalEccentricity) * 3600, 0, ',')} km/h at aphelion`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(uranusOrbitDistance * o.lengthofAU, uranusOrbitalEccentricity, o.uranusTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(uranusOrbitDistance * o.lengthofAU, uranusOrbitalEccentricity, o.uranusTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(uranusOrbitDistance * o.lengthofAU, uranusOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(uranusOrbitDistance * o.lengthofAU, uranusOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(uranusOrbitalEccentricity), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`],
       static: true},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(uranus.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(uranus.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(uranus.sunDistAU * o.lengthofAU, uranusOrbitDistance * o.lengthofAU), uranus.sunDistAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(uranusOrbitDistance * o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(uranusOrbitDistance * o.lengthofAU, uranusOrbitalEccentricity), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(uranusOrbitDistance * o.lengthofAU, uranusOrbitalEccentricity), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => o.uranusPerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.uranusArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from ascending node to perihelion, measured in orbital plane: ω = ϖ - Ω`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_periapsis'},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => o.uranusAscendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from vernal equinox to ascending node, measured in ecliptic plane`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node'},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => o.uranusDescendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Point where orbit crosses ecliptic going south: descending node = Ω + 180°`]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.uranusAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Longitude where orbit crosses the invariable plane going north`],
       info  : 'https://en.wikipedia.org/wiki/Invariable_plane'},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.uranusHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Current vertical distance from the solar system's invariable plane: z = r × sin(i) × sin(u)`]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.uranusAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }],
       hover : [`Whether planet is currently north (above) or south (below) of the invariable plane`]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.uranusMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.uranusEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.uranusTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.uranusTrueAnomaly-o.uranusMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.uranusMeanAnomaly, o.uranusPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.uranusTrueAnomaly, o.uranusPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.uranusArgumentOfPeriapsis, o.uranusTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to planet: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(uranusOrbitalEccentricity, o.uranusTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(uranusInclination, o.uranusArgumentOfPeriapsis, o.uranusTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
      {label : () => `Phase Angle to Earth (α)`,
       value : [ { v: () => OrbitalFormulas.phaseAngle(OrbitalFormulas.trueLongitude(o.uranusTrueAnomaly, o.uranusPerihelion), OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion)), dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular separation from Earth as seen from Sun: 0° = conjunction, 180° = opposition`],
       info  : 'https://en.wikipedia.org/wiki/Phase_angle_(astronomy)'},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(uranusSolarYearCount+13))*meansolaryearlengthinDays), uranusOrbitalEccentricity, o.uranusTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(uranusSolarYearCount+13))*meansolaryearlengthinDays), uranusOrbitalEccentricity, o.uranusEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(uranusOrbitDistance * o.lengthofAU, uranusOrbitalEccentricity, o.uranusTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(uranusSolarYearInput, o.uranusMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(uranusSolarYearInput, o.uranusMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},

    {header : '—  Perihelion Precession —' },
      {label : () => `Perihelion Precession Duration against Ecliptic`,
       value : [ { v: () => uranusPerihelionEclipticYears, dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period for perihelion to complete one full revolution relative to the ecliptic plane`],
       static: true},
      {label : () => `Perihelion Precession Duration against ICRF`,
       value : [ { v: () => OrbitalFormulas.precessionEclipticToICRF(uranusPerihelionEclipticYears, holisticyearLength/13), dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period in the inertial ICRF frame: T_ICRF = (T_ecl × T_ref) / (T_ecl - T_ref)`],
       static: true},
      {label : () => `Perihelion precession per century`,
       value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(uranusPerihelionEclipticYears), dec:2, sep:',' },{ small: 'arcsec/100 yrs' }],
       hover : [`Rate = 129,600,000 / period_years arcseconds per century`],
       static: true},
      {label : () => `Holistic Precession Ratio`,
       value : [ { v: () => OrbitalFormulas.holisticPrecessionRatio(uranusPerihelionEclipticYears, holisticyearLength), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Holistic Year to precession period: ${fmtNum(holisticyearLength,0,',')} / ${fmtNum(uranusPerihelionEclipticYears,2,',')}`],
       static: true},
      {label : () => `Precession Angular Velocity`,
       value : [ { v: () => OrbitalFormulas.precessionAngularVelocity(OrbitalFormulas.precessionRateFromPeriod(uranusPerihelionEclipticYears)) * 1e9, dec:6, sep:',' },{ small: '×10⁻⁹ rad/yr' }],
       hover : [`Angular velocity: ω = (arcsec/century / 100) × (π / 648000) rad/yr`],
       static: true},
      {label : () => `Jupiter Perturbation Strength`,
       value : [ { v: () => OrbitalFormulas.perturbationStrength(uranusOrbitDistance * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN) * 1e6, dec:4, sep:',' },{ small: '×10⁻⁶' }],
       hover : [`Newtonian perturbation: (M_Jupiter/M_Sun) × (a_Jupiter/a_Uranus)² - Jupiter's gravitational influence`]},
      {label : () => `Precession Ratio to Mercury`,
       value : [ { v: () => OrbitalFormulas.precessionRatio(OrbitalFormulas.precessionRateFromPeriod(uranusPerihelionEclipticYears), OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Uranus precession rate to Mercury's rate - useful for resonance analysis`],
       static: true},
    ],

    neptune: [
    {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (neptuneSolarYearCount), dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Neptune orbits the Sun ${fmtNum(neptuneSolarYearCount,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.neptuneDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/neptune',
       static: true},
      {label : () => `Mass (M)`,
       value : [ { v: () => fmtScientific(M_NEPTUNE, 12) },{ small: 'kg' }],
       hover : [`Mass derived from Sun/Neptune mass ratio (1:${fmtNum(MASS_RATIO_SUN_NEPTUNE,2,',')}), measured from Triton orbit and Voyager 2`],
       info  : 'https://en.wikipedia.org/wiki/Neptune',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_NEPTUNE, dec:0, sep:',' },{ small: 'km³/s²' }],
       hover : [`GM = GM_SUN / mass_ratio ≈ 6,836,529 km³/s². Derived from Triton orbit and Voyager 2 flyby`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => neptuneTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '16' }],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => neptuneOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination J2000 (i)`,
       value : [ { v: () => neptuneOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Apparent Inclination (i)`,
       value : [ { v: () => o.neptuneApparentInclination, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Apparent Incl. (Souami&Souchay)`,
       value : [ { v: () => o.neptuneApparentInclinationSouamiSouchay, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => neptuneInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(neptuneOrbitDistance * o.lengthofAU, M_NEPTUNE, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Region where Neptune's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 116,000,000 km`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(neptuneOrbitDistance * o.lengthofAU, M_NEPTUNE, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 86,800,000 km`]},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_NEPTUNE) * 1000, dec:0, sep:',' },{ small: 'mm' }],
       hover : [`r_s = 2GM/c² ≈ 152 mm. If Neptune compressed to this size, it would become a black hole`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_NEPTUNE, diameters.neptuneDiameter/2), dec:2, sep:',' },{ small: 'm/s²' }],
      hover : [`g = GM/R² ≈ 11.15 m/s². About 1.14 times Earth's surface gravity`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_NEPTUNE, diameters.neptuneDiameter/2), dec:2, sep:',' },{ small: 'km/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 23.5 km/s. About 2.1 times Earth's escape velocity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_NEPTUNE, diameters.neptuneDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ = 3M/(4πR³) ≈ 1,638 kg/m³. About 30% of Earth's density`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => (holisticyearLength/neptuneSolarYearCount), dec:6, sep:',' },{ small: 'years' }],
       hover : [`Neptune's Solar orbit period in years is calculated as ${fmtNum(holisticyearLength,0,',')}/${fmtNum(neptuneSolarYearCount,0,',')}`],
       static: true},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => (holisticyearLength/neptuneSolarYearCount)*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Neptune's Solar orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/${fmtNum(neptuneSolarYearCount,0,',')})*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => (holisticyearLength/(neptuneSolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Neptune's Sidereal orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(neptuneSolarYearCount,0,',')}-13))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Synodic`,
       value : [ { v: () => -(holisticyearLength/(neptuneSolarYearCount-holisticyearLength))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Neptune's synodic period with Earth in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(neptuneSolarYearCount,0,',')}-${fmtNum(holisticyearLength,0,',')}))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion((holisticyearLength/(neptuneSolarYearCount-13))*meansolaryearlengthinDays), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`],
       static: true},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(neptuneOrbitDistance * o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => (neptuneRotationPeriod*(((holisticyearLength/neptuneSolarYearCount)*meansolaryearlengthinDays)*24))/((((holisticyearLength/neptuneSolarYearCount)*meansolaryearlengthinDays)*24)-neptuneRotationPeriod), dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => neptuneRotationPeriod, dec:6, sep:',' },{ small: 'hours' }],
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => neptuneOrbitDistance, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Neptune distance to Sun in AU is calculated as ((${fmtNum(holisticyearLength,0,',')}/${fmtNum(neptuneSolarYearCount,0,',')})^2)^(1/3)`],
       static: true},
      {label : () => `Semi-major axis`,
       value : [ { v: () => neptuneOrbitDistance*o.lengthofAU, dec:2, sep:',' },{ small: 'km' }],
       hover : [`Neptune distance to Sun in km is calculated as (((${fmtNum(holisticyearLength,0,',')}/${fmtNum(neptuneSolarYearCount,0,',')})^2)^(1/3))*${fmtNum(o.lengthofAU,6,',')}`]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(neptuneOrbitDistance, neptuneOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`],
       static: true},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(neptuneOrbitDistance, neptuneOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`],
       static: true},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(neptuneOrbitDistance, neptuneOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`],
       static: true},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => neptune.sunDistAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Neptune's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(neptuneOrbitDistance, neptuneOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`],
       static: true},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(neptuneOrbitDistance, neptuneOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`],
       static: true},
      {label : () => `PERIHELION-OF-NEPTUNE Distance`,
       value : [ { v: () => neptunePerihelionDistance/100, dec:6, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => neptuneSpeed, dec:6, sep:',' },{ small: 'km/h' }],
       hover : [`Neptune mean speed around the sun is calculated as (${fmtNum(neptuneOrbitDistance*o.lengthofAU,0,',')}*2*PI)/(${fmtNum(meansolaryearlengthinDays,6,',')}*${fmtNum((holisticyearLength/neptuneSolarYearCount),6,',')})/24`],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(neptune.sunDistAU * o.lengthofAU, neptuneOrbitDistance * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a)). Varies from ${fmtNum(OrbitalFormulas.perihelionVelocity(neptuneOrbitDistance * o.lengthofAU, neptuneOrbitalEccentricity) * 3600, 0, ',')} km/h at perihelion to ${fmtNum(OrbitalFormulas.aphelionVelocity(neptuneOrbitDistance * o.lengthofAU, neptuneOrbitalEccentricity) * 3600, 0, ',')} km/h at aphelion`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(neptuneOrbitDistance * o.lengthofAU, neptuneOrbitalEccentricity, o.neptuneTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(neptuneOrbitDistance * o.lengthofAU, neptuneOrbitalEccentricity, o.neptuneTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(neptuneOrbitDistance * o.lengthofAU, neptuneOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(neptuneOrbitDistance * o.lengthofAU, neptuneOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(neptuneOrbitalEccentricity), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`],
       static: true},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(neptune.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(neptune.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(neptune.sunDistAU * o.lengthofAU, neptuneOrbitDistance * o.lengthofAU), neptune.sunDistAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(neptuneOrbitDistance * o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(neptuneOrbitDistance * o.lengthofAU, neptuneOrbitalEccentricity), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(neptuneOrbitDistance * o.lengthofAU, neptuneOrbitalEccentricity), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => o.neptunePerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.neptuneArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from ascending node to perihelion, measured in orbital plane: ω = ϖ - Ω`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_periapsis'},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => o.neptuneAscendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from vernal equinox to ascending node, measured in ecliptic plane`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node'},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => o.neptuneDescendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Point where orbit crosses ecliptic going south: descending node = Ω + 180°`]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.neptuneAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Longitude where orbit crosses the invariable plane going north`],
       info  : 'https://en.wikipedia.org/wiki/Invariable_plane'},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.neptuneHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Current vertical distance from the solar system's invariable plane: z = r × sin(i) × sin(u)`]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.neptuneAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }],
       hover : [`Whether planet is currently north (above) or south (below) of the invariable plane`]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.neptuneMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.neptuneEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.neptuneTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.neptuneTrueAnomaly-o.neptuneMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.neptuneMeanAnomaly, o.neptunePerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.neptuneTrueAnomaly, o.neptunePerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.neptuneArgumentOfPeriapsis, o.neptuneTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to planet: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(neptuneOrbitalEccentricity, o.neptuneTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(neptuneInclination, o.neptuneArgumentOfPeriapsis, o.neptuneTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
      {label : () => `Phase Angle to Earth (α)`,
       value : [ { v: () => OrbitalFormulas.phaseAngle(OrbitalFormulas.trueLongitude(o.neptuneTrueAnomaly, o.neptunePerihelion), OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion)), dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular separation from Earth as seen from Sun: 0° = conjunction, 180° = opposition`],
       info  : 'https://en.wikipedia.org/wiki/Phase_angle_(astronomy)'},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(neptuneSolarYearCount+13))*meansolaryearlengthinDays), neptuneOrbitalEccentricity, o.neptuneTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(neptuneSolarYearCount+13))*meansolaryearlengthinDays), neptuneOrbitalEccentricity, o.neptuneEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(neptuneOrbitDistance * o.lengthofAU, neptuneOrbitalEccentricity, o.neptuneTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(neptuneSolarYearInput, o.neptuneMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(neptuneSolarYearInput, o.neptuneMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},

    {header : '—  Perihelion Precession —' },
      {label : () => `Perihelion Precession Duration against Ecliptic`,
       value : [ { v: () => neptunePerihelionEclipticYears, dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period for perihelion to complete one full revolution relative to the ecliptic plane`],
       static: true},
      {label : () => `Perihelion Precession Duration against ICRF`,
       value : [ { v: () => OrbitalFormulas.precessionEclipticToICRF(neptunePerihelionEclipticYears, holisticyearLength/13), dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period in the inertial ICRF frame: T_ICRF = (T_ecl × T_ref) / (T_ecl - T_ref)`],
       static: true},
      {label : () => `Perihelion precession per century`,
       value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(neptunePerihelionEclipticYears), dec:2, sep:',' },{ small: 'arcsec/100 yrs' }],
       hover : [`Rate = 129,600,000 / period_years arcseconds per century`],
       static: true},
      {label : () => `Holistic Precession Ratio`,
       value : [ { v: () => OrbitalFormulas.holisticPrecessionRatio(neptunePerihelionEclipticYears, holisticyearLength), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Holistic Year to precession period: ${fmtNum(holisticyearLength,0,',')} / ${fmtNum(neptunePerihelionEclipticYears,2,',')}`],
       static: true},
      {label : () => `Precession Angular Velocity`,
       value : [ { v: () => OrbitalFormulas.precessionAngularVelocity(OrbitalFormulas.precessionRateFromPeriod(neptunePerihelionEclipticYears)) * 1e9, dec:6, sep:',' },{ small: '×10⁻⁹ rad/yr' }],
       hover : [`Angular velocity: ω = (arcsec/century / 100) × (π / 648000) rad/yr`],
       static: true},
      {label : () => `Jupiter Perturbation Strength`,
       value : [ { v: () => OrbitalFormulas.perturbationStrength(neptuneOrbitDistance * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN) * 1e6, dec:4, sep:',' },{ small: '×10⁻⁶' }],
       hover : [`Newtonian perturbation: (M_Jupiter/M_Sun) × (a_Jupiter/a_Neptune)² - Jupiter's gravitational influence`]},
      {label : () => `Precession Ratio to Mercury`,
       value : [ { v: () => OrbitalFormulas.precessionRatio(OrbitalFormulas.precessionRateFromPeriod(neptunePerihelionEclipticYears), OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Neptune precession rate to Mercury's rate - useful for resonance analysis`],
       static: true},
    ],
    pluto: [
    {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (plutoSolarYearCount), dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Pluto orbits the Sun ${fmtNum(plutoSolarYearCount,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.plutoDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/pluto',
       static: true},
      {label : () => `Mass (M)`,
       value : [ { v: () => fmtScientific(M_PLUTO, 12) },{ small: 'kg' }],
       hover : [`Mass derived from Sun/Pluto mass ratio (1:${fmtNum(MASS_RATIO_SUN_PLUTO,0,',')}), measured from Charon's orbit (binary system)`],
       info  : 'https://en.wikipedia.org/wiki/Pluto',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => GM_PLUTO, dec:2, sep:',' },{ small: 'km³/s²' }],
       hover : [`GM = GM_SUN / mass_ratio ≈ 982 km³/s². Derived from Charon's orbit - Pluto-Charon is a binary system`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => plutoTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '5' }],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => plutoOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination J2000 (i)`,
       value : [ { v: () => plutoOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Apparent Inclination (i)`,
       value : [ { v: () => o.plutoApparentInclination, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Apparent Incl. (Souami&Souchay)`,
       value : [ { v: () => o.plutoApparentInclinationSouamiSouchay, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => plutoInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(plutoOrbitDistance * o.lengthofAU, M_PLUTO, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Region where Pluto's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 6,000,000 km`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(plutoOrbitDistance * o.lengthofAU, M_PLUTO, M_SUN), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 3,100,000 km`]},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_PLUTO) * 1e9, dec:3, sep:',' },{ small: 'nm' }],
       hover : [`r_s = 2GM/c² ≈ 22 nm. Pluto is so small its Schwarzschild radius is measured in nanometers`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_PLUTO, diameters.plutoDiameter/2), dec:4, sep:',' },{ small: 'm/s²' }],
      hover : [`g = GM/R² ≈ 0.62 m/s². Only about 6.3% of Earth's surface gravity`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_PLUTO, diameters.plutoDiameter/2), dec:3, sep:',' },{ small: 'km/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 1.21 km/s. Only about 11% of Earth's escape velocity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_PLUTO, diameters.plutoDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ = 3M/(4πR³) ≈ 1,854 kg/m³. About 34% of Earth's density`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => (holisticyearLength/plutoSolarYearCount), dec:6, sep:',' },{ small: 'years' }],
       hover : [`Pluto's Solar orbit period in years is calculated as ${fmtNum(holisticyearLength,0,',')}/${fmtNum(plutoSolarYearCount,0,',')}`],
       static: true},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => (holisticyearLength/plutoSolarYearCount)*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Pluto's Solar orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/${fmtNum(plutoSolarYearCount,0,',')})*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => (holisticyearLength/(plutoSolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Pluto's Sidereal orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(plutoSolarYearCount,0,',')}-13))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Synodic`,
       value : [ { v: () => -(holisticyearLength/(plutoSolarYearCount-holisticyearLength))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Pluto's synodic period with Earth in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(plutoSolarYearCount,0,',')}-${fmtNum(holisticyearLength,0,',')}))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion((holisticyearLength/(plutoSolarYearCount-13))*meansolaryearlengthinDays), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`],
       static: true},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(plutoOrbitDistance * o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => (plutoRotationPeriod*(((holisticyearLength/plutoSolarYearCount)*meansolaryearlengthinDays)*24))/((((holisticyearLength/plutoSolarYearCount)*meansolaryearlengthinDays)*24)-plutoRotationPeriod), dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => plutoRotationPeriod, dec:6, sep:',' },{ small: 'hours' }],
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => plutoOrbitDistance, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Pluto distance to Sun in AU is calculated as ((${fmtNum(holisticyearLength,0,',')}/${fmtNum(plutoSolarYearCount,0,',')})^2)^(1/3)`],
       static: true},
      {label : () => `Semi-major axis`,
       value : [ { v: () => plutoOrbitDistance*o.lengthofAU, dec:2, sep:',' },{ small: 'km' }],
       hover : [`Pluto distance to Sun in km is calculated as (((${fmtNum(holisticyearLength,0,',')}/${fmtNum(plutoSolarYearCount,0,',')})^2)^(1/3))*${fmtNum(o.lengthofAU,6,',')}`]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(plutoOrbitDistance, plutoOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`],
       static: true},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(plutoOrbitDistance, plutoOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`],
       static: true},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(plutoOrbitDistance, plutoOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`],
       static: true},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => pluto.sunDistAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Pluto's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(plutoOrbitDistance, plutoOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`],
       static: true},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(plutoOrbitDistance, plutoOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`],
       static: true},
      {label : () => `PERIHELION-OF-PLUTO Distance`,
       value : [ { v: () => plutoPerihelionDistance/100, dec:6, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => plutoSpeed, dec:6, sep:',' },{ small: 'km/h' }],
       hover : [`Pluto mean speed around the sun is calculated as (${fmtNum(plutoOrbitDistance*o.lengthofAU,0,',')}*2*PI)/(${fmtNum(meansolaryearlengthinDays,6,',')}*${fmtNum((holisticyearLength/plutoSolarYearCount),6,',')})/24`],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(pluto.sunDistAU * o.lengthofAU, plutoOrbitDistance * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a)). Varies from ${fmtNum(OrbitalFormulas.perihelionVelocity(plutoOrbitDistance * o.lengthofAU, plutoOrbitalEccentricity) * 3600, 0, ',')} km/h at perihelion to ${fmtNum(OrbitalFormulas.aphelionVelocity(plutoOrbitDistance * o.lengthofAU, plutoOrbitalEccentricity) * 3600, 0, ',')} km/h at aphelion`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(plutoOrbitDistance * o.lengthofAU, plutoOrbitalEccentricity, o.plutoTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(plutoOrbitDistance * o.lengthofAU, plutoOrbitalEccentricity, o.plutoTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(plutoOrbitDistance * o.lengthofAU, plutoOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(plutoOrbitDistance * o.lengthofAU, plutoOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(plutoOrbitalEccentricity), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`],
       static: true},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(pluto.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(pluto.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(pluto.sunDistAU * o.lengthofAU, plutoOrbitDistance * o.lengthofAU), pluto.sunDistAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(plutoOrbitDistance * o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(plutoOrbitDistance * o.lengthofAU, plutoOrbitalEccentricity), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(plutoOrbitDistance * o.lengthofAU, plutoOrbitalEccentricity), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => o.plutoPerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.plutoArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from ascending node to perihelion, measured in orbital plane: ω = ϖ - Ω`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_periapsis'},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => o.plutoAscendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from vernal equinox to ascending node, measured in ecliptic plane`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node'},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => o.plutoDescendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Point where orbit crosses ecliptic going south: descending node = Ω + 180°`]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.plutoAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Longitude where orbit crosses the invariable plane going north`],
       info  : 'https://en.wikipedia.org/wiki/Invariable_plane'},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.plutoHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Current vertical distance from the solar system's invariable plane: z = r × sin(i) × sin(u)`]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.plutoAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }],
       hover : [`Whether dwarf planet is currently north (above) or south (below) of the invariable plane`]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.plutoMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.plutoEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.plutoTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.plutoTrueAnomaly-o.plutoMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.plutoMeanAnomaly, o.plutoPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.plutoTrueAnomaly, o.plutoPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.plutoArgumentOfPeriapsis, o.plutoTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to planet: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(plutoOrbitalEccentricity, o.plutoTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(plutoInclination, o.plutoArgumentOfPeriapsis, o.plutoTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
      {label : () => `Phase Angle to Earth (α)`,
       value : [ { v: () => OrbitalFormulas.phaseAngle(OrbitalFormulas.trueLongitude(o.plutoTrueAnomaly, o.plutoPerihelion), OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion)), dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular separation from Earth as seen from Sun: 0° = conjunction, 180° = opposition`],
       info  : 'https://en.wikipedia.org/wiki/Phase_angle_(astronomy)'},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(plutoSolarYearCount+13))*meansolaryearlengthinDays), plutoOrbitalEccentricity, o.plutoTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(plutoSolarYearCount+13))*meansolaryearlengthinDays), plutoOrbitalEccentricity, o.plutoEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(plutoOrbitDistance * o.lengthofAU, plutoOrbitalEccentricity, o.plutoTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(plutoSolarYearInput, o.plutoMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(plutoSolarYearInput, o.plutoMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},

    {header : '—  Perihelion Precession —' },
      {label : () => `Perihelion Precession Duration against Ecliptic`,
       value : [ { v: () => plutoPerihelionEclipticYears, dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period for perihelion to complete one full revolution relative to the ecliptic plane`],
       static: true},
      {label : () => `Perihelion Precession Duration against ICRF`,
       value : [ { v: () => OrbitalFormulas.precessionEclipticToICRF(plutoPerihelionEclipticYears, holisticyearLength/13), dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period in the inertial ICRF frame: T_ICRF = (T_ecl × T_ref) / (T_ecl - T_ref)`],
       static: true},
      {label : () => `Perihelion precession per century`,
       value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(plutoPerihelionEclipticYears), dec:2, sep:',' },{ small: 'arcsec/100 yrs' }],
       hover : [`Rate = 129,600,000 / period_years arcseconds per century`],
       static: true},
      {label : () => `Holistic Precession Ratio`,
       value : [ { v: () => OrbitalFormulas.holisticPrecessionRatio(plutoPerihelionEclipticYears, holisticyearLength), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Holistic Year to precession period: ${fmtNum(holisticyearLength,0,',')} / ${fmtNum(plutoPerihelionEclipticYears,2,',')}`],
       static: true},
      {label : () => `Precession Angular Velocity`,
       value : [ { v: () => OrbitalFormulas.precessionAngularVelocity(OrbitalFormulas.precessionRateFromPeriod(plutoPerihelionEclipticYears)) * 1e9, dec:6, sep:',' },{ small: '×10⁻⁹ rad/yr' }],
       hover : [`Angular velocity: ω = (arcsec/century / 100) × (π / 648000) rad/yr`],
       static: true},
      {label : () => `Jupiter Perturbation Strength`,
       value : [ { v: () => OrbitalFormulas.perturbationStrength(plutoOrbitDistance * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN) * 1e6, dec:4, sep:',' },{ small: '×10⁻⁶' }],
       hover : [`Newtonian perturbation: (M_Jupiter/M_Sun) × (a_Jupiter/a_Pluto)² - Jupiter's gravitational influence`]},
      {label : () => `Precession Ratio to Mercury`,
       value : [ { v: () => OrbitalFormulas.precessionRatio(OrbitalFormulas.precessionRateFromPeriod(plutoPerihelionEclipticYears), OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Pluto precession rate to Mercury's rate - useful for resonance analysis`],
       static: true},
    ],
    halleys: [
    {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (halleysSolarYearCount), dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Halleys orbits the Sun ${fmtNum(halleysSolarYearCount,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.halleysDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/Halley%27s_Comet',
       static: true},
      {label : () => `Mass (M)`,
       value : [ { v: () => fmtScientific(M_HALLEYS, 12) },{ small: 'kg' }],
       hover : [`Mass estimated from size (~11×8×8 km) and assumed density (~0.6 g/cm³). No spacecraft has orbited Halley's`],
       info  : 'https://en.wikipedia.org/wiki/Halley%27s_Comet',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => fmtScientific(GM_HALLEYS, 6) },{ small: 'km³/s²' }],
       hover : [`GM ≈ 1.47 × 10⁻⁵ km³/s². Estimated - no spacecraft has orbited to measure directly`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => halleysTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '0' }],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => halleysOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination J2000 (i)`,
       value : [ { v: () => halleysOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Apparent Inclination (i)`,
       value : [ { v: () => o.halleysApparentInclination, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Apparent Incl. (Souami&Souchay)`,
       value : [ { v: () => o.halleysApparentInclinationSouamiSouchay, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => halleysInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(halleysOrbitDistance * o.lengthofAU, M_HALLEYS, M_SUN), dec:0, sep:',' },{ small: 'm' }],
       hover : [`Region where Halley's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 360 m. Comet's gravity is extremely weak`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(halleysOrbitDistance * o.lengthofAU, M_HALLEYS, M_SUN), dec:0, sep:',' },{ small: 'm' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 320 m`]},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_HALLEYS) * 1e15, dec:3, sep:',' },{ small: 'fm' }],
       hover : [`r_s = 2GM/c² ≈ 0.33 femtometers. Halley's is so small its Schwarzschild radius is subatomic`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_HALLEYS, diameters.halleysDiameter/2) * 1000, dec:4, sep:',' },{ small: 'mm/s²' }],
      hover : [`g = GM/R² ≈ 0.5 mm/s². Negligible gravity - you could jump off the comet`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_HALLEYS, diameters.halleysDiameter/2) * 1000, dec:3, sep:',' },{ small: 'm/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 2 m/s. Walking speed would escape Halley's gravity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_HALLEYS, diameters.halleysDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ ≈ 600 kg/m³. Very porous - less dense than water (ice and dust)`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => (holisticyearLength/halleysSolarYearCount), dec:6, sep:',' },{ small: 'years' }],
       hover : [`Halleys's Solar orbit period in years is calculated as ${fmtNum(holisticyearLength,0,',')}/${fmtNum(halleysSolarYearCount,0,',')}`],
       static: true},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => (holisticyearLength/halleysSolarYearCount)*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Halleys's Solar orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/${fmtNum(halleysSolarYearCount,0,',')})*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => (holisticyearLength/(halleysSolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Halleys's Sidereal orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(halleysSolarYearCount,0,',')}-13))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Synodic`,
       value : [ { v: () => -(holisticyearLength/(halleysSolarYearCount-holisticyearLength))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Halleys's synodic period with Earth in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(halleysSolarYearCount,0,',')}-${fmtNum(holisticyearLength,0,',')}))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion((holisticyearLength/(halleysSolarYearCount-13))*meansolaryearlengthinDays), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`],
       static: true},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(halleysOrbitDistance * o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => (halleysRotationPeriod*(((holisticyearLength/halleysSolarYearCount)*meansolaryearlengthinDays)*24))/((((holisticyearLength/halleysSolarYearCount)*meansolaryearlengthinDays)*24)-halleysRotationPeriod), dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => halleysRotationPeriod, dec:6, sep:',' },{ small: 'hours' }],
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => halleysOrbitDistance, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Halleys distance to Sun in AU is calculated as ((${fmtNum(holisticyearLength,0,',')}/${fmtNum(halleysSolarYearCount,0,',')})^2)^(1/3)`],
       static: true},
      {label : () => `Semi-major axis`,
       value : [ { v: () => halleysOrbitDistance*o.lengthofAU, dec:2, sep:',' },{ small: 'km' }],
       hover : [`Halleys distance to Sun in km is calculated as (((${fmtNum(holisticyearLength,0,',')}/${fmtNum(halleysSolarYearCount,0,',')})^2)^(1/3))*${fmtNum(o.lengthofAU,6,',')}`]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(halleysOrbitDistance, halleysOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`],
       static: true},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(halleysOrbitDistance, halleysOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`],
       static: true},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(halleysOrbitDistance, halleysOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`],
       static: true},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => halleys.sunDistAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Halley's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(halleysOrbitDistance, halleysOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`],
       static: true},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(halleysOrbitDistance, halleysOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`],
       static: true},
      {label : () => `PERIHELION-OF-HALLEYS Distance`,
       value : [ { v: () => halleysPerihelionDistance/100, dec:6, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => halleysSpeed, dec:6, sep:',' },{ small: 'km/h' }],
       hover : [`Halleys mean speed around the sun is calculated as (${fmtNum(halleysOrbitDistance*o.lengthofAU,0,',')}*2*PI)/(${fmtNum(meansolaryearlengthinDays,6,',')}*${fmtNum((holisticyearLength/halleysSolarYearCount),6,',')})/24`],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(halleys.sunDistAU * o.lengthofAU, halleysOrbitDistance * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a)). Varies from ${fmtNum(OrbitalFormulas.perihelionVelocity(halleysOrbitDistance * o.lengthofAU, halleysOrbitalEccentricity) * 3600, 0, ',')} km/h at perihelion to ${fmtNum(OrbitalFormulas.aphelionVelocity(halleysOrbitDistance * o.lengthofAU, halleysOrbitalEccentricity) * 3600, 0, ',')} km/h at aphelion`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(halleysOrbitDistance * o.lengthofAU, halleysOrbitalEccentricity, o.halleysTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(halleysOrbitDistance * o.lengthofAU, halleysOrbitalEccentricity, o.halleysTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(halleysOrbitDistance * o.lengthofAU, halleysOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(halleysOrbitDistance * o.lengthofAU, halleysOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(halleysOrbitalEccentricity), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`],
       static: true},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(halleys.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(halleys.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(halleys.sunDistAU * o.lengthofAU, halleysOrbitDistance * o.lengthofAU), halleys.sunDistAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(halleysOrbitDistance * o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(halleysOrbitDistance * o.lengthofAU, halleysOrbitalEccentricity), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(halleysOrbitDistance * o.lengthofAU, halleysOrbitalEccentricity), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => o.halleysPerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.halleysArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from ascending node to perihelion, measured in orbital plane: ω = ϖ - Ω`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_periapsis'},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => o.halleysAscendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from vernal equinox to ascending node, measured in ecliptic plane`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node'},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => o.halleysDescendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Point where orbit crosses ecliptic going south: descending node = Ω + 180°`]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.halleysAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Longitude where orbit crosses the invariable plane going north`],
       info  : 'https://en.wikipedia.org/wiki/Invariable_plane'},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.halleysHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Current vertical distance from the solar system's invariable plane: z = r × sin(i) × sin(u)`]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.halleysAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }],
       hover : [`Whether comet is currently north (above) or south (below) of the invariable plane`]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.halleysMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.halleysEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.halleysTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.halleysTrueAnomaly-o.halleysMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.halleysMeanAnomaly, o.halleysPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.halleysTrueAnomaly, o.halleysPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.halleysArgumentOfPeriapsis, o.halleysTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to comet: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(halleysOrbitalEccentricity, o.halleysTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(halleysInclination, o.halleysArgumentOfPeriapsis, o.halleysTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
      {label : () => `Phase Angle to Earth (α)`,
       value : [ { v: () => OrbitalFormulas.phaseAngle(OrbitalFormulas.trueLongitude(o.halleysTrueAnomaly, o.halleysPerihelion), OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion)), dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular separation from Earth as seen from Sun: 0° = conjunction, 180° = opposition`],
       info  : 'https://en.wikipedia.org/wiki/Phase_angle_(astronomy)'},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(halleysSolarYearCount+13))*meansolaryearlengthinDays), halleysOrbitalEccentricity, o.halleysTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(halleysSolarYearCount+13))*meansolaryearlengthinDays), halleysOrbitalEccentricity, o.halleysEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(halleysOrbitDistance * o.lengthofAU, halleysOrbitalEccentricity, o.halleysTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(halleysSolarYearInput, o.halleysMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(halleysSolarYearInput, o.halleysMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},

    {header : '—  Perihelion Precession —' },
      {label : () => `Perihelion Precession Duration against Ecliptic`,
       value : [ { v: () => halleysPerihelionEclipticYears, dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period for perihelion to complete one full revolution relative to the ecliptic plane`],
       static: true},
      {label : () => `Perihelion Precession Duration against ICRF`,
       value : [ { v: () => OrbitalFormulas.precessionEclipticToICRF(halleysPerihelionEclipticYears, holisticyearLength/13), dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period in the inertial ICRF frame: T_ICRF = (T_ecl × T_ref) / (T_ecl - T_ref)`],
       static: true},
      {label : () => `Perihelion precession per century`,
       value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(halleysPerihelionEclipticYears), dec:2, sep:',' },{ small: 'arcsec/100 yrs' }],
       hover : [`Rate = 129,600,000 / period_years arcseconds per century`],
       static: true},
      {label : () => `Holistic Precession Ratio`,
       value : [ { v: () => OrbitalFormulas.holisticPrecessionRatio(halleysPerihelionEclipticYears, holisticyearLength), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Holistic Year to precession period: ${fmtNum(holisticyearLength,0,',')} / ${fmtNum(halleysPerihelionEclipticYears,2,',')}`],
       static: true},
      {label : () => `Precession Angular Velocity`,
       value : [ { v: () => OrbitalFormulas.precessionAngularVelocity(OrbitalFormulas.precessionRateFromPeriod(halleysPerihelionEclipticYears)) * 1e9, dec:6, sep:',' },{ small: '×10⁻⁹ rad/yr' }],
       hover : [`Angular velocity: ω = (arcsec/century / 100) × (π / 648000) rad/yr`],
       static: true},
      {label : () => `Jupiter Perturbation Strength`,
       value : [ { v: () => OrbitalFormulas.perturbationStrength(halleysOrbitDistance * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN) * 1e6, dec:4, sep:',' },{ small: '×10⁻⁶' }],
       hover : [`Newtonian perturbation: (M_Jupiter/M_Sun) × (a_Halley's/a_Jupiter)² - Jupiter's gravitational influence`]},
      {label : () => `Precession Ratio to Mercury`,
       value : [ { v: () => OrbitalFormulas.precessionRatio(OrbitalFormulas.precessionRateFromPeriod(halleysPerihelionEclipticYears), OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Halley's precession rate to Mercury's rate - useful for resonance analysis`],
       static: true},
    ],
    eros: [
    {header : '—  General Characteristics —' },
      {label : () => `Length of Holistic-Year`,
       value : [ { v: () => (holisticyearLength), dec:0, sep:',' },{ small: 'years' }],
       hover : [`The length of the Holistic-Year is ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
      {label : () => `Number of orbits in a Holistic-Year`,
       value : [ { v: () => (erosSolarYearCount), dec:0, sep:',' },{ small: 'orbits' }],
       hover : [`Eros orbits the Sun ${fmtNum(erosSolarYearCount,0,',')} times in ${fmtNum(holisticyearLength,0,',')} Earth solar years`],
       static: true},
    null,
      {label : () => `Size diameter`,
       value : [ { v: () => diameters.erosDiameter, dec:2, sep:',' },{ small: 'km' }],
       info  : 'https://en.wikipedia.org/wiki/433_Eros',
       static: true},
      {label : () => `Mass (M)`,
       value : [ { v: () => fmtScientific(M_EROS, 12) },{ small: 'kg' }],
       hover : [`Mass precisely measured by NEAR Shoemaker spacecraft which orbited Eros in 2000-2001`],
       info  : 'https://en.wikipedia.org/wiki/433_Eros',
       static: true},
      {label : () => `Gravitational parameter (GM)`,
       value : [ { v: () => fmtScientific(GM_EROS, 6) },{ small: 'km³/s²' }],
       hover : [`GM ≈ 4.46 × 10⁻⁴ km³/s². Precisely measured by NEAR Shoemaker spacecraft`],
       static: true},
      {label : () => `Axial tilt`,
       value : [ { v: () => erosTilt, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Number of Moons`,
       value : [ '',{ small: '0' }],
       static: true},
    null,
      {label : () => `Orbital Eccentricity (e)`,
       value : [ { v: () => erosOrbitalEccentricity, dec:6, sep:',' },{ small: '' }],
       static: true},
      {label : () => `Orbital Inclination J2000 (i)`,
       value : [ { v: () => erosOrbitalInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},
      {label : () => `Apparent Inclination (i)`,
       value : [ { v: () => o.erosApparentInclination, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Apparent Incl. (Souami&Souchay)`,
       value : [ { v: () => o.erosApparentInclinationSouamiSouchay, dec:6, sep:',' },{ small: 'degrees (°)' }]},
      {label : () => `Inclination to the Invariable plane`,
       value : [ { v: () => erosInclination, dec:6, sep:',' },{ small: 'degrees (°)' }],
       static: true},

    {header : '—  Gravitational Influence Zones —' },
      {label : () => `Hill Sphere (r_Hill)`,
       value : [ { v: () => OrbitalFormulas.hillSphereRadius(erosOrbitDistance * o.lengthofAU, M_EROS, M_SUN), dec:0, sep:',' },{ small: 'm' }],
       hover : [`Region where Eros's gravity dominates: r_Hill = a × (m/3M)^(1/3) ≈ 1,000 m. Asteroid's gravity is very weak`]},
      {label : () => `Sphere of Influence (r_SOI)`,
       value : [ { v: () => OrbitalFormulas.sphereOfInfluence(erosOrbitDistance * o.lengthofAU, M_EROS, M_SUN), dec:0, sep:',' },{ small: 'm' }],
       hover : [`Laplace SOI: r_SOI = a × (m/M)^(2/5) ≈ 500 m`]},
      {label : () => `Schwarzschild Radius (r_s)`,
       value : [ { v: () => OrbitalFormulas.schwarzschildRadius(GM_EROS) * 1e15, dec:3, sep:',' },{ small: 'fm' }],
       hover : [`r_s = 2GM/c² ≈ 9.9 femtometers. Precisely measured by NEAR Shoemaker spacecraft`],
       static: true},

    {header : '—  Surface & Physical Properties —' },
     {label : () => `Surface Gravity (g)`,
      value : [ { v: () => OrbitalFormulas.surfaceGravity(GM_EROS, diameters.erosDiameter/2) * 1000, dec:4, sep:',' },{ small: 'mm/s²' }],
      hover : [`g = GM/R² ≈ 6 mm/s². Precisely measured by NEAR Shoemaker - you could easily jump off Eros`],
      static: true},
     {label : () => `Surface Escape Velocity`,
      value : [ { v: () => OrbitalFormulas.surfaceEscapeVelocity(GM_EROS, diameters.erosDiameter/2) * 1000, dec:3, sep:',' },{ small: 'm/s' }],
      hover : [`v_esc = √(2GM/R) ≈ 10 m/s. A good throw would escape Eros's gravity`],
      static: true},
     {label : () => `Mean Density (ρ)`,
      value : [ { v: () => OrbitalFormulas.meanDensity(M_EROS, diameters.erosDiameter/2), dec:0, sep:',' },{ small: 'kg/m³' }],
      hover : [`ρ ≈ 2,670 kg/m³. About half of Earth's density - typical for S-type asteroids`],
      static: true},

    {header : '—  Orbital Period & Motion —' },
      {label : () => `Orbital period (P)`,
       value : [ { v: () => (holisticyearLength/erosSolarYearCount), dec:6, sep:',' },{ small: 'years' }],
       hover : [`Eros's Solar orbit period in years is calculated as ${fmtNum(holisticyearLength,0,',')}/${fmtNum(erosSolarYearCount,0,',')}`],
       static: true},
      {label : () => `Orbit Period Solar`,
       value : [ { v: () => (holisticyearLength/erosSolarYearCount)*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Eros's Solar orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/${fmtNum(erosSolarYearCount,0,',')})*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Sidereal`,
       value : [ { v: () => (holisticyearLength/(erosSolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Eros's Sidereal orbit period in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(erosSolarYearCount,0,',')}-13))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Orbit Period Synodic`,
       value : [ { v: () => -(holisticyearLength/(erosSolarYearCount-holisticyearLength))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }],
       hover : [`Eros's synodic period with Earth in days is calculated as (${fmtNum(holisticyearLength,0,',')}/(${fmtNum(erosSolarYearCount,0,',')}-${fmtNum(holisticyearLength,0,',')}))*${fmtNum(meansolaryearlengthinDays,6,',')}`],
       static: true},
      {label : () => `Mean Motion (n)`,
       value : [ { v: () => OrbitalFormulas.meanMotion((holisticyearLength/(erosSolarYearCount-13))*meansolaryearlengthinDays), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Mean angular motion: n = 360°/P. Rate at which mean anomaly increases`],
       static: true},
      {label : () => `Period (Kepler verification)`,
       value : [ { v: () => OrbitalFormulas.keplerPeriod(erosOrbitDistance * o.lengthofAU), dec:6, sep:',' },{ small: 'days' }],
       hover : [`Kepler's 3rd Law: P = 2π√(a³/GM). Should match sidereal period`]},
    null,
      {label : () => `Length of Day`,
       value : [ { v: () => (erosRotationPeriod*(((holisticyearLength/erosSolarYearCount)*meansolaryearlengthinDays)*24))/((((holisticyearLength/erosSolarYearCount)*meansolaryearlengthinDays)*24)-erosRotationPeriod), dec:6, sep:',' }, { small : 'hours' }]},
      {label : () => `Length of Sidereal Day`,
       value : [ { v: () => erosRotationPeriod, dec:6, sep:',' },{ small: 'hours' }],
       static: true},

    {header : '—  Orbital Shape & Geometry —' },
      {label : () => `Semi-major axis (a)`,
       value : [ { v: () => erosOrbitDistance, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Eros distance to Sun in AU is calculated as ((${fmtNum(holisticyearLength,0,',')}/${fmtNum(erosSolarYearCount,0,',')})^2)^(1/3)`],
       static: true},
      {label : () => `Semi-major axis`,
       value : [ { v: () => erosOrbitDistance*o.lengthofAU, dec:2, sep:',' },{ small: 'km' }],
       hover : [`Eros distance to Sun in km is calculated as (((${fmtNum(holisticyearLength,0,',')}/${fmtNum(erosSolarYearCount,0,',')})^2)^(1/3))*${fmtNum(o.lengthofAU,6,',')}`]},
      {label : () => `Semi-minor axis (b)`,
       value : [ { v: () => OrbitalFormulas.semiMinorAxis(erosOrbitDistance, erosOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Half-width of orbital ellipse: b = a × √(1-e²)`],
       static: true},
    null,
      {label : () => `Perihelion distance (q)`,
       value : [ { v: () => OrbitalFormulas.perihelionDist(erosOrbitDistance, erosOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Closest approach to Sun: q = a(1-e)`],
       static: true},
      {label : () => `Aphelion distance (Q)`,
       value : [ { v: () => OrbitalFormulas.aphelionDist(erosOrbitDistance, erosOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Farthest distance from Sun: Q = a(1+e)`],
       static: true},
      {label : () => `Current distance from Sun (r)`,
       value : [ { v: () => eros.sunDistAU, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Eros's current heliocentric distance`]},
    null,
      {label : () => `Semi-latus rectum (p)`,
       value : [ { v: () => OrbitalFormulas.semiLatusRectum(erosOrbitDistance, erosOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Orbital radius at true anomaly = 90°: p = a × (1-e²)`],
       static: true},
      {label : () => `Focal distance (c)`,
       value : [ { v: () => OrbitalFormulas.focalDistance(erosOrbitDistance, erosOrbitalEccentricity), dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Distance from ellipse center to focus (Sun): c = a × e`],
       static: true},
      {label : () => `PERIHELION-OF-EROS Distance`,
       value : [ { v: () => erosPerihelionDistance/100, dec:6, sep:',' },{ small: 'AU' }],
       static: true},

    {header : '—  Velocities —' },
      {label : () => `Mean orbital speed`,
       value : [ { v: () => erosSpeed, dec:6, sep:',' },{ small: 'km/h' }],
       hover : [`Eros mean speed around the sun is calculated as (${fmtNum(erosOrbitDistance*o.lengthofAU,0,',')}*2*PI)/(${fmtNum(meansolaryearlengthinDays,6,',')}*${fmtNum((holisticyearLength/erosSolarYearCount),6,',')})/24`],
       static: true},
      {label : () => `Current orbital velocity`,
       value : [ { v: () => OrbitalFormulas.orbitalVelocity(eros.sunDistAU * o.lengthofAU, erosOrbitDistance * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Instantaneous velocity from vis-viva equation: v = √(GM(2/r - 1/a)). Varies from ${fmtNum(OrbitalFormulas.perihelionVelocity(erosOrbitDistance * o.lengthofAU, erosOrbitalEccentricity) * 3600, 0, ',')} km/h at perihelion to ${fmtNum(OrbitalFormulas.aphelionVelocity(erosOrbitDistance * o.lengthofAU, erosOrbitalEccentricity) * 3600, 0, ',')} km/h at aphelion`]},
    null,
      {label : () => `Radial velocity (vᵣ)`,
       value : [ { v: () => OrbitalFormulas.radialVelocity(erosOrbitDistance * o.lengthofAU, erosOrbitalEccentricity, o.erosTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component toward/away from Sun: vᵣ = √(GM/p) × e × sin(ν). Positive = moving away, negative = approaching`]},
      {label : () => `Transverse velocity (vₜ)`,
       value : [ { v: () => OrbitalFormulas.transverseVelocity(erosOrbitDistance * o.lengthofAU, erosOrbitalEccentricity, o.erosTrueAnomaly) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity component perpendicular to radius: vₜ = √(GM/p) × (1 + e × cos(ν)). Always positive`]},
    null,
      {label : () => `Perihelion velocity (vₚ)`,
       value : [ { v: () => OrbitalFormulas.perihelionVelocity(erosOrbitDistance * o.lengthofAU, erosOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Maximum orbital velocity at perihelion: vₚ = √(GM/a) × √((1+e)/(1-e))`]},
      {label : () => `Aphelion velocity (vₐ)`,
       value : [ { v: () => OrbitalFormulas.aphelionVelocity(erosOrbitDistance * o.lengthofAU, erosOrbitalEccentricity) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum orbital velocity at aphelion: vₐ = √(GM/a) × √((1-e)/(1+e))`]},
      {label : () => `Velocity ratio (vₚ/vₐ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatioPeriApo(erosOrbitalEccentricity), dec:4, sep:',' },{ small: '' }],
       hover : [`Perihelion vs aphelion velocity ratio: (1+e)/(1-e). Shows how much faster at perihelion`],
       static: true},
    null,
      {label : () => `Escape velocity (v_esc)`,
       value : [ { v: () => OrbitalFormulas.escapeVelocity(eros.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Minimum velocity to escape Sun's gravity from current position: v_esc = √(2GM/r)`]},
      {label : () => `Circular velocity (v_circ)`,
       value : [ { v: () => OrbitalFormulas.circularVelocity(eros.sunDistAU * o.lengthofAU) * 3600, dec:2, sep:',' },{ small: 'km/h' }],
       hover : [`Velocity needed for circular orbit at current distance: v_circ = √(GM/r)`]},
      {label : () => `Velocity ratio (v/v_circ)`,
       value : [ { v: () => OrbitalFormulas.velocityRatio(OrbitalFormulas.orbitalVelocity(eros.sunDistAU * o.lengthofAU, erosOrbitDistance * o.lengthofAU), eros.sunDistAU * o.lengthofAU), dec:4, sep:',' },{ small: '' }],
       hover : [`Current velocity vs circular: >1 near perihelion, <1 near aphelion, =√2 at escape`]},

    {header : '—  Energy & Momentum —' },
      {label : () => `Specific Orbital Energy (ε)`,
       value : [ { v: () => OrbitalFormulas.specificEnergy(erosOrbitDistance * o.lengthofAU), dec:4, sep:',' },{ small: 'km²/s²' }],
       hover : [`Total mechanical energy per unit mass: ε = -GM/(2a). Negative for bound orbits`]},
      {label : () => `Specific Angular Momentum (h)`,
       value : [ { v: () => OrbitalFormulas.specificAngularMomentum(erosOrbitDistance * o.lengthofAU, erosOrbitalEccentricity), dec:2, sep:',' },{ small: 'km²/s' }],
       hover : [`Angular momentum per unit mass: h = √(GM × a × (1-e²)). Constant throughout orbit`]},
      {label : () => `Area Sweep Rate (dA/dt)`,
       value : [ { v: () => OrbitalFormulas.areaSweepRate(erosOrbitDistance * o.lengthofAU, erosOrbitalEccentricity), dec:0, sep:',' },{ small: 'km²/s' }],
       hover : [`Kepler's 2nd Law: dA/dt = h/2. Constant rate - equal areas in equal times`]},

    {header : '—  Orbital Orientation —' },
      {label : () => `Longitude of perihelion (ϖ)`,
       value : [ { v: () => o.erosPerihelion, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Sum of longitude of ascending node (Ω) and argument of periapsis (ω): ϖ = Ω + ω`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_periapsis'},
      {label : () => `Argument of periapsis (ω)`,
       value : [ { v: () => o.erosArgumentOfPeriapsis, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from ascending node to perihelion, measured in orbital plane: ω = ϖ - Ω`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_periapsis'},
    null,
      {label : () => `Longitude of ascending node (Ω)`,
       value : [ { v: () => o.erosAscendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle from vernal equinox to ascending node, measured in ecliptic plane`],
       info  : 'https://en.wikipedia.org/wiki/Longitude_of_the_ascending_node'},
      {label : () => `Longitude of descending node`,
       value : [ { v: () => o.erosDescendingNode, dec:8, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Point where orbit crosses ecliptic going south: descending node = Ω + 180°`]},
      {label : () => `Ascending Node on Inv. Plane (Ω)`,
       value : [ { v: () => o.erosAscendingNodeInvPlane, dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Longitude where orbit crosses the invariable plane going north`],
       info  : 'https://en.wikipedia.org/wiki/Invariable_plane'},
    null,
      {label : () => `Height above Invariable Plane`,
       value : [ { v: () => o.erosHeightAboveInvPlane, dec:6, sep:',' },{ small: 'AU' }],
       hover : [`Current vertical distance from the solar system's invariable plane: z = r × sin(i) × sin(u)`]},
      {label : () => `Position relative to Inv. Plane`,
       value : [ { v: () => o.erosAboveInvPlane ? 'ABOVE' : 'BELOW' },{ small: '' }],
       hover : [`Whether asteroid is currently north (above) or south (below) of the invariable plane`]},

    {header : '—  Position & Anomalies —' },
      {label : () => `Mean Anomaly (M)`,
       value : [ { v: () => o.erosMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular position assuming uniform circular motion from perihelion: M = n × t`],
       info  : 'https://en.wikipedia.org/wiki/Mean_anomaly'},
      {label : () => `Eccentric Anomaly (E)`,
       value : [ { v: () => o.erosEccentricAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle at ellipse center from Kepler's equation: M = E - e×sin(E)`],
       info  : 'https://en.wikipedia.org/wiki/Eccentric_anomaly'},
      {label : () => `True Anomaly (ν)`,
       value : [ { v: () => o.erosTrueAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Actual angular position from perihelion as seen from Sun`],
       info  : 'https://en.wikipedia.org/wiki/True_anomaly'},
      {label : () => `Equation of the Center`,
       value : [ { v: () => o.erosTrueAnomaly-o.erosMeanAnomaly, dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Difference between true and mean anomaly: ν - M. Maximum at quadrature points`],
       info  : 'https://en.wikipedia.org/wiki/Equation_of_the_center'},
    null,
      {label : () => `Mean Longitude (L)`,
       value : [ { v: () => OrbitalFormulas.meanLongitude(o.erosMeanAnomaly, o.erosPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Mean ecliptic longitude: L = M + ϖ (mean anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/Mean_longitude'},
      {label : () => `True Longitude (λ)`,
       value : [ { v: () => OrbitalFormulas.trueLongitude(o.erosTrueAnomaly, o.erosPerihelion), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Ecliptic longitude: λ = ν + ϖ (true anomaly + longitude of perihelion)`],
       info  : 'https://en.wikipedia.org/wiki/True_longitude'},
      {label : () => `Argument of Latitude (u)`,
       value : [ { v: () => OrbitalFormulas.argumentOfLatitude(o.erosArgumentOfPeriapsis, o.erosTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle in orbital plane from ascending node to asteroid: u = ω + ν`],
       info  : 'https://en.wikipedia.org/wiki/Argument_of_latitude'},
    null,
      {label : () => `Flight Path Angle (γ)`,
       value : [ { v: () => OrbitalFormulas.flightPathAngle(erosOrbitalEccentricity, o.erosTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angle between velocity vector and local horizontal: tan(γ) = e·sin(ν) / (1 + e·cos(ν))`],
       info  : 'https://en.wikipedia.org/wiki/Flight_path_angle'},
      {label : () => `Heliocentric Latitude (β)`,
       value : [ { v: () => OrbitalFormulas.heliocentricLatitude(erosInclination, o.erosArgumentOfPeriapsis, o.erosTrueAnomaly), dec:4, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular distance above/below invariable plane: sin(β) = sin(i) × sin(u)`]},
      {label : () => `Phase Angle to Earth (α)`,
       value : [ { v: () => OrbitalFormulas.phaseAngle(OrbitalFormulas.trueLongitude(o.erosTrueAnomaly, o.erosPerihelion), OrbitalFormulas.trueLongitude(o.earthTrueAnomaly, o.earthPerihelion)), dec:2, sep:',' },{ small: 'degrees (°)' }],
       hover : [`Angular separation from Earth as seen from Sun: 0° = conjunction, 180° = opposition`],
       info  : 'https://en.wikipedia.org/wiki/Phase_angle_(astronomy)'},
    null,
      {label : () => `True Anomaly Rate (dν/dt)`,
       value : [ { v: () => OrbitalFormulas.trueAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(erosSolarYearCount-13))*meansolaryearlengthinDays), erosOrbitalEccentricity, o.erosTrueAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of true anomaly: dν/dt = n(1+e·cos(ν))²/(1-e²)^1.5. Fastest at perihelion`]},
      {label : () => `Eccentric Anomaly Rate (dE/dt)`,
       value : [ { v: () => OrbitalFormulas.eccentricAnomalyRate(OrbitalFormulas.meanMotion((holisticyearLength/(erosSolarYearCount-13))*meansolaryearlengthinDays), erosOrbitalEccentricity, o.erosEccentricAnomaly), dec:6, sep:',' },{ small: '°/day' }],
       hover : [`Rate of change of eccentric anomaly: dE/dt = n / (1 - e×cos(E))`]},
      {label : () => `Radius of Curvature (ρ)`,
       value : [ { v: () => OrbitalFormulas.radiusOfCurvature(erosOrbitDistance * o.lengthofAU, erosOrbitalEccentricity, o.erosTrueAnomaly), dec:0, sep:',' },{ small: 'km' }],
       hover : [`Radius of osculating circle at current position: smallest at perihelion, largest at aphelion`]},

    {header : '—  Time Calculations —' },
      {label : () => `Time since perihelion`,
       value : [ { v: () => OrbitalFormulas.timeSincePerihelion(erosSolarYearInput, o.erosMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days elapsed since last perihelion passage: t = P × M / 360°`]},
      {label : () => `Time to next perihelion`,
       value : [ { v: () => OrbitalFormulas.timeToNextPerihelion(erosSolarYearInput, o.erosMeanAnomaly), dec:2, sep:',' },{ small: 'days' }],
       hover : [`Days until next perihelion passage: t = P × (360° - M) / 360°`]},

    {header : '—  Perihelion Precession —' },
      {label : () => `Perihelion Precession Duration against Ecliptic`,
       value : [ { v: () => erosPerihelionEclipticYears, dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period for perihelion to complete one full revolution relative to the ecliptic plane`],
       static: true},
      {label : () => `Perihelion Precession Duration against ICRF`,
       value : [ { v: () => OrbitalFormulas.precessionEclipticToICRF(erosPerihelionEclipticYears, holisticyearLength/13), dec:2, sep:',' },{ small: 'years' }],
       hover : [`Period in the inertial ICRF frame: T_ICRF = (T_ecl × T_ref) / (T_ecl - T_ref)`],
       static: true},
      {label : () => `Perihelion precession per century`,
       value : [ { v: () => OrbitalFormulas.precessionRateFromPeriod(erosPerihelionEclipticYears), dec:2, sep:',' },{ small: 'arcsec/100 yrs' }],
       hover : [`Rate = 129,600,000 / period_years arcseconds per century`],
       static: true},
      {label : () => `Holistic Precession Ratio`,
       value : [ { v: () => OrbitalFormulas.holisticPrecessionRatio(erosPerihelionEclipticYears, holisticyearLength), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Holistic Year to precession period: ${fmtNum(holisticyearLength,0,',')} / ${fmtNum(erosPerihelionEclipticYears,2,',')}`],
       static: true},
      {label : () => `Precession Angular Velocity`,
       value : [ { v: () => OrbitalFormulas.precessionAngularVelocity(OrbitalFormulas.precessionRateFromPeriod(erosPerihelionEclipticYears)) * 1e9, dec:6, sep:',' },{ small: '×10⁻⁹ rad/yr' }],
       hover : [`Angular velocity: ω = (arcsec/century / 100) × (π / 648000) rad/yr`],
       static: true},
      {label : () => `Jupiter Perturbation Strength`,
       value : [ { v: () => OrbitalFormulas.perturbationStrength(erosOrbitDistance * o.lengthofAU, jupiterOrbitDistance * o.lengthofAU, M_JUPITER, M_SUN) * 1e6, dec:4, sep:',' },{ small: '×10⁻⁶' }],
       hover : [`Newtonian perturbation: (M_Jupiter/M_Sun) × (a_Eros/a_Jupiter)² - Jupiter's gravitational influence`]},
      {label : () => `Precession Ratio to Mercury`,
       value : [ { v: () => OrbitalFormulas.precessionRatio(OrbitalFormulas.precessionRateFromPeriod(erosPerihelionEclipticYears), OrbitalFormulas.precessionRateFromPeriod(mercuryPerihelionEclipticYears)), dec:6, sep:',' },{ small: '' }],
       hover : [`Ratio of Eros precession rate to Mercury's rate - useful for resonance analysis`],
       static: true},
    ],
};

/**
 * ──────────────────────────────────────────────────────────────────────────
 *  updateDomLabel()
 *  ------------------------------------------------------------------------
 *  • Fixed left-hand drawer (1/3 viewport wide, 100 vh tall)
 *  • Per-planet colour theme
 *  • Intro paragraph + picture
 *  • Flexible header / dynamic keys
 *  • Per-field number formatting via renderVal()
 *  • Usage:
 *  • planetStats.mars = [
 *  •   {
 *  •     label : 'Aphelion distance',
 *  •     value : fmtNum(249.2, 1) + ' million km',
 *  •     hover : 'Maximum distance from the Sun'
 *  •   },
 *  •  {
 *  •    label : 'Sidereal day ${fmtNum(mercurySolarYearCount,0,',')}',
 *  •    value : [{ v: () => (holisticyearLength/(mercurySolarYearCount-13))*meansolaryearlengthinDays, dec:6, sep:',' },{ small: 'days' }]
 *  •    hover : [
 *  •      ${fmtNum(5.972168e24, 0, ' ')} kg (exact)`,  // tooltip for primary
 *  •      'Earth-day ratio'                            // tooltip for alt
 *  •    ]
 *  •  },
 *  •  ];
 *  • Column widths frozen per-planet just like before
 * ──────────────────────────────────────────────────────────────────────────
 */
function updateDomLabel () {

  /* ———————————————————————————————————————————————
     escape &, ", <, > for safe use in title=""
     ——————————————————————————————————————————————— */
  const escapeAttr = str =>
    String(str)
      .replace(/&/g,  '&amp;')
      .replace(/"/g,  '&quot;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;');

  /* ———————————————————————————————————————————————
     helper: compute max-height for <img> given drawer width
     ——————————————————————————————————————————————— */
  const maxImgHeight = (drawerWidth, ratio) =>
    Math.round(drawerWidth / ratio);          // px

  /* 0 — gather the DOM wrapper ------------------------------------------------ */
  const label = document.getElementById('planetLabel');
  if (!label) { console.error('#planetLabel element missing'); return; }

  /* 0a — build the static DOM only once --------------------------------------- */
  if (!label.dataset.init) {
    /* outer container that never changes */
    const content   = document.createElement('div');
    content.className = 'labelContent';

    /* **dynamic** part we will overwrite each frame */
    const body      = document.createElement('div');
    body.className  = 'labelBody';

    /* close button (static) */
    const closeBtn  = document.createElement('span');
    closeBtn.className  = 'closeBtn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', e => {
      e.stopPropagation();
      label.style.display = 'none';
      labelDismissed = true;
      
      /* -- turn off the helper of the planet that was being looked at */
      if (o.lookAtObj && o.lookAtObj.orbitPlaneHelper) {
      o.lookAtObj.orbitPlaneHelper.visible = false;
      }
    });

    /* assemble */
    content.appendChild(closeBtn);  // static
    content.appendChild(body);      // dynamic
    label.appendChild(content);

    /* keep a reference so we can reach it later */
    label._body = body;

    /* — keep image heights in sync on resize — */
    window.addEventListener('resize', () => {
      const w = label.clientWidth || (innerWidth / 3);
      content.querySelectorAll('.pl-img[data-ar]')
        .forEach(img => {
          const ar = +img.dataset.ar || (16 / 9);
          img.style.maxHeight = Math.round(w / ar) + 'px';
        });
    });

    label.dataset.init = '1';
  }
  
  const body    = label._body;          // <div class="labelBody">
  const content = label.querySelector('.labelContent');

  /* 1 — what planet are we looking at?  -------------------------------------- */
  const selObj   = o.lookAtObj;
  const selName  = selObj?.name?.toLowerCase() || '';
  const stats    = planetStats[selName];
  const meta     = planetMeta [selName];

  const showCard = !!stats;

  /* 2 — apply / clean colour theme ------------------------------------------- */
  if (showCard) {
    const themeCls = `theme-${selName}`;
    for (const c of [...label.classList]) {
      if (c.startsWith('theme-') && c !== themeCls) label.classList.remove(c);
    }
    if (!label.classList.contains(themeCls)) label.classList.add(themeCls);
  }

  /* 3 — early exit if nothing to show / user closed it ----------------------- */
  if (!showCard) {
    label.style.display = 'none';
    labelDismissed      = false;
    prevPlanetName      = '';
    return;
  }
  if (selName !== prevPlanetName) {
    labelDismissed = false;
    prevPlanetName = selName;
    // Clear static cache for fresh evaluation on planet change
    staticValueCache[selName] = {};
  }
  if (labelDismissed) { label.style.display = 'none'; return; }

  // Ensure cache exists for current planet
  if (!staticValueCache[selName]) staticValueCache[selName] = {};

  /* 4 — HEADER block (title • intro • image) --------------------------------- */
  const { intro = '', img = '', imgRatio = 16 / 9 } = meta ?? {};
  const drawerW  = label.clientWidth || (innerWidth / 3);
  const imgMaxH  = maxImgHeight(drawerW, imgRatio);

  let nextHTML = /* html */`
    <div class="pl-title">
      ${PLANET_SYMBOL[selName] ? `<span class="pl-symbol">${PLANET_SYMBOL[selName]}</span>` : ''}
      <span class="pl-name">${niceName(selName)}</span>
    </div>
    ${intro ? `<p class="pl-intro">${intro}</p>` : ''}
    ${img   ? `<img class="pl-img"
                   src="${img}"
                   alt="${selName}"
                   data-ar="${imgRatio}"
                   style="width:100%;height:auto;max-height:${imgMaxH}px">` : ''}
    <div class="scrollBox"><div class="pl-grid">
  `;

  /* 5 — DATA GRID ------------------------------------------------------------ */
  const cache = staticValueCache[selName];
  let _debugCacheHits = 0, _debugCacheMisses = 0, _debugDynamic = 0;
  for (let rowIdx = 0; rowIdx < stats.length; rowIdx++) {
    const row = stats[rowIdx];

    /* section header --------------------------------------------------------- */
    if (row?.header) {
      // Headers with dynamic dates are not cached
      if (row.date) {
        const rawDate = (typeof row.date === 'function') ? row.date() : row.date;
        let dateStr   = '';
        if (rawDate !== undefined && rawDate !== null) {
          const d = (rawDate instanceof Date)      ? rawDate :
                    (typeof rawDate === 'number')  ? new Date(rawDate) :
                    (typeof rawDate === 'string' && /[/-]/.test(rawDate))
                                                    ? new Date(...rawDate.split(/[/-]/).map((p,i)=> i === 1 ? p-1 : p))
                                                    : new Date(rawDate);
          dateStr = (!isNaN(d)) ? d.toLocaleDateString('en-GB') : String(rawDate);
        }
        nextHTML += `<span class="pl-head">${row.header}${dateStr ? ` <span class="date">${dateStr}</span>` : ''}</span>`;
      } else {
        // Static header - use cache
        if (cache[rowIdx] === undefined) {
          cache[rowIdx] = `<span class="pl-head">${row.header}</span>`;
        }
        nextHTML += cache[rowIdx];
      }
      continue;
    }

    /* blank line ------------------------------------------------------------- */
    if (row === null) {
      nextHTML += '<span class="pl-blank"></span><span class="pl-blank"></span><span class="pl-blank"></span>';
      continue;
    }

    /* Check if this row is marked as static and we have a cached value */
    if (row.static && cache[rowIdx] !== undefined) {
      nextHTML += cache[rowIdx];
      _debugCacheHits++;
      continue;
    }
    if (row.static) _debugCacheMisses++; else _debugDynamic++;

    /* regular data row ------------------------------------------------------- */
    let labelTxt, rawVal, rawHover;
    if ('label' in row && 'value' in row) {        // helper format
      labelTxt = (typeof row.label === 'function') ? row.label() : row.label;
      rawVal   = row.value;
      rawHover = row.hover;
    } else {
      const pair = Object.entries(row).find(([k]) => k !== 'info');
      [labelTxt, rawVal] = pair ?? ['?', ''];
      rawHover = undefined;
    }

    /* resolve hover text(s) -------------------------------------------------- */
    let h1 = '', h2 = '';
    if (rawHover !== undefined) {
      const hv = (typeof rawHover === 'function') ? rawHover() : rawHover;
      if (Array.isArray(hv)) [h1, h2] = hv;
      else                    h1 = h2 = hv;
    }
    const keyTitle  = h1 || h2;
    const keyAttr   = keyTitle ? ` title="${escapeAttr(keyTitle)}"` : '';
    const valAttr   = h1       ? ` title="${escapeAttr(h1)}"`       : '';
    const altAttr   = h2       ? ` title="${escapeAttr(h2)}"`       : '';

    const keyHTML = row.info
      ? `${labelTxt} <a class="pl-info" target="_blank" href="${row.info}">ⓘ</a>`
      : labelTxt;

    /* split value + alt like before */
    let v1 = rawVal, v2 = '';
    if (Array.isArray(rawVal)) [v1, v2] = rawVal;

    const rowHTML =
      `<span class="pl-key"${keyAttr}>${keyHTML}</span>` +
      `<span class="pl-val"${valAttr}>${renderVal(v1)}</span>` +
      `<span class="pl-alt"${altAttr}>${renderVal(v2)}</span>`;

    /* Cache static rows for future updates */
    if (row.static) {
      cache[rowIdx] = rowHTML;
    }

    nextHTML += rowHTML;
  }

  nextHTML += '</div></div>';   // close .pl-grid and .scrollBox

  // DEBUG: Log cache performance (uncomment to enable)
  // console.log(`[${selName}] Cache hits: ${_debugCacheHits}, Misses: ${_debugCacheMisses}, Dynamic: ${_debugDynamic}`);

  /* 6 — inject only if changed ---------------------------------------------- */
  if (nextHTML !== labelPrevHTML) {
    // Preserve scroll position before updating innerHTML
    const scrollBox = body.querySelector('.scrollBox');
    const savedScrollTop = scrollBox ? scrollBox.scrollTop : 0;

    body.innerHTML = nextHTML;
    labelPrevHTML     = nextHTML;

    /* freeze column widths the first time we show this planet ---------------- */
    if (!columnCache[selName]) {
      const grid  = content.querySelector('.pl-grid');
      const vals  = [...grid.querySelectorAll('.pl-val')];
      const alts  = [...grid.querySelectorAll('.pl-alt')];

      const maxValCh = Math.max(...vals.map(s => s.textContent.length)) + 1;
      const maxAltCh = Math.max(...alts.map(s => s.textContent.length)) + 1;

      columnCache[selName] = `max-content ${maxValCh}ch ${maxAltCh}ch`;
    }
    content.querySelector('.pl-grid').style.gridTemplateColumns =
      columnCache[selName];

    // Restore scroll position after updating innerHTML
    const newScrollBox = body.querySelector('.scrollBox');
    if (newScrollBox && savedScrollTop > 0) {
      newScrollBox.scrollTop = savedScrollTop;
    }
  }

  /* 7 — show the drawer ------------------------------------------------------ */
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

  /* ── 1  Nothing is selected or hierarchy inspector is active → ring off and exit early ─────────── */
  if (!o.lookAtObj || hierarchyInspector._cameraControlActive) {
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
  sunGlow.getWorldPosition(_flareSunPos);
  camera.getWorldPosition(_flareCamPos);
  camera.getWorldDirection(_flareCamDir);

  _flareToSun.subVectors(_flareSunPos, _flareCamPos).normalize();

  const dot = _flareCamDir.dot(_flareToSun);

  if (dot > 0.5) {
    _flareLineDir.subVectors(_flareCamPos, _flareSunPos).normalize();

    flares.forEach((flare, index) => {
      const factor = (index - 0.5) * (index - 2) * 15;

      _flarePos.copy(_flareSunPos);
      _flarePos.addScaledVector(_flareLineDir, factor);

      flare.position.copy(_flarePos);
      flare.visible = true;
      flare.material.opacity = 1.0 - Math.abs(index - 1) * 0.3;
    });
  } else {
    flares.forEach(flare => {
      flare.visible = false;
    });
  }
}

/**
 * Call once per frame *after* you have moved the Sun & planets,
 * but *before* renderer.render().
 *
 * @param {THREE.Mesh} planetMesh  – the mesh that receives the shadow
 * @param {number}      pad        – padding multiplier (> 1) for safety
 */
function updateSunlightForPlanet(planetMesh, pad = 1.1) {

  if (!planetMesh) return;

  /* 1. Sun & planet world positions ------------------------------ */
  sun.planetObj.getWorldPosition(_sunWS);
  planetMesh   .getWorldPosition(_planetWS);

  /* 2. move the light to the Sun & aim at planet ----------------- */
  sunLight.position.copy(_sunWS);
  sunLight.target.position.copy(_planetWS);
  sunLight.target.updateMatrixWorld(true);

  /* 3. force Three to rebuild the shadow camera                    *
   *    (this fixes the “camera pointing down” problem)            */
  sunLight.shadow.updateMatrices(sunLight);        // <- KEY LINE
  sunLight.updateMatrixWorld(true);                // also refresh self

  /* 4. world-space AABB of the planet mesh ----------------------- */
  _wsBox.setFromObject(planetMesh);

  /* 5. bring the 8 corners into *light* space -------------------- */
  _invMat.copy(sunLight.shadow.camera.matrixWorldInverse);

  let i = 0;
  for (const x of [_wsBox.min.x, _wsBox.max.x])
  for (const y of [_wsBox.min.y, _wsBox.max.y])
  for (const z of [_wsBox.min.z, _wsBox.max.z]) {
    _cornersLS[i++].set(x, y, z).applyMatrix4(_invMat);
  }

  /* 6. light-space AABB + padding -------------------------------- */
  _lsBox.setFromPoints(_cornersLS);
  _lsBox.min.multiplyScalar(pad);
  _lsBox.max.multiplyScalar(pad);

  /* 7. write extents to the orthographic camera ------------------ */
  const cam = sunLight.shadow.camera;
  cam.left   = _lsBox.min.x;
  cam.right  = _lsBox.max.x;
  cam.bottom = _lsBox.min.y;
  cam.top    = _lsBox.max.y;

  /* --- key change: keep near tiny, far big ---------------------- */
  cam.near = 0.1;                 // a fixed, small value near the Sun
  cam.far  = -_lsBox.min.z;       // always positive and > near
  cam.updateProjectionMatrix();

  /* 8. helper (for debugging) ------------------------------------ */
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

    updateSunlightForPlanet(o.lookAtObj.planetObj);
  }
}

// Animation (pulsing) - only updates when zodiac is visible
function animateGlow() {
    if (!zodiac.visible) return;
    glowMaterial.opacity = 0.2 + 0.1 * Math.sin(Date.now() * 0.002);
}

function createEarthPolarLine() {
  const material = new THREE.LineBasicMaterial({ color: 0xffffff });

  let geometry;

  // Use BufferGeometry (THREE.Geometry was removed in Three.js r125+)
  geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -100, 0),
    new THREE.Vector3(0, 100, 0)
  ]);

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
  positionChanged = true; // Signal animation loop to update scene
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
// Validation helper for matrix update optimization (remove once confident)
const _matrixValidationPos1 = new THREE.Vector3();
const _matrixValidationPos2 = new THREE.Vector3();
let _matrixValidationWarned = false;

function updatePositions() {
  // 0.  Update world matrices for objects we need (optimized)
  //     Instead of scene.updateMatrixWorld(true) which traverses ALL objects,
  //     we only update the specific branches we actually use:
  //     - startingPoint.pivotObj covers: earth, sun, barycenter, all planets, moon
  //     - earthWobbleCenter.pivotObj covers: the wobble center (separate branch)
  //     - camera: needed for worldToLocal calculations
  startingPoint.pivotObj.updateMatrixWorld(true);
  earthWobbleCenter.pivotObj.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);

  // VALIDATION CHECK: Compare against full scene update (remove once confident)
  // This runs once per session to verify the optimization is correct
  if (!_matrixValidationWarned) {
    // Capture position after optimized update
    sun.planetObj.getWorldPosition(_matrixValidationPos1);

    // Do full scene update
    scene.updateMatrixWorld(true);

    // Compare
    sun.planetObj.getWorldPosition(_matrixValidationPos2);

    if (!_matrixValidationPos1.equals(_matrixValidationPos2)) {
      console.warn('Matrix optimization mismatch detected!',
        'Optimized:', _matrixValidationPos1.toArray(),
        'Full:', _matrixValidationPos2.toArray());
      _matrixValidationWarned = true; // Only warn once
    } else {
      console.log('Matrix optimization validated successfully');
      _matrixValidationWarned = true; // Only check once
    }
  }

  // 1.  anchor points in world space
  earth.rotationAxis.getWorldPosition(EARTH_POS);  // Earth centre
  sun.planetObj.getWorldPosition(SUN_POS);         // Sun   centre
  earthWobbleCenter.planetObj.getWorldPosition(WOBBLE_POS);         // Sun   centre
  barycenterEarthAndSun.planetObj.getWorldPosition(PERIHELION_OF_EARTH_POS);         // PERIHELION-OF-EARTH   centre

  // ───────────────────────── each planet ───────────────────────────
  for (let i = 0, L = tracePlanets.length; i < L; i++) {
    const obj = tracePlanets[i];
    obj.planetObj.getWorldPosition(PLANET_POS);

    /*  EARTH → PLANET  (distance)  */
    DELTA.subVectors(PLANET_POS, EARTH_POS);         // world coords
    obj.distAU = DELTA.length() / 100;               // scene → AU
    obj.distKm = auToKm(obj.distAU);                 // AU → km (live)
    obj.distMi = obj.distKm * KM_TO_MI;

    /*  EARTH → PLANET  (direction for RA/Dec)
        We need the vector expressed in the Earth-equatorial frame, which
        already includes axial tilt *and* the 90° spin you applied on
        21 June (earth.containerObj.rotation.y = π/2).  The quickest way
        is to transform the planet's world position into the local
        coordinates of earth.rotationAxis.                                  */
    LOCAL.copy(PLANET_POS);
    earth.rotationAxis.worldToLocal(LOCAL);          // in-place

    SPHERICAL.setFromVector3(LOCAL);                 // Earth local frame
    obj.ra  = SPHERICAL.theta;                       // radians
    obj.dec = SPHERICAL.phi;                         // radians

    /*  SUN → PLANET (distance)  */
    DELTA.subVectors(PLANET_POS, SUN_POS);           // reuse DELTA
    const sunRadius   = DELTA.length();
    obj.sunDistAU     = sunRadius / 100;
    obj.sunDistKm     = auToKm(obj.sunDistAU);
    obj.sunDistMi     = obj.sunDistKm * KM_TO_MI;

      /*  PERIHELION-OF-EARTH → PERIHELION of planet (distance)  */
    DELTA.subVectors(PLANET_POS, WOBBLE_POS);           // reuse DELTA
    const perihelionRadius   = DELTA.length();
    obj.perihelionDistAU     = perihelionRadius / 100;
  }

  // ─────────────────────── camera read-out ─────────────────────────
  camera.getWorldPosition(CAMERA_POS);

  /*  Earth → Camera (distance & RA/Dec)  */
  CAM_LOCAL.copy(CAMERA_POS);
  earth.rotationAxis.worldToLocal(CAM_LOCAL);        // into Earth frame
  SPHERICAL.setFromVector3(CAM_LOCAL);

  o.worldCamRa  = SPHERICAL.theta;
  o.worldCamDec = SPHERICAL.phi;
  o._camDistAU  = SPHERICAL.radius / 100;            // store for display update
}

/** Updates display strings for UI - call at throttled rate (20 Hz) */
function updatePositionDisplayStrings() {
  // Update planet display strings
  for (let i = 0, L = tracePlanets.length; i < L; i++) {
    const obj = tracePlanets[i];

    // Skip if values not yet initialized
    if (obj.distAU == null) continue;

    // Distance display
    obj.distDisplay =
      (o.distanceUnit === 'AU') ? obj.distAU.toFixed(8) + ' AU' :
      (o.distanceUnit === 'km') ? obj.distKm.toFixed(2) + ' km'  :
                                  obj.distMi.toFixed(2) + ' mi';

    // RA/Dec display
    if (o.displayFormat === 'decimal') {
      obj.raDisplay  = ((obj.ra * 180 / Math.PI + 360) % 360).toFixed(4) + '°';
      obj.decDisplay = radiansToDecDecimal(obj.dec) + '°';
    } else {
      obj.raDisplay  = radiansToRa(obj.ra);
      obj.decDisplay = radiansToDec(obj.dec);
    }

    // Sun distance display
    obj.sunDistDisplay =
      (o.distanceUnit === 'AU') ? obj.sunDistAU.toFixed(8) + ' AU' :
      (o.distanceUnit === 'km') ? obj.sunDistKm.toFixed(2) + ' km'  :
                                  obj.sunDistMi.toFixed(2) + ' mi';
  }

  // Camera distance display
  if (o._camDistAU != null) {
    const camDistKm = auToKm(o._camDistAU);
    const camDistMi = camDistKm * KM_TO_MI;
    o.worldCamDistDisplay =
      (o.distanceUnit === 'AU') ? o._camDistAU.toFixed(8) + ' AU' :
      (o.distanceUnit === 'km') ? camDistKm.toFixed(2) + ' km'  :
                                  camDistMi.toFixed(2) + ' mi';
  }
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

// Modified function with adaptive step for high-speed performance
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

  // Adaptive step: at high speeds, increase step size to reduce iterations
  // Calculate how many iterations would be needed with base step
  const gap = pos - nextPos;
  const baseIterations = gap / obj.traceStep;

  // Target max ~50 iterations per frame for smooth performance
  const TARGET_ITERATIONS = 50;
  let effectiveStep = obj.traceStep;

  if (baseIterations > TARGET_ITERATIONS) {
    // Scale up the step to limit iterations
    const stepMultiplier = Math.ceil(baseIterations / TARGET_ITERATIONS);
    effectiveStep = obj.traceStep * stepMultiplier;
  }

  // Safety limit in case calculation is off
  const MAX_ITERATIONS = 100;
  let iterations = 0;

  while (nextPos < pos && iterations < MAX_ITERATIONS) {
    iterations++;
    moveModel(nextPos);
    earth.containerObj.updateMatrixWorld();
    obj.planetObj.getWorldPosition(_tracePos);

    const writeIndex = (obj.traceArrIndex % pointCount) * 3;
    vertArray[writeIndex + 0] = _tracePos.x;
    vertArray[writeIndex + 1] = _tracePos.y;
    vertArray[writeIndex + 2] = _tracePos.z;

    obj.traceArrIndex++;
    nextPos += effectiveStep;
  }

  positionAttr.needsUpdate = true;
  obj.traceCurrPos = nextPos - effectiveStep;
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

  // Inclination path rotates with zodiac to stay aligned (but is independent object)
  if (typeof inclinationPathGroup !== 'undefined') {
    inclinationPathGroup.rotation.y = -Math.PI / 3 - earthTheta;
  }
  // Invariable plane also rotates with zodiac
  if (typeof invariablePlaneGroup !== 'undefined') {
    invariablePlaneGroup.rotation.y = -Math.PI / 3 - earthTheta;
  }
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
  return Math.floor(pos / sDay);  // REMOVE +12h shift
}

function posToTime(pos) {
  let days = pos / sDay - Math.floor(pos / sDay);
  let hours = Math.floor(days * 24);
  let minutes = Math.floor((days * 24 - hours) * 60);
  let seconds = Math.round(((days * 24 - hours) * 60 - minutes) * 60);

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
  let pos = aTime[0] * sHour + aTime[1] * sMinute + aTime[2] * sSecond;
  return pos;
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
  const RAD2DEG = 180 / Math.PI;
  const TWO_PI  = 2 * Math.PI;

  // 1) Pull raw ra‐in‐radians from each object
  const ra1 = Number(pdA.ra);
  const ra2 = Number(pdB.ra);

  if (!Number.isFinite(ra1)) {
    throw new TypeError(`ra for ${pdA.name} is invalid: ${pdA.ra}`);
  }
  if (!Number.isFinite(ra2)) {
    throw new TypeError(`ra for ${pdB.name} is invalid: ${pdB.ra}`);
  }

  // 2) Normalize each input RA into [0, 2π)
  let θ1 = ra1 % TWO_PI;
  if (θ1 < 0) θ1 += TWO_PI;

  let θ2 = ra2 % TWO_PI;
  if (θ2 < 0) θ2 += TWO_PI;

  // 3) Pull & validate distances (km)
  const r1 = Number(pdA.distKm);
  const r2 = Number(pdB.distKm);

  if (!Number.isFinite(r1) || r1 < 0) {
    throw new TypeError(`distKm for ${pdA.name} is invalid: ${pdA.distKm}`);
  }
  if (!Number.isFinite(r2) || r2 < 0) {
    throw new TypeError(`distKm for ${pdB.name} is invalid: ${pdB.distKm}`);
  }

  // 4) Compute each body’s (x, z) in the ecliptic plane:
  //    x = r * cos(θ),  z = r * sin(θ)
  const x1 = r1 * Math.cos(θ1);
  const z1 = r1 * Math.sin(θ1);
  const x2 = r2 * Math.cos(θ2);
  const z2 = r2 * Math.sin(θ2);

  // 5) Vector from A → B in that same plane
  const dx = x2 - x1;
  const dz = z2 - z1;

  // If they coincide exactly, the apparent RA is undefined.
  if (dx === 0 && dz === 0) {
    throw new RangeError(
      `${pdA.name} and ${pdB.name} share identical ecliptic coords`
    );
  }

  // 6) Apparent RA = atan2(dz, dx), then normalized into [0, 2π)
  let aparRad = Math.atan2(dz, dx); // yields (−π, +π]
  if (aparRad < 0) {
    aparRad += TWO_PI;             // now in [0, 2π)
  }

  // 7) Compute the “opposite” direction by adding π and re‐wrapping
  let oppRad = aparRad + Math.PI;  // in [π, 3π)
  if (oppRad >= TWO_PI) {
    oppRad -= TWO_PI;              // wrap into [0, 2π)
  }

  // final log
  // console.log(
  //  `${pdB.name} from ${pdA.name} → apparent RA: ${apar.toFixed(4)}°, `,
  //  ` opposite RA: ${opposite.toFixed(4)}°`
  //);

  // 8) Convert back to degrees, in [0,360), and return
  return oppRad * RAD2DEG;
}

function updatePerihelion() {
  o["mercuryPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, mercuryPerihelionFromEarth);
  o["venusPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, venusPerihelionFromEarth) % 360;
//  o["mercuryPerihelion2"] = apparentRaFromPdA(earthPerihelionFromEarth, mercuryPerihelionFromEarth) % 360; 
  o["earthPerihelion"] = (earthPerihelionFromEarth.ra * 180 / Math.PI + 360) % 360;
  o["marsPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, marsPerihelionFromEarth);
  o["jupiterPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, jupiterPerihelionFromEarth);
  o["saturnPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, saturnPerihelionFromEarth);
  o["uranusPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, uranusPerihelionFromEarth);
  o["neptunePerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, neptunePerihelionFromEarth);
  o["plutoPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, plutoPerihelionFromEarth);
  o["halleysPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, halleysPerihelionFromEarth);
  o["erosPerihelion"] = apparentRaFromPdA(earthPerihelionFromEarth, erosPerihelionFromEarth);
};

// ================================================================
// DYNAMIC ASCENDING NODE CALCULATION
// ================================================================
//
// The ascending node longitude shifts when Earth's obliquity changes.
// This is a RATE-BASED calculation that integrates the effect over time,
// properly handling:
//   1. Obliquity direction changes (when obliquity starts increasing/decreasing)
//   2. Inclination crossovers (when Earth's inclination crosses a planet's)
//
// The effect depends on:
//   - The RATE of obliquity change (dε/dt), not total deviation from mean
//   - The relative inclination between Earth and the planet at each moment
//
// Earth inclination range: ~0.93° to ~2.06° (mean 1.495°, amplitude 0.564°)
// Planets affected by inclination crossover: Jupiter (1.30°), Mars (1.85°)
// ================================================================

/**
 * Compute the integrated obliquity change from the mean obliquity point,
 * accounting for direction changes in the obliquity cycle.
 *
 * Obliquity formula: ε = mean - A*cos(phase3) + A*cos(phase8)
 * where phase3 = 2π*t/cycle3, phase8 = 2π*t/cycle8
 *
 * The integral of the RATE of change gives us the accumulated effect,
 * but we need to account for sign changes based on inclination relationship.
 *
 * @param {number} currentYear - Current year
 * @returns {object} { obliquityIntegral3, obliquityIntegral8 } - Integrated components
 */
function computeObliquityIntegrals(currentYear) {
  const t = currentYear - balancedYear;
  const cycle3 = holisticyearLength / 3;
  const cycle8 = holisticyearLength / 8;

  const phase3 = (t / cycle3) * 2 * Math.PI;
  const phase8 = (t / cycle8) * 2 * Math.PI;

  // The obliquity is: mean - A*cos(phase3) + A*cos(phase8)
  // The integral of cos from 0 to phase is sin(phase)
  // So the "accumulated obliquity change" from balanced year is:
  //   -A*sin(phase3) + A*sin(phase8)  (but we need the actual deviation)
  //
  // Actually, for the ascending node effect, what matters is the
  // obliquity VALUE relative to the mean, not the integral of rate.
  // The formula dΩ = (dΩ/dε) * dε integrates to Ω = (dΩ/dε) * (ε - ε_mean)
  //
  // So we return the obliquity deviation from mean, split by component
  // for potential future use in handling direction changes per component.

  return {
    component3: -tiltandinclinationAmplitude * Math.cos(phase3),  // Deviation from mean due to cycle3
    component8: tiltandinclinationAmplitude * Math.cos(phase8),   // Deviation from mean due to cycle8
    sin3: Math.sin(phase3),  // For determining direction of cycle3 contribution
    sin8: Math.sin(phase8)   // For determining direction of cycle8 contribution
  };
}

/**
 * Compute Earth's inclination at a specific year.
 * Inclination formula: i = mean - A*cos(phase3)
 *
 * @param {number} year - Year to compute for
 * @returns {number} Earth inclination in degrees
 */
function getEarthInclinationAtYear(year) {
  const t = year - balancedYear;
  const cycle3 = holisticyearLength / 3;
  const phase3 = (t / cycle3) * 2 * Math.PI;
  return earthinclinationMean - tiltandinclinationAmplitude * Math.cos(phase3);
}

/**
 * Compute Earth's obliquity at a specific year.
 *
 * @param {number} year - Year to compute for
 * @returns {number} Earth obliquity in degrees
 */
function getObliquityAtYear(year) {
  const t = year - balancedYear;
  const cycle3 = holisticyearLength / 3;
  const cycle8 = holisticyearLength / 8;
  const phase3 = (t / cycle3) * 2 * Math.PI;
  const phase8 = (t / cycle8) * 2 * Math.PI;
  return earthtiltMean - tiltandinclinationAmplitude * Math.cos(phase3) + tiltandinclinationAmplitude * Math.cos(phase8);
}

/**
 * Find the year when Earth's inclination equals a target value.
 * Solves: earthinclinationMean - A*cos(phase3) = targetInclination
 *
 * @param {number} targetInclination - Target inclination in degrees
 * @param {number} startYear - Start of search range
 * @param {number} endYear - End of search range
 * @param {boolean} findFirst - If true, find first crossing; if false, find last
 * @returns {number|null} Year of crossing, or null if not found
 */
function findInclinationCrossingYear(targetInclination, startYear, endYear, findFirst = true) {
  // Check if target is within Earth's inclination range
  const minIncl = earthinclinationMean - tiltandinclinationAmplitude;
  const maxIncl = earthinclinationMean + tiltandinclinationAmplitude;

  if (targetInclination < minIncl || targetInclination > maxIncl) {
    return null; // Target outside Earth's range
  }

  // Binary search for crossing
  const steps = 1000;
  const stepSize = (endYear - startYear) / steps;

  let prevIncl = getEarthInclinationAtYear(startYear);
  let crossings = [];

  for (let i = 1; i <= steps; i++) {
    const year = startYear + i * stepSize;
    const incl = getEarthInclinationAtYear(year);

    // Check if we crossed the target
    if ((prevIncl < targetInclination && incl >= targetInclination) ||
        (prevIncl > targetInclination && incl <= targetInclination)) {
      // Refine with interpolation
      const fraction = (targetInclination - prevIncl) / (incl - prevIncl);
      crossings.push(year - stepSize + fraction * stepSize);
    }
    prevIncl = incl;
  }

  if (crossings.length === 0) return null;
  return findFirst ? crossings[0] : crossings[crossings.length - 1];
}

/**
 * Find ALL years when Earth's inclination equals a target value within a range.
 * Used for proper segment handling in ascending node calculation.
 *
 * @param {number} targetInclination - Target inclination in degrees
 * @param {number} startYear - Start of search range
 * @param {number} endYear - End of search range
 * @returns {number[]} Array of years where crossings occur
 */
function findAllInclinationCrossings(targetInclination, startYear, endYear) {
  // Check if target is within Earth's inclination range
  const minIncl = earthinclinationMean - tiltandinclinationAmplitude;
  const maxIncl = earthinclinationMean + tiltandinclinationAmplitude;

  if (targetInclination < minIncl || targetInclination > maxIncl) {
    return []; // Target outside Earth's range
  }

  // Use enough steps to catch all crossings
  // There are 2 crossings per ~99,392 year cycle, so ensure we have enough resolution
  const yearSpan = Math.abs(endYear - startYear);
  const cycleLength = holisticyearLength / 3;  // ~99,392 years
  const expectedCrossings = Math.ceil(yearSpan / cycleLength) * 2 + 4;
  const steps = Math.max(1000, expectedCrossings * 50);  // At least 50 samples per expected crossing
  const stepSize = (endYear - startYear) / steps;

  let prevIncl = getEarthInclinationAtYear(startYear);
  let crossings = [];

  for (let i = 1; i <= steps; i++) {
    const year = startYear + i * stepSize;
    const incl = getEarthInclinationAtYear(year);

    // Check if we crossed the target
    if ((prevIncl < targetInclination && incl >= targetInclination) ||
        (prevIncl > targetInclination && incl <= targetInclination)) {
      // Refine with interpolation
      const fraction = (targetInclination - prevIncl) / (incl - prevIncl);
      crossings.push(year - stepSize + fraction * stepSize);
    }
    prevIncl = incl;
  }

  return crossings;
}

/**
 * Calculate the dynamic ascending node longitude using a RATE-BASED approach.
 *
 * This properly handles:
 *   1. Obliquity direction changes (effect reverses when obliquity changes direction)
 *   2. Inclination crossovers (effect reverses when Earth incl crosses planet incl)
 *
 * The effect on ascending node depends on:
 *   - dΩ/dε = -sin(Ω) / tan(i)  (base perturbation rate)
 *   - Sign depends on whether Earth incl > or < planet incl
 *   - Effect accumulates based on obliquity CHANGE, respecting direction reversals
 *
 * @param {number} orbitTilta - Encodes sin(Ω)*i in degrees
 * @param {number} orbitTiltb - Encodes cos(Ω)*i in degrees
 * @param {number} currentObliquity - Current Earth obliquity (degrees)
 * @param {number} earthInclination - Current Earth orbital inclination (degrees)
 * @param {number} currentYear - Current year (needed for rate-based calculation)
 * @returns {number} Dynamic ascending node longitude (degrees, 0-360)
 */
function calculateDynamicAscendingNodeFromTilts(orbitTilta, orbitTiltb, currentObliquity, earthInclination, currentYear) {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  // Extract the static ascending node and inclination from tilts
  const staticOmegaDeg = Math.atan2(orbitTilta, orbitTiltb) * RAD2DEG;
  const staticOmega = ((staticOmegaDeg % 360) + 360) % 360;
  const planetInclination = Math.sqrt(orbitTilta * orbitTilta + orbitTiltb * orbitTiltb);

  // If inclination is essentially zero, ascending node is undefined
  if (planetInclination < 1e-6) {
    return staticOmega;
  }

  const i = planetInclination * DEG2RAD;
  const OmegaRad = staticOmega * DEG2RAD;

  const tanI = Math.tan(i);
  if (Math.abs(tanI) < 1e-10) {
    return staticOmega;
  }

  // Base perturbation rate: dΩ/dε = -sin(Ω) / tan(i)
  const sinOmega = Math.sin(OmegaRad);
  const baseDOmegaDeps = -sinOmega / tanI;

  // ================================================================
  // RATE-BASED INTEGRATION WITH SEGMENT HANDLING
  // ================================================================
  //
  // We integrate the ascending node change from the "balanced year" (where
  // obliquity and inclination are at their mean values) to the current year.
  //
  // IMPORTANT: The staticOmega values are calibrated for EPOCH year 2000.
  // To use balanced year as the reference, we need to:
  //   1. Calculate the effect from balanced year to epoch (2000)
  //   2. Subtract that from staticOmega to get the "balanced year baseline"
  //   3. Then add the effect from balanced year to current year
  //
  // This simplifies to: just calculate the effect from EPOCH to currentYear,
  // since the balanced year portions cancel out:
  //   result = staticOmega - effect(balanced→epoch) + effect(balanced→current)
  //          = staticOmega + effect(epoch→current)
  //
  // But we WANT to use balanced year as reference for proper cycle handling.
  // So we compute effect(balanced→current) - effect(balanced→epoch).
  //
  // The integration must account for:
  // 1. Obliquity direction changes (extrema in the obliquity cycle)
  // 2. Inclination crossovers (when Earth incl = planet incl)
  //
  // At each segment boundary, the direction of the effect may reverse.
  // ================================================================

  const EPOCH_YEAR = 2000; // Year when staticOmega values are calibrated

  // Helper function to integrate effect between two years
  const integrateEffect = (fromYear, toYear) => {
    if (Math.abs(toYear - fromYear) < 0.1) return 0;

    const yearMin = Math.min(fromYear, toYear);
    const yearMax = Math.max(fromYear, toYear);
    const dir = toYear >= fromYear ? 1 : -1;

    // Collect critical points: obliquity extrema and inclination crossings
    let criticalYears = [yearMin, yearMax];

    // Sample to find obliquity direction changes
    const sampleStep = Math.min(1000, (yearMax - yearMin) / 100);
    if (sampleStep > 0) {
      let prevObl = getObliquityAtYear(yearMin);
      let prevDir = 0;

      for (let y = yearMin + sampleStep; y <= yearMax; y += sampleStep) {
        const obl = getObliquityAtYear(y);
        const curDir = obl > prevObl ? 1 : (obl < prevObl ? -1 : 0);

        if (prevDir !== 0 && curDir !== 0 && prevDir !== curDir) {
          // Direction changed - refine to find extremum
          let lo = y - sampleStep;
          let hi = y;
          for (let iter = 0; iter < 20; iter++) {
            const mid = (lo + hi) / 2;
            const oblLo = getObliquityAtYear(lo);
            const oblMid = getObliquityAtYear(mid);
            const oblHi = getObliquityAtYear(hi);

            if ((oblMid > oblLo && oblMid > oblHi) || (oblMid < oblLo && oblMid < oblHi)) {
              criticalYears.push(mid);
              break;
            } else if ((oblMid - oblLo) * prevDir > 0) {
              lo = mid;
            } else {
              hi = mid;
            }
          }
        }

        if (curDir !== 0) prevDir = curDir;
        prevObl = obl;
      }
    }

    // Find ALL inclination crossings (only if planet is within Earth's inclination range)
    // This is critical for long time spans where there may be many crossings
    const minEarthIncl = earthinclinationMean - tiltandinclinationAmplitude;
    const maxEarthIncl = earthinclinationMean + tiltandinclinationAmplitude;

    if (planetInclination >= minEarthIncl && planetInclination <= maxEarthIncl) {
      const allCrossings = findAllInclinationCrossings(planetInclination, yearMin, yearMax);
      criticalYears.push(...allCrossings);
    }

    // Sort critical years and remove duplicates
    criticalYears = [...new Set(criticalYears)].sort((a, b) => a - b);

    // Integrate over segments
    let effect = 0;
    for (let idx = 0; idx < criticalYears.length - 1; idx++) {
      const segStart = criticalYears[idx];
      const segEnd = criticalYears[idx + 1];

      const oblStart = getObliquityAtYear(segStart);
      const oblEnd = getObliquityAtYear(segEnd);
      const deltaObl = (oblEnd - oblStart) * DEG2RAD;

      const midYear = (segStart + segEnd) / 2;
      const earthInclAtMid = getEarthInclinationAtYear(midYear);
      const inclDirection = earthInclAtMid > planetInclination ? 1 : -1;

      effect += baseDOmegaDeps * inclDirection * deltaObl * RAD2DEG;
    }

    return effect * dir;
  };

  // Calculate the net effect: from epoch (2000) to current year
  // This properly handles all obliquity direction changes and inclination crossovers
  const effectFromEpoch = integrateEffect(EPOCH_YEAR, currentYear);

  // Apply accumulated effect to the static (epoch) value
  let newOmega = staticOmega + effectFromEpoch;

  // Normalize to 0-360
  newOmega = ((newOmega % 360) + 360) % 360;

  return newOmega;
}

/**
 * Legacy function - kept for reference but no longer used.
 * Use calculateDynamicAscendingNodeFromTilts instead.
 */
function calculateDynamicAscendingNode(staticOmega, staticInclination, currentObliquity, referenceObliquity = earthtiltMean) {
  // Convert static values to tilt format
  const DEG2RAD = Math.PI / 180;
  const OmegaRad = staticOmega * DEG2RAD;
  // orbitTilta = sin(Ω) * i, orbitTiltb = cos(Ω) * i
  const orbitTilta = Math.sin(OmegaRad) * staticInclination;
  const orbitTiltb = Math.cos(OmegaRad) * staticInclination;

  return calculateDynamicAscendingNodeFromTilts(orbitTilta, orbitTiltb, currentObliquity, referenceObliquity);
}


/**
 * Update all planet ascending nodes based on current obliquity.
 * Uses the ACTUAL orbitTilta and orbitTiltb values from the planet data objects,
 * which encode both inclination AND the direction of tilt.
 * Also calculates the Argument of Periapsis for each planet.
 * This function should be called each frame before updateHierarchyLiveData().
 *
 * The calculation uses a RATE-BASED approach that properly handles:
 *   1. Obliquity direction changes (effect reverses when obliquity changes direction)
 *   2. Inclination crossovers (effect reverses when Earth incl crosses planet incl)
 */
// Debug flag for ascending node logging - set to true to enable console output
let _debugAscendingNodeLogEnabled = false;
let _debugAscendingNodeLastLog = 0;
const _debugAscendingNodeInterval = 1000; // Log at most every 1 second

// Expose debug toggle globally for console access
// Usage in browser console: window.enableAscNodeDebug(true) or window.enableAscNodeDebug(false)
window.enableAscNodeDebug = (enabled) => {
  _debugAscendingNodeLogEnabled = enabled;
  o.debugAscendingNode = enabled;
  console.log(`🔍 Ascending Node debugging ${enabled ? 'ENABLED' : 'DISABLED'}`);
  if (enabled) {
    console.log('   Logs will appear every second showing:');
    console.log('   - Current year and obliquity');
    console.log('   - Static orbitTilt values');
    console.log('   - Calculated dynamic ascending node');
    console.log('   - Visual rotation values applied');
  }
};

function updateAscendingNodes() {
  const currentObliquity = o.obliquityEarth;
  const earthInclination = o.inclinationEarth;
  const currentYear = o.currentYear;

  // Mercury - use actual tilt values from planet data
  o.mercuryAscendingNode = calculateDynamicAscendingNodeFromTilts(
    mercuryRealPerihelionAtSun.orbitTilta, mercuryRealPerihelionAtSun.orbitTiltb, currentObliquity, earthInclination, currentYear
  );
  o.mercuryArgumentOfPeriapsis = ((o.mercuryPerihelion - o.mercuryAscendingNode) % 360 + 360) % 360;

  // DEBUG: Log ascending node calculation details (simplified)
  const now = Date.now();
  if (_debugAscendingNodeLogEnabled && (now - _debugAscendingNodeLastLog > _debugAscendingNodeInterval)) {
    _debugAscendingNodeLastLog = now;
    console.log(`🔍 Ascending Node: Year ${currentYear.toFixed(2)}, Mercury Ω = ${o.mercuryAscendingNode.toFixed(2)}° (static: ${mercuryAscendingNode}°, diff: ${(o.mercuryAscendingNode - mercuryAscendingNode).toFixed(2)}°)`);
    console.log(`🌍 DEBUG TEST v2 - code updated check`);

    // Earth Invariable Plane debug
    try {
      const sunLongDeg = (sun && sun.ra !== undefined) ? sun.ra * 180 / Math.PI : 0;
      const earthHelioLong = (sunLongDeg + 180 + 360) % 360;
      const yearsSinceJ2000 = currentYear - 2000.5;
      const earthPrecRate = 360 / earthPerihelionEclipticYears;
      const earthAscNodeDyn = (earthAscendingNodeInvPlaneVerified + earthPrecRate * yearsSinceJ2000 + 360) % 360;
      const angleFromAscNode = (earthHelioLong - earthAscNodeDyn + 360) % 360;
      console.log(`🌍 EARTH INV PLANE: sun.ra=${sunLongDeg.toFixed(2)}°, earthHelioLong=${earthHelioLong.toFixed(2)}°`);
      console.log(`   ascNodeJ2000=${earthAscendingNodeInvPlaneVerified}°, ascNodeDyn=${earthAscNodeDyn.toFixed(4)}°, angleFromNode=${angleFromAscNode.toFixed(2)}°`);
      console.log(`   o.earthAscendingNodeInvPlane=${o.earthAscendingNodeInvPlane?.toFixed(4)}°, height=${o.earthHeightAboveInvPlane?.toFixed(6)} AU`);
    } catch (e) {
      console.log(`🌍 EARTH INV PLANE DEBUG ERROR: ${e.message}`);
    }
  }

  // Venus
  o.venusAscendingNode = calculateDynamicAscendingNodeFromTilts(
    venusRealPerihelionAtSun.orbitTilta, venusRealPerihelionAtSun.orbitTiltb, currentObliquity, earthInclination, currentYear
  );
  o.venusArgumentOfPeriapsis = ((o.venusPerihelion - o.venusAscendingNode) % 360 + 360) % 360;

  // Mars - NOTE: Mars (1.85°) is within Earth's inclination range and will experience crossover
  o.marsAscendingNode = calculateDynamicAscendingNodeFromTilts(
    marsRealPerihelionAtSun.orbitTilta, marsRealPerihelionAtSun.orbitTiltb, currentObliquity, earthInclination, currentYear
  );
  o.marsArgumentOfPeriapsis = ((o.marsPerihelion - o.marsAscendingNode) % 360 + 360) % 360;

  // Jupiter - NOTE: Jupiter (1.30°) is within Earth's inclination range and will experience crossover
  o.jupiterAscendingNode = calculateDynamicAscendingNodeFromTilts(
    jupiterRealPerihelionAtSun.orbitTilta, jupiterRealPerihelionAtSun.orbitTiltb, currentObliquity, earthInclination, currentYear
  );
  o.jupiterArgumentOfPeriapsis = ((o.jupiterPerihelion - o.jupiterAscendingNode) % 360 + 360) % 360;

  // Saturn
  o.saturnAscendingNode = calculateDynamicAscendingNodeFromTilts(
    saturnRealPerihelionAtSun.orbitTilta, saturnRealPerihelionAtSun.orbitTiltb, currentObliquity, earthInclination, currentYear
  );
  o.saturnArgumentOfPeriapsis = ((o.saturnPerihelion - o.saturnAscendingNode) % 360 + 360) % 360;

  // Uranus
  o.uranusAscendingNode = calculateDynamicAscendingNodeFromTilts(
    uranusRealPerihelionAtSun.orbitTilta, uranusRealPerihelionAtSun.orbitTiltb, currentObliquity, earthInclination, currentYear
  );
  o.uranusArgumentOfPeriapsis = ((o.uranusPerihelion - o.uranusAscendingNode) % 360 + 360) % 360;

  // Neptune
  o.neptuneAscendingNode = calculateDynamicAscendingNodeFromTilts(
    neptuneRealPerihelionAtSun.orbitTilta, neptuneRealPerihelionAtSun.orbitTiltb, currentObliquity, earthInclination, currentYear
  );
  o.neptuneArgumentOfPeriapsis = ((o.neptunePerihelion - o.neptuneAscendingNode) % 360 + 360) % 360;

  // Pluto
  o.plutoAscendingNode = calculateDynamicAscendingNodeFromTilts(
    plutoRealPerihelionAtSun.orbitTilta, plutoRealPerihelionAtSun.orbitTiltb, currentObliquity, earthInclination, currentYear
  );
  o.plutoArgumentOfPeriapsis = ((o.plutoPerihelion - o.plutoAscendingNode) % 360 + 360) % 360;

  // Halley's Comet
  o.halleysAscendingNode = calculateDynamicAscendingNodeFromTilts(
    halleysRealPerihelionAtSun.orbitTilta, halleysRealPerihelionAtSun.orbitTiltb, currentObliquity, earthInclination, currentYear
  );
  o.halleysArgumentOfPeriapsis = ((o.halleysPerihelion - o.halleysAscendingNode) % 360 + 360) % 360;

  // Eros
  o.erosAscendingNode = calculateDynamicAscendingNodeFromTilts(
    erosRealPerihelionAtSun.orbitTilta, erosRealPerihelionAtSun.orbitTiltb, currentObliquity, earthInclination, currentYear
  );
  o.erosArgumentOfPeriapsis = ((o.erosPerihelion - o.erosAscendingNode) % 360 + 360) % 360;

  // Update the visual orbital plane markers to reflect the dynamic ascending nodes
  updateOrbitalPlaneRotations();
}

/**
 * Update the orbital plane container rotations based on dynamic ascending node values.
 * This ensures the visual markers (orbital plane, node markers) reflect the current
 * ascending node rather than the static epoch 2000 values.
 *
 * The formula to convert ascending node Ω and inclination i to tilt values:
 *   orbitTilta = cos((-90-Ω) * π/180) * -inclination
 *   orbitTiltb = sin((-90-Ω) * π/180) * -inclination
 *
 * The containerObj.rotation uses:
 *   rotation.x = orbitTilta * π/180
 *   rotation.z = orbitTiltb * π/180
 */
function updateOrbitalPlaneRotations() {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  // Helper to update a planet's orbital plane rotation
  const updatePlaneRotation = (planetData, ascendingNode, inclination, planetName) => {
    if (!planetData.containerObj) {
      if (_debugAscendingNodeLogEnabled && planetName === 'Mercury') {
        console.warn(`⚠️ DEBUG: ${planetName} containerObj is missing!`);
      }
      return;
    }

    // Calculate new tilt values from dynamic ascending node
    const angle = (-90 - ascendingNode) * DEG2RAD;
    const newTilta = Math.cos(angle) * -inclination;
    const newTiltb = Math.sin(angle) * -inclination;

    // DEBUG: Log what we're setting
    if (_debugAscendingNodeLogEnabled && planetName === 'Mercury') {
      const now = Date.now();
      if (now - _debugAscendingNodeLastLog < _debugAscendingNodeInterval + 100) {
        const oldX = planetData.containerObj.rotation.x;
        const newX = newTilta * DEG2RAD;
        console.log(`🔧 Mercury rotation: Ω=${ascendingNode.toFixed(2)}°, old.x=${oldX.toFixed(6)}, new.x=${newX.toFixed(6)}, diff=${(newX-oldX).toFixed(8)}`);
      }
    }

    // Update container rotation
    planetData.containerObj.rotation.x = newTilta * DEG2RAD;
    planetData.containerObj.rotation.z = newTiltb * DEG2RAD;
  };

  // Update each planet's orbital plane using dynamic apparent inclination
  updatePlaneRotation(mercuryRealPerihelionAtSun, o.mercuryAscendingNode, o.mercuryApparentInclination, 'Mercury');
  updatePlaneRotation(venusRealPerihelionAtSun, o.venusAscendingNode, o.venusApparentInclination, 'Venus');
  updatePlaneRotation(marsRealPerihelionAtSun, o.marsAscendingNode, o.marsApparentInclination, 'Mars');
  updatePlaneRotation(jupiterRealPerihelionAtSun, o.jupiterAscendingNode, o.jupiterApparentInclination, 'Jupiter');
  updatePlaneRotation(saturnRealPerihelionAtSun, o.saturnAscendingNode, o.saturnApparentInclination, 'Saturn');
  updatePlaneRotation(uranusRealPerihelionAtSun, o.uranusAscendingNode, o.uranusApparentInclination, 'Uranus');
  updatePlaneRotation(neptuneRealPerihelionAtSun, o.neptuneAscendingNode, o.neptuneApparentInclination, 'Neptune');
  updatePlaneRotation(plutoRealPerihelionAtSun, o.plutoAscendingNode, o.plutoApparentInclination, 'Pluto');
  updatePlaneRotation(halleysRealPerihelionAtSun, o.halleysAscendingNode, o.halleysApparentInclination, 'Halleys');
  updatePlaneRotation(erosRealPerihelionAtSun, o.erosAscendingNode, o.erosApparentInclination, 'Eros');
}

/**
 * Calculate Mean Anomaly and True Anomaly for all planets.
 *
 * Mean Anomaly (M): Angle measured at P (orbit center) from perihelion to planet
 * True Anomaly (ν): Angle measured at Sun (focus) from perihelion to planet
 *
 * This function calculates anomalies based on actual 3D positions in the model,
 * not time-based calculations. This ensures the displayed values match what
 * is visually shown in the simulation.
 *
 * Called each frame after updateAscendingNodes() and before updateHierarchyLiveData().
 */
function updatePlanetAnomalies() {
  // Get Sun position (common for all planets) - using pooled vector
  sun.pivotObj.getWorldPosition(_anomalySunPos);

  // Planet configuration: [planetObj, fixedPerihelionAtSun, propertyPrefix, eccentricity]
  const planets = [
    { planet: mercury, fixedPerihelion: mercuryFixedPerihelionAtSun, key: 'mercury', e: mercuryOrbitalEccentricity },
    { planet: venus, fixedPerihelion: venusFixedPerihelionAtSun, key: 'venus', e: venusOrbitalEccentricity },
    { planet: mars, fixedPerihelion: marsFixedPerihelionAtSun, key: 'mars', e: marsOrbitalEccentricity },
    { planet: jupiter, fixedPerihelion: jupiterFixedPerihelionAtSun, key: 'jupiter', e: jupiterOrbitalEccentricity },
    { planet: saturn, fixedPerihelion: saturnFixedPerihelionAtSun, key: 'saturn', e: saturnOrbitalEccentricity },
    { planet: uranus, fixedPerihelion: uranusFixedPerihelionAtSun, key: 'uranus', e: uranusOrbitalEccentricity },
    { planet: neptune, fixedPerihelion: neptuneFixedPerihelionAtSun, key: 'neptune', e: neptuneOrbitalEccentricity },
    { planet: pluto, fixedPerihelion: plutoFixedPerihelionAtSun, key: 'pluto', e: plutoOrbitalEccentricity },
    { planet: halleys, fixedPerihelion: halleysFixedPerihelionAtSun, key: 'halleys', e: halleysOrbitalEccentricity },
    { planet: eros, fixedPerihelion: erosFixedPerihelionAtSun, key: 'eros', e: erosOrbitalEccentricity }
  ];

  for (const { planet, fixedPerihelion, key, e } of planets) {
    // Skip if objects don't exist
    if (!planet?.pivotObj || !fixedPerihelion?.pivotObj || !fixedPerihelion?.planetObj) {
      continue;
    }

    // Get positions (using pooled vectors)
    fixedPerihelion.pivotObj.getWorldPosition(_anomalyPPos);           // P = orbit center
    planet.pivotObj.getWorldPosition(_anomalyPlanetPos);               // Planet position

    // Calculate direction vectors in XZ plane (ecliptic)
    // In an elliptical orbit:
    // - P (center) is at the geometric center of the ellipse
    // - Sun (focus) is between P and perihelion, at distance a*e from P
    // - Perihelion is in the direction from P toward Sun, beyond the Sun
    //
    // Layout: P -------- Sun ------- Perihelion
    //
    // So perihelion direction from both P and Sun is: P → Sun direction
    const periDirX = _anomalySunPos.x - _anomalyPPos.x;
    const periDirZ = _anomalySunPos.z - _anomalyPPos.z;

    // For both True Anomaly and Mean Anomaly, the perihelion reference is the same direction
    const periDirFromSunX = periDirX;
    const periDirFromSunZ = periDirZ;
    const periDirFromPX = periDirX;
    const periDirFromPZ = periDirZ;

    // Planet direction from Sun (for True Anomaly)
    const planetDirFromSunX = _anomalyPlanetPos.x - _anomalySunPos.x;
    const planetDirFromSunZ = _anomalyPlanetPos.z - _anomalySunPos.z;

    // Planet direction from P (for Mean Anomaly)
    const planetDirFromPX = _anomalyPlanetPos.x - _anomalyPPos.x;
    const planetDirFromPZ = _anomalyPlanetPos.z - _anomalyPPos.z;

    // Calculate angles using atan2 (negate Z for counter-clockwise measurement)
    const periAngleSun = Math.atan2(-periDirFromSunZ, periDirFromSunX);
    const planetAngleSun = Math.atan2(-planetDirFromSunZ, planetDirFromSunX);

    const periAngleP = Math.atan2(-periDirFromPZ, periDirFromPX);
    const planetAngleP = Math.atan2(-planetDirFromPZ, planetDirFromPX);

    // True Anomaly: angle at Sun from perihelion to planet
    let trueAnomalyRad = planetAngleSun - periAngleSun;

    // Mean Anomaly: angle at P from perihelion to planet
    let meanAnomalyRad = planetAngleP - periAngleP;

    // Normalize to 0 to 2*PI range
    trueAnomalyRad = ((trueAnomalyRad % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    meanAnomalyRad = ((meanAnomalyRad % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

    // Convert to degrees and store in o object
    o[key + 'TrueAnomaly'] = trueAnomalyRad * 180 / Math.PI;
    o[key + 'MeanAnomaly'] = meanAnomalyRad * 180 / Math.PI;

    // Calculate Eccentric Anomaly from Mean Anomaly using Newton-Raphson iteration
    o[key + 'EccentricAnomaly'] = OrbitalFormulas.eccentricAnomaly(o[key + 'MeanAnomaly'], e);
  }

  // Calculate Earth's anomalies
  // Earth is special: we derive position from the Sun's ecliptic longitude + 180°
  // sun.ra is in radians, represents Sun's position as seen from Earth
  if (sun && sun.ra !== undefined) {
    const sunLongDeg = sun.ra * 180 / Math.PI;
    const earthHelioLong = (sunLongDeg + 180 + 360) % 360;  // Earth's heliocentric longitude

    // Longitude of perihelion for Earth
    const earthLonPeri = o.earthPerihelion || ((earthPerihelionFromEarth.ra * 180 / Math.PI + 360) % 360);

    // True Anomaly = Heliocentric Longitude - Longitude of Perihelion
    let earthTrueAnom = (earthHelioLong - earthLonPeri + 360) % 360;
    o.earthTrueAnomaly = earthTrueAnom;

    // For Earth, the argument of periapsis equals the longitude of perihelion
    // (since Earth's ascending node on ecliptic is at 0° by definition)
    o.earthArgumentOfPeriapsis = earthLonPeri;

    // Get current eccentricity (dynamic)
    const earthE = o.eccentricityEarth || eccentricityMean;

    // Convert True Anomaly to Eccentric Anomaly using exact formula:
    // tan(E/2) = sqrt((1-e)/(1+e)) * tan(ν/2)
    const nuRad = earthTrueAnom * Math.PI / 180;
    const tanHalfNu = Math.tan(nuRad / 2);
    const tanHalfE = Math.sqrt((1 - earthE) / (1 + earthE)) * tanHalfNu;
    let earthEccAnom = 2 * Math.atan(tanHalfE) * 180 / Math.PI;
    earthEccAnom = ((earthEccAnom % 360) + 360) % 360;
    o.earthEccentricAnomaly = earthEccAnom;

    // Mean Anomaly from Eccentric Anomaly using Kepler's equation: M = E - e*sin(E)
    const E_rad = earthEccAnom * Math.PI / 180;
    let earthMeanAnom = (earthEccAnom - (earthE * Math.sin(E_rad) * 180 / Math.PI));
    earthMeanAnom = ((earthMeanAnom % 360) + 360) % 360;
    o.earthMeanAnomaly = earthMeanAnom;
  }
}

/**
 * Calculate each planet's height above/below the invariable plane.
 *
 * The invariable plane is the fundamental reference plane of the solar system,
 * perpendicular to the total angular momentum vector. Each planet crosses this
 * plane twice per orbit (at ascending and descending nodes).
 *
 * Height = sin(inclination_to_inv_plane) * sin(angle_from_ascending_node) * distance
 *
 * The ascending nodes on the invariable plane precess over time.
 * Precession rates use <planet>PerihelionEclipticYears constants.
 *
 * Called each frame after updatePlanetAnomalies().
 *
 * Reference: Souami & Souchay (2012), "The solar system's invariable plane"
 */
function updatePlanetInvariablePlaneHeights() {
  const DEG2RAD = Math.PI / 180;

  // Years since J2000.0 epoch (year 2000.5)
  const yearsSinceJ2000 = o.currentYear - 2000.5;

  // Planet configuration for invariable plane calculations
  // Each entry includes: key, planetObj, inclToInvPlane, ascNodeAtJ2000 (Souami & Souchay), ascNodeJ2000Verified, precessionPeriodYears
  // Precession uses <planet>PerihelionEclipticYears constants
  const planets = [
    { key: 'mercury', obj: mercury, incl: mercuryInclination, ascNodeJ2000: mercuryAscendingNodeInvPlaneSouamiSouchay, ascNodeJ2000Verified: mercuryAscendingNodeInvPlaneVerified, precessionYears: mercuryPerihelionEclipticYears },
    { key: 'venus',   obj: venus,   incl: venusInclination,   ascNodeJ2000: venusAscendingNodeInvPlaneSouamiSouchay,   ascNodeJ2000Verified: venusAscendingNodeInvPlaneVerified,   precessionYears: venusPerihelionEclipticYears },
    { key: 'earth',   obj: null,    incl: null,               ascNodeJ2000: earthAscendingNodeInvPlaneSouamiSouchay,   ascNodeJ2000Verified: earthAscendingNodeInvPlaneVerified, precessionYears: earthPerihelionEclipticYears },
    { key: 'mars',    obj: mars,    incl: marsInclination,    ascNodeJ2000: marsAscendingNodeInvPlaneSouamiSouchay,    ascNodeJ2000Verified: marsAscendingNodeInvPlaneVerified,    precessionYears: marsPerihelionEclipticYears },
    { key: 'jupiter', obj: jupiter, incl: jupiterInclination, ascNodeJ2000: jupiterAscendingNodeInvPlaneSouamiSouchay, ascNodeJ2000Verified: jupiterAscendingNodeInvPlaneVerified, precessionYears: jupiterPerihelionEclipticYears },
    { key: 'saturn',  obj: saturn,  incl: saturnInclination,  ascNodeJ2000: saturnAscendingNodeInvPlaneSouamiSouchay,  ascNodeJ2000Verified: saturnAscendingNodeInvPlaneVerified,  precessionYears: saturnPerihelionEclipticYears },
    { key: 'uranus',  obj: uranus,  incl: uranusInclination,  ascNodeJ2000: uranusAscendingNodeInvPlaneSouamiSouchay,  ascNodeJ2000Verified: uranusAscendingNodeInvPlaneVerified,  precessionYears: uranusPerihelionEclipticYears },
    { key: 'neptune', obj: neptune, incl: neptuneInclination, ascNodeJ2000: neptuneAscendingNodeInvPlaneSouamiSouchay, ascNodeJ2000Verified: neptuneAscendingNodeInvPlaneVerified, precessionYears: neptunePerihelionEclipticYears },
    { key: 'pluto',   obj: pluto,   incl: plutoInclination,   ascNodeJ2000: plutoAscendingNodeInvPlaneSouamiSouchay,   ascNodeJ2000Verified: plutoAscendingNodeInvPlaneVerified,   precessionYears: plutoPerihelionEclipticYears },
    { key: 'halleys', obj: halleys, incl: halleysInclination, ascNodeJ2000: halleysAscendingNodeInvPlaneSouamiSouchay, ascNodeJ2000Verified: halleysAscendingNodeInvPlaneVerified, precessionYears: halleysPerihelionEclipticYears },
    { key: 'eros',    obj: eros,    incl: erosInclination,    ascNodeJ2000: erosAscendingNodeInvPlaneSouamiSouchay,    ascNodeJ2000Verified: erosAscendingNodeInvPlaneVerified,    precessionYears: erosPerihelionEclipticYears }
  ];

  for (const { key, obj, incl, ascNodeJ2000, ascNodeJ2000Verified, precessionYears } of planets) {
    let eclipticLongitude;
    let distanceAU;
    let inclToInvPlane;

    // Calculate dynamic ascending node on invariable plane (precesses over time)
    // Precession rate = 360° / precessionYears (degrees per year)
    const precessionRate = 360 / precessionYears;
    // Use proper modulo that handles large negative values correctly
    const rawSS = ascNodeJ2000 + precessionRate * yearsSinceJ2000;
    const rawVerified = ascNodeJ2000Verified + precessionRate * yearsSinceJ2000;
    const ascNodeDynamicSS = ((rawSS % 360) + 360) % 360;
    const ascNodeDynamicVerified = ((rawVerified % 360) + 360) % 360;

    // Store the dynamic ascending nodes for reference
    // Primary value uses J2000-verified ascending nodes (matches J2000 apparent inclinations)
    o[key + 'AscendingNodeInvPlane'] = ascNodeDynamicVerified;
    // Also store Souami & Souchay value for comparison (including Earth)
    o[key + 'AscendingNodeInvPlaneSouamiSouchay'] = ascNodeDynamicSS;

    if (key === 'earth') {
      // Earth is special: we don't have o.earthTrueAnomaly etc.
      // Instead, use sun.ra (Sun's ecliptic longitude from Earth's view) + 180° to get Earth's heliocentric longitude
      // sun.ra is in radians
      const sunLongDeg = sun.ra * 180 / Math.PI;
      eclipticLongitude = (sunLongDeg + 180 + 360) % 360;
      distanceAU = earthWobbleCenter.sunDistAU || 1.0;
      inclToInvPlane = o.inclinationEarth || 1.578;  // Use dynamic value, fallback to mean

    } else {
      // Get planet's true anomaly (already calculated in updatePlanetAnomalies)
      const trueAnomaly = o[key + 'TrueAnomaly'] || 0;

      // Get argument of periapsis (already calculated in updateOrbitOrientations)
      const argPeriapsisEcliptic = o[key + 'ArgumentOfPeriapsis'] || 0;

      // Get ascending node on ecliptic (dynamic value)
      const ascNodeEcliptic = o[key + 'AscendingNode'] || 0;

      // Get inclination to invariable plane (constant for non-Earth planets)
      inclToInvPlane = incl;

      // Get distance from Sun (in AU)
      if (obj && obj.sunDistAU !== undefined) {
        distanceAU = obj.sunDistAU;
      } else {
        distanceAU = 1.0; // Fallback
      }

      // Calculate the planet's ecliptic longitude
      // Ecliptic longitude = Ascending node (ecliptic) + Argument of periapsis + True anomaly
      eclipticLongitude = (ascNodeEcliptic + argPeriapsisEcliptic + trueAnomaly) % 360;
    }

    // Calculate angle from the ascending node on the invariable plane
    // This is the ecliptic longitude minus the dynamic ascending node on invariable plane
    // Using J2000-verified ascending node (primary value)
    let angleFromInvAscNode = (eclipticLongitude - ascNodeDynamicVerified + 360) % 360;

    // Convert to radians for sine calculation
    const angleRad = angleFromInvAscNode * DEG2RAD;
    const inclRad = inclToInvPlane * DEG2RAD;

    // Calculate height above invariable plane
    // Height = sin(inclination) * sin(angle from ascending node) * distance
    const height = Math.sin(inclRad) * Math.sin(angleRad) * distanceAU;

    // Store results in o object
    o[key + 'HeightAboveInvPlane'] = height;
    o[key + 'AboveInvPlane'] = height > 0;

  }
}

/**
 * Calculate dynamic apparent inclinations for all planets.
 *
 * The apparent inclination of a planet relative to Earth's orbital plane (ecliptic)
 * changes over time because the ecliptic itself tilts relative to the invariable plane.
 *
 * Algorithm:
 * 1. Calculate ecliptic normal vector from Earth's inclination and ascending node on invariable plane
 * 2. For each planet, calculate its orbital plane normal from its inclination and ascending node
 * 3. The angle between the two normals is the apparent inclination
 *
 * Uses existing constants (<planet>Inclination) for fixed inclination to invariable plane,
 * and dynamic values (o.<planet>AscendingNodeInvPlane) for precessing ascending nodes.
 *
 * Output:
 * - o.<planet>ApparentInclination: using J2000-verified ascending nodes (matches J2000 exactly)
 * - o.<planet>ApparentInclinationSouamiSouchay: using original Souami & Souchay (2012) ascending nodes
 */
function updateDynamicInclinations() {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  // Get Earth's current orbital plane normals (ecliptic normals)
  // We need TWO ecliptic normals: one for S&S calculations, one for Verified calculations
  // Normal vector formula: n = (sin(i)*sin(Ω), sin(i)*cos(Ω), cos(i))
  const earthI = o.inclinationEarth * DEG2RAD;

  // Ecliptic normal using S&S Earth ascending node (for ApparentInclinationSouamiSouchay)
  const earthOmegaSS = o.earthAscendingNodeInvPlaneSouamiSouchay * DEG2RAD;
  _eclipticNormalSS.set(
    Math.sin(earthI) * Math.sin(earthOmegaSS),
    Math.sin(earthI) * Math.cos(earthOmegaSS),
    Math.cos(earthI)
  );

  // Ecliptic normal using Verified Earth ascending node (for ApparentInclination)
  const earthOmegaVerified = o.earthAscendingNodeInvPlane * DEG2RAD;
  _eclipticNormalVerified.set(
    Math.sin(earthI) * Math.sin(earthOmegaVerified),
    Math.sin(earthI) * Math.cos(earthOmegaVerified),
    Math.cos(earthI)
  );

  // Planet configuration
  // incl = Souami & Souchay (2012) inclinations to invariable plane (used for both calculations)
  // ascNodeSS = Souami & Souchay (2012) ascending nodes (dynamic, precessing)
  // ascNodeVerified = J2000-verified ascending nodes (dynamic, precessing) - now the primary value
  const planets = [
    { key: 'mercury', incl: mercuryInclination, ascNodeSS: o.mercuryAscendingNodeInvPlaneSouamiSouchay, ascNodeVerified: o.mercuryAscendingNodeInvPlane },
    { key: 'venus',   incl: venusInclination,   ascNodeSS: o.venusAscendingNodeInvPlaneSouamiSouchay,   ascNodeVerified: o.venusAscendingNodeInvPlane },
    { key: 'mars',    incl: marsInclination,    ascNodeSS: o.marsAscendingNodeInvPlaneSouamiSouchay,    ascNodeVerified: o.marsAscendingNodeInvPlane },
    { key: 'jupiter', incl: jupiterInclination, ascNodeSS: o.jupiterAscendingNodeInvPlaneSouamiSouchay, ascNodeVerified: o.jupiterAscendingNodeInvPlane },
    { key: 'saturn',  incl: saturnInclination,  ascNodeSS: o.saturnAscendingNodeInvPlaneSouamiSouchay,  ascNodeVerified: o.saturnAscendingNodeInvPlane },
    { key: 'uranus',  incl: uranusInclination,  ascNodeSS: o.uranusAscendingNodeInvPlaneSouamiSouchay,  ascNodeVerified: o.uranusAscendingNodeInvPlane },
    { key: 'neptune', incl: neptuneInclination, ascNodeSS: o.neptuneAscendingNodeInvPlaneSouamiSouchay, ascNodeVerified: o.neptuneAscendingNodeInvPlane },
    { key: 'pluto',   incl: plutoInclination,   ascNodeSS: o.plutoAscendingNodeInvPlaneSouamiSouchay,   ascNodeVerified: o.plutoAscendingNodeInvPlane },
    { key: 'halleys', incl: halleysInclination, ascNodeSS: o.halleysAscendingNodeInvPlaneSouamiSouchay, ascNodeVerified: o.halleysAscendingNodeInvPlane },
    { key: 'eros',    incl: erosInclination,    ascNodeSS: o.erosAscendingNodeInvPlaneSouamiSouchay,    ascNodeVerified: o.erosAscendingNodeInvPlane }
  ];

  for (const { key, incl, ascNodeSS, ascNodeVerified } of planets) {
    const pI = incl * DEG2RAD;

    // Calculate using Souami & Souchay ascending node AND S&S ecliptic normal
    const pOmegaSS = ascNodeSS * DEG2RAD;
    _planetNormal.set(
      Math.sin(pI) * Math.sin(pOmegaSS),
      Math.sin(pI) * Math.cos(pOmegaSS),
      Math.cos(pI)
    );
    const cosAngleSS = _planetNormal.dot(_eclipticNormalSS);
    const apparentInclSS = Math.acos(Math.max(-1, Math.min(1, cosAngleSS))) * RAD2DEG;
    o[key + 'ApparentInclinationSouamiSouchay'] = apparentInclSS;

    // Calculate using J2000-verified ascending node AND Verified ecliptic normal
    const pOmegaVerified = ascNodeVerified * DEG2RAD;
    _planetNormal.set(
      Math.sin(pI) * Math.sin(pOmegaVerified),
      Math.sin(pI) * Math.cos(pOmegaVerified),
      Math.cos(pI)
    );
    const cosAngleVerified = _planetNormal.dot(_eclipticNormalVerified);
    const apparentInclVerified = Math.acos(Math.max(-1, Math.min(1, cosAngleVerified))) * RAD2DEG;
    o[key + 'ApparentInclination'] = apparentInclVerified;
  }
}

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
  // Use dynamic container rotation if available (updated by updateOrbitalPlaneRotations),
  // otherwise fall back to static values
  let ax, az;
  if (pd.containerObj) {
    // Convert from radians back to degrees (container rotation is in radians)
    ax = pd.containerObj.rotation.x * 180 / Math.PI;
    az = pd.containerObj.rotation.z * 180 / Math.PI;
  } else {
    ax = pd.orbitTilta;   // degrees (static fallback)
    az = pd.orbitTiltb;   // degrees
  }

  /* ---- 1  inclination --------------------------------------------- */
  const i = Math.hypot(ax, az);       // √(ax² + az²)

  // if (i < 1e-6) {
  //   // Orbit lies exactly in the ecliptic: nodes & ω are undefined.
  //   throw new RangeError(`${pd.name}: i ≃ 0°, nodes undefined`);
  // }

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
    ["mercury",  mercuryRealPerihelionAtSun,  o.mercuryPerihelion],
    ["venus",    venusRealPerihelionAtSun,    o.venusPerihelion],
//    ["mercury2",    mercuryRealPerihelionAtSun,    o.mercuryPerihelion2],    
    ["mars",     marsRealPerihelionAtSun,     o.marsPerihelion],
    ["jupiter",  jupiterRealPerihelionAtSun,  o.jupiterPerihelion],
    ["saturn",   saturnRealPerihelionAtSun,   o.saturnPerihelion],
    ["uranus",   uranusRealPerihelionAtSun,   o.uranusPerihelion],
    ["neptune",  neptuneRealPerihelionAtSun,  o.neptunePerihelion],
    ["pluto",    plutoRealPerihelionAtSun,    o.plutoPerihelion],
    ["halleys",  halleysRealPerihelionAtSun,  o.halleysPerihelion],
    ["eros",     erosRealPerihelionAtSun,     o.erosPerihelion]
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
  // Pre-allocate Vector3 array (one per perihelion point) - avoids clone() allocations
  const visiblePts = [];
  for (let i = 0; i < pds.length; i++) {
    visiblePts.push(new THREE.Vector3());
  }

  function updateGoldenSpiralLine() {

    /* 3-a. gather **all** perihelion helpers into pre-allocated vectors */
     for (let i = 0; i < pds.length; i++) {
       pds[i].pivotObj.getWorldPosition(visiblePts[i]);
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
  const cycles       = Math.floor((JD - perihelionalignmentJD) / siderealDays);
  return perihelionalignmentJD + cycles * siderealDays;
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
  sun.planetObj.getWorldPosition(_elSunPos);
  earth.planetObj.getWorldPosition(_elEarthPos);
  targetPlanet.planetObj.getWorldPosition(_elTargetPos);

  const earthSunDistance = _elEarthPos.distanceTo(_elSunPos);
  const earthTargetPlanetDistance = _elEarthPos.distanceTo(_elTargetPos);
  const sunTargetPlanetDistance = _elSunPos.distanceTo(_elTargetPos);

  const numerator =
    Math.pow(earthSunDistance, 2) +
    Math.pow(earthTargetPlanetDistance, 2) -
    Math.pow(sunTargetPlanetDistance, 2);

  const denominator = 2.0 * earthSunDistance * earthTargetPlanetDistance;

  const elongationRadians = Math.acos(numerator / denominator);
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
  o["plutoElongation"]=getElongationFromSun(pluto);
  o["halleysElongation"]=getElongationFromSun(halleys);
  o["erosElongation"]=getElongationFromSun(eros);
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

  // Compute these early - they are dependencies for calculations below
  predictions.lengthofsolarYearSecRealLOD = o.lengthofsolarYearSecRealLOD = o.lengthofsolarYear*o.lengthofDay;
  predictions.computeAxialPrecessionRealLOD = o.axialPrecessionRealLOD = computeAxialPrecessionRealLOD(o.lengthofsiderealYear, o.lengthofsolarYear, o.lengthofDay);
  predictions.perihelionPrecessionRealLOD = o.perihelionPrecessionRealLOD = o.axialPrecessionRealLOD*13/16;

  predictions.lengthofsolarYearinDays = o.lengthofsolarYearinDays = o.lengthofsolarYearSecRealLOD/86400;
  predictions.lengthofsiderealDay = o.lengthofsiderealDay = o.lengthofsolarYearSecRealLOD/(o.lengthofsolarYearinDays+1);
  predictions.lengthofstellarDay = o.lengthofstellarDay = (((o.lengthofsiderealYear-o.lengthofsolarYearSecRealLOD)/(1/eccentricityAmplitude/13*16))/(o.lengthofsolarYear+1))+o.lengthofsiderealDay;
  
  predictions.lengthofsiderealYearDays = o.lengthofsiderealYear/86400; 
  
  predictions.perihelionPrecession = o.perihelionPrecession = o.axialPrecession*13/16;
  predictions.axialPrecession = o.axialPrecession = computeAxialPrecession(o.lengthofsiderealYear, o.lengthofsolarYear);
  predictions.inclinationPrecession = o.inclinationPrecession = o.axialPrecession*13/3;
  predictions.obliquityPrecession = o.obliquityPrecession = o.axialPrecession*13/8;
  predictions.eclipticPrecession = o.eclipticPrecession = o.axialPrecession*13/5;
  
  predictions.lengthofsiderealDayRealLOD = o.lengthofsiderealDayRealLOD = o.lengthofsolarYearSecRealLOD/(o.lengthofsolarYear+1);
  predictions.lengthofstellarDayRealLOD = o.lengthofstellarDayRealLOD = (((o.lengthofsiderealYear-o.lengthofsolarYearSecRealLOD)/(1/eccentricityAmplitude/13*16))/(o.lengthofsolarYear+1))+o.lengthofsiderealDayRealLOD;
  
  //predictions.predictedDeltat = getDeltaT();
  predictions.predictedDeltatPerYear = o.predictedDeltatPerYear = getDeltaTChangePerYear();
  
  predictions.lengthofsiderealYearDaysRealLOD = o.lengthofsiderealYear/o.lengthofDay;
  predictions.lengthofanomalisticYearRealLOD = o.lengthofanomalisticYearRealLOD = computeLengthofanomalisticYearRealLOD(o.perihelionPrecessionRealLOD, o.lengthofsolarYear, o.lengthofDay);

  predictions.lengthofanomalisticYearinDays = o.lengthofanomalisticYearinDays = o.lengthofanomalisticYearRealLOD/86400;
  predictions.lengthofanomalisticDaysRealLOD = o.lengthofanomalisticDaysRealLOD = o.lengthofanomalisticYearRealLOD/o.lengthofDay;

  predictions.inclinationPrecessionRealLOD = o.inclinationPrecessionRealLOD = o.axialPrecessionRealLOD*13/3;
  predictions.obliquityPrecessionRealLOD = o.obliquityPrecessionRealLOD = o.axialPrecessionRealLOD*13/8;
  predictions.eclipticPrecessionRealLOD =o.eclipticPrecessionRealLOD = o.axialPrecessionRealLOD*13/5;
  
  predictions.eccentricityEarth = o.eccentricityEarth = computeEccentricityEarth(o.currentYear, balancedYear, perihelionCycleLength, eccentricityMean, eccentricityAmplitude, eccentricitySinusCorrection);
  predictions.obliquityEarth = o.obliquityEarth = computeObliquityEarth(o.currentYear);
  predictions.inclinationEarth = o.inclinationEarth = computeInclinationEarth(o.currentYear, balancedYear, holisticyearLength, earthinclinationMean, tiltandinclinationAmplitude);
  predictions.longitudePerihelion = o.longitudePerihelion = computeLongitudePerihelion(o.currentYear, balancedYear, perihelionCycleLength, o.perihelionprecessioncycleYear, helionpointAmplitude, mideccentricitypointAmplitude); // better to use ((earthPerihelionFromEarth.ra * 180 / Math.PI + 360) % 360) because this is just a rough estimate formula
  
  predictions.longitudePerihelionDatePer = o.longitudePerihelionDatePer = longitudeToDateTime((((earthPerihelionFromEarth.ra * 180 / Math.PI + 360) % 360)-earthRAAngle-180), o.currentYear)
  predictions.longitudePerihelionDateAp = o.longitudePerihelionDateAp = longitudeToDateTime(((earthPerihelionFromEarth.ra * 180 / Math.PI + 360)-earthRAAngle % 360), o.currentYear)
  
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
  //const firstFactor = helionpointAmplitude / ((360 / perihelionCycleLength) * 100);

  // angle for the first COS term (in radians):
  // (cycleValue / perihelionCycleLength) * 360°
  const angle1 = (cycleValue / perihelionCycleLength) * 360 * Math.PI / 180;
  const term1 = -meansolardayAmplitudeinSeconds * meansolaryearAmplitude * Math.cos(angle1);

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

function makeRealisticEarth(pd){

    /* ------------------------------------------------ geometry -------- */
    const radius   = pd.size;
    const segments = 128;
    const geom     = new THREE.SphereGeometry(radius, segments, segments);

    /* ------------------------------------------------ textures -------- */
    const TL = new THREE.TextureLoader().setCrossOrigin('anonymous');
    const tex = {
        dayPostLGM  : TL.load("https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/Earth.jpg"),
        dayLGM      : TL.load("https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/EarthLGM.png"),
        niteModern  : TL.load("https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/EarthNight.png"),
        niteClassic : TL.load("https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/EarthNightClassic.png"),
        norm        : TL.load("https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/EarthNormal.png"),
        spec        : TL.load("https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/EarthSpecular.png"),
        cloud       : TL.load("https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/earthcloudmap.png"),
    };
  
    // ----- colour-space assignment  ----------------------------------
    tex.dayPostLGM.colorSpace  = THREE.NoColorSpace;
    tex.dayLGM.colorSpace      = THREE.NoColorSpace;
    tex.niteModern.colorSpace  = THREE.SRGBColorSpace;
    tex.cloud.colorSpace       = THREE.SRGBColorSpace;
    tex.niteClassic.colorSpace = THREE.SRGBColorSpace;
    tex.norm.colorSpace        = THREE.NoColorSpace;
    tex.spec.colorSpace        = THREE.NoColorSpace;

    /* ------------------------------------------------ shared uniforms - */
    const U = {
        /* DAY -------- */
        u_dayTexA : { value: tex.dayLGM      },   // before the change-over
        u_dayTexB : { value: tex.dayPostLGM  },   // after   the change-over
        u_dayMix  : { value: 0.0 },               // 0 → A, 1 → B

        /* NIGHT ------ */
        u_niteTexA : { value: tex.niteClassic },
        u_niteTexB : { value: tex.niteModern  },
        u_niteMix  : { value: 0.0 },
   
        u_normalTexture  : { value: tex.norm },
        u_specTexture    : { value: tex.spec },
        u_cloudTexture   : { value: tex.cloud },     // <-- NEW
        u_sunRelPosition : { value: new THREE.Vector3() },
        u_normalPower    : { value: 1.0 },          // 1 = original, >1 exaggerates bumps
        u_dayGain        : { value: 1.5 },          // Day brighter
        u_alpha          : { value: 0.7 },          // <-- NEW  (0-1 cloud opacity)
        u_termWidth      : { value: 0.08 },          // width in hemi-space (0 < w ≤ 1)
        u_iceGlowStrength : { value: 0.05 },
        u_nightCloudFactor : { value: 0.3 },
        u_position       : { value: new THREE.Vector3() }
    };

    /* ------------------------------------------------ core ------------ */
    const coreMat = new THREE.ShaderMaterial({
        uniforms      : U,
        vertexShader  : EARTH_VERT,
        fragmentShader: EARTH_FRAG
    });
    coreMat.extensions.derivatives = true;

    const core = new THREE.Mesh(geom, coreMat);
    core.material.depthWrite = true;
  
    core.castShadow    = true;        // (you probably set this elsewhere)
    core.receiveShadow = false;       // <— let the shell handle darkening

    /* ───────────────── Shadow-receiver shell ────────────────── */
    const shellGeom = new THREE.SphereGeometry(radius * 1.01, 64, 64);
    const shellMat  = new THREE.ShadowMaterial({
      opacity: 1.0          // 0 = invisible, 1 = pitch-black; tweak to taste
    });
    const shadowShell = new THREE.Mesh(shellGeom, shellMat);

    shadowShell.receiveShadow = true; // darken where the shadow map says so
    shadowShell.castShadow    = false;/* planet already casts its own shadow */
  
    /* ------------------------------------------------ clouds ---------- */
    const cloudMat = new THREE.ShaderMaterial({
        uniforms      : U,    // reuse; contains all needed uniforms now
        vertexShader  : EARTH_VERT,
        fragmentShader: CLOUD_FRAG,
        transparent   : true,
        depthWrite    : false
    });

    const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.02, segments, segments),
        cloudMat
    );
    clouds.rotationAutoUpdate = false;      // we spin it ourselves

    /* ------------------------------------------------ atmosphere ------ */
    const atm = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.05, segments, segments),
        new THREE.ShaderMaterial({
            uniforms      : { u_sunRelPosition: U.u_sunRelPosition },
            vertexShader  : ATM_VERT,
            fragmentShader: ATM_FRAG,
            transparent   : true,
            side          : THREE.BackSide,
            depthWrite    : false
        })
    );

    /* ------------------------------------------------ container ------- */
    const container = new THREE.Object3D();
    core.add(clouds);                        // clouds follow core spin 1-to-1
    container.add(core, atm, shadowShell);   // atmosphere can stay a sibling

    /* ------------------------------------------------ helpers --------- */
    function updateSunDir(sunObj){
        tmp1.copy(sunObj.getWorldPosition(tmp2))
            .sub(core.getWorldPosition(tmp3));      // Earth → Sun
        U.u_sunRelPosition.value.copy(tmp1);
    }
  
    const DRIFT_DEG_PER_SEC = 0.7;                 // 0.1 °/s  ≈ 1 °/10 s
    const DRIFT_RATE        = THREE.MathUtils.degToRad(DRIFT_DEG_PER_SEC);

    function updateClouds(deltaTime = 0.016){       // seconds
        clouds.rotation.y += deltaTime * DRIFT_RATE * o.speed;
    }
  
    // ------------------------------------------------ era / map switcher -- 
    const JD_NIGHT_BOUNDARY = 2305620;   // first lit cities
    const JD_DAY_BOUNDARY   = -5756193;  // End of LGM with max inclination of 2.05831717
    const TRANSITION_DAYS   = 109572;    // length of the fade

    function updateEra(julianDay = o.julianDay) {

    // night side (Classic ➜ Modern)
      let t = (julianDay - JD_NIGHT_BOUNDARY) / TRANSITION_DAYS;
      U.u_niteMix.value = THREE.MathUtils.clamp(t, 0, 1);
      // or:  U.u_niteMix.value = THREE.MathUtils.smoothstep(0, 1, t);

      // day side (LGM ➜ Post-LGM)
      t = (julianDay - JD_DAY_BOUNDARY) / TRANSITION_DAYS;
      U.u_dayMix.value = THREE.MathUtils.clamp(t, 0, 1);
    }

    U.u_position.value.copy(core.position);

    return {
        container,
        coreMesh          : core,
        updateSunDir,
        updateClouds,
        updateEra
    };
}

function createPlanet(pd) {           // pd = Planet Data

  /*  ───────────────────────── orbit container  ─────────── */
  const orbitContainer = new THREE.Object3D();
  orbitContainer.rotation.x = pd.orbitTilta * Math.PI/180;
  orbitContainer.rotation.z = pd.orbitTiltb * Math.PI/180;
  orbitContainer.position.set(pd.orbitCentera, pd.orbitCenterc, pd.orbitCenterb);

  /*  Orbit ellipse ---------------------------------------------------- */
  const orbit      = new THREE.Object3D();
  const pts        = [];
  const segs       = 100;
  const a          = pd.orbitSemiMajor ?? pd.orbitRadius;
  const b          = pd.orbitSemiMinor ?? pd.orbitRadius;
  pd.a = a; pd.b = b; 

  for (let i=0;i<=segs;i++){
    const t = i/segs * Math.PI*2;
    pts.push( new THREE.Vector3(Math.cos(t)*a, Math.sin(t)*b, 0) );
  }
  const orbitGeom  = new THREE.BufferGeometry().setFromPoints(pts);
  const orbitMat   = new THREE.LineBasicMaterial({ color: pd.color, transparent:true, opacity:0.4 });
  const orbitLine  = new THREE.LineLoop(orbitGeom, orbitMat);
  orbitLine.rotation.x = Math.PI/2;
  orbit.add(orbitLine);

  /*  Pivot & rotation axis ------------------------------------------- */
  const pivot         = new THREE.Object3D();
  pivot.position.set(a,0,0);
  orbit.add(pivot);

  const rotationAxis  = new THREE.Object3D();
  rotationAxis.position.copy(pivot.position);
  rotationAxis.rotation.z = pd.tilt  * Math.PI/180;
  if (pd.tiltb) rotationAxis.rotation.x = pd.tiltb * Math.PI/180;

  /*  ---------- EARTH gets its own shader-driven mesh ---------- */
  let planetMesh;
  if (pd.name === "Earth") {
  const earthPack = makeRealisticEarth(pd);
  rotationAxis.add(earthPack.container);
  
  earthPack.coreMesh.castShadow    = true;
  earthPack.coreMesh.receiveShadow = true;
    
  /* preserve your world-access references so nothing else breaks */
  pd.planetObj         = earthPack.coreMesh;
  pd.planetMaterial    = earthPack.coreMesh.material;
  pd._updateSunDirFunc = earthPack.updateSunDir;
  pd._updateCloudsFunc = earthPack.updateClouds;
  pd._updateEraFunc    = earthPack.updateEra;
    
  } else {
    /*  ---------- all other planets  ---------- */
    let materialOpts = {};

    if (pd.textureUrl){
      const tex = loadTexture(pd.textureUrl);
      materialOpts.map       = tex;
      materialOpts.bumpScale = 0.05;
      materialOpts.specular  = new THREE.Color("#190909");
      if (pd.textureTransparency){
        materialOpts.transparent = true;
        materialOpts.opacity     = pd.textureTransparency;
      }
    } else {
      materialOpts.color = pd.color;
    }

    if (pd.emissive || pd.planetColor){
      materialOpts.emissive          = pd.planetColor || pd.color;
      materialOpts.emissiveIntensity = 2;
    }

    const planetMat     = new THREE.MeshPhongMaterial(materialOpts);
    const segsSphere    = pd.sphereSegments || 32;
    const sphereGeom    = new THREE.SphereGeometry(pd.size, segsSphere, segsSphere);
    planetMesh          = new THREE.Mesh(sphereGeom, planetMat);

    /*  Exclusions for shadows  */
    if (pd.isNotPhysicalObject === true) {
      /* … your ghost-helper code … */
      planetMesh.castShadow    = false;
      planetMesh.receiveShadow = false;

    /* +++++ Sun exception +++++++++++++++++++++++++++++++++++ */
    } else if (pd.name === 'Sun') {
      planetMesh.castShadow    = false; 
      planetMesh.receiveShadow = false;
      planetMesh.material.depthWrite = false;
    /* +++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    } else {
      /* normal physical bodies */
      planetMesh.castShadow    = true;
      planetMesh.receiveShadow = true;
    }
    
    if (pd.isNotPhysicalObject === true){
      if (pd.textureUrl){
        const tex = loadTexture(pd.textureUrl);
        planetMesh.material = new THREE.MeshBasicMaterial({
          map: tex, color: 0x777777,
          transparent: !!pd.textureTransparency,
          opacity: pd.textureTransparency || 1.0
        });
      }
    }

    pd.planetMaterial = planetMat;             // keep reference for GUI
    pd.planetObj      = planetMesh;
  }

  /*  ---------- rest of helpers (rings, helpers, etc.) --- */
  if (planetMesh) {
  rotationAxis.add(planetMesh);
  }

  /* optional ring system */
  if (pd.ringUrl){
    new THREE.TextureLoader().load(pd.ringUrl, tex=>{
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.center.set(0.5,0.5);

      const ring = createRings({
        ringSize   : pd.ringSize,
        innerMult  : pd.ringInnerMult,
        outerMult  : pd.ringOuterMult,
        segments   : pd.ringSegments || 256,
        texture    : tex,
        opacity    : pd.ringOpacity ?? 0.6
      });

      rotationAxis.add(ring);
      pd.ringObj = ring;
    });
  }

  orbit.add(rotationAxis);
  orbitContainer.add(orbit);

  /* helpers, axis, traces -------------------- */
  pd.orbitPlaneHelper = addOrbitPlaneHelper(pd, orbitContainer, o.starDistance*2);
  pd.orbitPlaneHelper.visible = false;

  if (pd.axisHelper){
    const ax = new THREE.AxesHelper(pd.size*3);
    planetMesh.add(ax);
    pd.axisHelperObj = ax;
  }

  /* save graph references exactly as before --------------------------- */
  pd.containerObj  = orbitContainer;
  pd.orbitObj      = orbit;
  pd.orbitLineObj  = orbitLine;
  pd.pivotObj      = pivot;
  pd.rotationAxis  = rotationAxis;

  /* console log (when needed) */
  //if (!/Barycenter|Precession|Cycle|Ellipse/i.test(pd.name)) {
  //  console.log(`Created planet: ${pd.name}`);
  //}

  scene.add(orbitContainer);
}

/**
 * Build a planetary ring mesh.
 *
 * @param {number} ringSize      – base radius in scene units (your old pd.ringSize)
 * @param {number} innerMult     – multiply ringSize for inner edge (e.g. 1.23)
 * @param {number} outerMult     – multiply ringSize for outer edge (e.g. 2.27)
 * @param {number} segments      – radial subdivisions (default 256)
 * @param {THREE.Texture} texture
 * @param {number} opacity       – 0-1, how faint / dusty
 */
function createRings({
  ringSize,
  innerMult,
  outerMult,
  segments = 256,
  texture,
  opacity = 0.6
}) {
  const innerR = innerMult * ringSize;
  const outerR = outerMult * ringSize;

  const geometry = new THREE.RingGeometry(
        innerR, outerR, segments, 5, 0, Math.PI * 2);

  /* ------------ fix UVs so the texture wraps nicely ------------ */
  const { position: pos, uv: uvs } = geometry.attributes;
  for (let i = 0; i < uvs.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const u = (Math.atan2(y, x) + Math.PI) / (2 * Math.PI);   // 0‒1 sweep
    const v = (Math.hypot(x, y) - innerR) / (outerR - innerR); // ring width
    uvs.setXY(i, u, v);
  }
  uvs.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    opacity
  });

  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;   // lie flat in the orbital plane
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
    if (obj.orbitLineObj && !obj.isNotPhysicalObject) {
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
  const dλdT = 360/meansolaryearlengthinDays;                     // mean solar motion °/day
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
// RA and Degree Functions
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

  //if (year <= 0) {
  //  console.warn(
  //    `dayToDate: resulting year is ${year} (astronomical numbering; year 0 = 1 BC).`
  //  );
  // }

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
// Date functions
//*************************************************************

// --- REQUIREMENT: a global startmodelJD must already exist and be finite (may be fractional)
if (!(typeof startmodelJD === 'number' && isFinite(startmodelJD))) {
  throw new TypeError(`Expected global startmodelJD as a finite number, got ${startmodelJD}`);
}

// -------------------------
// JDN <-> calendar helpers
// -------------------------

// JDN from a Gregorian date (astronomical year numbering: year 0 allowed)
function jdnFromGregorian(y, m, d) {
  const a  = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12*a - 3;
  return d + Math.floor((153*m2 + 2)/5) + 365*y2 + Math.floor(y2/4)
       - Math.floor(y2/100) + Math.floor(y2/400) - 32045;
}

// JDN from a Julian date
function jdnFromJulian(y, m, d) {
  const a  = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12*a - 3;
  return d + Math.floor((153*m2 + 2)/5) + 365*y2 + Math.floor(y2/4) - 32083;
}

// Gregorian date from integer JDN
function gregorianFromJdn(J) {
  const a = J + 32044;
  const b = Math.floor((4*a + 3) / 146097);
  const c = a - Math.floor(146097*b / 4);
  const d = Math.floor((4*c + 3) / 1461);
  const e = c - Math.floor(1461*d / 4);
  const m = Math.floor((5*e + 2) / 153);
  const day = e - Math.floor((153*m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b*100 + d - 4800 + Math.floor(m / 10);
  return { y: year, m: month, d: day };
}

// Julian date from integer JDN
function julianFromJdn(J) {
  const c = J + 32082;
  const d = Math.floor((4*c + 3) / 1461);
  const e = c - Math.floor(1461*d / 4);
  const m = Math.floor((5*e + 2) / 153);
  const day = e - Math.floor((153*m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = d - 4800 + Math.floor(m / 10);
  return { y: year, m: month, d: day };
}

// Gregorian reform switch (first Gregorian civil date = 1582-10-15)
const GREG_START_JDN = jdnFromGregorian(1582, 10, 15);

// --------------------
// Parsing & utilities
// --------------------
function pad2(n) { return String(n).padStart(2, "0"); }

// Civil-date check (ignores any fractional day)
function isJulianDate(y, m, d) {
  return (y < 1582) || (y === 1582 && (m < 10 || (m === 10 && d < 15)));
}

// Accepts "YYYY-MM-DD" or "YYYY-MM-DD.f" (and "-YYYY-...").
// Returns { y, m, dInt, frac } with 0 ≤ frac < 1 (fraction of day since MIDNIGHT).
function parseYMDAllowingFraction(sDate) {
  if (typeof sDate !== 'string') {
    throw new TypeError(`Invalid date "${sDate}". Expected "YYYY-MM-DD" or "-YYYY-MM-DD".`);
  }

  const parts = sDate.split("-");
  let y, m, dStr;

  if (sDate.startsWith("-")) {
    if (parts.length !== 4) {
      throw new TypeError(`Invalid date "${sDate}". Expected "-YYYY-MM-DD" or "-YYYY-MM-DD.f".`);
    }
    y = -Number(parts[1]);
    m = Number(parts[2]);
    dStr = parts[3];
  } else {
    if (parts.length !== 3) {
      throw new TypeError(`Invalid date "${sDate}". Expected "YYYY-MM-DD" or "YYYY-MM-DD.f".`);
    }
    y = Number(parts[0]);
    m = Number(parts[1]);
    dStr = parts[2];
  }

  const dFloat = Number(dStr);
  if (![y, m, dFloat].every(Number.isFinite)) {
    throw new TypeError(`Invalid date "${sDate}". Expected "YYYY-MM-DD" or "-YYYY-MM-DD".`);
  }
  if (m < 1 || m > 12) {
    throw new TypeError(`Invalid date "${sDate}". Month must be 1–12.`);
  }

  const dInt = Math.floor(dFloat);
  const frac = dFloat - dInt;
  if (dInt < 1 || dInt > 31 || frac < 0 || frac >= 1) {
    throw new TypeError(`Invalid date "${sDate}". Day must be 1–31 (fractional part 0 ≤ f < 1).`);
  }

  return { y, m, dInt, frac };
}

// ------------------------------------------------------
// Public helpers (drop-in): handle fractional days too
// ------------------------------------------------------

// Convert "YYYY-MM-DD" or "...-DD.f" to (possibly fractional) days since startmodelJD
function dateToDays(sDate) {
  const { y, m, dInt, frac } = parseYMDAllowingFraction(sDate);

  // Calendar selection based on civil date (ignore time-of-day)
  const useJulian = isJulianDate(y, m, dInt);
  const baseJDN = useJulian ? jdnFromJulian(y, m, dInt) : jdnFromGregorian(y, m, dInt);

  // JD convention: integer boundary at NOON; fraction is measured from MIDNIGHT.
  // So JD = baseJDN + (frac - 0.5).
  const JD = baseJDN + (frac - 0.5);

  return JD - startmodelJD;  // startmodelJD may be fractional
}

// Convert (possibly fractional) days since startmodelJD to a civil date (no fraction)
function daysToDate(g) {
  if (!Number.isFinite(g)) {
    throw new TypeError(`daysToDate expected a finite number but got ${g}`);
  }

  const JD = startmodelJD + g;
  const JDNint = Math.floor(JD + 0.5);   // map JD (noon-based) to civil day

  const useJulian = JDNint < GREG_START_JDN;
  const { y, m, d } = useJulian ? julianFromJdn(JDNint) : gregorianFromJdn(JDNint);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

// Same as above, but include the fractional day in the last field for display
function daysToDateWithFraction(g, precision = 9) {
  const JD = startmodelJD + g;
  const JDNint = Math.floor(JD + 0.5);
  const fracFromMidnight = JD - (JDNint - 0.5);  // ∈ [0,1)

  const useJulian = JDNint < GREG_START_JDN;
  const { y, m, d } = useJulian ? julianFromJdn(JDNint) : gregorianFromJdn(JDNint);

  const dayWithFrac = (d + fracFromMidnight).toFixed(precision)
    .replace(/0+$/,'').replace(/\.$/,'');
  return `${y}-${pad2(m)}-${dayWithFrac}`;
}

// Keep this name if other code calls it; returns a Julian-calendar date (no fraction)
function julianCalDayToDate(g) {
  const JD = startmodelJD + g;
  const JDNint = Math.floor(JD + 0.5);
  const { y, m, d } = julianFromJdn(JDNint);
  return `${y}-${pad2(m)}-${pad2(d)}`;
} 
