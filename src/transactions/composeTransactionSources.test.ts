import { describe, expect, it } from 'vitest';
import { composeTransactionSources } from './composeTransactionSources';

describe('composeTransactionSources', () => {
  const primary = '"Table/" : "color: white"\n"Table/+0+1/+0+1/+0+1" : ""';

  it('keeps primary DSL first so secondary declarations can reference base objects', () => {
    const result = composeTransactionSources(primary, [
      { declarations: '"+1+1/+0+1/+0+1" : "ref: Table/"' },
    ]);

    expect(result).toBe(`${primary}\n"+1+1/+0+1/+0+1" : "ref: Table/"`);
  });

  it('namespaces conflicting secondary namespace declarations by deterministic stream order', () => {
    const result = composeTransactionSources(primary, [
      { declarations: '"Table/" : "color: red"\n"Table/Leaf/+0+1/+0+1/+0+1" : ""' },
      { declarations: '"Table/" : "color: blue"' },
    ]);

    expect(result).toBe([
      primary,
      '"Overlay01/Table/" : "color: red"',
      '"Overlay01/Table/Leaf/+0+1/+0+1/+0+1" : ""',
      '"Overlay02/Table/" : "color: blue"',
    ].join('\n'));
  });

  it('supports playback cursors per secondary stream', () => {
    const result = composeTransactionSources('', [
      { declarations: '"+0+1/+0+1/+0+1" : ""\n"+1+1/+0+1/+0+1" : ""', playbackCursor: 1 },
    ]);

    expect(result).toBe('"+0+1/+0+1/+0+1" : ""');
  });
});
