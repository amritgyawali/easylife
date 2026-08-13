import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { inflateRaw } from '@/features/documents/viewer/archive/inflate';

/**
 * The fixtures are produced by zlib (see the generator in the repo history),
 * so these assertions are against streams a real compressor wrote rather than
 * ones shaped to suit the decoder.
 */
const FIXTURES = join(__dirname, '..', 'fixtures', 'documents');
const read = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, name)));
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe('inflateRaw', () => {
  it('decodes a dynamic-Huffman stream', () => {
    const text = decode(inflateRaw(read('deflate-dynamic.bin')));

    expect(text).toBe('The quick brown fox jumps over the lazy dog. '.repeat(40));
  });

  it('decodes a fixed-Huffman stream', () => {
    expect(decode(inflateRaw(read('deflate-fixed.bin')))).toBe('abcabcabcabc');
  });

  it('decodes an uncompressed (stored) block', () => {
    expect(decode(inflateRaw(read('deflate-stored.bin')))).toBe('stored bytes, not compressed');
  });

  it('resolves overlapping back-references', () => {
    // "abcabcabcabc" is encoded as three characters plus a length-9 match at
    // distance 3 — the copy reads bytes it is still writing.
    expect(decode(inflateRaw(read('deflate-fixed.bin')))).toHaveLength(12);
  });

  it('fills a pre-sized buffer exactly when the size is known', () => {
    const bytes = inflateRaw(read('deflate-dynamic.bin'), 45 * 40);

    expect(bytes).toHaveLength(1800);
  });

  it('rejects a truncated stream instead of returning half a file', () => {
    const truncated = read('deflate-dynamic.bin').subarray(0, 20);

    expect(() => inflateRaw(truncated)).toThrow(/damaged/i);
  });
});
