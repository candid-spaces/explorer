import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface LineChangeSummary {
  added: number;
  removed: number;
}

function countLines(source: string): Map<string, number> {
  const counts = new Map<string, number>();

  source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => counts.set(line, (counts.get(line) ?? 0) + 1));

  return counts;
}

function summarizeLineChanges(originalSource: string, nextSource: string): LineChangeSummary {
  const originalLines = countLines(originalSource);
  const nextLines = countLines(nextSource);
  let added = 0;
  let removed = 0;

  nextLines.forEach((count, line) => {
    added += Math.max(0, count - (originalLines.get(line) ?? 0));
  });

  originalLines.forEach((count, line) => {
    removed += Math.max(0, count - (nextLines.get(line) ?? 0));
  });

  return { added, removed };
}

export default function App() {
  const [authoringSource, setAuthoringSource] = useState(INITIAL_DSL);
  const [remoteBaselineAppliedToEditor, setRemoteBaselineAppliedToEditor] = useState('');
  const latestRemoteBaselineRef = useRef('');
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
  const remoteBaselineSource = transactionDsl.source;
  const hasRemoteBaseline = remoteBaselineSource.trim().length > 0;
  const hasAuthoringEdits = hasRemoteBaseline
    ? authoringSource !== remoteBaselineAppliedToEditor
    : authoringSource !== INITIAL_DSL;
  const remoteBaselineChanged = hasRemoteBaseline && remoteBaselineSource !== remoteBaselineAppliedToEditor;

  useEffect(() => {
    if (!hasRemoteBaseline) {
      return;
    }

    const previousRemoteBaseline = latestRemoteBaselineRef.current;

    if (remoteBaselineSource === previousRemoteBaseline) {
      return;
    }

    latestRemoteBaselineRef.current = remoteBaselineSource;

    const currentHasEdits = remoteBaselineAppliedToEditor.trim().length > 0
      ? authoringSource !== remoteBaselineAppliedToEditor
      : authoringSource !== INITIAL_DSL;

    if (currentHasEdits) {
      return;
    }

    setRemoteBaselineAppliedToEditor(remoteBaselineSource);
    setAuthoringSource(remoteBaselineSource);
  }, [authoringSource, hasRemoteBaseline, remoteBaselineAppliedToEditor, remoteBaselineSource]);

  const authoringChangeSummary = useMemo(
    () => summarizeLineChanges(remoteBaselineAppliedToEditor, authoringSource),
    [authoringSource, remoteBaselineAppliedToEditor],
  );
  const document = useMemo(() => createSpatialDocument(authoringSource), [authoringSource]);

  const handleAuthoringSourceChange = useCallback((nextSource: string) => {
    setAuthoringSource(nextSource);
  }, []);

  const resetAuthoringToRemote = useCallback(() => {
    if (!hasRemoteBaseline) {
      return;
    }

    if (hasAuthoringEdits && !window.confirm('Discard local DSL edits and reset to the latest remote declarations?')) {
      return;
    }

    setAuthoringSource(remoteBaselineSource);
    setRemoteBaselineAppliedToEditor(remoteBaselineSource);
  }, [hasAuthoringEdits, hasRemoteBaseline, remoteBaselineSource]);

  return (
    <main className="app-shell">
      <SceneRoot document={document} />
      <DslDrawer
        document={document}
        isOpen={drawerOpen}
        source={authoringSource}
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
        mappedTransactionSource={remoteBaselineSource}
        rejectedTransactions={transactionDsl.rejected}
        hasRemoteBaseline={hasRemoteBaseline}
        hasAuthoringEdits={hasAuthoringEdits}
        remoteBaselineChanged={remoteBaselineChanged}
        authoringChangeSummary={authoringChangeSummary}
        onChange={handleAuthoringSourceChange}
        onResetToRemote={resetAuthoringToRemote}
        onToggle={() => setDrawerOpen((isOpen) => !isOpen)}
        onTransactionPublicKeyChange={setTransactionPublicKey}
        onTransactionRangeChange={setTransactionRange}
        onReloadTransactions={reloadTransactions}
        onUseTransactionTip={loadTipHeight}
      />
    </main>
  );
}
