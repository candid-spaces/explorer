import { describe, expect, it } from 'vitest';
import { parseDslDocument } from '../dsl/parser';
import { parseTransactionDslPath, transactionsToDsl } from './transactionsToDsl';


describe('transactionsToDsl', () => {
  it('parses transaction recipients that end in DSL X/Y/Z coordinate segments', () => {
    const path = parseTransactionDslPath('/Building/Floor/Room/+0+2/+0+1/+4+3');

    expect(path?.namespace).toEqual(['Building', 'Floor', 'Room']);
    expect(path?.box?.source).toBe('+0+2/+0+1/+4+3');
  });

  it('ignores transaction recipients that do not end in DSL X/Y/Z coordinate segments', () => {
    const bundle = transactionsToDsl(
      [
        { to: '/Building/Floor/Room', amount: 250 },
        { to: '/Building/Floor/Room/+0+2/+0+1', amount: 250 },
        { to: '/Building/Floor/Room/+0+2/+0+1/+4+3', amount: 250 },
      ],
      'receiver',
    );

    const parsed = parseDslDocument(bundle.source);

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.value?.filter((object) => !object.declarationOnly)).toHaveLength(1);
    expect(bundle.metadataByNamespace['Building/Floor/Room/']).toMatchObject({
      publicKey: 'receiver',
      amount: 250,
    });
  });

  it('emits parseable declaration and concrete transaction DSL with metadata', () => {
    const bundle = transactionsToDsl(
      [
        {
          to: '/Building/Floor/Room/+0+2/+0+1/+4+3',
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
    expect(parsed.value?.at(-1)?.box?.source).toBe('+0+2/+0+1/+4+3');
    expect(bundle.metadataByNamespace['Building/Floor/Room/']).toMatchObject({
      publicKey: 'receiver',
      amount: 250,
      memo: 'lease',
    });
  });
});
