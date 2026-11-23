import { Fragment, useId, useState } from 'react';
import {
  changeLabel,
  severityLabel,
  type AlignedRow,
} from '@api-archaeologist/core';

export function SideBySide({ rows }: { rows: AlignedRow[] }) {
  const id = useId();
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [visible, setVisible] = useState(200);
  const [expanded, setExpanded] = useState(new Set<string>());
  const filtered = onlyChanges
    ? rows.filter((row) => row.changes.length > 0)
    : rows;
  const remaining = Math.max(0, filtered.length - visible);
  function toggle(path: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }
  return (
    <>
      <label className="diff-filter">
        <input
          type="checkbox"
          checked={onlyChanges}
          onChange={(event) => {
            setOnlyChanges(event.target.checked);
            setVisible(200);
          }}
        />{' '}
        Somente alterações
      </label>
      <div className="diff-scroll">
        <table className="diff-table" aria-label="Contratos lado a lado">
          <thead>
            <tr>
              <th scope="col">Caminho</th>
              <th scope="col">Baseline</th>
              <th scope="col" aria-label="Novas observações">
                Novas
                <span className="diff-header-remainder" aria-hidden="true">
                  {' '}
                  observações
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visible).map((row, index) => {
              const open = expanded.has(row.path);
              const pathId = `${id}-path-${index}`;
              const detailId = `${id}-detail-${index}`;
              return (
                <Fragment key={row.path}>
                  <tr
                    className={row.changes.length ? 'diff-changed' : undefined}
                    onClick={() => {
                      if (row.changes.length) toggle(row.path);
                    }}
                  >
                    <th scope="row" title={row.path} aria-labelledby={pathId}>
                      <div
                        className="diff-path"
                        style={{
                          paddingInlineStart: `calc(${row.depth} * var(--diff-indent))`,
                        }}
                      >
                        {row.changes.length ? (
                          <button
                            className="diff-toggle"
                            aria-expanded={open}
                            aria-controls={detailId}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggle(row.path);
                            }}
                          >
                            <span aria-hidden="true">
                              {open ? '▾' : '▸'} <code>{row.segment}</code>
                            </span>
                            <span id={pathId} className="sr-only">
                              {row.path}
                            </span>
                          </button>
                        ) : (
                          <>
                            <code aria-hidden="true">{row.segment}</code>
                            <span id={pathId} className="sr-only">
                              {row.path}
                            </span>
                          </>
                        )}
                        {[
                          ...new Set(
                            row.changes.map((change) => change.severity),
                          ),
                        ].map((severity) => (
                          <Fragment key={severity}>
                            <span className="sr-only">: </span>
                            <span className={`badge ${severity}`}>
                              {severityLabel(severity)}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                    </th>
                    <td>{row.previous ?? 'Não observado'}</td>
                    <td>{row.current ?? 'Não observado'}</td>
                  </tr>
                  {row.changes.length > 0 && (
                    <tr id={detailId} hidden={!open}>
                      <td colSpan={3}>
                        <ul>
                          {row.changes.map((change) => (
                            <li key={change.code}>
                              <strong>{changeLabel(change.code)}</strong>:{' '}
                              {change.explanation}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {remaining > 0 && (
        <button onClick={() => setVisible((count) => count + 200)}>
          Mostrar mais {Math.min(200, remaining).toLocaleString('pt-BR')} (de{' '}
          {remaining.toLocaleString('pt-BR')} restantes)
        </button>
      )}
    </>
  );
}
