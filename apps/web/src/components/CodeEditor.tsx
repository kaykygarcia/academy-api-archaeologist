import { useEffect, useEffectEvent, useRef } from 'react';
import { basicSetup, minimalSetup } from 'codemirror';
import { Compartment, EditorState, Prec, Transaction } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  placeholder as hint,
} from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { json } from '@codemirror/lang-json';

// Colors come from CSS variables so one style follows both themes.
const highlight = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: [tags.string, tags.special(tags.string)],
      color: 'var(--syn-string)',
    },
    { tag: [tags.number, tags.bool, tags.null], color: 'var(--syn-literal)' },
    {
      tag: [tags.keyword, tags.modifier, tags.operatorKeyword],
      color: 'var(--syn-keyword)',
    },
    {
      tag: [tags.propertyName, tags.definition(tags.propertyName)],
      color: 'var(--syn-property)',
    },
    {
      tag: [tags.typeName, tags.className, tags.standard(tags.variableName)],
      color: 'var(--syn-type)',
    },
    {
      tag: [
        tags.definition(tags.variableName),
        tags.function(tags.variableName),
      ],
      color: 'var(--syn-name)',
    },
    {
      tag: [tags.punctuation, tags.bracket, tags.separator, tags.operator],
      color: 'var(--syn-punctuation)',
    },
    { tag: tags.comment, color: 'var(--muted)', fontStyle: 'italic' },
  ]),
);

export type CodeEditorProps = {
  mode: 'input' | 'viewer';
  value: string;
  onSubmit?: (analyze: boolean) => void;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  language?: 'json' | 'typescript';
  label: string;
  describedBy?: string;
  placeholder?: string;
};

export function CodeEditor({
  mode,
  value,
  onChange,
  onSubmit,
  readOnly = false,
  language = 'json',
  label,
  describedBy,
  placeholder = '',
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const access = useRef<Compartment | null>(null);
  const syntax = useRef<Compartment | null>(null);
  if (access.current === null) access.current = new Compartment();
  if (syntax.current === null) syntax.current = new Compartment();
  const initial = useEffectEvent(() => ({ value, readOnly }));
  const change = useEffectEvent((text: string) => onChange?.(text));
  const submit = useEffectEvent((analyze: boolean) => {
    if (!onSubmit) return false;
    onSubmit(analyze);
    return true;
  });
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
          highlight,
          placeholder ? hint(placeholder) : [],
          viewer
            ? []
            : Prec.highest(
                keymap.of([
                  { key: 'Mod-Enter', run: () => submit(true) },
                  { key: 'Mod-Shift-Enter', run: () => submit(false) },
                ]),
              ),
          EditorState.phrases.of({
            'Control character': 'Caractere de controle',
            'Selection deleted': 'Seleção excluída',
            'Folded lines': 'Linhas recolhidas',
            'Unfolded lines': 'Linhas expandidas',
            to: 'a',
            'folded code': 'código recolhido',
            unfold: 'expandir',
            'Fold line': 'Recolher linha',
            'Unfold line': 'Expandir linha',
            'Go to line': 'Ir para a linha',
            go: 'ir',
            Find: 'Localizar',
            Replace: 'Substituir',
            next: 'próximo',
            previous: 'anterior',
            all: 'todos',
            'match case': 'diferenciar maiúsculas e minúsculas',
            regexp: 'expressão regular',
            'by word': 'por palavra',
            replace: 'substituir',
            'replace all': 'substituir tudo',
            close: 'fechar',
            'current match': 'ocorrência atual',
            'on line': 'na linha',
            'replaced match on line $': 'Ocorrência substituída na linha $',
            'replaced $ matches': 'Ocorrências substituídas: $',
            Completions: 'Sugestões',
            Diagnostics: 'Diagnósticos',
            'No diagnostics': 'Nenhum diagnóstico',
          }),
          syntax.current.of([]),
          access.current.of([
            EditorState.readOnly.of(start.readOnly),
            EditorView.editable.of(!start.readOnly),
          ]),
          EditorView.contentAttributes.of({
            'aria-label': label,
            ...(describedBy ? { 'aria-describedby': describedBy } : {}),
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
  }, [viewer, label, describedBy, placeholder]);
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
