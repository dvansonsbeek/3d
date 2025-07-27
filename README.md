# 🌌 Solar System Simulation built in three js

![ss](https://raw.githubusercontent.com/dvansonsbeek/3d/master/public/readme.png)

NO AI TRAINING on this Interactive 3D Solar System Simulation of the Holistic Universe Model unless explicitly authorized by D. van Sonsbeek.

Without in any way limiting the author’s [and publisher’s] exclusive rights under copyright, any use of this publication to “train” generative artificial intelligence (AI) technologies to generate text is expressly prohibited.
The author reserves all rights to license usage of this work for generative AI training and development of machine learning language models.

============

The Interactive 3D Solar System Simulation shows the precession / eccentricity / inclination / obliquity / perihelion date movements of Earth, Moon, Sun and Planets modelled from a geo-heliocentric frame of reference, coming together in a Holistic-Year cycle of 298,176 years, an Axial precession cycle of ~22,937 years, an Inclination precession cycle of 99,392 years and a Perihelion precession cycle of 18,636 years. 

The way it is modelled:
* The EARTH-WOBBLE-CENTER is the center of our solar system.
* Earth is wobbling clockwise around the EARTH-WOBBLE-CENTER in a period of ~22,937 solar years, also known as Axial precession and therefore the Axial tilt changes.
* The PERIHELION-OF-EARTH is orbiting the EARTH-WOBBLE-CENTER - and therefore Earth - counter-clockwise in a period of 99,392 solar years, also known as Inclination precession and therefore the inclination tilt changes.
* Axial precession meets Inclination precession every 18,636 years.
* Our Sun is orbiting the PERIHELION-OF-EARTH in a period of 1 solar year.
* Therefore it shows as if the Sun is orbiting Earth.

What is actually happening:
* The Sun is (still) the center of our solar system.
* Earth is wobbling clockwise around the EARTH-WOBBLE-CENTER in a period of ~22,937 solar years, also known as Axial precession and therefore the Axial tilt changes.
* The PERIHELION-OF-EARTH is wobbling around the Sun counter-clockwise in a period of 99,392 solar years, also known as Inclination precession and therefore the inclination tilt changes.
* Axial precession meets Inclination precession every 18,636 years.
* Earth is orbiting the PERIHELION-OF-EARTH - close to the Sun - in a period of 1 solar year.
* Therefore it shows Earth is actually orbiting the Sun.
* So we still live in a Heliocentric solar system
* All planets in our solar system are orbiting their perihelion-point according to Kepler’s 3rd law.

Additional explanation to understand the model:
* The inclination (J2000 value ~1.57869°) and axial tilt together result in the obliquity of Earth’s axis (J2000 value +23°26'21").
* There are only two counter movements around Earth working against each other in a ratio of 3:13 ; Inclination:Axial which explains all movements around Earth (precession, eccentricity, obliquity, inclination, etc)
* The currently experienced precession is NOT the mean value and all precession movements are always experienced in the same ratio (e.g. experienced perihelion precession is 13/16th of Axial precession: ~25,771*13/16 = ~20,939 years)
* The Perihelion precession cycle of 18,636 years determines the natural cycles of the length of solar days, sidereal days, solar years, sidereal years and anomalistic years.
* The EARTH-WOBBLE-CENTER was aligned in 1246 AD with the PERIHELION-OF-EARTH and therefore the length of solar year in days and the length of sidereal year in seconds were MEAN in 1246 AD.
* The difference between the sidereal day - stellar day leads to the difference solar year – sidereal year.

For more details see https://holisticuniverse.com.

Why is the length of the Holistic-Year 298,176 years? This number fits all observations best:
1. Historic value longitude of perihelion 90°: 1245-12-14
2. J2000 value longitude of perihelion: 6h51m47s = ~102.947°
3. The Length of solar day, solar year in days, sidereal year in seconds aligned to 3D longitude values and historic values  
a) 1246 Length of solar day in SI seconds was - fully aligned with the current theory - ~31,556,929.19 SI seconds.  
b) 1246 Length of sidereal year in SI seconds was - fully aligned with the current theory - ~31,558,149.6847 SI seconds.  
c) 1246 Length of solar day was ~86,399.9913 SI seconds because of historic Delta T predictions (Delta-T was greater in the past).  
4. Climate graphs with ~100k cycles as a cycle of 99,392 years (three times 99,392 years = 298,176 years)
5. End of Last Glacial Maximum (LGM) around 21,000 BC and end of Younger dryes around 9800 BC. 
6. Mercury perihelion precession aligned to ~5600 arc seconds per century - THE KEY EVIDENCE OF THE MODEL
7. Ratio Earth to EARTH-WOBBLE-CENTER compared to Earth to the Sun (~324.5) explains the difference sidereal day - stellar day leads to the difference solar year - sidereal year (~324.5/13*16 = ~399.3) - THE KEY EVIDENCE OF THE MODEL
8. Difference stellar day and sidereal day exactly according to theory (86164.0989036905-86164.0905308328)*1000 = 8.37286 ms - THE KEY EVIDENCE OF THE MODEL
9. Obliquity correct both historic and current values
10. Orbital Inclination to ICRF correct both historic and current values
11. Eccentricity correct both historic and current values

It's an interactive 3D visualization where the browser renders a miniature model of the solar system using three.js — a JavaScript library that simplifies working with WebGL. The project typically features:
- A central sun: A bright, glowing sphere, possibly using a texture and some light emission effects.
- Orbiting planets: Each planet is a textured sphere with individual rotation (spinning) and revolution (orbiting) animations.
- Orbit paths: Visualized with faint circles or lines showing the paths of the planets.
- Lighting: A combination of ambient and point lights to simulate how the sun lights up the planets.
- Camera controls: Using something like OrbitControls to let the user zoom, pan, and rotate around the system.
- Scaling: Distances are to scale but sizes of the planets are not to scale because realistic proportions would make some planets almost invisible or too far apart.
- Extras: You might see moons orbiting planets, rings around Saturn, zodiac positions, polar axis line,constellation or even starfield backgrounds to make it more immersive.

At a basic level, it's like building a tiny universe in the browser, where JavaScript, math (especially trigonometry), and 3D graphics all work together.

## 🕶 Startdate model

- The startdate is set to 21-06-2000 12:00 UTC because:
  - Close to actual June solstice (01:47 AM in the morning of 21 June)
  - Earth axis is Pointing (close) to Polaris
  - Close to J2000 values so we can check and compare all values

---

## ✅ Core Architecture

- **Supports:**  
  - Planet tilts and custom orbit inclinations  
  - Optional ring textures  
  - Emissive + textured planets  
  - Non-planet objects (perihelion, cycles) using `MeshBasicMaterial`
  - Starfield background and constellations

---

## 🔦 Lighting & Shadows

- **Primary light:** `DirectionalLight` simulating the Sun
- **Dynamic shadow frustum:** Updated based on focused planet
- **Fallback `PointLight`:** Used when the Sun itself is selected (ensures visibility)
- **Shadows:** Enabled only for true planets (not trace objects)

---

## 🌈 Materials

- **Planets:** `MeshPhongMaterial` with bump, specular, and emissive options
- **Trace objects**  
  `MeshBasicMaterial`  
  with optional dimmed texture (`color: 0x888888`) or fallback color

---

## 🛰️ Scene Structure

Each planet is structured like this:
- `orbitContainer` → holds full orbit structure
- `orbit` → holds orbit visuals and pivot
- `pivotObj` → origin point offset to simulate eccentricity
- `rotationAxis` → applies axial tilt
- `planetMesh` → spherical geometry, holds material
- `ringObj` (optional) → Saturn-style rings
- `axisHelperObj` (optional) → debugging aid

---

## 🎯 Camera and Focus System

- Focused object stored in `o.lookAtObj`
- Camera `controls.target` updates each frame to follow focus
- Light and ring center dynamically update with the focused object
- Default focus on Earth

---

## ✨ Visual Effects

- **Focus ring:** Shown around Earth when Sun is selected
- **Sun glow:** Dynamically scaled by camera distance
- **Name tags and constellations:** Fading and scaling based on camera distance
- **DOM overlay label:** Follows selected planet on screen

---

## 🧠 UI Logic

- `dat.GUI` panel bound to visibility states like:
  - Zodiac glow toggle

---

## 🌟 Export function

- Solstice dates and objects positions can be exported

---

## 🖼 Suggestions for additional features

- When selecting another planet/ Sun, the stars & constellations also need to move to the "look at" point to prevent the camera is swinging around.
- Show visible orbit of Earth around the Sun when Sun is selected as "look at".
- Show the constellation the planet is in (based upon the RA values).
- Create 100% correct formulas for:
  - Obliquity
  - Mid-eccentricity
  - Longitude of perihelion
  - Solstice date (now J. Meeus formula)
- Add an easter egg when reaching an perihelion 0 date (eg 14-12-1245)
- Integrate with `WebXR` for VR solar system flythrough

---

## 🌑 Order to get to the 100% correct 3D-model

- Do we need to add eccentric orbit for the Sun to also the September/ March equinox and December solstice times are 100% correct (now only June solstice is 100% correct)
- Agree the Sun's orbit seems correct (e.g. does the movement of earth around the EARTH-WOBBLE-CENTER also need an eliptic orbit?)
- Add the correct orbits for the Moon
- Add the correct orbits for all planets
  - Why Mercury and Venus can be added at 90 degrees ascending node?
  - Planet movements can be added more accurately

---

## ✅ Contact

For questions about the model / you want to help developing this model further, please contact me at [info@holisticuniverse.com].
