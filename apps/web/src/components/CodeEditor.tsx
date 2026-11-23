import { useEffect, useEffectEvent, useRef } from 'react';
import { basicSetup, minimalSetup } from 'codemirror';
import { Compartment, EditorState, Transaction } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { json } from '@codemirror/lang-json';

export type CodeEditorProps = {
  mode: 'input' | 'viewer';
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  language?: 'json' | 'typescript';
  label: string;
};

export function CodeEditor({
  mode,
  value,
  onChange,
  readOnly = false,
  language = 'json',
  label,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const access = useRef<Compartment | null>(null);
  const syntax = useRef<Compartment | null>(null);
  if (access.current === null) access.current = new Compartment();
  if (syntax.current === null) syntax.current = new Compartment();
  const initial = useEffectEvent(() => ({ value, readOnly }));
  const change = useEffectEvent((text: string) => onChange?.(text));
  const viewer = mode === 'viewer';
  useEffect(() => {
    if (!host.current || !access.current || !syntax.current) return;
    const start = initial();
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: start.value,
        extensions: [
          viewer ? [minimalSetup, lineNumbers()] : basicSetup,
          syntax.current.of([]),
          access.current.of([
            EditorState.readOnly.of(start.readOnly),
            EditorView.editable.of(!start.readOnly),
          ]),
          EditorView.contentAttributes.of({
            'aria-label': label,
            tabindex: '0',
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) change(update.state.doc.toString());
          }),
        ],
      }),
    });
    editor.current = view;
    return () => {
      view.destroy();
      editor.current = null;
    };
  }, [viewer, label]);
  useEffect(() => {
    const compartment = syntax.current;
    if (!compartment) return;
    editor.current?.dispatch({
      effects: compartment.reconfigure(language === 'json' ? json() : []),
    });
    if (language === 'json') return;
    let active = true;
    void import('@codemirror/lang-javascript')
      .then(({ javascript }) => {
        if (active)
          editor.current?.dispatch({
            effects: compartment.reconfigure(javascript({ typescript: true })),
          });
      })
      .catch(() => {
        // Keep the plain editor usable when the optional language chunk fails.
      });
    return () => {
      active = false;
    };
  }, [language]);
  useEffect(() => {
    if (!access.current) return;
    editor.current?.dispatch({
      effects: access.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    });
  }, [readOnly]);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== value)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        annotations: Transaction.addToHistory.of(false),
      });
  }, [value]);
  return (
    <div className={`code-editor${viewer ? ' code-viewer' : ''}`} ref={host} />
  );
}
