import type { SampleInput } from '@api-archaeologist/core';

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
        No samples yet. Paste a response, upload JSON files or load the example.
      </p>
    );
  return (
    <ul className="sample-list">
      {samples.map((sample) => (
        <li key={sample.id}>
          <span>
            <strong>{sample.name}</strong>
            <small>{sample.bytes.toLocaleString()} bytes</small>
          </span>
          <button
            disabled={disabled}
            aria-label={`Remove ${sample.name}`}
            onClick={() => onRemove(sample.id)}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
