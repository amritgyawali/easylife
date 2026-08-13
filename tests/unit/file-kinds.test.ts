import {
  fileExtension,
  needsBytes,
  resolveViewerKind,
  viewerKindLabel,
} from '@/features/documents/viewer/file-kinds';

describe('fileExtension', () => {
  it('reads the last extension, lower-cased', () => {
    expect(fileExtension('Statement.FINAL.PDF')).toBe('pdf');
    expect(fileExtension('  report.csv  ')).toBe('csv');
  });

  it('returns empty for names without one, and for dotfiles', () => {
    expect(fileExtension('README')).toBe('');
    expect(fileExtension('.env')).toBe('');
  });
});

describe('resolveViewerKind', () => {
  it('trusts a specific MIME type over the extension', () => {
    // Bank exports routinely ship a CSV named `.dat` or `.txt`.
    expect(resolveViewerKind({ name: 'nabil.dat', mimeType: 'text/csv' })).toBe('delimited');
    expect(resolveViewerKind({ name: 'scan.bin', mimeType: 'application/pdf' })).toBe('pdf');
    expect(resolveViewerKind({ name: 'photo.bin', mimeType: 'image/heic' })).toBe('image');
  });

  it('ignores MIME parameters', () => {
    expect(resolveViewerKind({ name: 'a.dat', mimeType: 'text/csv; charset=utf-8' })).toBe('delimited');
  });

  it('falls back to the extension when the MIME type says nothing useful', () => {
    // Pickers hand back octet-stream constantly; that must not make a
    // perfectly readable PDF "unsupported".
    expect(resolveViewerKind({ name: 'esewa.pdf', mimeType: 'application/octet-stream' })).toBe('pdf');
    expect(resolveViewerKind({ name: 'ledger.tsv', mimeType: null })).toBe('delimited');
    expect(resolveViewerKind({ name: 'notes.md' })).toBe('text');
    expect(resolveViewerKind({ name: 'receipt.JPG' })).toBe('image');
  });

  it('treats structured application types as text', () => {
    expect(resolveViewerKind({ name: 'backup', mimeType: 'application/json' })).toBe('text');
    expect(resolveViewerKind({ name: 'feed', mimeType: 'application/atom+xml' })).toBe('text');
  });

  it('reports anything it cannot render as unsupported', () => {
    expect(resolveViewerKind({ name: 'archive.zip', mimeType: 'application/zip' })).toBe('unsupported');
    expect(resolveViewerKind({ name: 'sheet.xlsx' })).toBe('unsupported');
  });
});

describe('needsBytes', () => {
  it('is true only for the kinds rendered from decoded text', () => {
    // PDFs and images are handed to the platform as a URL, so a large scan is
    // never pulled into the JS heap.
    expect(needsBytes('text')).toBe(true);
    expect(needsBytes('delimited')).toBe(true);
    expect(needsBytes('pdf')).toBe(false);
    expect(needsBytes('image')).toBe(false);
    expect(needsBytes('unsupported')).toBe(false);
  });
});

describe('viewerKindLabel', () => {
  it('names every kind', () => {
    expect(viewerKindLabel('pdf')).toBe('PDF');
    expect(viewerKindLabel('delimited')).toBe('Spreadsheet');
  });
});
