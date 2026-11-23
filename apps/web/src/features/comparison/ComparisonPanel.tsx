import { useState, type Ref } from 'react';
import type { ContractChange, InferredContract } from '@api-archaeologist/core';
import { isCompatibleSnapshot, type ContractSnapshot } from '../snapshots/db';
import { ChangeList } from './ChangeList';

export function ComparisonPanel({
  headingRef,
  currentLabel,
  currentSnapshotId,
  snapshots,
  current,
  changes,
  busy,
  onCompare,
  onReset,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  currentLabel: string;
  currentSnapshotId?: string;
  snapshots: ContractSnapshot[];
  current: InferredContract | null;
  changes: ContractChange[] | null;
  busy: boolean;
  onCompare: (
    baseline: InferredContract,
    current: InferredContract,
    snapshotIds: string[],
  ) => void;
  onReset: () => void;
}) {
  const [baseline, setBaseline] = useState('');
  const [next, setNext] = useState('');
  const previous = snapshots.find(
    (snapshot) => snapshot.id === baseline && isCompatibleSnapshot(snapshot),
  );
  const newer =
    next === 'current'
      ? current
      : snapshots.find(
          (snapshot) => snapshot.id === next && isCompatibleSnapshot(snapshot),
        )?.contract;
  if (baseline && !previous) setBaseline('');
  if (next && !newer) setNext('');
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
    <section className="section" aria-labelledby="comparison-heading">
      <p className="eyebrow">04 / Observe as mudanças</p>
      <h2 id="comparison-heading" ref={headingRef} tabIndex={-1}>
        Comparação
      </h2>
      <p>Direção: respostas HTTP observadas, baseline → novas observações</p>
      <div className="comparison-controls">
        <label>
          Baseline
          <select
            value={baseline}
            disabled={busy}
            onChange={(event) => {
              setBaseline(event.target.value);
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
              setNext(event.target.value);
              onReset();
            }}
          >
            <option value="">Escolha as novas observações</option>
            {current && <option value="current">{currentLabel}</option>}
            {options}
          </select>
        </label>
        <button
          className="primary"
          disabled={busy || !previous || !newer || sameSnapshot}
          aria-describedby="comparison-reason"
          onClick={() => {
            if (previous && newer && !sameSnapshot)
              onCompare(previous.contract, newer, [
                baseline,
                ...(nextId ? [nextId] : []),
              ]);
          }}
        >
          Comparar
        </button>
      </div>
      {sameSnapshot && previous && newer && (
        <p className="note" id="comparison-reason">
          Escolha snapshots diferentes para comparar.
        </p>
      )}
      {(!previous || !newer) && (
        <p className="note" id="comparison-reason">
          Escolha um baseline e novas observações para comparar.
        </p>
      )}
      {changes && <ChangeList changes={changes} />}
    </section>
  );
}
