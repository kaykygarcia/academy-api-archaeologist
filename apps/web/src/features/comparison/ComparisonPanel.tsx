import { useState, type Ref } from 'react';
import { Tabs } from '../../components/Tabs';
import { downloadCode, sanitizeFilename } from '../../lib/download';
import { SideBySide } from './SideBySide';
import {
  summarizeChanges,
  driftReportMarkdown,
  type AlignedRow,
  type ContractChange,
  type InferredContract,
} from '@api-archaeologist/core';
import { isCompatibleSnapshot, type ContractSnapshot } from '../snapshots/db';
import { ChangeList } from './ChangeList';

export function ComparisonPanel({
  summaryRef,
  buttonRef,
  baseline: selectedBaseline,
  next: selectedNext,
  onBaseline,
  onNext,
  onContract,
  currentLabel,
  currentSnapshotId,
  snapshots,
  current,
  changes,
  rows,
  busy,
  onCompare,
  onReset,
}: {
  summaryRef: Ref<HTMLParagraphElement>;
  buttonRef: Ref<HTMLButtonElement>;
  baseline: string | null;
  next: string | null;
  onBaseline: (value: string) => void;
  onNext: (value: string) => void;
  onContract: () => void;
  currentLabel: string;
  currentSnapshotId?: string;
  snapshots: ContractSnapshot[];
  current: InferredContract | null;
  changes: ContractChange[] | null;
  rows: AlignedRow[];
  busy: boolean;
  onCompare: (
    baseline: InferredContract,
    current: InferredContract,
    snapshotIds: string[],
  ) => void;
  onReset: () => void;
}) {
  const [view, setView] = useState(0);
  const baseline =
    selectedBaseline !== null &&
    (selectedBaseline === '' ||
      snapshots.some(
        (snapshot) =>
          snapshot.id === selectedBaseline && isCompatibleSnapshot(snapshot),
      ))
      ? selectedBaseline
      : (snapshots.find(isCompatibleSnapshot)?.id ?? '');
  const next =
    selectedNext !== null &&
    (selectedNext === '' ||
      (selectedNext === 'current'
        ? current
        : snapshots.some(
            (snapshot) =>
              snapshot.id === selectedNext && isCompatibleSnapshot(snapshot),
          )))
      ? selectedNext
      : current
        ? 'current'
        : '';
  const previous = snapshots.find(
    (snapshot) => snapshot.id === baseline && isCompatibleSnapshot(snapshot),
  );
  const newer =
    next === 'current'
      ? current
      : snapshots.find(
          (snapshot) => snapshot.id === next && isCompatibleSnapshot(snapshot),
        )?.contract;
  const nextId = next === 'current' ? currentSnapshotId : next;
  const sameSnapshot = Boolean(baseline && baseline === nextId);
  const options = snapshots.map((snapshot) => (
    <option
      key={snapshot.id}
      value={snapshot.id}
      disabled={!isCompatibleSnapshot(snapshot)}
    >
      {snapshot.name}
      {!isCompatibleSnapshot(snapshot) ? ' (incompatível)' : ''}
    </option>
  ));
  return (
    <section className="section" aria-label="Comparação">
      <h2 className="sr-only">Comparação</h2>
      <p>
        Compare um snapshot salvo (baseline) com a análise atual ou outro
        snapshot.
      </p>
      {!snapshots.length ? (
        <div className="empty compact">
          <p>Salve um snapshot na aba Contrato para usá-lo como baseline.</p>
          <button onClick={onContract}>Ir para Contrato</button>
        </div>
      ) : (
        <>
          <div className="comparison-controls">
            <label>
              Baseline
              <select
                value={baseline}
                disabled={busy}
                onChange={(event) => {
                  onBaseline(event.target.value);
                  onReset();
                }}
              >
                <option value="">Escolha um snapshot salvo</option>
                {options}
              </select>
            </label>
            <label>
              Novas observações
              <select
                value={next}
                disabled={busy}
                onChange={(event) => {
                  onNext(event.target.value);
                  onReset();
                }}
              >
                <option value="">Escolha as novas observações</option>
                {current && <option value="current">{currentLabel}</option>}
                {options}
              </select>
            </label>
            <button
              ref={buttonRef}
              className="primary"
              disabled={busy || !previous || !newer || sameSnapshot}
              aria-describedby="comparison-reason"
              onClick={() => {
                if (previous && newer && !sameSnapshot) {
                  onBaseline(baseline);
                  onNext(next);
                  onCompare(previous.contract, newer, [
                    baseline,
                    ...(nextId ? [nextId] : []),
                  ]);
                }
              }}
            >
              Comparar
            </button>
          </div>
          <p className="note" id="comparison-reason">
            {busy
              ? 'Aguarde a conclusão da operação atual.'
              : sameSnapshot
                ? 'Escolha snapshots diferentes para comparar.'
                : !previous || !newer
                  ? 'Escolha um baseline e novas observações para comparar.'
                  : ''}
          </p>
          {changes && (
            <>
              <div className="comparison-result-header">
                <p
                  ref={summaryRef}
                  tabIndex={-1}
                  aria-label="Resumo da comparação"
                >
                  {summarizeChanges(changes)}
                </p>
                <button
                  onClick={() => {
                    const baselineName = previous?.name ?? 'Baseline';
                    const currentName =
                      next === 'current' && !currentSnapshotId
                        ? 'Análise atual'
                        : (snapshots.find(
                            (snapshot) =>
                              snapshot.id ===
                              (next === 'current' ? currentSnapshotId : next),
                          )?.name ?? 'Novas observações');
                    downloadCode(
                      'drift',
                      `-${sanitizeFilename(baselineName)}-vs-${sanitizeFilename(currentName)}.md`,
                      driftReportMarkdown({
                        baselineName,
                        currentName,
                        generatedAt: new Date().toISOString(),
                        changes,
                      }),
                    );
                  }}
                >
                  Baixar relatório .md
                </button>
              </div>
              <Tabs
                name="Visualização da comparação"
                labels={['Lista', 'Lado a lado']}
                active={view}
                onChange={setView}
              >
                {view === 0 ? (
                  <ChangeList changes={changes} />
                ) : (
                  <SideBySide rows={rows} />
                )}
              </Tabs>
            </>
          )}
        </>
      )}
      <p className="note">
        O drift observado indica possível impacto; não comprova compatibilidade.
      </p>
    </section>
  );
}
