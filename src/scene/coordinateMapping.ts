import type { DslBoxSpec } from '../dsl/types';

export interface MeshTransform {
  position: [number, number, number];
  dimensions: [number, number, number];
}

export function boxToMeshTransform(box: DslBoxSpec): MeshTransform {
  return {
    position: [box.x + box.width / 2, box.y + box.height / 2, box.z + box.depth / 2],
    dimensions: [box.width, box.height, box.depth],
  };
}
