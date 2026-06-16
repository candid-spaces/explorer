import { describe, expect, it } from 'vitest';
import { transactionsToDslSource, trimTransactionMemoFiller } from './transactionDsl';
import type { DslTransaction } from './types';

function transaction(memo: string, index = 0): DslTransaction {
  return {
    time: 100 + index,
    to: `key-${index}`,
    amount: 1,
    fee: 0,
    memo,
  };
}

describe('transactionsToDslSource', () => {
  it('accepts valid XYZ coordinate declarations', () => {
    const result = transactionsToDslSource([
      transaction('"+0+1/+0+1/+0+1" : "geometry: box"'),
    ]);

    expect(result.source).toBe('"+0+1/+0+1/+0+1" : "geometry: box"');
    expect(result.rejected).toEqual([]);
  });

  it('accepts namespaces and declaration-only namespaces', () => {
    const result = transactionsToDslSource([
      transaction('"Room/" : "color: red"\n"Room/Chair/+0+1/+0+1/+0+1" : ""'),
    ]);

    expect(result.source).toContain('"Room/" : "color: red"');
    expect(result.source).toContain('"Room/Chair/+0+1/+0+1/+0+1" : ""');
    expect(result.rejected).toEqual([]);
  });

  it('rejects malformed memos', () => {
    const result = transactionsToDslSource([
      transaction('not dsl'),
      transaction('"+0+1/+0+1" : "geometry: box"'),
    ]);

    expect(result.source).toBe('');
    expect(result.rejected).toHaveLength(2);
  });

  it('trims filler from a quoted DSL path before parsing', () => {
    const result = transactionsToDslSource([
      transaction('"+0+1/+0+1/+0+1/000000000=" : "geometry: sphere"'),
    ]);

    expect(result.source).toBe('"+0+1/+0+1/+0+1" : "geometry: sphere"');
    expect(result.rejected).toEqual([]);
  });

  it('trims filler at the end of memo text', () => {
    expect(trimTransactionMemoFiller('"+0+1/+0+1/+0+1" : ""/000=')).toBe('"+0+1/+0+1/+0+1" : ""');
  });

  it('preserves transaction order for accepted memos', () => {
    const result = transactionsToDslSource([
      transaction('"+0+1/+0+1/+0+1" : "color: red"', 1),
      transaction('"+1+1/+0+1/+0+1" : "color: blue"', 2),
    ]);

    expect(result.source).toBe('"+0+1/+0+1/+0+1" : "color: red"\n"+1+1/+0+1/+0+1" : "color: blue"');
  });
});
