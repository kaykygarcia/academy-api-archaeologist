import type { Metadata, Result } from './lib/result';
import { useRef, useState } from 'react';
import {
  pluralize,
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
    'Pronto. Adicione amostras ou carregue o exemplo.',
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
        ? `Falha na validação: ${messages.length.toLocaleString('pt-BR')} ${pluralize(messages.length, 'erro', 'erros')}.`
        : 'Falha na operação. Consulte o resumo de erros.',
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
          `Comparação concluída. ${response.changes.length.toLocaleString('pt-BR')} ${pluralize(response.changes.length, 'alteração observada', 'alterações observadas')}.`,
        );
      } else if (pending.current) {
        setResult({
          ...response.result,
          metadata: pending.current,
          revision: response.id,
        });
        pending.current = null;
        setStatus('Contrato pronto. Confira as evidências observadas abaixo.');
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
    setStatus('Iniciando análise…');
    operation.current = 'analyze';
    run({ type: 'analyze', samples: input });
  }
  function loadExample(current: boolean) {
    const input = current ? currentSamples : baselineSamples;
    const metadata = {
      dataset: 'Exemplo de pedidos',
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
    setStatus('Abrindo snapshot…');
    operation.current = 'open';
    run({ type: 'open', contract: snapshot.contract });
  }
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#main">
          API Archaeologist
        </a>
        <nav aria-label="Navegação principal">
          <a href="#snapshots">Snapshots salvos</a>
          {repository && (
            <a href={repository} rel="noreferrer">
              GitHub
            </a>
          )}
        </nav>
      </header>
      <main id="main">
        <section className="intro">
          <p className="eyebrow">
            Kayky Academy / Ferramentas para desenvolvedores
          </p>
          <h1>
            Entenda sua API <br />
            pelas evidências que ela deixa.
          </h1>
          <p>Infira, examine e compare contratos a partir de respostas JSON.</p>
          <div className="actions">
            <button
              className="primary"
              disabled={locked}
              onClick={() => loadExample(false)}
            >
              Carregar exemplo
            </button>
            <span className="privacy">Seus dados ficam neste navegador</span>
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
            aria-label="Resumo de erros"
          >
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
        {example && (
          <aside className="example-hint">
            <strong>Exemplo</strong>
            {example === 'baseline' ? (
              <>
                <p>
                  Salve primeiro o snapshot do baseline. Depois carregue novas
                  observações e compare com o baseline salvo.
                </p>
                <button disabled={locked} onClick={() => loadExample(true)}>
                  Carregar novas observações
                </button>
              </>
            ) : (
              <>
                <p>
                  Escolha o baseline salvo e “Análise atual” abaixo e, em
                  seguida, clique em Comparar.
                </p>
                <button
                  onClick={() => {
                    comparisonHeading.current?.scrollIntoView();
                    comparisonHeading.current?.focus();
                  }}
                >
                  Ir para a comparação
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
                setStatus('Análise cancelada');
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
              ? `Snapshot aberto: ${snapshots.find((snapshot) => snapshot.id === result.metadata.snapshotId)?.name ?? result.metadata.dataset}`
              : 'Análise atual'
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
            setStatus('Comparando observações…');
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
  if (phase === 'parsing') return 'Interpretando amostras';
  if (phase === 'inferring') return 'Inferindo contrato';
  return 'Gerando exportações';
}
