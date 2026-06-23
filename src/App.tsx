import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSpatialDocument } from './model/createSpatialDocument';
import { SceneRoot } from './scene/SceneRoot';
import { fetchTipHeight } from './transactions/publicKeyTransactions';
import { createPublicKeyShareUrl, readPublicKeyFromUrl } from './transactions/publicKeyShareUrl';
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

const DEFAULT_TRANSACTION_ENDPOINT = 'wss://sure-formerly-filly.ngrok-free.app/00000000e29a7850088d660489b7b9ae2da763bc3bd83324ecc54eee04840adb';

const DEFAULT_TRANSACTION_RANGE: TransactionRange = {
  startHeight: 0,
  endHeight: 0,
  limit: 500,
};

const SHARED_TRANSACTION_PUBLIC_KEY = readPublicKeyFromUrl();

export default function App() {
  const [source, setSource] = useState(INITIAL_DSL);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [transactionPublicKey, setTransactionPublicKey] = usePersistentState(
    'dsl-transaction-public-key',
    '',
    SHARED_TRANSACTION_PUBLIC_KEY,
  );
  const [transactionRange, setTransactionRange] = useState<TransactionRange>(DEFAULT_TRANSACTION_RANGE);
  const [tipHeight, setTipHeight] = useState<number | undefined>();
  const [tipLoading, setTipLoading] = useState(false);
  const [tipError, setTipError] = useState<string | undefined>();
  const transactionPublicKeyShareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    return createPublicKeyShareUrl(transactionPublicKey, window.location.href);
  }, [transactionPublicKey]);

  useEffect(() => {
    if (SHARED_TRANSACTION_PUBLIC_KEY !== undefined) {
      setTransactionPublicKey(SHARED_TRANSACTION_PUBLIC_KEY);
    }
  }, [setTransactionPublicKey]);

  const {
    transactions,
    loading: transactionsLoading,
    error: transactionError,
    reload: reloadTransactions,
  } = usePublicKeyTransactions({
    endpoint: DEFAULT_TRANSACTION_ENDPOINT,
    publicKey: transactionPublicKey,
    range: transactionRange,
  });
  const loadTipHeight = useCallback(() => {
    const controller = new AbortController();
    setTipLoading(true);
    setTipError(undefined);

    fetchTipHeight(DEFAULT_TRANSACTION_ENDPOINT, controller.signal)
      .then((height) => {
        setTipHeight(height);
        setTransactionRange((range) => ({
          ...range,
          startHeight: height,
          endHeight: Math.min(range.endHeight, height),
          limit: DEFAULT_TRANSACTION_RANGE.limit,
        }));
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          return;
        }

        setTipError(caught instanceof Error ? caught.message : 'Unable to load blockchain tip.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setTipLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => loadTipHeight(), [loadTipHeight]);

  const transactionDsl = useMemo(
    () => transactionsToDslSource(transactions, { publicKey: transactionPublicKey }),
    [transactions, transactionPublicKey],
  );
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
        transactionPublicKey={transactionPublicKey}
        transactionPublicKeyShareUrl={transactionPublicKeyShareUrl}
        transactionRange={transactionRange}
        transactionsLoading={transactionsLoading}
        transactionError={transactionError}
        tipHeight={tipHeight}
        tipLoading={tipLoading}
        tipError={tipError}
        transactionCount={transactions.length}
        acceptedTransactionCount={transactionDsl.source ? transactionDsl.source.split('\n').filter(Boolean).length : 0}
        mappedTransactionSource={transactionDsl.source}
        rejectedTransactions={transactionDsl.rejected}
        onChange={setSource}
        onToggle={() => setDrawerOpen((isOpen) => !isOpen)}
        onTransactionPublicKeyChange={setTransactionPublicKey}
        onTransactionRangeChange={setTransactionRange}
        onReloadTransactions={reloadTransactions}
        onUseTransactionTip={loadTipHeight}
      />
    </main>
  );
}
