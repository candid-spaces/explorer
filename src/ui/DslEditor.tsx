import type { ChangeEvent, ReactNode } from 'react';

interface DslEditorProps {
  value: string;
  description: string;
  status?: ReactNode;
  actions?: ReactNode;
  onChange: (value: string) => void;
}

export function DslEditor({ value, description, status, actions, onChange }: DslEditorProps) {
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
      <textarea spellCheck={false} value={value} wrap="off" onChange={handleChange} />
    </label>
  );
}
