import { useCallback, useEffect, useState } from 'react';
import { fetchPublicKeyTransactions } from './publicKeyTransactions';
import { normalizeDslTransactions } from './transactionDsl';
import type { DslTransaction, TransactionRange } from './types';

interface UsePublicKeyTransactionsOptions {
  endpoint: string;
  publicKey: string;
  range: TransactionRange;
}

export function usePublicKeyTransactions({ endpoint, publicKey, range }: UsePublicKeyTransactionsOptions) {
  const [transactions, setTransactions] = useState<DslTransaction[]>([]);
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
        setTransactions(normalizeDslTransactions(nextTransactions));
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
  }, [endpoint, publicKey, range, reloadToken]);

  return { transactions, loading, error, reload };
}
