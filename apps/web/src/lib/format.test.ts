import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './format';

describe('formatting', () => {
  it('zero-pads local month, day, hour and minute', () => {
    const date = new Date(2026, 0, 2, 3, 4);
    expect(formatDate(date)).toBe('2026-01-02');
    expect(formatDateTime(date)).toBe('2026-01-02 03:04');
  });
});
