import { SampleInput } from './SampleInput';
import { SampleList } from './SampleList';
import type { useSamples } from './useSamples';

export function SamplesPanel({
  state,
  locked,
  busy,
  storageBusy,
  onAnalyze,
  onCancel,
}: {
  state: ReturnType<typeof useSamples>;
  locked: boolean;
  busy: boolean;
  storageBusy: boolean;
  onAnalyze: () => void;
  onCancel: () => void;
}) {
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
    <section className="panel" aria-labelledby="samples-heading">
      <p className="eyebrow">01 / Área de trabalho</p>
      <h2 id="samples-heading">Amostras</h2>
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
            placeholder="/orders/:id"
            value={endpoint}
            disabled={locked}
            onChange={(event) => setEndpoint(event.target.value)}
          />
        </label>
      </div>
      <SampleInput
        onAdd={state.add}
        onAddFiles={state.addFiles}
        disabled={locked}
        reading={reading}
      />
      <SampleList samples={samples} disabled={locked} onRemove={state.remove} />
      <div className="actions">
        <button
          className="primary"
          disabled={locked || !samples.length}
          aria-describedby="analysis-reason"
          onClick={onAnalyze}
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
  return 'Pronto para analisar. Os resultados só são atualizados quando a análise é concluída com sucesso.';
}
