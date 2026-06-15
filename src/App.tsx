import { useMemo, useState } from 'react';
import { createSpatialDocument } from './model/createSpatialDocument';
import { SceneRoot } from './scene/SceneRoot';
import { TransactionProvider, useTransactions } from './transactions/TransactionContext';
import { DslDrawer } from './ui/DslDrawer';

const INITIAL_DSL = `"+2+4/+0+6/+1+3" : "geometry: cylinder; color: 0x333333; metalness: 0.8; roughness: 0.2"
"+2+4/+7+6/+0+10c" : "geometry: cone; color: yellow; metalness: 0.2; roughness: 0.5"
"+7+6/+0+15/+0+50c" : "geometry: sphere; color: blue; metalness: 0.1; roughness: 0.2"

"Table/+18+8/+0+5/+4+8" : "color: white; metalness: 0.8; roughness: 0.2"
"Table/Top/+0+8/+4+1/+0+8" : ""
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+0+1/+0+5/+0+1" : ""
"Table/Leg/+7+1/+0+5/+0+1" : ""
"Table/Leg/+0+1/+0+5/+7+1" : ""
"Table/Leg/+7+1/+0+5/+7+1" : ""`;

function SpatialApp() {
  const [userSource, setUserSource] = useState(INITIAL_DSL);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const { transactionDsl } = useTransactions();
  const source = useMemo(
    () => [userSource, transactionDsl.source].filter(Boolean).join('\n'),
    [transactionDsl.source, userSource],
  );
  const document = useMemo(
    () => createSpatialDocument(source, { transactionMetadataByNamespace: transactionDsl.metadataByNamespace }),
    [source, transactionDsl.metadataByNamespace],
  );

  return (
    <main className="app-shell">
      <SceneRoot document={document} />
      <DslDrawer
        document={document}
        generatedSource={transactionDsl.source}
        isOpen={drawerOpen}
        source={userSource}
        onChange={setUserSource}
        onToggle={() => setDrawerOpen((isOpen) => !isOpen)}
      />
    </main>
  );
}

export default function App() {
  return (
    <TransactionProvider>
      <SpatialApp />
    </TransactionProvider>
  );
}
