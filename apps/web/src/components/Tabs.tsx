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
  return (
    <>
      <TabList
        id={id}
        name={name}
        labels={labels}
        active={active}
        onChange={onChange}
        sharedPanel
      />
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

export function TabList({
  id,
  name,
  labels,
  active,
  onChange,
  sharedPanel = false,
}: {
  id: string;
  sharedPanel?: boolean;
  name: string;
  labels: readonly string[];
  active: number;
  onChange: (index: number) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="tabs" role="tablist" aria-label={name}>
      {labels.map((label, index) => (
        <button
          key={index}
          ref={(node) => {
            buttons.current[index] = node;
          }}
          id={`${id}-tab-${index}`}
          role="tab"
          aria-selected={index === active}
          aria-controls={sharedPanel ? `${id}-panel` : `${id}-panel-${index}`}
          tabIndex={index === active ? 0 : -1}
          onClick={() => {
            onChange(index);
            buttons.current[index]?.focus();
          }}
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
  );
}

export function TabPanel({
  id,
  index,
  active,
  children,
}: {
  id: string;
  index: number;
  active: number;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${id}-panel-${index}`}
      aria-labelledby={`${id}-tab-${index}`}
      hidden={active !== index}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

function nextTab(key: string, index: number, count: number): number | null {
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index + count - 1) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
