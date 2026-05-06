#!/usr/bin/env node
/**
 * One-time PWA icon generator — no runtime dependency.
 * Produces icon-192.png and icon-512.png in public/icons/.
 * Design: #0A0A0A background, white AXIS_OS crosshair mark centred.
 */

const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

// ── CRC32 (required by PNG spec) ────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function encodePNG(width, height, rgb) {
  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB

  // Raw scanlines: 1 filter byte + RGB per pixel
  const rows = []
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3)
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 3
      row[1 + x * 3] = rgb[s]; row[2 + x * 3] = rgb[s + 1]; row[3 + x * 3] = rgb[s + 2]
    }
    rows.push(row)
  }
  const idat = zlib.deflateSync(Buffer.concat(rows), { level: 9 })

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Pixel drawing helpers ────────────────────────────────────────────────────
function setPixel(rgb, w, x, y, r, g, b) {
  if (x < 0 || x >= w || y < 0 || y >= w) return
  const i = (y * w + x) * 3
  rgb[i] = r; rgb[i + 1] = g; rgb[i + 2] = b
}

function drawThickLine(rgb, w, x0, y0, x1, y1, half) {
  // Bresenham + stroke width
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx - dy, x = x0, y = y0
  const h = Math.ceil(half)
  while (true) {
    for (let oy = -h; oy <= h; oy++)
      for (let ox = -h; ox <= h; ox++)
        if (ox * ox + oy * oy <= half * half + 0.5)
          setPixel(rgb, w, x + ox, y + oy, 250, 250, 250)
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x += sx }
    if (e2 < dx)  { err += dx; y += sy }
  }
}

function drawDisc(rgb, w, cx, cy, r) {
  const ri = Math.ceil(r)
  for (let oy = -ri; oy <= ri; oy++)
    for (let ox = -ri; ox <= ri; ox++)
      if (ox * ox + oy * oy <= r * r + 0.5)
        setPixel(rgb, w, cx + ox, cy + oy, 250, 250, 250)
}

// ── Icon renderer ────────────────────────────────────────────────────────────
// Replicates the 18×18 crosshair SVG at any target size.
function renderIcon(size) {
  const rgb = Buffer.alloc(size * size * 3, 0x0a) // fill #0A0A0A

  // Safe-zone: use 50 % of size so the mark is comfortably inside maskable area
  const markPx = size * 0.50
  const scale  = markPx / 18          // SVG viewBox is 18×18
  const ox     = size / 2 - 9 * scale // offset so SVG origin maps to centre
  const oy     = size / 2 - 9 * scale

  const s = (svgX, svgY) => [Math.round(ox + svgX * scale), Math.round(oy + svgY * scale)]
  const sw = Math.max(1, scale * 1.4) // stroke width scaled from 1.4

  // Main axes
  const [lx, ly] = s(9, 1);  const [lx2, ly2] = s(9, 17); drawThickLine(rgb, size, lx, ly, lx2, ly2, sw / 2)
  const [hx, hy] = s(1, 9);  const [hx2, hy2] = s(17, 9); drawThickLine(rgb, size, hx, hy, hx2, hy2, sw / 2)

  // Four short ticks
  { const [a0, b0] = s(1, 7);  const [a1, b1] = s(1, 11); drawThickLine(rgb, size, a0, b0, a1, b1, sw / 2) }
  { const [a0, b0] = s(17, 7); const [a1, b1] = s(17, 11);drawThickLine(rgb, size, a0, b0, a1, b1, sw / 2) }
  { const [a0, b0] = s(7, 1);  const [a1, b1] = s(11, 1); drawThickLine(rgb, size, a0, b0, a1, b1, sw / 2) }
  { const [a0, b0] = s(7, 17); const [a1, b1] = s(11, 17);drawThickLine(rgb, size, a0, b0, a1, b1, sw / 2) }

  // Centre dot (r=2.2 in SVG)
  const [cx, cy] = s(9, 9)
  drawDisc(rgb, size, cx, cy, 2.2 * scale)

  return encodePNG(size, size, rgb)
}

// ── Write files ──────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(file, renderIcon(size))
  console.log(`✓ ${file} (${size}×${size})`)
}
console.log('Done.')
