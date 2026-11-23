import { useRef, useState } from 'react';
import { LIMITS, formatMiB, type SampleInput } from '@api-archaeologist/core';
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
        `${oversized.map((sample) => sample.name).join(', ')}: exceeds the ${formatMiB(LIMITS.MAX_SAMPLE_BYTES)} per-sample limit. No samples were added.`,
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
        `Session limit: ${LIMITS.MAX_SAMPLES} samples and ${formatMiB(LIMITS.MAX_SESSION_BYTES)}, including samples already added.`,
      );
      return false;
    }
    return true;
  }

  function append(additions: SessionSample[]) {
    setSamples((previous) => [...previous, ...additions]);
    report('Samples added. Analyze to update the contract.');
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
    report('Reading files locally…');
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
      report('Could not read the selected files. Try selecting them again.');
    } finally {
      readingFiles.current = false;
      setReading(false);
    }
  }

  function remove(id: string) {
    setSamples((previous) => previous.filter((sample) => sample.id !== id));
    report('Sample removed. Analyze to update the contract.');
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
