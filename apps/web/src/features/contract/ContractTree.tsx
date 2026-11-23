import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import {
  describeType,
  elementPath,
  hasTypeConflict,
  isNullable,
  isOptional,
  propertyPath,
  type InferredContract,
  type SearchResult,
} from '@api-archaeologist/core';
import { FieldDetails, type Field } from './FieldDetails';

type Search = SearchResult & {
  matching: Set<string>;
  query: string;
};

function TreeRow({
  field,
  name,
  optional = false,
  depth,
  selected,
  select,
  search,
  expansions,
  onExpand,
  buttonRef,
}: {
  buttonRef?: Ref<HTMLButtonElement>;
  search: Search | null;
  expansions: Map<string, boolean>;
  onExpand: (path: string, expanded: boolean) => void;
  field: Field;
  name: string;
  optional?: boolean;
  depth: number;
  selected: string;
  select: (field: Field) => void;
}) {
  const expanded = search !== null || (expansions.get(field.path) ?? depth < 2);
  const query = search?.query ?? '';
  const [page, setPage] = useState<{
    query: string;
    limit: number;
    focusIndex: number | null;
  }>({ query, limit: 200, focusIndex: null });
  if (page.query !== query) setPage({ query, limit: 200, focusIndex: null });
  const limit = page.query === query ? page.limit : 200;
  const focusIndex = page.query === query ? page.focusIndex : null;
  const nextButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusIndex !== null) nextButton.current?.focus();
  }, [focusIndex]);
  const visible = search?.visible;
  const childCount = useMemo(() => {
    const properties = field.value.object?.properties ?? [];
    const propertyCount = visible
      ? properties.reduce(
          (count, property) =>
            count +
            Number(visible.has(propertyPath(field.path, property.name))),
          0,
        )
      : properties.length;
    const elementCount =
      field.value.array?.element &&
      (!visible || visible.has(elementPath(field.path)))
        ? 1
        : 0;
    return propertyCount + elementCount;
  }, [field.value, field.path, visible]);
  const childRows: { name: string; field: Field; optional: boolean }[] = [];
  if (expanded) {
    const properties = field.value.object?.properties ?? [];
    for (const property of search ? properties : properties.slice(0, limit)) {
      if (childRows.length === limit) break;
      const path = propertyPath(field.path, property.name);
      if (search && !search.visible.has(path)) continue;
      childRows.push({
        name: property.name || '""',
        field: {
          path,
          value: property.value,
          presence: {
            present: property.presentCount,
            parents: field.value.kindCounts.object,
          },
        },
        optional: isOptional(property, field.value),
      });
    }
    if (childRows.length < limit && field.value.array?.element) {
      const path = elementPath(field.path);
      if (!search || search.visible.has(path))
        childRows.push({
          name: '[*]',
          field: { path, value: field.value.array.element },
          optional: false,
        });
    }
  }
  const remaining = Math.max(0, childCount - limit);
  const nextBatch = Math.min(200, remaining);
  const matched = search?.matching.has(field.path) ?? false;
  const children = Boolean(
    field.value.object?.properties.length || field.value.array?.element,
  );
  return (
    <li>
      <div
        className={`tree-row${selected === field.path ? ' selected' : ''}${matched ? ' search-match' : ''}`}
      >
        {children && !search && (
          <button
            className="disclosure"
            aria-label={`${expanded ? 'Recolher' : 'Expandir'} ${field.path}`}
            aria-expanded={expanded}
            onClick={() => onExpand(field.path, !expanded)}
          >
            {expanded ? '−' : '+'}
          </button>
        )}
        <button
          ref={buttonRef}
          className="field-button"
          onClick={() => select(field)}
          aria-pressed={selected === field.path}
        >
          <code>
            {name}
            {optional ? '?' : ''}
          </code>
          <span className="type">{describeType(field.value)}</span>
          {optional && <span className="badge">opcional</span>}
          {isNullable(field.value) && <span className="badge">nullable</span>}
          {hasTypeConflict(field.value) && (
            <span className="badge review">conflito</span>
          )}
        </button>
      </div>
      {expanded && children && (
        <ul>
          {childRows.map((child, index) => (
            <TreeRow
              key={child.field.path}
              buttonRef={index === focusIndex ? nextButton : undefined}
              {...child}
              depth={depth + 1}
              selected={selected}
              select={select}
              search={search}
              expansions={expansions}
              onExpand={onExpand}
            />
          ))}
          {remaining > 0 && (
            <li>
              <button
                onClick={() => {
                  setPage({
                    query,
                    limit: limit + nextBatch,
                    focusIndex: nextBatch === remaining ? limit : null,
                  });
                }}
              >
                Mostrar mais {nextBatch.toLocaleString('pt-BR')} (de{' '}
                {remaining.toLocaleString('pt-BR')} restantes)
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

export function ContractTree({
  contract,
  search,
}: {
  contract: InferredContract;
  search: Search | null;
}) {
  const [expansions, setExpansions] = useState(new Map<string, boolean>());
  const [field, setField] = useState<Field>({
    path: '$',
    value: contract.root,
  });
  return (
    <>
      <div className="tree">
        <ul aria-label="Campos do contrato">
          {(!search || search.visible.has('$')) && (
            <TreeRow
              key={search ? 'filtered' : 'unfiltered'}
              name="$"
              field={{ path: '$', value: contract.root }}
              depth={0}
              selected={field.path}
              select={setField}
              search={search}
              expansions={expansions}
              onExpand={(path, expanded) =>
                setExpansions((previous) =>
                  new Map(previous).set(path, expanded),
                )
              }
            />
          )}
        </ul>
      </div>
      <FieldDetails field={field} />
    </>
  );
}
