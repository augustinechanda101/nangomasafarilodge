import sharp from 'sharp';

const SRC = 'public/nangomalogo.webp';

const img = sharp(SRC);
const { width, height } = await img.metadata();
const raw = await img.raw().toBuffer();

const px = (x, y) => {
  const i = (y * width + x) * 4;
  return [raw[i], raw[i + 1], raw[i + 2]];
};
const bg = px(0, 0);
const isArt = (x, y) => {
  const [r, g, b] = px(x, y);
  return Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) > 60;
};

let minX = width, maxX = -1, minY = height, maxY = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (isArt(x, y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const leftGap = minX, rightGap = width - 1 - maxX, topGap = minY, bottomGap = height - 1 - maxY;
console.log(`canvas ${width}x${height}`);
console.log(`artwork bbox: x ${minX}..${maxX}, y ${minY}..${maxY}`);
console.log(`gaps  L:${leftGap} R:${rightGap}  T:${topGap} B:${bottomGap}`);

// Crop to artwork + small even padding so the artwork is centered in the canvas
const pad = 6;
const cropX = Math.max(0, minX - pad);
const cropY = Math.max(0, minY - pad);
const cropW = Math.min(width, maxX + pad + 1) - cropX;
const cropH = Math.min(height, maxY + pad + 1) - cropY;

await sharp(SRC).extract({ left: cropX, top: cropY, width: cropW, height: cropH })
  .webp()
  .toFile('public/nangomalogo-crop.webp');

console.log(`cropped -> public/nangomalogo-crop.webp (${cropW}x${cropH})`);
