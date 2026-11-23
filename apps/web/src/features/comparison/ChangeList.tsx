import type {
  ContractChange,
  ChangeSeverity,
  ChangeCode,
} from '@api-archaeologist/core';

const changeLabels: Record<ChangeCode, string> = {
  'property-added': 'Adicionado',
  'property-not-observed': 'Não observado',
  'type-changed': 'Tipo alterado',
  'type-expanded': 'Tipo ampliado',
  'type-narrowed': 'Tipo restringido',
  'became-nullable': 'Passou a aceitar null',
  'null-not-observed': 'Null não observado',
  'presence-reduced': 'Presença reduzida',
  'presence-increased': 'Presença aumentada',
  'elements-not-observed': 'Elementos não observados',
  'elements-observed': 'Elementos observados',
};

const groups: { severity: ChangeSeverity; label: string }[] = [
  { severity: 'potentially-breaking', label: 'Potencialmente incompatível' },
  { severity: 'review', label: 'Revisar' },
  { severity: 'informational', label: 'Informativo' },
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
        const items = changes.filter(
          (change) => change.severity === group.severity,
        );
        return (
          <section key={group.severity}>
            <h3>
              {group.label}{' '}
              <span className="count">
                {items.length.toLocaleString('pt-BR')}
              </span>
            </h3>
            <ul aria-label={`Alterações de drift: ${group.label}`}>
              {items.map((change) => (
                <li key={`${change.path}-${change.code}`}>
                  <div className="change-header">
                    <span className={`badge ${group.severity}`}>
                      {group.label}
                    </span>
                    <span className="sr-only">: </span>
                    <span className="note">{changeLabels[change.code]}</span>
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
      <p className="note">
        O drift observado indica um possível impacto para quem consome a API;
        não comprova compatibilidade nem incompatibilidade.
      </p>
    </div>
  );
}
