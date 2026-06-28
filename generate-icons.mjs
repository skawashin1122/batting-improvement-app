import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const iconDir = path.join(process.cwd(), 'public', 'icons')
const faviconPath = path.join(process.cwd(), 'public', 'favicon.svg')

if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true })
}

const sizes = [192, 512]

async function generateIcons() {
  try {
    for (const size of sizes) {
      const outputPath = path.join(iconDir, `icon-${size}.png`)
      await sharp(faviconPath)
        .resize(size, size, {
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath)
      console.log(`Generated ${outputPath}`)
    }
    console.log('Icon generation completed successfully')
  } catch (error) {
    console.error('Failed to generate icons:', error)
    process.exit(1)
  }
}

generateIcons()
