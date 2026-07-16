import { describe, expect, it } from 'vitest';
import {
  advancePlaybackIndex,
  currentPlaybackTransaction,
  hasPlaybackReachedEnd,
  mergeHistoricalStreamTransactions,
  mergeStreamTransactions,
  playbackIndexForElapsedTime,
  sortTransactionsByTimeStable,
} from './streamTransactions';
import type { DslTransaction } from './types';

function transaction(overrides: Partial<DslTransaction> = {}): DslTransaction {
  return {
    time: 100,
    series: 1,
    nonce: 7,
    from: 'sender-key',
    to: '+0+1/+0+1/+0+1',
    amount: 1,
    fee: 0,
    memo: 'geometry: box',
    ...overrides,
  };
}

describe('mergeStreamTransactions', () => {
  it('keeps duplicate-looking transactions with identical content', () => {
    const first = transaction();
    const duplicate = transaction();

    expect(mergeStreamTransactions([first], [duplicate])).toEqual([first, duplicate]);
  });

  it('appends realtime transactions in received order', () => {
    const existing = transaction({ memo: 'existing' });
    const firstRealtime = transaction({ memo: 'first realtime' });
    const secondRealtime = transaction({ memo: 'second realtime' });

    const afterFirst = mergeStreamTransactions([existing], [firstRealtime]);
    const afterSecond = mergeStreamTransactions(afterFirst, [secondRealtime]);

    expect(afterSecond.map(({ memo }) => memo)).toEqual(['existing', 'first realtime', 'second realtime']);
  });
});

describe('mergeHistoricalStreamTransactions', () => {
  it('does not re-add already loaded transactions with the same blockchain signature', () => {
    const loaded = transaction({ signature: 'same-chain-transaction', memo: 'loaded' });
    const refetched = transaction({ signature: 'same-chain-transaction', memo: 'refetched' });
    const fresh = transaction({ signature: 'fresh-chain-transaction', memo: 'fresh' });

    expect(mergeHistoricalStreamTransactions([loaded], [refetched, fresh])).toEqual([loaded, fresh]);
  });

  it('preserves duplicate-looking historical transactions when no blockchain identity is available', () => {
    const first = transaction();
    const duplicate = transaction();

    expect(mergeHistoricalStreamTransactions([first], [duplicate])).toEqual([first, duplicate]);
  });
});

describe('sortTransactionsByTimeStable', () => {
  it('orders historical transactions by time while preserving equal-time input order', () => {
    const later = transaction({ time: 300, memo: 'later' });
    const equalFirst = transaction({ time: 100, memo: 'equal first' });
    const middle = transaction({ time: 200, memo: 'middle' });
    const equalSecond = transaction({ time: 100, memo: 'equal second' });

    expect(sortTransactionsByTimeStable([later, equalFirst, middle, equalSecond]).map(({ memo }) => memo)).toEqual([
      'equal first',
      'equal second',
      'middle',
      'later',
    ]);
  });
});

describe('advancePlaybackIndex', () => {
  it('advances over every transaction entry, including duplicate-looking entries', () => {
    const first = transaction();
    const duplicate = transaction();
    const transactions = mergeStreamTransactions([first], [duplicate]);

    let playbackIndex = 0;
    playbackIndex = advancePlaybackIndex(playbackIndex, transactions.length);
    playbackIndex = advancePlaybackIndex(playbackIndex, transactions.length);

    expect(playbackIndex).toBe(2);
  });
});

describe('playbackIndexForElapsedTime', () => {
  it('selects the transaction frame synced to transaction time', () => {
    const transactions = [
      transaction({ time: 100, memo: 'first' }),
      transaction({ time: 105, memo: 'second' }),
      transaction({ time: 120, memo: 'third' }),
    ];

    expect(playbackIndexForElapsedTime(transactions, 0)).toBe(0);
    expect(playbackIndexForElapsedTime(transactions, 5)).toBe(1);
    expect(playbackIndexForElapsedTime(transactions, 20)).toBe(2);
  });

  it('exposes one current playback transaction at a time', () => {
    const transactions = [
      transaction({ time: 100, memo: 'first' }),
      transaction({ time: 105, memo: 'second' }),
    ];

    expect(currentPlaybackTransaction(transactions, 0)?.memo).toBe('first');
    expect(currentPlaybackTransaction(transactions, 1)?.memo).toBe('second');
    expect(currentPlaybackTransaction(transactions, 10)?.memo).toBe('second');
  });

  it('reports completion only after the final transaction time is reached', () => {
    const transactions = [
      transaction({ time: 100, memo: 'first' }),
      transaction({ time: 105, memo: 'second' }),
    ];

    expect(hasPlaybackReachedEnd(transactions, 1, 4)).toBe(false);
    expect(hasPlaybackReachedEnd(transactions, 1, 5)).toBe(true);
  });
});
