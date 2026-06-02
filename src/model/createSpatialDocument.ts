import { parseDslDocument } from '../dsl/parser';
import type { SpatialDocument } from './SpatialDocument';
import type { SpatialNode } from './SpatialNode';
import { assignUnionGroups, boundsFromBox } from './collision';
import { geometryFromBox } from './geometry';

export function createSpatialDocument(source: string): SpatialDocument {
  const parsed = parseDslDocument(source);
  const nodes: SpatialNode[] = (parsed.value ?? []).map((object) => ({
    id: object.id,
    source: object.source,
    box: object.box,
    material: object.material,
    geometry: geometryFromBox(object.box, object.geometry),
    bounds: boundsFromBox(object.box),
  }));

  return {
    id: 'spatial-document',
    nodes: assignUnionGroups(nodes),
    diagnostics: parsed.diagnostics,
  };
}
