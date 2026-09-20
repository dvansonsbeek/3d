#!/usr/bin/env node
/**
 * Doc 99's generated tables — the deep-time clock, written by the engine
 * (holisticuniverse plan 06 Phase 4b).
 *
 *   node tools/docs/render-doc99-tables.mjs --check    exit 1 if any block is stale
 *   node tools/docs/render-doc99-tables.mjs --write    re-render the blocks
 *
 * Doc 99 (ESSRT) used to carry hand-computed tables of "H(t)" and "8H(t)/n"
 * under the retired spin-only clock. Every NUMBER in these blocks is now
 * written by this script from the evaluators the model runs ("a number a doc
 * cannot reproduce from an artifact gets written BY the script" — CLAUDE.md):
 * the composed lunisolar precession period T_p(t) = 1,296,000/ψ̇(t) on its
 * derived J2000 anchor (plan 06 S5), the obliquity beat 2π/(ψ̇ − |s₃|), the
 * tidal chain's LOD and Moon distance, and the climate formula's PHYSICAL
 * lines (data/l1-physical-lines.json, plan 06 T1): the precession-band lines
 * p + g_i and p + s_i ride ψ̇(t); the eccentricity-band lines |g_i − g_j| do
 * not (μ = 1 — the solar-mass drift of the g-modes is ~0.02 % at 2.46 Ga).
 * Block markers follow tools/docs/render-calculation-map.mjs:
 *   <!-- generated:<id> --> … <!-- /generated:<id> -->
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DOC = join(ROOT, 'docs/99-expanding-solar-system-resonance-theory.md');
const require = createRequire(join(ROOT, 'package.json'));
const DT = require(join(ROOT, 'tools/lib/deep-time.js'));
const L1 = JSON.parse(readFileSync(join(ROOT, 'data/l1-physical-lines.json'), 'utf8'));
const FREQ = JSON.parse(readFileSync(join(ROOT, 'data/t1-engine-frequencies.json'), 'utf8'));

// |s₃| — the dominant nodal mode of Earth's orbit (the obliquity beat's partner), ″/yr
const s3 = Math.abs([...FREQ.zeta].sort((a, b) => b.amp - a.amp)[0].arcsecPerYr);
const p0 = FREQ.pArcsecPerYr;   // the of-date precession rate at J2000 the physical lines were built on

const psiDot = (t) => DT.meanLunisolarPrecessionRateArcsecPerYrAtAge(t);           // ″/yr, composed
const Tp = (t) => DT.meanLunisolarPrecessionPeriodYearsAtAge(t);                   // yr
const lodHr = (t) => { const s = DT.meanLodSecondsAtAge(t); return s === null ? null : s / 3600; };
const lodS = (t) => DT.meanLodSecondsAtAge(t);
const moonKm = (t) => { const a = DT.meanMoonDistanceMetresAtAge(t); return a === null || !(a > 0) ? null : a / 1000; };
const daysPerYr = (t) => DT.meanYearInDaysAtAge(t);
/** The obliquity beat, kyr — null where ψ̇ ≤ |s₃| (the beat diverges: the spin–orbit crossover). */
const beatKyr = (t) => { const p = psiDot(t); return p === null || p <= s3 ? null : 1296000 / (p - s3) / 1000; };
/** A precession-band physical line's period at age t, kyr: 1,296,000/(ψ̇(t) + f_i), f_i = line rate − p₀ at J2000. */
const lineKyr = (line, t) => { const p = psiDot(t); return p === null ? null : 1296000 / (p + (line.arcsecPerYr - p0)) / 1000; };

const th = (v, d = 0) => (v === null || v === undefined || !Number.isFinite(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const f = (v, d) => (v === null || v === undefined || !Number.isFinite(v)) ? '—' : Number(v).toFixed(d);
const ageLabel = (t) => (t < 0 ? `+${th(-t)} (future)` : t === 0 ? '0 (J2000)' : `−${th(t)}`);

// Self-checks: the physical lines reproduce their J2000 periods on the engine's p₀; T_p(J2000) is the anchor.
const obl = L1.lines.filter((l) => l.family === 'obliquity');
const cpr = L1.lines.filter((l) => l.family === 'climatic precession');
const ecc = L1.lines.filter((l) => l.family === 'eccentricity');
const fam = L1.lines.filter((l) => /fundamental|harmonic/.test(l.family));
for (const l of [...obl, ...cpr]) {
  const k = 1296000 / l.arcsecPerYr / 1000;
  if (Math.abs(k - l.periodKyr) > 1e-6) throw new Error(`physical line ${l.label} does not reproduce its period: ${k} vs ${l.periodKyr}`);
}
if (Math.abs(psiDot(0) - p0) > 1e-6) throw new Error(`the engine's J2000 rate ${psiDot(0)} ≠ the physical lines' p₀ ${p0} — regenerate data/t1-engine-frequencies.json`);
if (Math.abs(1296000 / (p0 - s3) / 1000 - obl.find((l) => l.label === 'p+s0').periodKyr) > 1e-6) throw new Error('the obliquity beat ≠ the p+s0 physical line at J2000');

const ERA = { '-200': 'Future (projection)', '-100': 'Future', '-50': 'Future', '0': 'Modern (IERS anchor)', '10': 'Miocene', '50': 'Eocene/Oligocene', '90': 'Late Cretaceous (Pannella)', '180': 'Jurassic (Scrutton)', '290': 'Permian (Mazzullo)', '380': 'Devonian (Wells 1963)', '440': 'Silurian (Wells)', '500': 'Late Cambrian', '620': 'Ediacaran (Williams 2000)' };

function blockClockThroughTime() {
  const rows = ['| Age (Myr) | LOD (hr) | T_p (yr) — the composed precession period | days/yr (tropical) | Moon distance (km) | obliquity beat (kyr) | Era |', '|---:|---:|---:|---:|---:|---:|:---|'];
  for (const t of [-200, -100, -50, 0, 10, 50, 90, 180, 290, 380, 440, 500, 620]) {
    const b = (t === 0 || t === 380 || t === -200) ? (s) => `**${s}**` : (s) => s;
    rows.push(`| ${b(ageLabel(t))} | ${b(f(lodHr(t), 2))} | ${b(th(Tp(t)))} | ${b(f(daysPerYr(t), 2))} | ${b(th(moonKm(t)))} | ${b(f(beatKyr(t), 2))} | ${ERA[String(t)] ?? ''} |`);
  }
  rows.push('');
  rows.push(`T_p(t) = 1,296,000/ψ̇(t) with ψ̇(t) = [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³] — Earth's spin (angular-momentum conservation on the recession history) carrying the solar and lunar torques, the lunar torque growing as the Moon was closer; p₀ = ${f(p0, 4)} ″/yr, the model's derived J2000 rate (T_p = ${th(Tp(0), 1)} yr; plan 06 S5). The obliquity beat is 1,296,000/(ψ̇ − |s₃|) with |s₃| = ${f(s3, 4)} ″/yr, the dominant nodal mode of Earth's orbit (the engine's deep secular modes; μ = 1). The spin-only clock the model carried before (H₀·LOD/LOD₀ ÷ 13) read ${th(DT.eraClockHAtAge(380) / 13)} yr at the Devonian where the composed clock reads ${th(Tp(380))} — retired, \`docs/retired-record.md\`.`);
  return rows.join('\n');
}

function blockTwoTier() {
  const g0 = cpr.find((l) => l.label === 'p+g0');
  const rows = ['| Quantity | J2000 | −380 Ma (Devonian) | +200 Myr | Scales with |', '|:---|---:|---:|---:|:---|'];
  rows.push(`| Mean lunisolar precession period T_p (yr) | ${th(Tp(0))} | **${th(Tp(380))}** | **${th(Tp(-200))}** | the composed clock (spin × torque term) |`);
  rows.push(`| Obliquity beat 2π/(ψ̇ − \\|s₃\\|) (kyr) | ${f(beatKyr(0), 2)} | **${f(beatKyr(380), 2)}** | **${f(beatKyr(-200), 2)}** | the clock (s₃ fixed under μ = 1) |`);
  rows.push(`| Climatic-precession line p + g₀ (kyr) | ${f(lineKyr(g0, 0), 2)} | **${f(lineKyr(g0, 380), 2)}** | **${f(lineKyr(g0, -200), 2)}** | the clock |`);
  rows.push(`| Long-eccentricity metronome g₂ − g₅ (kyr) | ${f(fam[0].periodKyr, 1)} | ${f(fam[0].periodKyr, 1)} | ${f(fam[0].periodKyr, 1)} | does NOT scale (planetary g-modes; ∝ 1/μ only) |`);
  rows.push(`| Short-eccentricity line g₀ − g₂ (kyr) | ${f(ecc[0].periodKyr, 2)} | ${f(ecc[0].periodKyr, 2)} | ${f(ecc[0].periodKyr, 2)} | does NOT scale |`);
  return rows.join('\n');
}

function blockLines(lines, title) {
  const ages = [-200, 0, 50, 90, 180, 290, 380, 440, 620];
  const rows = [`| Age (Myr) | ψ̇ (″/yr) | ${lines.map((l) => `${l.label} (${f(l.periodKyr, 2)} kyr today${l.relAmp !== undefined ? `, rel. amp ${f(l.relAmp, 2)}` : ''})`).join(' | ')} |`, `|---:|---:|${lines.map(() => '---:').join('|')}|`];
  for (const t of ages) {
    const b = (t === 0 || t === 380) ? (s) => `**${s}**` : (s) => s;
    rows.push(`| ${b(ageLabel(t))} | ${b(f(psiDot(t), 2))} | ${lines.map((l) => b(f(lineKyr(l, t), 2))).join(' | ')} |`);
  }
  rows.push('');
  rows.push(`${title}: each line's period is 1,296,000/(ψ̇(t) + f_i) kyr with f_i the line's orbital frequency (fixed, μ = 1) and ψ̇(t) the composed precession rate — the ${lines.length} lines are the physical L1 set of plan 06 T1 (\`data/l1-physical-lines.json\`, relative amplitude ≥ 0.1 within the family), not integer labels.`);
  return rows.join('\n');
}

function blockEccLines() {
  const rows = ['| Line | Period (kyr) | rel. amplitude | Note |', '|:---|---:|---:|:---|'];
  for (const l of ecc) rows.push(`| ${l.label} | ${f(l.periodKyr, 2)} | ${f(l.relAmp, 3)} | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |`);
  for (const l of fam) rows.push(`| ${l.label} | ${f(l.periodKyr, 2)} | — | ${l.note} |`);
  return rows.join('\n');
}

function blockGenesis() {
  const rows = ['| Age (Gyr) | LOD (hr) | Moon distance (km) | T_p (yr) — the composed precession period | obliquity beat (kyr) |', '|---:|---:|---:|---:|---:|'];
  for (const t of [4498, 4420, 3250, 2500, 1000, 600, 350, 0, -200]) {
    const label = t === 4498 ? '**4.498 (genesis, rigid Roche)**' : t === 4420 ? '**4.42 (Farhat Moon-formation)**' : t === 0 ? '**0 (Modern)**' : t < 0 ? `+${(-t / 1000).toFixed(1)} (future)` : (t / 1000).toFixed(2);
    const beat = t > 2500 ? '— (ψ̇ ≫ \\|s₃\\|: the beat ≈ T_p)' : f(beatKyr(t), 2);
    rows.push(`| ${label} | ${f(lodHr(t), 2)} | ${th(moonKm(t))} | ${th(Tp(t))} | ${beat} |`);
  }
  rows.push('');
  rows.push(`Near genesis the Moon's torque dominates by orders of magnitude ((a₀/a_M)³ ≈ ${th(Math.pow(384399 / moonKm(4420), 3))} at 4.42 Ga), so the precession period collapses to decades — a statement of the composition law at the edge of the tidal chain's domain, not a calibrated prediction (the recession history there is the Driver-1½ regime knots to the Roche crossing).`);
  return rows.join('\n');
}

/** The age (Myr from now, negative = future) where ψ̇(t) = |s₃| — the beat diverges. */
function crossoverFutureMyr() {
  let lo = 0, hi = -3000;
  const g = (t) => { const p = psiDot(t); return p === null ? -1 : p - s3; };
  if (!(g(lo) > 0) || g(hi) >= 0) return null;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (g(mid) > 0) lo = mid; else hi = mid; }
  return -(lo + hi) / 2;
}

function blockFuture() {
  const x = crossoverFutureMyr();
  const rows = ['| Time from now | LOD (hr) | Moon distance (km) | T_p (yr) | obliquity beat (kyr) | Status |', '|:---|---:|---:|---:|---:|:---|'];
  for (const t of [0, -200, -500, -1000, -2000]) {
    const label = t === 0 ? 'Modern' : `+${th(-t)} Myr`;
    const p = psiDot(t);
    const beat = p === null ? '—' : p > s3 ? f(beatKyr(t), 2) : '— (ψ̇ < \\|s₃\\|)';
    rows.push(`| ${label} | ${f(lodHr(t), 2)} | ${th(moonKm(t))} | ${th(Tp(t))} | ${beat} | ${t === 0 ? 'anchor' : 'within the tidal chain'} |`);
  }
  rows.push('| +3 Gyr | beyond a_lock | — | — | — | formula horizon |');
  rows.push('');
  rows.push(x === null ? 'ψ̇ stays above |s₃| inside the formula horizon.' : `**The spin–orbit crossover.** The composed precession rate falls to the nodal mode's rate, ψ̇ = |s₃| = ${f(s3, 2)} ″/yr, at about **+${th(x)} Myr** (T_p ≈ ${th(1296000 / s3)} yr): the obliquity beat 2π/(ψ̇ − |s₃|) diverges there — the secular spin–orbit resonance that the standard literature also places in Earth's tidal future (large obliquity excursions). Beyond it the beat re-forms on |s₃| − ψ̇. A prediction of the composition law, stated before any test.`);
  return rows.join('\n');
}

function blockGrowthRate() {
  const T0 = Tp(0), Tm = Tp(1), Tf = Tp(-1);
  const dT = (Tf - Tm) / 2;             // yr per Myr, central difference
  const b0 = beatKyr(0), bm = beatKyr(1), bf = beatKyr(-1);
  const rows = ['| Rate at J2000 | Value |', '|:---|---:|'];
  rows.push(`| dT_p/dt (the precession period) | +${f(dT, 1)} yr per Myr = +${f(100 * dT / T0, 4)} % per Myr |`);
  rows.push(`| d(beat)/dt (the obliquity beat) | +${f(1000 * (bf - bm) / 2, 1)} yr per Myr = +${f(100 * (bf - bm) / 2 / b0, 4)} % per Myr |`);
  rows.push(`| dLOD/dt (the tidal chain) | +${f((lodS(-1) - lodS(1)) / 2, 2)} s per Myr = +${f((lodS(-1) - lodS(1)) / 2 / 1e4 * 1000, 2)} ms per century |`);
  rows.push('');
  rows.push('Central differences of the shipped chain at ±1 Myr. The precession period grows faster than the day length alone would make it, because the lunar torque falls as the Moon recedes: the composition law, not spin-scaling.');
  return rows.join('\n');
}

function blockKeyEpochs() {
  const rows = ['| Age (Ma) | LOD (s) | LOD (hr) | Moon distance (km) | T_p (yr) | obliquity beat (kyr) |', '|---:|---:|---:|---:|---:|---:|'];
  for (const t of [0, 380, 550, 1000, 2500, 4498, -200, -1000]) {
    const label = t === 0 ? '0 (Modern)' : t === 380 ? '380 (Devonian)' : t === 550 ? '550 (Cambrian)' : t === 1000 ? '1,000 (Mesoproterozoic)' : t === 2500 ? '2,500 (Archean)' : t === 4498 ? '4,498 (Earth-Moon genesis, rigid Roche)' : t === -200 ? '**−200 (+200 Ma future)**' : '**−1,000 (+1 Gyr future)**';
    const beat = t > 2500 ? '—' : f(beatKyr(t), 2);
    rows.push(`| ${label} | ${th(lodS(t), 1)} | ${f(lodHr(t), 3)} | ${th(moonKm(t))} | ${th(Tp(t))} | ${beat} |`);
  }
  rows.push('| **−3,000 (+3 Gyr future)** | — | — | — | — | beyond tidal lock |');
  return rows.join('\n');
}

function blockH5() {
  const rows = ['| Age (Ma) | LOD_mean (s) | δ_LOD (ms) — the frozen device\'s ecliptic-precession term | fractional δ/LOD |', '|---:|---:|---:|---:|'];
  for (const t of [-200, 0, 380, 1000]) {
    const lod = lodS(t), H = DT.meanHAtAge(t), d = daysPerYr(t);
    const delta = (lod === null || H === null || d === null) ? null : lod / ((H / 5) * d);
    rows.push(`| ${ageLabel(t)} | ${f(lod, 1)} | ${f(delta === null ? null : delta * 1000, 3)} | ${delta === null ? '—' : (delta / lod).toExponential(3)} |`);
  }
  rows.push('');
  rows.push('δ_LOD = LOD_mean / ((unit/5) · days/yr) evaluated on the shipped chain (`deltaTRawSecondsAtAge`): the frozen device\'s kinematic term, a fixed fraction of the day by construction (the unit scales with the clock and days/yr with 1/LOD).');
  return rows.join('\n');
}

function blockSummary() {
  const g0 = cpr.find((l) => l.label === 'p+g0');
  const cols = [0, 180, 380, -200];
  const head = ['Modern (J2000)', '−180 Ma (Jurassic)', '−380 Ma (Devonian)', '+200 Myr'];
  const rows = [`| Quantity | ${head.join(' | ')} |`, `|:---|${cols.map(() => '---:').join('|')}|`];
  const line = (name, fn) => rows.push(`| ${name} | ${cols.map((t, i) => (i === 0 || i === 3 ? `**${fn(t)}**` : fn(t))).join(' | ')} |`);
  line('LOD (hr)', (t) => f(lodHr(t), 2));
  line('days/year (tropical)', (t) => f(daysPerYr(t), 2));
  line('Moon distance (km)', (t) => th(moonKm(t)));
  line('Mean lunisolar precession period T_p (yr)', (t) => th(Tp(t)));
  line('Obliquity beat 2π/(ψ̇ − \\|s₃\\|) (kyr)', (t) => f(beatKyr(t), 2));
  line('Climatic-precession line p + g₀ (kyr)', (t) => f(lineKyr(g0, t), 2));
  line('Long-eccentricity metronome g₂ − g₅ (kyr, NOT scaled)', () => f(fam[0].periodKyr, 1));
  line('Short-eccentricity line g₀ − g₂ (kyr, NOT scaled)', () => f(ecc[0].periodKyr, 2));
  line('Frozen era clock\'s day count H_era × days/yr (device)', (t) => { const H = DT.eraClockHAtAge(t), d = daysPerYr(t); return H === null || d === null ? '—' : th(H * d); });
  return rows.join('\n');
}

// Published Phanerozoic precession constants — LITERATURE INPUTS, labelled: Wu, Malinverno, Meyers et al. 2024
// (Science Advances, doi:10.1126/sciadv.ado2412; TimeOptB inversions of cyclostratigraphic records through an
// assumed astronomical model; the same anchors as the simulator's ESSRT explorer overlay) and the 500-Ma
// endpoint of Berger, Loutre & Laskar 1992 (Science 255:560 — a competing theory's tidal solution).
const WU_2024_K = [
  { ageMa: 100, k: 53.0, sigma: 1.0 }, { ageMa: 200, k: 54.36, sigma: 1.0 }, { ageMa: 300, k: 59.5, sigma: 0.5 },
  { ageMa: 400, k: 61.5, sigma: 0.5 }, { ageMa: 500, k: 64.5, sigma: 0.5 }, { ageMa: 650, k: 67.64, sigma: 0.30 },
];
const BERGER_1992_500MA = { ageMa: 500, kArcsecPerYr: 61, obliquityKyr: 29 };

function blockPhanerozoicComparison() {
  const spinOnly = (t) => p0 * (lodS(0) / lodS(t));   // the retired clock: ψ̇ ∝ ω alone
  const rows = ['| Age (Ma) | ψ̇ composed (″/yr) | ψ̇ spin-only, retired (″/yr) | published inference (″/yr) | Δ composed | Δ spin-only | obliquity beat composed (kyr) | beat implied by the inference (kyr) |', '|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for (const w of WU_2024_K) {
    const pc = psiDot(w.ageMa), ps = spinOnly(w.ageMa);
    rows.push(`| ${w.ageMa} | **${f(pc, 2)}** | ${f(ps, 2)} | Wu 2024: ${f(w.k, 2)} ± ${f(w.sigma, 1)} | ${f(100 * (pc / w.k - 1), 1)} % | ${f(100 * (ps / w.k - 1), 1)} % | ${f(beatKyr(w.ageMa), 2)} | ${f(1296000 / (w.k - s3) / 1000, 2)} |`);
  }
  const b = BERGER_1992_500MA, pc = psiDot(b.ageMa), ps = spinOnly(b.ageMa);
  rows.push(`| ${b.ageMa} | **${f(pc, 2)}** | ${f(ps, 2)} | Berger, Loutre & Laskar 1992: ${b.kArcsecPerYr} (theory) | ${f(100 * (pc / b.kArcsecPerYr - 1), 1)} % | ${f(100 * (ps / b.kArcsecPerYr - 1), 1)} % | ${f(beatKyr(b.ageMa), 2)} | ${b.obliquityKyr} (their obliquity main period) |`);
  rows.push('');
  rows.push(`The composed clock sits within 3 % of every published Phanerozoic precession constant and reads 2–3 % LOW across 300–500 Ma (the Pangea window, where Wu's Moon-distance anchors are closer than the shipped recession polynomial — the documented Pangea offset); the retired spin-only clock reads 9–13 % low there. Beats via 1,296,000/(ψ̇ − |s₃|), |s₃| = ${f(s3, 2)} ″/yr. Wu's constants carry the astronomical model of their inversion; Berger 1992 is theory — neither is a measurement, and the table is labelled accordingly.`);
  return rows.join('\n');
}

const BLOCKS = {
  'doc99-phanerozoic-comparison': blockPhanerozoicComparison,
  'doc99-clock-through-time': blockClockThroughTime,
  'doc99-two-tier-table': blockTwoTier,
  'doc99-l1-obliquity-lines': () => blockLines(obl, 'Obliquity band'),
  'doc99-l1-precession-lines': () => blockLines(cpr, 'Climatic-precession band'),
  'doc99-l1-eccentricity-lines': blockEccLines,
  'doc99-genesis-table': blockGenesis,
  'doc99-future-table': blockFuture,
  'doc99-growth-rate': blockGrowthRate,
  'doc99-key-epochs': blockKeyEpochs,
  'doc99-h5-table': blockH5,
  'doc99-summary-table': blockSummary,
};

const write = process.argv.includes('--write');
let doc = readFileSync(DOC, 'utf8');
let stale = 0;
for (const [id, fn] of Object.entries(BLOCKS)) {
  const re = new RegExp(`(<!-- generated:${id} -->)\\n?([\\s\\S]*?)\\n?(<!-- /generated:${id} -->)`);
  const mm = doc.match(re);
  if (!mm) { console.error(`  MISSING block markers for ${id} in docs/99`); process.exit(2); }
  const fresh = fn();
  if (mm[2] !== fresh) {
    stale++;
    if (write) doc = doc.replace(re, () => `${mm[1]}\n${fresh}\n${mm[3]}`);
    else console.error(`  STALE block ${id}`);
  }
}
if (write) {
  writeFileSync(DOC, doc);
  console.log(`render-doc99-tables: ${stale} block(s) re-rendered (${Object.keys(BLOCKS).length} total)`);
} else if (stale) {
  console.error(`FAIL — ${stale} stale generated block(s) in docs/99. Regenerate: node tools/docs/render-doc99-tables.mjs --write`);
  process.exit(1);
} else {
  console.log(`PASS — docs/99 generated blocks fresh (${Object.keys(BLOCKS).length})`);
}
