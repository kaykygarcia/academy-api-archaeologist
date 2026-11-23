import type { Ref } from 'react';
import type { Result } from '../../lib/result';
import { ContractStats } from './ContractStats';
import { ContractTree } from './ContractTree';

export function ContractSection({
  result,
  busy,
  heading,
}: {
  result: Result | null;
  busy: boolean;
  heading: Ref<HTMLHeadingElement>;
}) {
  return (
    <section
      className="panel contract-panel"
      aria-labelledby="contract-heading"
      aria-busy={busy}
    >
      <p className="eyebrow">Estrutura observada</p>
      <h2 id="contract-heading" ref={heading} tabIndex={-1}>
        Contrato inferido
      </h2>
      {result ? (
        <>
          <p className="note">
            {result.metadata.opened
              ? 'Aberto a partir de um snapshot — as amostras originais não são armazenadas'
              : 'Última análise concluída. As alterações nas amostras só aparecem após uma nova análise.'}
          </p>
          {busy && (
            <p className="note">
              Exibindo o resultado anterior durante o processamento.
            </p>
          )}
          <ContractStats summary={result.summary} />
          <ContractTree key={result.revision} contract={result.contract} />
        </>
      ) : (
        <div className="empty">
          <h3>Um contrato começa com evidências.</h3>
          <p>
            Adicione respostas JSON e analise-as para examinar tipos, presença e
            aceitação de null.
          </p>
        </div>
      )}
    </section>
  );
}
