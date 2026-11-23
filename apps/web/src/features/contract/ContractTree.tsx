import { useState } from 'react';
import {
  describeType,
  elementPath,
  hasTypeConflict,
  isNullable,
  isOptional,
  propertyPath,
  type InferredContract,
} from '@api-archaeologist/core';
import { FieldDetails, type Field } from './FieldDetails';

function TreeRow({
  field,
  name,
  optional = false,
  depth,
  selected,
  select,
}: {
  field: Field;
  name: string;
  optional?: boolean;
  depth: number;
  selected: string;
  select: (field: Field) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = Boolean(
    field.value.object?.properties.length || field.value.array?.element,
  );
  return (
    <li>
      <div className={`tree-row${selected === field.path ? ' selected' : ''}`}>
        {children && (
          <button
            className="disclosure"
            aria-label={`${expanded ? 'Recolher' : 'Expandir'} ${field.path}`}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '−' : '+'}
          </button>
        )}
        <button
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
          {field.value.object?.properties.map((property) => (
            <TreeRow
              key={property.name}
              name={property.name || '""'}
              field={{
                path: propertyPath(field.path, property.name),
                value: property.value,
                presence: {
                  present: property.presentCount,
                  parents: field.value.kindCounts.object,
                },
              }}
              optional={isOptional(property, field.value)}
              depth={depth + 1}
              selected={selected}
              select={select}
            />
          ))}
          {field.value.array?.element && (
            <TreeRow
              name="[*]"
              field={{
                path: elementPath(field.path),
                value: field.value.array.element,
              }}
              depth={depth + 1}
              selected={selected}
              select={select}
            />
          )}
        </ul>
      )}
    </li>
  );
}

export function ContractTree({ contract }: { contract: InferredContract }) {
  const [field, setField] = useState<Field>({
    path: '$',
    value: contract.root,
  });
  return (
    <>
      <div className="tree">
        <ul aria-label="Campos do contrato">
          <TreeRow
            name="$"
            field={{ path: '$', value: contract.root }}
            depth={0}
            selected={field.path}
            select={setField}
          />
        </ul>
      </div>
      <FieldDetails field={field} />
    </>
  );
}
