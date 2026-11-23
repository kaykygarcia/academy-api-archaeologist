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
      {!isCompatibleSnapshot(snapshot) ? ' (incompatible)' : ''}
    </option>
  ));
  return (
    <section className="section" aria-labelledby="comparison-heading">
      <p className="eyebrow">04 / Observe change</p>
      <h2 id="comparison-heading" ref={headingRef} tabIndex={-1}>
        Comparison
      </h2>
      <p>Direction: observed HTTP responses, baseline → new observations</p>
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
            <option value="">Choose a saved snapshot</option>
            {options}
          </select>
        </label>
        <label>
          New observations
          <select
            value={next}
            disabled={busy}
            onChange={(event) => {
              setNext(event.target.value);
              onReset();
            }}
          >
            <option value="">Choose observations</option>
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
          Compare
        </button>
      </div>
      {sameSnapshot && previous && newer && (
        <p className="note" id="comparison-reason">
          Choose different snapshots to compare.
        </p>
      )}
      {(!previous || !newer) && (
        <p className="note" id="comparison-reason">
          Choose both a baseline and new observations to compare.
        </p>
      )}
      {changes && <ChangeList changes={changes} />}
    </section>
  );
}
