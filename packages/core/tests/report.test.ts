import { expect, test } from 'vitest';
import { compareContracts, driftReportMarkdown, inferContract } from '../src';
import { baseline, current, special } from './helpers';

const metadata = {
  baselineName: 'Baseline de pedidos',
  currentName: 'Análise atual',
  generatedAt: '2026-11-23T12:00:00.000Z',
};

test('reports the five fixture changes grouped by severity', () => {
  const changes = compareContracts(
    inferContract(baseline),
    inferContract(current),
  );
  expect(changes).toHaveLength(5);
  expect(driftReportMarkdown({ ...metadata, changes })).toMatchSnapshot();
});

test('escapes special property paths, cells and metadata', () => {
  const before = inferContract([
    special,
    Object.fromEntries([
      ['a|`b\nc', 1],
      ['``', 1],
      ['a"b', 1],
    ]),
  ]);
  const changes = compareContracts(before, inferContract([{}]));
  changes.push({
    code: 'type-changed',
    severity: 'review',
    path: '`a``',
    previous: 'a|b\\c\r\nd',
    current: '`x|y`',
    explanation: 'a\nb|c\\d',
  });
  const report = driftReportMarkdown({
    ...metadata,
    baselineName: 'a|b\r\nc\\d',
    currentName: '`next`|x\ny',
    changes,
  });
  expect(report).toContain(
    'Baseline: `a|b  c\\d` → Novas observações: `` `next`|x y ``',
  );
  expect(report).toContain('``` `a`` ```');
  expect(report).toContain('a\\|b\\\\c  d');
  expect(report).toContain('``$["a\\|`b\\nc"]``');
  expect(report).toContain('a b\\|c\\\\d');
  expect(report).toContain('$.__proto__');
  expect(report).toContain('`$["a\\"b"]`');
});

test('reports no changes without tables', () => {
  const report = driftReportMarkdown({ ...metadata, changes: [] });
  expect(report).toContain('Nenhuma alteração observada.');
  expect(report).not.toContain('| Caminho |');
  expect(report).toContain(
    'As evidências descrevem apenas as amostras fornecidas.',
  );
});

test('preserves surrounding spaces in code spans', () => {
  const report = driftReportMarkdown({
    ...metadata,
    baselineName: ' baseline ',
    currentName: ' current ',
    changes: [
      {
        code: 'property-added',
        severity: 'informational',
        path: ' path ',
        previous: null,
        current: 'string',
        explanation: 'Nova propriedade.',
      },
    ],
  });
  expect(report).toContain(
    'Baseline: `  baseline  ` → Novas observações: `  current  `',
  );
  expect(report).toContain('| `  path  ` |');
});

test.each(['', ' ', '\t', '\r\n', ' \t\r\n '])(
  'renders blank names and paths as text: %j',
  (value) => {
    const report = driftReportMarkdown({
      ...metadata,
      baselineName: value,
      currentName: value,
      changes: [
        {
          code: 'property-added',
          severity: 'informational',
          path: value,
          previous: null,
          current: 'string',
          explanation: 'Nova propriedade.',
        },
      ],
    });
    expect(report).toContain(
      'Baseline: (sem nome) → Novas observações: (sem nome)',
    );
    expect(report).toContain('| (sem nome) |');
    expect(report).not.toContain('``');
  },
);
