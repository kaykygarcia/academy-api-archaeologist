import { useRef, useState } from 'react';
import type { Result } from '../../lib/result';
import { sharingWarning } from '../contract/ExportPanel';
import {
  saveSnapshot,
  renameSnapshot,
  deleteSnapshot,
  suggestedName,
  type ContractSnapshot,
} from './db';
import { SaveSnapshotForm } from './SaveSnapshotForm';
import { SnapshotList } from './SnapshotList';
import type { useSnapshots } from './useSnapshots';

export function SnapshotsSection({
  result,
  locked,
  storage,
  open,
  onRenamed,
}: {
  result: Result | null;
  locked: boolean;
  storage: ReturnType<typeof useSnapshots>;
  open: (snapshot: ContractSnapshot) => void;
  onRenamed: (id: string, name: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  if (!result && saving) setSaving(false);
  const saveButton = useRef<HTMLButtonElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const { snapshots, storageMessage, write, retry } = storage;
  function closeSave() {
    setSaving(false);
    requestAnimationFrame(() => saveButton.current?.focus());
  }
  return (
    <section
      className="section"
      id="snapshots"
      aria-labelledby="snapshots-heading"
    >
      <p className="eyebrow">03 / Mantenha um baseline</p>
      <h2 id="snapshots-heading" ref={listHeading} tabIndex={-1}>
        Snapshots salvos
      </h2>
      <p>
        Somente o contrato e as evidências agregadas são armazenados, não as
        respostas JSON originais.
      </p>
      <p className="note">{sharingWarning}</p>
      {saving && result ? (
        <SaveSnapshotForm
          suggestion={suggestedName(
            result.metadata.dataset,
            result.metadata.method,
            result.metadata.endpoint,
          )}
          busy={locked}
          onCancel={closeSave}
          onSave={async (name) => {
            if (
              await write(
                () =>
                  saveSnapshot({
                    name,
                    method: result.metadata.method || undefined,
                    endpoint: result.metadata.endpoint || undefined,
                    contract: result.contract,
                  }),
                'Snapshot salvo.',
              )
            )
              closeSave();
          }}
        />
      ) : (
        <button
          ref={saveButton}
          disabled={!result || locked}
          onClick={() => setSaving(true)}
        >
          Salvar snapshot
        </button>
      )}
      {!result && (
        <p className="note">
          Analise amostras ou abra um snapshot compatível antes de salvar.
        </p>
      )}
      {storageMessage && (
        <div className="error-box">
          <p>{storageMessage}</p>
          <button disabled={locked} onClick={() => void retry()}>
            Tentar novamente
          </button>
        </div>
      )}
      <SnapshotList
        onDeleted={() =>
          requestAnimationFrame(() => listHeading.current?.focus())
        }
        snapshots={snapshots}
        disabled={locked}
        onOpen={open}
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
        O armazenamento local não é uma cópia de segurança. Você ou o navegador
        podem apagá-lo. Nomes de propriedades e metadados ainda podem revelar
        informações da API.
      </p>
    </section>
  );
}
