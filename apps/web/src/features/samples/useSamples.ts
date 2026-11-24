import { useRef, useState } from 'react';
import {
  LIMITS,
  formatMiB,
  pluralize,
  type SampleInput,
} from '@api-archaeologist/core';

export type SessionSample = SampleInput & { id: string; bytes: number };
export type Report = (message: string, tone?: 'error') => void;

function sessionSamples(samples: SampleInput[]): SessionSample[] {
  return samples.map((sample) => ({
    ...sample,
    id: crypto.randomUUID(),
    bytes: new TextEncoder().encode(sample.text).length,
  }));
}

export function useSamples(report: Report) {
  const [samples, setSamples] = useState<SessionSample[]>([]);
  const [reading, setReading] = useState(false);
  // null selects the draft for a new sample; an id edits that sample.
  const [selected, setSelected] = useState<string | null>(null);
  const readingFiles = useRef(false);

  function precheck(additions: { name: string; bytes: number }[]): boolean {
    // Core parseSamples remains the authority; this avoids reading files beyond session limits.
    const oversized = additions.filter(
      (sample) => sample.bytes > LIMITS.MAX_SAMPLE_BYTES,
    );
    if (oversized.length) {
      report(
        `${oversized.map((sample) => sample.name).join(', ')}: passa de ${formatMiB(LIMITS.MAX_SAMPLE_BYTES)}. Nada foi adicionado.`,
        'error',
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
        `Limite da sessão: ${LIMITS.MAX_SAMPLES} amostras e ${formatMiB(LIMITS.MAX_SESSION_BYTES)}.`,
        'error',
      );
      return false;
    }
    return true;
  }

  function append(additions: SessionSample[], announce: boolean) {
    setSamples((previous) => [...previous, ...additions]);
    if (announce)
      report(
        `${additions.length.toLocaleString('pt-BR')} ${pluralize(additions.length, 'amostra adicionada', 'amostras adicionadas')}`,
      );
  }

  function add(input: SampleInput[], announce = true): SessionSample[] | null {
    if (readingFiles.current) return null;
    const additions = sessionSamples(input);
    if (!precheck(additions)) return null;
    append(additions, announce);
    return additions;
  }

  async function addFiles(files: File[]): Promise<SessionSample[] | null> {
    if (
      files.some(
        (file) =>
          !file.name.toLowerCase().endsWith('.json') &&
          file.type !== 'application/json',
      )
    ) {
      report('Use apenas arquivos .json. Nada foi adicionado.', 'error');
      return null;
    }
    if (
      readingFiles.current ||
      !files.length ||
      !precheck(files.map((file) => ({ name: file.name, bytes: file.size })))
    )
      return null;
    readingFiles.current = true;
    setReading(true);
    try {
      const input = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          text: await file.text(),
        })),
      );
      const additions = sessionSamples(input);
      // Decoded text can exceed File.size, so recheck limits after reading.
      if (!precheck(additions)) return null;
      append(additions, true);
      return additions;
    } catch {
      report('Não foi possível ler os arquivos. Tente de novo.', 'error');
      return null;
    } finally {
      readingFiles.current = false;
      setReading(false);
    }
  }

  function remove(id: string) {
    setSamples((previous) => previous.filter((sample) => sample.id !== id));
    if (selected === id) setSelected(null);
  }

  function update(id: string, text: string) {
    setSamples((previous) =>
      previous.map((sample) =>
        sample.id === id && sample.text !== text
          ? { ...sample, text, bytes: new TextEncoder().encode(text).length }
          : sample,
      ),
    );
  }

  function clear() {
    setSamples([]);
    setSelected(null);
  }

  function replace(input: SampleInput[]) {
    const next = sessionSamples(input);
    setSamples(next);
    setSelected(next[0]?.id ?? null);
  }

  return {
    samples,
    reading,
    selected,
    select: setSelected,
    clear,
    add,
    addFiles,
    update,
    remove,
    replace,
  };
}
