import { describe, expect, it } from 'vitest';
import { parseBoxSpec, parseCompactNumber, parseDslDocument, parseSelector } from './parser';

const EXAMPLE = `"+2+4/+0+6/+1+3" : "color: 0x333333; metalness: 0.8; roughness: 0.2"
"+2+4/+7+6/+0+01" : "color: yellow; metalness: 0.2; roughness: 0.5"
"+7+6/+0+15/+0+05" : "color: blue; metalness: 0.1; roughness: 0.2"`;

describe('parseCompactNumber', () => {
  it('parses integers and compact leading-zero decimals', () => {
    expect(parseCompactNumber('2')).toBe(2);
    expect(parseCompactNumber('15')).toBe(15);
    expect(parseCompactNumber('01')).toBe(0.1);
    expect(parseCompactNumber('001')).toBe(0.01);
    expect(parseCompactNumber('05')).toBe(0.5);
  });
});

describe('parseBoxSpec', () => {
  it('maps X/Y/Z axis segments to cuboid offsets and sizes', () => {
    expect(parseBoxSpec('+2+4/+0+6/+1+3')).toEqual({
      source: '+2+4/+0+6/+1+3',
      x: 2,
      y: 0,
      z: 1,
      width: 4,
      height: 6,
      depth: 3,
    });
  });
});

describe('parseSelector', () => {
  it('splits namespace path segments from trailing axis specs', () => {
    expect(parseSelector('Table/Top/+1+6/+0+5/+0+6')).toMatchObject({
      pathSegments: ['Table', 'Top'],
      namespacePath: 'Table/Top',
      box: { x: 1, y: 0, z: 0, width: 6, height: 5, depth: 6 },
    });
  });
});

describe('parseDslDocument', () => {
  it('parses composed object declarations', () => {
    const result = parseDslDocument(EXAMPLE);

    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(3);
    expect(result.value?.[1].box.depth).toBe(0.1);
    expect(result.value?.[2].box.depth).toBe(0.5);
    expect(result.value?.[0].material.color).toBe(0x333333);
  });

  it('parses top-level names, directives, and nested declaration depth', () => {
    const result = parseDslDocument(`-"Sofa/+7+4/+0+3/+0+2": "import: Sofa.gltf;"
-"Referential/+3+5/+0+3/+0+15": "ref: Sofa/;"
--"Referential/Handle/+0+1/+0+1/+0+1": "color: yellow;"`);

    expect(result.ok).toBe(true);
    expect(result.value?.[0]).toMatchObject({ namespacePath: 'Sofa', directives: { import: 'Sofa.gltf' }, depth: 0 });
    expect(result.value?.[1]).toMatchObject({ namespacePath: 'Referential', directives: { ref: 'Sofa' }, depth: 0 });
    expect(result.value?.[2]).toMatchObject({ namespacePath: 'Referential/Handle', depth: 1 });
  });
});
