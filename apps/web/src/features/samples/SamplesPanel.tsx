import { useId, useRef, useState } from 'react';
import type { SampleInput as Sample } from '@api-archaeologist/core';
import { LazyCodeEditor as CodeEditor } from '../../components/LazyCodeEditor';
import {
  CloseIcon,
  FileIcon,
  PlusIcon,
  TrashIcon,
} from '../../components/icons';
import type { Report, useSamples } from './useSamples';

const modifier = /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl';

export function SamplesPanel({
  state,
  report,
  locked,
  busy,
  onAnalyze,
  onCancel,
}: {
  state: ReturnType<typeof useSamples>;
  report: Report;
  locked: boolean;
  busy: boolean;
  onAnalyze: (samples: Sample[]) => void;
  onCancel: () => void;
}) {
  const hintId = useId();
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState('');
  const [number, setNumber] = useState(1);
  const { samples, selected, reading } = state;
  const shown = samples.find((sample) => sample.id === selected);
  const draft = !shown;
  const blocked = locked || reading;

  function addDraft(announce: boolean) {
    const added = state.add(
      [{ name: `amostra-${number}.json`, text }],
      announce,
    );
    if (!added) return null;
    setNumber(number + 1);
    setText('');
    return added;
  }

  function submit(analyze: boolean) {
    if (blocked) return;
    if (!analyze) {
      if (draft && text.trim()) addDraft(true);
      return;
    }
    let all = samples.filter((sample) => sample.text.trim());
    if (draft && text.trim()) {
      const added = addDraft(false);
      if (!added) return;
      all = [...all, ...added];
      state.select(added[0]?.id ?? null);
    }
    if (all.length) onAnalyze(all.map(({ name, text }) => ({ name, text })));
  }

  async function addFiles(files: File[]) {
    const added = await state.addFiles(files);
    if (added?.[0]) state.select(added[0].id);
  }

  return (
    <section
      className={`pane input-pane${dragging ? ' dragging' : ''}`}
      aria-label="Amostras"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = blocked ? 'none' : 'copy';
      }}
      onDragLeave={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (blocked) report('Aguarde a operação atual terminar.', 'error');
        else void addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <header className="pane-header">
        {samples.length ? (
          <ul className="chips" aria-label="Amostras adicionadas">
            {samples.map((sample) => (
              <li
                key={sample.id}
                className={`chip${sample.id === selected ? ' active' : ''}`}
              >
                <button
                  className="chip-label"
                  aria-pressed={sample.id === selected}
                  title={`${sample.bytes.toLocaleString('pt-BR')} bytes`}
                  onClick={() => state.select(sample.id)}
                >
                  {sample.name}
                </button>
                <button
                  className="chip-remove"
                  disabled={blocked}
                  aria-label={`Remover ${sample.name}`}
                  onClick={() => state.remove(sample.id)}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
            <li className={`chip chip-new${draft ? ' active' : ''}`}>
              <button
                className="chip-label"
                aria-pressed={draft}
                onClick={() => state.select(null)}
              >
                <PlusIcon />
                Nova
              </button>
            </li>
          </ul>
        ) : (
          <p className="pane-title">Entrada</p>
        )}
        {samples.length > 0 && (
          <button
            className="icon-button"
            disabled={blocked}
            aria-label="Remover todas as amostras"
            title="Remover todas"
            onClick={state.clear}
          >
            <TrashIcon />
          </button>
        )}
      </header>
      <div className="editor-frame">
        <CodeEditor
          mode="input"
          value={shown ? shown.text : text}
          onChange={(value) =>
            shown ? state.update(shown.id, value) : setText(value)
          }
          readOnly={blocked}
          label="Amostra JSON"
          placeholder="Cole uma resposta JSON ou solte arquivos .json aqui"
          onSubmit={submit}
          describedBy={hintId}
        />
      </div>
      <footer className="pane-footer">
        <label className={`button ghost${blocked ? ' disabled' : ''}`}>
          <FileIcon />
          <span>Arquivos</span>
          <input
            className="sr-only"
            type="file"
            multiple
            accept=".json,application/json"
            disabled={blocked}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = '';
              void addFiles(files);
            }}
          />
        </label>
        <span className="spacer" />
        {draft && text.trim() && (
          <button
            className="ghost"
            disabled={blocked}
            title={`${modifier}+Shift+Enter`}
            onClick={() => submit(false)}
          >
            <PlusIcon />
            Adicionar
          </button>
        )}
        {busy && (
          <button className="ghost cancel" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button
          className="primary"
          disabled={
            blocked ||
            !(samples.some((sample) => sample.text.trim()) || text.trim())
          }
          onClick={() => submit(true)}
        >
          Analisar
          <kbd aria-hidden="true">{modifier} ↵</kbd>
        </button>
        <span id={hintId} className="sr-only">
          {modifier}+Enter analisa. {modifier}+Shift+Enter adiciona sem
          analisar.
        </span>
      </footer>
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <FileIcon />
          {blocked ? 'Aguarde a operação atual' : 'Solte para adicionar'}
        </div>
      )}
    </section>
  );
}
