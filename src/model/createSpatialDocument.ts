import { parseDslDocument } from '../dsl/parser';
import type { ParseDiagnostic, SpatialObject } from '../dsl/types';
import type { SpatialDocument } from './SpatialDocument';
import type { SpatialNode } from './SpatialNode';
import { assignUnionGroups, boundsFromBox } from './collision';
import { resolveMaterial } from './resolveMaterials';
import { resolveNodeWorldBox } from './resolveTransforms';
import { flattenRenderableNodes, flattenSpatialNodes } from './traversal';

export function createSpatialDocument(source: string): SpatialDocument {
  const parsed = parseDslDocument(source);
  const diagnostics: ParseDiagnostic[] = [...parsed.diagnostics];
  const roots: SpatialNode[] = [];
  const stack: SpatialNode[] = [];
  const namespaceIndex = new Map<string, SpatialNode>();
  const nodeIndex = new Map<string, SpatialNode>();

  (parsed.value ?? []).forEach((object) => {
    const parent = object.depth > 0 ? stack[object.depth - 1] : undefined;

    if (object.depth > 0 && !parent) {
      diagnostics.push({
        line: object.line,
        source: object.source,
        message: `Nested declaration at depth ${object.depth} has no parent declaration.`,
      });
    }

    const node = createNode(object, parent);
    nodeIndex.set(node.id, node);

    if (node.namespacePath) {
      if (namespaceIndex.has(node.namespacePath)) {
        diagnostics.push({
          line: object.line,
          source: object.source,
          message: `Duplicate namespace path "${node.namespacePath}". References will resolve to the first declaration.`,
        });
      } else {
        namespaceIndex.set(node.namespacePath, node);
      }
    }

    if (parent) {
      parent.children = [...(parent.children ?? []), node];
    } else {
      roots.push(node);
    }

    stack[object.depth] = node;
    stack.length = object.depth + 1;
  });

  resolveReferences(roots, namespaceIndex, diagnostics);
  detectReferenceCycles(roots, nodeIndex, diagnostics);
  applyUnionGroups(roots);

  return {
    id: 'spatial-document',
    nodes: roots,
    allNodes: flattenSpatialNodes(roots),
    nodeIndex,
    namespaceIndex,
    diagnostics,
  };
}

function createNode(object: SpatialObject, parent?: SpatialNode): SpatialNode {
  const namespacePath = resolveNamespacePath(object, parent);
  const worldBox = resolveNodeWorldBox(parent?.worldBox, object.box);
  const resolvedMaterial = resolveMaterial(parent?.resolvedMaterial, object.material);

  return {
    id: object.id,
    source: object.source,
    line: object.line,
    name: namespacePath?.split('/').at(-1),
    namespacePath,
    path: namespacePath ?? object.id,
    parentId: parent?.id,
    depth: object.depth,
    box: worldBox,
    localBox: object.box,
    worldBox,
    bounds: boundsFromBox(worldBox),
    material: object.material,
    resolvedMaterial,
    directives: object.directives,
    children: [],
  };
}

function resolveNamespacePath(object: SpatialObject, parent?: SpatialNode): string | undefined {
  const declaredPath = object.namespacePath;

  if (!declaredPath) {
    return parent ? `${parent.path}/${object.id}` : undefined;
  }

  if (!parent?.namespacePath) {
    return declaredPath;
  }

  if (declaredPath === parent.namespacePath || declaredPath.startsWith(`${parent.namespacePath}/`)) {
    return declaredPath;
  }

  return `${parent.namespacePath}/${declaredPath}`;
}

function resolveReferences(nodes: SpatialNode[], namespaceIndex: Map<string, SpatialNode>, diagnostics: ParseDiagnostic[]): void {
  flattenSpatialNodes(nodes).forEach((node) => {
    const refPath = node.directives.ref;

    if (!refPath) {
      return;
    }

    const target = namespaceIndex.get(refPath);

    if (!target) {
      diagnostics.push({ line: node.line, source: node.source, message: `Reference target "${refPath}" was not found.` });
      return;
    }

    if (target.id === node.id) {
      diagnostics.push({ line: node.line, source: node.source, message: `Reference "${refPath}" cannot point to itself.` });
      return;
    }

    node.refTargetId = target.id;
    node.refTargetPath = refPath;
  });
}

function applyUnionGroups(roots: SpatialNode[]): void {
  const grouped = assignUnionGroups(flattenRenderableNodes(roots));
  const groupById = new Map(grouped.map((node) => [node.id, node.unionGroupId]));

  flattenSpatialNodes(roots).forEach((node) => {
    node.unionGroupId = groupById.get(node.id);
  });
}

function detectReferenceCycles(roots: SpatialNode[], nodeIndex: Map<string, SpatialNode>, diagnostics: ParseDiagnostic[]): void {
  flattenSpatialNodes(roots).forEach((node) => {
    const visited = new Set<string>();
    let current: SpatialNode | undefined = node;

    while (current?.refTargetId) {
      if (visited.has(current.id)) {
        diagnostics.push({ line: node.line, source: node.source, message: `Reference cycle detected starting at "${node.path}".` });
        return;
      }

      visited.add(current.id);
      current = nodeIndex.get(current.refTargetId);
    }
  });
}
