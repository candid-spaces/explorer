import { parseDslDocument } from '../dsl/parser';
import type { SpatialDocument } from './SpatialDocument';
import type { SpatialNode } from './SpatialNode';
import { assignUnionGroups, boundsFromTransformedBox } from './collision';
import { geometryFromBox } from './geometry';
import { transformFromBox } from './transform';

export function createSpatialDocument(source: string): SpatialDocument {
  const parsed = parseDslDocument(source);
  const nodes: SpatialNode[] = (parsed.value ?? []).map((object) => {
    const transform = transformFromBox(object.box, object.transform);

    return {
      id: object.id,
      source: object.source,
      box: object.box,
      material: object.material,
      geometry: geometryFromBox(object.box, object.geometry),
      transform,
      bounds: boundsFromTransformedBox(object.box, transform),
    };
  });

  return {
    id: 'spatial-document',
    nodes: assignUnionGroups(nodes),
    diagnostics: parsed.diagnostics,
  };
}
