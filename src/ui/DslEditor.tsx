import type { ChangeEvent } from 'react';

interface DslEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DslEditor({ value, onChange }: DslEditorProps) {
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
  }

  return (
    <label className="dsl-editor">
      <span>DSL declarations</span>
      <textarea spellCheck={false} value={value} wrap="off" onChange={handleChange} />
    </label>
  );
}
