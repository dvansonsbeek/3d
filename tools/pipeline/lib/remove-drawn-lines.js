/**
 * remove-drawn-lines.js — plan 27 §8 L: the present-day coastlines and political boundaries
 * drawn in black ink on the PaleoAtlas rasters (Scotese 2016), removed.
 *
 * The atlas draws today's coastlines, country borders and the US state borders as 1–3 px lines
 * over every reconstruction — an anachronism at every age but today's (measured: 1.2–2.3 % of
 * a map). Pure in its input: a raw 8-bit RGB buffer in, a new one out, no file access.
 *
 * The mask — each step is the answer to a MEASURED failure of the one before:
 *  1. black-hat: closing(lum) − lum over a (2·radius+1)² window is large on dark features
 *     NARROWER than the window. Alone it also takes the painted relief and sea-floor texture
 *     of the young maps (13 % of the 100-Ma map) and the fill turns them into a mosaic.
 *  2. the ink's DARKNESS RATIO against its local background (lum ≤ ratio × closing and
 *     lum ≤ lumMax) — NOT its neutrality: the sources are 4:2:0 JPEG, so a black line over
 *     brown land carries the land's chroma (a neutral-black test left dashes of every line).
 *  3. LENGTH: the speckle painted on shallow seas and forests is ink-dark too (1.4–2.4 % of
 *     the young maps), but a dot is short and a line is long — only 8-connected components
 *     spanning ≥ minSpan px stay, or hollow ones (an island's outline: both sides of its
 *     bounding box ≥ ringSpan px with less than ringFill of the box inked).
 *  3b. FAINT ink: the US state grid is drawn thinner and lighter than the coastlines and
 *     passed step 2 only in dashes. A weaker darkness pair (faintContrast, faintRatio) is
 *     accepted only in components that are LONG (≥ faintSpan px) and THIN (at most faintCore
 *     of their pixels have all four neighbours in the component): a straight border is, a
 *     relief shadow or a texture patch is not. Measured: 0.80 % of the 300-Ma map (the grid)
 *     against 0.33 % of the 10-Ma map; a looser pair (0.6 / 25, span 30) took 1.5 % there.
 *  4. a dilation past the JPEG ringing beside the ink (1 px left a pale ghost of every line).
 * The fill: each masked pixel from the ORIGINAL unmasked pixels within fillRadius, weighted
 * 1/d³ (an outside-in neighbour average faceted the textured land); what no window reaches
 * is filled outside-in from already filled neighbours.
 *
 * Tried and dropped, both measured on the 10-Ma map: growing the kept lines on a weaker
 * contrast (it leaks into the mountain relief: the filled share 8 % → 13 %, faceted), and a
 * weaker pair on the darkest sea (it takes the sea-floor texture: the lines' share 2.3 % →
 * 5.2 %). What stays in: a few line fragments over the darkest deep sea, where black ink on
 * navy never reaches the contrast, and island outlines shorter than minSpan that are not
 * hollow enough to pass the ring test.
 */

'use strict';

const DEFAULTS = Object.freeze({ radius: 3, contrast: 28, lumMax: 70, ratio: 0.45, minSpan: 24, ringSpan: 9, ringFill: 0.4, faintContrast: 22, faintRatio: 0.65, faintSpan: 40, faintCore: 0.2, dilate: 2, fillRadius: 6 });

/**
 * @param {Buffer} rgb raw 8-bit RGB, row-major, width × height × 3 (longitude wraps in x)
 * @param {number} width @param {number} height
 * @param {Partial<typeof DEFAULTS>} [opts]
 * @returns {{ rgb: Buffer, stats: { lineFraction: number, dotFraction: number, faintFraction: number, filledFraction: number } }}
 *   the cleaned buffer; the map's share inked as lines, the ink-dark share left as dots, the share
 *   added as faint lines, the share filled
 */
function removeDrawnLines(rgb, width, height, opts = {}) {
  const k = { ...DEFAULTS, ...opts };
  const W = width, H = height, N = W * H;
  if (rgb.length !== 3 * N) throw new Error(`removeDrawnLines: ${rgb.length} bytes for ${W} × ${H} × 3`);
  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = 0.299 * rgb[3 * i] + 0.587 * rgb[3 * i + 1] + 0.114 * rgb[3 * i + 2];
  const wrap = (/** @type {number} */ x) => (x + W) % W;

  /** A separable square min or max filter of half-width r. @param {Float32Array} a @param {number} r @param {boolean} isMax */
  const filt = (a, r, isMax) => {
    const t = new Float32Array(N), o = new Float32Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = a[y * W + x];
      for (let d = -r; d <= r; d++) { const q = a[y * W + wrap(x + d)]; if (isMax ? q > v : q < v) v = q; }
      t[y * W + x] = v;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = t[y * W + x];
      for (let d = -r; d <= r; d++) { const yy = y + d; if (yy < 0 || yy >= H) continue; const q = t[yy * W + x]; if (isMax ? q > v : q < v) v = q; }
      o[y * W + x] = v;
    }
    return o;
  };
  const closing = filt(filt(lum, k.radius, true), k.radius, false);

  // steps 1 + 2: thin, and dark against its own background
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (closing[i] - lum[i] > k.contrast && lum[i] <= k.lumMax && lum[i] <= k.ratio * closing[i]) mask[i] = 1;

  // step 3: length — the long components and the hollow ones are lines, the rest is painted speckle
  let lines = 0, dots = 0;
  {
    const seen = new Uint8Array(N), stack = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (!mask[s] || seen[s]) continue;
      let top = 0, x0 = W, x1 = -1, y0 = H, y1 = -1;
      /** @type {number[]} */ const comp = [];
      stack[top++] = s; seen[s] = 1;
      while (top) {
        const i = stack[--top]; comp.push(i);
        const y = (i / W) | 0, x = i - y * W;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx; if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
          const j = yy * W + xx; if (mask[j] && !seen[j]) { seen[j] = 1; stack[top++] = j; }
        }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const hollow = Math.min(bw, bh) >= k.ringSpan && comp.length < k.ringFill * bw * bh;
      if (Math.max(bw, bh) - 1 >= k.minSpan || hollow) lines += comp.length;
      else { dots += comp.length; for (const i of comp) mask[i] = 0; }
    }
  }

  // step 3b: faint ink, accepted only in long thin components (the main lines join them: a border
  // that passed step 2 in dashes is one component here)
  let faint = 0;
  {
    const cand = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (mask[i] || (closing[i] - lum[i] > k.faintContrast && lum[i] <= k.faintRatio * closing[i])) cand[i] = 1;
    const seen = new Uint8Array(N), stack = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (!cand[s] || seen[s]) continue;
      let top = 0, x0 = W, x1 = -1, y0 = H, y1 = -1, core = 0;
      /** @type {number[]} */ const comp = [];
      stack[top++] = s; seen[s] = 1;
      while (top) {
        const i = stack[--top]; comp.push(i);
        const y = (i / W) | 0, x = i - y * W;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x > 0 && x < W - 1 && y > 0 && y < H - 1 && cand[i - 1] && cand[i + 1] && cand[i - W] && cand[i + W]) core++;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx; if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
          const j = yy * W + xx; if (cand[j] && !seen[j]) { seen[j] = 1; stack[top++] = j; }
        }
      }
      if (Math.max(x1 - x0, y1 - y0) >= k.faintSpan && core <= k.faintCore * comp.length) for (const i of comp) if (!mask[i]) { mask[i] = 1; faint++; }
    }
  }

  // step 4: the dilation past the ringing
  const hole = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0;
    for (let dy = -k.dilate; dy <= k.dilate && !v; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -k.dilate; dx <= k.dilate && !v; dx++) v = mask[yy * W + wrap(x + dx)]; }
    hole[y * W + x] = v;
  }

  // the fill, from the original unmasked pixels
  const out = Buffer.from(rgb);
  const left = Uint8Array.from(hole);
  let filled = 0, remaining = 0;
  const FR = k.fillRadius;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!hole[i]) continue;
    let r = 0, g = 0, b = 0, w = 0;
    for (let dy = -FR; dy <= FR; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= H) continue;
      for (let dx = -FR; dx <= FR; dx++) {
        const j = yy * W + wrap(x + dx); if (hole[j]) continue;
        const q = 1 / (dx * dx + dy * dy) ** 1.5;
        r += q * rgb[3 * j]; g += q * rgb[3 * j + 1]; b += q * rgb[3 * j + 2]; w += q;
      }
    }
    if (w > 0) { out[3 * i] = Math.round(r / w); out[3 * i + 1] = Math.round(g / w); out[3 * i + 2] = Math.round(b / w); left[i] = 0; filled++; } else remaining++;
  }
  while (remaining > 0) {
    /** @type {number[][]} */ const fill = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!left[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -1; dx <= 1; dx++) { const j = yy * W + wrap(x + dx); if (left[j]) continue; r += out[3 * j]; g += out[3 * j + 1]; b += out[3 * j + 2]; n++; } }
      if (n >= 2) fill.push([i, Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
    }
    if (!fill.length) break;
    for (const [i, r, g, b] of fill) { out[3 * i] = r; out[3 * i + 1] = g; out[3 * i + 2] = b; left[i] = 0; }
    remaining -= fill.length; filled += fill.length;
  }
  return { rgb: out, stats: { lineFraction: lines / N, dotFraction: dots / N, faintFraction: faint / N, filledFraction: filled / N } };
}

module.exports = { removeDrawnLines, REMOVE_DRAWN_LINES_DEFAULTS: DEFAULTS };
