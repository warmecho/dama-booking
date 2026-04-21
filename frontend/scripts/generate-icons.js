// PWA 图标生成脚本
// 需要安装 sharp: npm install -D sharp

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const svgBuffer = readFileSync(join(__dirname, '../public/pwa-icons.svg'))

async function generateIcons() {
  for (const size of sizes) {
    const outputFile = join(__dirname, `../public/icon-${size}x${size}.png`)
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputFile)
    console.log(`✓ Generated icon-${size}x${size}.png`)
  }
  console.log('\n所有图标生成完成！')
}

generateIcons().catch(console.error)
