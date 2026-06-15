import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_TRANSACTION_RANGE, TransactionClient } from './transactionClient';
import { transactionsToDsl } from './transactionsToDsl';
import type { DslTransaction, TransactionDslBundle, TransactionRange } from './types';

interface TransactionContextValue {
  endpoint: string;
  selectedPublicKey: string;
  transactionRange: TransactionRange;
  transactions: DslTransaction[];
  transactionDsl: TransactionDslBundle;
  loading: boolean;
  error?: string;
  setEndpoint: (endpoint: string) => void;
  setSelectedPublicKey: (publicKey: string) => void;
  setTransactionRange: (range: TransactionRange) => void;
  reloadTransactions: () => void;
}

const DEFAULT_ENDPOINT = 'ws://localhost:8831';
const EMPTY_BUNDLE: TransactionDslBundle = { source: '', metadataByNamespace: {} };
const TransactionContext = createContext<TransactionContextValue | undefined>(undefined);

function readStoredValue(key: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return window.localStorage.getItem(key) ?? fallback;
}

function readStoredRange(): TransactionRange {
  if (typeof window === 'undefined') {
    return DEFAULT_TRANSACTION_RANGE;
  }

  const raw = window.localStorage.getItem('spatial-object-model.transactionRange');
  if (!raw) {
    return DEFAULT_TRANSACTION_RANGE;
  }

  try {
    return { ...DEFAULT_TRANSACTION_RANGE, ...(JSON.parse(raw) as Partial<TransactionRange>) };
  } catch {
    return DEFAULT_TRANSACTION_RANGE;
  }
}

function storeValue(key: string, value: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, value);
  }
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new TransactionClient(), []);
  const requestId = useRef(0);
  const [endpoint, setEndpointState] = useState(() => readStoredValue('spatial-object-model.transactionEndpoint', DEFAULT_ENDPOINT));
  const [selectedPublicKey, setSelectedPublicKeyState] = useState(() => readStoredValue('spatial-object-model.selectedPublicKey', ''));
  const [transactionRange, setTransactionRangeState] = useState(readStoredRange);
  const [transactions, setTransactions] = useState<DslTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const transactionDsl = useMemo(
    () => (selectedPublicKey ? transactionsToDsl(transactions, selectedPublicKey) : EMPTY_BUNDLE),
    [selectedPublicKey, transactions],
  );

  const setEndpoint = useCallback((nextEndpoint: string) => {
    setEndpointState(nextEndpoint);
    storeValue('spatial-object-model.transactionEndpoint', nextEndpoint);
  }, []);

  const setSelectedPublicKey = useCallback((nextPublicKey: string) => {
    setSelectedPublicKeyState(nextPublicKey);
    storeValue('spatial-object-model.selectedPublicKey', nextPublicKey);
  }, []);

  const setTransactionRange = useCallback((nextRange: TransactionRange) => {
    setTransactionRangeState(nextRange);
    storeValue('spatial-object-model.transactionRange', JSON.stringify(nextRange));
  }, []);

  const reloadTransactions = useCallback(() => {
    const publicKey = selectedPublicKey.trim();
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;

    if (!publicKey) {
      setTransactions([]);
      setError(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);

    client
      .requestPublicKeyTransactions(endpoint, publicKey, transactionRange)
      .then((nextTransactions) => {
        if (requestId.current === currentRequest) {
          setTransactions(nextTransactions);
        }
      })
      .catch((caught: unknown) => {
        if (requestId.current === currentRequest) {
          setTransactions([]);
          setError(caught instanceof Error ? caught.message : 'Unable to load transactions.');
        }
      })
      .finally(() => {
        if (requestId.current === currentRequest) {
          setLoading(false);
        }
      });
  }, [client, endpoint, selectedPublicKey, transactionRange]);

  useEffect(() => {
    reloadTransactions();
  }, [reloadTransactions]);

  useEffect(() => () => client.disconnect(), [client]);

  const value = useMemo<TransactionContextValue>(
    () => ({
      endpoint,
      selectedPublicKey,
      transactionRange,
      transactions,
      transactionDsl,
      loading,
      error,
      setEndpoint,
      setSelectedPublicKey,
      setTransactionRange,
      reloadTransactions,
    }),
    [endpoint, error, loading, reloadTransactions, selectedPublicKey, setEndpoint, setSelectedPublicKey, setTransactionRange, transactionDsl, transactionRange, transactions],
  );

  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
}

export function useTransactions(): TransactionContextValue {
  const value = useContext(TransactionContext);

  if (!value) {
    throw new Error('useTransactions must be used within TransactionProvider.');
  }

  return value;
}
