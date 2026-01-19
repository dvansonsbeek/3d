# Glossary of Essential Terms

This glossary defines the key terms used throughout the documentation. For a complete glossary, see the [website glossary](https://www.holisticuniverse.com/en/reference/glossary).

---

## Core Model Concepts

### Holistic Universe Model
A geo-heliocentric framework that models the solar system through two interacting forces: axial precession (clockwise) and inclination precession (counter-clockwise). These opposing movements generate all observable precession phenomena.

### Holistic-Year
The 333,888-year grand cycle where all precession movements complete and realign. Comprises 13 axial precession cycles, 3 inclination precession cycles, and 16 perihelion precession cycles.

### EARTH-WOBBLE-CENTER
A gravitational control point around which Earth's axis wobbles over approximately 25,684 years. This creates the precession of the equinoxes. Visualized as "The Death Star" in the simulation.

### PERIHELION-OF-EARTH
A gravitational control point that determines Earth's closest approach to the Sun. It orbits counter-clockwise around the EARTH-WOBBLE-CENTER in approximately 111,296 years. Appears as a white dot in the simulation.

### Geo-heliocentric
A reference frame that is heliocentric (Earth orbits the Sun) but viewed from Earth's perspective. Produces identical predictions to standard heliocentric models.

---

## Precession Types

### Axial Precession
The slow wobble of Earth's rotational axis, causing the celestial poles to trace circles against the stars. Period: approximately 25,684 years in the Holistic Model.

### Inclination Precession
The slow rotation of PERIHELION-OF-EARTH around the EARTH-WOBBLE-CENTER. Period: approximately 111,296 years. Causes Earth's orbital plane to tilt relative to the invariable plane.

### Perihelion Precession
The advancement of the perihelion point (closest approach to Sun) through the zodiac. Period: 20,868 years. Results from the interaction of axial and inclination precession.

### Nodal Precession
The westward drift of orbital nodes (where an orbit crosses a reference plane). For the Moon, this takes approximately 18.6 years.

### Apsidal Precession
The rotation of an orbit's line of apsides (the line connecting perihelion and aphelion). For the Moon, this takes approximately 8.85 years.

---

## Orbital Elements

### Semi-major Axis (a)
Half the longest diameter of an elliptical orbit. Determines the orbit's size and, via Kepler's third law, the orbital period.

### Eccentricity (e)
A measure of how elliptical an orbit is. Range: 0 (perfect circle) to 1 (parabola). Earth's mean eccentricity is 0.015313.

### Inclination (i)
The angle between an orbital plane and a reference plane (usually the ecliptic or invariable plane). Measured in degrees.

### Ascending Node (Ω)
The point where an orbiting body crosses the reference plane moving from south to north. The longitude of this point is a key orbital element.

### Descending Node
The point where an orbiting body crosses the reference plane moving from north to south. Located 180° from the ascending node.

### Argument of Periapsis (ω)
The angle from the ascending node to the perihelion point, measured in the orbital plane. Also called argument of perihelion for solar orbits.

### Longitude of Perihelion (ϖ)
The sum of the ascending node longitude and argument of periapsis: ϖ = Ω + ω. Measures the perihelion direction from the vernal equinox.

### Mean Anomaly (M)
The fraction of the orbital period that has elapsed since perihelion, expressed as an angle. Increases uniformly with time.

### True Anomaly (ν)
The actual angle between the perihelion direction and the current position of the body, as seen from the Sun. Varies non-uniformly due to orbital eccentricity.

### Eccentric Anomaly (E)
An auxiliary angle used to solve Kepler's equation. Relates Mean Anomaly to True Anomaly through the orbit's eccentricity.

---

## Reference Frames

### Ecliptic
The plane of Earth's orbit around the Sun. Used as the primary reference plane for solar system coordinates. The ecliptic slowly precesses relative to fixed stars.

### Invariable Plane
The plane perpendicular to the total angular momentum vector of the solar system. Unlike the ecliptic, this plane is truly fixed in space. The model uses this as a fundamental reference.

### ICRF (International Celestial Reference Frame)
A quasi-inertial reference frame based on the positions of distant quasars. The most stable reference frame available, essentially "fixed stars."

### J2000
The standard astronomical epoch: January 1, 2000, 12:00 TT (Terrestrial Time). Orbital elements are often given for this epoch.

### Heliocentric
A coordinate system centered on the Sun.

### Geocentric
A coordinate system centered on Earth.

---

## Time Measurements

### Solar Year (Tropical Year)
The time for the Sun to return to the same position relative to the vernal equinox. Approximately 365.2422 days. This is the year of the seasons.

### Sidereal Year
The time for the Sun to return to the same position relative to the fixed stars. Approximately 365.2564 days. About 20 minutes longer than the solar year due to precession.

### Anomalistic Year
The time between successive perihelion passages. Approximately 365.2596 days.

### Julian Day (JD)
A continuous count of days since January 1, 4713 BC. Used in astronomy to avoid calendar complexities. J2000 = JD 2451545.0.

### Delta-T (ΔT)
The difference between Terrestrial Time (uniform atomic time) and Universal Time (based on Earth's rotation). ΔT varies because Earth's rotation is not constant.

---

## Position Measurements

### Right Ascension (RA)
The celestial equivalent of longitude. Measured in hours, minutes, and seconds eastward from the vernal equinox. Full circle = 24 hours.

### Declination (Dec)
The celestial equivalent of latitude. Measured in degrees north (+) or south (-) of the celestial equator. Range: -90° to +90°.

### Perihelion
The point in an orbit closest to the Sun. Earth reaches perihelion around January 3.

### Aphelion
The point in an orbit farthest from the Sun. Earth reaches aphelion around July 4.

### Obliquity
The angle between Earth's rotational axis and the perpendicular to its orbital plane. Currently about 23.44°, but oscillates between 22.15° and 24.68° over ~41,000 years.

---

## Scientific References

### Souami & Souchay (2012)
A scientific paper providing high-precision values for planetary orbital inclinations and ascending nodes relative to the invariable plane. Used extensively in this model's invariable plane calculations.

### Laplace-Lagrange Theory
A secular perturbation theory describing how planetary orbital elements oscillate over long timescales due to mutual gravitational interactions.

### Milankovitch Cycles
Long-term variations in Earth's orbital parameters (eccentricity, obliquity, precession) that affect climate. The Holistic Model provides a unified framework for these cycles.

---

## Formulas and Calculations

### Kepler's Equation
The fundamental equation relating Mean Anomaly to Eccentric Anomaly: M = E - e·sin(E). Must be solved iteratively.

### Vis-viva Equation
Calculates orbital velocity at any point: v = √(GM(2/r - 1/a)), where r is current distance and a is semi-major axis.

### Equation of Center
The difference between True Anomaly and Mean Anomaly (ν - M). Represents how much a body is ahead of or behind its mean position.

---

## Further Reading

For the complete glossary with detailed explanations, visit:
**[Holistic Universe Glossary](https://www.holisticuniverse.com/en/reference/glossary)**

---

**Previous**: [User Guide](02-user-guide.md) - How to use the simulation
**Next**: [Dynamic Elements Overview](04-dynamic-elements-overview.md) - How orbital elements change over time
