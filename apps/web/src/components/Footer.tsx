import { LIMITS, formatMiB } from '@api-archaeologist/core';

export function Footer({ repository }: { repository?: string }) {
  return (
    <footer>
      <p>
        Limits: {LIMITS.MAX_SAMPLES} samples ·{' '}
        {formatMiB(LIMITS.MAX_SAMPLE_BYTES)} per sample ·{' '}
        {formatMiB(LIMITS.MAX_SESSION_BYTES)} per session · depth{' '}
        {LIMITS.MAX_DEPTH} · {LIMITS.MAX_VISITED_VALUES.toLocaleString()}{' '}
        visited values.
      </p>
      <p>
        Processing stays local. No analytics or sample uploads. Raw responses
        stay in session memory; snapshots are saved only when you choose.
      </p>
      <p>
        Evidence describes the samples you provide, not every possible API
        response.
        {repository && (
          <>
            {' '}
            <a href={`${repository.replace(/\/$/, '')}/tree/main/docs`}>
              Documentation
            </a>
          </>
        )}
      </p>
    </footer>
  );
}
