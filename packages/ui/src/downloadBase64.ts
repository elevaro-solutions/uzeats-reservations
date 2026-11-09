/**
 * Save a base64 payload (e.g. a GraphQL PDF export) as a file. Uses a Blob URL on an attached
 * anchor: detached `data:` links are ignored by Firefox and large ones fail in Chrome.
 */
export function downloadBase64File(
  filename: string,
  base64: string,
  mimeType = 'application/pdf',
) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
