#!/usr/bin/env node
/**
 * Doc 112's generated tables — the residual spectra sweep (plan 32), rendered from the governed
 * artifact data/residual-spectrum-sweep.json so the doc cannot quote a number the sweep did not
 * produce (CLAUDE.md §1.21: a number a doc cannot reproduce from an artifact is written BY the script).
 *
 *   node tools/docs/render-doc112-tables.mjs --check    exit 1 if a block is stale
 *   node tools/docs/render-doc112-tables.mjs --write    re-render the blocks
 *
 * Block markers follow render-calculation-map: <!-- generated:<id> --> … <!-- /generated:<id> -->
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DOC = join(ROOT, 'docs/112-residual-spectra.md');
const SWEEP = JSON.parse(readFileSync(join(ROOT, 'data/residual-spectrum-sweep.json'), 'utf8'));
const S = SWEEP.series, P = SWEEP.probes, D = SWEEP.decision;

const f = (v, d = 2) => (v === null || v === undefined || !Number.isFinite(v)) ? '—' : Number(v).toFixed(d);
const g = (v, d = 3) => (v === null || v === undefined || !Number.isFinite(v)) ? '—' : Number(v).toPrecision(d);
const per = (v) => { const a = Math.abs(v); return a >= 1000 ? Math.round(v).toLocaleString('en-US') : a >= 100 ? f(v, 1) : a >= 10 ? f(v, 2) : f(v, 3); };
const mag = (v) => { const a = Math.abs(v); return a >= 100 ? f(v, 0) : a >= 10 ? f(v, 1) : a >= 1 ? f(v, 2) : g(v, 3); };
const axisUnit = (id) => (id.startsWith('lr04') || id.startsWith('la2004') ? 'kyr' : id.startsWith('paleo') ? 'Myr' : 'yr');
const strongest = (s) => s.lines[0] || null;
const unitShort = (s) => (s.unit || '').split(' ')[0];

const ORDER = [
  ['deltaT-espenak', '1', 'ΔT: Espenak & Meeus 2006 − model, yearly'],
  ['deltaT-stephenson-timed', '2', 'ΔT: SMH2016 timed observations − model'],
  ['deltaT-stephenson-spline', '2b', 'ΔT: SMH2016 spline − model (the stack\'s own fit record)'],
  ['deltaT-stephenson-timed-nojose', '2-J', 'as 2, the shipped Jose pair subtracted'],
  ['deltaT-stephenson-spline-nojose', '2-J', 'as 2b, the shipped Jose pair subtracted'],
  ['deltaT-spline-refit-bond+hallstatt+jose5+jose4', '2-J′', 'the stack RE-FITTED on the spline with all four cycles (the check)'],
  ['deltaT-spline-refit-bond+hallstatt', '2-J′', 'the stack RE-FITTED with Bond + Hallstatt only (free of the Jose fit)'],
  ['paleo-anchors', '3', 'the 45 paleo anchors − the chain (relative)'],
  ['paleo-anchors-le600Ma', '3', 'the anchors inside 600 Ma'],
  ['lr04-post-mpt', '4', 'LR04 − the climate formula, post-MPT window'],
  ['lr04-inhg-mpt', '4', 'LR04 − the formula, iNHG–MPT window'],
  ['lr04-pre-inhg', '4', 'LR04 − the formula, pre-iNHG window'],
  ['lr04-full', '4', 'LR04 − the formula, the full-record fit'],
  ['sun-horizons-yearly', '5', 'the certified Sun − Horizons, yearly means'],
  ['sun-horizons--2500..-2200', '5', 'the Sun − Horizons, 10-d cadence, −2500…−2200'],
  ['sun-horizons--400..-100', '5', 'the Sun − Horizons, 10-d cadence, −400…−100'],
  ['sun-horizons-1700..2000', '5', 'the Sun − Horizons, 10-d cadence, 1700…2000'],
  ['lunar-canon-UT', '6', 'the lunar canon − the finder, UT'],
  ['lunar-canon-TD', '6', 'the lunar canon − the finder, dynamical time'],
  ['lunar-canon-TD-node-term-removed', '6', 'dynamical time, the node-distance term removed'],
  ['la2004-eccentricity', '7', 'e − La2004 (×10³), a linear trend removed'],
  ['la2004-obliquity', '7', 'ε − La2004 (″), a linear trend removed'],
  ['la2004-perihelion', '7', 'ϖ of date − La2004 (″), a linear trend removed'],
  ['la2004-perihelion-quadratic', '7', 'ϖ of date − La2004 (″), a quadratic removed'],
  ['cardinal-VE-horizons', '8', 'the vernal equinox instants − Horizons'],
  ['cardinal-SS-horizons', '8', 'the June solstice instants − Horizons'],
  ['cardinal-AE-horizons', '8', 'the autumnal equinox instants − Horizons'],
  ['cardinal-WS-horizons', '8', 'the December solstice instants − Horizons'],
];

function blockSeries() {
  const rows = ['| # | series | n | span | rms | ρ (lag 1) | AR(1) floor | lines above it | strongest line | amplitude | × floor | stands | what the line is |', '|---|:---|---:|:---|---:|---:|---:|---:|---:|---:|---:|:---|:---|'];
  for (const [id, no, label] of ORDER) {
    const s = S[id]; if (!s) continue;
    const l = strongest(s);
    const what = l ? (l.longFamily ? `a span-scale family (${f(s.span / l.periodYears, 2)} cycles)` : l.named ? l.named : '(unnamed — see the probes)') : '—';
    rows.push(`| ${no} | ${label} | ${s.n.toLocaleString('en-US')} | ${per(s.tMin)} … ${per(s.tMax)} ${axisUnit(s.id)} | ${mag(s.rms)} ${unitShort(s)} | ${f(s.ar1.rho, 3)} | ${f(s.floorAr1p99, 3)} | ${s.linesAboveAr1} | ${l ? `${per(l.periodYears)} ${axisUnit(s.id)}` : '—'} | ${l ? mag(l.amplitude) : '—'} | ${l ? f(l.overAr1Floor, 2) : '—'} | ${l ? (l.stands ? 'yes' : 'no') : '—'} | ${what} |`);
  }
  return rows.join('\n');
}

function blockSunNamed() {
  const T = P.sunNamedTerms;
  const rows = [`| argument | period (yr) | ${T.map((w) => `${w.window[0]}…${w.window[1]} (″, °)`).join(' | ')} |`, `|:---|---:|${T.map(() => '---:').join('|')}|`];
  const n = T[0].terms.length;
  for (let i = 0; i < n; i++) {
    const t0 = T[0].terms[i];
    rows.push(`| ${t0.label} | ${f(Math.abs(t0.periodYears), 4)} | ${T.map((w) => `${f(w.terms[i].amplitudeArcsec, 3)}″ ${f(w.terms[i].phaseDeg, 0)}°`).join(' | ')} |`);
  }
  rows.push('');
  rows.push(`Window rms: ${T.map((w) => `${f(w.rmsArcsec, 3)}″ (${w.window[0]}…${w.window[1]}, n ${w.n.toLocaleString('en-US')})`).join('; ')}. The direct weighted least-squares fit of a cosine/sine pair at each named frequency; amplitude in arcseconds of longitude, phase of the record − model difference.`);
  return rows.join('\n');
}

function blockCardinal() {
  const C = P.cardinal;
  const rows = ['| cardinal type | n | rms total (min) | the apparent Sun\'s part | the cardinal tier\'s part | 2.715 yr: total / Sun / tier (min) | 6.40-yr doublet: total / Sun / tier (min) |', '|:---|---:|---:|---:|---:|:---|:---|'];
  for (const [type, s] of Object.entries(C.split)) rows.push(`| ${type} | ${s.n.toLocaleString('en-US')} | ${f(s.rmsTotalMin, 3)} | ${f(s.rmsSunPartMin, 3)} | ${f(s.rmsTierPartMin, 3)} | ${f(s.amplitudesMin.total.dAlias, 3)} / ${f(s.amplitudesMin.sunPart.dAlias, 3)} / ${f(s.amplitudesMin.tierPart.dAlias, 3)} | ${f(s.amplitudesMin.total.doubletA, 3)} / ${f(s.amplitudesMin.sunPart.doubletA, 3)} / ${f(s.amplitudesMin.tierPart.doubletA, 3)} |`);
  rows.push('');
  const I = C.interpolation, names = { cubic4: 'a Lagrange cubic through four 10-d rows (the gate)', quintic6: 'a quintic through six rows', cubic4Dewobbled: 'the cubic on the longitude with the 6.44″ barycentre wobble removed first' };
  rows.push(`| the Horizons crossing found by (${I.cubic4.type}) | rms of the Sun\'s part (min) | 2.715 yr (min) | 6.3988 yr | 6.4245 yr | 2V − 3E alias 3.98 yr | D − M′ alias 8.85 yr |`, '|:---|---:|---:|---:|---:|---:|---:|');
  for (const [k, s] of Object.entries(I)) rows.push(`| ${names[k] || k} | ${f(s.rmsSunPartMin, 3)} | ${f(s.amplitudesMin.dAlias, 3)} | ${f(s.amplitudesMin.doubletA, 3)} | ${f(s.amplitudesMin.doubletB, 3)} | ${f(s.amplitudesMin.venus2V3E, 3)} | ${f(s.amplitudesMin.dMinusMpAlias, 3)} |`);
  return rows.join('\n');
}

function blockLunar() {
  const L = P.lunarNode, LG = P.lunarGreatest;
  const rows = [
    `| the lunar canon against the finder | value |`, '|:---|---:|',
    `| matched eclipses | ${L.n.toLocaleString('en-US')} |`,
    `| residual in UT (canon UT − model UT, the shipped greatest-eclipse instant) | ${f(LG.meanUTMin, 2)} ± ${f(LG.sdUTMin, 2)} min |`,
    `| residual in dynamical time (canon TD − model TT, the shipped instant) | ${f(LG.meanTDMin, 2)} ± ${f(LG.sdTDMin, 2)} min |`,
    `| its node term in the five-term fit (sin 2F) | ${f(LG.fiveTerm.coefficients.sin2F, 2)} min |`,
    `| its direct anomaly term (cos M′, sin M′) — the model's M′ against the ephemeris's | ${f(LG.anomalyTwoTerm.amplitudeMin, 2)} min; remainder ${f(LG.anomalyTwoTerm.sdAfterMin, 3)} min sd |`,
    `| the same residual at the OPPOSITION instant the finder bisects first (the record of §1.41 b) | ${f(L.meanTDMin, 2)} ± ${f(L.sdTDMin, 2)} min |`,
    `| the node distance u of the mean argument of latitude at the canon instant spans | ${f(L.uRangeDeg[0], 1)}° … ${f(L.uRangeDeg[1], 1)}° |`,
    `| regression of the dynamical-time residual on u | slope ${f(L.onNodeDistance.slope, 4)} min/°, r = ${f(L.onNodeDistance.r, 4)} |`,
    `| regression on sin 2F | slope ${f(L.onSin2F.slope, 2)} min, r = ${f(L.onSin2F.r, 4)} |`,
    `| regression on gamma (its sign flips between the nodes) | r = ${f(L.onGamma.r, 4)} |`,
    `| residual after the sin 2F term | ${f(L.sdAfterSin2FMin, 3)} min sd |`,
    `| correlation of sin 2F with sin M′ under eclipse sampling (the one-term slope's bias) | ${f(L.correlationSin2FSinMp, 3)} |`,
  ];
  const F5 = L.fiveTerm, c = F5.coefficients, pr = F5.predicted;
  rows.push('');
  rows.push('| the five-term fit of the dynamical-time residual | fitted (min) | the shadow geometry predicts |', '|:---|---:|---:|');
  rows.push(`| sin 2F (the node term) | ${f(c.sin2F, 2)} | ${f(pr.slopeMinPerSin2F, 2)} (−i²Ḟ/2λ̇²) |`);
  rows.push(`| sin 2F · cos M′ (the speed of date on it), as a ratio to the node term | ${f(F5.anomalyModulationCosMp, 3)} | ${f(pr.anomalyModulationCosMp, 3)} (≈ −2.3 e) |`);
  rows.push(`| sin 2F · sin M′ | ${f(c.sin2FsinMp, 2)} | 0 |`);
  rows.push(`| cos M′ (direct) | ${f(c.cosMp, 2)} | 0 |`);
  rows.push(`| sin M′ (direct) | ${f(c.sinMp, 2)} | 0 |`);
  rows.push(`| the direct anomaly term's amplitude | ${f(F5.directAnomalyAmplitudeMin, 2)} | 0 |`);
  rows.push(`| residual after the five terms | ${f(F5.sdAfterMin, 3)} min sd | |`);
  rows.push('');
  rows.push('| by eclipse type | n | slope on u (min/°) | r |', '|:---|---:|---:|---:|');
  for (const [ty, r] of Object.entries(L.byType)) rows.push(`| ${ty} | ${r.n.toLocaleString('en-US')} | ${f(r.slope, 4)} | ${f(r.r, 4)} |`);
  const T3 = P.lunarThirdInstrument;
  if (T3) {
    rows.push('');
    rows.push('| era | n | canon − Meeus 49: sd → after the definition terms (min) | its cos M′ | model − Meeus 49: sd (min) | its cos M′ (min) | the model\'s M′ phase it implies | the polynomial\'s own T³+T⁴ in M′ at the midpoint |', '|:---|---:|---:|---:|---:|---:|---:|---:|');
    for (const e of T3.byEra) rows.push(`| ${e.era[0]} … ${e.era[1]} | ${e.n.toLocaleString('en-US')} | ${f(e.canonMinusMeeus.sd, 2)} → ${f(e.canonMinusMeeus.sdAfter, 2)} | ${f(e.canonMinusMeeus.coefficients.cosMp, 2)} | ${f(e.modelMinusMeeus.sd, 2)} | ${f(e.modelMinusMeeus.coefficients.cosMp, 2)} | ${f(e.impliedModelMpPhaseDeg, 3)}° | ${f(e.meeusMpTailAtMidpointDeg, 3)}° |`);
  }
  const LA = P.lunarArguments;
  if (LA) {
    rows.push('');
    rows.push('| epoch | model − polynomial: L′ (″) | M′ (″) | F (″) | perigee ϖ (″) | the polynomial\'s T³+T⁴ in ϖ (″) | share the model carries | node Ω (″) | the polynomial\'s T³+T⁴ in Ω (″) | share |', '|:---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
    for (const r of LA) rows.push(`| ${r.year} | ${f(r.modelMinusPolynomialArcsec.Lp, 0)} | ${f(r.modelMinusPolynomialArcsec.Mp, 0)} | ${f(r.modelMinusPolynomialArcsec.F, 0)} | ${f(r.perigeeArcsec, 0)} | ${f(r.polynomialTailArcsec.perigee, 0)} | ${Math.abs(r.polynomialTailArcsec.perigee) < 30 ? '—' : f(r.shareOfTailCarried.perigee, 2)} | ${f(r.nodeArcsec, 0)} | ${f(r.polynomialTailArcsec.node, 0)} | ${Math.abs(r.polynomialTailArcsec.node) < 30 ? '—' : f(r.shareOfTailCarried.node, 2)} |`);
  }
  rows.push('');
  rows.push('| series | strongest lines (period yr, amplitude min, × floor, stands) |', '|:---|:---|');
  for (const id of ['lunar-canon-TD', 'lunar-canon-TD-anomaly-term-removed', 'lunar-canon-TD-opposition', 'lunar-canon-TD-opposition-node-term-removed', 'lunar-canon-TD-opposition-five-term-removed']) { const s = S[id]; if (!s) continue; rows.push(`| ${id} | ${s.lines.slice(0, 6).map((l) => `${f(l.periodYears, 4)} / ${f(l.amplitude, 3)} / ${f(l.overAr1Floor, 1)}× / ${l.stands ? 'stands' : 'unstable'}`).join('; ')} |`); }
  return rows.join('\n');
}

function blockJose() {
  const J = SWEEP.meta.joseRead;
  const rows = ['| the re-fit on the SMH2016 spline | Bond (s) | Hallstatt (s) | Jose5 (s) | Jose4 (s) | residual rms (s) | power at 897 yr (× AR(1) / × white) | power at 716 yr |', '|:---|---:|---:|---:|---:|---:|---:|---:|'];
  for (const [id, label] of [['deltaT-spline-refit-bond+hallstatt+jose5+jose4', 'all four cycles (the check)'], ['deltaT-spline-refit-bond+hallstatt', 'Bond + Hallstatt only']]) {
    const r = J[id], s = S[id]; if (!r || !s) continue;
    const amp = (k) => (r.refit[k] ? `${f(r.refit[k].amplitude_s, 1)} (shipped ${f(r.refit[k].shipped_amplitude_s, 1)})` : '—');
    rows.push(`| ${label} | ${amp('bond')} | ${amp('hallstatt')} | ${amp('jose5')} | ${amp('jose4')} | ${f(s.rms, 1)} | ${f(r.jose5.power, 3)} (${f(r.jose5.overAr1Floor, 2)} / ${f(r.jose5.overWhiteFloor, 2)}) | ${f(r.jose4.power, 3)} (${f(r.jose4.overAr1Floor, 2)} / ${f(r.jose4.overWhiteFloor, 2)}) |`);
  }
  const s2 = S['deltaT-spline-refit-bond+hallstatt'], l = s2 && s2.lines[0];
  if (l) { rows.push(''); rows.push(`The Jose-free residual's strongest line: ${f(l.periodYears, 1)} yr, ${f(l.amplitude, 1)} s — ${f(l.amplitudeFirstHalf, 1)} s in the first half of the record, ${f(l.amplitudeSecondHalf, 1)} s in the second; ${f(l.overWhiteFloor, 1)}× the white floor, ${f(l.overAr1Floor, 2)}× the AR(1) floor.`); }
  return rows.join('\n');
}

function blockLa2004() {
  const rows = ['| element | detrend | trend | rms after | lines above the floor (period kyr, amplitude, × floor, first / second half) |', '|:---|:---|:---|---:|:---|'];
  for (const id of ['la2004-eccentricity', 'la2004-obliquity', 'la2004-perihelion', 'la2004-eccentricity-quadratic', 'la2004-obliquity-quadratic', 'la2004-perihelion-quadratic']) {
    const s = S[id]; if (!s) continue;
    const tr = s.trend ? (s.trend.quadratic ? `slope ${g(s.trend.slope * 1000, 3)} per Myr, curvature ${g(s.trend.curvaturePerUnit2 * 1e6, 3)} per Myr²` : `slope ${g(s.trend.slope * 1000, 3)} per Myr`) : '—';
    rows.push(`| ${s.id.replace('la2004-', '').replace('-quadratic', '')} (${unitShort(s)}) | ${s.detrend} | ${tr} | ${g(s.rms, 4)} | ${s.lines.filter((l) => l.aboveAr1).slice(0, 6).map((l) => `${f(l.periodYears, 2)} / ${g(l.amplitude, 3)} / ${f(l.overAr1Floor, 1)}× / ${g(l.amplitudeFirstHalf, 3)} : ${g(l.amplitudeSecondHalf, 3)}`).join('; ') || 'none'} |`);
  }
  return rows.join('\n');
}

function blockLr04() {
  const rows = ['| window | n | rms (‰) | ρ | AR(1) floor | lines above it | strongest peak (kyr, ‰, × AR(1), × white, stands) | the primary-family tone it matches |', '|:---|---:|---:|---:|---:|---:|:---|:---|'];
  for (const id of ['lr04-post-mpt', 'lr04-inhg-mpt', 'lr04-pre-inhg', 'lr04-full']) {
    const s = S[id]; if (!s) continue;
    const top = s.lines.slice(0, 3);
    rows.push(`| ${id.replace('lr04-', '')} (${s.meta.windowKyr[0]}–${s.meta.windowKyr[1]} ka) | ${s.n} | ${f(s.rms, 3)} | ${f(s.ar1.rho, 3)} | ${f(s.floorAr1p99, 3)} | ${s.linesAboveAr1} | ${top.map((l) => `${f(l.periodYears, 1)} / ${f(l.amplitude, 3)} / ${f(l.overAr1Floor, 2)} / ${f(l.overWhiteFloor, 1)} / ${l.stands ? 'yes' : 'no'}`).join('; ')} | ${top.map((l) => l.longFamily ? 'a span-scale swing' : l.named || '—').join('; ')} |`);
  }
  return rows.join('\n');
}

function blockDecision() {
  return [
    `| the sweep's counts | |`, '|:---|---:|',
    `| residual series analysed | ${D.seriesAnalysed} |`,
    `| lines above the red-noise floor (p < 0.01 over each grid), span-scale families excluded | ${D.linesAboveRedNoiseFloor} |`,
    `| of them named by an astronomical argument or a primary-family mixing tone within half the resolution | ${D.linesNamedByAnArgumentOrTone} |`,
    `| span-scale families (a smooth curvature's Fourier terms, ≤ 6 cycles of the span) | ${D.linesInLongPeriodFamilies} |`,
    `| lines above the floor the classifiers did not name, read against the probes (§3–§5) | ${D.linesAboveFloorUnnamed.length} |`,
    `| lines standing against their record with physics the instruments do not supply (one series each) | ${(D.linesStandingWithNamedPhysics || []).length} |`,
    `| survivors without external physics in two independent series | ${D.survivorsWithoutExternalPhysicsInTwoSeries} |`,
    '',
    `Unnamed lines by series: ${D.linesAboveFloorUnnamed.map((l) => `${l.series} ${per(l.periodYears)} (${g(l.amplitude, 3)}${l.stands ? '' : ', unstable'})`).join('; ') || 'none'}.`,
    '',
    ...(D.linesStandingWithNamedPhysics || []).map((l) => `Standing with named physics: ${l.series} at ${f(l.periodYears, 4)} yr (${l.name}), ${f(l.amplitudeMin, 2)} min over the whole span — ${l.physics}.`),
  ].join('\n');
}

const BLOCKS = { 'doc112-series': blockSeries, 'doc112-sun-named': blockSunNamed, 'doc112-cardinal': blockCardinal, 'doc112-lunar': blockLunar, 'doc112-jose': blockJose, 'doc112-la2004': blockLa2004, 'doc112-lr04': blockLr04, 'doc112-decision': blockDecision };

const write = process.argv.includes('--write');
let doc = readFileSync(DOC, 'utf8');
let stale = 0;
for (const [id, fn] of Object.entries(BLOCKS)) {
  const re = new RegExp(`(<!-- generated:${id} -->)\\n?([\\s\\S]*?)\\n?(<!-- /generated:${id} -->)`);
  const mm = doc.match(re);
  if (!mm) { console.error(`  MISSING block markers for ${id} in docs/112`); process.exit(2); }
  const fresh = fn();
  if (mm[2] !== fresh) { stale++; if (write) doc = doc.replace(re, () => `${mm[1]}\n${fresh}\n${mm[3]}`); else console.error(`  STALE block ${id}`); }
}
if (write) { writeFileSync(DOC, doc); console.log(`render-doc112-tables: ${stale} block(s) re-rendered (${Object.keys(BLOCKS).length} total)`); }
else if (stale) { console.error(`FAIL — ${stale} stale generated block(s) in docs/112. Regenerate: node tools/docs/render-doc112-tables.mjs --write`); process.exit(1); }
else console.log(`PASS — docs/112 generated blocks fresh (${Object.keys(BLOCKS).length})`);
