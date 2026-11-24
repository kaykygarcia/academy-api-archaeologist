import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export function TabList({
  id,
  name,
  labels,
  active,
  onChange,
}: {
  id: string;
  name: string;
  labels: readonly string[];
  active: number;
  onChange: (index: number) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const button = buttons.current[active];
    if (!button) return;
    function measure() {
      if (button)
        setIndicator({ left: button.offsetLeft, width: button.offsetWidth });
    }
    measure();
    // Fonts and container width change label widths after the first layout.
    const observer = new ResizeObserver(measure);
    observer.observe(button);
    return () => observer.disconnect();
  }, [active]);
  return (
    <div className="tabs" role="tablist" aria-label={name}>
      <span
        className="tab-indicator"
        aria-hidden="true"
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
        }}
      />
      {labels.map((label, index) => (
        <button
          key={index}
          ref={(node) => {
            buttons.current[index] = node;
          }}
          id={`${id}-tab-${index}`}
          role="tab"
          aria-selected={index === active}
          aria-controls={`${id}-panel-${index}`}
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
  );
}

export function TabPanel({
  id,
  index,
  active,
  className,
  children,
}: {
  id: string;
  index: number;
  active: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${id}-panel-${index}`}
      aria-labelledby={`${id}-tab-${index}`}
      hidden={active !== index}
      className={className}
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
