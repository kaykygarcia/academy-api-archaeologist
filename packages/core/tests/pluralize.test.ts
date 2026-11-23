import { expect, test } from 'vitest';
import { pluralize } from '../src';

test.each([
  [0, 'amostras'],
  [1, 'amostra'],
  [2, 'amostras'],
])('selects the correct form for %i samples', (count, expected) => {
  expect(pluralize(count, 'amostra', 'amostras')).toBe(expected);
});
