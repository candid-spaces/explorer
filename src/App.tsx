import { useMemo, useState } from 'react';
import { createSpatialDocument } from './model/createSpatialDocument';
import { SceneRoot } from './scene/SceneRoot';
import { DslDrawer } from './ui/DslDrawer';

const INITIAL_DSL = `-"+2+4/+0+6/+1+3" : "color: 0x333333; metalness: 0.8; roughness: 0.2"
-"Sofa/+7+4/+0+3/+0+2": "import: Sofa.gltf;"
-"Mirror/+3+2/+0+6/+0+02": "import: Mirror.gltf;"
-"Referential/+3+5/+0+3/+0+15": "ref: Sofa/;"
-"Table/+3+8/+0+5/+0+8": "color: 0x333333; metalness: 0.8; roughness: 0.2"
--"Table/Top/+1+6/+0+5/+0+6": ""
--"Table/LegA/+1+2/+0+7/+0+1": ""
--"Table/LegB/+7+2/+0+7/+0+1": ""
--"Table/LegC/+1+2/+0+7/+0+7": ""
--"Table/LegD/+7+2/+0+7/+0+7": ""`;

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
