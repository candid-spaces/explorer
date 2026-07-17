import { describe, expect, it } from 'vitest';
import { transactionSummary } from './DslDrawer';

describe('transactionSummary', () => {
  it('does not display terminal path filler', () => {
    expect(transactionSummary({
      time: 100,
      from: 'sender',
      to: '+2+4/+6+6/+4+300000000000000000000000000000000=',
      amount: 1,
      fee: 0,
      memo: ' geometry: box ',
    })).toBe('from sender · to +2+4/+6+6/+4+3 · memo geometry: box');
  });
});
