import { useMemo, useState } from 'react';
import { createSpatialDocument } from './model/createSpatialDocument';
import { SceneRoot } from './scene/SceneRoot';
import { DslDrawer } from './ui/DslDrawer';

const INITIAL_DSL = `"+2+4/+0+6/+1+3" : "geometry: cylinder; color: 0x333333; metalness: 0.8; roughness: 0.2"
"+2+4/+7+6/+0+01" : "geometry: cone; color: yellow; metalness: 0.2; roughness: 0.5"
"+7+6/+0+15/+0+05" : "geometry: sphere; color: blue; metalness: 0.1; roughness: 0.2"`;

export default function App() {
  const [source, setSource] = useState(INITIAL_DSL);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const document = useMemo(() => createSpatialDocument(source), [source]);

  return (
    <main className="app-shell">
      <SceneRoot document={document} />
      <DslDrawer
        document={document}
        isOpen={drawerOpen}
        source={source}
        onChange={setSource}
        onToggle={() => setDrawerOpen((isOpen) => !isOpen)}
      />
    </main>
  );
}
