import {
  fileExtension,
  fileFormatLabel,
  needsBytes,
  resolveFileFormat,
  resolveViewerKind,
  viewerKindOf,
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

describe('resolveFileFormat', () => {
  it('trusts a specific MIME type over the extension', () => {
    // Bank exports routinely ship a CSV named `.dat` or `.txt`.
    expect(resolveFileFormat({ name: 'nabil.dat', mimeType: 'text/csv' })).toBe('csv');
    expect(resolveFileFormat({ name: 'scan.bin', mimeType: 'application/pdf' })).toBe('pdf');
    expect(resolveFileFormat({ name: 'photo.bin', mimeType: 'image/heic' })).toBe('image');
  });

  it('ignores MIME parameters', () => {
    expect(resolveFileFormat({ name: 'a.dat', mimeType: 'text/csv; charset=utf-8' })).toBe('csv');
  });

  it('recognises the Office and OpenDocument types by MIME', () => {
    const office = 'application/vnd.openxmlformats-officedocument';
    expect(resolveFileFormat({ name: 'a', mimeType: `${office}.wordprocessingml.document` })).toBe('docx');
    expect(resolveFileFormat({ name: 'a', mimeType: `${office}.spreadsheetml.sheet` })).toBe('xlsx');
    expect(resolveFileFormat({ name: 'a', mimeType: `${office}.presentationml.presentation` })).toBe('pptx');
    expect(resolveFileFormat({ name: 'a', mimeType: 'application/vnd.oasis.opendocument.text' })).toBe('odt');
    expect(resolveFileFormat({ name: 'a', mimeType: 'application/epub+zip' })).toBe('epub');
  });

  it('falls back to the extension when the MIME type says nothing useful', () => {
    // Pickers hand back octet-stream constantly; that must not make a
    // perfectly readable document "unsupported".
    expect(resolveFileFormat({ name: 'esewa.pdf', mimeType: 'application/octet-stream' })).toBe('pdf');
    expect(resolveFileFormat({ name: 'contract.docx', mimeType: 'application/octet-stream' })).toBe('docx');
    expect(resolveFileFormat({ name: 'budget.xlsx' })).toBe('xlsx');
    expect(resolveFileFormat({ name: 'pitch.pptx' })).toBe('pptx');
    expect(resolveFileFormat({ name: 'ledger.tsv', mimeType: null })).toBe('csv');
    expect(resolveFileFormat({ name: 'notes.md' })).toBe('markdown');
    expect(resolveFileFormat({ name: 'receipt.JPG' })).toBe('image');
    expect(resolveFileFormat({ name: 'memo.rtf' })).toBe('rtf');
    expect(resolveFileFormat({ name: 'book.epub' })).toBe('epub');
    expect(resolveFileFormat({ name: 'call.m4a' })).toBe('audio');
    expect(resolveFileFormat({ name: 'walkthrough.mp4' })).toBe('video');
  });

  it('treats structured application types as text or JSON', () => {
    expect(resolveFileFormat({ name: 'backup', mimeType: 'application/json' })).toBe('json');
    expect(resolveFileFormat({ name: 'feed', mimeType: 'application/atom+xml' })).toBe('text');
  });

  it('reports anything it cannot place as unknown', () => {
    expect(resolveFileFormat({ name: 'program.exe' })).toBe('unknown');
    expect(resolveFileFormat({ name: 'archive.7z' })).toBe('unknown');
  });
});

describe('viewerKindOf', () => {
  it('groups the formats that share a view', () => {
    // The whole point of the split: five parsers, one document view.
    expect(viewerKindOf('docx')).toBe('document');
    expect(viewerKindOf('odt')).toBe('document');
    expect(viewerKindOf('pptx')).toBe('document');
    expect(viewerKindOf('epub')).toBe('document');
    expect(viewerKindOf('markdown')).toBe('document');

    expect(viewerKindOf('xlsx')).toBe('sheet');
    expect(viewerKindOf('ods')).toBe('sheet');
    expect(viewerKindOf('csv')).toBe('delimited');

    expect(viewerKindOf('audio')).toBe('media');
    expect(viewerKindOf('video')).toBe('media');
    expect(viewerKindOf('zip')).toBe('archive');
  });

  it('is consistent with the resolveViewerKind shortcut', () => {
    expect(resolveViewerKind({ name: 'q3.xlsx' })).toBe('sheet');
    expect(resolveViewerKind({ name: 'plan.docx' })).toBe('document');
  });
});

describe('needsBytes', () => {
  it('is true only for the kinds parsed inside the app', () => {
    // PDFs, images and media are handed to the platform as a URL, so a large
    // scan is never pulled into the JS heap.
    expect(needsBytes('document')).toBe(true);
    expect(needsBytes('sheet')).toBe(true);
    expect(needsBytes('archive')).toBe(true);
    expect(needsBytes('text')).toBe(true);
    expect(needsBytes('delimited')).toBe(true);
    // Unknown files are read so their first bytes can be sniffed.
    expect(needsBytes('unsupported')).toBe(true);

    expect(needsBytes('pdf')).toBe(false);
    expect(needsBytes('image')).toBe(false);
    expect(needsBytes('media')).toBe(false);
  });
});

describe('fileFormatLabel', () => {
  it('names every format for the badge', () => {
    expect(fileFormatLabel('pdf')).toBe('PDF');
    expect(fileFormatLabel('docx')).toBe('Word');
    expect(fileFormatLabel('xlsx')).toBe('Excel');
  });
});
