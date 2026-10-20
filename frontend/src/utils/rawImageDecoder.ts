/**
 * RAW Image Decoder Utility for EventSpace.
 *
 * Camera RAW formats (.ARW, .CR2, .CR3, .NEF, .DNG, .ORF, .RW2, .RAF, .PEF, .SRW)
 * contain high-resolution embedded JPEG preview streams in their binary payload.
 *
 * This utility scans the ArrayBuffer for standard JPEG SOI (0xFF 0xD8 0xFF) and
 * EOI (0xFF 0xD9) markers, selects the largest preview segment (highest resolution),
 * validates that the browser can decode the segment via Image(), and returns a
 * clean data:image/jpeg;base64,... string for visual rendering.
 */

export const RAW_EXTENSIONS = [
  '.dng',
  '.cr2',
  '.cr3',
  '.nef',
  '.arw',
  '.orf',
  '.rw2',
  '.pef',
  '.raf',
  '.srw',
  '.raw',
];

export const RAW_MIME_TYPES = [
  'image/x-adobe-dng',
  'image/x-canon-cr2',
  'image/x-canon-cr3',
  'image/x-nikon-nef',
  'image/x-sony-arw',
  'image/x-panasonic-rw2',
  'image/x-fuji-raf',
  'image/x-olympus-orf',
];

export function isRawFileName(fileName: string): boolean {
  if (!fileName) return false;
  const lower = fileName.toLowerCase();
  return RAW_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isRawFileType(fileType?: string, fileName?: string): boolean {
  if (fileType) {
    const lowerType = fileType.toLowerCase();
    if (RAW_MIME_TYPES.includes(lowerType)) return true;
  }
  if (fileName) {
    return isRawFileName(fileName);
  }
  return false;
}

/**
 * Converts a byte slice to a data:image/jpeg;base64 URL.
 */
function uint8ArrayToJpegDataUrl(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const arrayBufferSlice = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBufferSlice], { type: 'image/jpeg' });
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Validates that an image data URL can be successfully decoded by the browser.
 */
function testImageLoad(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

/**
 * Scans an ArrayBuffer for embedded JPEG preview streams in camera RAW files.
 * Returns a valid base64 data URL if a decodable preview is found, or null if not.
 */
export async function extractRawEmbeddedJpeg(buffer: ArrayBuffer): Promise<string | null> {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  if (len < 1024) return null;

  // Find all SOI marker locations (0xFF, 0xD8, 0xFF)
  const soiIndices: number[] = [];
  for (let i = 0; i < len - 3; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      soiIndices.push(i);
    }
  }

  if (soiIndices.length === 0) return null;

  interface JpegCandidate {
    start: number;
    end: number;
    size: number;
  }

  const candidates: JpegCandidate[] = [];

  // For each candidate SOI, scan forward for the outermost matching 0xFF 0xD9 (EOI) before the next SOI or EOF
  for (let s = 0; s < soiIndices.length; s++) {
    const start = soiIndices[s];
    const nextSoi = s + 1 < soiIndices.length ? soiIndices[s + 1] : len;

    // Scan backward from nextSoi to find the outermost 0xFF 0xD9
    let eoi = -1;
    for (let j = Math.min(nextSoi, len - 2); j >= start + 100; j--) {
      if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
        eoi = j + 2;
        break;
      }
    }

    if (eoi > start) {
      const size = eoi - start;
      // Filter out tiny thumbnails (smaller than 8KB) in favor of previews
      if (size >= 8000) {
        candidates.push({ start, end: eoi, size });
      }
    }
  }

  // Fallback: If no candidate >= 8KB was found, collect any candidate >= 1KB
  if (candidates.length === 0) {
    for (let s = 0; s < soiIndices.length; s++) {
      const start = soiIndices[s];
      const nextSoi = s + 1 < soiIndices.length ? soiIndices[s + 1] : len;
      for (let j = Math.min(nextSoi, len - 2); j >= start + 50; j--) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          const eoi = j + 2;
          const size = eoi - start;
          if (size >= 1024) {
            candidates.push({ start, end: eoi, size });
          }
          break;
        }
      }
    }
  }

  // Sort candidates by byte size descending: the largest JPEG segment is the high-res preview
  candidates.sort((a, b) => b.size - a.size);

  // Validate up to the top 4 candidate streams with the browser's image decoder
  for (const candidate of candidates.slice(0, 4)) {
    try {
      const slice = bytes.subarray(candidate.start, candidate.end);
      const dataUrl = await uint8ArrayToJpegDataUrl(slice);
      const isValid = await testImageLoad(dataUrl);
      if (isValid) {
        return dataUrl;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}
