import type { XyzDslBoxSpec } from '../xyzdsl/types';
import type { SpatialBounds, SpatialNode } from './SpatialNode';
import type { SpatialTransform } from './transform';
import { transformFromBox } from './transform';

export function boundsFromBox(box: XyzDslBoxSpec): SpatialBounds {
  return boundsFromTransformedBox(box, transformFromBox(box, { rotation: [0, 0, 0], diagnostics: [] }));
}

export function boundsFromTransformedBox(box: XyzDslBoxSpec, transform: SpatialTransform): SpatialBounds {
  const [width, height, depth] = transform.scale;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;
  const corners: [number, number, number][] = [
    [-halfWidth, -halfHeight, -halfDepth],
    [-halfWidth, -halfHeight, halfDepth],
    [-halfWidth, halfHeight, -halfDepth],
    [-halfWidth, halfHeight, halfDepth],
    [halfWidth, -halfHeight, -halfDepth],
    [halfWidth, -halfHeight, halfDepth],
    [halfWidth, halfHeight, -halfDepth],
    [halfWidth, halfHeight, halfDepth],
  ];

  const worldCorners = corners.map((corner) => applyTransform(corner, transform));
  const xs = worldCorners.map(([x]) => x);
  const ys = worldCorners.map(([, y]) => y);
  const zs = worldCorners.map(([, , z]) => z);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

function applyTransform([x, y, z]: [number, number, number], transform: SpatialTransform): [number, number, number] {
  const [rotationX, rotationY, rotationZ] = transform.rotation;
  const [pivotX, pivotY, pivotZ] = transform.pivot;
  const [positionX, positionY, positionZ] = transform.position;

  let transformedX = x - pivotX;
  let transformedY = y - pivotY;
  let transformedZ = z - pivotZ;

  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const afterX: [number, number, number] = [
    transformedX,
    transformedY * cosX - transformedZ * sinX,
    transformedY * sinX + transformedZ * cosX,
  ];

  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const afterY: [number, number, number] = [
    afterX[0] * cosY + afterX[2] * sinY,
    afterX[1],
    -afterX[0] * sinY + afterX[2] * cosY,
  ];

  const cosZ = Math.cos(rotationZ);
  const sinZ = Math.sin(rotationZ);
  [transformedX, transformedY, transformedZ] = [
    afterY[0] * cosZ - afterY[1] * sinZ,
    afterY[0] * sinZ + afterY[1] * cosZ,
    afterY[2],
  ];

  return [transformedX + pivotX + positionX, transformedY + pivotY + positionY, transformedZ + pivotZ + positionZ];
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

function sourceOrder(node: SpatialNode, fallback: number): number {
  return (node.metadata?.lineNumber as number | undefined) ?? fallback;
}

function componentScope(node: SpatialNode): string | undefined {
  return node.namespacePath?.split('/').filter(Boolean)[0];
}

function translateNode(node: SpatialNode, [x, y, z]: [number, number, number]): SpatialNode {
  const translateTransform = (transform: SpatialTransform | undefined) => transform
    ? { ...transform, position: [transform.position[0] + x, transform.position[1] + y, transform.position[2] + z] as [number, number, number] }
    : undefined;

  return {
    ...node,
    transform: translateTransform(node.transform)!,
    worldTransform: translateTransform(node.worldTransform),
    localTransform: node.parentNamespacePath ? node.localTransform : translateTransform(node.localTransform),
    bounds: {
      minX: node.bounds.minX + x,
      maxX: node.bounds.maxX + x,
      minY: node.bounds.minY + y,
      maxY: node.bounds.maxY + y,
      minZ: node.bounds.minZ + z,
      maxZ: node.bounds.maxZ + z,
    },
  };
}

function packingCandidates(node: SpatialNode, obstacles: SpatialNode[]): [number, number, number][] {
  const candidates: [number, number, number][] = [];
  obstacles.forEach((obstacle) => {
    candidates.push(
      [obstacle.bounds.maxX - node.bounds.minX, 0, 0],
      [obstacle.bounds.minX - node.bounds.maxX, 0, 0],
      [0, obstacle.bounds.maxY - node.bounds.minY, 0],
      [0, obstacle.bounds.minY - node.bounds.maxY, 0],
      [0, 0, obstacle.bounds.maxZ - node.bounds.minZ],
      [0, 0, obstacle.bounds.minZ - node.bounds.maxZ],
    );
  });

  // Stable sorting preserves the +X, -X, +Y, -Y, +Z, -Z tie-break above.
  return candidates.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
}

function packNode(node: SpatialNode, obstacles: SpatialNode[]): SpatialNode {
  for (const translation of packingCandidates(node, obstacles)) {
    const candidate = translateNode(node, translation);
    if (!obstacles.some((obstacle) => boundsOverlap(candidate.bounds, obstacle.bounds))) {
      return candidate;
    }
  }
  return node;
}

function csgBaseByTool(nodes: SpatialNode[]): Map<string, string> {
  const ordered = nodes
    .map((node, index) => ({ node, index }))
    .sort((a, b) => sourceOrder(a.node, a.index) - sourceOrder(b.node, b.index));
  const baseByTool = new Map<string, string>();

  ordered.forEach(({ node: tool }, toolIndex) => {
    if (!tool.geometry.operation) {
      return;
    }

    const earlierOverlapping = ordered
      .slice(0, toolIndex)
      .map(({ node }) => node)
      .filter((candidate) => boundsOverlap(candidate.bounds, tool.bounds));
    const scopedCandidate = earlierOverlapping
      .filter((candidate) => (candidate.parentNamespacePath ?? '') === (tool.parentNamespacePath ?? ''))
      .at(-1);
    const candidate = scopedCandidate ?? earlierOverlapping.at(-1);
    const baseId = candidate
      ? (baseByTool.get(candidate.id) ?? (candidate.geometry.operation ? undefined : candidate.id))
      : undefined;

    if (baseId) {
      baseByTool.set(tool.id, baseId);
    }
  });

  return baseByTool;
}

/**
 * Keeps collisions inside a named component as default unions, while moving
 * later global-space objects to the nearest free face-aligned coordinate.
 * Explicit CSG tools follow the selected base's packing translation.
 */
export function resolveCollisions(nodes: SpatialNode[]): SpatialNode[] {
  const ordered = nodes
    .map((node, index) => ({ node, index }))
    .sort((a, b) => sourceOrder(a.node, a.index) - sourceOrder(b.node, b.index));
  const baseByTool = csgBaseByTool(nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const entityKey = (node: SpatialNode): string => {
    const base = node.geometry.operation ? nodeById.get(baseByTool.get(node.id) ?? '') : node;
    const scope = base ? componentScope(base) : undefined;
    return scope ? `component:${scope}` : `node:${base?.id ?? node.id}`;
  };
  const entities = new Map<string, SpatialNode[]>();

  ordered.forEach(({ node }) => {
    const key = entityKey(node);
    entities.set(key, [...(entities.get(key) ?? []), node]);
  });

  const placedObstacles: SpatialNode[] = [];
  const resolvedNodes: SpatialNode[] = [];
  entities.forEach((members) => {
    const collisionMembers = members.filter((member) => !member.geometry.operation);
    if (collisionMembers.length === 0) {
      resolvedNodes.push(...members);
      return;
    }

    const bounds = collisionMembers.reduce<SpatialBounds>((combined, member) => ({
      minX: Math.min(combined.minX, member.bounds.minX),
      maxX: Math.max(combined.maxX, member.bounds.maxX),
      minY: Math.min(combined.minY, member.bounds.minY),
      maxY: Math.max(combined.maxY, member.bounds.maxY),
      minZ: Math.min(combined.minZ, member.bounds.minZ),
      maxZ: Math.max(combined.maxZ, member.bounds.maxZ),
    }), collisionMembers[0].bounds);
    const representative = { ...collisionMembers[0], bounds };
    const packed = placedObstacles.some((obstacle) => boundsOverlap(bounds, obstacle.bounds))
      ? packNode(representative, placedObstacles)
      : representative;
    const translation: [number, number, number] = [
      packed.transform.position[0] - representative.transform.position[0],
      packed.transform.position[1] - representative.transform.position[1],
      packed.transform.position[2] - representative.transform.position[2],
    ];
    const resolvedMembers = members.map((member) => translateNode(member, translation));
    resolvedNodes.push(...resolvedMembers);
    placedObstacles.push(...resolvedMembers.filter((member) => !member.geometry.operation));
  });

  return assignUnionGroups(resolvedNodes).sort(
    (a, b) => nodes.findIndex((node) => node.id === a.id) - nodes.findIndex((node) => node.id === b.id),
  );
}

export function assignUnionGroups(nodes: SpatialNode[]): SpatialNode[] {
  const adjacency = new Map<string, Set<string>>();

  nodes.forEach((node) => adjacency.set(node.id, new Set()));

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const scope = componentScope(nodes[i]);
      if (
        scope !== undefined &&
        scope === componentScope(nodes[j]) &&
        !nodes[i].geometry.operation &&
        !nodes[j].geometry.operation &&
        boundsOverlap(nodes[i].bounds, nodes[j].bounds)
      ) {
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
