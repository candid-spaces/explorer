import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

interface DslEditorProps {
  value: string;
  description: string;
  status?: ReactNode;
  selectedLineNumber?: number;
  actions?: ReactNode;
  onChange: (value: string) => void;
}

export function DslEditor({ value, description, status, selectedLineNumber, actions, onChange }: DslEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!selectedLineNumber || !textareaRef.current) {
      return;
    }

    const lines = value.split('\n');
    const characterOffset = lines.slice(0, selectedLineNumber - 1).reduce((offset, line) => offset + line.length + 1, 0);

    textareaRef.current.focus({ preventScroll: true });
    textareaRef.current.setSelectionRange(characterOffset, characterOffset + (lines[selectedLineNumber - 1]?.length ?? 0));
  }, [selectedLineNumber]);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
  }

  return (
    <label className="dsl-editor">
      <span className="dsl-editor-heading">
        <span>Authoring DSL</span>
        {actions ? <span className="dsl-editor-actions">{actions}</span> : null}
      </span>
      <small>{description}</small>
      {status ? <span className="dsl-editor-status">{status}</span> : null}
      {selectedLineNumber ? <span className="dsl-editor-selected-line">Selected scene object: line {selectedLineNumber}</span> : null}
      <textarea ref={textareaRef} spellCheck={false} value={value} wrap="off" onChange={handleChange} />
    </label>
  );
}
