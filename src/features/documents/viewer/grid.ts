/**
 * The tabular shape shared by everything that reads as a grid: a CSV, a
 * spreadsheet worksheet, and the file listing of an archive.
 *
 * One shape means one virtualised table view, one column-sizing pass and one
 * search implementation for all three, instead of three near-identical lists.
 */

export interface DocumentGrid {
  /** Sheet or table name, shown when a document has more than one. */
  name: string;
  /** Column headings — a CSV's header row, or A/B/C for a spreadsheet. */
  columns: string[];
  rows: string[][];
  /** Extra detail for the footer, e.g. "3 preamble lines skipped". */
  note?: string;
}

/** Spreadsheet column label for a zero-based index: 0 → A, 26 → AA. */
export function columnLabel(index: number): string {
  let label = '';
  let remaining = index;

  do {
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);

  return label;
}

/** Column labels A…N for a grid of `count` columns. */
export function columnLabels(count: number): string[] {
  return Array.from({ length: count }, (_unused, index) => columnLabel(index));
}

/**
 * Splits an A1-style reference into its column index and row number.
 * Returns null for anything that isn't a plain cell reference.
 */
export function parseCellReference(reference: string): { column: number; row: number } | null {
  const match = /^([A-Za-z]+)(\d+)$/.exec(reference.trim());
  if (!match) return null;

  const letters = match[1]!.toUpperCase();
  let column = 0;
  for (const letter of letters) column = column * 26 + (letter.charCodeAt(0) - 64);

  return { column: column - 1, row: Number.parseInt(match[2]!, 10) };
}

/** Pads every row to the same width so the table view can index cells safely. */
export function rectangular(rows: string[][], width: number): string[][] {
  return rows.map((row) => {
    if (row.length === width) return row;
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push('');
    return padded;
  });
}

/**
 * Drops trailing empty rows and columns.
 *
 * Spreadsheets routinely declare a used range far larger than the data — a
 * stray format applied to a whole column is enough — and showing 1,048,576
 * blank rows would be both useless and slow.
 */
export function trimEmpty(rows: string[][]): string[][] {
  let lastRow = -1;
  let lastColumn = -1;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]!;
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      if (row[columnIndex]!.trim() !== '') {
        lastRow = rowIndex;
        if (columnIndex > lastColumn) lastColumn = columnIndex;
      }
    }
  }

  if (lastRow === -1) return [];
  return rectangular(rows.slice(0, lastRow + 1), lastColumn + 1);
}
