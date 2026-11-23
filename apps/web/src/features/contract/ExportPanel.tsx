import { useEffect, useRef, useState } from 'react';
import type { AnalysisResult } from '../../lib/analysis-protocol';
import { Tabs } from '../../components/Tabs';
import { LazyCodeEditor as CodeEditor } from '../../components/LazyCodeEditor';
import { copyCode } from '../../lib/clipboard';
import { downloadCode } from '../../lib/download';

export const sharingWarning =
  'Remove tokens, personal data and secrets before sharing screenshots or exports.';

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
      <p className="eyebrow">02 / Take it with you</p>
      <h2 id="export-heading">Export</h2>
      <p className="note">{sharingWarning}</p>
      <Tabs
        name="Export format"
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
            label="Generated code"
          />
        ) : (
          <p className="empty">
            Analyze samples or open a snapshot to generate an export.
          </p>
        )}
      </Tabs>
      <p className="note">
        JSON Schema <code>required</code> means “observed in every parent object
        seen”, not a guarantee about future responses.
      </p>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {copyError ? 'Copy failed' : copied === code ? 'Copied' : ''}
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
                : 'Copy failed. Clipboard access was denied or unavailable.',
            );
            clearTimeout(timer.current);
            if (ok) timer.current = setTimeout(() => setCopied(null), 2000);
          }}
        >
          {copied === code ? 'Copied' : 'Copy'}
        </button>
        <button
          disabled={!result}
          onClick={() => {
            try {
              downloadCode(dataset, extensions[format], code);
              report('Download prepared.');
            } catch {
              report('Download failed. Try again.');
            }
          }}
        >
          Download
        </button>
      </div>
    </section>
  );
}
