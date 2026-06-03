import type { DslBoxSpec, DslGeometrySpec } from '../dsl/types';

export interface SpatialGeometry {
  kind: DslGeometrySpec['kind'];
  dimensions: [number, number, number];
}

export function geometryFromBox(box: DslBoxSpec, spec: DslGeometrySpec): SpatialGeometry {
  return {
    kind: spec.kind,
    dimensions: [box.width, box.height, box.depth],
  };
}
