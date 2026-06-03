import type { DslBoxSpec, DslTransformSpec } from '../dsl/types';

export interface SpatialTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  pivot: [number, number, number];
}

export const IDENTITY_ROTATION: [number, number, number] = [0, 0, 0];
export const CENTER_PIVOT: [number, number, number] = [0, 0, 0];

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function transformFromBox(box: DslBoxSpec, spec: DslTransformSpec): SpatialTransform {
  return {
    position: [box.x + box.width / 2, box.y + box.height / 2, box.z + box.depth / 2],
    rotation: spec.rotation,
    scale: [box.width, box.height, box.depth],
    pivot: CENTER_PIVOT,
  };
}

export function identityTransform(): SpatialTransform {
  return {
    position: [0, 0, 0],
    rotation: IDENTITY_ROTATION,
    scale: [1, 1, 1],
    pivot: CENTER_PIVOT,
  };
}

export function composeTransforms(parent: SpatialTransform, child: SpatialTransform): SpatialTransform {
  return {
    position: [
      parent.position[0] + child.position[0],
      parent.position[1] + child.position[1],
      parent.position[2] + child.position[2],
    ],
    rotation: [
      parent.rotation[0] + child.rotation[0],
      parent.rotation[1] + child.rotation[1],
      parent.rotation[2] + child.rotation[2],
    ],
    scale: [parent.scale[0] * child.scale[0], parent.scale[1] * child.scale[1], parent.scale[2] * child.scale[2]],
    pivot: child.pivot,
  };
}
