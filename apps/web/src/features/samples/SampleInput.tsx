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
        name="Entrada de amostras"
        labels={['Colar JSON', 'Enviar arquivos']}
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
              label="Amostra JSON"
            />
            <button
              disabled={disabled || reading || !text.trim()}
              onClick={() => {
                if (onAdd([{ name: `amostra-${number}.json`, text }])) {
                  setNumber(number + 1);
                  setText('');
                }
              }}
            >
              Adicionar amostra
            </button>
            {!text.trim() && (
              <p className="note">
                Cole uma resposta JSON para adicionar uma amostra.
              </p>
            )}
          </>
        ) : (
          <label className="upload">
            Escolher arquivos JSON
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
      {reading && (
        <p>Lendo arquivos localmente. Aguarde antes de adicionar mais.</p>
      )}
      <p className="note">
        Cada documento JSON é o corpo de uma resposta. Um array na raiz conta
        como uma amostra, não uma por elemento. JSONL não é aceito.
      </p>
    </>
  );
}
