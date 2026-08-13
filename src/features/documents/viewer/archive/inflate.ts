/**
 * Raw DEFLATE decompression (RFC 1951), in pure TypeScript.
 *
 * Every modern document format that isn't plain text is a ZIP underneath —
 * .docx, .xlsx, .pptx, .odt, .ods, .epub — so reading them in the app comes
 * down to being able to inflate a stream. This is written out rather than
 * pulled from a package for the reasons the rest of this codebase gives for
 * avoiding dependencies: it has to behave identically on Android, iOS and web,
 * and the browser's own `DecompressionStream` is unavailable on Hermes and
 * asynchronous where every caller here is synchronous.
 *
 * The decoder is the bit-at-a-time canonical-Huffman walk (the reference
 * `puff` approach) rather than a lookup-table decoder. It is a few times
 * slower per byte, and that is the right trade: the files this opens are
 * documents (a large .docx is a couple of megabytes), while the table-driven
 * version is markedly harder to verify by reading. Correctness is checked
 * against zlib-produced streams in the unit tests.
 */

import { AppError } from '@/utils/errors';
import { DocumentParseError } from '@/features/documents/viewer/parse-error';

const MAX_CODE_BITS = 15;
const MAX_SYMBOLS = 288;

/** Extra bits and base values for the length codes 257–285 (RFC 1951 §3.2.5). */
const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195,
  227, 258,
];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];

const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097,
  6145, 8193, 12289, 16385, 24577,
];
const DISTANCE_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];

/** The order code-length codes appear in a dynamic block's header. */
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

function corrupt(detail: string): AppError {
  return new DocumentParseError(`This file's compressed data is damaged (${detail}).`);
}

/** LSB-first bit reader over the compressed stream. */
class BitReader {
  private buffer = 0;
  private available = 0;
  private byteIndex = 0;

  constructor(private readonly source: Uint8Array) {}

  /** Reads `need` bits (0–15), least-significant bit of the stream first. */
  read(need: number): number {
    let value = this.buffer;

    while (this.available < need) {
      if (this.byteIndex >= this.source.length) throw corrupt('it ends mid-symbol');
      value |= this.source[this.byteIndex]! << this.available;
      this.byteIndex += 1;
      this.available += 8;
    }

    this.buffer = value >>> need;
    this.available -= need;
    return value & ((1 << need) - 1);
  }

  /** Drops the partial byte, as a stored block requires. */
  alignToByte(): void {
    this.buffer = 0;
    this.available = 0;
  }

  takeBytes(count: number): Uint8Array {
    if (this.byteIndex + count > this.source.length) throw corrupt('a stored block runs past the end');
    const slice = this.source.subarray(this.byteIndex, this.byteIndex + count);
    this.byteIndex += count;
    return slice;
  }
}

/**
 * A canonical Huffman table in counting form: how many codes exist of each
 * length, and the symbols in code order. Decoding walks one bit at a time,
 * which needs nothing else.
 */
interface HuffmanTable {
  count: Int32Array;
  symbol: Int32Array;
}

function buildHuffman(lengths: Uint8Array, symbolCount: number): HuffmanTable {
  const count = new Int32Array(MAX_CODE_BITS + 1);
  for (let symbol = 0; symbol < symbolCount; symbol += 1) count[lengths[symbol]!]! += 1;
  count[0] = 0;

  // Offsets of the first code of each length, then symbols in code order.
  const offsets = new Int32Array(MAX_CODE_BITS + 2);
  for (let length = 1; length <= MAX_CODE_BITS; length += 1) {
    offsets[length + 1] = offsets[length]! + count[length]!;
  }

  const symbol = new Int32Array(symbolCount);
  for (let index = 0; index < symbolCount; index += 1) {
    const length = lengths[index]!;
    if (length !== 0) {
      symbol[offsets[length]!] = index;
      offsets[length]! += 1;
    }
  }

  return { count, symbol };
}

function decodeSymbol(reader: BitReader, table: HuffmanTable): number {
  let code = 0;
  let first = 0;
  let index = 0;

  for (let length = 1; length <= MAX_CODE_BITS; length += 1) {
    code |= reader.read(1);
    const countForLength = table.count[length]!;

    if (code - first < countForLength) return table.symbol[index + (code - first)]!;

    index += countForLength;
    first = (first + countForLength) << 1;
    code <<= 1;
  }

  throw corrupt('an invalid Huffman code');
}

/** Output buffer that grows geometrically when the size wasn't known up front. */
class Output {
  private bytes: Uint8Array;
  private length = 0;

  constructor(expectedSize?: number) {
    this.bytes = new Uint8Array(expectedSize && expectedSize > 0 ? expectedSize : 1024);
  }

  private ensure(extra: number): void {
    if (this.length + extra <= this.bytes.length) return;

    let capacity = Math.max(this.bytes.length * 2, 1024);
    while (capacity < this.length + extra) capacity *= 2;

    const grown = new Uint8Array(capacity);
    grown.set(this.bytes.subarray(0, this.length));
    this.bytes = grown;
  }

  push(byte: number): void {
    this.ensure(1);
    this.bytes[this.length] = byte;
    this.length += 1;
  }

  append(chunk: Uint8Array): void {
    this.ensure(chunk.length);
    this.bytes.set(chunk, this.length);
    this.length += chunk.length;
  }

  /**
   * Copies `count` bytes from `distance` back — the LZ77 match. The ranges
   * are allowed to overlap (that is how runs are encoded), so this copies
   * byte by byte rather than with `set`.
   */
  copyBack(distance: number, count: number): void {
    if (distance > this.length) throw corrupt('a back-reference before the start of the data');
    this.ensure(count);

    let from = this.length - distance;
    for (let index = 0; index < count; index += 1) {
      this.bytes[this.length] = this.bytes[from]!;
      this.length += 1;
      from += 1;
    }
  }

  finish(): Uint8Array {
    return this.bytes.subarray(0, this.length);
  }
}

let fixedLiteralTable: HuffmanTable | null = null;
let fixedDistanceTable: HuffmanTable | null = null;

/** The fixed tables are identical for every stream, so they are built once. */
function fixedTables(): { literals: HuffmanTable; distances: HuffmanTable } {
  if (!fixedLiteralTable || !fixedDistanceTable) {
    const literalLengths = new Uint8Array(MAX_SYMBOLS);
    literalLengths.fill(8, 0, 144);
    literalLengths.fill(9, 144, 256);
    literalLengths.fill(7, 256, 280);
    literalLengths.fill(8, 280, 288);
    fixedLiteralTable = buildHuffman(literalLengths, MAX_SYMBOLS);

    const distanceLengths = new Uint8Array(30).fill(5);
    fixedDistanceTable = buildHuffman(distanceLengths, 30);
  }

  return { literals: fixedLiteralTable, distances: fixedDistanceTable };
}

function readDynamicTables(reader: BitReader): { literals: HuffmanTable; distances: HuffmanTable } {
  const literalCount = reader.read(5) + 257;
  const distanceCount = reader.read(5) + 1;
  const codeLengthCount = reader.read(4) + 4;

  if (literalCount > 286 || distanceCount > 30) throw corrupt('too many codes declared');

  const codeLengthLengths = new Uint8Array(19);
  for (let index = 0; index < codeLengthCount; index += 1) {
    codeLengthLengths[CODE_LENGTH_ORDER[index]!] = reader.read(3);
  }

  const codeLengthTable = buildHuffman(codeLengthLengths, 19);

  // The literal and distance code lengths are themselves Huffman-coded, with
  // three repeat symbols (16/17/18) doing the run-length compression.
  const lengths = new Uint8Array(literalCount + distanceCount);
  let index = 0;

  while (index < lengths.length) {
    const symbol = decodeSymbol(reader, codeLengthTable);

    if (symbol < 16) {
      lengths[index] = symbol;
      index += 1;
      continue;
    }

    let repeat: number;
    let value = 0;

    if (symbol === 16) {
      if (index === 0) throw corrupt('a repeat with nothing to repeat');
      value = lengths[index - 1]!;
      repeat = 3 + reader.read(2);
    } else if (symbol === 17) {
      repeat = 3 + reader.read(3);
    } else {
      repeat = 11 + reader.read(7);
    }

    if (index + repeat > lengths.length) throw corrupt('a repeat past the end of the code lengths');
    lengths.fill(value, index, index + repeat);
    index += repeat;
  }

  return {
    literals: buildHuffman(lengths.subarray(0, literalCount), literalCount),
    distances: buildHuffman(lengths.subarray(literalCount), distanceCount),
  };
}

/**
 * Inflates a raw DEFLATE stream (no zlib or gzip wrapper — what ZIP stores).
 *
 * `expectedSize` comes from the ZIP central directory when available and lets
 * the output buffer be allocated once at the right size.
 */
export function inflateRaw(source: Uint8Array, expectedSize?: number): Uint8Array {
  const reader = new BitReader(source);
  const output = new Output(expectedSize);

  for (;;) {
    const isFinalBlock = reader.read(1) === 1;
    const blockType = reader.read(2);

    if (blockType === 0) {
      reader.alignToByte();
      const header = reader.takeBytes(4);
      const length = header[0]! | (header[1]! << 8);
      const check = header[2]! | (header[3]! << 8);
      if ((length ^ 0xffff) !== check) throw corrupt("a stored block's length check failed");
      output.append(reader.takeBytes(length));
    } else if (blockType === 1 || blockType === 2) {
      const { literals, distances } = blockType === 1 ? fixedTables() : readDynamicTables(reader);

      for (;;) {
        const symbol = decodeSymbol(reader, literals);

        if (symbol < 256) {
          output.push(symbol);
          continue;
        }

        if (symbol === 256) break; // End of block.

        const lengthIndex = symbol - 257;
        if (lengthIndex >= LENGTH_BASE.length) throw corrupt('an invalid length code');
        const length = LENGTH_BASE[lengthIndex]! + reader.read(LENGTH_EXTRA[lengthIndex]!);

        const distanceSymbol = decodeSymbol(reader, distances);
        if (distanceSymbol >= DISTANCE_BASE.length) throw corrupt('an invalid distance code');
        const distance = DISTANCE_BASE[distanceSymbol]! + reader.read(DISTANCE_EXTRA[distanceSymbol]!);

        output.copyBack(distance, length);
      }
    } else {
      throw corrupt('an unknown block type');
    }

    if (isFinalBlock) break;
  }

  return output.finish();
}
