/**
 * Export Duolingo-style mascot icon set from AI master.
 * Flood-fills background from edges (preserves orange frill spots).
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const MASTER = path.resolve(
  'C:/Users/hoang/.cursor/projects/d-DOAN/assets/mascot-icon-master-1024.jpg'
);
const OUT = path.resolve('d:/DOAN/mobile/assets/images');
const SIZE = 1024;
const ORANGE = { r: 249, g: 115, b: 22 }; // #f97316
const CREAM = { r: 250, g: 248, b: 245 }; // #faf8f5

function isBg(r, g, b) {
  if (r > 235 && g > 235 && b > 230) return true;
  // solid brand-orange backdrop (not character orange accents)
  if (r >= 220 && g >= 70 && g <= 175 && b <= 70 && r - b > 140) return true;
  return false;
}

async function maskBackground(rgba, w, h) {
  const visited = new Uint8Array(w * h);
  const q = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (visited[i]) return;
    const o = i * 4;
    if (!isBg(rgba[o], rgba[o + 1], rgba[o + 2])) return;
    visited[i] = 1;
    q.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (rgba[o] > 235 && rgba[o + 1] > 235 && rgba[o + 2] > 230) {
      visited[i] = 1;
      q.push(i);
    }
  }
  let qi = 0;
  while (qi < q.length) {
    const i = q[qi++];
    const x = i % w;
    const y = (i / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return visited;
}

async function toPng(buf, w, h) {
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const { data, info } = await sharp(MASTER)
    .ensureAlpha()
    .resize(SIZE, SIZE, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const rgba = Buffer.from(data);
  const visited = await maskBackground(rgba, w, h);

  const iconData = Buffer.from(rgba);
  const splashData = Buffer.from(rgba);
  const fgData = Buffer.from(rgba);
  for (let i = 0; i < w * h; i++) {
    if (!visited[i]) continue;
    const o = i * 4;
    iconData[o] = ORANGE.r;
    iconData[o + 1] = ORANGE.g;
    iconData[o + 2] = ORANGE.b;
    iconData[o + 3] = 255;
    splashData[o] = CREAM.r;
    splashData[o + 1] = CREAM.g;
    splashData[o + 2] = CREAM.b;
    splashData[o + 3] = 255;
    fgData[o + 3] = 0;
  }

  const icon = await toPng(iconData, w, h);
  const splash = await toPng(splashData, w, h);
  const fgFull = await toPng(fgData, w, h);

  const box = Math.round(SIZE * 0.9);
  const scaled = await sharp(fgFull)
    .resize(box, box, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const left = Math.floor((SIZE - box) / 2);
  const top = Math.floor((SIZE - box) / 2);
  const foreground = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: scaled, left, top }])
    .png()
    .toBuffer();

  const background = await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: ORANGE },
  })
    .png()
    .toBuffer();

  const { data: fd, info: fi } = await sharp(foreground)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const monoRaw = Buffer.alloc(fd.length);
  for (let i = 0; i < fd.length; i += 4) {
    monoRaw[i] = 255;
    monoRaw[i + 1] = 255;
    monoRaw[i + 2] = 255;
    monoRaw[i + 3] = fd[i + 3];
  }
  const monochrome = await sharp(monoRaw, {
    raw: { width: fi.width, height: fi.height, channels: 4 },
  })
    .png()
    .toBuffer();
  const favicon = await sharp(icon).resize(48, 48).png().toBuffer();

  const writes = [
    ['icon.png', icon],
    ['splash-icon.png', splash],
    ['android-icon-foreground.png', foreground],
    ['android-icon-background.png', background],
    ['android-icon-monochrome.png', monochrome],
    ['favicon.png', favicon],
    ['mascot-icon-master.png', icon],
  ];
  for (const [name, buf] of writes) {
    fs.writeFileSync(path.join(OUT, name), buf);
    const m = await sharp(buf).metadata();
    console.log('wrote', name, `${m.width}x${m.height}`, `${buf.length} bytes`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
