import { parseDslDocument } from '../dsl/parser';
import { resolveDslDocument } from '../dsl/resolveDocument';
import { canonicalNamespacePath } from '../dsl/pathParser';
import type { SpatialDocument } from './SpatialDocument';
import type { SpatialNode } from './SpatialNode';
import { assignUnionGroups, boundsFromTransformedBox } from './collision';
import { geometryFromBox } from './geometry';
import {
  anchorTransformFromBox,
  composeTransforms,
  transformFromBox,
} from './transform';

function nearestConcreteAncestor(
  namespace: string[],
  nodesByNamespace: Map<string, SpatialNode>,
): SpatialNode | undefined {
  for (let length = namespace.length - 1; length > 0; length -= 1) {
    const ancestor = nodesByNamespace.get(
      canonicalNamespacePath(namespace.slice(0, length)),
    );

    if (ancestor) {
      return ancestor;
    }
  }

  return undefined;
}

function flattenRenderable(nodes: SpatialNode[]): SpatialNode[] {
  return nodes
    .flatMap((node) => [
      node.renderable ? node : undefined,
      ...flattenRenderable(node.children ?? []),
    ])
    .filter(Boolean) as SpatialNode[];
}

function assignUnionGroupsToTree(
  nodes: SpatialNode[],
  groupedNodes: SpatialNode[],
): SpatialNode[] {
  const unionById = new Map(
    groupedNodes.map((node) => [node.id, node.unionGroupId]),
  );

  return nodes.map((node) => ({
    ...node,
    unionGroupId: unionById.get(node.id) ?? node.unionGroupId,
    children: node.children
      ? assignUnionGroupsToTree(node.children, groupedNodes)
      : undefined,
  }));
}

export function createSpatialDocument(source: string): SpatialDocument {
  const parsed = parseDslDocument(source);
  const resolved = resolveDslDocument(parsed.value ?? []);
  const diagnostics = [...parsed.diagnostics, ...resolved.diagnostics];
  const nodesByNamespace = new Map<string, SpatialNode>();
  const topLevelNodes: SpatialNode[] = [];

  resolved.objects
    .sort(
      (a, b) =>
        a.namespace.length - b.namespace.length || a.lineNumber - b.lineNumber,
    )
    .forEach((object) => {
      const parent = nearestConcreteAncestor(
        object.namespace,
        nodesByNamespace,
      );
      const hasChildren = resolved.objects.some(
        (candidate) =>
          candidate !== object &&
          candidate.namespace.length > object.namespace.length &&
          object.namespace.every(
            (segment, index) => candidate.namespace[index] === segment,
          ),
      );
      const localTransform = object.renderable
        ? transformFromBox(object.box, object.transform)
        : {
            ...anchorTransformFromBox(object.box, object.transform),
            scale: object.anchorScale ?? [1, 1, 1],
          };
      const worldTransform = parent?.worldTransform
        ? composeTransforms(parent.worldTransform, localTransform)
        : localTransform;
      const node: SpatialNode = {
        id: object.id,
        source: object.source,
        box: object.box,
        material: object.material,
        content: object.content,
        geometry: geometryFromBox(object.box, object.geometry),
        localTransform,
        worldTransform,
        transform: worldTransform,
        bounds: boundsFromTransformedBox(object.box, worldTransform),
        namespacePath: object.namespacePath,
        parentNamespacePath: object.parentNamespacePath,
        renderable: object.renderable,
        children: [],
        metadata: {
          lineNumber: object.lineNumber,
          declarationOnly: object.declarationOnly,
          container: hasChildren,
          reference: object.reference.targetPath,
          materializedFrom: object.materializedFrom,
          anchorScale: object.anchorScale,
        },
      };

      if (object.namespacePath && !nodesByNamespace.has(object.namespacePath)) {
        nodesByNamespace.set(object.namespacePath, node);
      }

      if (parent) {
        parent.children = [...(parent.children ?? []), node];
      } else {
        topLevelNodes.push(node);
      }
    });

  const renderNodes = assignUnionGroups(flattenRenderable(topLevelNodes));
  const nodes = assignUnionGroupsToTree(topLevelNodes, renderNodes);

  return {
    id: 'spatial-document',
    nodes,
    renderNodes,
    diagnostics,
  };
}
