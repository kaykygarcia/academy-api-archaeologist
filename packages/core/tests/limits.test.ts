import { expect, it } from 'vitest';
import { formatMiB } from '../src';

it('formats bytes as MiB, including zero and fractions', () => {
  expect(formatMiB(0)).toBe('0 MiB');
  expect(formatMiB(5 * 1024 * 1024)).toBe('5 MiB');
  expect(formatMiB(20 * 1024 * 1024)).toBe('20 MiB');
  expect(formatMiB(1024 * 512)).toBe('0,5 MiB');
});
