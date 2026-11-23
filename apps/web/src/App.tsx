import type { Metadata, Result } from './lib/result';
import { useRef, useState } from 'react';
import {
  type ContractChange,
  type SampleInput as Sample,
} from '@api-archaeologist/core';
import { useAnalysis } from './lib/analysis-client';
import { baselineSamples, currentSamples } from './lib/example';
import { SamplesPanel } from './features/samples/SamplesPanel';
import { useSamples } from './features/samples/useSamples';
import { Footer } from './components/Footer';
import { ContractSection } from './features/contract/ContractSection';
import { ExportPanel } from './features/contract/ExportPanel';
import {
  isCompatibleSnapshot,
  type ContractSnapshot,
} from './features/snapshots/db';
import { useSnapshots } from './features/snapshots/useSnapshots';
import { SnapshotsSection } from './features/snapshots/SnapshotsSection';
import { ComparisonPanel } from './features/comparison/ComparisonPanel';

const repository: string | undefined = import.meta.env.VITE_REPOSITORY_URL;

export function App() {
  const [result, setResult] = useState<Result | null>(null);
  const [changes, setChanges] = useState<ContractChange[] | null>(null);
  const [status, setStatus] = useState(
    'Ready. Add samples or load the example.',
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [example, setExample] = useState<'baseline' | 'current' | null>(null);
  const sampleState = useSamples(setStatus);
  const { samples, dataset, method, endpoint, reading } = sampleState;
  const comparedIds = useRef<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = useRef<Metadata | null>(null);
  const statusRegion = useRef<HTMLDivElement>(null);
  const errorSummary = useRef<HTMLUListElement>(null);
  const comparisonHeading = useRef<HTMLHeadingElement>(null);
  const operation = useRef<'analyze' | 'open' | 'compare'>('analyze');
  function fail(messages: string[], cancelled = false, validation = false) {
    setErrors(messages);
    if (operation.current === 'analyze' && !cancelled) setResult(null);
    setChanges(null);
    pending.current = null;
    setStatus(
      validation
        ? `Validation failed: ${messages.length} ${messages.length === 1 ? 'error' : 'errors'}.`
        : 'Operation failed. See the error summary.',
    );
    requestAnimationFrame(() => errorSummary.current?.focus());
  }
  const { run, cancel, busy } = useAnalysis(
    (response) => {
      if ('phase' in response) setStatus(`${phaseLabel(response.phase)}…`);
      else if ('errors' in response)
        fail(response.errors, false, response.validation);
      else if ('changes' in response) {
        setChanges(response.changes);
        setStatus(
          `Comparison complete. ${response.changes.length} observed changes.`,
        );
      } else if (pending.current) {
        setResult({
          ...response.result,
          metadata: pending.current,
          revision: response.id,
        });
        pending.current = null;
        setStatus('Contract ready. Inspect the observed evidence below.');
        requestAnimationFrame(() => heading.current?.focus());
      }
    },
    (message, cancelled) => fail([message], cancelled),
  );
  const storage = useSnapshots(setStatus, (id) => {
    if (comparedIds.current.includes(id)) setChanges(null);
  });
  const { snapshots, storageBusy } = storage;
  const locked = busy || reading || storageBusy;
  function analyze(input: Sample[], metadata: Metadata) {
    setErrors([]);
    setChanges(null);
    pending.current = metadata;
    setStatus('Starting analysis…');
    operation.current = 'analyze';
    run({ type: 'analyze', samples: input });
  }
  function loadExample(current: boolean) {
    const input = current ? currentSamples : baselineSamples;
    const metadata = {
      dataset: 'Orders example',
      method: 'GET',
      endpoint: '/orders/:id',
      opened: false,
    };
    sampleState.replace(input, metadata);
    setExample(current ? 'current' : 'baseline');
    analyze(input, metadata);
    if (current) requestAnimationFrame(() => statusRegion.current?.focus());
  }
  function open(snapshot: ContractSnapshot) {
    if (!isCompatibleSnapshot(snapshot)) return;
    setErrors([]);
    setChanges(null);
    pending.current = {
      dataset: snapshot.name,
      method: snapshot.method ?? '',
      endpoint: snapshot.endpoint ?? '',
      opened: true,
      snapshotId: snapshot.id,
    };
    setStatus('Opening snapshot…');
    operation.current = 'open';
    run({ type: 'open', contract: snapshot.contract });
  }
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#main">
          API Archaeologist
        </a>
        <nav aria-label="Main navigation">
          <a href="#snapshots">Saved snapshots</a>
          {repository && (
            <a href={repository} rel="noreferrer">
              GitHub
            </a>
          )}
        </nav>
      </header>
      <main id="main">
        <section className="intro">
          <p className="eyebrow">Kayky Academy / Developer tools</p>
          <h1>
            Understand your API,
            <br />
            from the evidence it leaves behind.
          </h1>
          <p>Infer, inspect and compare contracts from JSON responses.</p>
          <div className="actions">
            <button
              className="primary"
              disabled={locked}
              onClick={() => loadExample(false)}
            >
              Load example
            </button>
            <span className="privacy">Your data stays in this browser</span>
          </div>
        </section>
        <div
          ref={statusRegion}
          tabIndex={-1}
          className="status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {status}
        </div>
        {errors.length > 0 && (
          <ul
            className="error-box"
            ref={errorSummary}
            tabIndex={-1}
            aria-label="Error summary"
          >
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
        {example && (
          <aside className="example-hint">
            <strong>Example</strong>
            {example === 'baseline' ? (
              <>
                <p>
                  Save the baseline snapshot first. Then load new observations
                  and compare them against your saved baseline.
                </p>
                <button disabled={locked} onClick={() => loadExample(true)}>
                  Load new observations
                </button>
              </>
            ) : (
              <>
                <p>
                  Choose your saved baseline and Current analysis below, then
                  Compare.
                </p>
                <button
                  onClick={() => {
                    comparisonHeading.current?.scrollIntoView();
                    comparisonHeading.current?.focus();
                  }}
                >
                  Go to comparison
                </button>
              </>
            )}
          </aside>
        )}
        <div className="workspace">
          <SamplesPanel
            state={sampleState}
            locked={locked}
            busy={busy}
            storageBusy={storageBusy}
            onAnalyze={() =>
              analyze(
                samples.map(({ name, text }) => ({ name, text })),
                { dataset, method, endpoint, opened: false },
              )
            }
            onCancel={() => {
              const restarted = cancel();
              pending.current = null;
              if (restarted) {
                setStatus('Analysis cancelled');
                requestAnimationFrame(() => statusRegion.current?.focus());
              }
            }}
          />
          <ContractSection result={result} busy={busy} heading={heading} />
        </div>
        <ExportPanel
          result={result}
          dataset={result?.metadata.dataset ?? dataset}
          report={setStatus}
        />
        <SnapshotsSection
          result={result}
          locked={locked}
          storage={storage}
          open={open}
          onRenamed={(id, name) => {
            setResult((current) =>
              current?.metadata.snapshotId === id
                ? {
                    ...current,
                    metadata: { ...current.metadata, dataset: name },
                  }
                : current,
            );
          }}
        />
        <ComparisonPanel
          headingRef={comparisonHeading}
          currentSnapshotId={result?.metadata.snapshotId}
          currentLabel={
            result?.metadata.opened
              ? `Opened snapshot: ${snapshots.find((snapshot) => snapshot.id === result.metadata.snapshotId)?.name ?? result.metadata.dataset}`
              : 'Current analysis'
          }
          snapshots={snapshots}
          current={result?.contract ?? null}
          changes={changes}
          busy={locked}
          onReset={() => setChanges(null)}
          onCompare={(baseline, current, snapshotIds) => {
            comparedIds.current = snapshotIds;
            setChanges(null);
            setErrors([]);
            setStatus('Comparing observations…');
            operation.current = 'compare';
            run({ type: 'compare', baseline, current });
          }}
        />
        <Footer repository={repository} />
      </main>
    </>
  );
}

function phaseLabel(phase: 'parsing' | 'inferring' | 'generating'): string {
  if (phase === 'parsing') return 'Parsing samples';
  if (phase === 'inferring') return 'Inferring contract';
  return 'Generating exports';
}
