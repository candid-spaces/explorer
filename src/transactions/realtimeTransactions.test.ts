import { describe, expect, it } from 'vitest';
import { normalizeEndpoint } from './publicKeyTransactions';
import { realtimeCloseError, realtimeTransactionsFromMessage } from './realtimeTransactions';
import { transactionsToDslSource } from './transactionDsl';

function realtimeMessage(data: unknown): MessageEvent<string> {
  return new MessageEvent('message', { data: JSON.stringify(data) });
}

describe('normalizeEndpoint', () => {
  it('normalizes HTTP and protocol-less endpoints to WebSocket endpoints', () => {
    expect(normalizeEndpoint('wss://example.test/path')).toBe('wss://example.test/path');
    expect(normalizeEndpoint('https://example.test/path')).toBe('wss://example.test/path');
    expect(normalizeEndpoint('example.test/path')).toBe('wss://example.test/path');
  });
});

describe('realtimeTransactionsFromMessage', () => {
  it('emits only outgoing matching push transactions', () => {
    const transactions = realtimeTransactionsFromMessage(realtimeMessage({
      type: 'push_transaction',
      body: {
        transaction: {
          time: 3,
          from: 'secondary-key',
          to: 'recipient',
          amount: 3,
          fee: 0,
          memo: 'outgoing',
        },
      },
    }), 'secondary-key');

    expect(transactions.map((transaction) => transaction.memo)).toEqual(['outgoing']);
    expect(realtimeTransactionsFromMessage(realtimeMessage({
      type: 'push_transaction',
      body: { transaction: { ...transactions[0], from: undefined } },
    }), 'secondary-key')).toEqual([]);
  });

  it('drains matching transactions from filter blocks and preserves normalization diagnostics', () => {
    const transactions = realtimeTransactionsFromMessage(realtimeMessage({
      type: 'filter_block',
      body: {
        transactions: [
          {
            time: 1,
            from: 'secondary-key',
            to: '+2+4/+6+6/+4+300000000000000000000000000000000=',
            amount: 1,
            fee: 0,
            memo: 'geometry: box',
          },
          {
            time: 2,
            from: 'secondary-key',
            to: '+2+4/+6+6/not-a-coordinate',
            amount: 1,
            fee: 0,
            memo: 'geometry: sphere',
          },
        ],
      },
    }), 'secondary-key');

    expect(transactions).toHaveLength(2);
    expect(transactionsToDslSource([transactions[0]], { publicKey: 'secondary-key' }).source)
      .toBe('"+2+4/+6+6/+4+3" : "geometry: box"');
    expect(transactionsToDslSource([transactions[1]], { publicKey: 'secondary-key' }).rejected).toHaveLength(1);
  });
});

describe('realtimeCloseError', () => {
  it('includes close diagnostics while reconnecting', () => {
    const event = Object.assign(new Event('close'), {
      code: 1006,
      reason: 'network reset',
      wasClean: false,
    }) as CloseEvent;

    expect(realtimeCloseError(event).message)
      .toBe('Realtime transaction endpoint closed (code 1006, reason: network reset, unclean close). Reconnecting...');
  });
});
