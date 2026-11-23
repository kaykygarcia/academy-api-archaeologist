import { summarizeChanges } from './comparison';
import { changeLabel, severityLabel } from './labels';
import type { ChangeSeverity, ContractChange } from './types';

function escapeCell(value: string): string {
  return value
    .replace(/[\r\n]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|');
}

function codeSpan(value: string, inTable = false): string {
  const singleLine = value.replace(/[\r\n]/g, ' ');
  if (!singleLine.trim()) return '(sem nome)';
  const escaped = inTable ? singleLine.replace(/\|/g, '\\|') : singleLine;
  let longest = 0;
  for (const match of escaped.matchAll(/`+/g)) {
    longest = Math.max(longest, match[0].length);
  }
  const fence = '`'.repeat(longest + 1);
  const padding =
    escaped.startsWith('`') ||
    escaped.endsWith('`') ||
    (escaped.startsWith(' ') && escaped.endsWith(' '))
      ? ' '
      : '';
  return `${fence}${padding}${escaped}${padding}${fence}`;
}

export function driftReportMarkdown(input: {
  baselineName: string;
  currentName: string;
  generatedAt: string;
  changes: ContractChange[];
}): string {
  const lines = [
    '# Relatório de drift',
    '',
    `Baseline: ${codeSpan(input.baselineName)} → Novas observações: ${codeSpan(input.currentName)}`,
    '',
    `Gerado em: ${escapeCell(input.generatedAt)}`,
    '',
    summarizeChanges(input.changes),
    '',
  ];
  const severities: ChangeSeverity[] = [
    'potentially-breaking',
    'review',
    'informational',
  ];
  if (!input.changes.length) lines.push('Nenhuma alteração observada.', '');
  for (const severity of severities) {
    const changes = input.changes.filter(
      (change) => change.severity === severity,
    );
    if (!changes.length) continue;
    lines.push(
      `## ${severityLabel(severity)}`,
      '',
      '| Caminho | Mudança | Antes | Depois | Explicação |',
      '| --- | --- | --- | --- | --- |',
    );
    for (const change of changes) {
      lines.push(
        `| ${codeSpan(change.path, true)} | ${changeLabel(change.code)} | ${escapeCell(change.previous ?? 'Não observado')} | ${escapeCell(change.current ?? 'Não observado')} | ${escapeCell(change.explanation)} |`,
      );
    }
    lines.push('');
  }
  lines.push(
    'O drift observado indica possível impacto; não comprova compatibilidade. As evidências descrevem apenas as amostras fornecidas.',
    '',
  );
  return lines.join('\n');
}
