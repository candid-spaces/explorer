import type { DslBoxSpec } from '../dsl/types';
import type { SpatialBounds, SpatialNode } from './SpatialNode';

export function boundsFromBox(box: DslBoxSpec): SpatialBounds {
  return {
    minX: box.x,
    maxX: box.x + box.width,
    minY: box.y,
    maxY: box.y + box.height,
    minZ: box.z,
    maxZ: box.z + box.depth,
  };
}

export function boundsOverlap(a: SpatialBounds, b: SpatialBounds): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}

export function assignUnionGroups(nodes: SpatialNode[]): SpatialNode[] {
  const adjacency = new Map<string, Set<string>>();

  nodes.forEach((node) => adjacency.set(node.id, new Set()));

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (boundsOverlap(nodes[i].bounds, nodes[j].bounds)) {
        adjacency.get(nodes[i].id)?.add(nodes[j].id);
        adjacency.get(nodes[j].id)?.add(nodes[i].id);
      }
    }
  }

  const visited = new Set<string>();
  const groupByNode = new Map<string, string>();
  let groupNumber = 1;

  nodes.forEach((node) => {
    if (visited.has(node.id)) {
      return;
    }

    const stack = [node.id];
    const component: string[] = [];

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);
      component.push(current);
      adjacency.get(current)?.forEach((neighbor) => stack.push(neighbor));
    }

    if (component.length > 1) {
      const groupId = `union-${groupNumber}`;
      groupNumber += 1;
      component.forEach((id) => groupByNode.set(id, groupId));
    }
  });

  return nodes.map((node) => ({ ...node, unionGroupId: groupByNode.get(node.id) }));
}
