import { describe, expect, it } from 'vitest';
import { parseDslDocument } from '../dsl/parser';
import { namespaceFromTransactionPath, transactionsToDsl } from './transactionsToDsl';


describe('transactionsToDsl', () => {
  it('maps slash-delimited transaction recipients into DSL namespaces', () => {
    const namespace = namespaceFromTransactionPath('/Building/Floor/Room0000====', 0);

    expect(namespace).toEqual(['Building', 'Floor', 'Room0000']);
  });

  it('emits parseable declaration and concrete transaction DSL with metadata', () => {
    const bundle = transactionsToDsl(
      [
        {
          to: '/Building/Floor/Room',
          from: 'sender',
          amount: 250,
          memo: 'lease',
          time: 123,
        },
      ],
      'receiver',
    );

    const parsed = parseDslDocument(bundle.source);

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.value?.map((object) => object.namespace)).toEqual([
      ['Building'],
      ['Building', 'Floor'],
      ['Building', 'Floor', 'Room'],
      ['Building', 'Floor', 'Room'],
    ]);
    expect(bundle.metadataByNamespace['Building/Floor/Room/']).toMatchObject({
      publicKey: 'receiver',
      amount: 250,
      memo: 'lease',
    });
  });
});
