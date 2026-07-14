import { describe, expect, it } from 'vitest';
import type { SpatialTransform } from '../model/transform';
import { degreesToRadians } from '../model/transform';
import { selectedObjectPovFromTransform } from './SelectedObjectPovCamera';

describe('selectedObjectPovFromTransform', () => {
  it('places the camera just in front of an unrotated selected object', () => {
    const transform = {
      position: [10, 2, 6],
      rotation: [0, 0, 0],
      scale: [2, 4, 8],
      pivot: [0, 0, 0],
    } satisfies SpatialTransform;

    expect(selectedObjectPovFromTransform(transform)).toEqual({
      position: [10, 2, 1.75],
      rotation: [0, 0, 0],
    });
  });

  it('uses the selected object rotation as the camera view direction', () => {
    const transform = {
      position: [0, 0, 0],
      rotation: [0, degreesToRadians(90), 0],
      scale: [2, 2, 2],
      pivot: [0, 0, 0],
    } satisfies SpatialTransform;

    const pov = selectedObjectPovFromTransform(transform, 0);

    expect(pov.position[0]).toBeCloseTo(-1);
    expect(pov.position[1]).toBeCloseTo(0);
    expect(pov.position[2]).toBeCloseTo(0);
    expect(pov.rotation).toEqual([0, Math.PI / 2, 0]);
  });
});
