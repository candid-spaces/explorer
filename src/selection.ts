import type { SpatialNode } from './model/SpatialNode';

function lineNumberForNode(node: SpatialNode | undefined): number | undefined {
  return node?.metadata?.lineNumber as number | undefined;
}

function isDeclarationOnly(node: SpatialNode): boolean {
  return Boolean(node.metadata?.declarationOnly);
}

function isEditableContainerAnchor(node: SpatialNode): boolean {
  return !node.renderable && !isDeclarationOnly(node) && lineNumberForNode(node) !== undefined;
}

export function findNodeById(nodes: SpatialNode[], id?: string): SpatialNode | undefined {
  if (!id) {
    return undefined;
  }

  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const child = findNodeById(node.children ?? [], id);

    if (child) {
      return child;
    }
  }

  return undefined;
}

export function findNodeByLineNumber(nodes: SpatialNode[], lineNumber?: number): SpatialNode | undefined {
  if (lineNumber === undefined) {
    return undefined;
  }

  for (const node of nodes) {
    if (lineNumberForNode(node) === lineNumber) {
      return node;
    }

    const child = findNodeByLineNumber(node.children ?? [], lineNumber);

    if (child) {
      return child;
    }
  }

  return undefined;
}

export function findNodePathById(nodes: SpatialNode[], id?: string): SpatialNode[] {
  if (!id) {
    return [];
  }

  for (const node of nodes) {
    if (node.id === id) {
      return [node];
    }

    const childPath = findNodePathById(node.children ?? [], id);

    if (childPath.length > 0) {
      return [node, ...childPath];
    }
  }

  return [];
}

export function selectionTargetForNodeId(nodes: SpatialNode[], id?: string): SpatialNode | undefined {
  const path = findNodePathById(nodes, id);

  if (path.length === 0) {
    return undefined;
  }

  return [...path].reverse().find(isEditableContainerAnchor) ?? path.at(-1);
}

export { lineNumberForNode };
