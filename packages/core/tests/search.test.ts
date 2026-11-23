import { describe, expect, it } from 'vitest';
import { inferContract, propertyPath, searchContract } from '../src';
import { special, specialKeys } from './helpers';

const contract = inferContract([
  { Customer: { Name: 'A' }, items: [[{ Name: 'B' }]], special },
]);

describe('contract search', () => {
  it.each(['', ' ', '\n\t'])('does not filter a blank query %j', (query) => {
    expect(searchContract(contract, query)).toEqual({
      matches: [],
      visible: new Set(),
    });
  });

  it('matches names case-insensitively in tree order and includes ancestors', () => {
    const result = searchContract(contract, 'nAmE');
    expect(result.matches).toEqual(['$.Customer.Name', '$.items[*][*].Name']);
    expect(result.visible).toEqual(
      new Set([
        '$',
        '$.Customer',
        '$.Customer.Name',
        '$.items',
        '$.items[*]',
        '$.items[*][*]',
        '$.items[*][*].Name',
      ]),
    );
  });

  it('matches full paths case-insensitively, with literal array markers', () => {
    expect(searchContract(contract, '$.ITEMS[*][*]').matches).toEqual([
      '$.items[*][*]',
      '$.items[*][*].Name',
    ]);
    expect(searchContract(contract, '$.items[*].Name').matches).toEqual([]);
    expect(searchContract(contract, '[*]').matches).toEqual([]);
    expect(searchContract(contract, 'items').matches).toEqual(['$.items']);
  });

  it.each(specialKeys)('uses the core path for special key %j', (key) => {
    const path = propertyPath('$.special', key);
    expect(searchContract(contract, path).matches).toEqual([path]);
    if (key && !key.startsWith('$')) {
      expect(searchContract(contract, key.toUpperCase()).matches).toContain(
        path,
      );
    }
  });

  it('does not confuse a property named [*] with an element', () => {
    const result = searchContract(inferContract([{ '[*]': [1] }]), '[*]');
    expect(result.matches).toEqual(['$["[*]"]']);
    expect(result.visible).toEqual(new Set(['$', '$["[*]"]']));
  });

  it('returns no visible nodes when nothing matches', () => {
    expect(searchContract(contract, 'absent')).toEqual({
      matches: [],
      visible: new Set(),
    });
  });
});
