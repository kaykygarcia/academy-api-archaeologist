import type { ContractSummary } from '@api-archaeologist/core';

export function ContractStats({ summary }: { summary: ContractSummary }) {
  return (
    <dl className="stats">
      <div>
        <dt>Amostras analisadas</dt>
        <dd>{summary.sampleCount.toLocaleString('pt-BR')}</dd>
      </div>
      <div>
        <dt>Propriedades observadas</dt>
        <dd>{summary.propertyPathCount.toLocaleString('pt-BR')}</dd>
      </div>
      <div>
        <dt>Conflitos de tipo</dt>
        <dd>{summary.conflictPathCount.toLocaleString('pt-BR')}</dd>
      </div>
    </dl>
  );
}
