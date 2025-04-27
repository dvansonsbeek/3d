/*The Interactive 3D Solar System Simulation of the Holistic Universe Model shows the precession / eccentricity / inclination / obliquity / perihelion date movements of Earth, Moon, Sun and Planets modelled from a geo-heliocentric frame of reference, coming together in a Holistic-Year cycle of 305,952 years, an Axial precession cycle of ~23,535 years, an Inclination precession cycle of 101,984 years and a Perihelion precession cycle of 19,122 years. 

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
2. Current value longitude of perihelion: 6h51m47s = ~102.945°
3. Sheet Length of solar day, solar year in days, sidereal year in seconds aligned to 3D longitude values and historic values
a) 1246 Length of solar day in days was ~365.242236 days (which is ~31,556,929.19 SI seconds in Ephemeris time).
b) 1246 Length of sidereal year in SI seconds was ~31,558,149.6847
c) 1246 Lenght of solar day was above 86,400 SI seconds because of historic Delta T predictions.
4. Climate graphs with ~100k cycles as a cycle of 305,952 years
5. End of Last Glacial Maximum (LGM) around 21,000 BC and end of Younger dryes around 9800 BC. 
6. The location of the EARTH-WOBBLE-CENTER is at a MEAN ratio of 1:366.2422341 compared to the location the Sun as seen from Earth
7. Obliquity correct both historic and current values
8. Orbital Inclination to ICRF correct both historic and current values
9. Eccentricity correct both historic and current values

Technical: 

It's an interactive 3D visualization where the browser renders a miniature model of the solar system using three.js — a JavaScript library that simplifies working with WebGL. The project typically features:
- A central sun: A bright, glowing sphere, possibly using a texture and some light emission effects.
- Orbiting planets: Each planet is a textured sphere with individual rotation (spinning) and revolution (orbiting) animations.
- Orbit paths: Visualized with faint circles or lines showing the paths of the planets.
- Lighting: A combination of ambient and point lights to simulate how the sun lights up the planets.
- Camera controls: Using something like OrbitControls to let the user zoom, pan, and rotate around the system.
- Scaling: Distances and sizes are usually not to scale because realistic proportions would make some planets almost invisible or too far apart.
- Extras: You might see moons orbiting planets, rings around Saturn, or even starfield backgrounds to make it more immersive.

At a basic level, it's like building a tiny universe in the browser, where JavaScript, math (especially trigonometry), and 3D graphics all work together.

Created with the help of TYCHOSIUM software <https://codepen.io/pholmq/pen/XGPrPd>. The Interactive 3D Solar System Simulation of the Holistic Universe Model is not affiliated with TYCHOSIUM or its authors in any way*/

/*Copyright 2018 Simon Shack, Patrik Holmqvist
The TYCHOSIUM is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.*/

const defaultSettings = 
[
{
  "name": "EARTH-WOBBLE-CENTER",
  "size": 0.011,
  "startPos": -112.791336670025,
  "speed": 0,
  "rotationSpeed": -0.00026697458749521,
  "tilt": 0,
  "tiltb": 0,
  "orbitRadius": 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "MID-ECCENTRICITY-ORBIT",
  "size": 0.011,
  "startPos": -112.791336670025,
  "speed": 0.00026697458749521,
  "rotationSpeed": 0,
  "tilt": 0,
  "tiltb": 0,
  "orbitRadius": 1.404974,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Helion Point (Alternative)",
  "size": 0.011,
  "startPos": -104.204722055415,
  "speed": 0.0000616095201912024,
  "rotationSpeed": 0,
  "tilt": 0,
  "tiltb": 0,
  "orbitRadius": 1.404974,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Earth",
  "size": 0.0852703981708473,
  "startPos": 0,
  "speed": -0.00026697458749521,
  "rotationSpeed": 2301.16782401453,
  "tilt": -23.4243449577,
  "tiltb": 0,
  "orbitRadius": -0.27304333159777,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Earth Inclination Precession1",
  "startPos": 98.5866146146096,
  "speed": 0.0000616095201912024,
  "orbitRadius": 0,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Earth Ecliptic Precession",
  "startPos": 164.311024357683,
  "speed": 0.000102682533652004,
  "orbitRadius": 0,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": -0.58
},
{
  "name": "Earth Obliquity Precession",
  "startPos": 97.1023610277075,
  "speed": -0.000164292053843206,
  "orbitRadius": 0,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0.58
},
{
  "name": "Earth Perihelion Precession",
  "startPos": -194.204722055415,
  "speed": 0.000328584107686413,
  "orbitRadius": 0,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": -1.11,
  "orbitTiltb": 0
},
{
  "name": "Earth Inclination Precession2",
  "startPos": -98.5866146146096,
  "speed": -0.0000616095201912024,
  "orbitRadius": 0,
  "orbitCentera": -1.404974,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Barycenter Sun",
  "startPos": -67.2086633299753,
  "speed": -0.00026697458749521,
  "orbitRadius": 0.27304333159777,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTiltb": 0
},
{
  "name": "HELION-POINT",
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0
},
{
  "name": "Sun",
  "size": 7,
  "startPos": 0,
  "speed": Math.PI*2,
  "rotationSpeed": 83.9952982796623,
  "tilt": -7.155,
  "orbitRadius": 100,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Moon Apsidal Precession",
  "startPos": 340,
  "speed": 0.709885428149756,
  "orbitRadius": -0.0141069500625657,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Moon Apsidal Nodal Precession1",
  "startPos": -90,
  "speed": -1.04769042735813,
  "tilt": 0,
  "orbitRadius": 0,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Moon Apsidal Nodal Precession2",
  "startPos": 90,
  "speed": 1.04769042735813,
  "tilt": 0,
  "orbitRadius": 0,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Moon Royer Cycle",
  "startPos": -44.1,
  "speed": -0.372080428941402,
  "orbitRadius": 0,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Moon Nodal Precession",
  "startPos": 64.1,
  "speed": -0.337804999208372,
  "tilt": 0,
  "orbitRadius": 0,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90+180)*Math.PI)/180)*-5.1453964,
  "orbitTiltb": Math.sin(((-90+180)*Math.PI)/180)*-5.1453964
},
{
  "name": "Moon",
  "size": 0.0232276033326404,
  "startPos": 126.22,
  "speed": 83.9952982796623,
  "rotationSpeed": 0,
  "tilt": -6.687,
  "orbitRadius": 0.25695490731541,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "BARYCENTER MERCURY",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  "orbitCentera": -11.2169591606661,
  "orbitCenterb": 0,
  "orbitCenterc": -0.6,
},
{
  "name": "Barycenter Mercury-Sun",
  //"size": 2,
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
},
{
  "name": "Mercury Barycenter Location",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": -11.2169591606661,
  "orbitCenterb": 0,
  "orbitCenterc": -0.6,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Mercury Ellipse Factor",
  "startPos": 0,
  "speed": -Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Mercury",
  "size": 1,
  "startPos": 211.54,
  "speed": 26.0875244996281,
  "rotationSpeed": 39.1312867494422,
  "tilt": -0.03,
  "orbitRadius": 38.7107274186104,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90-48.33167)*Math.PI)/180)*-7.00487,
  "orbitTiltb": Math.sin(((-90-48.33167)*Math.PI)/180)*-7.00487
},
{
  "name": "BARYCENTER VENUS",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  "orbitCentera": -0.489934935944517,
  "orbitCenterb": 0,
  "orbitCenterc": -0.05
},
{
  "name": "Barycenter Venus-Sun",
  //"size": 2,
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
},
{
  "name": "Venus Barycenter Location",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": -0.489934935944517,
  "orbitCenterb": 0,
  "orbitCenterc": -0.05,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Venus Ellipse Factor",
  "startPos": 0,
  "speed": -Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Venus",
  "size": 1,
  "startPos": 352.635,
  "speed": 10.2132976731898,
  "rotationSpeed": -9.4430965247729,
  "tilt": -2.6392,
  "orbitRadius": 72.3340172922693,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90-76.68069)*Math.PI)/180)*-3.39471,
  "orbitTiltb": Math.sin(((-90-76.68069)*Math.PI)/180)*-3.39471
},
{
  "name": "BARYCENTER MARS",
  "startPos": 0,
  "speed": Math.PI*2, 
  "orbitRadius": 7.78722181048582,
  "orbitCentera": 8.83305630702754,
  "orbitCenterb": -20.1708748079022,
  "orbitCenterc": 0.7
},
{
  "name": "Barycenter Mars-Sun",
  //"size": 2,
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
},
{
  "name": "Mars Barycenter Location",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": 8.83305630702754,
  "orbitCenterb": -20.1708748079022,
  "orbitCenterc": 0.7,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Mars Ellipse Factor",
  "startPos": 243.094,
  "speed": 0.398326084542855,
  "orbitRadius": 7.78722181048582,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90-49.57854)*Math.PI)/180)*-1.85061,
  "orbitTiltb": Math.sin(((-90-49.57854)*Math.PI)/180)*-1.85061
},
{
  "name": "Mars",
  "size": 1,
  "startPos": 121.547,
  "speed": -3.34075569586122,
  "rotationSpeed": 2236.82429921882,
  "tilt": -25.19,
  "orbitRadius": 152.366713671252,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Phobos",
  "size": 0.027272727,
  "startPos": 122,
  "speed": 6986.5,
  "rotationSpeed": 0,
  "tilt": 0,
  "orbitRadius": 5,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Deimos",
  "size": 0.027272727,
  "startPos": 0,
  "speed": 1802,
  "rotationSpeed": 0,
  "tilt": 0,
  "orbitRadius": 10,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "BARYCENTER JUPITER",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  "orbitCentera": -14.8529260159503,
  "orbitCenterb": -44.5901620064302,
  "orbitCenterc": 0.7
},
{
  "name": "Barycenter Jupiter-Sun",
  //"size": 2,
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
},
{
  "name": "Jupiter Barycenter Location",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": -14.8529260159503,
  "orbitCenterb": -44.5901620064302,
  "orbitCenterc": 0.7,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Jupiter Ellipse Factor",
  "startPos": 41.205,
  "speed": -5.75326128750832,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90-100.55615)*Math.PI)/180)*-1.3053,
  "orbitTiltb": Math.sin(((-90-100.55615)*Math.PI)/180)*-1.3053
},
{
  "name": "Jupiter",
  "size": 6,
  "startPos": 0,
  "speed": 0,
  "rotationSpeed": 5549.34320193203,
  "tilt": -3.13,
  "orbitRadius": 519.969067802053,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "BARYCENTER SATURN",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  "orbitCentera": -99.8674039040765,
  "orbitCenterb": 3.4559296989952,
  "orbitCenterc": 1.8
},
{
  "name": "Barycenter Saturn-Sun",
  //"size": 2,
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
},
{
  "name": "Saturn Barycenter Location",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": -99.8674039040765,
  "orbitCenterb": 3.4559296989952,
  "orbitCenterc": 1.8,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Saturn Ellipse Factor",
  "startPos": 34.355,
  "speed": -6.06960563718342,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90-113.71504)*Math.PI)/180)*-2.48446,
  "orbitTiltb": Math.sin(((-90-113.71504)*Math.PI)/180)*-2.48446
},
{
  "name": "Saturn",
  "size": 5,
  "startPos": 0,
  "speed": 0,
  "rotationSpeed": 5215.37251228578,
  "tilt": -26.73,
  "orbitRadius": 952.971629139966,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "BARYCENTER URANUS",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  "orbitCentera": -27.8688886566711,
  "orbitCenterb": 175.24925683614,
  "orbitCenterc": -1.9
},
{
  "name": "Barycenter Uranus-Sun",
  //"size": 2,
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
},
{
  "name": "Uranus Barycenter Location",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": -27.8688886566711,
  "orbitCenterb": 175.24925683614,
  "orbitCenterc": -1.9,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Uranus Ellipse Factor",
  "startPos": 134.51,
  "speed": -6.2081449115867,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90-74.22988)*Math.PI)/180)*-0.76986,
  "orbitTiltb": Math.sin(((-90-74.22988)*Math.PI)/180)*-0.76986
},
{
  "name": "Uranus",
  "size": 5,
  "startPos": 0,
  "speed": 0,
  "rotationSpeed": -3194.74981995042,
  "tilt": -82.23,
  "orbitRadius": 1913.91730411169,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "BARYCENTER NEPTUNE",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  "orbitCentera": -34.3277111737215,
  "orbitCenterb": -34.3620585913588,
  "orbitCenterc": 1.7
},
{
  "name": "Barycenter Neptune-Sun",
  //"size": 2,
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
},
{
  "name": "Neptune Barycenter Location",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": -34.3277111737215,
  "orbitCenterb": -34.3620585913588,
  "orbitCenterc": 1.7,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Neptune Ellipse Factor",
  "startPos": 144.16,
  "speed": -6.2448231126072,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90-131.72169)*Math.PI)/180)*-1.76917,
  "orbitTiltb": Math.sin(((-90-131.72169)*Math.PI)/180)*-1.76917
},
{
  "name": "Neptune",
  "size": 5,
  "startPos": 0,
  "speed": 0,
  "rotationSpeed": 3418.56790376751,
  "tilt": -28.32,
  "orbitRadius": 2993.53460611855,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
//The accurate orbits of Pluto and Halleys will be added later
{
  "name": "BARYCENTER PLUTO",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  "orbitCentera": 1355.8371267405,
  "orbitCenterb": 1400.74054002809,
  "orbitCenterc": 0
},
{
  "name": "Barycenter Pluto-Sun",
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
},
{
  "name": "Pluto Barycenter Location",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": 1355.8371267405,
  "orbitCenterb": 1400.74054002809,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Pluto Ellipse Factor",
  "startPos": 215,
  "speed": -6.25761735630024,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90-110.30347)*Math.PI)/180)*-17.14175,
  "orbitTiltb": Math.sin(((-90-110.30347)*Math.PI)/180)*-17.14175
},
{
  "name": "Pluto",
  "size": 5,
  "startPos": 0,
  "speed": 0,
  "rotationSpeed": 359.294297168521,
  "tilt": -57.47,
  "orbitRadius": 3923.3401562492,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "BARYCENTER HALLEYS",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitRadius": 0.0000000000000000000000000001,
  // Only to prevent the default orbit ring is shown if 0
  "orbitCenterb": 3425.26406009445,
  "orbitCenterc": -479.375616078497,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Barycenter Halleys-Sun",
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
},
{
  "name": "Halleys Barycenter Location",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": 0,
  "orbitCenterb": 3425.26406009445,
  "orbitCenterc": -479.375616078497,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Halleys Ellipse Factor",
  "startPos": 200,
  "speed": -6.20009460094839,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90-59.56078348)*Math.PI)/180)*(180-162.192203847561),
  "orbitTiltb": Math.sin(((-90-59.56078348)*Math.PI)/180)*(180-162.192203847561)
},
{
  "name": "Halleys",
  "size": 6,
  "startPos": 0,
  "speed": 0,
  "rotationSpeed": 1043.12937189584,
  "tilt": 0,
  "orbitRadius": 1788.20900979424,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "BARYCENTER EROS",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 17.0301972356361,
  "orbitCentera": -41.5066637049184,
  "orbitCenterb": 27.010766876461,
  "orbitCenterc": 0
},
{
  "name": "Barycenter Eros-Sun",
  "startPos": 0,
  "speed": 0,
  "orbitRadius": 0,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
},
{
  "name": "Eros Barycenter Location",
  "startPos": 0,
  "speed": Math.PI*2,
  "orbitRadius": 0,
  "orbitCentera": -41.5066637049184,
  "orbitCenterb": 27.010766876461,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
},
{
  "name": "Eros Ellipse Factor",
  "startPos": 114.6,
  "speed": 0.852798978486624,
  "orbitRadius": 17.0301972356361,
  "orbitCentera": 100,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": Math.cos(((-90-304.4115786)*Math.PI)/180)*-10.82903287,
  "orbitTiltb": Math.sin(((-90-304.4115786)*Math.PI)/180)*-10.82903287
},
{
  "name": "Eros",
  "size": 1,
  "startPos": 57.3,
  "speed": -3.56799275538197,
  "rotationSpeed": 10451.0875434594,
  "tilt": 0,
  "orbitRadius": 145.826791115055,
  "orbitCentera": 0,
  "orbitCenterb": 0,
  "orbitCenterc": 0,
  "orbitTilta": 0,
  "orbitTiltb": 0
}
]

//DEFINE TIME CONSTANTS
const yearLength = 365.242234075933
const earthRotations = 366.242234075933

const sDay = 1/yearLength;
const sYear = sDay*365
const sMonth = sDay*30;
const sWeek = sDay*7;
const sHour = sDay/24;
const sMinute = sHour/60;
const sSecond = sMinute/60;

//*************************************************************
//DEFINE PLANETS (Stars, Moons and deferents conunt as planets)
//*************************************************************

var startEarth = {
  name: "Start Earth",
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

var earthWobbleCenter = {
  name: "EARTH-WOBBLE-CENTER",
  size: 0.011,
  color: 0x333333,
  planetColor: 0xFFFFFF,
  startPos: 0,
  speed: 0,
  tilt: 0,
  rotationSpeed: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  textureUrl: 'deathstar.png',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,

   traceOn: false,
   traceLine: false,
   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   //isDeferent: true,
};

var midEccentricityOrbit = {
  name: "MID-ECCENTRICITY-ORBIT",
   size: 0.011,   
   color: 0x0096FF,
   planetColor: 0xFFFF00,
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
   textureUrl: 'earth_mean_eccentricity.png',
   traceLength : sYear * 1000000,
   traceStep : sYear,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: true,

   traceOn: true,
   traceLine: false,
   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

var helionPointAlternative = {
  name: "Helion Point (Alternative)",
   size: 0.011,   
   color: 0x333333,
   planetColor: 0xFFFF00,
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
   textureUrl: 'lightstar.png',
   traceLength : sYear * 1000000,
   traceStep : sYear,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: true,

   traceOn: false,
   traceLine: false,
   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

var earth = {
  name: "Earth",
  size: 0.00852703981708473,   
  color: 0x333333,
  sphereSegments: 320,
  startPos: 0,    
  speed: 0,
  rotationSpeed: 0,
  tilt: 0,
  tiltb: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,  
  textureUrl: 'Earth.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  
  traceLength : sYear * 1000000,
  traceStep : sYear,
  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

var earthInclinationPrecession1 = {
  name: "Earth Inclination Precession1",
  size: 0.1,
  color: 0xFEAA0D,
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

var earthEclipticPrecession = {
  name: "Earth Ecliptic Precession",
  size: 0.1,
  color: 0xFEAA0D,
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

var earthObliquityPrecession = {
  name: "Earth Obliquity Precession",
  size: 0.1,
  color: 0xFEAA0D,
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

var earthPerihelionPrecession = {
  name: "Earth Perihelion Precession",
  size: 0.1,
  color: 0xFEAA0D,
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

var earthInclinationPrecession2 = {
  name: "Earth Inclination Precession2",
  size: 0.1,
  color: 0xFEAA0D,
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

var barycenterSun = {
  name: "Barycenter Sun",
  size: 0.01,
  color: 0xFFFF00,
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

var earthHelionPoint = {
   name: "HELION-POINT",
   size: 0.011,   
   color: 0xBF40BF,
   planetColor: 0xFFFF00,
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
   textureUrl: 'lightstar.png',
   traceLength : sYear * 1000000,
   traceStep : sYear,
  
   visible: true,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: true,

   traceOn: true,
   traceLine: false,
   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   //isDeferent: true,
};

var sun = {
  name: "Sun",
  size: 0.930951753186224,    
  color: 0x333333,
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
  textureUrl: 'Sun.jpg',
  textureTransparency: 9,
  visible: true,
  emissive: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceLength : sYear * 1000000,
  traceStep : sYear*10,
  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

var moonApsidalPrecession = {
  name: "Moon Apsidal Precession",
  size: 0.001,
  color: 0x8b8b8b,
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

var moonApsidalNodalPrecession1 = {
  name: "Moon Apsidal Nodal Precession1",
  size: 0.001,
  color: 0x8b8b8b,
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

var moonApsidalNodalPrecession2 = {
  name: "Moon Apsidal Nodal Precession2",
  size: 0.001,
  color: 0x8b8b8b,
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

var moonRoyerCycle = {
  name: "Moon Royer Cycle",
  size: 0.001,
  color: 0xFFFF00,
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

var moonNodalPrecession = {
  name: "Moon Nodal Precession",
  size: 0.001,
  color: 0x8b8b8b,
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

var moon = {
  name: "Moon",
  size: 0.00232276033326404,
  color: 0x8b8b8b,
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

  textureUrl: 'Moon.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  
  traceLength : sYear * 18,
  traceStep : sDay,
  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

var mercurySunBarycenter0 = {
   name: "BARYCENTER MERCURY",
   size: 0.011,   
   color: 0x333333,
   planetColor: 0x868485,
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
   textureUrl: 'mercury_barycenter.png',
   traceLength : sYear * 1000000,
   traceStep : sYear,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: true,

   traceOn: false,
   traceLine: false,
   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

var mercurySunBarycenter = {
   name: "Barycenter Mercury-Sun",
   size: 0.01,   
   color: 0x333333,
   planetColor: 0x868485,
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
   traceLength : sYear * 90,
   traceStep : sMonth,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: true,

   traceOn: false,
   traceLine: false,
   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

var mercuryBarycenter = {
  name: "Mercury Barycenter Location",
  size: 0.1,
  color: 0x868485,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

var mercuryEllipse = {
  name: "Mercury Ellipse Factor",
  size: 0.1,
  color: 0x868485,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: false,
  isDeferent: true,
};

var mercury = {
  name: "Mercury",
  size: 0.00326167744046522,
  color: 0x868485,
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

  textureUrl: 'Mercury.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceLength : sYear * 14,
  traceStep : sDay,
  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

var venusSunBarycenter0 = {
  name: "BARYCENTER VENUS",
  size: 0.011,   
  color: 0x333333,
  planetColor: 0xA57C1B,
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
  textureUrl: 'venus_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var venusSunBarycenter = {
  name: "Barycenter Venus-Sun",
  size: 0.01,   
  color: 0x333333,
  planetColor: 0xA57C1B,
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
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var venusBarycenter = {
  name: "Venus Barycenter Location",
  size: 0.1,
  color: 0xA57C1B,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var venusEllipse = {
  name: "Venus Ellipse Factor",
  size: 0.1,
  color: 0xA57C1B,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var venus = {
  name: "Venus",
  size: 0.00809075686937222,
  color: 0xA57C1B,
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
  traceLength : sYear *16,
  traceStep : sWeek,

  textureUrl: 'VenusAtmosphere.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

var marsSunBarycenter0 = {
  name: "BARYCENTER MARS",
  size: 0.011,   
  color: 0x333333,
  planetColor: 0xFF0000,
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
  textureUrl: 'mars_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var marsSunBarycenter = {
  name: "Barycenter Mars-Sun",
  size: 0.01,   
  color: 0x333333,
  planetColor: 0xFF0000,
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
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var marsBarycenter = {
  name: "Mars Barycenter Location",
  size: 0.1,
  color: 0x008000,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
};  

var marsEllipse = {
  name: "Mars Ellipse Factor",
  size: 0.1,
  color: 0xFEAA0D,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
}; 

var mars = {
  name: "Mars",
  size: 0.00453148161022128,
  color: 0xFF0000,
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
  traceLength : sYear * 44,
  traceStep : sWeek, 

  textureUrl: 'Mars.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

var phobos = {
  name: "Phobos",
  size: 0.0000148397834115522,
  color: 0x8b8b8b,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
};

var deimos = {
  name: "Deimos",
  size: 0.00000842257977412423,
  color: 0x8b8b8b,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  isDeferent: true,
};

var jupiterSunBarycenter0 = {
  name: "BARYCENTER JUPITER",
  size: 0.011,   
  color: 0x333333,
  planetColor: 0xCDC2B2,
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
  textureUrl: 'jupiter_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var jupiterSunBarycenter = {
  name: "Barycenter Jupiter-Sun",
  size: 0.01,   
  color: 0x333333,
  planetColor: 0xCDC2B2,
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
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var jupiterBarycenter = {
  name: "Jupiter Barycenter Location",
  size: 0.1,
  color: 0xCDC2B2,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var jupiterEllipse = {
  name: "Jupiter Ellipse Factor",
  size: 0.1,
  color: 0xCDC2B2,
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
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var jupiter = {
  name: "Jupiter",
  size: 0.0934652340617141,   
  color: 0xCDC2B2,
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
  traceLength : sYear * 24,
  traceStep : sWeek,
  
  textureUrl: 'Jupiter.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

var saturnSunBarycenter0 = {
  name: "BARYCENTER SATURN",
  size: 0.011,   
  color: 0x333333,
  planetColor: 0xA79662,
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
  textureUrl: 'saturn_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var saturnSunBarycenter = {
  name: "Barycenter Saturn-Sun",
  size: 0.01,   
  color: 0x333333,
  planetColor: 0xA79662,
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
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var saturnBarycenter = {
  name: "Saturn Barycenter Location",
  size: 0.1,
  color: 0xA79662,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var saturnEllipse = {
  name: "Saturn Ellipse Factor",
  size: 0.1,   
  color: 0xA79662,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var saturn = {
  name: "Saturn",
  size: 0.0778513754613971,   
  color: 0xA79662,
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
  traceLength : sYear * 60,
  traceStep : sWeek,

  textureUrl: 'Saturn.jpg',
  ringUrl: 'saturn-rings.png',
  ringSize: 10,
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

var uranusSunBarycenter0 = {
  name: "BARYCENTER URANUS",
  size: 0.011,   
  color: 0x333333,
  planetColor: 0xD2F9FA,
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
  textureUrl: 'uranus_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var uranusSunBarycenter = {
  name: "Barycenter Uranus-Sun",
  size: 0.01,   
  color: 0x333333,
  planetColor: 0xD2F9FA,
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
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var uranusBarycenter = {
  name: "Uranus Barycenter Location",
  size: 0.1,
  color: 0xD2F9FA,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var uranusEllipse = {
  name: "Uranus Ellipse Factor",
  size: 0.1,   
  color: 0xD2F9FA,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var uranus = {
  name: "Uranus",
  size: 0.0339068997192601, 
  color: 0xD2F9FA,
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
  traceLength : sYear * 18,
  traceStep : sWeek,
  
  textureUrl: 'Uranus.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

var neptuneSunBarycenter0 = {
  name: "BARYCENTER NEPTUNE",
  size: 0.011,   
  color: 0x333333,
  planetColor: 0x5E93F1,
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
  textureUrl: 'neptune_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var neptuneSunBarycenter = {
  name: "Barycenter Neptune-Sun",
  size: 0.01,   
  color: 0x333333,
  planetColor: 0x5E93F1,
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
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var neptuneBarycenter = {
  name: "Neptune Barycenter Location",
  size: 0.1,
  color: 0x5E93F1,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var neptuneEllipse = {
  name: "Neptune Ellipse Factor",
  size: 0.1,   
  color: 0x5E93F1,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var neptune = {
  name: "Neptune",
  size: 0.0329175808251566,   
  color: 0x5E93F1,
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
  traceLength : sYear * 18,
  traceStep : sWeek,
  
  textureUrl: 'Neptune.jpg',
  visible: true,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
};

var plutoSunBarycenter0 = {
  name: "BARYCENTER PLUTO",
  size: 0.011,   
  color: 0x333333,
  planetColor: 0xA79662,
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
  textureUrl: 'pluto_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var plutoSunBarycenter = {
  name: "Barycenter Pluto-Sun",
  size: 0.01,   
  color: 0x333333,
  planetColor: 0xA79662,
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
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var plutoBarycenter = {
  name: "Pluto Barycenter Location",
  size: 5,
  color: 0x5E93F1,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var plutoEllipse = {
  name: "Pluto Ellipse Factor",
  size: 0.1,   
  color: 0x5E93F1,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var pluto = {
  name: "Pluto",
  size: 0.00158865897549076,   
  color: 0x5E93F1,
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
  traceLength : sYear * 18,
  traceStep : sWeek,
  
  textureUrl: 'FictionalMakemake.jpg',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var halleysSunBarycenter0 = {
  name: "BARYCENTER HALLEYS",
  size: 0.011,   
  color: 0x333333,
  planetColor: 0xA79662,
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
  textureUrl: 'halleys_barycenter.png',
  traceLength : sYear * 1000000,
  traceStep : sYear,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var halleysSunBarycenter = {
  name: "Barycenter Halleys-Sun",
  size: 0.01,   
  color: 0x333333,
  planetColor: 0xA79662,
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
  traceLength : sYear * 90,
  traceStep : sMonth,
  
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var halleysBarycenter = {
  name: "Halleys Barycenter Location",
  size: 0.1,
  color: 0xA57C1B,
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
  axisHelper: true,
  isDeferent: true,
};

var halleysEllipse = {
  name: "Halleys Ellipse Factor",
  size: 0.1,
  color: 0xA57C1B,
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

  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,
  isDeferent: true,
};

var halleys = {
  name: "Halleys",
  size: 0.0000073530458345529,
  color: 0x00FF00,
  planetColor: 0xFFFFFF,
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
  traceLength : sYear * 90,
  traceStep : sWeek,

  textureUrl: 'FictionalCeres.jpg',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

var erosSunBarycenter0 = {
   name: "BARYCENTER EROS",
   size: 0.011,   
   color: 0x333333,
   planetColor: 0xA79662,
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
   textureUrl: 'eros_barycenter.png',
   traceLength : sYear * 1000000,
   traceStep : sYear,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: true,

   traceOn: false,
   traceLine: false,
   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

var erosSunBarycenter = {
   name: "Barycenter Eros-Sun",
   size: 0.01,   
   color: 0x333333,
   planetColor: 0xA79662,
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
   traceLength : sYear * 90,
   traceStep : sMonth,
  
   visible: false,
   containerObj:"",
   orbitObj:"",
   planetObj:"",
   pivotObj:"",
   axisHelper: true,

   traceOn: false,
   traceLine: false,
   traceStartPos : 0,
   traceCurrPos : 0,
   traceArrIndex : 0,
   isDeferent: true,
};

var erosBarycenter = {
  name: "Eros Barycenter Location",
  size: 0.1,
  color: 0xA57C1B,
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
  axisHelper: true,
  isDeferent: true,
};

var erosEllipse = {
  name: "Eros Ellipse Factor",
  size: 0.1,
  color: 0xA57C1B,
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
  axisHelper: true,
  isDeferent: true,
};

var eros = {
  name: "Eros",
  size: 0.0000112568447139883,
  color: 0xA57C1B,
  startPos: 0,
  speed: 0,
  tilt: 0,
  orbitRadius: 0,
  orbitCentera: 0,
  orbitCenterb: 0,
  orbitCenterc: 0,
  orbitTilta: 0,
  orbitTiltb: 0,
  traceLength : sYear *16,
  traceStep : sWeek,

  textureUrl: 'FictionalEris.jpg',
  visible: false,
  containerObj:"",
  orbitObj:"",
  planetObj:"",
  pivotObj:"",
  axisHelper: true,

  traceOn: false,
  traceLine: false,
  traceStartPos : 0,
  traceCurrPos : 0,
  traceArrIndex : 0,
  isDeferent: true,
};

//*************************************************************
// GLOBAL and GUI SETTINGS
//*************************************************************
var o = {
  'ambientLight' : 2,
  'sunLight' : 2,
  'background' : 0x000000,
  'Run' : false,
  'traceBtn' : false,
  '1 second equals' : sWeek,
  'speedFact' : sWeek,
  'speed' : 1,
  'reverse' : false,
  'Step forward' : function() {
    if (o.speedFact === sYear) {
      o.pos = dateToDays(addYears(o.Date, 1))*sDay + timeToPos(o.Time)
    } else if (o.speedFact === sYear*10 ) {
      o.pos = dateToDays(addYears(o.Date, 10))*sDay + timeToPos(o.Time)
    } else if (o.speedFact === sYear*100 ) {
      o.pos = dateToDays(addYears(o.Date, 100))*sDay + timeToPos(o.Time)
    } else if (o.speedFact === sYear*1000 ) {
      o.pos = dateToDays(addYears(o.Date, 1000))*sDay + timeToPos(o.Time)
    } else {
      o.pos += o.speedFact
    }
  },

  'Step backward' : function() {
    if (o.speedFact === sYear) {
      o.pos = dateToDays(addYears(o.Date, -1))*sDay + timeToPos(o.Time)
    } else if (o.speedFact === sYear*10 ) {
      o.pos = dateToDays(addYears(o.Date, -10))*sDay + timeToPos(o.Time)
    } else if (o.speedFact === sYear*100 ) {
      o.pos = dateToDays(addYears(o.Date, -100))*sDay + timeToPos(o.Time)
    } else if (o.speedFact === sYear*1000 ) {
      o.pos = dateToDays(addYears(o.Date, -1000))*sDay + timeToPos(o.Time)
    } else {
      o.pos -= o.speedFact
    }
  },
  'Reset' : function() {o.pos = 0; controls.reset()},
  'Today' : function() {
              const newPos = sDay * dateToDays(new Intl.DateTimeFormat("sv-SE", {year: "numeric", month: "2-digit", day: "2-digit"}).format(Date.now()))
              o.pos = newPos; controls.reset()
  }, 
//  pos : 0,
  'Position' : "", // Dat.GUI var for pos
  'Date' : "",
  'cSphereSize' : 1,
  'zodiacSize'  : 1,
  'starDistanceScaleFact' : 1.5,
  'starDistance' : 5000,
  'starSize' : 1,
  'starNamesVisible' : false,
  'Axis helpers' : false,
  'Shadows' : false,
  'Orbits' : true,
  'Time' : "00:00:00",
  'Zoom' : 0,
  'worldCamX' : '0',
  'worldCamY' : '0',
  'worldCamZ' : '0',
  'worldCamDist' : '0',
  'worldCamDistKm' : '0',
  'worldCamRa' : '0',
  'worldCamDec' : '0',
  
  'Day' : "",
  'julianDay' : "",  
  'Line trace' : true,
  'Earth camera' : false,
  'Camera Lat': 0,
  'Camera Long': 0,
  'Polar line': false,
  'polarLineLength': 1,
  'Camera helper' : false,
  'Performance' : false,
  'camX' : 0,
  'camY' : 0,
  'camZ' : 0,
  'Size' : 1,
  'traceSize' : 1,
  traceLength : sYear * 18,
  traceStep : sDay,
  traceCurrPos : 0,
  traceArrIndex : 0,
  Lines : true,

  "moonElongation":0.01,
  "mercuryElongation":0.01,
  "venusElongation":0.01,
  "marsElongation":0.01,
  "jupiterElongation":0.01,
  "saturnElongation":0.01,
  "uranusElongation":0.01,
  "neptuneElongation":0.01,
  
  infotext: true,
  "Target" : "",
  lookAtObj : {},
}

const planets = [startEarth, earthWobbleCenter, midEccentricityOrbit, helionPointAlternative, earth, earthPerihelionPrecession1, earthPerihelionPrecession2, earthObliquityPrecession, earthInclinationPrecession, earthEclipticPrecession, barycenterSun, earthHelionPoint, mercurySunBarycenter0, mercurySunBarycenter, venusSunBarycenter0, venusSunBarycenter, marsSunBarycenter0, marsSunBarycenter, jupiterSunBarycenter0, jupiterSunBarycenter, saturnSunBarycenter0, saturnSunBarycenter, uranusSunBarycenter0, uranusSunBarycenter, neptuneSunBarycenter0, neptuneSunBarycenter, plutoSunBarycenter0, plutoSunBarycenter, halleysSunBarycenter0, halleysSunBarycenter, erosSunBarycenter0, erosSunBarycenter, sun, moonApsidalPrecession, moonApsidalNodalPrecession1, moonApsidalNodalPrecession2, moonRoyerCycle, moonNodalPrecession, moon, mercuryBarycenter, mercuryEllipse, mercury, venusBarycenter, venusEllipse, venus, marsBarycenter, marsEllipse, mars, phobos, deimos, jupiterBarycenter, jupiterEllipse, jupiter, saturnBarycenter, saturnEllipse, saturn, uranusBarycenter, uranusEllipse, uranus, neptuneBarycenter, neptuneEllipse, neptune, plutoBarycenter, plutoEllipse, pluto, halleysBarycenter, halleysEllipse, halleys, erosBarycenter, erosEllipse, eros]

const tracePlanets = [earthWobbleCenter, earthHelionPoint, midEccentricityOrbit, sun, moon, mercurySunBarycenter0, mercury, venusSunBarycenter0, venus, marsSunBarycenter0, mars, jupiterSunBarycenter0, jupiter, saturnSunBarycenter0, saturn, uranusSunBarycenter0, uranus, neptuneSunBarycenter0, neptune]

//*************************************************************
// LOAD DEFAULT SETTINGS
//*************************************************************
let jsonObj = defaultSettings;
planets.forEach(obj => {
  let newVals = jsonObj.find(obj2 => {
    return obj.name === obj2.name
  });
  Object.assign(obj, newVals);  
  // updatePlanet(obj)
  // initTrace(obj)
});

const scene = new THREE.Scene();
scene.background = new THREE.Color( o.background );

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

document.body.appendChild(renderer.domElement);

// INIT XRING GEOMETRY AND CROSS ORIGIN TEXTURE LOADING
initXRingGeometry();
THREE.ImageUtils.crossOrigin = '';

//*************************************************************
// CREATE AND CONFIGURE PLANETS
//*************************************************************
createPlanet(startEarth);
createPlanet(earthWobbleCenter);
createPlanet(midEccentricityOrbit);
createPlanet(helionPointAlternative);
createPlanet(earth);
createPlanet(earthPerihelionPrecession1);
createPlanet(earthPerihelionPrecession2);
createPlanet(earthObliquityPrecession);
createPlanet(earthInclinationPrecession);
createPlanet(earthEclipticPrecession);
createPlanet(barycenterSun);
createPlanet(earthHelionPoint);
createPlanet(mercurySunBarycenter0);
createPlanet(mercurySunBarycenter);
createPlanet(venusSunBarycenter0);
createPlanet(venusSunBarycenter);
createPlanet(marsSunBarycenter0);
createPlanet(marsSunBarycenter);
createPlanet(jupiterSunBarycenter0);
createPlanet(jupiterSunBarycenter);
createPlanet(saturnSunBarycenter0);
createPlanet(saturnSunBarycenter);
createPlanet(uranusSunBarycenter0);
createPlanet(uranusSunBarycenter);
createPlanet(neptuneSunBarycenter0);
createPlanet(neptuneSunBarycenter);
createPlanet(plutoSunBarycenter0);
createPlanet(plutoSunBarycenter);
createPlanet(halleysSunBarycenter0);
createPlanet(halleysSunBarycenter);
createPlanet(erosSunBarycenter0);
createPlanet(erosSunBarycenter);
createPlanet(sun);
createPlanet(moonApsidalPrecession);
createPlanet(moonApsidalNodalPrecession1);
createPlanet(moonApsidalNodalPrecession2);
createPlanet(moonRoyerCycle);
createPlanet(moonNodalPrecession);
createPlanet(moon);
moon.planetObj.rotation.y = Math.PI //quick fix so that the Moon texture is turned towards Earth
createPlanet(mercuryBarycenter);
createPlanet(mercuryEllipse);
createPlanet(mercury);
createPlanet(venusBarycenter);
createPlanet(venusEllipse);
createPlanet(venus);
createPlanet(marsBarycenter);
createPlanet(marsEllipse);
createPlanet(mars);
createPlanet(phobos);
createPlanet(deimos);
createPlanet(jupiterBarycenter);
createPlanet(jupiterEllipse);
createPlanet(jupiter);
createPlanet(saturnBarycenter);
createPlanet(saturnEllipse);
createPlanet(saturn);
createPlanet(uranusBarycenter);
createPlanet(uranusEllipse);
createPlanet(uranus);
createPlanet(neptuneBarycenter);
createPlanet(neptuneEllipse);
createPlanet(neptune);
createPlanet(plutoBarycenter);
createPlanet(plutoEllipse);
createPlanet(pluto);
createPlanet(halleysBarycenter);
createPlanet(halleysEllipse);
createPlanet(halleys);
createPlanet(erosBarycenter);
createPlanet(erosEllipse);
createPlanet(eros);

startEarth.pivotObj.add(earth.containerObj);
startEarth.pivotObj.add(helionPointAlternative);
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
planets.forEach(obj => {
    obj.ra = "";
    obj.dec = "";
    obj.dist = "";      
    obj.distKm = "";      
})

//*************************************************************
// CREATTE BARYCENTER, CELESTIAL SPHERE AND ECLIPTIC GRID
//*************************************************************
const bGeometry = new THREE.SphereGeometry( 1, 32, 16 );
const bMaterial = new THREE.MeshBasicMaterial( { color: 0x333333 } );
const barycenter = new THREE.Mesh( new THREE.SphereGeometry( 0.01, 32, 16 ), new THREE.MeshBasicMaterial( { color: 0x578B7C } ) );
scene.add(barycenter);
const celestialSphere = createCelestialSphere(o.starDistance)
earth.rotationAxis.add(celestialSphere);
celestialSphere.visible = false;
const csLookAtObj = new THREE.Object3D();
celestialSphere.add(csLookAtObj)

const zodiac = new THREE.PolarGridHelper( radius = 250, radials = 24, circles = 1, divisions = 64, color1 = 0x000000, color2 = 0x555555 );
const zCanvas = getCircularText("      GEMINI             TAURUS             ARIES             PISCES          AQUARIUS       CAPRICORN     SAGITTARIUS      SCORPIO             LIBRA              VIRGO                LEO               CANCER ", 800, 0, "right", false, true, "Arial", "18pt", 2);
const zTexture = new THREE.CanvasTexture(zCanvas);
const zLabelGeometry = new THREE.RingGeometry( 235, 250, 32 );
const zLabelMaterial = new THREE.MeshBasicMaterial({
    map: zTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
});
const zLabel = new THREE.Mesh(zLabelGeometry, zLabelMaterial);
zodiac.add(zLabel);
zLabel.rotation.x = -Math.PI/2
earth.pivotObj.add(zodiac);
zodiac.position.y = 0; 
zodiac.visible = false;

const plane = new THREE.GridHelper(o.starDistance*2, 30, 0x008800, 0x000088);
earth.pivotObj.add(plane);
plane.visible = false

//*************************************************************
// CREATE MILKYWAY SKYDOME
//*************************************************************
const skyGeo = new THREE.SphereGeometry(100000, 25, 25);

const skyTexture = new THREE.TextureLoader().load("https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/milkyway.jpg");

const skyMaterial = new THREE.MeshBasicMaterial({ 
         map: skyTexture,
 });

const sky = new THREE.Mesh(skyGeo, skyMaterial);
sky.material.side = THREE.BackSide;
scene.add(sky);

//*************************************************************
// CREATE BACKGOUND STARFIELD AND PLOT NAKED EYE VISIBLE STARS
//*************************************************************

createStarfield()
scene.updateMatrixWorld() 
const starsContainer = new THREE.Object3D();
starsContainer.applyMatrix( earth.rotationAxis.matrixWorld )
scene.add(starsContainer)
starsContainer.visible = false

function createLabel(message) {
  const fontSize = 30;
  let canvas = document.createElement('canvas');
  let context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;
  context.font = fontSize + "px Arial";
  context.strokeStyle = 'black';
  context.lineWidth = 8;
  context.strokeText(message, 0, fontSize);
  context.fillStyle = 'LightGrey';
  context.fillText( message, 0, fontSize);
  let texture = new THREE.Texture(canvas) 
  texture.needsUpdate = true;
  let spriteMaterial = new THREE.SpriteMaterial( { map: texture, depthTest: false} );
  let sprite = new THREE.Sprite( spriteMaterial );
  return sprite;  
}

//*************************************************************
// ADD THE STARS
//*************************************************************
const bsc5url = 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/input-stars.json'
/*
https://github.com/brettonw/YaleBrightStarCatalog
Fields in the Short BSC5 file (empty fields are omitted):
Field	Description
HR	Harvard Revised Number = Bright Star Number
F	Flamsteed number, to be taken with the constellation name
B	Bayer designation as greek letter with superscript sequence (if multi), to be taken with the constellation name
N	The common name of the star (drawn from IAU designations and notes)
C	The traditional 3-letter abbreviation for the constellation name
RA	Right Ascension (00h 00m 00.0s), equinox J2000, epoch 2000.0
Dec	Declination (+/-00° 00′ 00″), equinox J2000, epoch 2000.0
K	An approximate color temperature of the star, computed from B-V or the SpectralCls
V	Visual magnitude
*/
fetch(bsc5url)
  .then(response => response.json())
  .then(bscStars => {

  bscStars.forEach(obj => {
    if (obj.N !== undefined) {    

      const starPos = new THREE.Object3D();
      starPos.rotation.z = decToRad(obj.Dec)
      starPos.rotation.y = raToRad(obj.RA) - Math.PI/2
      let starsize;
      if (obj.V < 1) {
        starsize = 12;
      } else if(obj.V > 1 && obj.V < 3) {
        starsize = 6;
      } else if(obj.V > 3 && obj.V < 5) {
        starsize = 3;
      } else {
        starsize = 1;
      }
      const star = new THREE.Mesh(
        new THREE.SphereBufferGeometry(starsize, 20, 20),

        new THREE.MeshBasicMaterial({color: colorTemperature2rgb(obj.K)})
      );
      star.position.x = o.starDistance;
      const nameTag = createLabel(obj.N);
      nameTag.visible = o.starNamesVisible;
      nameTag.position.copy(star.position)
      starPos.add(star)
      starPos.add(nameTag)
      starsContainer.add(starPos);
    }
  });
});

const constContainer = new THREE.Object3D();
scene.updateMatrixWorld()
constContainer.applyMatrix( earth.rotationAxis.matrixWorld )
scene.add(constContainer)
constContainer.visible = false;

//*************************************************************
// ADD THE CONSTELLATIONS
//*************************************************************
const constellationsUrl = 'https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/input-constellations.json'
//create a blue LineBasicMaterial
const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
fetch(constellationsUrl)
  .then(response => {
  return response.json();
})
  .then(constData => {
    const cRA = constData.rightAscension
    const cDec = constData.declination
    const cAst = constData.asterismIndices
    
    let points = [];
    
    for (let i = 0; i < constData.asterismIndices.length; i++) {

      let starIndex = constData.asterismIndices[i];
      if (starIndex != -1) {

        // Compute star position.
        let ra = constData.rightAscension[starIndex];
        let dec = constData.declination[starIndex];

        let x = o.starDistance * Math.cos(dec) * Math.sin(ra);
        let y = o.starDistance * Math.sin(dec);
        let z = o.starDistance * Math.cos(dec) * Math.cos(ra);

        // points.push(new THREE.Vector3(-x, y, z));
        points.push(new THREE.Vector3(x, y, z));
      }
      else {

        // Create lines.
        const geometry = new THREE.BufferGeometry().setFromPoints( points );
        const line = new THREE.Line( geometry, material );
        constContainer.add(line);
        // Clear points array.
        points = [];
      }
    }
  });

//*************************************************************
// SETUP CAMERAS and CONTROLS
//*************************************************************
const camera = new THREE.PerspectiveCamera(15, window.innerWidth/window.innerHeight, 0.1, 10000000);
//earth.pivotObj.add(camera);
camera.position.set(0, 2500, 0);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableKeys = false

//*************************************************************
// SETUP EXPERIMENTAL EARTH CAMERAS and CONTROLS
//*************************************************************
const camPivotX = new THREE.Object3D();
const camPivotY = new THREE.Object3D();

earth.planetObj.add(camPivotY);
camPivotY.add(camPivotX);

const cameraMount = new THREE.Object3D();
camPivotX.add(cameraMount);

const planetCamera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.001, 10000000);

//const planetCamera = new THREE.PerspectiveCamera(90, window.innerWidth/window.innerHeight, 0.001, 10000000);

let SCREEN_WIDTH = window.innerWidth;
let SCREEN_HEIGHT = window.innerHeight;
let aspect = SCREEN_WIDTH / SCREEN_HEIGHT;

const frustumSize = 10;

cameraMount.add(planetCamera)

cameraMount.position.z = -(earth.size + 0.02);

const cameraHelper = new THREE.CameraHelper( planetCamera );
scene.add( cameraHelper );
const axisHelper = new THREE.AxesHelper(10)
planetCamera.add(axisHelper)
//planetCamera.rotateX(-1)
planetCamera.rotation.set(Math.PI / 2, 0, 0); 

function updatePlanetCamera() {
     planetCamera.updateProjectionMatrix()
     cameraHelper.update()
}

function trackSun() {
    camPivotX.rotation.x = o['Camera Lat'] + Math.PI/2
    camPivotY.rotation.y = o['Camera Long'] + Math.PI/2
}

window.addEventListener('keydown', function(event) {
  let rotSpeed = 0.1;
  switch (event.key) {
    case "ArrowLeft" :
    case "a" :
      cameraMount.rotateZ( -rotSpeed );
      break;
    case "ArrowRight" :
    case "d" :
      cameraMount.rotateZ( rotSpeed );
      break;
    case "ArrowUp" :
    case "w" :
      planetCamera.rotateX( rotSpeed );
      break;
    case "ArrowDown":
    case "s" :
      planetCamera.rotateX( -rotSpeed );
      break;
  }
});

function showHideCameraHelper () {
  axisHelper.visible = o['Camera helper']
  cameraHelper.visible = o['Camera helper']
}

//*************************************************************
// SETUP LIGHT
//*************************************************************
const ambientLight = new THREE.AmbientLight( 0x404040, o.ambientLight ); // soft white light
// const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const light = new THREE.PointLight( 0xffffff, o.sunLight, 0 );
light.castShadow = true;
// light.position.set( 50, 50, 50 );
sun.pivotObj.add( light );

const lightMount = new THREE.Object3D();
sun.pivotObj.add( lightMount );

const spotlightDirections = [
  new THREE.Vector3( 1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0,  1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0,  1),
  new THREE.Vector3(0, 0, -1),
];

spotlightDirections.forEach(direction => {
  const spotlight = new THREE.SpotLight(0xffffff, 10);
  lightMount.add(spotlight);
  spotlight.position.copy(direction.clone().multiplyScalar(15));
  spotlight.angle = 0.5;
  spotlight.distance = 15;
  spotlight.target = lightMount; // Optional: maybe skip this
});

moon.planetObj.castShadow = true;
earth.planetObj.receiveShadow = true;
light.shadow.camera.far = 50000
light.shadow.mapSize.width = 2560;  // 2560 4096 512 default 
light.shadow.mapSize.height = 2560; // 512 default
light.shadow.radius = 2;

//*************************************************************
// ADD GLOW EFFECT TO SUN
//*************************************************************
const sunTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/glow.png'); 

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
// ADD LENS FLARE EFFECT TO SUN
//*************************************************************
const flareTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/lensflare.png'); 
// You can use any small round bright texture or generate a quick radial white glow.

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

// Create multiple flare elements
const flares = [
  createFlare(0xffffff, 30),   // Bright center flare
  createFlare(0xffcc88, 15),   // Warm flare
  createFlare(0x88aaff, 20),   // Cool flare
  createFlare(0xff8888, 8),    // Small red flare
  createFlare(0x88ff88, 12),   // Small greenish flare
];

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

//*************************************************************
// CREATE SETTINGS AND SETUP GUI
//*************************************************************
setupGUI()
function setupGUI() {
  const gui = new dat.GUI();
  gui.domElement.id = 'gui';
  gui.add(o, 'Date').listen().onFinishChange(() => {
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
      o.Day = o.julianDay - 2451717;
      o.pos = sDay * o.Day + timeToPos(o.Time);
    }
  });
  
  let ctrlFolder = gui.addFolder('Controls')
  ctrlFolder.add(o, 'Run').listen();
  ctrlFolder.add(o, 'traceBtn').name('Trace').onFinishChange(()=>{
    tracePlanets.forEach(obj => {
      initTrace(obj);
    });
  });
    
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
    o.speedFact = Number(o['1 second equals']);
  });
  ctrlFolder.add(o, 'speed', -5, 5).step(0.5).name('Speed multiplier');
  ctrlFolder.add(o, 'Step forward' );
  ctrlFolder.add(o, 'Step backward' );
  ctrlFolder.add(o, 'Reset' );
  ctrlFolder.add(o, 'Today' );
  let planList = {}
  planets.forEach(obj => {
    if (!obj.isDeferent) {
      planList[obj.name] = obj.name
    }
  });

  ctrlFolder.add(o, 'Target', {'Please select': "", ...planList}).name('Look at').onFinishChange(()=>{
    o.lookAtObj = planets.find(obj => {
      return obj.name === o.Target
    })
    if (o.Target === "") {o.lookAtObj = {}}    
  });
  
  ctrlFolder.open() 
  
  let folderT = gui.addFolder('Trace Settings')
  folderT.add(o, 'traceSize', 0.1, 2).name('Dot size').onChange(()=>{changeTraceScale()})

  folderT.add(o, 'Lines').onFinishChange(()=>{
    tracePlanets.forEach(obj => {
      setTraceMaterial(obj)
    });
  });

  tracePlanets.forEach(obj => {
    folderT.add(obj, 'traceOn').name(obj.name).onFinishChange(()=>{initTrace(obj)})
  });
  
  let posFolder = gui.addFolder('Celestial Positions')
  let posPlFolder
  tracePlanets.forEach(obj => {
    posPlFolder = posFolder.addFolder(obj.name)
    posPlFolder.add(obj, 'ra').listen().name('RA')
    posPlFolder.add(obj, 'dec').listen().name('Dec')
    posPlFolder.add(obj, 'distKm').listen().name('Kilometers')
    posPlFolder.add(obj, 'dist').listen().name('AU Distance')
    posPlFolder.open()
  })
  
  let folderO = gui.addFolder('Stars & helper objects')
  folderO.add(zodiac, 'visible').name('Zodiac');
  folderO.add(o, 'zodiacSize', 0.01, 10).step(0.1).name('Zodiac size').onChange(()=>{changeZodiacScale()})
  folderO.add(o, 'Polar line').onFinishChange(()=>{
    polarLine.visible = o['Polar line']
  });
  folderO.add(o, 'polarLineLength', 0.1, 50).name('Line length').onChange(()=>{
      polarLine.scale.y = o.polarLineLength
  });
  
  folderO.add(starsContainer, 'visible' ).name('Stars visible');
  folderO.add(o, 'starNamesVisible').name('Star names').onChange(()=>{
    starsContainer.children.forEach(
      function(starPos) {
        const nameTag = starPos.children[1];
        nameTag.visible = o.starNamesVisible;
      });
  });
  folderO.add(constContainer, 'visible').name('Constellations') 
  folderO.add(o, 'starDistanceScaleFact', 0.1, 2).step(0.1).name('Star distance').onChange(()=>{
    starsContainer.children.forEach(
      function(starPos) {
        const star = starPos.children[0];
        star.position.x = o.starDistance * o.starDistanceScaleFact;
        const nameTag = starPos.children[1];
        nameTag.position.x = o.starDistance * o.starDistanceScaleFact;
      });
    celestialSphere.scale.set(o.starDistanceScaleFact, o.starDistanceScaleFact, o.starDistanceScaleFact);
    plane.scale.set(o.starDistanceScaleFact, o.starDistanceScaleFact, o.starDistanceScaleFact);
    constContainer.scale.set(o.starDistanceScaleFact, o.starDistanceScaleFact, o.starDistanceScaleFact);
  });
  
  folderO.add(o, 'starSize', 0.1, 5).step(0.1).name('Star sizes').onChange(()=>{
    starsContainer.children.forEach(
      function(starPos) {
        const star = starPos.children[0];
        star.scale.x = o.starSize
        star.scale.y = o.starSize
        star.scale.z = o.starSize
      });
  });
 folderO.add(celestialSphere, 'visible').name('Celestial sphere')
 folderO.add(plane, 'visible').name('Ecliptic grid')
  
  let sFolder = gui.addFolder('Settings')
  let folderPlanets = sFolder.addFolder('Planets show/hide');
  folderPlanets.add(o, 'Orbits' ).onFinishChange(()=>{
    showHideOrbits();
  });

  folderPlanets.add(o, 'Size', 0.4, 1.4).onChange(()=>{changePlanetScale()})
  planets.forEach(obj => {
    if (!obj.isDeferent) {
      folderPlanets.add(obj, 'visible').name(obj.name).onFinishChange(()=>{
        showHideObject(obj);
      });
    }
  })
 
  let folderDef = sFolder.addFolder('Objects show/hide');
  planets.forEach(obj => {
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

  // folderO.add(o, 'Axis helpers' ).onFinishChange(()=>{
  //     showHideAxisHelpers();
  // });
  
  let folderCamera = sFolder.addFolder('Camera show/hide')  

  folderCamera.add(o, 'worldCamRa').name('RA').listen()
  folderCamera.add(o, 'worldCamDec').name('Dec').listen()
  folderCamera.add(o, 'worldCamDist').name('AU distance').listen()
  
  let folderCam = sFolder.addFolder('Earth Camera show/hide')
  folderCam.add(o, 'Earth camera')
  o['Camera Lat'] = 0.67
  o['Camera Long'] = 0.01
  folderCam.add(o, 'Camera Lat', 0.00, Math.PI).listen()
  folderCam.add(o, 'Camera Long', 0.00, Math.PI*2).listen()
  folderCam.add(o, 'Camera helper').onFinishChange(() => {
    showHideCameraHelper()
  }); 
}  
//*************************************************************
// STATISTICS (WHEN NEEDED)
//*************************************************************
const stats = new Stats()
document.body.appendChild( stats.dom )
if (!o.Perfomance) stats.dom.style.visibility = 'hidden';
//if (!o.Perfomance) stats.dom.style.visibility = 'visible';
// stats.dom.container.style.visibility = 'hidden';

//*************************************************************
// START SCENE
//*************************************************************
const clock = new THREE.Clock(); 

window.addEventListener('resize', onWindowResize, false);
onWindowResize();

// var orbit;
var pause = true;

planets.forEach(obj => {
  showHideObject(obj)
});
showHideAxisHelpers();
showHideCameraHelper();
showHideInfoText();

o.pos = 0
let currPos 
let tlapsed = 0;
renderer.render(scene, camera);//renderer needs to be called otherwise the position are wrong
const centerPosVec = new THREE.Vector3();
const starPosVec  = new THREE.Vector3();
const scaleVec = new THREE.Vector3();

//*************************************************************
//THE RENDER LOOP
//*************************************************************
function render() {
  requestAnimationFrame(render);
  stats.update();

  if (o.lookAtObj && o.lookAtObj.pivotObj) {
    controls.target.copy(o.lookAtObj.pivotObj.getWorldPosition(centerPosVec));
    controls.update();
  }

  let delta = clock.getDelta();
  tlapsed += delta;

  if (tlapsed > 0.05) {
    tlapsed -= 0.05;

    o.Position = o.pos;
    o.Day = posToDays(o.pos);
    o.julianDay = o.Day + 2451717;
    o.Date = daysToDate(o.Day);
    o.Time = posToTime(o.pos);

    o.worldCamX = Math.round(camera.position.x);
    o.worldCamY = Math.round(camera.position.y);
    o.worldCamZ = Math.round(camera.position.z);

    if (renderer.shadowMap.enabled !== o.Shadows) {
      renderer.shadowMap.enabled = o.Shadows;
    }
  }

  if (o.Run) {
    o.pos += Number(o.speedFact) * o.speed * delta;
  }

  trace(o.pos);
  moveModel(o.pos);
  updateElongations();
  updatePositions();
  trackSun();

  const activeCamera = o['Earth camera'] ? planetCamera : camera;
  renderer.render(scene, activeCamera);
  updateFlares();

  const sunDistance = camera.position.distanceTo(sunGlow.getWorldPosition(new THREE.Vector3()));
  const glowSize = sunDistance / 2; // tweak factor as needed
  sunGlow.scale.set(glowSize, glowSize, 10);
  
  starsContainer.children.forEach(function(starPos) {
  const scaleFactor = 25;
  const fadeStart = 7500;  // Distance where fading starts
  const fadeEnd = 30000;   // Distance where labels become fully transparent

  const star = starPos.children[0];
  const nametag = starPos.children[1];

  const distance = scaleVec.subVectors(star.getWorldPosition(starPosVec), camera.position).length();

  // Scale the nametag
  const scale = distance / scaleFactor;
  nametag.scale.set(scale, scale, 1);

  // Fade out nametag based on distance
  let opacity = 1.0;
  if (distance > fadeStart) {
    opacity = 1.0 - (distance - fadeStart) / (fadeEnd - fadeStart);
    opacity = Math.max(0, Math.min(1, opacity)); // Clamp between 0 and 1
  }

  if (nametag.material) {
    nametag.material.transparent = true;
    nametag.material.opacity = opacity;
  }
});
}
render();
//*************************************************************
// END RENDER LOOP
//*************************************************************

function createEarthPolarLine() {
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff
  });
  const geometry = new THREE.Geometry();
  geometry.vertices.push(
    new THREE.Vector3(0,-100,0),
    new THREE.Vector3(0,100,0)
  );
  const line = new THREE.Line( geometry, material );
  line.visible = o['Polar line']
  return line
}
const polarLine = createEarthPolarLine();

earth.rotationAxis.add(polarLine);

function changeSphereScale() {
      celestialSphere.scale.set(o.cSphereSize, o.cSphereSize, o.cSphereSize);    
  }
  
function changeZodiacScale() {
      zodiac.scale.set(o.zodiacSize, o.zodiacSize, o.zodiacSize);  
  }

function updatePosition() {
  o.pos = sDay * dateToDays(o.Date) + timeToPos(o.Time);
}

function changeTraceScale(){
    tracePlanets.forEach(obj => {
      if (obj.traceLine) {
        obj.traceLine.material.size = obj.size*10 * o.traceSize
      }
    });  
  }

function changePlanetScale(){
    planets.forEach(obj => {
      obj.planetObj.scale.x = o.Size
      obj.planetObj.scale.y = o.Size
      obj.planetObj.scale.z = o.Size
    });  
  }
  
function updatePositions() {
  scene.updateMatrixWorld() //No effect(?)

  const csPos = new THREE.Vector3();
  celestialSphere.getWorldPosition(csPos);

  const sphericalPos = new THREE.Spherical();

  tracePlanets.forEach(obj => {    
    const planetPos = new THREE.Vector3();
    const lookAtDir = new THREE.Vector3(0,0,1);
    obj.planetObj.getWorldPosition(planetPos)
    csLookAtObj.lookAt(planetPos)
    lookAtDir.applyQuaternion(csLookAtObj.quaternion);
    lookAtDir.setLength(csPos.distanceTo(planetPos))
    sphericalPos.setFromVector3(lookAtDir)
    obj.ra = radToRa(sphericalPos.theta)
    obj.dec = radToDec(sphericalPos.phi)
    obj.distKm = (sphericalPos.radius/100 * 149597870.698828).toFixed(2)
    obj.dist = (sphericalPos.radius/100).toFixed(8)
  });
  
  //Get camera pos
  const cameraPos = new THREE.Vector3();
  const lookAtDir = new THREE.Vector3(0,0,1);
  camera.getWorldPosition(cameraPos)
  csLookAtObj.lookAt(cameraPos)
  lookAtDir.applyQuaternion(csLookAtObj.quaternion);
  lookAtDir.setLength(csPos.distanceTo(cameraPos));
  sphericalPos.setFromVector3(lookAtDir);
  o.worldCamRa = radToRa(sphericalPos.theta);
  o.worldCamDec = radToDec(sphericalPos.phi);
  o.worldCamDistKm = (sphericalPos.radius/100 * 149597870.698828).toFixed(2);
  o.worldCamDist = (sphericalPos.radius/100).toFixed(8);  
}

function drawSunLine(){
  const csPos = new THREE.Vector3();
  celestialSphere.getWorldPosition(csPos);
  const lookAtDir = new THREE.Vector3(0,0,1);
  const planetPos = new THREE.Vector3();

  const sphericalPos = new THREE.Spherical();
  
  sun.planetObj.getWorldPosition(planetPos)
  csLookAtObj.lookAt(planetPos)
  lookAtDir.applyQuaternion(csLookAtObj.quaternion);
  lookAtDir.setLength(csPos.distanceTo(planetPos))
  
  sphericalPos.setFromVector3(lookAtDir)

  var material = new THREE.LineBasicMaterial({
    color: 0x0000ff
  });

  var geometry = new THREE.Geometry();
  geometry.vertices.push(
    new THREE.Vector3(0,0,0),
    new THREE.Vector3().setFromSpherical(sphericalPos)
  );

  var line = new THREE.Line( geometry, material );
  celestialSphere.add( line );
  
  console.log(sphericalPos.theta)
  
  sphericalPos.theta = sun.ra 
  sphericalPos.phi =  sun.dec
  sphericalPos.radius = sun.dist
  
  var material2 = new THREE.LineBasicMaterial({
    color: 0xff0000
  });

  var geometry2 = new THREE.Geometry();
  geometry2.vertices.push(
    new THREE.Vector3(0,0,0),
    new THREE.Vector3().setFromSpherical(sphericalPos)
  );

  var line2 = new THREE.Line( geometry2, material2 );
  celestialSphere.add( line2 );  
}

function trace(pos) {
    tracePlanets.forEach(obj => {
      tracePlanet(obj, pos)
    });        
}

  function initTrace(obj) {
    obj.traceStartPos = obj.traceCurrPos = o.pos; 
    obj.traceArrIndex = 0;
  }

function setTraceMaterial(obj) {
  let lineMaterial;
  const vertexCount = Math.round(obj.traceLength / obj.traceStep);

  if (!obj.traceLine) {
    lineMaterial = new THREE.PointsMaterial({
      color: obj.color,
      size: obj.size * 10,
      transparent: true,
      opacity: 0.7,
      alphaTest: 0.5,
      map: new THREE.TextureLoader().load("https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/disc.png"),
    });
  } else {
    scene.remove(obj.traceLine);
    lineMaterial = obj.traceLine.material; // Reuse material
  }

  const lineGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(vertexCount * 3); // 3 floats (x,y,z) per vertex
  lineGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3)); // <-- use addAttribute!

  if (o.Lines) {
    obj.traceLine = new THREE.Line(lineGeometry, lineMaterial);
  } else {
    obj.traceLine = new THREE.Points(lineGeometry, lineMaterial);
  }

  scene.add(obj.traceLine);
}

function tracePlanet(obj, pos) {
  let update = false;
  if (!obj.traceOn || !o.traceBtn) { 
    obj.traceLine.visible = false; 
    return;
  }

  if (pos < obj.traceStartPos) {
    initTrace(obj);
    update = true;
  }
  if (pos < obj.traceCurrPos) {
    obj.traceCurrPos = obj.traceStartPos;
    obj.traceArrIndex = 0;
    update = true;
  }
  if (obj.traceCurrPos + obj.traceStep > pos && !update) return;

  let firstRun = false;
  if (obj.traceArrIndex === 0) firstRun = true;

  if (!obj.traceLine) {
    setTraceMaterial(obj);
  }

  let nextPos = obj.traceCurrPos;
  const positionAttr = obj.traceLine.geometry.attributes.position;
  const vertArray = positionAttr.array;
  const pointCount = vertArray.length / 3;

  while (nextPos < pos) {
    moveModel(nextPos);
    earth.containerObj.updateMatrixWorld();
    let epos = new THREE.Vector3();
    obj.planetObj.getWorldPosition(epos);

    // Write position at current circular index
    const writeIndex = (obj.traceArrIndex % pointCount) * 3;
    vertArray[writeIndex + 0] = epos.x;
    vertArray[writeIndex + 1] = epos.y;
    vertArray[writeIndex + 2] = epos.z;

    obj.traceArrIndex++;
    nextPos += obj.traceStep;
  }

  positionAttr.needsUpdate = true; // Tell Three.js to update the buffer
  obj.traceCurrPos = nextPos - obj.traceStep;
  obj.traceLine.visible = true;
}

function getZodiacRotationSpeed() {
  const earth = planets.find(obj => obj.name === "Earth");
  return earth ? -earth.speed : 0;
}

function moveModel(pos){
  planets.forEach(obj => {
    obj.orbitObj.rotation.y = obj.speed * pos - obj.startPos * (Math.PI/180)
    if (obj.rotationSpeed) {
      obj.planetObj.rotation.y = obj.rotationSpeed * pos 
    }
  })
  zodiac.rotation.y = -Math.PI/3 - earth.orbitObj.rotation.y;
}
// Math.PI/6 + 
function onWindowResize() {
  if (o['Earth camera']) {
    planetCamera.aspect = window.innerWidth / window.innerHeight;
    planetCamera.updateProjectionMatrix();
  } else {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function addPolarGridHelper(inplanet) {
  var polarGridHelper = new THREE.PolarGridHelper( 10, 16, 8, 64, 0x0000ff, 0x808080 );
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

//console.log(raToRadians("00:00:60"))
function raToRadians(rightAscension) {
  const time = rightAscension.split(":");
  const deg = (Number(time[0]) + time[1]/60 + time[2]/3600)*15;
  //console.log(deg)
  return deg * (Math.PI/180);
}

function radiansToRa(radians) {
  const raDec = radians * 12 / Math.PI;
  const hours = Math.floor(raDec);
  const minutesFloat = (raDec - hours) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);

  const hh = ("0" + hours).slice(-2);
  const mm = ("0" + minutes).slice(-2);
  const ss = ("0" + seconds).slice(-2);

  return hh + ":" + mm + ":" + ss;
}

//console.log(decToRadians("360:00:00"))
function decToRadians(declination) {
  const time = declination.split(":");
  const deg = Number(time[0]) + time[1]/60 + time[2]/3600;
  //console.log(deg)
  return deg * (Math.PI/180);
}

function raToRad(ra) {
  ra = ra.replace(/\s+/g, '');
  const hours = ra.split('h')[0];
  const minutes = ra.split('h')[1].split('m')[0]
  const seconds = ra.split('h')[1].split('m')[1].split('s')[0]
  return hours*Math.PI/12 + minutes*(Math.PI/(12*60)) + seconds*(Math.PI/(12*3600))
}

//Thanks to AI correct version of decToRad (chaecked by viewing the orionbelt)
function decToRad(dec) {
  if (typeof dec !== 'string') {
    console.warn('decToRad expected a string but got', typeof dec);
    return 0;
  }

  dec = dec.replace(/\s+/g, '');

  const degreeParts = dec.split('°');
  if (degreeParts.length < 2) {
    console.warn('Invalid declination format (missing °):', dec);
    return 0;
  }

  let degrees = parseFloat(degreeParts[0]) || 0;
  const isNegative = degrees < 0;

  const minuteSecondPart = degreeParts[1].split('′');
  const minutes = parseFloat(minuteSecondPart[0]) || 0;
  let seconds = 0;

  if (minuteSecondPart.length > 1) {
    seconds = parseFloat(minuteSecondPart[1].replace('″', '')) || 0;
  }

  const absDegrees = Math.abs(degrees) + (minutes / 60) + (seconds / 3600);
  return (isNegative ? -absDegrees : absDegrees) * (Math.PI / 180);
}

function radToRa(rad){
  if ( rad < 0 ) {rad = rad + Math.PI*2}
  const raDec = rad * 12/Math.PI
  const hours = Math.floor(raDec);
  const minutesSeconds = (raDec - hours) * 60
  const minutes = Math.floor(minutesSeconds);
  const seconds = (minutesSeconds - minutes) * 60
  return leadZero(hours) + "h" + leadZero(minutes) + "m" + leadZero(seconds.toFixed(0)) + "s"
  }

function radToDec(rad) {
  rad = (rad <= 0) ? rad + Math.PI / 2 : Math.PI / 2 - rad;
  let degDec = rad * 180 / Math.PI;
  let degreesSign = "";

  if (degDec < 0) {
    degDec *= -1.0;
    degreesSign = "-";
  }

  const degrees = Math.floor(degDec);
  const minutesSeconds = (degDec - degrees) * 60;
  const minutes = Math.floor(minutesSeconds);
  const seconds = (minutesSeconds - minutes) * 60;

  return leadZero(degreesSign + degrees, true) + "\xB0" + leadZero(minutes) + "'" + leadZero(seconds.toFixed(0)) + "\"";
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
  let aTime = value.split(":");
  if (aTime.length > 3) {
    return false; // Only hh:mm:ss allowed
  }

  // Hours
  if (!/^\d+$/.test(aTime[0]) || aTime[0].length != 2) return false;
  const hours = Number(aTime[0]);
  if (hours > 24) return false;

  // Minutes
  if (aTime.length > 1) {
    if (!/^\d+$/.test(aTime[1]) || aTime[1].length != 2) return false;
    const minutes = Number(aTime[1]);
    if (minutes > 59) return false;
  }

  // Seconds
  if (aTime.length > 2) {
    if (!/^\d+$/.test(aTime[2]) || aTime[2].length != 2) return false;
    const seconds = Number(aTime[2]);
    if (seconds > 59) return false;
  }

  // Extra: if hour == 24, minutes and seconds must be 00
  if (hours === 24 && (Number(aTime[1]) > 0 || Number(aTime[2]) > 0)) {
    return false;
  }

  return true;
}

function isValidDate(value) {
  let aDate = value.split("-");
  if (aDate.length > 3) {
    aDate.shift(); // Assume minus sign first
  }
  if (aDate.length !== 3) return false; // must be exactly 3 parts

  const year = Number(aDate[0]);
  const month = Number(aDate[1]);
  const day = Number(aDate[2]);

  if (!isNumeric(year) || !isNumeric(month) || !isNumeric(day)) return false;

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Check valid days in months
  const daysInMonth = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return false;

  // Gregorian calendar transition
  if (year === 1582 && month === 10 && day > 4 && day < 15) {
    return false;
  }

  return true;
}

function dateToDays(sDate) {
  // Calculates number of days since 2000-06-21
  // Handles Julian and Gregorian calendar dates, including BC dates (astronomical numbering)
  
  const GREGORIAN_START = { year: 1582, month: 10, day: 15 };
  const GREGORIAN_REFERENCE_DAY = 730597; // days since 0 AD to 2000-06-21 (Gregorian)
  const JULIAN_REFERENCE_DAY = 2451717;   // Julian Day Number for 2000-06-21

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
    return jd - JULIAN_REFERENCE_DAY;
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

//Returns the angle from the sun to targetPlanet as viewed from earth using the cosine rule.
function getElongationFromSun(targetPlanet)
{
  var sunPosition=new THREE.Vector3();
  var earthPosition=new THREE.Vector3();
  var targetPlanetPosition=new THREE.Vector3();
  sun.planetObj.getWorldPosition(sunPosition);
  earth.planetObj.getWorldPosition(earthPosition);
  targetPlanet.planetObj.getWorldPosition(targetPlanetPosition);

  var earthSunDistance=earthPosition.distanceTo(sunPosition);
  var earthTargetPlanetDistance=earthPosition.distanceTo(targetPlanetPosition);
  var sunTargetPlanetDistance=sunPosition.distanceTo(targetPlanetPosition);
	
  var numerator=(Math.pow(earthSunDistance,2)+Math.pow(earthTargetPlanetDistance,2))-Math.pow(sunTargetPlanetDistance,2);
  var denominator=2.0*earthSunDistance*earthTargetPlanetDistance;
  elongationRadians=Math.acos(numerator/denominator);
  return (180.0*elongationRadians)/Math.PI;
};

function updateElongations()
{
  o["moonElongation"]=getElongationFromSun(moon);
  o["mercuryElongation"]=getElongationFromSun(mercury);
  o["venusElongation"]=getElongationFromSun(venus);
  o["marsElongation"]=getElongationFromSun(mars);
  o["jupiterElongation"]=getElongationFromSun(jupiter);
  o["saturnElongation"]=getElongationFromSun(saturn);
  o["uranusElongation"]=getElongationFromSun(uranus);
  o["neptuneElongation"]=getElongationFromSun(neptune);
};

//CREATE PLANETS

function createPlanet (pd) { //pd = Planet Data
  var orbitContainer = new THREE.Object3D();
  orbitContainer.rotation.x = pd.orbitTilta * (Math.PI/180);
  orbitContainer.rotation.z = pd.orbitTiltb * (Math.PI/180);
  orbitContainer.position.x = pd.orbitCentera;
  orbitContainer.position.z = pd.orbitCenterb;
  orbitContainer.position.y = pd.orbitCenterc;
  
  var orbit = new THREE.Object3D();
  var geometry = new THREE.CircleGeometry(pd.orbitRadius, 100);
  geometry.vertices.shift();
  
  var line = new THREE.LineLoop( geometry, new THREE.LineBasicMaterial({color: pd.color, transparent: true, opacity : 0.4} ));
  line.rotation.x = Math.PI/2;
  orbit.add(line);

  var planetMesh
  if (pd.emissive) {
    planetMesh = new THREE.MeshPhongMaterial({color: pd.color, emissive: pd.color, emissiveIntensity: 2});
  } else {
    if (pd.planetColor) { //Halleys
      planetMesh = new THREE.MeshPhongMaterial({color: pd.planetColor, emissive: pd.planetColor, emissiveIntensity: 2});
    } else {
      planetMesh = new THREE.MeshPhongMaterial({color: pd.color});
    }
  }
  
  if (pd.textureUrl) {
    const texture = new THREE.TextureLoader().load(pd.textureUrl)
    if (pd.textureTransparency) {
      planetMesh = new THREE.MeshPhongMaterial({ map: texture, bumpScale: 0.05, specular: new THREE.Color('#190909'), transparent: true, opacity: pd.textureTransparency, });

    } else {
      planetMesh = new THREE.MeshPhongMaterial({ map: texture, bumpScale: 0.05, specular: new THREE.Color('#190909') });
    }

  }
  if (pd.sphereSegments) {
    var planet = new THREE.Mesh(
    new THREE.SphereBufferGeometry(pd.size, pd.sphereSegments, pd.sphereSegments), planetMesh);  
  } else {
    var planet = new THREE.Mesh(
    new THREE.SphereBufferGeometry(pd.size, 32, 32), planetMesh);
  }

  var pivot = new THREE.Object3D();
  pivot.position.set(pd.orbitRadius, 0.0, 0.0);
  orbit.add(pivot);

  var rotationAxis = new THREE.Object3D();
  rotationAxis.position.set(pd.orbitRadius, 0.0, 0.0);
  rotationAxis.rotation.z = pd.tilt * (Math.PI/180)
  if (pd.tiltb) {
    rotationAxis.rotation.x = pd.tiltb * (Math.PI/180)
  }

  if (pd.ringUrl) {
    var texloader = new THREE.TextureLoader();
    texloader.load(pd.ringUrl, function(tex) {
      const ring = createRings(pd.ringSize, 32, tex)
      rotationAxis.add(ring);
      pd.ringObj = ring;
    });
  };
  rotationAxis.add(planet);

  // const nameTag = createLabel(pd.name);
  // nameTag.position.copy(rotationAxis.position)
  // nameTag.scale.set(10,10,10)
  // rotationAxis.add(nameTag);
  
  orbit.add(rotationAxis);
  orbitContainer.add(orbit);

  if (pd.axisHelper) {
    pd.axisHelper = new THREE.AxesHelper(pd.size*3)
    planet.add(pd.axisHelper);
  }  
  pd.containerObj = orbitContainer;
  pd.orbitObj = orbit;
  pd.orbitLineObj = line;
  pd.planetObj = planet;
  pd.planetMesh = planetMesh;
  pd.pivotObj = pivot;
  pd.rotationAxis = rotationAxis;
  scene.add(orbitContainer);
}

function updatePlanet (pd) { 
  pd.containerObj.rotation.x = pd.orbitTilta * (Math.PI/180);
  pd.containerObj.rotation.z = pd.orbitTiltb * (Math.PI/180);
  pd.containerObj.position.x = pd.orbitCentera;
  pd.containerObj.position.z = pd.orbitCenterb;
  pd.containerObj.position.y = pd.orbitCenterc;
  pd.rotationAxis.rotation.z = pd.tilt * (Math.PI/180)
  if (pd.hasOwnProperty('tiltb')) {
    pd.rotationAxis.rotation.x = pd.tiltb * (Math.PI/180)
  }
}

function createCelestialSphere(radius) {
  const geometry1 = new THREE.SphereBufferGeometry( radius, 40, 40 );
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
    obj.planetMesh.visible = obj.visible;
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
  planets.forEach(obj => {
    if (obj.axisHelper) {
      obj.axisHelper.visible = o['Axis helpers'];
    }  
  });
}

function showHideOrbits() {
  planets.forEach(obj => {
    if (obj.orbitLineObj && !obj.isDeferent) {
       if (obj.visible) {
        obj.orbitLineObj.visible = o['Orbits'];
       }
    }  
  });
}

function showHideInfoText() {
    var x = document.getElementById("info");
  if(o.infotext) {
    x.style.display = "block";    
  } else {
    x.style.display = "none";    
  }
};

function randomPointInSphere(radius) {
  const v = new THREE.Vector3();
  let x, y, z, normalizationFactor;

  do {
    x = THREE.Math.randFloat(-1, 1);
    y = THREE.Math.randFloat(-1, 1);
    z = THREE.Math.randFloat(-1, 1);
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
    const tempK = THREE.Math.randFloat(2000, 10000);

    // Convert temperature to RGB
    const rgbString = colorTemperature2rgb(tempK);
    const rgbValues = rgbString.match(/\d+/g); // extract numbers

    // Normalize to 0..1 for Three.js colors
    colors.push(parseInt(rgbValues[0]) / 255, parseInt(rgbValues[1]) / 255, parseInt(rgbValues[2]) / 255);
  }

  geometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: THREE.VertexColors, // <--- use per-particle color
    sizeAttenuation: false
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

function setStarDistance() {
  stars.forEach(obj => {
    obj.starObj.position.x = obj.dist * o['Star distance'];
  })
}

function createRings(radius, segments, texture) {
  return new THREE.Mesh(new THREE.XRingGeometry(1.2 * radius, 2 * radius, 2 * segments, 5, 0, Math.PI * 2), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })); 
}

function initXRingGeometry() {
  /**
 * @author Kaleb Murphy
 * Modified uvs.push on line no. 42.
 */
  
 //This allows textures to be added to a disc in a way that makes planetary ring look nice
  THREE.XRingGeometry = function ( innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength ) {
    THREE.Geometry.call( this );

    this.type = 'XRingGeometry';

    this.parameters = {
      innerRadius: innerRadius,
      outerRadius: outerRadius,
      thetaSegments: thetaSegments,
      phiSegments: phiSegments,
      thetaStart: thetaStart,
      thetaLength: thetaLength
    };

    innerRadius = innerRadius || 0;
    outerRadius = outerRadius || 50;

    thetaStart = thetaStart !== undefined ? thetaStart : 0;
    thetaLength = thetaLength !== undefined ? thetaLength : Math.PI * 2;

    thetaSegments = thetaSegments !== undefined ? Math.max( 3, thetaSegments ) : 8;
    phiSegments = phiSegments !== undefined ? Math.max( 1, phiSegments ) : 8;

    var i, o, uvs = [], radius = innerRadius, radiusStep = ( ( outerRadius - innerRadius ) / phiSegments );

    for ( i = 0; i < phiSegments + 1; i ++ ) { // concentric circles inside ring

      for ( o = 0; o < thetaSegments + 1; o ++ ) { // number of segments per circle

        var vertex = new THREE.Vector3();
        var segment = thetaStart + o / thetaSegments * thetaLength;
        vertex.x = radius * Math.cos( segment );
        vertex.z = radius * Math.sin( segment );

        this.vertices.push( vertex );
        // uvs.push( new THREE.Vector2( ( vertex.x / outerRadius + 1 ) / 2, ( vertex.y / outerRadius + 1 ) / 2 ) );
        uvs.push( new THREE.Vector2( o / thetaSegments, i / phiSegments ) );
      }

      radius += radiusStep;

    }

    var n = new THREE.Vector3( 1, 0, 0 );

    for ( i = 0; i < phiSegments; i ++ ) { // concentric circles inside ring

      var thetaSegment = i * (thetaSegments + 1);

      for ( o = 0; o < thetaSegments ; o ++ ) { // number of segments per circle

        var segment = o + thetaSegment;

        var v1 = segment;
        var v2 = segment + thetaSegments + 1;
        var v3 = segment + thetaSegments + 2;

        this.faces.push( new THREE.Face3( v1, v2, v3, [ n.clone(), n.clone(), n.clone() ] ) );
        this.faceVertexUvs[ 0 ].push( [ uvs[ v1 ].clone(), uvs[ v2 ].clone(), uvs[ v3 ].clone() ]);

        v1 = segment;
        v2 = segment + thetaSegments + 2;
        v3 = segment + 1;

        this.faces.push( new THREE.Face3( v1, v2, v3, [ n.clone(), n.clone(), n.clone() ] ) );
        this.faceVertexUvs[ 0 ].push( [ uvs[ v1 ].clone(), uvs[ v2 ].clone(), uvs[ v3 ].clone() ]);

      }
    }

    this.computeFaceNormals();

    this.boundingSphere = new THREE.Sphere(new THREE.Vector3(), outerRadius);
//    this.boundingSphere = new THREE.Sphere( new THREE.Vector3(), radius );
  };

  THREE.XRingGeometry.prototype = Object.create( THREE.Geometry.prototype );
  THREE.XRingGeometry.prototype.constructor = THREE.XRingGeometry;
}

function getCircularText(text, diameter, startAngle, align, textInside, inwardFacing, fName, fSize, kerning) {
    // text:         The text to be displayed in circular fashion
    // diameter:     The diameter of the circle around which the text will
    //               be displayed (inside or outside)
    // startAngle:   In degrees, Where the text will be shown. 0 degrees
    //               if the top of the circle
    // align:        Positions text to left right or center of startAngle
    // textInside:   true to show inside the diameter. False to show outside
    // inwardFacing: true for base of text facing inward. false for outward
    // fName:        name of font family. Make sure it is loaded
    // fSize:        size of font family. Don't forget to include units
    // kearning:     0 for normal gap between letters. positive or
    //               negative number to expand/compact gap in pixels
 //------------------------------------------------------------------------

    // declare and intialize canvas, reference, and useful variables
    align = align.toLowerCase();
    var mainCanvas = document.createElement('canvas');
    var ctxRef = mainCanvas.getContext('2d');
    var clockwise = align == "right" ? 1 : -1; // draw clockwise for aligned right. Else Anticlockwise
    startAngle = startAngle * (Math.PI / 180); // convert to radians

    // calculate height of the font. Many ways to do this
    // you can replace with your own!
    var div = document.createElement("div");
    div.innerHTML = text;
    div.style.position = 'absolute';
    div.style.top = '-10000px';
    div.style.left = '-10000px';
    div.style.fontFamily = fName;
    div.style.fontSize = fSize;
    document.body.appendChild(div);
    var textHeight = div.offsetHeight;
    document.body.removeChild(div);
    
    // in cases where we are drawing outside diameter,
    // expand diameter to handle it
    if (!textInside) diameter += textHeight * 2;

    mainCanvas.width = diameter;
    mainCanvas.height = diameter;
    // omit next line for transparent background
    //mainCanvas.style.backgroundColor = 'lightgray'; 
    ctxRef.fillStyle = 'grey';
    ctxRef.font = fSize + ' ' + fName;
    
    // Reverse letters for align Left inward, align right outward 
    // and align center inward.
    if (((["left", "center"].indexOf(align) > -1) && inwardFacing) || (align == "right" && !inwardFacing)) text = text.split("").reverse().join(""); 
    
    // Setup letters and positioning
    ctxRef.translate(diameter / 2, diameter / 2); // Move to center
    startAngle += (Math.PI * !inwardFacing); // Rotate 180 if outward
    ctxRef.textBaseline = 'middle'; // Ensure we draw in exact center
    ctxRef.textAlign = 'center'; // Ensure we draw in exact center

    // rotate 50% of total angle for center alignment
    if (align == "center") {
        for (var j = 0; j < text.length; j++) {
            var charWid = ctxRef.measureText(text[j]).width;
            startAngle += ((charWid + (j == text.length-1 ? 0 : kerning)) / (diameter / 2 - textHeight)) / 2 * -clockwise;
        }
    }

    // Phew... now rotate into final start position
    ctxRef.rotate(startAngle);

    // Now for the fun bit: draw, rotate, and repeat
    for (var j = 0; j < text.length; j++) {
        var charWid = ctxRef.measureText(text[j]).width; // half letter
        // rotate half letter
        ctxRef.rotate((charWid/2) / (diameter / 2 - textHeight) * clockwise); 
        // draw the character at "top" or "bottom" 
        // depending on inward or outward facing
        ctxRef.fillText(text[j], 0, (inwardFacing ? 1 : -1) * (0 - diameter / 2 + textHeight / 2));

        ctxRef.rotate((charWid/2 + kerning) / (diameter / 2 - textHeight) * clockwise); // rotate half letter
    }

    // Return it
    return (mainCanvas);
}

 function colorTemperature2rgb(kelvin) {

  var temperature = kelvin / 100.0;
  var red, green, blue;

  if (temperature < 66.0) {
    red = 255;
  } else {
    // a + b x + c Log[x] /.
    // {a -> 351.97690566805693`,
    // b -> 0.114206453784165`,
    // c -> -40.25366309332127
    //x -> (kelvin/100) - 55}
    red = temperature - 55.0;
    red = 351.97690566805693+ 0.114206453784165 * red - 40.25366309332127 * Math.log(red);
    if (red < 0) red = 0;
    if (red > 255) red = 255;
  }

  /* Calculate green */

  if (temperature < 66.0) {

    // a + b x + c Log[x] /.
    // {a -> -155.25485562709179`,
    // b -> -0.44596950469579133`,
    // c -> 104.49216199393888`,
    // x -> (kelvin/100) - 2}
    green = temperature - 2;
    green = -155.25485562709179 - 0.44596950469579133 * green + 104.49216199393888 * Math.log(green);
    if (green < 0) green = 0;
    if (green > 255) green = 255;

  } else {

    // a + b x + c Log[x] /.
    // {a -> 325.4494125711974`,
    // b -> 0.07943456536662342`,
    // c -> -28.0852963507957`,
    // x -> (kelvin/100) - 50}
    green = temperature - 50.0;
    green = 325.4494125711974 + 0.07943456536662342 * green - 28.0852963507957 * Math.log(green);
    if (green < 0) green = 0;
    if (green > 255) green = 255;

  }

  /* Calculate blue */

  if (temperature >= 66.0) {
    blue = 255;
  } else {

    if (temperature <= 20.0) {
      blue = 0;
    } else {

      // a + b x + c Log[x] /.
      // {a -> -254.76935184120902`,
      // b -> 0.8274096064007395`,
      // c -> 115.67994401066147`,
      // x -> kelvin/100 - 10}
      blue = temperature - 10;
      blue = -254.76935184120902 + 0.8274096064007395 * blue + 115.67994401066147 * Math.log(blue);
      if (blue < 0) blue = 0;
      if (blue > 255) blue = 255;
    }
  }
  //  return {red: Math.round(red), blue: Math.round(blue), green: Math.round(green)};

   //const white = new THREE.Color('rgb(255,255,255)');
  return 'rgb(' + Math.round(red) + ',' + Math.round(green) + ',' + Math.round(blue) + ')'; 
}