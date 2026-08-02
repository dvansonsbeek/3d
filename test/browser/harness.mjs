/**
 * Headless-browser harness for the `src/script.js` golden masters (plan §5c).
 *
 * WHY A BROWSER. `script.js` constructs `new THREE.WebGLRenderer(...)` at module
 * scope (:12486), so importing it needs a real GL context — jsdom cannot supply
 * one. Chromium's SwiftShader can, and the same path works in CI.
 *
 * WHY THE BUILT BUNDLE, NOT THE SOURCE. Testing `dist/` tests what actually
 * ships. Parcel emits absolute asset paths (`src=/3d.<hash>.js`), so `file://`
 * would 404 — hence the tiny static server rather than a direct file load.
 *
 * The page reaches module-scope line 60,096 of 64,673 and is deterministic
 * across fresh loads; both were verified by spike before this was written.
 *
 * Retires at Phase 8, when the physics is importable with no browser.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIST = join(ROOT, 'dist');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.csv': 'text/csv', '.map': 'application/json', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

/** Serve `dist/` on an ephemeral port. */
export async function serveDist() {
  try {
    await stat(join(DIST, 'index.html'));
  } catch {
    throw new Error('dist/index.html missing — run `npm run build` first.');
  }
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const path = join(DIST, normalize(url === '/' ? '/index.html' : url));
      if (!path.startsWith(DIST)) { res.writeHead(403).end(); return; }
      await stat(path);
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
      res.end(await readFile(path));
    } catch { res.writeHead(404).end('not found'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, close: () => server.close() };
}

/**
 * Launch Chromium, load the bundle, and assert the test surface is present.
 * Returns `{ page, browser, server, errors }`; call `dispose()` when done.
 */
export async function openSimulator({ timeout = 90_000 } = {}) {
  const pw = await import('playwright');
  const chromium = (pw.default ?? pw).chromium;

  const server = await serveDist();
  const browser = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // Do not count the resource failures WE caused. Blocking the remote textures
    // makes Chromium log ~47 "Failed to load resource" lines; counting those
    // would leave `errors` permanently non-empty and silently destroy the
    // signal every caller uses to assert the page came up clean.
    const t = m.text();
    if (/net::ERR_FAILED|Failed to load resource/i.test(t)) return;
    errors.push(`console: ${t}`);
  });

  // HERMETIC. In production the app deliberately fetches its data from
  // raw.githubusercontent.com; the same files also live in `public/`. The
  // original `waitUntil: 'load'` therefore waited on ~45 GitHub requests, so a
  // golden-master test of pure arithmetic depended on GitHub being reachable and
  // fast — it passed in CI and then hung for 90 s locally.
  //
  // Data files are SERVED FROM public/ so the page behaves as it does in
  // production. Images are aborted: 40-odd planet textures cannot change a year
  // length, and fetching them only makes the test slow.
  const PUBLIC = join(ROOT, 'public');
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(`http://127.0.0.1:${server.port}`) || url.startsWith('data:')) {
      return route.continue();
    }
    const rel = url.replace(/^https?:\/\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/public\//, '');
    if (rel !== url && /\.(json|csv|txt)$/i.test(rel)) {
      try {
        const body = await readFile(join(PUBLIC, rel));
        return route.fulfill({ status: 200, contentType: TYPES[extname(rel)] ?? 'application/json', body });
      } catch { /* fall through to abort */ }
    }
    return route.abort();
  });

  // `domcontentloaded` + an explicit wait for the surface, rather than `load`:
  // the values under test exist as soon as module scope finishes, and nothing
  // later in the load event can change them.
  await page.goto(`http://127.0.0.1:${server.port}/index.html`, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => typeof window.__test__ === 'object' && window.__test__ !== null, null, { timeout });

  const surface = await page.evaluate(() =>
    (typeof window.__test__ === 'object' && window.__test__ !== null)
      ? Object.keys(window.__test__) : null);
  if (!surface) {
    await browser.close(); server.close();
    throw new Error('window.__test__ absent — is dist/ a stale build? Run `npm run build`.');
  }

  const dispose = async () => { await browser.close(); server.close(); };
  return { page, browser, server, errors, surface, dispose };
}
