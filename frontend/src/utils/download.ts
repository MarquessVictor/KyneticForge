/** Trigger a browser download of `data` serialised as pretty JSON. */
export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the download can start first (avoids leaking the blob).
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Read a user-selected file as UTF-8 text. */
export function readFileAsText(file: File): Promise<string> {
  return file.text();
}
