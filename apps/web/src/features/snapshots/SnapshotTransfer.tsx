import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LIMITS, formatMiB } from '@api-archaeologist/core';
import { downloadCode } from '../../lib/download';
import { formatDate } from '../../lib/format';
import { importSnapshots } from './db';
import { parseSnapshotFile, serializeSnapshots } from './transfer';
import type { useSnapshots } from './useSnapshots';

export function SnapshotTransfer({
  locked,
  storage,
  heading,
}: {
  heading: ReactNode;
  locked: boolean;
  storage: ReturnType<typeof useSnapshots>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    reasons: string[];
  } | null>(null);
  useEffect(() => {
    if (!result) return;
    // Storage errors also request focus in the parent; finish on the import outcome.
    const frame = requestAnimationFrame(() => messageRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [result]);
  async function importFile(file: File) {
    setReading(true);
    setResult(null);
    try {
      if (file.size > LIMITS.MAX_SESSION_BYTES)
        throw new Error(
          `O arquivo excede o limite de ${formatMiB(LIMITS.MAX_SESSION_BYTES)}.`,
        );
      const text = await file.text().catch(() => {
        throw new Error('Não foi possível ler o arquivo de snapshots.');
      });
      const parsed = parseSnapshotFile(text);
      const written = await storage.write(
        () => importSnapshots(parsed.records),
        parsed.message,
      );
      if (written.done)
        setResult({ message: parsed.message, reasons: parsed.reasons });
      else
        setResult({
          message:
            'Não foi possível importar os snapshots. Consulte o erro de armazenamento abaixo.',
          reasons: [],
        });
    } catch (error) {
      setResult({
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível ler o arquivo de snapshots.',
        reasons: [],
      });
    } finally {
      setReading(false);
    }
  }
  const disabled = locked || reading;
  return (
    <>
      <div className="snapshot-transfer-header">
        {heading}
        <div className="transfer-actions">
          <button disabled={disabled} onClick={() => input.current?.click()}>
            Importar .json
          </button>
          <input
            ref={input}
            className="sr-only"
            type="file"
            tabIndex={-1}
            aria-label="Importar snapshots"
            accept=".json,application/json"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void importFile(file);
            }}
          />
          <button
            disabled={disabled || !storage.snapshots.length}
            aria-describedby={
              !storage.snapshots.length ? 'snapshot-export-reason' : undefined
            }
            onClick={() => {
              const now = new Date();
              downloadCode(
                `api-archaeologist-snapshots-${formatDate(now)}`,
                '.json',
                serializeSnapshots(storage.snapshots, now.toISOString()),
              );
            }}
          >
            Exportar todos
          </button>
          {!storage.snapshots.length && (
            <span id="snapshot-export-reason" className="note">
              Salve ou importe snapshots antes de exportar.
            </span>
          )}
        </div>
      </div>
      {result && (
        <div>
          <p ref={messageRef} tabIndex={-1} role="status">
            {result.message}
          </p>
          {result.reasons.length > 0 && (
            <ul className="note" aria-label="Registros ignorados">
              {result.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
