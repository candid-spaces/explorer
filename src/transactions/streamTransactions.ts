import type { DslTransaction } from './types';

export function mergeStreamTransactions(
  currentTransactions: readonly DslTransaction[],
  nextTransactions: readonly DslTransaction[],
): DslTransaction[] {
  return [...currentTransactions, ...nextTransactions];
}

export function sortTransactionsByTimeStable(transactions: readonly DslTransaction[]): DslTransaction[] {
  return transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((a, b) => a.transaction.time - b.transaction.time || a.index - b.index)
    .map(({ transaction }) => transaction);
}

export function advancePlaybackIndex(playbackIndex: number, transactionCount: number): number {
  return Math.min(playbackIndex + 1, transactionCount);
}
