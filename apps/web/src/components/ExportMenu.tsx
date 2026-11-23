import { useEffect, useId, useRef, useState } from 'react';
import type { AnalysisResult } from '../lib/analysis-protocol';
import { copyCode } from '../lib/clipboard';
import { downloadCode } from '../lib/download';

const items = [
  { label: 'Copiar TypeScript', format: 'typescript', extension: '.ts' },
  { label: 'Copiar Zod', format: 'zod', extension: '.zod.ts' },
  {
    label: 'Copiar JSON Schema',
    format: 'jsonSchema',
    extension: '.schema.json',
  },
  { label: 'Baixar .ts', format: 'typescript', extension: '.ts' },
  { label: 'Baixar .zod.ts', format: 'zod', extension: '.zod.ts' },
  {
    label: 'Baixar .schema.json',
    format: 'jsonSchema',
    extension: '.schema.json',
  },
] as const;

export function ExportMenu({
  result,
  dataset,
  report,
}: {
  result: AnalysisResult;
  dataset: string;
  report: (message: string) => void;
}) {
  const id = useId();
  const [opened, setOpened] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!opened) return;
    function dismiss(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpened(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [opened]);
  const trigger = useRef<HTMLButtonElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function close() {
    setOpened(false);
    trigger.current?.focus();
  }
  function show(index: number) {
    setOpened(true);
    requestAnimationFrame(() => buttons.current[index]?.focus());
  }
  return (
    <div className="export-menu" ref={container}>
      <button
        ref={trigger}
        id={`${id}-button`}
        aria-haspopup="menu"
        aria-expanded={opened}
        aria-controls={opened ? id : undefined}
        onClick={() => (opened ? close() : show(0))}
        onKeyDown={(event) => {
          if (opened && (event.key === 'Escape' || event.key === 'Tab')) {
            if (event.key === 'Escape') event.preventDefault();
            close();
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            show(event.key === 'ArrowDown' ? 0 : items.length - 1);
          }
        }}
      >
        Exportar
      </button>
      {opened && (
        <div
          id={id}
          role="menu"
          aria-labelledby={`${id}-button`}
          onKeyDown={(event) => {
            const index = buttons.current.findIndex(
              (button) => button === document.activeElement,
            );
            let next: number | undefined;
            if (event.key === 'ArrowDown') next = (index + 1) % items.length;
            if (event.key === 'ArrowUp')
              next = (index + items.length - 1) % items.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = items.length - 1;
            if (event.key === 'Escape') {
              event.preventDefault();
              close();
            }
            if (event.key === 'Tab') {
              // Return to the trigger before the browser advances through the page.
              close();
            }
            if (next !== undefined) {
              event.preventDefault();
              buttons.current[next]?.focus();
            }
          }}
        >
          {items.map((item, index) => (
            <div key={item.label} role="none">
              {index === 3 && <div role="separator" />}
              <button
                role="menuitem"
                tabIndex={-1}
                ref={(node) => {
                  buttons.current[index] = node;
                }}
                onClick={async () => {
                  close();
                  if (index < 3) {
                    const ok = await copyCode(result[item.format]);
                    report(
                      ok
                        ? `${item.label.replace('Copiar ', '')} copiado.`
                        : 'Falha ao copiar. A área de transferência está indisponível.',
                    );
                  } else {
                    try {
                      downloadCode(
                        dataset,
                        item.extension,
                        result[item.format],
                      );
                      report('Arquivo preparado para baixar.');
                    } catch {
                      report('Falha ao baixar. Tente novamente.');
                    }
                  }
                }}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
