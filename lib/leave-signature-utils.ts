/**
 * Shared digital signature sizing, PNG dimension inspection, and aspect-ratio
 * helpers for the Electronic Leave Request system (Print A4, Word .docx, PDF).
 */

export interface SignatureDimensions {
  width: number;
  height: number;
}

/**
 * Calibrated target bounding boxes across all 3 output formats so signatures
 * look naturally proportioned (~3.4 cm × 1.0 cm standard, ~2.9 cm × 0.85 cm compact)
 * while strictly keeping every leave form on 1 single A4 page.
 */
export const LEAVE_SIGNATURE_BOXES = {
  // Exported normalized PNG maximum canvas bounds (high-DPI crisp, 3:1 natural ratio)
  exportMaxPx: { width: 600, height: 200 },

  // Word .docx EMU (1 cm = 360,000 EMU)
  docxStandardEmu: { width: 1224000, height: 360000 }, // 3.40 cm × 1.00 cm
  docxCompactEmu: { width: 1044000, height: 306000 }, // 2.90 cm × 0.85 cm

  // PDF Canvas @ ~200 DPI (1 cm ≈ 78.74 px)
  pdfStandardPx: { width: 268, height: 78 }, // ~3.40 cm × 0.99 cm
  pdfCompactPx: { width: 228, height: 66 }, // ~2.90 cm × 0.84 cm
} as const;

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Reads the true pixel width & height from a PNG IHDR chunk without any
 * external library (works identically in browser and Node.js).
 */
export function readPngDimensions(bytes: Uint8Array | null | undefined): SignatureDimensions | null {
  if (!bytes || bytes.length < 24) return null;
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (bytes[i] !== PNG_MAGIC[i]) return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  return { width, height };
}

/**
 * Scales an image of size (imgW × imgH) proportionally to fit inside
 * (maxW × maxH) without stretching or distorting aspect ratio.
 */
export function fitSignatureBox(
  imgW: number,
  imgH: number,
  maxW: number,
  maxH: number
): SignatureDimensions {
  if (!imgW || !imgH || imgW <= 0 || imgH <= 0) {
    return { width: Math.round(maxW), height: Math.round(maxH) };
  }
  const scale = Math.min(maxW / imgW, maxH / imgH);
  return {
    width: Math.max(1, Math.round(imgW * scale)),
    height: Math.max(1, Math.round(imgH * scale)),
  };
}

/**
 * Finds the tight non-transparent ink bounding box of an RGBA pixel buffer.
 * Returns null if no visible ink pixels exist.
 */
export function findInkBoundingBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold = 12
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const alpha = data[rowOffset + x * 4 + 3];
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Removes near-white / light-gray paper background from uploaded signature images
 * in-place so photographed or scanned signatures blend cleanly onto official forms.
 */
export function stripNearWhiteBackground(
  data: Uint8ClampedArray,
  whiteThreshold = 232
): void {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxCh = Math.max(r, g, b);
    const minCh = Math.min(r, g, b);
    const saturation = maxCh - minCh;

    // Pure / near-white low-saturation background -> fully transparent
    if (luminance >= whiteThreshold && saturation < 36) {
      data[i + 3] = 0;
    } else if (luminance >= whiteThreshold - 26 && saturation < 30) {
      // Soft anti-aliased edge feathering
      const ratio = (whiteThreshold - luminance) / 26;
      data[i + 3] = Math.round(a * Math.max(0, Math.min(1, ratio)));
    }
  }
}

/**
 * Auto-trims empty transparent margins around a drawn signature canvas and
 * exports a crisp, aspect-ratio-preserved PNG bounded by exportMaxPx.
 * Returns null if the canvas contains no visible ink.
 */
export function exportTrimmedSignaturePng(
  sourceCanvas: HTMLCanvasElement,
  scaleFactor = 1
): string | null {
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;
  if (!sw || !sh) return null;

  const sctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sctx) return sourceCanvas.toDataURL("image/png");

  const imgData = sctx.getImageData(0, 0, sw, sh);
  const bbox = findInkBoundingBox(imgData.data, sw, sh, 10);
  if (!bbox) return null;

  const inkW = bbox.maxX - bbox.minX + 1;
  const inkH = bbox.maxY - bbox.minY + 1;

  // Add modest breathing room around ink so strokes never clip at edges
  const pad = Math.max(6, Math.round(Math.max(inkW, inkH) * 0.06));
  const cropX = Math.max(0, bbox.minX - pad);
  const cropY = Math.max(0, bbox.minY - pad);
  const cropW = Math.min(sw - cropX, inkW + pad * 2);
  const cropH = Math.min(sh - cropY, inkH + pad * 2);

  // Clamp extreme aspect ratios so very thin horizontal lines or narrow initials
  // still have natural proportions when placed inside signature slots
  const targetMaxW = LEAVE_SIGNATURE_BOXES.exportMaxPx.width;
  const targetMaxH = LEAVE_SIGNATURE_BOXES.exportMaxPx.height;
  const clampedScale = Math.max(0.65, Math.min(1.25, scaleFactor));

  const fitted = fitSignatureBox(cropW, cropH, targetMaxW, targetMaxH);

  // If scaleFactor < 1, pad inside the target box so the signature renders slightly smaller
  // while keeping clean centered framing; if > 1, fill tightly up to targetMax.
  const outW =
    clampedScale < 1
      ? Math.min(targetMaxW, Math.round(fitted.width / clampedScale))
      : fitted.width;
  const outH =
    clampedScale < 1
      ? Math.min(targetMaxH, Math.round(fitted.height / clampedScale))
      : fitted.height;

  const out = document.createElement("canvas");
  out.width = Math.max(1, outW);
  out.height = Math.max(1, outH);
  const octx = out.getContext("2d");
  if (!octx) return sourceCanvas.toDataURL("image/png");

  octx.clearRect(0, 0, out.width, out.height);
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";

  const dx = Math.round((out.width - fitted.width) / 2);
  const dy = Math.round((out.height - fitted.height) / 2);
  octx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, dx, dy, fitted.width, fitted.height);

  return out.toDataURL("image/png");
}
