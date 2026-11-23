import type { Metadata, Result } from './lib/result';
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  pluralize,
  type ContractChange,
  type AlignedRow,
  type SampleInput as Sample,
} from '@api-archaeologist/core';
import { useAnalysis } from './lib/analysis-client';
import { baselineSamples, currentSamples } from './lib/example';
import { SamplesPanel } from './features/samples/SamplesPanel';
import { useSamples } from './features/samples/useSamples';
import { Footer } from './components/Footer';
import { ContractSection } from './features/contract/ContractSection';
import { TabList, TabPanel } from './components/Tabs';
import {
  isCompatibleSnapshot,
  saveSnapshot,
  type ContractSnapshot,
} from './features/snapshots/db';
import { useSnapshots } from './features/snapshots/useSnapshots';
import { SnapshotsSection } from './features/snapshots/SnapshotsSection';
import { ComparisonPanel } from './features/comparison/ComparisonPanel';

const repository: string | undefined = import.meta.env.VITE_REPOSITORY_URL;

export function App() {
  const [focusRequest, setFocusRequest] = useState<{
    target: RefObject<HTMLElement | null>;
  } | null>(null);
  useEffect(() => {
    focusRequest?.target.current?.focus();
  }, [focusRequest]);
  const [tab, setTab] = useState(0);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const exampleComparison = useRef<{ focus: boolean } | null>(null);
  const compareButton = useRef<HTMLButtonElement>(null);
  function switchTab(index: number) {
    setTab(index);
    requestAnimationFrame(() =>
      document.getElementById(`app-tab-${index}`)?.focus(),
    );
  }
  const [result, setResult] = useState<Result | null>(null);
  const [comparison, setComparison] = useState<{
    changes: ContractChange[];
    rows: AlignedRow[];
  } | null>(null);
  function clearComparison() {
    setComparison(null);
  }
  const [status, setStatus] = useState(
    'Pronto. Adicione amostras ou carregue o exemplo.',
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [example, setExample] = useState<'baseline' | 'current' | null>(null);
  const sampleState = useSamples(setStatus);
  const { samples, dataset, method, endpoint, reading } = sampleState;
  const comparedIds = useRef<string[]>([]);
  const heading = useRef<HTMLParagraphElement>(null);
  const pending = useRef<Metadata | null>(null);
  const statusRegion = useRef<HTMLDivElement>(null);
  const errorSummary = useRef<HTMLUListElement>(null);
  const comparisonHeading = useRef<HTMLParagraphElement>(null);
  const operation = useRef<'analyze' | 'open' | 'compare'>('analyze');
  function fail(messages: string[], cancelled = false, validation = false) {
    exampleComparison.current = null;
    setExample(null);
    setErrors(messages);
    if (operation.current === 'analyze' && !cancelled) setResult(null);
    clearComparison();
    pending.current = null;
    setStatus(
      validation
        ? `Falha na validação: ${messages.length.toLocaleString('pt-BR')} ${pluralize(messages.length, 'erro', 'erros')}.`
        : 'Falha na operação. Consulte o resumo de erros.',
    );
    setFocusRequest({ target: errorSummary });
  }
  const { run, cancel, busy } = useAnalysis(
    (response) => {
      if ('phase' in response) setStatus(`${phaseLabel(response.phase)}…`);
      else if ('errors' in response)
        fail(response.errors, false, response.validation);
      else if ('changes' in response) {
        setComparison({ changes: response.changes, rows: response.rows });
        setTab(1);
        setFocusRequest({ target: comparisonHeading });
        setStatus(
          `Comparação concluída. ${response.changes.length.toLocaleString('pt-BR')} ${pluralize(response.changes.length, 'alteração observada', 'alterações observadas')}.`,
        );
      } else if (pending.current) {
        setResult({
          ...response.result,
          metadata: pending.current,
          revision: response.id,
        });
        pending.current = null;
        setStatus('Contrato pronto.');
        if (exampleComparison.current) {
          if (exampleComparison.current.focus)
            setFocusRequest({ target: compareButton });
          exampleComparison.current = null;
          setTab(1);
        } else {
          setTab(0);
          setFocusRequest({ target: heading });
        }
      }
    },
    (message, cancelled) => fail([message], cancelled),
  );
  const storage = useSnapshots(
    setStatus,
    (id) => {
      if (comparedIds.current.includes(id)) clearComparison();
    },
    (message) => {
      setStatus(message);
      setFocusRequest({ target: tab === 2 ? statusRegion : errorSummary });
    },
  );
  const { snapshots, storageBusy } = storage;
  const locked = busy || reading || storageBusy;
  const visibleErrors = [
    ...errors,
    ...(tab !== 2 && storage.storageMessage ? [storage.storageMessage] : []),
  ];
  function analyze(
    input: Sample[],
    metadata: Metadata,
    preserveStorageError = false,
  ) {
    if (!preserveStorageError) storage.clearMessage();
    setErrors([]);
    clearComparison();
    pending.current = metadata;
    setStatus('Iniciando análise…');
    operation.current = 'analyze';
    run({ type: 'analyze', samples: input });
  }
  function loadExample(current: boolean, preserveStorageError = false) {
    setTab(0);
    const input = current ? currentSamples : baselineSamples;
    const metadata = {
      dataset: 'Exemplo de pedidos',
      method: 'GET',
      endpoint: '/orders/:id',
      opened: false,
    };
    sampleState.replace(input, metadata);
    setExample(current ? 'current' : 'baseline');
    analyze(input, metadata, preserveStorageError);
    if (current && !preserveStorageError)
      setFocusRequest({ target: statusRegion });
  }
  async function saveAndLoadExample() {
    if (!result || locked) return;
    const saved = await storage.write(async () => {
      const snapshot = await saveSnapshot({
        name: 'Baseline de pedidos',
        method: result.metadata.method,
        endpoint: result.metadata.endpoint,
        contract: result.contract,
      });
      setBaseline(snapshot.id);
      setNext('current');
    }, 'Snapshot salvo.');
    if (saved.done) {
      exampleComparison.current = { focus: saved.refreshed };
      loadExample(true, !saved.refreshed);
    }
  }
  function open(snapshot: ContractSnapshot) {
    storage.clearMessage();
    if (!isCompatibleSnapshot(snapshot)) return;
    setExample(null);
    setErrors([]);
    clearComparison();
    pending.current = {
      dataset: snapshot.name,
      method: snapshot.method ?? '',
      endpoint: snapshot.endpoint ?? '',
      opened: true,
      snapshotId: snapshot.id,
    };
    setStatus('Abrindo snapshot…');
    operation.current = 'open';
    run({ type: 'open', contract: snapshot.contract });
  }
  return (
    <>
      <header className="site-header">
        <div className="brand">
          <h1 className="wordmark">API Archaeologist</h1>
          <small>Lab · Kayky Academy</small>
        </div>
        <TabList
          id="app"
          name="Navegação principal"
          labels={['Contrato', 'Comparar', `Snapshots (${snapshots.length})`]}
          active={tab}
          onChange={setTab}
        />
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
        <nav aria-label="Ações principais">
          <button
            disabled={locked}
            aria-describedby={locked ? 'operation-locked-reason' : undefined}
            onClick={() => loadExample(false)}
          >
            Carregar exemplo
          </button>
          {repository && (
            <a href={repository} rel="noreferrer">
              GitHub
            </a>
          )}
        </nav>
      </header>
      <main id="main">
        <p id="operation-locked-reason" className="sr-only">
          Aguarde a conclusão da operação atual.
        </p>
        {visibleErrors.length > 0 && (
          <ul
            className="error-box"
            ref={errorSummary}
            tabIndex={-1}
            aria-label="Resumo de erros"
          >
            {visibleErrors.map((error, index) => (
              <li key={index}>
                {error}
                {index === errors.length && storage.storageMessage && (
                  <button
                    className="retry-button"
                    disabled={locked}
                    onClick={() => void storage.retry()}
                  >
                    Tentar novamente
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <TabPanel id="app" index={0} active={tab}>
          {example && (
            <aside className="example-hint">
              {example === 'baseline' ? (
                <>
                  <span>
                    Exemplo: salve o snapshot e depois carregue as novas
                    observações.
                  </span>
                  <button
                    disabled={locked || !result}
                    aria-describedby={
                      locked || !result ? 'example-save-reason' : undefined
                    }
                    className="primary"
                    onClick={() => void saveAndLoadExample()}
                  >
                    Salvar e carregar novas observações
                  </button>
                  <span id="example-save-reason" className="sr-only">
                    {locked
                      ? 'Aguarde a conclusão da operação atual.'
                      : !result
                        ? 'Analise o exemplo antes de salvar.'
                        : ''}
                  </span>
                  <button
                    className="text-button"
                    disabled={locked}
                    onClick={() => loadExample(true)}
                  >
                    Carregar novas observações
                  </button>
                </>
              ) : (
                <>
                  <span>
                    Exemplo: compare o baseline salvo com a análise atual.
                  </span>
                  <button onClick={() => switchTab(1)}>
                    Ir para a comparação
                  </button>
                </>
              )}
            </aside>
          )}
          <div className="workspace">
            <SamplesPanel
              state={sampleState}
              report={setStatus}
              locked={locked}
              busy={busy}
              storageBusy={storageBusy}
              onAnalyze={(additions = []) => {
                setExample(null);
                analyze(
                  [
                    ...samples.map(({ name, text }) => ({ name, text })),
                    ...additions,
                  ],
                  { dataset, method, endpoint, opened: false },
                );
              }}
              onCancel={() => {
                exampleComparison.current = null;
                const restarted = cancel();
                pending.current = null;
                if (restarted) {
                  setStatus('Análise cancelada');
                  setFocusRequest({ target: statusRegion });
                }
              }}
            />
            <ContractSection
              result={result}
              busy={busy}
              locked={locked}
              heading={heading}
              storage={storage}
              report={setStatus}
              loadExample={() => loadExample(false)}
            />
          </div>
        </TabPanel>
        <TabPanel id="app" index={1} active={tab}>
          <ComparisonPanel
            summaryRef={comparisonHeading}
            buttonRef={compareButton}
            baseline={baseline}
            next={next}
            onBaseline={setBaseline}
            onNext={setNext}
            onContract={() => switchTab(0)}
            currentSnapshotId={result?.metadata.snapshotId}
            currentLabel={
              result?.metadata.opened
                ? `Snapshot aberto: ${snapshots.find((snapshot) => snapshot.id === result.metadata.snapshotId)?.name ?? result.metadata.dataset}`
                : 'Análise atual'
            }
            snapshots={snapshots}
            current={result?.contract ?? null}
            changes={comparison?.changes ?? null}
            rows={comparison?.rows ?? []}
            busy={locked}
            onReset={clearComparison}
            onCompare={(baseline, current, snapshotIds) => {
              storage.clearMessage();
              comparedIds.current = snapshotIds;
              clearComparison();
              setErrors([]);
              setStatus('Comparando observações…');
              operation.current = 'compare';
              run({ type: 'compare', baseline, current });
            }}
          />
        </TabPanel>
        <TabPanel id="app" index={2} active={tab}>
          <SnapshotsSection
            locked={locked}
            storage={storage}
            open={open}
            compare={(snapshot) => {
              storage.clearMessage();
              setBaseline(snapshot.id);
              setNext('current');
              clearComparison();
              switchTab(1);
            }}
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
        </TabPanel>
        <Footer repository={repository} />
      </main>
    </>
  );
}

function phaseLabel(phase: 'parsing' | 'inferring' | 'generating'): string {
  if (phase === 'parsing') return 'Interpretando amostras';
  if (phase === 'inferring') return 'Inferindo contrato';
  return 'Gerando exportações';
}
