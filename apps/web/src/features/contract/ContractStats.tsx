import type { ContractSummary } from '@api-archaeologist/core';

export function ContractStats({ summary }: { summary: ContractSummary }) {
  return (
    <dl className="stats">
      <div>
        <dt>Samples analyzed</dt>
        <dd>{summary.sampleCount}</dd>
      </div>
      <div>
        <dt>Properties observed</dt>
        <dd>{summary.propertyPathCount}</dd>
      </div>
      <div>
        <dt>Type conflicts</dt>
        <dd>{summary.conflictPathCount}</dd>
      </div>
    </dl>
  );
}
