// Draws the dithered-dunes scene with no dependencies:
//   node gen-dunes.mjs <preview.png> <hooks/scene.ts>
// The SVG carries a day and a night palette and switches with prefers-color-scheme.
// The PNG previews are <preview>.png (day) and <preview>-night.png.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const out = process.argv[2]
const W = 2560, H = 1600, C = 8, DOT = 5
const GW = W / C, GH = H / C
// Slots: ground, four dune shades (back to front), sun, sun halo. Dune dots stay close to the ground so text reads.
const PALETTES = {
  day: ['#ede3cf', '#e0d3b8', '#cfbd9c', '#bea98a', '#a99274', '#d9644a', '#e9a48c'],
  night: ['#231d18', '#352c24', '#43382e', '#56483a', '#6b5a48', '#c4553b', '#7a3d2c'],
}
const GLOW = { day: '#e47a5c', night: '#c4553b' }
const [BG, S1, S2, S3, S4, SUN, HALO] = PALETTES.day.keys()
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + 0.5) / 16))
const clamp = v => Math.max(0, Math.min(1, v))
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }

// Dune crests as a fraction of height, x in 0..1.
const back = x => 0.70 - 0.07 * Math.sin(x * 5.2 + 0.6) - 0.04 * Math.sin(x * 11 + 2)
const front = x => 0.84 - 0.09 * Math.sin(x * 4.1 - 0.9) - 0.03 * Math.sin(x * 13 + 1)
const SUN_X = 0.87, SUN_Y = 0.30

function cell(gx, gy) {
  const x = (gx + 0.5) / GW, y = (gy + 0.5) / GH, t = BAYER[gy % 4][gx % 4]
  // Keep the reading column (middle) quiet.
  const side = 0.3 + 0.7 * clamp(Math.abs(x - 0.5) * 2.4)

  const sx = (x - SUN_X) * (W / H), sy = y - SUN_Y, d = Math.hypot(sx, sy)
  if (d < 0.075) return t < 0.95 ? SUN : HALO
  if (d < 0.16) return t < 1 - (d - 0.075) / 0.085 ? (d < 0.11 ? SUN : HALO) : BG

  const f = front(x)
  if (Math.abs(y - f) < 0.006 && x > 0.78) return SUN
  if (y > f) return t < clamp((y - f) / 0.12) * 0.6 * side ? (y - f > 0.07 ? S4 : S3) : BG
  const b = back(x)
  if (y > b) return t < clamp((y - b) / 0.2) * 0.5 * side ? (y - b > 0.1 ? S2 : S1) : BG

  if (x < 0.1 && y > 0.25 && y < 0.6 && hash(gx, gy) < 0.25 * (1 - x / 0.1)) return S1
  return BG
}

const grid = new Uint8Array(GW * GH)
for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) grid[gy * GW + gx] = cell(gx, gy)

// PNG previews (indexed color), one per palette.
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = b => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => {
  const td = Buffer.concat([Buffer.from(type), data]), len = Buffer.alloc(4), c = Buffer.alloc(4)
  len.writeUInt32BE(data.length); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c])
}
const raw = Buffer.alloc((W + 1) * H)
for (let y = 0; y < H; y++) {
  const row = y * (W + 1), gy = Math.floor(y / C), inDot = y % C < DOT
  for (let x = 0; x < W; x++) raw[row + 1 + x] = inDot && x % C < DOT ? grid[gy * GW + Math.floor(x / C)] : BG
}
const idat = chunk('IDAT', deflateSync(raw, { level: 9 }))
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr.set([8, 3, 0, 0, 0], 8)
for (const [name, pal] of Object.entries(PALETTES)) {
  const plte = Buffer.from(pal.flatMap(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))))
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte), idat, chunk('IEND', Buffer.alloc(0))])
  const file = name === 'day' ? out : out.replace(/\.png$/, '-night.png')
  writeFileSync(file, png)
  console.log(file, png.length, 'bytes')
}

// The SVG scene: one path per slot, each dot a zero-length square-capped stroke; colors come from classes.
const paths = PALETTES.day.map((_, i) => {
  if (i === BG) return ''
  let d = ''
  for (let gy = 0; gy < GH; gy++) {
    let lastX = null
    for (let gx = 0; gx < GW; gx++) {
      if (grid[gy * GW + gx] !== i) continue
      d += lastX === null ? `M${gx + 0.5} ${gy + 0.5}h0` : `m${gx - lastX} 0h0`
      lastX = gx
    }
  }
  return d && `<path class="c${i}" d="${d}"/>`
}).join('')
const rules = (pal, glow) => pal.map((hex, i) => i === BG ? `.c0{fill:${hex}}` : `.c${i}{stroke:${hex}}`).join('') + `.glow{stop-color:${glow}}`
const style = rules(PALETTES.day, GLOW.day) + `@media (prefers-color-scheme: dark){${rules(PALETTES.night, GLOW.night)}}`
const cx = SUN_X * GW, cy = SUN_Y * GH
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GW} ${GH}" preserveAspectRatio="xMidYMid slice"><style>${style}</style>` +
  `<defs><radialGradient id="g"><stop offset="0" class="glow" stop-opacity=".55"/><stop offset="1" class="glow" stop-opacity="0"/></radialGradient></defs>` +
  `<rect class="c0" width="${GW}" height="${GH}"/><circle cx="${cx}" cy="${cy}" r="${0.2 * GH}" fill="url(#g)"/>` +
  `<g fill="none" stroke-width="${DOT / C}" stroke-linecap="square" shape-rendering="crispEdges">${paths}</g></svg>`
const sceneTs = process.argv[3]
if (sceneTs) {
  writeFileSync(sceneTs, `// Generated by ../gen-dunes.mjs. Don't edit.\nexport const SCENE = ${JSON.stringify(svg)}\n`)
  console.log(sceneTs, svg.length, 'chars', svg.length < 131072 ? 'OK (< 131072)' : 'TOO BIG')
}
