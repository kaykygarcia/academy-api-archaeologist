import { SnapshotTransfer } from './SnapshotTransfer';
import { useEffect, useRef, useState } from 'react';
import { renameSnapshot, deleteSnapshot, type ContractSnapshot } from './db';
import { SnapshotList } from './SnapshotList';
import type { useSnapshots } from './useSnapshots';

export function SnapshotsSection({
  locked,
  storage,
  open,
  compare,
  onRenamed,
}: {
  locked: boolean;
  storage: ReturnType<typeof useSnapshots>;
  open: (snapshot: ContractSnapshot) => void;
  compare: (snapshot: ContractSnapshot) => void;
  onRenamed: (id: string, name: string) => void;
}) {
  const listHeading = useRef<HTMLHeadingElement>(null);
  const [focusRequest, setFocusRequest] = useState<object | null>(null);
  useEffect(() => {
    if (focusRequest) listHeading.current?.focus();
  }, [focusRequest]);
  const { snapshots, storageMessage, write, retry } = storage;
  return (
    <section className="section" aria-labelledby="snapshots-heading">
      <SnapshotTransfer
        locked={locked}
        storage={storage}
        heading={
          <h2 id="snapshots-heading" ref={listHeading} tabIndex={-1}>
            Snapshots salvos ({snapshots.length})
          </h2>
        }
      />
      {storageMessage && (
        <div className="error-box">
          <p>{storageMessage}</p>
          <button disabled={locked} onClick={() => void retry()}>
            Tentar novamente
          </button>
        </div>
      )}
      <SnapshotList
        onDeleted={(refreshed) => {
          if (refreshed) setFocusRequest({});
        }}
        snapshots={snapshots}
        disabled={locked}
        onOpen={open}
        onCompare={compare}
        onRename={(id, name) =>
          write(
            async () => {
              await renameSnapshot(id, name);
              onRenamed(id, name.trim());
            },
            'Snapshot renomeado.',
            id,
          )
        }
        onDelete={(id) =>
          write(() => deleteSnapshot(id), 'Snapshot excluído.', id)
        }
      />
      <p className="note">
        Armazenamento local não é cópia de segurança. Apenas contrato e
        evidências.
      </p>
    </section>
  );
}
