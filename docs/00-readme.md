# Holistic Universe Model - Documentation

Welcome to the technical documentation for the Holistic Universe Model 3D Solar System Simulation.

## About This Documentation

This documentation is **self-contained** - you can understand the model and use the simulation by reading these documents alone. For deeper exploration, the [Holistic Universe website](https://holisticuniverse.com) provides additional information covering the complete scientific background.

## Reading Order

### Getting Started (Start Here)

| Document | Description |
|----------|-------------|
| [01 - Introduction](01-introduction.md) | What is the Holistic Universe Model? Core concepts, the two forces, the Holistic-Year |
| [02 - User Guide](02-user-guide.md) | How to use the 3D simulation - controls, panels, features |
| [03 - Glossary](03-glossary.md) | Essential terms and definitions |

### Conceptual Overview

| Document | Description |
|----------|-------------|
| [04 - Dynamic Elements Overview](04-dynamic-elements-overview.md) | How orbital elements change over time |
| [05 - Invariable Plane Overview](05-invariable-plane-overview.md) | The invariable plane extension (Souami & Souchay work) |
| [06 - Scene Graph Hierarchy](06-scene-graph-hierarchy.md) | Three.js nested rotation layers - how the model works |
| [07 - Verification Data Reference](07-verification-data-reference.md) | Astronomical verification data: transits, oppositions, conjunctions |

### Technical Reference - Constants & Formulas

| Document | Description |
|----------|-------------|
| [10 - Constants Reference](10-constants-reference.md) | All constants: Souami & Souchay values, precession periods, orbital parameters |
| [11 - Orbital Formulas Reference](11-orbital-formulas-reference.md) | Formula implementations and the OrbitalFormulas helper |

### Technical Reference - Calculations

| Document | Description |
|----------|-------------|
| [12 - Anomaly Calculations](12-anomaly-calculations.md) | Mean, True, and Eccentric Anomaly calculations |
| [13 - Perihelion Precession](13-perihelion-precession.md) | Perihelion longitude and precession rate calculations |
| [14 - Ascending Node Calculations](14-ascending-node-calculations.md) | Ascending node precession on ecliptic and invariable plane |
| [15 - Inclination Calculations](15-inclination-calculations.md) | Inclination oscillations and ecliptic inclination |
| [16 - Invariable Plane Calculations](16-invariable-plane-calculations.md) | Height above/below invariable plane, plane crossings |
| [17 - Mercury Precession Breakdown](17-mercury-precession-breakdown.md) | Mercury's perihelion precession by contributing planet |
| [18 - J2000 Calibration](18-j2000-calibration.md) | J2000-verified ascending nodes methodology |
| [19 - Coordinate Frames](19-coordinate-frames.md) | ICRF, ecliptic, equatorial, and invariable plane transformations |

### Research & Derivations

| Document | Description |
|----------|-------------|
| [26 - Fibonacci Laws of Planetary Motion](26-fibonacci-laws.md) | Fibonacci-derived inclination amplitudes with invariable plane balance condition |

### Developer Reference

| Document | Description |
|----------|-------------|
| [20 - Architecture](20-architecture.md) | Code structure and organization |
| [21 - Planet Inspector Reference](21-planet-inspector-reference.md) | Planet inspector panel implementation |
| [22 - UI Panels Reference](22-ui-panels-reference.md) | UI panel implementations |
| [23 - Data Export Reference](23-data-export-reference.md) | Report generation and data export systems |
| [24 - Analysis & Export Tools](24-analysis-export-tools.md) | Analysis tools and export functionality in the Settings panel |

### Appendices - Verification & Optimization Scripts

| Appendix | Description |
|----------|-------------|
| [Appendix A - Ascending Node Optimization](appendix-a-ascending-node-optimization.js) | Numerical optimization to calculate ascending node values |
| [Appendix B - Analytical Ascending Nodes](appendix-b-analytical-ascending-nodes.js) | Analytical (closed-form) calculation of ascending nodes |
| [Appendix C - Ascending Node Verification](appendix-c-ascending-node-verification.js) | Verifies J2000-verified ascending nodes produce correct ecliptic inclinations |
| [Appendix D - Ascending Node Comparison](appendix-d-ascending-node-souami-souchay.js) | Compares S&S original vs Verified ascending node accuracy |
| [Appendix E - Inclination Computation](appendix-e-inclination-optimization.js) | Computes Fibonacci-derived inclination amplitudes and means with balance verification |
| [Appendix F - Inclination Verification](appendix-f-inclination-verification.js) | Verifies inclination parameters against J2000 and JPL trends |
| [Appendix G - Mercury Precession](appendix-g-mercury-precession-centuries.js) | Mercury perihelion precession analysis by century |
| [Appendix H - Holistic Year Objects Data](appendix-h-holistic-year-objects-data.xlsx) | Excel export of planetary positions and orbital elements spanning one complete Holistic Year (333,888 years) |
| [Appendix I - Length of Day& Year Formulas](appendix-i-length-day-year-formulas.md) | Tropical year and day length analysis: measurement methods, validation results, proposed formulas |
| [Appendix J - Holistic Year Analysis Data](appendix-j-holistic-year-analysis.xlsx) | Excel export of 64 points in time for year analysis spanning one complete Holistic Year (333,888 years) |


**Note on Appendix A vs B**: Both calculate the same ascending node values using different methods:
- **Appendix A** uses brute-force numerical optimization
- **Appendix B** uses analytical spherical trigonometry: `cos(ΔΩ) = [cos(i_ecl) - cos(i_p)·cos(i_e)] / [sin(i_p)·sin(i_e)]`

Both produce identical results, proving the geometric validity of the approach.

---

## Quick Links

- **3D Simulation**: https://3d.holisticuniverse.com
- **Data Portal**: https://data.holisticuniverse.com
- **Full Documentation**: https://holisticuniverse.com

## Key Concepts at a Glance

| Concept | Value | Description |
|---------|-------|-------------|
| Holistic-Year | 333,888 years | Complete cycle unifying all precession movements |
| Axial Precession | ~25,684 years | Earth's wobble around EARTH-WOBBLE-CENTER |
| Inclination Precession | ~111,296 years | PERIHELION-OF-EARTH orbit period |
| Perihelion Precession | 20,868 years | Combined cycle (axial + inclination meeting) |
| Mean Obliquity | 23.41398° | Earth's mean axial tilt |
| Obliquity Range | 22.15° - 24.68° | Earth's tilt oscillation range |
| Mean Inclination | 1.481592° | Earth's mean orbital inclination to invariable plane |

## Further Reading

For the complete scientific background, visit the [Holistic Universe website](https://www.holisticuniverse.com/en):

- [How it Works](https://www.holisticuniverse.com/en/model/how-it-works) - The model explained
- [Precession](https://www.holisticuniverse.com/en/model/precession) - Axial, inclination, and perihelion precession
- [Full Glossary](https://www.holisticuniverse.com/en/reference/glossary) - Terms defined
