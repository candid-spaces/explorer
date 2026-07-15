import { describe, expect, it } from 'vitest';
import { composeTransactionSources } from './composeTransactionSources';
import { secondaryTransactionsToAnimationEvents } from './secondaryTransactionDsl';
import type { DslTransaction } from './types';

function transaction(time: number, memo: string, to = 'Table/+0+2/+0+2/+0+2'): DslTransaction {
  return { time, to, from: 'secondary-key', amount: 1, fee: 0, memo };
}

describe('secondary transaction animation conversion', () => {
  it('converts update declarations into typed animation events without deduplication', () => {
    const tx = transaction(10, 'position: 2, 3, 4; size: 4, 2, 6; rotation: 0, 90, 0');
    const events = secondaryTransactionsToAnimationEvents([tx, tx]);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      kind: 'secondary-animation',
      targetPath: 'Table/+0+2/+0+2/+0+2',
      targetObjectId: 'Table/+0+2/+0+2/+0+2',
      position: [2, 3, 4],
      size: [4, 2, 6],
      rotation: [0, 90, 0],
      timestamp: 10,
    });
    expect(events[0].sourceTransactionId).not.toBe(events[1].sourceTransactionId);
  });

  it('applies secondary animation transactions serially to existing primary objects', () => {
    const primary = '"Table/+0+2/+0+2/+0+2" : "color: white"';
    const result = composeTransactionSources(primary, [{
      declarations: '',
      transactions: [
        transaction(1, 'position: 2, 2, 2'),
        transaction(2, 'size: 4, 4, 4; rotation: 0, 45, 0'),
      ],
    }]);

    expect(result).toBe('"+0+4/+0+4/+0+4" : "color: white; rotation: 0, 45, 0"');
  });

  it('supports replay by timestamp or transaction index', () => {
    const primary = '"Table/+0+2/+0+2/+0+2" : "color: white"';
    const transactions = [
      transaction(1, 'position: 2, 2, 2'),
      transaction(2, 'position: 4, 4, 4'),
    ];

    expect(composeTransactionSources(primary, [{ declarations: '', transactions }], { replayCursor: { timestamp: 1 } }))
      .toBe('"+1+2/+1+2/+1+2" : "color: white"');
    expect(composeTransactionSources(primary, [{ declarations: '', transactions }], { replayCursor: { transactionIndex: 0 } }))
      .toBe('"+1+2/+1+2/+1+2" : "color: white"');
  });

  it('ignores animation declarations that do not target existing primary objects', () => {
    const primary = '"Chair/+0+2/+0+2/+0+2" : "color: white"';

    expect(composeTransactionSources(primary, [{ declarations: '', transactions: [transaction(1, 'position: 2, 2, 2')] }]))
      .toBe(primary);
  });
});
