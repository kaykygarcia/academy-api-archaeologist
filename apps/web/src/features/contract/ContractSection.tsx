import { pluralize, searchContract } from '@api-archaeologist/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Result } from '../../lib/result';
import { TabList, TabPanel } from '../../components/Tabs';
import { LazyCodeEditor as CodeEditor } from '../../components/LazyCodeEditor';
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  SearchIcon,
} from '../../components/icons';
import { copyCode } from '../../lib/clipboard';
import { downloadCode } from '../../lib/download';
import type { Report } from '../samples/useSamples';
import { ContractTree } from './ContractTree';

const formats = [
  { label: 'TypeScript', key: 'typescript', extension: '.ts' },
  { label: 'Zod', key: 'zod', extension: '.zod.ts' },
  { label: 'JSON Schema', key: 'jsonSchema', extension: '.schema.json' },
] as const;
const labels = [...formats.map((format) => format.label), 'Estrutura'];

export function ContractSection({
  result,
  errors,
  busy,
  locked,
  report,
  loadExample,
}: {
  result: Result | null;
  errors: string[];
  busy: boolean;
  locked: boolean;
  report: Report;
  loadExample: () => void;
}) {
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The object lets effect cleanup invalidate pending copies without reading
  // a ref's current value during cleanup.
  const copyAttempt = useRef({ id: 0 });
  useEffect(() => {
    const attempt = copyAttempt.current;
    return () => {
      attempt.id++;
      clearTimeout(timer.current);
    };
  }, [tab, result]);
  const contract = result?.contract;
  const search = useMemo(() => {
    if (!contract || !query.trim()) return null;
    const found = searchContract(contract, query);
    return { ...found, matching: new Set(found.matches), query };
  }, [contract, query]);
  const format = formats[tab];
  const code = result && format ? result[format.key] : '';

  async function copy() {
    const attempt = ++copyAttempt.current.id;
    const ok = await copyCode(code);
    if (attempt !== copyAttempt.current.id) return;
    clearTimeout(timer.current);
    if (!ok) {
      setCopied(null);
      report(
        'Não foi possível copiar. A área de transferência foi negada.',
        'error',
      );
      return;
    }
    setCopied(code);
    report(`${format?.label ?? 'Código'} copiado`);
    timer.current = setTimeout(() => setCopied(null), 1800);
  }

  function download() {
    if (!format) return;
    try {
      downloadCode('contrato', format.extension, code);
      report(`contrato${format.extension} baixado`);
    } catch {
      report('Não foi possível baixar. Tente de novo.', 'error');
    }
  }

  return (
    <section
      className="pane output-pane"
      aria-label="Contrato inferido"
      aria-busy={busy}
    >
      {busy && <div className="progress" aria-hidden="true" />}
      <header className="pane-header">
        {result ? (
          <TabList
            id="contract"
            name="Visualização do contrato"
            labels={labels}
            active={tab}
            onChange={setTab}
          />
        ) : (
          <p className="pane-title">Resultado</p>
        )}
        <span className="spacer" />
        {result && format && (
          <div className="tool-group">
            <button
              className={`icon-button${copied === code ? ' done' : ''}`}
              aria-label={
                copied === code ? 'Copiado' : `Copiar ${format.label}`
              }
              title="Copiar"
              onClick={() => void copy()}
            >
              {copied === code ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
              className="icon-button"
              aria-label={`Baixar ${format.extension}`}
              title={`Baixar ${format.extension}`}
              onClick={download}
            >
              <DownloadIcon />
            </button>
          </div>
        )}
      </header>
      <div className={`pane-body${busy ? ' stale' : ''}`}>
        {errors.length > 0 ? (
          <div className="error-state" role="alert">
            <p className="error-title">Não foi possível analisar</p>
            <ul aria-label="Resumo de erros">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        ) : result ? (
          <div className="result" key={result.revision}>
            {formats.map((item, index) => (
              <TabPanel
                key={item.key}
                id="contract"
                index={index}
                active={tab}
                className="code-panel"
              >
                {index === tab && (
                  <CodeEditor
                    mode="viewer"
                    value={result[item.key]}
                    readOnly
                    language={item.key === 'jsonSchema' ? 'json' : 'typescript'}
                    label={`Código ${item.label}`}
                  />
                )}
              </TabPanel>
            ))}
            <TabPanel
              id="contract"
              index={formats.length}
              active={tab}
              className="structure-panel"
            >
              <div className="search">
                <SearchIcon />
                <input
                  type="search"
                  aria-label="Buscar campo"
                  placeholder="Buscar campo ou $.caminho"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setQuery('');
                    }
                  }}
                />
                <span className="note" aria-live="polite" aria-atomic="true">
                  {search
                    ? search.matches.length
                      ? `${search.matches.length.toLocaleString('pt-BR')} ${pluralize(search.matches.length, 'campo', 'campos')}`
                      : 'Nenhum campo'
                    : ''}
                </span>
              </div>
              <ContractTree contract={result.contract} search={search} />
            </TabPanel>
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-title">O contrato aparece aqui</p>
            <p>TypeScript, Zod e JSON Schema inferidos das suas respostas.</p>
            <button className="ghost" disabled={locked} onClick={loadExample}>
              Ver um exemplo
            </button>
          </div>
        )}
      </div>
      <footer className="pane-footer">
        {result && (
          <p className="stats" aria-label="Resumo do contrato">
            {result.summary.sampleCount.toLocaleString('pt-BR')}{' '}
            {pluralize(result.summary.sampleCount, 'amostra', 'amostras')}
            <span aria-hidden="true"> · </span>
            {result.summary.propertyPathCount.toLocaleString('pt-BR')}{' '}
            {pluralize(
              result.summary.propertyPathCount,
              'propriedade',
              'propriedades',
            )}
            {result.summary.conflictPathCount > 0 && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="warn">
                  {result.summary.conflictPathCount.toLocaleString('pt-BR')}{' '}
                  {pluralize(
                    result.summary.conflictPathCount,
                    'conflito',
                    'conflitos',
                  )}
                </span>
              </>
            )}
          </p>
        )}
        <span className="spacer" />
        <span className="local-badge">
          <span className="dot" aria-hidden="true" />
          Processado no seu navegador
        </span>
      </footer>
    </section>
  );
}
