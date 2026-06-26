import { boundsOverlap } from './collision';
import type { SpatialNode } from './SpatialNode';

export interface CsgOperationNode {
  op: NonNullable<SpatialNode['geometry']['csg']>;
  tool: SpatialNode;
}

export interface CsgExpression {
  id: string;
  base: SpatialNode;
  operations: CsgOperationNode[];
}

function sourceOrder(node: SpatialNode): number {
  return node.metadata?.lineNumber as number ?? Number.MAX_SAFE_INTEGER;
}

function isCsgTool(node: SpatialNode): boolean {
  return node.geometry.csg !== undefined;
}

export function buildCsgExpressions(nodes: SpatialNode[]): { expressions: CsgExpression[]; nodes: SpatialNode[] } {
  const byId = new Map<string, SpatialNode>(nodes.map((node) => [node.id, { ...node, csgExpressionId: undefined, csgConsumed: false }]));
  const ordered = [...byId.values()].sort((a, b) => sourceOrder(a) - sourceOrder(b));
  const operationsByBase = new Map<string, CsgOperationNode[]>();

  ordered.forEach((tool) => {
    if (!isCsgTool(tool)) {
      return;
    }

    const base = ordered
      .filter((candidate) => sourceOrder(candidate) < sourceOrder(tool))
      .filter((candidate) => !isCsgTool(candidate))
      .filter((candidate) => boundsOverlap(candidate.bounds, tool.bounds))
      .at(-1);

    if (!base || !tool.geometry.csg) {
      return;
    }

    operationsByBase.set(base.id, [...(operationsByBase.get(base.id) ?? []), { op: tool.geometry.csg, tool }]);
    const storedTool = byId.get(tool.id);
    if (storedTool) {
      storedTool.csgConsumed = true;
    }
  });

  const expressions: CsgExpression[] = [...operationsByBase.entries()].map(([baseId, operations], index) => {
    const expressionId = `csg-${index + 1}`;
    const base = byId.get(baseId)!;
    base.csgExpressionId = expressionId;
    operations.forEach(({ tool }) => {
      const storedTool = byId.get(tool.id);
      if (storedTool) {
        storedTool.csgExpressionId = expressionId;
      }
    });

    return {
      id: expressionId,
      base,
      operations: operations.map(({ op, tool }) => ({ op, tool: byId.get(tool.id) ?? tool })),
    };
  });

  return { expressions, nodes: nodes.map((node) => byId.get(node.id) ?? node) };
}
