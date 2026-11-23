import {
  pluralize,
  observedKinds,
  type ValueStats,
} from '@api-archaeologist/core';

export type Field = {
  path: string;
  value: ValueStats;
  presence?: { present: number; parents: number };
};

export function FieldDetails({ field }: { field: Field }) {
  return (
    <aside className="field-details" aria-label="Evidências do campo">
      <p className="eyebrow">Evidências do campo</p>
      <h3>
        <code>{field.path}</code>
      </h3>
      <p>
        {field.presence
          ? `Observado em ${field.presence.present.toLocaleString('pt-BR')}/${field.presence.parents.toLocaleString('pt-BR')} ${pluralize(field.presence.parents, 'objeto pai', 'objetos pai')}`
          : `${field.value.observations.toLocaleString('pt-BR')} ${pluralize(field.value.observations, 'valor observado', 'valores observados')}`}
      </p>
      <dl className="evidence">
        {observedKinds(field.value).map((kind) => (
          <div key={kind}>
            <dt>{kind}</dt>
            <dd>{field.value.kindCounts[kind].toLocaleString('pt-BR')}</dd>
          </div>
        ))}
        {field.value.array && (
          <>
            <div>
              <dt>Arrays vazios</dt>
              <dd>{field.value.array.emptyCount.toLocaleString('pt-BR')}</dd>
            </div>
            <div>
              <dt>Elementos observados</dt>
              <dd>{field.value.array.elementCount.toLocaleString('pt-BR')}</dd>
            </div>
          </>
        )}
      </dl>
    </aside>
  );
}
