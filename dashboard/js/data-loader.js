// ═══════════════════════════════════════════════════════════════════════════
// DATA LOADER — Fetch JSON data files with caching
// ═══════════════════════════════════════════════════════════════════════════

const cache = new Map();

export async function loadPlanetData(planetName) {
  if (cache.has(planetName)) return cache.get(planetName);

  const resp = await fetch(`data/${planetName}.json`);
  if (!resp.ok) throw new Error(`Failed to load ${planetName}.json: ${resp.status}`);
  const data = await resp.json();
  cache.set(planetName, data);
  return data;
}

export async function loadCombinedData() {
  if (cache.has('_combined')) return cache.get('_combined');

  const resp = await fetch('data/combined.json');
  if (!resp.ok) throw new Error('Failed to load combined.json');
  const data = await resp.json();
  cache.set('_combined', data);
  return data;
}

export async function loadMetadata() {
  if (cache.has('_meta')) return cache.get('_meta');

  const resp = await fetch('data/metadata.json');
  if (!resp.ok) throw new Error('Failed to load metadata.json');
  const data = await resp.json();
  cache.set('_meta', data);
  return data;
}
