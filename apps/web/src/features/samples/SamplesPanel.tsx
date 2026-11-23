import { useRef, useState } from 'react';
import type { SampleInput as Sample } from '@api-archaeologist/core';
import { SampleInput } from './SampleInput';
import { SampleList } from './SampleList';
import type { useSamples } from './useSamples';

export function SamplesPanel({
  state,
  report,
  locked,
  busy,
  storageBusy,
  onAnalyze,
  onCancel,
}: {
  report: (message: string) => void;
  state: ReturnType<typeof useSamples>;
  locked: boolean;
  busy: boolean;
  storageBusy: boolean;
  onAnalyze: (additions?: Sample[]) => void;
  onCancel: () => void;
}) {
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const {
    samples,
    dataset,
    method,
    endpoint,
    reading,
    setDataset,
    setMethod,
    setEndpoint,
  } = state;
  return (
    <section
      className={`panel samples-panel${dragging && !locked ? ' dragging' : ''}`}
      aria-labelledby="samples-heading"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = locked ? 'none' : 'copy';
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
        if (locked) report('Aguarde a operação atual terminar.');
        else void state.addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      {dragging && !locked && (
        <div className="drop-overlay">
          Solte os arquivos JSON para adicionar
        </div>
      )}
      <h2 id="samples-heading">Amostras ({samples.length})</h2>
      <SampleInput
        onAdd={state.add}
        onAnalyze={onAnalyze}
        onAddFiles={state.addFiles}
        disabled={locked}
        reading={reading}
      />
      <SampleList samples={samples} disabled={locked} onRemove={state.remove} />
      <details>
        <summary>Detalhes</summary>
        <label>
          Nome do conjunto
          <input
            value={dataset}
            disabled={locked}
            placeholder="Conjunto sem nome"
            onChange={(event) => setDataset(event.target.value)}
          />
        </label>
        <div className="metadata">
          <label>
            Método (opcional)
            <select
              value={method}
              disabled={locked}
              onChange={(event) => setMethod(event.target.value)}
            >
              <option value="">Não especificado</option>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Endpoint (opcional)
            <input
              className="mono"
              maxLength={2000}
              placeholder="/orders/:id"
              value={endpoint}
              disabled={locked}
              onChange={(event) => setEndpoint(event.target.value)}
            />
          </label>
        </div>
      </details>
      <div className="actions">
        <button
          className="primary"
          disabled={locked || !samples.length}
          aria-describedby="analysis-reason"
          onClick={() => onAnalyze()}
        >
          Analisar amostras
        </button>
        {busy && <button onClick={onCancel}>Cancelar</button>}
      </div>
      <p id="analysis-reason" className="note">
        {analysisReason(busy, reading, storageBusy, samples.length)}
      </p>
    </section>
  );
}

function analysisReason(
  busy: boolean,
  reading: boolean,
  storageBusy: boolean,
  count: number,
): string {
  if (busy) return 'Processando. Cancele para voltar ao resultado anterior.';
  if (reading)
    return 'Aguarde a conclusão da leitura dos arquivos selecionados.';
  if (storageBusy) return 'Aguarde a conclusão da operação com o snapshot.';
  if (!count)
    return 'Adicione pelo menos uma amostra para habilitar a análise.';
  return '';
}
