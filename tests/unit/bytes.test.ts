import { formatFileSize } from '@/utils/bytes';

describe('formatFileSize', () => {
  it('shows raw bytes below a kilobyte', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(940)).toBe('940 B');
  });

  it('keeps one decimal only while it carries information', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(52_400)).toBe('51 KB');
    expect(formatFileSize(3_355_443)).toBe('3.2 MB');
    expect(formatFileSize(52_428_800)).toBe('50 MB');
  });

  it('scales up to gigabytes', () => {
    expect(formatFileSize(2 * 1024 ** 3)).toBe('2.0 GB');
  });

  it('renders a dash rather than NaN for a missing size', () => {
    expect(formatFileSize(Number.NaN)).toBe('—');
    expect(formatFileSize(-1)).toBe('—');
  });
});
