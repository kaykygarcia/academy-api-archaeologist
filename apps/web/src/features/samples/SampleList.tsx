import { pluralize, type SampleInput } from '@api-archaeologist/core';

export type SessionSample = SampleInput & { id: string; bytes: number };

export function SampleList({
  samples,
  onRemove,
  disabled,
}: {
  samples: SessionSample[];
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  if (!samples.length)
    return (
      <p className="empty compact">
        Ainda não há amostras. Cole uma resposta, envie arquivos JSON ou
        carregue o exemplo.
      </p>
    );
  return (
    <ul className="sample-list">
      {samples.map((sample) => (
        <li key={sample.id}>
          <span>
            <strong>{sample.name}</strong>
            <small>
              {sample.bytes.toLocaleString('pt-BR')}{' '}
              {pluralize(sample.bytes, 'byte', 'bytes')}
            </small>
          </span>
          <button
            disabled={disabled}
            aria-label={`Remover ${sample.name}`}
            onClick={() => onRemove(sample.id)}
          >
            Remover
          </button>
        </li>
      ))}
    </ul>
  );
}
