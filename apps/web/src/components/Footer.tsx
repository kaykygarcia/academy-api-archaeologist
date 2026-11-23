import { LIMITS, formatMiB } from '@api-archaeologist/core';

export function Footer({ repository }: { repository?: string }) {
  return (
    <footer>
      <p>
        Limites: {LIMITS.MAX_SAMPLES} amostras ·{' '}
        {formatMiB(LIMITS.MAX_SAMPLE_BYTES)} por amostra ·{' '}
        {formatMiB(LIMITS.MAX_SESSION_BYTES)} por sessão · profundidade{' '}
        {LIMITS.MAX_DEPTH} · {LIMITS.MAX_VISITED_VALUES.toLocaleString('pt-BR')}{' '}
        valores visitados.
      </p>
      <p>
        O processamento é local: amostras, contratos e snapshots nunca saem do
        navegador. A versão pública usa o Cloudflare Web Analytics, sem cookies,
        para medir visitas e desempenho. As respostas originais ficam na memória
        da sessão; os snapshots são salvos somente quando você escolhe.
      </p>
      <p>
        As evidências descrevem as amostras fornecidas, não todas as respostas
        possíveis da API.
        {repository && (
          <>
            {' '}
            <a href={`${repository.replace(/\/$/, '')}/tree/main/docs`}>
              Documentação
            </a>
          </>
        )}
      </p>
    </footer>
  );
}
