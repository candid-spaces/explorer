import { describe, expect, it } from 'vitest';
import { mergeStreamTransactions } from './mergeStreamTransactions';
import type { DslTransaction } from './types';

function transaction(time: number, memo: string, nonce = 0): DslTransaction {
  return {
    time,
    nonce,
    from: 'secondary-key',
    to: '+0+1/+0+1/+0+1',
    amount: 0,
    fee: 0,
    memo,
    series: 1,
  };
}

describe('mergeStreamTransactions', () => {
  it('preserves duplicate-looking secondary transactions instead of deduplicating them', () => {
    const duplicate = transaction(10, 'color: red', 7);

    const result = mergeStreamTransactions([duplicate], [duplicate]);

    expect(result).toEqual([duplicate, duplicate]);
  });

  it('keeps equal-time realtime arrivals in received serial order', () => {
    const first = transaction(10, 'first');
    const second = transaction(10, 'second');
    const third = transaction(10, 'third');

    const result = mergeStreamTransactions(mergeStreamTransactions([first], [second]), [third]);

    expect(result.map(({ memo }) => memo)).toEqual(['first', 'second', 'third']);
  });

  it('keeps playback time-synced by ordering historical transactions by time', () => {
    const current = transaction(20, 'current');
    const earlier = transaction(5, 'earlier');
    const later = transaction(30, 'later');

    const result = mergeStreamTransactions([current], [later, earlier]);

    expect(result.map(({ memo }) => memo)).toEqual(['earlier', 'current', 'later']);
  });

  it('preserves source order for equal-time historical transactions', () => {
    const current = transaction(10, 'current');
    const firstHistorical = transaction(10, 'first historical');
    const secondHistorical = transaction(10, 'second historical');

    const result = mergeStreamTransactions([current], [firstHistorical, secondHistorical]);

    expect(result.map(({ memo }) => memo)).toEqual(['current', 'first historical', 'second historical']);
  });
});
