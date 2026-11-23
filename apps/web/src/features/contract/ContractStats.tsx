import type { Ref } from 'react';
import { pluralize, type ContractSummary } from '@api-archaeologist/core';

export function ContractStats({
  summary,
  summaryRef,
}: {
  summary: ContractSummary;
  summaryRef: Ref<HTMLParagraphElement>;
}) {
  return (
    <p
      className="stats"
      ref={summaryRef}
      tabIndex={-1}
      aria-label="Resumo do contrato"
    >
      {summary.sampleCount.toLocaleString('pt-BR')}{' '}
      {pluralize(summary.sampleCount, 'amostra', 'amostras')} ·{' '}
      {summary.propertyPathCount.toLocaleString('pt-BR')}{' '}
      {pluralize(summary.propertyPathCount, 'propriedade', 'propriedades')} ·{' '}
      {summary.conflictPathCount.toLocaleString('pt-BR')}{' '}
      {pluralize(summary.conflictPathCount, 'conflito', 'conflitos')}
    </p>
  );
}
