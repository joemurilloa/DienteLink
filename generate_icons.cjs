const sharp = require('sharp');
const path = require('path');

const inputSvg = path.join(__dirname, 'public', 'icon.svg');
const output192 = path.join(__dirname, 'public', 'pwa-192x192.png');
const output512 = path.join(__dirname, 'public', 'pwa-512x512.png');

async function generateIcons() {
  try {
    await sharp(inputSvg)
      .resize(192, 192)
      .png()
      .toFile(output192);
    
    await sharp(inputSvg)
      .resize(512, 512)
      .png()
      .toFile(output512);

    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
