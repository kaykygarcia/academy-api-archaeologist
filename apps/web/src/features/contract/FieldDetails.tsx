import { observedKinds, type ValueStats } from '@api-archaeologist/core';

export type Field = {
  path: string;
  value: ValueStats;
  presence?: { present: number; parents: number };
};

export function FieldDetails({ field }: { field: Field }) {
  return (
    <aside className="field-details" aria-label="Field evidence">
      <p className="eyebrow">Field evidence</p>
      <h3>
        <code>{field.path}</code>
      </h3>
      <p>
        {field.presence
          ? `Observed in ${field.presence.present}/${field.presence.parents} parent objects`
          : `${field.value.observations} values observed`}
      </p>
      <dl className="evidence">
        {observedKinds(field.value).map((kind) => (
          <div key={kind}>
            <dt>{kind}</dt>
            <dd>{field.value.kindCounts[kind]}</dd>
          </div>
        ))}
        {field.value.array && (
          <>
            <div>
              <dt>Empty arrays</dt>
              <dd>{field.value.array.emptyCount}</dd>
            </div>
            <div>
              <dt>Elements observed</dt>
              <dd>{field.value.array.elementCount}</dd>
            </div>
          </>
        )}
      </dl>
    </aside>
  );
}
