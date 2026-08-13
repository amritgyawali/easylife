/**
 * Excel (.xlsx) → one `DocumentGrid` per worksheet.
 *
 * The parts that matter are few: `xl/workbook.xml` names the sheets and points
 * at them through the workbook relationships, `xl/sharedStrings.xml` holds
 * every repeated string once, and each sheet lists only its non-empty cells
 * with an A1 reference. Reconstructing the grid is therefore mostly a matter
 * of placing sparse cells back into their row and column.
 *
 * Formulas are not evaluated — the cached result Excel stored alongside each
 * formula is shown, which is what the file's author last saw.
 */

import { DocumentParseError } from '@/features/documents/viewer/parse-error';
import type { ZipArchive } from '@/features/documents/viewer/archive/zip';
import {
  attribute,
  childElements,
  findElements,
  parseXml,
  textContent,
  type XmlElement,
} from '@/features/documents/viewer/xml';
import {
  columnLabels,
  parseCellReference,
  rectangular,
  trimEmpty,
  type DocumentGrid,
} from '@/features/documents/viewer/grid';

const WORKBOOK_PART = 'xl/workbook.xml';
const WORKBOOK_RELATIONSHIPS = 'xl/_rels/workbook.xml.rels';
const SHARED_STRINGS_PART = 'xl/sharedStrings.xml';
const STYLES_PART = 'xl/styles.xml';

/**
 * Built-in number-format ids that mean "this number is a date or a time"
 * (ECMA-376 §18.8.30). Anything outside this set is left as a number, which is
 * the safe direction to be wrong in.
 */
const BUILT_IN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/** Guard against a corrupt or hostile sheet declaring an absurd used range. */
const MAX_ROWS_PER_SHEET = 50_000;
const MAX_COLUMNS_PER_SHEET = 512;

function readSharedStrings(zip: ZipArchive): string[] {
  const xml = zip.readText(SHARED_STRINGS_PART);
  if (!xml) return [];

  // Each <si> can be one <t> or a series of formatted runs; joining the runs
  // is what turns "part-bold" text back into the string the user typed.
  return childElements(parseXml(xml), 'si').map((item) =>
    findElements(item, 't')
      .map((text) => textContent(text))
      .join('')
  );
}

/**
 * Style index → true when that style formats its number as a date.
 *
 * Excel stores dates as plain numbers, so without this a delivery date reads
 * as "45678" — technically the file's contents, practically useless.
 */
function readDateStyles(zip: ZipArchive): Set<number> {
  const dateStyles = new Set<number>();
  const xml = zip.readText(STYLES_PART);
  if (!xml) return dateStyles;

  const root = parseXml(xml);

  const customDateFormats = new Set<string>();
  for (const format of findElements(root, 'numFmt')) {
    const id = attribute(format, 'numFmtId');
    const code = attribute(format, 'formatCode') ?? '';
    // A custom format is a date format if it positions day/month/year tokens.
    if (id && /[dy]/i.test(code.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"/g, ''))) {
      customDateFormats.add(id);
    }
  }

  const cellFormats = findElements(root, 'cellXfs')[0];
  if (!cellFormats) return dateStyles;

  childElements(cellFormats, 'xf').forEach((format, index) => {
    const id = attribute(format, 'numFmtId');
    if (!id) return;
    if (BUILT_IN_DATE_FORMATS.has(Number.parseInt(id, 10)) || customDateFormats.has(id)) {
      dateStyles.add(index);
    }
  });

  return dateStyles;
}

/**
 * Converts an Excel serial date to ISO `YYYY-MM-DD` (with a time when the
 * value has a fractional part).
 *
 * Serial 60 is Excel's phantom 29 February 1900 — a bug kept since Lotus 1-2-3
 * for compatibility — so serials above it are one day ahead of the true count.
 */
export function excelSerialToIso(serial: number): string {
  // 25,568 is the offset from Excel's day 1 (1900-01-01) to the Unix epoch
  // once the phantom day has been removed.
  const adjusted = serial > 59 ? serial - 1 : serial;
  const milliseconds = Math.round((adjusted - 25_568) * 86_400_000);
  const date = new Date(milliseconds);

  if (!Number.isFinite(date.getTime())) return `${serial}`;

  const iso = date.toISOString();
  const hasTime = Math.abs(serial % 1) > 1e-9;
  return hasTime ? iso.slice(0, 16).replace('T', ' ') : iso.slice(0, 10);
}

function cellValue(cell: XmlElement, sharedStrings: string[], dateStyles: Set<number>): string {
  const type = attribute(cell, 't') ?? 'n';

  if (type === 'inlineStr') {
    return findElements(cell, 't')
      .map((text) => textContent(text))
      .join('');
  }

  const valueElement = childElements(cell, 'v')[0];
  const raw = valueElement ? textContent(valueElement) : '';
  if (raw === '') return '';

  if (type === 's') {
    const index = Number.parseInt(raw, 10);
    return sharedStrings[index] ?? '';
  }

  if (type === 'b') return raw === '1' ? 'TRUE' : 'FALSE';
  if (type === 'str' || type === 'e') return raw;

  const styleIndex = Number.parseInt(attribute(cell, 's') ?? '', 10);
  if (Number.isFinite(styleIndex) && dateStyles.has(styleIndex)) {
    const serial = Number.parseFloat(raw);
    if (Number.isFinite(serial)) return excelSerialToIso(serial);
  }

  return raw;
}

function readSheetGrid(
  zip: ZipArchive,
  path: string,
  name: string,
  sharedStrings: string[],
  dateStyles: Set<number>
): DocumentGrid {
  const xml = zip.readText(path);
  if (!xml) return { name, columns: [], rows: [] };

  const sheetData = findElements(parseXml(xml), 'sheetData')[0];
  if (!sheetData) return { name, columns: [], rows: [] };

  const rows: string[][] = [];
  let width = 0;
  let skippedRows = 0;

  for (const rowElement of childElements(sheetData, 'row')) {
    // The `r` attribute is authoritative: a sheet with blank rows in the middle
    // simply omits them, and appending would silently shift everything up.
    const declaredIndex = Number.parseInt(attribute(rowElement, 'r') ?? '', 10);
    const rowIndex = Number.isFinite(declaredIndex) ? declaredIndex - 1 : rows.length;

    if (rowIndex >= MAX_ROWS_PER_SHEET) {
      skippedRows += 1;
      continue;
    }

    while (rows.length <= rowIndex) rows.push([]);
    const row = rows[rowIndex]!;

    for (const cell of childElements(rowElement, 'c')) {
      const reference = attribute(cell, 'r');
      const position = reference ? parseCellReference(reference) : null;
      const columnIndex = position ? position.column : row.length;

      if (columnIndex >= MAX_COLUMNS_PER_SHEET) continue;
      while (row.length <= columnIndex) row.push('');

      row[columnIndex] = cellValue(cell, sharedStrings, dateStyles);
      if (row.length > width) width = row.length;
    }
  }

  const trimmed = trimEmpty(rectangular(rows, width));

  return {
    name,
    columns: columnLabels(trimmed[0]?.length ?? 0),
    rows: trimmed,
    note: skippedRows > 0 ? `${skippedRows} rows beyond the display limit were skipped` : undefined,
  };
}

export function parseXlsx(zip: ZipArchive): DocumentGrid[] {
  const workbookXml = zip.readText(WORKBOOK_PART);
  if (!workbookXml) {
    throw new DocumentParseError(
      "This looks like an Excel file but has no workbook part — an older .xls renamed to .xlsx isn't the same format."
    );
  }

  const relationships = new Map<string, string>();
  const relationshipsXml = zip.readText(WORKBOOK_RELATIONSHIPS);
  if (relationshipsXml) {
    for (const relationship of findElements(parseXml(relationshipsXml), 'Relationship')) {
      const id = attribute(relationship, 'Id');
      const target = attribute(relationship, 'Target');
      if (id && target) relationships.set(id, target.replace(/^\/?xl\//, '').replace(/^\.\//, ''));
    }
  }

  const sharedStrings = readSharedStrings(zip);
  const dateStyles = readDateStyles(zip);

  const sheets = findElements(parseXml(workbookXml), 'sheet');
  const grids: DocumentGrid[] = [];

  sheets.forEach((sheet, index) => {
    const name = attribute(sheet, 'name') ?? `Sheet ${index + 1}`;
    const relationshipId = attribute(sheet, 'id');
    const target = relationshipId ? relationships.get(relationshipId) : undefined;
    const path = `xl/${target ?? `worksheets/sheet${index + 1}.xml`}`;

    if (zip.has(path)) grids.push(readSheetGrid(zip, path, name, sharedStrings, dateStyles));
  });

  if (grids.length === 0) {
    throw new DocumentParseError('This workbook has no readable worksheets.');
  }

  return grids;
}
