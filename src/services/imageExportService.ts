import * as htmlToImage from 'html-to-image';
import { StudentProfile } from '../types';

/**
 * Export the actual Digital ID card DOM node as a 4x High-Definition PNG
 * This guarantees 100% pixel-perfect match to the in-app card layout, fonts, and colors.
 */
export async function exportIDCardPNG(profile: StudentProfile): Promise<void> {
  const node = 
    document.getElementById('digital-id-card-capture') || 
    (document.querySelector('.digital-id-front') as HTMLElement);

  if (!node) {
    throw new Error('Digital ID card element not found in DOM');
  }

  // Ensure fonts and images are ready
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // 4x Retina Pixel-Perfect DOM Capture
  const dataUrl = await htmlToImage.toPng(node, {
    pixelRatio: 4,
    quality: 1.0,
    backgroundColor: 'transparent',
    cacheBust: true,
    style: {
      transform: 'none',
      transformStyle: 'flat',
      margin: '0'
    }
  });

  const link = document.createElement('a');
  link.download = `${(profile.fullName || 'Student').replace(/\s+/g, '_')}_Digital_ID.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
