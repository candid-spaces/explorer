import { describe, expect, it } from 'vitest';
import { parseDslDocument } from '../dsl/parser';
import { parseTransactionDslPath, transactionsToDsl } from './transactionsToDsl';


describe('transactionsToDsl', () => {
  it('parses transaction recipients that end in DSL X/Y/Z coordinate segments', () => {
    const path = parseTransactionDslPath('/Building/Floor/Room/+0+2/+0+1/+4+3');

    expect(path?.namespace).toEqual(['Building', 'Floor', 'Room']);
    expect(path?.box?.source).toBe('+0+2/+0+1/+4+3');
  });

  it('truncates trailing filler data before parsing transaction recipients', () => {
    const path = parseTransactionDslPath('/Building/Floor/Room/+0+2/+0+1/+4+300000000=');

    expect(path?.namespace).toEqual(['Building', 'Floor', 'Room']);
    expect(path?.box?.source).toBe('+0+2/+0+1/+4+3');
  });

  it('allows namespace-only and declaration-only transaction recipients', () => {
    const bundle = transactionsToDsl(
      [
        { to: '/Building/Floor/Room', amount: 250 },
        { to: '/Building/Floor/Deck/', memo: 'declaration' },
        { to: '/Building/Floor/Padded00000000=', memo: 'padded' },
      ],
      'receiver',
    );

    const parsed = parseDslDocument(bundle.source);

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.value?.filter((object) => !object.declarationOnly)).toHaveLength(0);
    expect(parsed.value?.map((object) => object.namespace)).toEqual([
      ['Building'],
      ['Building', 'Floor'],
      ['Building', 'Floor', 'Room'],
      ['Building', 'Floor', 'Deck'],
      ['Building', 'Floor', 'Padded'],
    ]);
    expect(bundle.metadataByNamespace['Building/Floor/Room/']).toMatchObject({ amount: 250 });
    expect(bundle.metadataByNamespace['Building/Floor/Deck/']).toMatchObject({ memo: 'declaration' });
    expect(bundle.metadataByNamespace['Building/Floor/Padded/']).toMatchObject({ memo: 'padded' });
  });

  it('ignores malformed concrete transaction recipients with partial coordinates', () => {
    const bundle = transactionsToDsl(
      [
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
