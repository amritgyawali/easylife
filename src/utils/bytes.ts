/**
 * Byte-size formatting, shared by the document vault and the reader.
 *
 * Kept out of the screens because "842 KB" vs "0.8 MB" is a presentation
 * decision that should read the same everywhere a file size is shown.
 */

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

/** Human-readable file size, e.g. `842 KB`, `1.4 MB`. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < KB) return `${Math.round(bytes)} B`;

  // One decimal only below 10 of a unit — "9.4 MB" is useful, "94.3 MB" is noise.
  const scaled = bytes < MB ? bytes / KB : bytes < GB ? bytes / MB : bytes / GB;
  const unit = bytes < MB ? 'KB' : bytes < GB ? 'MB' : 'GB';

  return `${scaled < 10 ? scaled.toFixed(1) : Math.round(scaled)} ${unit}`;
}
