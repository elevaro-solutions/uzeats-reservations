export type ExportPayload = {
  filename: string;
  content: string;
  mimeType: string;
  encoding: string;
};

export function downloadExportPayload(payload: ExportPayload) {
  const blob =
    payload.encoding === 'base64'
      ? new Blob([Uint8Array.from(atob(payload.content), (c) => c.charCodeAt(0))], {
          type: payload.mimeType,
        })
      : new Blob([payload.content], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = payload.filename;
  a.click();
  URL.revokeObjectURL(url);
}
