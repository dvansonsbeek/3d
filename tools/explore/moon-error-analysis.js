const { computePlanetPosition, thetaToRaDeg, phiToDecDeg } = require('../lib/scene-graph');
const jpl = require('../lib/horizons-client');
const C = require('../lib/constants');

async function analyze() {
  // Sample every 7 days for 2 years to see error patterns
  const startJD = C.startmodelJD;
  const results = [];

  for (let d = 0; d < 365.25 * 2; d += 7) {
    const jd = startJD + d;

    const wp = computePlanetPosition('moon', jd);
    const modelRA = thetaToRaDeg(wp.ra);
    const modelDec = phiToDecDeg(wp.dec);

    results.push({ jd, day: d, modelRA, modelDec });
  }

  // Fetch JPL positions
  const jdList = results.map(r => r.jd);
  const jplPositions = await jpl.getPositions('moon', jdList);

  // Compute errors
  let sumRA2 = 0, sumDec2 = 0;
  const errors = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const j = jplPositions[i];
    let dRA = r.modelRA - j.ra;
    if (dRA > 180) dRA -= 360;
    if (dRA < -180) dRA += 360;
    const dDec = r.modelDec - j.dec;
    sumRA2 += dRA * dRA;
    sumDec2 += dDec * dDec;
    errors.push({ day: r.day, dRA, dDec, jplRA: j.ra, jplDec: j.dec, modelRA: r.modelRA, modelDec: r.modelDec });
  }

  const n = results.length;
  console.log(`Samples: ${n} (every 7 days, 2 years)`);
  console.log(`RMS RA:  ${Math.sqrt(sumRA2/n).toFixed(4)}°`);
  console.log(`RMS Dec: ${Math.sqrt(sumDec2/n).toFixed(4)}°`);
  console.log(`RMS Tot: ${Math.sqrt((sumRA2+sumDec2)/n).toFixed(4)}°`);

  // Analyze Dec error pattern
  console.log('\n--- Dec Error Pattern (first 6 months) ---');
  console.log('Day    dDec°    JPL Dec°   Model Dec°');
  for (const e of errors.slice(0, 26)) {
    console.log(`${e.day.toString().padStart(5)}  ${e.dDec.toFixed(3).padStart(8)}  ${e.jplDec.toFixed(3).padStart(9)}  ${e.modelDec.toFixed(3).padStart(9)}`);
  }

  // Dec error statistics
  console.log('\n--- Dec Error Statistics ---');
  const decErrors = errors.map(e => e.dDec);
  const maxDec = Math.max(...decErrors);
  const minDec = Math.min(...decErrors);
  const meanDec = decErrors.reduce((a,b) => a+b, 0) / n;
  console.log(`Max Dec error: +${maxDec.toFixed(3)}°`);
  console.log(`Min Dec error: ${minDec.toFixed(3)}°`);
  console.log(`Mean Dec error: ${meanDec.toFixed(3)}° (bias)`);

  // RA error statistics
  const raErrors = errors.map(e => e.dRA);
  const maxRA = Math.max(...raErrors);
  const minRA = Math.min(...raErrors);
  const meanRA = raErrors.reduce((a,b) => a+b, 0) / n;
  console.log(`\nMax RA error: +${maxRA.toFixed(3)}°`);
  console.log(`Min RA error: ${minRA.toFixed(3)}°`);
  console.log(`Mean RA error: ${meanRA.toFixed(3)}° (bias)`);

  // Check RA drift (frame effect)
  const firstHalf = errors.slice(0, Math.floor(n/2));
  const secondHalf = errors.slice(Math.floor(n/2));
  const meanRA1 = firstHalf.reduce((a,e) => a + e.dRA, 0) / firstHalf.length;
  const meanRA2 = secondHalf.reduce((a,e) => a + e.dRA, 0) / secondHalf.length;
  console.log(`\nRA bias year 1: ${meanRA1.toFixed(4)}°`);
  console.log(`RA bias year 2: ${meanRA2.toFixed(4)}°`);
  console.log(`RA drift rate: ${((meanRA2 - meanRA1) * 3600).toFixed(1)} arcsec/yr`);

  // Amplitude analysis: find peak-to-peak Dec error per lunar month
  console.log('\n--- Dec Error Amplitude Per Lunar Month ---');
  const monthDays = 27.5;
  for (let m = 0; m < 8; m++) {
    const start = m * monthDays;
    const end = (m + 1) * monthDays;
    const monthErrors = errors.filter(e => e.day >= start && e.day < end);
    if (monthErrors.length > 0) {
      const decErrs = monthErrors.map(e => e.dDec);
      const raErrs = monthErrors.map(e => e.dRA);
      console.log(`Month ${m+1}: Dec ${Math.min(...decErrs).toFixed(2)}° to ${Math.max(...decErrs).toFixed(2)}°, RA ${Math.min(...raErrs).toFixed(2)}° to ${Math.max(...raErrs).toFixed(2)}°`);
    }
  }

  // Check Dec amplitude: model vs JPL
  console.log('\n--- Ecliptic Latitude Amplitude Check ---');
  const jplMaxDec = Math.max(...errors.map(e => e.jplDec));
  const jplMinDec = Math.min(...errors.map(e => e.jplDec));
  const modelMaxDec = Math.max(...errors.map(e => e.modelDec));
  const modelMinDec = Math.min(...errors.map(e => e.modelDec));
  console.log(`JPL Dec range:   ${jplMinDec.toFixed(3)}° to ${jplMaxDec.toFixed(3)}° (amplitude: ${((jplMaxDec-jplMinDec)/2).toFixed(3)}°)`);
  console.log(`Model Dec range: ${modelMinDec.toFixed(3)}° to ${modelMaxDec.toFixed(3)}° (amplitude: ${((modelMaxDec-modelMinDec)/2).toFixed(3)}°)`);
}

analyze().catch(console.error);
