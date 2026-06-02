import type { SpatialNode } from './SpatialNode';

export function flattenSpatialNodes(nodes: SpatialNode[]): SpatialNode[] {
  return nodes.flatMap((node) => [node, ...flattenSpatialNodes(node.children ?? [])]);
}

export function flattenRenderableNodes(nodes: SpatialNode[]): SpatialNode[] {
  return flattenSpatialNodes(nodes).filter((node) => node.children?.length ? Boolean(node.directives.import || node.refTargetId) : true);
}
