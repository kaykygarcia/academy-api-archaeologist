import { pluralize } from '@api-archaeologist/core';
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
          {snapshot.sampleCount.toLocaleString('pt-BR')}{' '}
          {pluralize(snapshot.sampleCount, 'amostra', 'amostras')}
        </small>
        {!compatible && (
          <p className="error-text">
            Versão incompatível do snapshot. A abertura e a comparação estão
            bloqueadas.
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
            Novo nome
            <input
              autoFocus
              value={name}
              disabled={disabled}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button disabled={disabled || !name.trim()}>Salvar nome</button>
          <button type="button" disabled={disabled} onClick={closeForm}>
            Cancelar
          </button>
        </form>
      ) : mode === 'delete' ? (
        <div className="actions">
          <span>Excluir?</span>
          <button
            disabled={disabled}
            onClick={async () => {
              if (await onDelete(snapshot.id)) {
                setMode('idle');
                onDeleted();
              }
            }}
          >
            Confirmar
          </button>
          <button disabled={disabled} onClick={closeForm}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="actions">
          <button
            disabled={disabled || !compatible}
            onClick={() => onOpen(snapshot)}
          >
            Abrir
          </button>
          <button
            disabled={disabled}
            ref={renameButton}
            onClick={() => {
              setName(snapshot.name);
              setMode('rename');
            }}
          >
            Renomear
          </button>
          <button
            ref={deleteButton}
            disabled={disabled}
            onClick={() => setMode('delete')}
          >
            Excluir
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
      Nenhum snapshot salvo. Salve um contrato para estabelecer um baseline.
    </p>
  );
}
