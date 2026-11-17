/** The 88 IAU constellations: abbreviation → name (the IAU's list). */
export const CONSTELLATION_NAMES: Readonly<{
    And: "Andromeda";
    Ant: "Antlia";
    Aps: "Apus";
    Aqr: "Aquarius";
    Aql: "Aquila";
    Ara: "Ara";
    Ari: "Aries";
    Aur: "Auriga";
    Boo: "Boötes";
    Cae: "Caelum";
    Cam: "Camelopardalis";
    Cnc: "Cancer";
    CVn: "Canes Venatici";
    CMa: "Canis Major";
    CMi: "Canis Minor";
    Cap: "Capricornus";
    Car: "Carina";
    Cas: "Cassiopeia";
    Cen: "Centaurus";
    Cep: "Cepheus";
    Cet: "Cetus";
    Cha: "Chamaeleon";
    Cir: "Circinus";
    Col: "Columba";
    Com: "Coma Berenices";
    CrA: "Corona Australis";
    CrB: "Corona Borealis";
    Crv: "Corvus";
    Crt: "Crater";
    Cru: "Crux";
    Cyg: "Cygnus";
    Del: "Delphinus";
    Dor: "Dorado";
    Dra: "Draco";
    Equ: "Equuleus";
    Eri: "Eridanus";
    For: "Fornax";
    Gem: "Gemini";
    Gru: "Grus";
    Her: "Hercules";
    Hor: "Horologium";
    Hya: "Hydra";
    Hyi: "Hydrus";
    Ind: "Indus";
    Lac: "Lacerta";
    Leo: "Leo";
    LMi: "Leo Minor";
    Lep: "Lepus";
    Lib: "Libra";
    Lup: "Lupus";
    Lyn: "Lynx";
    Lyr: "Lyra";
    Men: "Mensa";
    Mic: "Microscopium";
    Mon: "Monoceros";
    Mus: "Musca";
    Nor: "Norma";
    Oct: "Octans";
    Oph: "Ophiuchus";
    Ori: "Orion";
    Pav: "Pavo";
    Peg: "Pegasus";
    Per: "Perseus";
    Phe: "Phoenix";
    Pic: "Pictor";
    Psc: "Pisces";
    PsA: "Piscis Austrinus";
    Pup: "Puppis";
    Pyx: "Pyxis";
    Ret: "Reticulum";
    Sge: "Sagitta";
    Sgr: "Sagittarius";
    Sco: "Scorpius";
    Scl: "Sculptor";
    Sct: "Scutum";
    Ser: "Serpens";
    Sex: "Sextans";
    Tau: "Taurus";
    Tel: "Telescopium";
    Tri: "Triangulum";
    TrA: "Triangulum Australe";
    Tuc: "Tucana";
    UMa: "Ursa Major";
    UMi: "Ursa Minor";
    Vel: "Vela";
    Vir: "Virgo";
    Vol: "Volans";
    Vul: "Vulpecula";
}>;
/** The J2000 ecliptic in the equatorial J2000 frame: its pole from the IAU 2006 mean obliquity ε₀ = 84381.406″, its equinox the x axis. */
export const ECLIPTIC_J2000_EQUATORIAL: Readonly<{
    obliquityArcsec: 84381.406;
    pole: readonly number[];
    equinox: readonly number[];
}>;
/** B1875.0 as a Julian Date: JD(B) = 2415020.31352 + (B − 1900) × 365.242198781 (the Besselian year). */
export const JD_B1875: number;
/**
 * The IAU 1976 precession rotation from J2000 to a Julian date (Lieske et al. 1977, A&A 58, 1): P = R3(−z_A)·R2(θ_A)·R3(−ζ_A),
 * returned as a 3 × 3 matrix applied to an equatorial J2000 unit vector.
 * @param {number} jd
 * @returns {number[][]}
 */
export function precessionMatrixJ2000To(jd: number): number[][];
export const P_J2000_TO_B1875: number[][];
/**
 * Load (or set) Roman's box table.
 * @param {{boxes: Array<{raLowHours: number, raUpHours: number, decLowDeg: number, abbr: string}>}} doc
 */
export function setBoundaryTable(doc: {
    boxes: Array<{
        raLowHours: number;
        raUpHours: number;
        decLowDeg: number;
        abbr: string;
    }>;
}): void;
/**
 * The IAU name of an abbreviation (the abbreviation itself where unknown).
 * @param {string} abbr
 * @returns {string}
 */
export function constellationName(abbr: string): string;
/**
 * Roman's lookup in B1875 coordinates: the first box with Dec ≥ DE_low and RA_low ≤ RA < RA_up (RA in hours).
 * @param {number} raHoursB1875
 * @param {number} decDegB1875
 * @returns {string | null}  the IAU abbreviation
 */
export function constellationAtB1875(raHoursB1875: number, decDegB1875: number): string | null;
/**
 * The constellation of an equatorial J2000 unit vector.
 * @param {number[]} vJ2000
 * @returns {string | null}
 */
export function constellationOfVectorJ2000(vJ2000: number[]): string | null;
/**
 * The constellation of a J2000 right ascension and declination (degrees).
 * @param {number} raDeg
 * @param {number} decDeg
 * @returns {string | null}
 */
export function constellationAtJ2000(raDeg: number, decDeg: number): string | null;
/**
 * The ecliptic's own frame from its pole n̂ and equinox ê (equatorial J2000 unit vectors): x̂ = ê projected into the plane,
 * ŷ = n̂ × x̂ — ONE construction for the crossings, the gates and the referee record.
 * @param {number[]} poleJ2000
 * @param {number[]} equinoxJ2000
 * @returns {{n: number[], x: number[], y: number[]}}
 */
export function eclipticFrame(poleJ2000: number[], equinoxJ2000: number[]): {
    n: number[];
    x: number[];
    y: number[];
};
/**
 * The equatorial J2000 unit vector of a point at ecliptic longitude λ (degrees) on an ecliptic.
 * @param {{n: number[], x: number[], y: number[]}} f  from eclipticFrame
 * @param {number} lonDeg
 * @returns {number[]}
 */
export function eclipticPointJ2000(f: {
    n: number[];
    x: number[];
    y: number[];
}, lonDeg: number): number[];
/**
 * A J2000 unit vector's right ascension and declination (degrees, α in [0, 360)).
 * @param {number[]} v
 * @returns {{raDeg: number, decDeg: number}}
 */
export function raDecOfVector(v: number[]): {
    raDeg: number;
    decDeg: number;
};
/**
 * The constellations along an ecliptic given by its pole n̂ and equinox ê (equatorial J2000 unit vectors): the ordered
 * crossings — each the longitude (degrees from ê, counterclockwise about n̂) where the ecliptic ENTERS a constellation —
 * walked in stepDeg steps and bisected to tolDeg. The ecliptic's own frame: x̂ = ê, ŷ = n̂ × ê.
 * @param {number[]} poleJ2000
 * @param {number[]} equinoxJ2000
 * @param {{stepDeg?: number, tolDeg?: number}} [opt]
 * @returns {Array<{abbr: string, name: string, lonDeg: number}>}
 */
export function eclipticCrossings(poleJ2000: number[], equinoxJ2000: number[], opt?: {
    stepDeg?: number;
    tolDeg?: number;
}): Array<{
    abbr: string;
    name: string;
    lonDeg: number;
}>;
/**
 * The constellation a longitude falls in on a crossing list (the last crossing at or before it, wrapping).
 * @param {Array<{abbr: string, name: string, lonDeg: number}>} crossings
 * @param {number} lonDeg
 * @returns {{abbr: string, name: string, lonDeg: number}}
 */
export function constellationAtLongitude(crossings: Array<{
    abbr: string;
    name: string;
    lonDeg: number;
}>, lonDeg: number): {
    abbr: string;
    name: string;
    lonDeg: number;
};
