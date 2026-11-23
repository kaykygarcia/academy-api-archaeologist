import { useId, useRef, type ReactNode } from 'react';

export function Tabs({
  name,
  labels,
  active,
  onChange,
  children,
}: {
  name: string;
  labels: readonly string[];
  active: number;
  onChange: (index: number) => void;
  children: ReactNode;
}) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <>
      <div className="tabs" role="tablist" aria-label={name}>
        {labels.map((label, index) => (
          <button
            key={label}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            id={`${id}-tab-${index}`}
            role="tab"
            aria-selected={index === active}
            aria-controls={`${id}-panel`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => onChange(index)}
            onKeyDown={(event) => {
              const next = nextTab(event.key, index, labels.length);
              if (next !== null) {
                event.preventDefault();
                onChange(next);
                buttons.current[next]?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${active}`}
        tabIndex={0}
      >
        {children}
      </div>
    </>
  );
}

function nextTab(key: string, index: number, count: number): number | null {
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index + count - 1) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
