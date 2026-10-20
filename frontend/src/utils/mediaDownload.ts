/**
 * Robust cross-platform media downloader for EventSpace.
 * Supports data: URLs, blob: URLs, and remote/same-origin HTTP URLs.
 */
export async function downloadMediaFile(mediaUrl: string, fileName?: string): Promise<void> {
  if (!mediaUrl) return;

  const resolvedFileName = fileName?.trim() || 'eventspace-media';

  try {
    // If it's a base64 data URL or local blob URL, anchor click triggers direct download
    if (mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = mediaUrl;
      a.download = resolvedFileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Remote or same-origin HTTP URL: fetch as Blob to force file download dialog
    const response = await fetch(mediaUrl, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Failed to fetch media (HTTP ${response.status})`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = resolvedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  } catch (err) {
    console.warn('Direct blob fetch failed, falling back to standard anchor download:', err);
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = resolvedFileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
