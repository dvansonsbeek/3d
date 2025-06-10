# 🌌 Solar System Simulation build in three js

![ss](https://www.holisticuniverse.com/img/14_predicted_Year2058AD.png)

NO AI TRAINING on this Interactive 3D Solar System Simulation of the Holistic Universe Model unless explicitly authorized by D. van Sonsbeek.

Without in any way limiting the author’s [and publisher’s] exclusive rights under copyright, any use of this publication to “train” generative artificial intelligence (AI) technologies to generate text is expressly prohibited.
The author reserves all rights to license usage of this work for generative AI training and development of machine learning language models.

============

The Interactive 3D Solar System Simulation shows the precession / eccentricity / inclination / obliquity / perihelion date movements of Earth, Moon, Sun and Planets modelled from a geo-heliocentric frame of reference, coming together in a Holistic-Year cycle of 297,824 years, an Axial precession cycle of ~22,910 years, an Inclination precession cycle of ~99,275 years and a Perihelion precession cycle of 18,614 years. 

The way it is modelled:
* The EARTH-WOBBLE-CENTER is the center of our solar system.
* Earth is wobbling clockwise around the EARTH-WOBBLE-CENTER in a period of ~22,910 solar years, also known as Axial precession and therefore the Axial tilt changes.
* The PERIHELION-OF-EARTH is orbiting the EARTH-WOBBLE-CENTER - and therefore Earth - counter-clockwise in a period of ~99,275 solar years, also known as Inclination precession and therefore the inclination tilt changes.
* Axial precession meets Inclination precession every 18,614 years.
* Our Sun is orbiting the PERIHELION-OF-EARTH in a period of 1 solar year.
* Therefore it shows as if the Sun is orbiting Earth.

How you could also see it:
* The PERIHELION-OF-EARTH is the center of our solar system.
* Earth is wobbling clockwise around the EARTH-WOBBLE-CENTER in a period of ~22,910 solar years, also known as Axial precession and therefore the Axial tilt changes.
* The EARTH-WOBBLE-CENTER - and therefore Earth - is orbiting the PERIHELION-OF-EARTH counter-clockwise in a period of ~99,275 solar years, also known as Inclination precession and therefore the inclination tilt changes.
* Axial precession meets Inclination precession every 18,614 years.
* Our Sun is orbiting the PERIHELION-OF-EARTH in a period of 1 solar year.
* Therefore it shows as if the Sun is orbiting Earth.

What is actually happening:
* The Sun is (still) the center of our solar system.
* Earth is wobbling clockwise around the EARTH-WOBBLE-CENTER in a period of ~22,910 solar years, also known as Axial precession and therefore the Axial tilt changes.
* The PERIHELION-OF-EARTH is orbiting the Sun counter-clockwise in a period of ~99,275 solar years, also known as Inclination precession and therefore the inclination tilt changes.
* Axial precession meets Inclination precession every 18,614 years.
* Earth is orbiting the PERIHELION-OF-EARTH - close to the Sun - in a period of 1 solar year.
* Therefore it shows Earth is actually orbiting the Sun.
* So we still live in a Heliocentric solar system

* All planets in our solar system are orbiting the Sun but have a barycenter just outside of the Sun.
* The location of the barycenters of the planets are structured according to the Golden Spiral pattern around the Sun and the planets are orbiting these barycenters according to Kepler’s 3rd law.

Additional explanation to understand the model:
* The inclination (J2000 value ~1.57869°) and axial tilt together result in the obliquity of Earth’s axis (J2000 value +23°26'21").
* There are only two counter movements around Earth working against each other in a ratio of 3:13 ; Inclination:Axial which explains all movements around Earth (precession, eccentricity, obliquity, inclination, etc)
* The currently experienced precession is NOT the mean value and all precession movements are always experienced in the same ratio (e.g. experienced perihelion precession is 13/16th of Axial precession: ~25,771*13/16 = ~20,939 years)
* The Perihelion precession cycle of 18,614 years determines the natural cycles of the length of solar days, sidereal days, solar years, sidereal years and anomalistic years.
* The EARTH-WOBBLE-CENTER was aligned in 1246 AD with the PERIHELION-OF-EARTH and therefore the length of solar year in days and the length of sidereal year in seconds were MEAN in 1246 AD.
* The difference between the sidereal day - stellar day leads to the difference solar year – sidereal year.

For more details see https://holisticuniverse.com.

Why is the length of the Holistic-Year 297,824 years? This number fits all observations best:
1. Historic value longitude of perihelion 90°: 1245-12-14
2. Current (J2000) value longitude of perihelion: 6h51m47s = ~102.945°
3. The Length of solar day, solar year in days, sidereal year in seconds aligned to 3D longitude values and historic values  
a) 1246 Length of solar day in days was - according to the current theory - ~365.242236 days (which is ~31,556,929.19 SI seconds in Ephemeris time).  
b) 1246 Length of sidereal year in SI seconds was - according to the current theory - ~31,558,149.6847  
c) 1246 Length of solar day was above 86,400 SI seconds because of historic Delta T predictions.  
4. Climate graphs with ~100k cycles as a cycle of ~99,275 years (three times ~99,275 years = 297,824 years)
5. End of Last Glacial Maximum (LGM) around 21,000 BC and end of Younger dryes around 9800 BC. 
6. Mercury perihelion precession aligned to ~5600 arc seconds per century - THE KEY EVIDENCE OF THE MODEL
7. Obliquity correct both historic and current values
8. Orbital Inclination to ICRF correct both historic and current values
9. Eccentricity correct both historic and current values

Technical: 

Build in Three js R175.

It's an interactive 3D visualization where the browser renders a miniature model of the solar system using three.js — a JavaScript library that simplifies working with WebGL. The project typically features:
- A central sun: A bright, glowing sphere, possibly using a texture and some light emission effects.
- Orbiting planets: Each planet is a textured sphere with individual rotation (spinning) and revolution (orbiting) animations.
- Orbit paths: Visualized with faint circles or lines showing the paths of the planets.
- Lighting: A combination of ambient and point lights to simulate how the sun lights up the planets.
- Camera controls: Using something like OrbitControls to let the user zoom, pan, and rotate around the system.
- Scaling: Distances are to scale but sizes of the planets are not to scale because realistic proportions would make some planets almost invisible or too far apart.
- Extras: You might see moons orbiting planets, rings around Saturn, zodiac positions, polar axis line,constellation or even starfield backgrounds to make it more immersive.

At a basic level, it's like building a tiny universe in the browser, where JavaScript, math (especially trigonometry), and 3D graphics all work together.

## ✅ Core Architecture

- **Supports:**  
  - Planet tilts and custom orbit inclinations  
  - Optional ring textures  
  - Emissive + textured planets  
  - Non-planet objects (barycenters, cycles) using `MeshBasicMaterial`
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
- **Trace objects (e.g., Barycenter):**  
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

- **Focus ring:** Shown around Sun’s barycenter when Sun is selected
- **Sun glow:** Dynamically scaled by camera distance
- **Name tags and constellations:** Fading and scaling based on camera distance
- **DOM overlay label:** Follows selected planet on screen

---

## 🧠 UI Logic

- `dat.GUI` panel bound to visibility states like:
  - Zodiac glow toggle

---

## ✅ Suggestions for Next Steps

- 🌑 Technical improvements (can we prevent the camera swings when looking at the sun?)
- 🌟 Visual improvements
- 🖼 Export frames for video or screenshots
- 🕶 Integrate with `WebXR` for VR solar system flythrough

## Contact

For questions or support, please contact me at [info@holisticuniverse.com].
