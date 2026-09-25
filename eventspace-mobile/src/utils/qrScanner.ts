import jsQR from 'jsqr';

export interface ParsedPairingData {
  serverUrl?: string;
  pin?: string;
}

export function parsePairingPayload(payload: string): ParsedPairingData | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;

  // 1. Try parsing JSON format: {"serverUrl":"...","pin":"..."}
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj === 'object') {
      return {
        serverUrl: obj.serverUrl || obj.url || obj.host,
        pin: obj.pin || obj.code || obj.pairingPin,
      };
    }
  } catch {}

  // 2. Try parsing URL with hash or query: http://192.168.1.150:5173#pin=EVSP-9482 or ?pin=...
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const pinParam = url.searchParams.get('pin') || (url.hash.includes('pin=') ? url.hash.split('pin=')[1] : undefined);
      // If port is 5173 (web dev server), suggest backend port 3001
      let serverUrl = `${url.protocol}//${url.hostname}:3001`;
      if (url.port && url.port !== '5173') {
        serverUrl = `${url.protocol}//${url.host}`;
      }
      return {
        serverUrl,
        pin: pinParam || 'EVSP-9482',
      };
    } catch {}
  }

  // 3. Simple text string containing IP or PIN
  if (trimmed.includes(':') && trimmed.includes('.')) {
    return { serverUrl: trimmed };
  }

  if (trimmed.startsWith('EVSP-')) {
    return { pin: trimmed };
  }

  return null;
}

export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          resolve(code.data);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
