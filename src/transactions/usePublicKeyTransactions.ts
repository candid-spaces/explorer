import { useCallback, useEffect, useState } from 'react';
import { fetchPublicKeyTransactions } from './publicKeyTransactions';
import { normalizeXyzTransactions } from './transactionXyz';
import type { XyzTransaction, TransactionRange } from './types';

interface UsePublicKeyTransactionsOptions {
  endpoint: string;
  publicKey: string;
  range: TransactionRange;
  /** Changes when an external chain notification requires a history refresh. */
  refreshKey?: number;
}

export function usePublicKeyTransactions({ endpoint, publicKey, range, refreshKey }: UsePublicKeyTransactionsOptions) {
  const [transactions, setTransactions] = useState<XyzTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!publicKey.trim()) {
      setTransactions([]);
      setLoading(false);
      setError(undefined);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(undefined);

    fetchPublicKeyTransactions({ endpoint, publicKey: publicKey.trim(), range, signal: controller.signal })
      .then((nextTransactions) => {
        setTransactions(normalizeXyzTransactions(nextTransactions));
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          return;
        }

        setTransactions([]);
        setError(caught instanceof Error ? caught.message : 'Unable to load public-key transactions.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [endpoint, publicKey, range, refreshKey, reloadToken]);

  return { transactions, loading, error, reload };
}
