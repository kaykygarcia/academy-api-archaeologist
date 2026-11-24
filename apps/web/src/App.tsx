import { useState } from 'react';
import type { SampleInput as Sample } from '@api-archaeologist/core';
import type { Result } from './lib/result';
import { useAnalysis } from './lib/analysis-client';
import { exampleSamples } from './lib/example';
import { SamplesPanel } from './features/samples/SamplesPanel';
import { useSamples, type Report } from './features/samples/useSamples';
import { ContractSection } from './features/contract/ContractSection';
import { ThemeToggle } from './components/ThemeToggle';
import { GitHubIcon } from './components/icons';

const repository: string | undefined = import.meta.env.VITE_REPOSITORY_URL;

type Notice = { id: number; text: string; tone?: 'error' };

export function App() {
  const [result, setResult] = useState<Result | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const report: Report = (text, tone) =>
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, text, tone }));
  const sampleState = useSamples(report);
  const { run, cancel, busy } = useAnalysis(
    (response) => {
      if ('phase' in response)
        setAnnouncement(`${phaseLabel(response.phase)}…`);
      else if ('errors' in response) {
        setResult(null);
        setErrors(response.errors);
        setAnnouncement(
          response.validation ? 'Falha na validação.' : 'Falha na análise.',
        );
      } else {
        setErrors([]);
        setResult({ ...response.result, revision: response.id });
        setAnnouncement('Contrato pronto.');
      }
    },
    (message, cancelled) => {
      if (cancelled) {
        report(message, 'error');
        return;
      }
      setResult(null);
      setErrors([message]);
    },
  );
  const locked = busy || sampleState.reading;

  function analyze(input: Sample[]) {
    setAnnouncement('Iniciando análise…');
    run({ type: 'analyze', samples: input });
  }

  function loadExample() {
    if (locked) return;
    sampleState.replace(exampleSamples);
    analyze(exampleSamples);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg
            className="logo"
            width="22"
            height="22"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 5H7v22h5m8-22h5v22h-5M12 12h8m-8 4h6m-6 4h8"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1>API Archaeologist</h1>
          <span className="brand-tag">Kayky Academy Lab</span>
        </div>
        <nav aria-label="Ações principais">
          <button
            className="ghost small"
            disabled={locked}
            onClick={loadExample}
          >
            Carregar exemplo
          </button>
          {repository && (
            <a
              className="icon-button"
              href={repository}
              rel="noreferrer"
              aria-label="GitHub"
              title="GitHub"
            >
              <GitHubIcon />
            </a>
          )}
          <ThemeToggle />
        </nav>
      </header>
      <main className="workbench">
        <SamplesPanel
          state={sampleState}
          report={report}
          locked={locked}
          busy={busy}
          onAnalyze={analyze}
          onCancel={() => {
            if (cancel()) report('Análise cancelada');
          }}
        />
        <ContractSection
          result={result}
          errors={errors}
          busy={busy}
          locked={locked}
          report={report}
          loadExample={loadExample}
        />
      </main>
      <div className="toast-region" role="status" aria-live="polite">
        {notice && (
          <p
            key={notice.id}
            className={`toast${notice.tone === 'error' ? ' error' : ''}`}
          >
            {notice.text}
          </p>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function phaseLabel(phase: 'parsing' | 'inferring' | 'generating'): string {
  if (phase === 'parsing') return 'Interpretando amostras';
  if (phase === 'inferring') return 'Inferindo contrato';
  return 'Gerando código';
}
