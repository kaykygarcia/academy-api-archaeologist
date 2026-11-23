import { useState } from 'react';

export function SaveSnapshotForm({
  suggestion,
  onSave,
  onCancel,
  busy,
}: {
  suggestion: string;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(suggestion);
  return (
    <form
      className="inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(name);
      }}
    >
      <label>
        Snapshot name
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
        />
      </label>
      <div className="actions">
        <button className="primary" disabled={busy || !name.trim()}>
          Save
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
      {!name.trim() && <p className="note">Enter a name before saving.</p>}
    </form>
  );
}
