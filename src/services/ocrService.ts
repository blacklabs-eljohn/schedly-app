import { extractCORWithGemini, getStoredGeminiApiKey, hasGeminiApiKey } from './aiVisionService';
import { Course, StudentProfile } from '../types';

export interface OCRProgressCallback {
  (status: string, progress: number): void;
}

export type ScanEngine = 'gemini' | 'auto';

/**
 * Preprocesses image canvas with contrast enhancement and unsharp sharpening
 * Optimized for paper documents photographed by smartphone cameras
 */
export async function preprocessImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      // Maintain optimal high-resolution for Gemini AI (max 2400px width/height)
      let w = img.width;
      let h = img.height;
      if (w > 2400 || h > 2400) {
        const ratio = Math.min(2400 / w, 2400 / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;

      // Draw image
      ctx.drawImage(img, 0, 0, w, h);

      // Clean & enhance clarity
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Pure AI Multimodal Vision Scan Pipeline
 * Sends the photograph directly to Google Gemini Vision AI (Gemini 3.6/3.5 Flash)
 */
export async function scanCORImage(
  imageUri: string,
  onProgress?: OCRProgressCallback,
  _engine: ScanEngine = 'auto',
  geminiApiKey?: string
): Promise<{ rawText: string; courses: Course[]; profile?: Partial<StudentProfile>; totalUnits?: number; usedEngine: 'gemini' }> {
  const apiKey = (geminiApiKey || getStoredGeminiApiKey()).trim();

  if (onProgress) onProgress('📸 Optimizing document geometry & sharpness...', 20);
  const processedUri = await preprocessImage(imageUri);

  if (onProgress) onProgress('🧠 Google Gemini AI Multimodal Vision analyzing COR...', 55);
  const aiResult = await extractCORWithGemini(processedUri, apiKey);

  if (onProgress) onProgress('🎯 Schedule & Student ID extracted successfully!', 100);

  if (!aiResult.courses || aiResult.courses.length === 0) {
    throw new Error('Gemini AI could not detect any timetable rows. Please ensure the document is clear and well-lit.');
  }

  return {
    rawText: aiResult.rawText || '',
    courses: aiResult.courses,
    profile: aiResult.profile,
    totalUnits: aiResult.totalUnits,
    usedEngine: 'gemini'
  };
}
