import { useRef, useState } from 'react';
import {
  LIMITS,
  formatMiB,
  pluralize,
  type SampleInput,
} from '@api-archaeologist/core';
import type { SessionSample } from './SampleList';

function sessionSamples(samples: SampleInput[]): SessionSample[] {
  return samples.map((sample) => ({
    ...sample,
    id: crypto.randomUUID(),
    bytes: new TextEncoder().encode(sample.text).length,
  }));
}

export function useSamples(report: (message: string) => void) {
  const [samples, setSamples] = useState<SessionSample[]>([]);
  const [dataset, setDataset] = useState('');
  const [method, setMethod] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [reading, setReading] = useState(false);
  const readingFiles = useRef(false);

  function precheck(additions: { name: string; bytes: number }[]): boolean {
    // Core parseSamples remains the authority; this avoids reading files beyond session limits.
    const oversized = additions.filter(
      (sample) => sample.bytes > LIMITS.MAX_SAMPLE_BYTES,
    );
    if (oversized.length) {
      report(
        `${oversized.map((sample) => sample.name).join(', ')}: excede o limite de ${formatMiB(LIMITS.MAX_SAMPLE_BYTES)} por amostra. Nenhuma amostra foi adicionada.`,
      );
      return false;
    }
    if (
      samples.length + additions.length > LIMITS.MAX_SAMPLES ||
      [...samples, ...additions].reduce(
        (sum, sample) => sum + sample.bytes,
        0,
      ) > LIMITS.MAX_SESSION_BYTES
    ) {
      report(
        `Limite da sessão: ${LIMITS.MAX_SAMPLES} amostras e ${formatMiB(LIMITS.MAX_SESSION_BYTES)}, incluindo as amostras já adicionadas.`,
      );
      return false;
    }
    return true;
  }

  function append(additions: SessionSample[]) {
    setSamples((previous) => [...previous, ...additions]);
    report(
      `${pluralize(additions.length, 'Amostra adicionada', 'Amostras adicionadas')}. Analise para atualizar o contrato.`,
    );
  }

  function add(input: SampleInput[]): boolean {
    if (readingFiles.current) return false;
    const additions = sessionSamples(input);
    if (!precheck(additions)) return false;
    append(additions);
    return true;
  }

  async function addFiles(files: File[]) {
    if (
      readingFiles.current ||
      !files.length ||
      !precheck(files.map((file) => ({ name: file.name, bytes: file.size })))
    )
      return;
    readingFiles.current = true;
    setReading(true);
    report('Lendo arquivos localmente…');
    try {
      const input = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          text: await file.text(),
        })),
      );
      const additions = sessionSamples(input);
      // Decoded text can exceed File.size, so recheck limits after reading.
      if (precheck(additions)) append(additions);
    } catch {
      report(
        'Não foi possível ler os arquivos selecionados. Selecione-os novamente.',
      );
    } finally {
      readingFiles.current = false;
      setReading(false);
    }
  }

  function remove(id: string) {
    setSamples((previous) => previous.filter((sample) => sample.id !== id));
    report('Amostra removida. Analise para atualizar o contrato.');
  }

  function replace(
    input: SampleInput[],
    metadata: { dataset: string; method: string; endpoint: string },
  ) {
    setSamples(sessionSamples(input));
    setDataset(metadata.dataset);
    setMethod(metadata.method);
    setEndpoint(metadata.endpoint);
  }

  return {
    samples,
    dataset,
    method,
    endpoint,
    reading,
    setDataset,
    setMethod,
    setEndpoint,
    add,
    addFiles,
    remove,
    replace,
  };
}
