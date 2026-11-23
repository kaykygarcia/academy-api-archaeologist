import { useEffect, useRef, useState } from 'react';
import type { Job, Response } from './analysis-protocol';

export function useAnalysis(
  onResponse: (response: Response) => void,
  onFailure: (message: string, cancelled?: boolean) => void,
) {
  const worker = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const handlers = useRef({ onResponse, onFailure });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    handlers.current = { onResponse, onFailure };
  });
  function spawn() {
    const instance = new Worker(
      new URL('../workers/analysis.worker.ts', import.meta.url),
      { type: 'module' },
    );
    instance.onmessage = (event: MessageEvent<Response>) => {
      if (instance !== worker.current || event.data.id !== sequence.current)
        return;
      if (!('phase' in event.data)) setBusy(false);
      handlers.current.onResponse(event.data);
    };
    function failed() {
      if (instance !== worker.current) return;
      instance.terminate();
      worker.current = null;
      sequence.current++;
      setBusy(false);
      handlers.current.onFailure(
        'The analysis worker failed. Try analyzing again.',
      );
    }
    instance.onerror = failed;
    instance.onmessageerror = failed;
    worker.current = instance;
  }
  useEffect(
    () => () => {
      sequence.current++;
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );
  function run(job: Job) {
    sequence.current++;
    try {
      if (!worker.current) spawn();
      worker.current?.postMessage({ ...job, id: sequence.current });
      setBusy(true);
    } catch {
      worker.current?.terminate();
      worker.current = null;
      setBusy(false);
      handlers.current.onFailure(
        'The operation could not be sent to the analysis worker. Try again.',
      );
    }
  }
  function cancel() {
    sequence.current++;
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    try {
      spawn();
      return true;
    } catch {
      handlers.current.onFailure(
        'The analysis worker could not restart. Try analyzing again.',
        true,
      );
      return false;
    }
  }
  return { run, cancel, busy };
}
