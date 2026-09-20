import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../assets/brand/pace-master.png', import.meta.url))
const variants = [
  ['pace-favicon-32.png', 32],
  ['pace-favicon-48.png', 48],
  ['pace-apple-touch-icon.png', 180],
  ['pace-icon-192.png', 192],
  ['pace-icon-512.png', 512],
]

for (const [filename, size] of variants) {
  const destination = fileURLToPath(new URL(`../public/${filename}`, import.meta.url))
  await sharp(source).resize(size, size).flatten({ background: '#C74E28' }).png({ compressionLevel: 9 }).toFile(destination)
  const metadata = await sharp(destination).metadata()
  if (metadata.width !== size || metadata.height !== size || metadata.hasAlpha) throw new Error(`Invalid icon: ${filename}`)
  console.log(`${filename}: ${size} × ${size}, opaque PNG`)
}
