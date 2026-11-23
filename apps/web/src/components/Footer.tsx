import { LIMITS, formatMiB } from '@api-archaeologist/core';

export function Footer({ repository }: { repository?: string }) {
  return (
    <footer>
      <p>
        Limites: {LIMITS.MAX_SAMPLES} amostras ·{' '}
        {formatMiB(LIMITS.MAX_SAMPLE_BYTES)} por amostra ·{' '}
        {formatMiB(LIMITS.MAX_SESSION_BYTES)} por sessão · profundidade{' '}
        {LIMITS.MAX_DEPTH} · {LIMITS.MAX_VISITED_VALUES.toLocaleString('pt-BR')}{' '}
        valores visitados. Processamento local. A evidência descreve as
        amostras, não todas as respostas possíveis.
        {repository && (
          <>
            {' '}
            <a href={`${repository.replace(/\/$/, '')}#readme`}>Documentação</a>
          </>
        )}
      </p>
    </footer>
  );
}
