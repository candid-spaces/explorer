import type { DslBoxSpec, DslGeometrySpec } from '../dsl/types';

export interface SpatialGeometry {
  kind: DslGeometrySpec['kind'];
  position: [number, number, number];
  dimensions: [number, number, number];
}

export function geometryFromBox(box: DslBoxSpec, spec: DslGeometrySpec): SpatialGeometry {
  return {
    kind: spec.kind,
    position: [box.x + box.width / 2, box.y + box.height / 2, box.z + box.depth / 2],
    dimensions: [box.width, box.height, box.depth],
  };
}
