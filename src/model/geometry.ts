import type { XyzBoxSpec, XyzCsgOperation, XyzGeometrySpec } from '../xyz/types';

export interface SpatialGeometry {
  kind: XyzGeometrySpec['kind'];
  dimensions: [number, number, number];
  'box-radius'?: number;
  puff?: number;
  operation?: XyzCsgOperation;
}

export function geometryFromBox(box: XyzBoxSpec, spec: XyzGeometrySpec): SpatialGeometry {
  return {
    kind: spec.kind,
    dimensions: [box.width, box.height, box.depth],
    ...(spec['box-radius'] === undefined ? {} : { 'box-radius': spec['box-radius'] }),
    ...(spec.puff === undefined ? {} : { puff: spec.puff }),
    ...(spec.operation === undefined ? {} : { operation: spec.operation }),
  };
}
