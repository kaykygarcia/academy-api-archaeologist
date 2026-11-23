import { expect, test } from 'vitest';
import { version } from '../package.json';
import { ENGINE_VERSION } from '../src/index';

test('engine version matches the package version', () => {
  expect(ENGINE_VERSION).toBe(version);
});
