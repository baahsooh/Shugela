/**
 * Generates the PWA icon set with zero dependencies.
 *
 * Writes solid, anti-aliased PNGs (rounded-square brand tile + white droplet)
 * into public/icons. Run with `npm run icons`.
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const BRAND_TOP = [58, 58, 58]; // #3a3a3a
const BRAND_BOTTOM = [17, 17, 17]; // #111111
const GLYPH = [255, 255, 255];
const GLOSS = [224, 224, 224];

/* ------------------------------------------------------------------ PNG --- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** @param {{width:number,height:number,rgba:Buffer}} image */
function encodePng({ width, height, rgba }) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- shapes --- */

/** Signed distance to a rounded rectangle centred on the origin. */
function sdRoundedRect(px, py, halfW, halfH, radius) {
  const qx = Math.abs(px) - (halfW - radius);
  const qy = Math.abs(py) - (halfH - radius);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - radius;
}

/** Signed distance to the blood-drop mark (circle bulb + tangent taper). */
function sdDrop(px, py) {
  const radius = 0.28;
  const bulbY = 0.2;
  const tipY = -0.46;

  // The taper is a power curve that meets the bulb circle tangentially at
  // 40° above centre, which keeps the shoulder smooth instead of kinked.
  const phi = (-40 * Math.PI) / 180;
  const joinX = radius * Math.cos(phi);
  const joinY = bulbY + radius * Math.sin(phi);
  const run = joinY - tipY;
  const power = (Math.tan(-phi) * run) / joinX;

  if (Math.hypot(px, py - bulbY) <= radius) return -1;

  if (py >= tipY && py <= joinY) {
    const t = (py - tipY) / run;
    if (Math.abs(px) <= joinX * Math.pow(t, power)) return -1;
  }

  return 1;
}

/* ---------------------------------------------------------------- render --- */

const SAMPLES = 4; // 4x4 supersampling per pixel

function renderIcon(size, { bleed = false, scale = 1 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const half = size / 2;
  const cornerRadius = size * 0.225;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bgCoverage = 0;
      let glyphCoverage = 0;
      let highlightCoverage = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = x + (sx + 0.5) / SAMPLES - half;
          const py = y + (sy + 0.5) / SAMPLES - half;

          if (bleed || sdRoundedRect(px, py, half, half, cornerRadius) <= 0) bgCoverage += 1;

          // Normalise into [-1, 1] space, then apply the glyph scale.
          const nx = px / half / scale;
          const ny = py / half / scale;
          if (sdDrop(nx, ny) <= 0) glyphCoverage += 1;

          // Soft highlight inside the bulb (smooth radial falloff, not a hard disc).
          const glossDistance = Math.hypot(nx + 0.095, ny - 0.06);
          if (glossDistance < 0.1) highlightCoverage += (1 - glossDistance / 0.1) ** 2;
        }
      }

      const total = SAMPLES * SAMPLES;
      const bg = bgCoverage / total;
      const glyph = glyphCoverage / total;
      const highlight = highlightCoverage / total;

      const gradient = y / (size - 1);
      const bgColor = BRAND_TOP.map((channel, i) =>
        Math.round(channel + (BRAND_BOTTOM[i] - channel) * gradient),
      );

      let [r, g, b] = bgColor;
      if (bg > 0) {
        r = Math.round(r + (GLYPH[0] - r) * glyph);
        g = Math.round(g + (GLYPH[1] - g) * glyph);
        b = Math.round(b + (GLYPH[2] - b) * glyph);

        // Soft gloss on the upper-left of the bulb.
        const gloss = highlight * glyph * 0.6;
        r = Math.round(r + (GLOSS[0] - r) * gloss);
        g = Math.round(g + (GLOSS[1] - g) * gloss);
        b = Math.round(b + (GLOSS[2] - b) * gloss);
      }

      const offset = (y * size + x) * 4;
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
      rgba[offset + 3] = Math.round(bg * 255);
    }
  }

  return encodePng({ width: size, height: size, rgba });
}

/* ------------------------------------------------------------------ main --- */

const targets = [
  { file: "icon-192.png", size: 192, options: {} },
  { file: "icon-512.png", size: 512, options: {} },
  { file: "apple-touch-icon.png", size: 180, options: { bleed: true } },
  // Maskable icons are cropped to a circle by Android, so keep the mark small
  // and full-bleed the background.
  { file: "maskable-512.png", size: 512, options: { bleed: true, scale: 0.62 } },
  { file: "favicon-32.png", size: 32, options: {} },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const target of targets) {
  const png = renderIcon(target.size, target.options);
  writeFileSync(join(OUT_DIR, target.file), png);
  console.log(`icons/${target.file}  ${target.size}x${target.size}  ${(png.length / 1024).toFixed(1)} kB`);
}