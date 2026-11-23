import { useId, useState } from 'react';
import { type SampleInput as Sample } from '@api-archaeologist/core';
import { Tabs } from '../../components/Tabs';
import { LazyCodeEditor as CodeEditor } from '../../components/LazyCodeEditor';

export function SampleInput({
  onAdd,
  onAnalyze,
  disabled,
  onAddFiles,
  reading,
}: {
  onAnalyze: (additions: Sample[]) => void;
  reading: boolean;
  onAdd: (samples: Sample[]) => boolean;
  onAddFiles: (files: File[]) => Promise<void>;
  disabled: boolean;
}) {
  const hintId = useId();
  const modifier = /Mac/i.test(navigator.platform) ? 'Cmd' : 'Ctrl';
  const [tab, setTab] = useState(0);
  const [text, setText] = useState('');
  const [number, setNumber] = useState(1);
  function add(analyze = false) {
    if (disabled || reading || !text.trim()) return;
    const additions = [{ name: `amostra-${number}.json`, text }];
    if (!onAdd(additions)) return;
    setNumber(number + 1);
    setText('');
    if (analyze) onAnalyze(additions);
  }
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
              onSubmit={add}
              describedBy={hintId}
            />
            <div className="sample-actions">
              <button
                disabled={disabled || reading || !text.trim()}
                aria-describedby="sample-reason"
                onClick={() => add()}
              >
                Adicionar amostra
              </button>
              <span className="note shortcut-hint" id={hintId}>
                <kbd>{modifier}</kbd>+<kbd>Enter</kbd> adiciona ·{' '}
                <kbd>+Shift</kbd> analisa
              </span>
            </div>
            <p className="note" id="sample-reason">
              Cole uma resposta JSON. Um array na raiz conta como uma amostra;
              JSONL não é aceito.
            </p>
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
    </>
  );
}
