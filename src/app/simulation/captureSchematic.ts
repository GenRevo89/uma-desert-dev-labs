"use client";

import html2canvas from 'html2canvas';

/**
 * Captures the farm schematic SVG element as a base64 JPEG string.
 * Targets the `.schematic-body` container within the simulation page.
 * Returns null if the element isn't found or capture fails.
 */
export async function captureSchematic(): Promise<string | null> {
  try {
    const el = document.querySelector('.schematic-body') as HTMLElement;
    if (!el) {
      console.warn('captureSchematic: .schematic-body element not found');
      return null;
    }

    const canvas = await html2canvas(el, {
      backgroundColor: '#0a0f1a',   // Match the sim dark background
      scale: 1.5,                    // Good balance of quality vs size
      useCORS: true,
      logging: false,
    });

    // Convert to JPEG at 75% quality (~100-200KB for a schematic)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    return dataUrl;
  } catch (err) {
    console.error('captureSchematic failed:', err);
    return null;
  }
}

/**
 * Captures the full simulation page (schematic + cards) as a base64 JPEG.
 * Targets the `.sim-container` element.
 */
export async function captureFullSimulation(): Promise<string | null> {
  try {
    const el = document.querySelector('.sim-container') as HTMLElement;
    if (!el) return null;

    const canvas = await html2canvas(el, {
      backgroundColor: '#0a0f1a',
      scale: 1,
      useCORS: true,
      logging: false,
      height: Math.min(el.scrollHeight, 3000), // Cap height for sanity
    });

    return canvas.toDataURL('image/jpeg', 0.6);
  } catch (err) {
    console.error('captureFullSimulation failed:', err);
    return null;
  }
}
