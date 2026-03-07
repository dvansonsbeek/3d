#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// PATCH PLANET_TEST_DATES — Add tier/weight/ra metadata to each entry in
//                            script.js and append Tycho Brahe Mars data
// ═══════════════════════════════════════════════════════════════════════════
//
// Reads reference-data.json for tier/weight/ra metadata, then rewrites the
// PLANET_TEST_DATES block in script.js with annotated entries.
//
// Changes per entry:
//   - Adds tier: 2 or 3 (existing), '1C' (Tycho)
//   - Adds weight: 0, 1, or 5
//   - Adds ra (JPL-enriched) where available and not already present
//   - Preserves all existing fields exactly
//
// Also appends 923 Tycho Brahe Mars declination entries (Tier 1C).
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, '..', '..', 'src', 'script.js');
const DATA_PATH = path.join(__dirname, '..', '..', 'config', 'reference-data.json');

// ═══════════════════════════════════════════════════════════════════════════
// 1. LOAD REFERENCE DATA
// ═══════════════════════════════════════════════════════════════════════════

const referenceData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

// Build lookup: planet -> jd -> metadata
const metaLookup = {};
for (const [planet, entries] of Object.entries(referenceData.planets)) {
  metaLookup[planet] = {};
  for (const e of entries) {
    metaLookup[planet][e.jd] = e;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. READ SCRIPT.JS AND FIND PLANET_TEST_DATES BLOCK
// ═══════════════════════════════════════════════════════════════════════════

const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8');
const scriptLines = scriptContent.split('\n');

// Find the start line: "const PLANET_TEST_DATES = {"
const startMarker = 'const PLANET_TEST_DATES = {';
let startLineIdx = -1;
for (let i = 0; i < scriptLines.length; i++) {
  if (scriptLines[i].includes(startMarker)) {
    startLineIdx = i;
    break;
  }
}

if (startLineIdx === -1) {
  console.error('ERROR: Could not find PLANET_TEST_DATES in script.js');
  process.exit(1);
}

// Find the end: matching closing "};""
let braceCount = 0;
let endLineIdx = -1;
for (let i = startLineIdx; i < scriptLines.length; i++) {
  for (const ch of scriptLines[i]) {
    if (ch === '{') braceCount++;
    if (ch === '}') {
      braceCount--;
      if (braceCount === 0) {
        endLineIdx = i;
        break;
      }
    }
  }
  if (endLineIdx !== -1) break;
}

if (endLineIdx === -1) {
  console.error('ERROR: Could not find end of PLANET_TEST_DATES');
  process.exit(1);
}

console.log(`Found PLANET_TEST_DATES: lines ${startLineIdx + 1} to ${endLineIdx + 1}`);

// ═══════════════════════════════════════════════════════════════════════════
// 3. PARSE EXISTING ENTRIES AND ANNOTATE
// ═══════════════════════════════════════════════════════════════════════════

// Extract the block text (lines between start and end)
const blockLines = scriptLines.slice(startLineIdx, endLineIdx + 1);
const blockText = blockLines.join('\n');

// We'll rebuild the block by parsing each planet's array
const planetOrder = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'halleys', 'eros'];

// Collect all comment lines before each planet section and the entries
// Strategy: find each "planetName: [" and its matching "]", extract entries and comments

function extractPlanetSection(text, planetName) {
  // Find "planetName: [" or "planetName : ["
  const patterns = [
    `${planetName}: [`,
    `${planetName} : [`,
  ];

  let sectionStart = -1;
  for (const pat of patterns) {
    sectionStart = text.indexOf(pat);
    if (sectionStart !== -1) break;
  }

  if (sectionStart === -1) return null;

  // Find the matching ]
  let bracketCount = 0;
  let sectionEnd = -1;
  for (let i = sectionStart; i < text.length; i++) {
    if (text[i] === '[') bracketCount++;
    if (text[i] === ']') {
      bracketCount--;
      if (bracketCount === 0) {
        sectionEnd = i + 1;
        break;
      }
    }
  }

  return { start: sectionStart, end: sectionEnd, text: text.substring(sectionStart, sectionEnd) };
}

// For each entry line, parse its properties and rebuild with added fields
function parseEntryLine(line) {
  // Match { ... } on a line
  const match = line.match(/\{([^}]+)\}/);
  if (!match) return null;

  const inner = match[1];
  const entry = {};

  // Parse each key: value pair
  const jdMatch = inner.match(/jd:\s*([\d.]+)/);
  if (jdMatch) entry.jd = parseFloat(jdMatch[1]);

  const raMatch = inner.match(/ra:\s*'([^']*)'/);
  if (raMatch) entry.ra = raMatch[1];

  const decMatch = inner.match(/dec:\s*'([^']*)'/);
  if (decMatch) entry.dec = decMatch[1];

  const lonMatch = inner.match(/longitude:\s*'([^']*)'/);
  if (lonMatch) entry.longitude = lonMatch[1];

  const typeMatch = inner.match(/type:\s*'([^']*)'/);
  if (typeMatch) entry.type = typeMatch[1];

  const labelMatch = inner.match(/label:\s*'([^']*)'/);
  if (labelMatch) entry.label = labelMatch[1];

  const showMatch = inner.match(/showOnScreen:\s*(true|false)/);
  if (showMatch) entry.showOnScreen = showMatch[1] === 'true';

  const cpMatch = inner.match(/comparePlanet:\s*'([^']*)'/);
  if (cpMatch) entry.comparePlanet = cpMatch[1];

  return entry;
}

function formatEntry(entry, indent) {
  const parts = [];

  // Preserve original field order, then add new fields at the end
  parts.push(`jd: ${entry.jd}`);

  if (entry.ra !== undefined) parts.push(`ra: '${entry.ra}'`);
  if (entry.dec !== undefined) parts.push(`dec: '${entry.dec}'`);
  if (entry.longitude !== undefined) parts.push(`longitude: '${entry.longitude}'`);

  parts.push(`type: '${entry.type}'`);
  parts.push(`label: '${entry.label}'`);

  if (entry.comparePlanet !== undefined) parts.push(`comparePlanet: '${entry.comparePlanet}'`);

  parts.push(`showOnScreen: ${entry.showOnScreen}`);

  // New fields
  parts.push(`tier: ${typeof entry.tier === 'string' ? `'${entry.tier}'` : entry.tier}`);
  parts.push(`weight: ${entry.weight}`);

  return `${indent}{ ${parts.join(', ')} }`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. BUILD NEW PLANET_TEST_DATES BLOCK
// ═══════════════════════════════════════════════════════════════════════════

// Collect all comment lines that appear before PLANET_TEST_DATES
// (the source URLs block from lines ~6815-6824)
const commentLines = [];
for (let i = startLineIdx - 10; i < startLineIdx; i++) {
  if (i >= 0 && scriptLines[i].startsWith('//')) {
    commentLines.push(scriptLines[i]);
  }
}

// Build the new block
const newLines = [];
newLines.push('const PLANET_TEST_DATES = {');

let totalOriginal = 0;
let totalAnnotated = 0;
let totalRaAdded = 0;
let tychoAdded = 0;

for (let pIdx = 0; pIdx < planetOrder.length; pIdx++) {
  const planet = planetOrder[pIdx];
  const section = extractPlanetSection(blockText, planet);

  if (!section) {
    console.log(`  WARNING: No section found for ${planet}`);
    continue;
  }

  // Extract comment lines and entries from the section
  const sectionLines = section.text.split('\n');
  const planetMeta = metaLookup[planet] || {};

  // Find the opening line and collect comments + entries
  let entryLines = [];
  let comments = [];
  let inArray = false;

  for (const sline of sectionLines) {
    const trimmed = sline.trim();
    if (!inArray && trimmed.includes('[')) {
      inArray = true;
      // Check if there's an entry on this same line
      if (trimmed.includes('{')) {
        entryLines.push(sline);
      }
      continue;
    }
    if (!inArray) continue;

    if (trimmed.startsWith('//')) {
      comments.push(trimmed);
      entryLines.push({ comment: trimmed });
    } else if (trimmed.includes('{')) {
      entryLines.push(sline);
    }
  }

  // Write planet section header with preserved comments
  // Find leading comments from the original section
  const origSectionInScript = blockText.substring(section.start);
  const linesBeforePlanet = [];

  // Look backward from section start in blockText for comments
  let scanPos = section.start - 1;
  while (scanPos >= 0 && blockText[scanPos] !== ']' && blockText[scanPos] !== '{') {
    scanPos--;
  }
  const preText = blockText.substring(scanPos + 1, section.start).trim();
  if (preText) {
    for (const cline of preText.split('\n')) {
      const ct = cline.trim();
      if (ct.startsWith('//')) {
        newLines.push('  ' + ct);
      }
    }
  }

  newLines.push(`  ${planet}: [`);

  // Process entries
  for (const item of entryLines) {
    if (item.comment) {
      newLines.push('    ' + item.comment);
      continue;
    }

    const parsed = parseEntryLine(item);
    if (!parsed || !parsed.jd) {
      // Can't parse — keep original line
      newLines.push(item);
      continue;
    }

    totalOriginal++;

    // Look up metadata from reference-data.json
    const meta = planetMeta[parsed.jd];

    if (meta) {
      parsed.tier = meta.tier;
      parsed.weight = meta.weight;

      // Add JPL RA if entry was enriched and doesn't already have RA
      if (meta.jpl_enriched && meta.ra_jpl && !parsed.ra) {
        parsed.ra = meta.ra_jpl + '°';
        totalRaAdded++;
      }
    } else {
      // No metadata found — assign defaults based on label
      if (parsed.label === 'Model start date (21 Jun 2000)') {
        parsed.tier = 2;
        parsed.weight = 1;
      } else {
        parsed.tier = 3;
        parsed.weight = 0;
      }
    }

    newLines.push(formatEntry(parsed, '    ') + ',');
    totalAnnotated++;
  }

  // For Mars: append Tycho Brahe observations
  if (planet === 'mars') {
    const tycho = referenceData.tier1_observations?.tycho_mars;
    if (tycho && tycho.entries && tycho.entries.length > 0) {
      newLines.push('    // ────────────────────────────────────────────────────────');
      newLines.push('    // TYCHO BRAHE MARS OBSERVATIONS (1582-1600)');
      newLines.push('    // Source: Tychonis Brahe Dani Opera Omnia, vols. 10 & 13');
      newLines.push('    // Digitized by Wayne Pafko (2000). Accuracy: 1-2 arcminutes.');
      newLines.push('    // Tier 1C: Pre-telescope precision observation (declination only)');
      newLines.push('    // ────────────────────────────────────────────────────────');

      for (const te of tycho.entries) {
        const tEntry = {
          jd: te.jd,
          dec: te.dec,
          type: 'observation',
          label: 'Tycho Brahe',
          showOnScreen: false,
          tier: '1C',
          weight: 5,
        };
        newLines.push(formatEntry(tEntry, '    ') + ',');
        tychoAdded++;
      }
    }
  }

  newLines.push('  ]' + (pIdx < planetOrder.length - 1 ? ',' : ''));
}

newLines.push('};');

// ═══════════════════════════════════════════════════════════════════════════
// 5. REPLACE BLOCK IN SCRIPT.JS
// ═══════════════════════════════════════════════════════════════════════════

const before = scriptLines.slice(0, startLineIdx);
const after = scriptLines.slice(endLineIdx + 1);

const newScript = [...before, ...newLines, ...after].join('\n');

// Safety check: the new script should be roughly the same size (plus additions)
const sizeDiff = newScript.length - scriptContent.length;
console.log(`\nSize change: ${sizeDiff > 0 ? '+' : ''}${sizeDiff} characters`);

fs.writeFileSync(SCRIPT_PATH, newScript);

// ═══════════════════════════════════════════════════════════════════════════
// 6. REPORT
// ═══════════════════════════════════════════════════════════════════════════

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('  PATCH PLANET_TEST_DATES — Summary');
console.log('═══════════════════════════════════════════════════════════════');
console.log();
console.log(`  Original entries annotated: ${totalAnnotated}`);
console.log(`  JPL RA values added:        ${totalRaAdded}`);
console.log(`  Tycho Mars entries added:    ${tychoAdded}`);
console.log(`  Total entries now:           ${totalAnnotated + tychoAdded}`);
console.log();
console.log(`  New fields per entry: tier, weight`);
console.log(`  JPL RA format: decimal degrees with ° suffix`);
console.log(`  Tycho entries: type='observation', label='Tycho Brahe', tier='1C', weight=5`);
console.log();
console.log('═══════════════════════════════════════════════════════════════');
