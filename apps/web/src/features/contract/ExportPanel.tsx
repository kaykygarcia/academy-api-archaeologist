import { useEffect, useRef, useState } from 'react';
import type { AnalysisResult } from '../../lib/analysis-protocol';
import { Tabs } from '../../components/Tabs';
import { LazyCodeEditor as CodeEditor } from '../../components/LazyCodeEditor';
import { copyCode } from '../../lib/clipboard';
import { downloadCode } from '../../lib/download';

export function ExportPanel({
  result,
  dataset,
  report,
}: {
  result: AnalysisResult;
  dataset: string;
  report: (message: string) => void;
}) {
  const [tab, setTab] = useState(0);
  const [copyError, setCopyError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [announcement, setAnnouncement] = useState(0);
  // The object lets effect cleanup capture a stable reference and invalidate
  // pending copies without reading copyAttempt.current during cleanup.
  const copyAttempt = useRef({ id: 0 });
  useEffect(() => {
    const attempt = copyAttempt.current;
    return () => {
      attempt.id++;
      clearTimeout(timer.current);
    };
  }, [tab, result]);
  const [previousResult, setPreviousResult] = useState(result);
  if (previousResult !== result) {
    setPreviousResult(result);
    setCopyError('');
    setCopied(null);
  }
  const formats = ['typescript', 'zod', 'jsonSchema'] as const;
  const format = formats[tab] ?? 'typescript';
  const code = result[format];
  const extensions = {
    typescript: '.ts',
    zod: '.zod.ts',
    jsonSchema: '.schema.json',
  };
  return (
    <div className="code-panel">
      <Tabs
        name="Formato de exportação"
        labels={['TypeScript', 'Zod', 'JSON Schema']}
        active={tab}
        onChange={(index) => {
          setTab(index);
          setCopied(null);
          setCopyError('');
        }}
      >
        <CodeEditor
          mode="viewer"
          value={code}
          readOnly
          language={tab === 2 ? 'json' : 'typescript'}
          label="Código gerado"
        />
      </Tabs>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {copyError ? 'Falha ao copiar' : copied === code ? 'Copiado' : ''}
        {(copyError || copied === code) && announcement % 2 === 1 && '\u00a0'}
      </span>
      {copyError && <p className="error-text">{copyError}</p>}
      <div className="actions">
        <button
          onClick={async () => {
            const attempt = ++copyAttempt.current.id;
            const ok = await copyCode(code);
            if (attempt !== copyAttempt.current.id) return;
            setAnnouncement((count) => count + 1);
            setCopied(ok ? code : null);
            setCopyError(
              ok
                ? ''
                : 'Falha ao copiar. O acesso à área de transferência foi negado ou está indisponível.',
            );
            clearTimeout(timer.current);
            if (ok) timer.current = setTimeout(() => setCopied(null), 2000);
          }}
        >
          {copied === code ? 'Copiado' : 'Copiar'}
        </button>
        <button
          onClick={() => {
            try {
              downloadCode(dataset, extensions[format], code);
              report('Arquivo preparado para baixar.');
            } catch {
              report('Falha ao baixar. Tente novamente.');
            }
          }}
        >
          Baixar
        </button>
      </div>
    </div>
  );
}
