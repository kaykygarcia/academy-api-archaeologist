import { useRef, useState } from 'react';
import { formatDateTime } from '../../lib/format';
import { isCompatibleSnapshot, type ContractSnapshot } from './db';

function SnapshotRow({
  snapshot,
  disabled,
  onOpen,
  onRename,
  onDelete,
  onDeleted,
}: {
  snapshot: ContractSnapshot;
  disabled: boolean;
  onOpen: (snapshot: ContractSnapshot) => void;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onDeleted: () => void;
}) {
  const [mode, setMode] = useState<'idle' | 'rename' | 'delete'>('idle');
  const [name, setName] = useState(snapshot.name);
  const renameButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  function closeForm() {
    const target = mode === 'rename' ? renameButton : deleteButton;
    setMode('idle');
    requestAnimationFrame(() => target.current?.focus());
  }
  const compatible = isCompatibleSnapshot(snapshot);
  return (
    <li>
      <div>
        <strong>{snapshot.name}</strong>
        <small>
          {formatDateTime(new Date(snapshot.createdAt))} ·{' '}
          {snapshot.sampleCount} samples
        </small>
        {!compatible && (
          <p className="error-text">
            Incompatible snapshot version. Opening and comparison are blocked.
          </p>
        )}
      </div>
      {mode === 'rename' ? (
        <form
          className="inline-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await onRename(snapshot.id, name)) closeForm();
          }}
        >
          <label>
            New name
            <input
              autoFocus
              value={name}
              disabled={disabled}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button disabled={disabled || !name.trim()}>Save name</button>
          <button type="button" disabled={disabled} onClick={closeForm}>
            Cancel
          </button>
        </form>
      ) : mode === 'delete' ? (
        <div className="actions">
          <span>Delete?</span>
          <button
            disabled={disabled}
            onClick={async () => {
              if (await onDelete(snapshot.id)) {
                setMode('idle');
                onDeleted();
              }
            }}
          >
            Confirm
          </button>
          <button disabled={disabled} onClick={closeForm}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="actions">
          <button
            disabled={disabled || !compatible}
            onClick={() => onOpen(snapshot)}
          >
            Open
          </button>
          <button
            disabled={disabled}
            ref={renameButton}
            onClick={() => {
              setName(snapshot.name);
              setMode('rename');
            }}
          >
            Rename
          </button>
          <button
            ref={deleteButton}
            disabled={disabled}
            onClick={() => setMode('delete')}
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

export function SnapshotList(props: {
  snapshots: ContractSnapshot[];
  disabled: boolean;
  onOpen: (snapshot: ContractSnapshot) => void;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onDeleted: () => void;
}) {
  return props.snapshots.length ? (
    <ul className="snapshot-list" aria-labelledby="snapshots-heading">
      {props.snapshots.map((snapshot) => (
        <SnapshotRow key={snapshot.id} {...props} snapshot={snapshot} />
      ))}
    </ul>
  ) : (
    <p className="empty compact">
      No saved snapshots. Save a contract to establish a baseline.
    </p>
  );
}
