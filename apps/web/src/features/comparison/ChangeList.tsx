import { changeLabel, severityLabel } from '@api-archaeologist/core';
import type { ContractChange, ChangeSeverity } from '@api-archaeologist/core';

const groups: ChangeSeverity[] = [
  'potentially-breaking',
  'review',
  'informational',
];

export function ChangeList({ changes }: { changes: ContractChange[] }) {
  if (!changes.length)
    return (
      <div className="empty">
        <h3>Nenhum drift observado entre estes snapshots</h3>
        <p>
          Isso não garante compatibilidade. As amostras podem não cobrir todas
          as respostas.
        </p>
      </div>
    );
  return (
    <div className="changes">
      {groups.map((group) => {
        const items = changes.filter((change) => change.severity === group);
        return (
          <section key={group}>
            <h3>
              {severityLabel(group)}{' '}
              <span className="count">
                {items.length.toLocaleString('pt-BR')}
              </span>
            </h3>
            <ul aria-label={`Alterações de drift: ${severityLabel(group)}`}>
              {items.map((change) => (
                <li key={`${change.path}-${change.code}`}>
                  <div className="change-header">
                    <span className={`badge ${group}`}>
                      {severityLabel(group)}
                    </span>
                    <span className="sr-only">: </span>
                    <span className="note">{changeLabel(change.code)}</span>
                  </div>
                  <h4>
                    <code>{change.path}</code>
                  </h4>
                  <p className="mono">
                    {change.previous ?? 'Não observado'} →{' '}
                    {change.current ?? 'Não observado'}
                  </p>
                  <p>{change.explanation}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
