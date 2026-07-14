import sharp from 'sharp';
import path from 'path';

const inputPath = 'C:\\Users\\usEr\\.gemini\\antigravity-ide\\brain\\73c2ea2e-ec65-4b20-b0b7-513c400125e9\\line_rich_menu_banner_1784005402276.png';
const outputPath = path.join(process.cwd(), 'public', 'rich_menu_1200x810.png');

async function resizeImage() {
  try {
    await sharp(inputPath)
      .resize(1200, 810, {
        fit: 'cover',
        position: 'center'
      })
      .toFile(outputPath);
    console.log(`Successfully resized image to 1200x810 and saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error resizing image:', error);
  }
}

resizeImage();
