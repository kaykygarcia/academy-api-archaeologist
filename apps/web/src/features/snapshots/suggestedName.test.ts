import { afterEach, expect, it, vi } from 'vitest';
import { suggestedName } from './db';

afterEach(() => vi.useRealTimers());

it('replaces a trailing snapshot date without accumulating suffixes', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 2, 3, 4));
  expect(suggestedName('Orders — 2025-12-31', '', '')).toBe(
    'Orders — 2026-01-02',
  );
  expect(suggestedName('Orders — 2025-12-31 archive', '', '')).toBe(
    'Orders — 2025-12-31 archive — 2026-01-02',
  );
  expect(suggestedName('Orders — 2025-12-31', 'GET', '/orders')).toBe(
    'GET /orders — 2026-01-02',
  );
  expect(suggestedName('', '', '')).toBe('Conjunto sem nome — 2026-01-02');
});

it('keeps suggestions within the save and import name limit', () => {
  expect(suggestedName('x'.repeat(250), '', '')).toBe('x'.repeat(200));
  const name = suggestedName('', 'GET', '/orders/'.repeat(300));
  expect(name).toHaveLength(200);
  expect(name.startsWith('GET /orders/')).toBe(true);
});

it('does not split a surrogate pair at the truncation boundary', () => {
  const name = suggestedName(`${'a'.repeat(199)}\u{10400}tail`, '', '');
  expect(name).toBe(`${'a'.repeat(199)}\u{10400}`);
  expect(Array.from(name)).toHaveLength(200);
});
