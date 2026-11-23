export const LIMITS = {
  MAX_SAMPLE_BYTES: 5 * 1024 * 1024,
  MAX_SESSION_BYTES: 20 * 1024 * 1024,
  MAX_SAMPLES: 200,
  MAX_DEPTH: 50,
  MAX_VISITED_VALUES: 2_000_000,
} as const;

export function formatMiB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 20 })} MiB`;
}
