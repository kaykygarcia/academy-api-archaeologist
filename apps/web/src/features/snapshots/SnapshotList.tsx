import type { WriteResult } from './useSnapshots';
import { pluralize } from '@api-archaeologist/core';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { formatDateTime } from '../../lib/format';
import { isCompatibleSnapshot, type ContractSnapshot } from './db';

function SnapshotRow({
  snapshot,
  disabled,
  onOpen,
  onCompare,
  onRename,
  onDelete,
  onDeleted,
}: {
  snapshot: ContractSnapshot;
  disabled: boolean;
  onOpen: (snapshot: ContractSnapshot) => void;
  onCompare: (snapshot: ContractSnapshot) => void;
  onRename: (id: string, name: string) => Promise<WriteResult>;
  onDelete: (id: string) => Promise<WriteResult>;
  onDeleted: (refreshed: boolean) => void;
}) {
  const reasonId = useId();
  const [focusRequest, setFocusRequest] = useState<{
    target: RefObject<HTMLButtonElement | null>;
  } | null>(null);
  useEffect(() => {
    focusRequest?.target.current?.focus();
  }, [focusRequest]);
  const [mode, setMode] = useState<'idle' | 'rename' | 'delete'>('idle');
  const [name, setName] = useState(snapshot.name);
  const renameButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  function closeForm(restoreFocus = true) {
    const target = mode === 'rename' ? renameButton : deleteButton;
    setMode('idle');
    if (restoreFocus) setFocusRequest({ target });
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
          <p className="error-text" id={reasonId}>
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
            const outcome = await onRename(snapshot.id, name);
            if (outcome.done) closeForm(outcome.refreshed);
          }}
        >
          <label>
            Novo nome
            <input
              maxLength={200}
              autoFocus
              value={name}
              disabled={disabled}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button disabled={disabled || !name.trim()}>Salvar nome</button>
          <button type="button" disabled={disabled} onClick={() => closeForm()}>
            Cancelar
          </button>
        </form>
      ) : mode === 'delete' ? (
        <div className="actions">
          <span>Excluir?</span>
          <button
            disabled={disabled}
            onClick={async () => {
              const outcome = await onDelete(snapshot.id);
              if (outcome.done) {
                setMode('idle');
                onDeleted(outcome.refreshed);
              }
            }}
          >
            Confirmar
          </button>
          <button disabled={disabled} onClick={() => closeForm()}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="actions">
          <button
            disabled={disabled || !compatible}
            aria-describedby={!compatible ? reasonId : undefined}
            onClick={() => onOpen(snapshot)}
          >
            Abrir
          </button>
          <button
            disabled={disabled || !compatible}
            aria-describedby={!compatible ? reasonId : undefined}
            onClick={() => onCompare(snapshot)}
          >
            Comparar
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
  onCompare: (snapshot: ContractSnapshot) => void;
  onRename: (id: string, name: string) => Promise<WriteResult>;
  onDelete: (id: string) => Promise<WriteResult>;
  onDeleted: (refreshed: boolean) => void;
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
