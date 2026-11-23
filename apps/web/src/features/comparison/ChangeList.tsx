import type {
  ContractChange,
  ChangeSeverity,
  ChangeCode,
} from '@api-archaeologist/core';

const changeLabels: Record<ChangeCode, string> = {
  'property-added': 'Added',
  'property-not-observed': 'Not observed',
  'type-changed': 'Type changed',
  'type-expanded': 'Type expanded',
  'type-narrowed': 'Type narrowed',
  'became-nullable': 'Newly nullable',
  'null-not-observed': 'Null not observed',
  'presence-reduced': 'Presence reduced',
  'presence-increased': 'Presence increased',
  'elements-not-observed': 'Elements not observed',
  'elements-observed': 'Elements observed',
};

const groups: { severity: ChangeSeverity; label: string }[] = [
  { severity: 'potentially-breaking', label: 'Potentially breaking' },
  { severity: 'review', label: 'Review' },
  { severity: 'informational', label: 'Informational' },
];

export function ChangeList({ changes }: { changes: ContractChange[] }) {
  if (!changes.length)
    return (
      <div className="empty">
        <h3>No observed drift between these snapshots</h3>
        <p>
          This is not a guarantee of compatibility. The samples may not cover
          every response.
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
              {group.label} <span className="count">{items.length}</span>
            </h3>
            <ul aria-label={`Drift changes: ${group.label}`}>
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
                    {change.previous ?? 'Not observed'} →{' '}
                    {change.current ?? 'Not observed'}
                  </p>
                  <p>{change.explanation}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="note">
        Observed drift signals potential consumer impact; it does not prove API
        compatibility or incompatibility.
      </p>
    </div>
  );
}
