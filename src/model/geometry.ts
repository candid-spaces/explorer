import type { DslBoxSpec, DslCsgOperation, DslGeometrySpec } from '../dsl/types';

export interface SpatialGeometry {
  kind: DslGeometrySpec['kind'];
  dimensions: [number, number, number];
  'box-radius'?: number;
  puff?: number;
  operation?: DslCsgOperation;
}

export function geometryFromBox(box: DslBoxSpec, spec: DslGeometrySpec): SpatialGeometry {
  return {
    kind: spec.kind,
    dimensions: [box.width, box.height, box.depth],
    ...(spec['box-radius'] === undefined ? {} : { 'box-radius': spec['box-radius'] }),
    ...(spec.puff === undefined ? {} : { puff: spec.puff }),
    ...(spec.operation === undefined ? {} : { operation: spec.operation }),
  };
}
