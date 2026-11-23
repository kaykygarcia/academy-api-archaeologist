import type { Ref } from 'react';
import type { Result } from '../../lib/result';
import { ContractStats } from './ContractStats';
import { ContractTree } from './ContractTree';

export function ContractSection({
  result,
  busy,
  heading,
}: {
  result: Result | null;
  busy: boolean;
  heading: Ref<HTMLHeadingElement>;
}) {
  return (
    <section
      className="panel contract-panel"
      aria-labelledby="contract-heading"
      aria-busy={busy}
    >
      <p className="eyebrow">Observed structure</p>
      <h2 id="contract-heading" ref={heading} tabIndex={-1}>
        Inferred contract
      </h2>
      {result ? (
        <>
          <p className="note">
            {result.metadata.opened
              ? 'Opened from snapshot — original samples are not stored'
              : 'Last completed analysis. Sample edits are not reflected until you analyze again.'}
          </p>
          {busy && (
            <p className="note">Previous result shown while processing.</p>
          )}
          <ContractStats summary={result.summary} />
          <ContractTree key={result.revision} contract={result.contract} />
        </>
      ) : (
        <div className="empty">
          <h3>A contract starts with evidence.</h3>
          <p>
            Add JSON responses and analyze them to inspect types, presence and
            nullability.
          </p>
        </div>
      )}
    </section>
  );
}
