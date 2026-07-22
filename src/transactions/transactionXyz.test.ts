import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SECONDARY_TRANSACTION_ENDPOINT,
  normalizeXyzTransaction,
  normalizeXyzTransactions,
  transactionToXyzCursorSource,
  transactionsToXyzSource,
  trimTransactionMemoFiller,
  trimTransactionPathFiller,
} from './transactionXyz';
import type { XyzTransaction } from './types';

function transaction(memo: string, index = 0, to = `+${index}+1/+0+1/+0+1`, from?: string): XyzTransaction {
  return {
    time: 100 + index,
    from,
    to,
    amount: 1,
    fee: 0,
    memo,
  };
}

describe('transactionsToXyzSource', () => {
  it('maps the current originating-key transaction into a secondary-chain cursor declaration', () => {
    const cursor = transactionToXyzCursorSource(
      transaction('color: cyan', 0, '+4+1/+2+1/+0+1', 'originating-key'),
      'originating-key',
    );

    expect(cursor).toBe('"+4+1/+2+1/+0+1" : "color: cyan"');
    expect(transactionToXyzCursorSource(
      transaction('color: cyan', 0, '+4+1/+2+1/+0+1', 'another-key'),
      'originating-key',
    )).toBe('');
  });

  it('builds valid XYZ coordinate declarations from transaction path and memo properties', () => {
    const result = transactionsToXyzSource([
      transaction('geometry: box', 0, '+0+1/+0+1/+0+1'),
    ]);

    expect(result.source).toBe('"+0+1/+0+1/+0+1" : "geometry: box"');
    expect(result.rejected).toEqual([]);
  });

  it('accepts namespaces and namespace declarations from transaction paths', () => {
    const result = transactionsToXyzSource([
      transaction('color: red', 0, 'Room/'),
      transaction('', 1, 'Room/Chair/+0+1/+0+1/+0+1'),
    ]);

    expect(result.source).toContain('"Room/" : "color: red"');
    expect(result.source).toContain('"Room/Chair/+0+1/+0+1/+0+1" : ""');
    expect(result.rejected).toEqual([]);
  });

  it('accepts plain-text memos as text content declarations', () => {
    const result = transactionsToXyzSource([
      transaction('Hello from a memo', 0, '+0+4/+0+2/+0+1'),
    ]);

    expect(result.source).toBe('"+0+4/+0+2/+0+1" : "content-kind: text; content-text-uri: Hello%20from%20a%20memo"');
    expect(result.rejected).toEqual([]);
  });

  it('accepts plain URL memos as URL content declarations', () => {
    const result = transactionsToXyzSource([
      transaction('https://example.com/view?x=1', 0, '+0+4/+0+2/+0+1'),
    ]);

    expect(result.source).toBe('"+0+4/+0+2/+0+1" : "content-kind: url; content-url-uri: https%3A%2F%2Fexample.com%2Fview%3Fx%3D1"');
    expect(result.rejected).toEqual([]);
  });

  it('treats non-http URL-like memos as text content', () => {
    const result = transactionsToXyzSource([
      transaction('javascript:alert(1)', 0, '+0+4/+0+2/+0+1'),
    ]);

    expect(result.source).toBe('"+0+4/+0+2/+0+1" : "content-kind: text; content-text-uri: javascript%3Aalert(1)"');
    expect(result.rejected).toEqual([]);
  });

  it('does not accept full spatial declarations embedded directly in memo text', () => {
    const result = transactionsToXyzSource([
      transaction('"+0+1/+0+1/+0+1" : "geometry: box"', 0, 'not-a-valid-xyz-path'),
    ]);

    expect(result.source).toBe('');
    expect(result.rejected).toHaveLength(1);
  });

  it('rejects malformed transaction paths', () => {
    const result = transactionsToXyzSource([
      transaction('geometry: box', 0, '+0+1/+0+1'),
    ]);

    expect(result.source).toBe('');
    expect(result.rejected).toHaveLength(1);
  });

  it('trims filler from transaction to paths before parsing', () => {
    const result = transactionsToXyzSource([
      transaction('geometry: sphere; color: blue;', 0, '+2+6/+0+6/+1+13/000000000000000000000000000='),
    ]);

    expect(result.source).toBe('"+2+6/+0+6/+1+13" : "geometry: sphere; color: blue;"');
    expect(result.rejected).toEqual([]);
  });

  it('trims whitespace around memo properties', () => {
    expect(trimTransactionMemoFiller('  geometry: box  ')).toBe('geometry: box');
  });

  it('trims filler from transaction to paths', () => {
    expect(trimTransactionPathFiller('+2+6/+0+6/+1+13/000000000=')).toBe('+2+6/+0+6/+1+13');
  });

  it.each([
    ['+2+4/+6+6/+4+300000000000000000000000000000000=', '+2+4/+6+6/+4+3'],
    ['+2+4/+6+6/+4+300', '+2+4/+6+6/+4+300'],
    ['+2+4/+6+6/+4+3=', '+2+4/+6+6/+4+3'],
  ])('trims only terminal axis-size filler: %s', (path, expected) => {
    expect(trimTransactionPathFiller(path)).toBe(expected);
  });

  it('uses a trimmed terminal axis size when building a spatial declaration', () => {
    const result = transactionsToXyzSource([
      transaction('geometry: box', 0, '+2+4/+6+6/+4+300000000000000000000000000000000='),
    ]);

    expect(result.source).toBe('"+2+4/+6+6/+4+3" : "geometry: box"');
    expect(result.rejected).toEqual([]);
  });

  it.each([
    ['/000', '+2+6/+0+6/+1+13'],
    ['/000=', '+2+6/+0+6/+1+13'],
    ['/000000000=', '+2+6/+0+6/+1+13'],
    ['/=', '+2+6/+0+6/+1+13'],
  ])('trims trailing path filler suffix %s', (suffix, expected) => {
    expect(trimTransactionPathFiller(`+2+6/+0+6/+1+13${suffix}`)).toBe(expected);
  });

  it('preserves ordinary namespace terminators when trimming transaction paths', () => {
    expect(trimTransactionPathFiller('Room/')).toBe('Room/');
  });

  it('does not strip non-filler path text', () => {
    expect(trimTransactionPathFiller('Room/Chair')).toBe('Room/Chair');
  });

  it('normalizes transaction paths before transactions are stored at rest', () => {
    expect(normalizeXyzTransaction(transaction('geometry: box', 0, '+2+6/+0+6/+1+13/000000000='))).toMatchObject({
      memo: 'geometry: box',
      to: '+2+6/+0+6/+1+13',
    });
  });

  it('normalizes transaction collections used by historical secondary streams', () => {
    expect(normalizeXyzTransactions([
      transaction('geometry: box', 0, '+2+4/+6+6/+4+300000000000000000000000000000000='),
    ])).toMatchObject([
      { to: '+2+4/+6+6/+4+3' },
    ]);
  });

  it('preserves Base64 secondary-key destinations that resemble terminal axis filler', () => {
    const secondaryPublicKey = `${'A'.repeat(38)}+1+10=`;
    const transactions = normalizeXyzTransactions([
      transaction('node: wss://secondary.example/ws', 0, secondaryPublicKey),
    ]);
    const result = transactionsToXyzSource(transactions, { endpoint: 'wss://primary.example/ws' });

    expect(transactions[0]?.to).toBe(secondaryPublicKey);
    expect(result.secondaryKeys).toEqual([
      expect.objectContaining({
        publicKey: secondaryPublicKey,
        endpoint: 'wss://secondary.example/ws',
      }),
    ]);
  });

  it('preserves text memo content ending with equals padding characters', () => {
    const result = transactionsToXyzSource([
      transaction('token==', 0, '+0+4/+0+2/+0+1'),
    ]);

    expect(result.source).toBe('"+0+4/+0+2/+0+1" : "content-kind: text; content-text-uri: token%3D%3D"');
    expect(result.rejected).toEqual([]);
  });

  it('preserves URL memo content containing query-string equals characters', () => {
    const result = transactionsToXyzSource([
      transaction('https://example.com/view?token=abc==', 0, '+0+4/+0+2/+0+1'),
    ]);

    expect(result.source).toBe('"+0+4/+0+2/+0+1" : "content-kind: url; content-url-uri: https%3A%2F%2Fexample.com%2Fview%3Ftoken%3Dabc%3D%3D"');
    expect(result.rejected).toEqual([]);
  });

  it('maps only outgoing transactions when a public key is provided', () => {
    const result = transactionsToXyzSource([
      transaction('color: red', 1, '+0+1/+0+1/+0+1', 'sender-key'),
      transaction('color: blue', 2, '+1+1/+0+1/+0+1', 'other-key'),
    ], { publicKey: 'sender-key' });

    expect(result.source).toBe('"+0+1/+0+1/+0+1" : "color: red"');
    expect(result.rejected).toEqual([]);
  });

  it('ignores incoming transactions sent to the public key', () => {
    const result = transactionsToXyzSource([
      transaction('color: red', 1, 'sender-key', 'other-key'),
    ], { publicKey: 'sender-key' });

    expect(result.source).toBe('');
    expect(result.rejected).toEqual([]);
  });

  it('ignores transactions missing a sender when a public key is provided', () => {
    const result = transactionsToXyzSource([
      transaction('color: red', 1, '+0+1/+0+1/+0+1'),
    ], { publicKey: 'sender-key' });

    expect(result.source).toBe('');
    expect(result.rejected).toEqual([]);
  });

  it('returns secondary-key references from invalid paths with node memo properties', () => {
    const secondaryPublicKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const result = transactionsToXyzSource([
      transaction(`node: wss://secondary.example/ws`, 3, secondaryPublicKey),
    ], { endpoint: 'wss://primary.example/ws' });

    expect(result.source).toBe('');
    expect(result.rejected).toEqual([]);
    expect(result.secondaryKeys).toEqual([
      {
        publicKey: secondaryPublicKey,
        endpoint: 'wss://secondary.example/ws',
        endpointSource: 'node-url-address',
        sourceTransactionId: `103:${secondaryPublicKey}:none:0`,
        memoPreview: `${secondaryPublicKey}: node: wss://secondary.example/ws`,
      },
    ]);
  });

  it('uses the default secondary endpoint for secondary-key references without a node memo property', () => {
    const secondaryPublicKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const result = transactionsToXyzSource([
      transaction(secondaryPublicKey, 4, 'secondary-key-reference'),
    ], { endpoint: 'wss://primary.example/ws' });

    expect(result.source).toBe('');
    expect(result.rejected).toEqual([]);
    expect(result.secondaryKeys).toEqual([
      expect.objectContaining({
        publicKey: secondaryPublicKey,
        endpoint: DEFAULT_SECONDARY_TRANSACTION_ENDPOINT,
        endpointSource: 'default-secondary',
      }),
    ]);
  });

  it('uses the default secondary endpoint for empty node memo properties', () => {
    const secondaryPublicKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const result = transactionsToXyzSource([
      transaction('node:   ', 5, secondaryPublicKey),
    ], { endpoint: 'wss://primary.example/ws' });

    expect(result.secondaryKeys).toEqual([
      expect.objectContaining({
        publicKey: secondaryPublicKey,
        endpoint: DEFAULT_SECONDARY_TRANSACTION_ENDPOINT,
        endpointSource: 'default-secondary',
      }),
    ]);
  });

  it('extracts secondary public keys from untrimmed destinations before path filler cleanup', () => {
    const secondaryPublicKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/0=';
    const result = transactionsToXyzSource([
      transaction('node: wss://secondary.example/ws', 6, secondaryPublicKey),
    ], { endpoint: 'wss://primary.example/ws' });

    expect(result.source).toBe('');
    expect(result.rejected).toEqual([]);
    expect(result.secondaryKeys).toEqual([
      expect.objectContaining({
        publicKey: secondaryPublicKey,
        endpoint: 'wss://secondary.example/ws',
        endpointSource: 'node-url-address',
      }),
    ]);
  });

  it('keeps content fallback for valid spatial paths with secondary-looking memo text', () => {
    const secondaryPublicKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const result = transactionsToXyzSource([
      transaction(secondaryPublicKey, 5, '+0+4/+0+2/+0+1'),
    ], { endpoint: 'wss://primary.example/ws' });

    expect(result.source).toBe('"+0+4/+0+2/+0+1" : "content-kind: text; content-text-uri: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA%3D"');
    expect(result.rejected).toEqual([]);
    expect(result.secondaryKeys).toEqual([]);
  });

  it('preserves transaction order for accepted transactions', () => {
    const result = transactionsToXyzSource([
      transaction('color: red', 1, '+0+1/+0+1/+0+1'),
      transaction('color: blue', 2, '+1+1/+0+1/+0+1'),
    ]);

    expect(result.source).toBe('"+0+1/+0+1/+0+1" : "color: red"\n"+1+1/+0+1/+0+1" : "color: blue"');
  });
});
