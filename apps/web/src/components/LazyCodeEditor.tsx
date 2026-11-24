import { Component, lazy, Suspense, type ReactNode } from 'react';
import type { CodeEditorProps } from './CodeEditor';

const Editor = lazy(() =>
  import('./CodeEditor').then((module) => ({ default: module.CodeEditor })),
);

function PlainCode({
  value,
  label,
  describedBy,
  mode,
  onChange,
  onSubmit,
  readOnly,
  placeholder,
}: CodeEditorProps) {
  return (
    <div className={`code-editor${mode === 'viewer' ? ' code-viewer' : ''}`}>
      {mode === 'input' ? (
        <textarea
          className="plain-code"
          aria-label={label}
          aria-describedby={describedBy}
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          onKeyDown={(event) => {
            if (
              onSubmit &&
              (event.ctrlKey || event.metaKey) &&
              event.key === 'Enter'
            ) {
              event.preventDefault();
              onSubmit(!event.shiftKey);
            }
          }}
          onChange={(event) => onChange?.(event.target.value)}
        />
      ) : (
        <pre className="plain-code" aria-label={label}>
          {value}
        </pre>
      )}
    </div>
  );
}

class EditorBoundary extends Component<
  { editor: CodeEditorProps; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <>
          <p className="note">
            Falha ao carregar o editor; exibindo texto simples.
          </p>
          <PlainCode {...this.props.editor} />
        </>
      );
    }
    return this.props.children;
  }
}

export function LazyCodeEditor(props: CodeEditorProps) {
  return (
    <EditorBoundary editor={props}>
      <Suspense
        fallback={
          props.mode === 'viewer' ? (
            <PlainCode {...props} />
          ) : (
            <div className="code-editor" />
          )
        }
      >
        <Editor {...props} />
      </Suspense>
    </EditorBoundary>
  );
}
