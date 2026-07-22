import { redact } from '@/utils/logger';

describe('redact', () => {
  it('masks all but the last 4 characters by default', () => {
    expect(redact('9800123456')).toBe('******3456');
  });

  it('masks everything when the value is shorter than the visible count', () => {
    expect(redact('12', 4)).toBe('**');
  });

  it('supports a custom visible-character count', () => {
    expect(redact('9800123456', 2)).toBe('********56');
  });

  it('handles an empty string', () => {
    expect(redact('')).toBe('');
  });
});
