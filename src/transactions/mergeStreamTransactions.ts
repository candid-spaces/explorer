import type { DslTransaction } from './types';

interface OrderedTransaction {
  transaction: DslTransaction;
  order: number;
}

/**
 * Appends transactions from a secondary stream without content-based
 * deduplication, then keeps playback time-synced with stable time ordering.
 * Equal-time transactions preserve their original arrival/order positions.
 */
export function mergeStreamTransactions(
  currentTransactions: readonly DslTransaction[],
  nextTransactions: readonly DslTransaction[],
): DslTransaction[] {
  return [...currentTransactions, ...nextTransactions]
    .map<OrderedTransaction>((transaction, order) => ({ transaction, order }))
    .sort((a, b) => a.transaction.time - b.transaction.time || a.order - b.order)
    .map(({ transaction }) => transaction);
}
