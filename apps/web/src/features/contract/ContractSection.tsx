import { pluralize, searchContract } from '@api-archaeologist/core';
import { useMemo, useState, type Ref } from 'react';
import type { Result } from '../../lib/result';
import { TabList, TabPanel } from '../../components/Tabs';
import { ExportMenu } from '../../components/ExportMenu';
import { SaveSnapshot } from '../snapshots/SaveSnapshot';
import type { useSnapshots } from '../snapshots/useSnapshots';
import { ContractStats } from './ContractStats';
import { ContractTree } from './ContractTree';
import { ExportPanel } from './ExportPanel';

const sharingWarning =
  'Remova credenciais e dados pessoais antes de compartilhar.';

export function ContractSection({
  result,
  busy,
  locked,
  heading,
  storage,
  report,
  loadExample,
}: {
  result: Result | null;
  busy: boolean;
  locked: boolean;
  heading: Ref<HTMLParagraphElement>;
  storage: ReturnType<typeof useSnapshots>;
  report: (message: string) => void;
  loadExample: () => void;
}) {
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const contract = result?.contract;
  const search = useMemo(() => {
    if (!contract || !query.trim()) return null;
    const found = searchContract(contract, query);
    return { ...found, matching: new Set(found.matches), query };
  }, [contract, query]);
  return (
    <section
      className="panel contract-panel"
      aria-label="Contrato inferido"
      aria-busy={busy}
    >
      {result ? (
        <>
          <ContractStats summary={result.summary} summaryRef={heading} />
          <div className="contract-toolbar">
            <div className="contract-search">
              <label>
                <span className="sr-only">Buscar campo</span>
                <input
                  type="search"
                  placeholder="Buscar campo ou $.caminho"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setQuery('');
                    }
                  }}
                />
              </label>
              <span className="note" aria-live="polite" aria-atomic="true">
                {search
                  ? search.matches.length
                    ? `${search.matches.length.toLocaleString('pt-BR')} ${pluralize(search.matches.length, 'campo encontrado', 'campos encontrados')}`
                    : 'Nenhum campo encontrado'
                  : ''}
              </span>
            </div>
            <SaveSnapshot result={result} locked={locked} storage={storage} />
            <ExportMenu
              result={result}
              dataset={result.metadata.dataset}
              report={report}
            />
          </div>
          <p className="note">{sharingWarning}</p>
          {result.metadata.opened && (
            <p className="note">
              Aberto a partir de um snapshot — as amostras originais não são
              armazenadas
            </p>
          )}
          {busy && (
            <p className="note">
              Exibindo o resultado anterior durante o processamento.
            </p>
          )}
          <TabList
            id="contract"
            name="Visualização do contrato"
            labels={['Estrutura', 'Código']}
            active={tab}
            onChange={setTab}
          />
          <TabPanel id="contract" index={0} active={tab}>
            <div className="structure">
              <ContractTree
                key={result.revision}
                contract={result.contract}
                search={search}
              />
            </div>
          </TabPanel>
          <TabPanel id="contract" index={1} active={tab}>
            <ExportPanel
              result={result}
              dataset={result.metadata.dataset}
              report={report}
            />
          </TabPanel>
        </>
      ) : (
        <div className="empty compact">
          <p>Adicione amostras e analise-as para examinar o contrato.</p>
          <button
            disabled={locked}
            aria-describedby={locked ? 'operation-locked-reason' : undefined}
            onClick={loadExample}
          >
            Carregar exemplo
          </button>
        </div>
      )}
    </section>
  );
}
