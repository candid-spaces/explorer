import { describe, expect, it } from 'vitest';
import { parseBoxSpec, parseCompactNumber, parseDslDocument } from './parser';

const EXAMPLE = `"+2+4/+0+6/+1+3" : "geometry: cylinder; color: 0x333333; metalness: 0.8; roughness: 0.2"
"+2+4/+7+6/+0+01" : "geometry: cone; color: yellow; metalness: 0.2; roughness: 0.5"
"+7+6/+0+15/+0+05" : "geometry: sphere; color: blue; metalness: 0.1; roughness: 0.2"`;

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

describe('parseDslDocument', () => {
  it('parses composed object declarations with geometry and material properties', () => {
    const result = parseDslDocument(EXAMPLE);

    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(3);
    expect(result.value?.[0].geometry.kind).toBe('cylinder');
    expect(result.value?.[1].geometry.kind).toBe('cone');
    expect(result.value?.[2].geometry.kind).toBe('sphere');
    expect(result.value?.[1].box?.depth).toBe(0.1);
    expect(result.value?.[2].box?.depth).toBe(0.5);
    expect(result.value?.[0].material.color).toBe(0x333333);
    expect(result.value?.[0].transform.rotation).toEqual([0, 0, 0]);
  });

  it('parses namespaced world-space instances and declaration-only namespaces', () => {
    const result = parseDslDocument(`"Sofa/+7+4/+0+3/+0+2" : "color: brown"
"Table/Leg/" : "geometry: cylinder"
"Table/Leg/+1+2/+0+7/+0+1" : ""`);

    expect(result.ok).toBe(true);
    expect(result.value?.[0].namespace).toEqual(['Sofa']);
    expect(result.value?.[0].declarationOnly).toBe(false);
    expect(result.value?.[0].box?.width).toBe(4);
    expect(result.value?.[1].namespace).toEqual(['Table', 'Leg']);
    expect(result.value?.[1].declarationOnly).toBe(true);
    expect(result.value?.[1].geometry.kind).toBe('cylinder');
    expect(result.value?.[2].namespace).toEqual(['Table', 'Leg']);
    expect(result.value?.[2].box?.height).toBe(7);
  });

  it('parses ref declarations and reports missing reference targets', () => {
    const result = parseDslDocument('"Seat/+3+5/+0+3/+0+15" : "ref: Sofa/"');

    expect(result.ok).toBe(true);
    expect(result.value?.[0].reference.targetPath).toBe('Sofa/');
  });

  it('rejects partial namespaced axis groups', () => {
    const result = parseDslDocument('"Table/+1+2/+0+3" : ""');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].message).toBe('Namespaced instance paths must end with exactly X/Y/Z axis segments.');
  });

  it('parses rotation declarations as XYZ degree triples converted to radians', () => {
    const result = parseDslDocument('\"+0+1/+0+2/+0+3\" : \"geometry: box; rotation: 0, 90, 180\"');

    expect(result.ok).toBe(true);
    expect(result.value?.[0].transform.rotation[0]).toBe(0);
    expect(result.value?.[0].transform.rotation[1]).toBeCloseTo(Math.PI / 2);
    expect(result.value?.[0].transform.rotation[2]).toBeCloseTo(Math.PI);
  });

  it('reports malformed rotation triples', () => {
    const result = parseDslDocument('\"+0+1/+0+2/+0+3\" : \"geometry: box; rotation: 0, nope, 0\"');

    expect(result.ok).toBe(false);
    expect(result.value?.[0].transform.rotation).toEqual([0, 0, 0]);
    expect(result.diagnostics[0].message).toBe('Rotation component \"nope\" must be numeric.');
  });

  it('parses box-radius as a box geometry modifier', () => {
    const result = parseDslDocument('"+0+4/+0+2/+0+3" : "box-radius: 0.15; color: orange"');

    expect(result.ok).toBe(true);
    expect(result.value?.[0].geometry.kind).toBe('box');
    expect(result.value?.[0].geometry['box-radius']).toBe(0.15);
    expect(result.value?.[0].geometry.declared).toBe(true);
  });

  it('reports invalid box-radius values', () => {
    const result = parseDslDocument('"+0+4/+0+2/+0+3" : "box-radius: nope"');

    expect(result.ok).toBe(false);
    expect(result.value?.[0].geometry['box-radius']).toBeUndefined();
    expect(result.diagnostics[0].message).toBe('box-radius must be numeric.');
  });

  it('reports box-radius on non-box geometry', () => {
    const result = parseDslDocument('"+0+4/+0+2/+0+3" : "geometry: sphere; box-radius: 0.15"');

    expect(result.ok).toBe(false);
    expect(result.value?.[0].geometry.kind).toBe('sphere');
    expect(result.value?.[0].geometry['box-radius']).toBeUndefined();
    expect(result.diagnostics[0].message).toBe('box-radius only applies to box geometry.');
  });

  it('defaults to box geometry when geometry is omitted', () => {
    const result = parseDslDocument('"+0+1/+0+2/+0+3" : "color: red"');

    expect(result.ok).toBe(true);
    expect(result.value?.[0].geometry.kind).toBe('box');
  });

  it('falls back to box geometry and reports unsupported geometry values', () => {
    const result = parseDslDocument('"+0+1/+0+2/+0+3" : "geometry: torus; color: red"');

    expect(result.ok).toBe(false);
    expect(result.value?.[0].geometry.kind).toBe('box');
    expect(result.diagnostics[0].message).toContain('Unsupported geometry "torus"');
  });

  it('reports unsupported non-material and non-geometry properties once', () => {
    const result = parseDslDocument('"+0+1/+0+2/+0+3" : "foo: bar; geometry: box"');

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].message).toBe('Ignoring unsupported object property "foo".');
  });
});
