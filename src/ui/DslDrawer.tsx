import type { SpatialDocument } from '../model/SpatialDocument';
import { DslEditor } from './DslEditor';
import { DslTreeView } from './DslTreeView';
import { ObjectList } from './ObjectList';
import { PublicKeyNavigator } from './PublicKeyNavigator';

interface DslDrawerProps {
  document: SpatialDocument;
  generatedSource: string;
  isOpen: boolean;
  source: string;
  onChange: (source: string) => void;
  onToggle: () => void;
}

export function DslDrawer({ document, generatedSource, isOpen, source, onChange, onToggle }: DslDrawerProps) {
  return (
    <aside className={`dsl-drawer ${isOpen ? 'is-open' : ''}`}>
      <button className="drawer-toggle" type="button" onClick={onToggle}>
        {isOpen ? 'Close DSL' : 'Edit DSL'}
      </button>

      {isOpen ? (
        <div className="drawer-panel">
          <header>
            <p className="eyebrow">Coordinate Spaces</p>
            <p>Compose primitive geometry in a shared coordinate space.</p>
          </header>

          <PublicKeyNavigator />

          <DslEditor value={source} onChange={onChange} />

          {generatedSource ? (
            <section className="generated-dsl-preview" aria-label="Generated transaction DSL">
              <h2>Generated transaction DSL</h2>
              <pre>{generatedSource}</pre>
            </section>
          ) : null}

          {document.diagnostics.length > 0 ? (
            <section className="diagnostics" aria-label="DSL parse diagnostics">
              <h2>Diagnostics</h2>
              <ul>
                {document.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.line}-${index}`}>
                    <strong>Line {diagnostic.line}:</strong> {diagnostic.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <DslTreeView document={document} />

          <ObjectList document={document} />
        </div>
      ) : null}
    </aside>
  );
}
