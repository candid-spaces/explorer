import { useMemo, useState } from 'react';
import { createSpatialDocument } from './model/createSpatialDocument';
import { SceneRoot } from './scene/SceneRoot';
import { transactionsToDslSource } from './transactions/transactionDsl';
import type { TransactionRange } from './transactions/types';
import { usePublicKeyTransactions } from './transactions/usePublicKeyTransactions';
import { DslDrawer } from './ui/DslDrawer';
import { usePersistentState } from './ui/usePersistentState';

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

const DEFAULT_TRANSACTION_RANGE: TransactionRange = {
  startHeight: 0,
  endHeight: 0,
  limit: 500,
};

export default function App() {
  const [source, setSource] = useState(INITIAL_DSL);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [transactionEndpoint, setTransactionEndpoint] = usePersistentState('dsl-transaction-endpoint', '');
  const [transactionPublicKey, setTransactionPublicKey] = usePersistentState('dsl-transaction-public-key', '');
  const [transactionRange, setTransactionRange] = usePersistentState<TransactionRange>(
    'dsl-transaction-range',
    DEFAULT_TRANSACTION_RANGE,
  );
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionError,
    reload: reloadTransactions,
  } = usePublicKeyTransactions({
    endpoint: transactionEndpoint,
    publicKey: transactionPublicKey,
    range: transactionRange,
  });
  const transactionDsl = useMemo(() => transactionsToDslSource(transactions), [transactions]);
  const combinedSource = useMemo(
    () => [transactionDsl.source, source].filter((part) => part.trim().length > 0).join('\n'),
    [source, transactionDsl.source],
  );
  const document = useMemo(() => createSpatialDocument(combinedSource), [combinedSource]);

  return (
    <main className="app-shell">
      <SceneRoot document={document} />
      <DslDrawer
        document={document}
        isOpen={drawerOpen}
        source={source}
        transactionEndpoint={transactionEndpoint}
        transactionPublicKey={transactionPublicKey}
        transactionRange={transactionRange}
        transactionsLoading={transactionsLoading}
        transactionError={transactionError}
        transactionCount={transactions.length}
        acceptedTransactionCount={transactionDsl.source ? transactionDsl.source.split('\n').filter(Boolean).length : 0}
        rejectedTransactions={transactionDsl.rejected}
        onChange={setSource}
        onToggle={() => setDrawerOpen((isOpen) => !isOpen)}
        onTransactionEndpointChange={setTransactionEndpoint}
        onTransactionPublicKeyChange={setTransactionPublicKey}
        onTransactionRangeChange={setTransactionRange}
        onReloadTransactions={reloadTransactions}
      />
    </main>
  );
}
