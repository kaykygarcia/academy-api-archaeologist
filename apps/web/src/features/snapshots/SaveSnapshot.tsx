import { useEffect, useRef, useState } from 'react';
import type { Result } from '../../lib/result';
import { saveSnapshot, suggestedName } from './db';
import { SaveSnapshotForm } from './SaveSnapshotForm';
import type { useSnapshots } from './useSnapshots';

export function SaveSnapshot({
  result,
  locked,
  storage,
}: {
  result: Result;
  locked: boolean;
  storage: ReturnType<typeof useSnapshots>;
}) {
  const [saving, setSaving] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const [focusRequest, setFocusRequest] = useState<object | null>(null);
  const consumedFocus = useRef<object | null>(null);
  useEffect(() => {
    if (focusRequest && focusRequest !== consumedFocus.current && !locked) {
      button.current?.focus();
      consumedFocus.current = focusRequest;
    }
  }, [focusRequest, locked]);
  function close(restoreFocus = true) {
    setSaving(false);
    if (restoreFocus) setFocusRequest({});
  }
  return (
    <div className="save-snapshot">
      <button
        ref={button}
        disabled={locked}
        aria-describedby={locked ? 'operation-locked-reason' : undefined}
        aria-expanded={saving}
        onClick={() => {
          setFocusRequest(null);
          storage.clearMessage();
          setSaving(true);
        }}
      >
        Salvar snapshot
      </button>
      {saving && (
        <SaveSnapshotForm
          suggestion={suggestedName(
            result.metadata.dataset,
            result.metadata.method,
            result.metadata.endpoint,
          )}
          busy={locked}
          onCancel={() => close()}
          onSave={async (name) => {
            const outcome = await storage.write(
              () =>
                saveSnapshot({
                  name,
                  method: result.metadata.method || undefined,
                  endpoint: result.metadata.endpoint || undefined,
                  contract: result.contract,
                }),
              'Snapshot salvo.',
            );
            if (outcome.done) close(outcome.refreshed);
          }}
        />
      )}
    </div>
  );
}
