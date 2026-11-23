import { useState } from 'react';
import { type SampleInput as Sample } from '@api-archaeologist/core';
import { Tabs } from '../../components/Tabs';
import { LazyCodeEditor as CodeEditor } from '../../components/LazyCodeEditor';

export function SampleInput({
  onAdd,
  disabled,
  onAddFiles,
  reading,
}: {
  reading: boolean;
  onAdd: (samples: Sample[]) => boolean;
  onAddFiles: (files: File[]) => Promise<void>;
  disabled: boolean;
}) {
  const [tab, setTab] = useState(0);
  const [text, setText] = useState('');
  const [number, setNumber] = useState(1);
  return (
    <>
      <Tabs
        name="Sample input"
        labels={['Paste JSON', 'Upload files']}
        active={tab}
        onChange={setTab}
      >
        {tab === 0 ? (
          <>
            <CodeEditor
              mode="input"
              value={text}
              onChange={setText}
              readOnly={disabled || reading}
              label="JSON sample"
            />
            <button
              disabled={disabled || reading || !text.trim()}
              onClick={() => {
                if (onAdd([{ name: `sample-${number}.json`, text }])) {
                  setNumber(number + 1);
                  setText('');
                }
              }}
            >
              Add sample
            </button>
            {!text.trim() && (
              <p className="note">Paste a JSON response to add a sample.</p>
            )}
          </>
        ) : (
          <label className="upload">
            Choose JSON files
            <input
              type="file"
              multiple
              accept=".json,application/json"
              disabled={disabled || reading}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = '';
                void onAddFiles(files);
              }}
            />
          </label>
        )}
      </Tabs>
      {reading && <p>Reading files locally. Please wait before adding more.</p>}
      <p className="note">
        One JSON document is one response body. A root array is one sample, not
        one sample per element. JSONL is not supported.
      </p>
    </>
  );
}
