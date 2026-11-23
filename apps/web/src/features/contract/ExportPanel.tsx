import { useEffect, useRef, useState } from 'react';
import type { AnalysisResult } from '../../lib/analysis-protocol';
import { Tabs } from '../../components/Tabs';
import { LazyCodeEditor as CodeEditor } from '../../components/LazyCodeEditor';
import { copyCode } from '../../lib/clipboard';
import { downloadCode } from '../../lib/download';

export const sharingWarning =
  'Remova credenciais, dados pessoais e segredos antes de compartilhar capturas de tela ou exportações.';

export function ExportPanel({
  result,
  dataset,
  report,
}: {
  result: AnalysisResult | null;
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
  const code = result?.[format] ?? '';
  const extensions = {
    typescript: '.ts',
    zod: '.zod.ts',
    jsonSchema: '.schema.json',
  };
  return (
    <section className="section" aria-labelledby="export-heading">
      <p className="eyebrow">02 / Leve com você</p>
      <h2 id="export-heading">Exportar</h2>
      <p className="note">{sharingWarning}</p>
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
        {result ? (
          <CodeEditor
            mode="viewer"
            value={code}
            readOnly
            language={tab === 2 ? 'json' : 'typescript'}
            label="Código gerado"
          />
        ) : (
          <p className="empty">
            Analise amostras ou abra um snapshot para gerar uma exportação.
          </p>
        )}
      </Tabs>
      <p className="note">
        Em JSON Schema, <code>required</code> significa “observado em todos os
        objetos pai analisados”, não uma garantia sobre respostas futuras.
      </p>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {copyError ? 'Falha ao copiar' : copied === code ? 'Copiado' : ''}
        {(copyError || copied === code) && announcement % 2 === 1 && '\u00a0'}
      </span>
      {copyError && <p className="error-text">{copyError}</p>}
      <div className="actions">
        <button
          disabled={!result}
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
          disabled={!result}
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
    </section>
  );
}
