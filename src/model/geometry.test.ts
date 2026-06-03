import { describe, expect, it } from 'vitest';
import type { DslBoxSpec, DslGeometrySpec } from '../dsl/types';
import { geometryFromBox } from './geometry';

const box: DslBoxSpec = {
  source: '+2+4/+7+6/+0+01',
  x: 2,
  y: 7,
  z: 0,
  width: 4,
  height: 6,
  depth: 0.1,
};

function spec(kind: DslGeometrySpec['kind']): DslGeometrySpec {
  return { kind, diagnostics: [] };
}

describe('geometryFromBox', () => {
  it('derives center position and dimensions from the layout bounding box', () => {
    expect(geometryFromBox(box, spec('cone'))).toEqual({
      kind: 'cone',
      position: [4, 10, 0.05],
      dimensions: [4, 6, 0.1],
    });
  });

  it('preserves primitive kinds while using the same bounding-box layout contract', () => {
    expect(geometryFromBox(box, spec('box')).kind).toBe('box');
    expect(geometryFromBox(box, spec('cylinder')).kind).toBe('cylinder');
    expect(geometryFromBox(box, spec('sphere')).kind).toBe('sphere');
  });
});
