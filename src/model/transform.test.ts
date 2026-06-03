import { describe, expect, it } from 'vitest';
import type { DslBoxSpec } from '../dsl/types';
import { degreesToRadians, transformFromBox } from './transform';

const box: DslBoxSpec = {
  source: '+2+4/+7+6/+1+3',
  x: 2,
  y: 7,
  z: 1,
  width: 4,
  height: 6,
  depth: 3,
};

describe('transformFromBox', () => {
  it('derives center position and scale from an edge-based bounding box', () => {
    expect(transformFromBox(box, { rotation: [0, degreesToRadians(90), 0], diagnostics: [] })).toEqual({
      position: [4, 10, 2.5],
      rotation: [0, Math.PI / 2, 0],
      scale: [4, 6, 3],
      pivot: [0, 0, 0],
    });
  });
});
