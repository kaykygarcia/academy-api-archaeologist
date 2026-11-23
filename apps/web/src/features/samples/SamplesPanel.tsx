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
      <p className="eyebrow">01 / Workspace</p>
      <h2 id="samples-heading">Samples</h2>
      <label>
        Dataset name
        <input
          value={dataset}
          disabled={locked}
          placeholder="Untitled dataset"
          onChange={(event) => setDataset(event.target.value)}
        />
      </label>
      <div className="metadata">
        <label>
          Method (optional)
          <select
            value={method}
            disabled={locked}
            onChange={(event) => setMethod(event.target.value)}
          >
            <option value="">Not specified</option>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Path (optional)
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
          Analyze samples
        </button>
        {busy && <button onClick={onCancel}>Cancel</button>}
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
  if (busy) return 'Processing. Cancel to return to the previous result.';
  if (reading) return 'Wait for the selected files to finish reading.';
  if (storageBusy) return 'Wait for the snapshot operation to finish.';
  if (!count) return 'Add at least one sample to enable analysis.';
  return 'Ready to analyze. Results update only when analysis succeeds.';
}
