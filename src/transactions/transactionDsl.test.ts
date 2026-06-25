import { describe, expect, it } from 'vitest';
import { transactionsToDslSource, trimTransactionMemoFiller, trimTransactionPathFiller } from './transactionDsl';
import type { DslTransaction } from './types';

function transaction(memo: string, index = 0, to = `+${index}+1/+0+1/+0+1`, from?: string): DslTransaction {
  return {
    time: 100 + index,
    from,
    to,
    amount: 1,
    fee: 0,
    memo,
  };
}

describe('transactionsToDslSource', () => {
  it('builds valid XYZ coordinate declarations from transaction path and memo properties', () => {
    const result = transactionsToDslSource([
      transaction('geometry: box', 0, '+0+1/+0+1/+0+1'),
    ]);

    expect(result.source).toBe('"+0+1/+0+1/+0+1" : "geometry: box"');
    expect(result.rejected).toEqual([]);
  });

  it('accepts namespaces and declaration-only namespaces from transaction paths', () => {
    const result = transactionsToDslSource([
      transaction('color: red', 0, 'Room/'),
      transaction('', 1, 'Room/Chair/+0+1/+0+1/+0+1'),
    ]);

    expect(result.source).toContain('"Room/" : "color: red"');
    expect(result.source).toContain('"Room/Chair/+0+1/+0+1/+0+1" : ""');
    expect(result.rejected).toEqual([]);
  });

  it('accepts plain-text memos as text content declarations', () => {
    const result = transactionsToDslSource([
      transaction('Hello from a memo', 0, '+0+4/+0+2/+0+1'),
    ]);

    expect(result.source).toBe('"+0+4/+0+2/+0+1" : "content-kind: text; content-text-uri: Hello%20from%20a%20memo"');
    expect(result.rejected).toEqual([]);
  });

  it('accepts plain URL memos as URL content declarations', () => {
    const result = transactionsToDslSource([
      transaction('https://example.com/view?x=1', 0, '+0+4/+0+2/+0+1'),
    ]);

    expect(result.source).toBe('"+0+4/+0+2/+0+1" : "content-kind: url; content-url-uri: https%3A%2F%2Fexample.com%2Fview%3Fx%3D1"');
    expect(result.rejected).toEqual([]);
  });

  it('treats non-http URL-like memos as text content', () => {
    const result = transactionsToDslSource([
      transaction('javascript:alert(1)', 0, '+0+4/+0+2/+0+1'),
    ]);

    expect(result.source).toBe('"+0+4/+0+2/+0+1" : "content-kind: text; content-text-uri: javascript%3Aalert(1)"');
    expect(result.rejected).toEqual([]);
  });

  it('does not accept full DSL declarations embedded directly in memo text', () => {
    const result = transactionsToDslSource([
      transaction('"+0+1/+0+1/+0+1" : "geometry: box"', 0, 'not-a-valid-dsl-path'),
    ]);

    expect(result.source).toBe('');
    expect(result.rejected).toHaveLength(1);
  });

  it('rejects malformed transaction paths', () => {
    const result = transactionsToDslSource([
      transaction('geometry: box', 0, '+0+1/+0+1'),
    ]);

    expect(result.source).toBe('');
    expect(result.rejected).toHaveLength(1);
  });

  it('trims filler from transaction to paths before parsing', () => {
    const result = transactionsToDslSource([
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

  it('maps only outgoing transactions when a public key is provided', () => {
    const result = transactionsToDslSource([
      transaction('color: red', 1, '+0+1/+0+1/+0+1', 'sender-key'),
      transaction('color: blue', 2, '+1+1/+0+1/+0+1', 'other-key'),
    ], { publicKey: 'sender-key' });

    expect(result.source).toBe('"+0+1/+0+1/+0+1" : "color: red"');
    expect(result.rejected).toEqual([]);
  });

  it('ignores incoming transactions sent to the public key', () => {
    const result = transactionsToDslSource([
      transaction('color: red', 1, 'sender-key', 'other-key'),
    ], { publicKey: 'sender-key' });

    expect(result.source).toBe('');
    expect(result.rejected).toEqual([]);
  });

  it('ignores transactions missing a sender when a public key is provided', () => {
    const result = transactionsToDslSource([
      transaction('color: red', 1, '+0+1/+0+1/+0+1'),
    ], { publicKey: 'sender-key' });

    expect(result.source).toBe('');
    expect(result.rejected).toEqual([]);
  });

  it('preserves transaction order for accepted transactions', () => {
    const result = transactionsToDslSource([
      transaction('color: red', 1, '+0+1/+0+1/+0+1'),
      transaction('color: blue', 2, '+1+1/+0+1/+0+1'),
    ]);

    expect(result.source).toBe('"+0+1/+0+1/+0+1" : "color: red"\n"+1+1/+0+1/+0+1" : "color: blue"');
  });
});
