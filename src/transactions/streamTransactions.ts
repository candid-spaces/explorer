import type { XyzTransaction } from './types';

export const DEFAULT_PLAYBACK_SPEED = 1;
export const PLAYBACK_SPEED_OPTIONS = [0.5, 1, 2, 4, 8, 16] as const;
const MIN_PLAYBACK_TICK_MILLISECONDS = 16;
const MAX_PLAYBACK_TICK_MILLISECONDS = 800;

export function normalizePlaybackSpeed(playbackSpeed: number | undefined): number {
  if (playbackSpeed !== undefined && (PLAYBACK_SPEED_OPTIONS as readonly number[]).includes(playbackSpeed)) {
    return playbackSpeed;
  }

  return DEFAULT_PLAYBACK_SPEED;
}

export function scaledPlaybackElapsedSeconds(
  elapsedSeconds: number,
  playbackSpeed = DEFAULT_PLAYBACK_SPEED,
): number {
  return Math.max(0, elapsedSeconds) * normalizePlaybackSpeed(playbackSpeed);
}

export function playbackTimeForElapsedTime(
  baseTransactionTime: number,
  elapsedSeconds: number,
  playbackSpeed = DEFAULT_PLAYBACK_SPEED,
): number {
  return baseTransactionTime + scaledPlaybackElapsedSeconds(elapsedSeconds, playbackSpeed);
}

export function playbackTickIntervalMilliseconds(
  transactions: readonly XyzTransaction[],
  playbackSpeed = DEFAULT_PLAYBACK_SPEED,
): number {
  const smallestGapSeconds = transactions.slice(1).reduce<number | undefined>((smallestGap, transaction, index) => {
    const gapSeconds = transaction.time - transactions[index].time;

    if (gapSeconds <= 0) {
      return smallestGap;
    }

    return smallestGap === undefined ? gapSeconds : Math.min(smallestGap, gapSeconds);
  }, undefined);

  if (smallestGapSeconds === undefined) {
    return MAX_PLAYBACK_TICK_MILLISECONDS;
  }

  return Math.max(
    MIN_PLAYBACK_TICK_MILLISECONDS,
    Math.min(MAX_PLAYBACK_TICK_MILLISECONDS, (smallestGapSeconds * 1000) / normalizePlaybackSpeed(playbackSpeed) / 2),
  );
}

export function mergeStreamTransactions(
  currentTransactions: readonly XyzTransaction[],
  nextTransactions: readonly XyzTransaction[],
): XyzTransaction[] {
  return [...currentTransactions, ...nextTransactions];
}

function transactionIdentity(transaction: XyzTransaction): string | undefined {
  return transaction.signature;
}

export function mergeHistoricalStreamTransactions(
  currentTransactions: readonly XyzTransaction[],
  nextTransactions: readonly XyzTransaction[],
): XyzTransaction[] {
  const seenIdentities = new Set(
    currentTransactions.map(transactionIdentity).filter((identity): identity is string => identity !== undefined),
  );
  const newTransactions = nextTransactions.filter((transaction) => {
    const identity = transactionIdentity(transaction);

    if (identity === undefined) {
      return true;
    }

    if (seenIdentities.has(identity)) {
      return false;
    }

    seenIdentities.add(identity);
    return true;
  });

  return mergeStreamTransactions(currentTransactions, newTransactions);
}

export function sortTransactionsByTimeStable(transactions: readonly XyzTransaction[]): XyzTransaction[] {
  return transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((a, b) => a.transaction.time - b.transaction.time || a.index - b.index)
    .map(({ transaction }) => transaction);
}

export function outgoingTransactionsForPublicKey(
  transactions: readonly XyzTransaction[],
  publicKey: string,
): XyzTransaction[] {
  return transactions.filter((transaction) => transaction.from === publicKey);
}

export function advancePlaybackIndex(playbackIndex: number, transactionCount: number): number {
  return Math.min(playbackIndex + 1, transactionCount);
}

export function clampPlaybackIndex(playbackIndex: number, transactionCount: number): number {
  return Math.min(Math.max(Math.trunc(playbackIndex), 0), Math.max(transactionCount - 1, 0));
}

export function playbackIndexForElapsedTime(
  transactions: readonly XyzTransaction[],
  elapsedSeconds: number,
  baseTransactionTime = transactions[0]?.time ?? 0,
): number {
  if (transactions.length === 0) {
    return 0;
  }

  const targetTransactionTime = baseTransactionTime + Math.max(0, elapsedSeconds);
  let index = 0;

  for (let candidateIndex = 0; candidateIndex < transactions.length; candidateIndex += 1) {
    if (transactions[candidateIndex].time > targetTransactionTime) {
      break;
    }

    index = candidateIndex;
  }

  return index;
}

export function currentPlaybackTransaction(
  transactions: readonly XyzTransaction[],
  playbackIndex: number,
): XyzTransaction | undefined {
  if (transactions.length === 0) {
    return undefined;
  }

  const index = Math.min(Math.max(Math.trunc(playbackIndex), 0), transactions.length - 1);
  return transactions[index];
}

export function hasPlaybackReachedEnd(
  transactions: readonly XyzTransaction[],
  playbackIndex: number,
  elapsedSeconds: number,
  baseTransactionTime = transactions[0]?.time ?? 0,
): boolean {
  if (transactions.length === 0) {
    return true;
  }

  const lastTransaction = transactions[transactions.length - 1];

  return playbackIndex >= transactions.length - 1
    && baseTransactionTime + Math.max(0, elapsedSeconds) >= lastTransaction.time;
}
