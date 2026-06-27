import { useMemo, useState } from 'react';
import type { SpatialDocument } from '../model/SpatialDocument';
import type { SpatialNode } from '../model/SpatialNode';

interface DslTreeViewProps {
  document: SpatialDocument;
}

function displayName(node: SpatialNode): string {
  if (node.namespacePath) {
    return node.namespacePath.replace(/\/$/, '');
  }

  return node.id;
}

function metadataValue<T>(node: SpatialNode, key: string): T | undefined {
  return node.metadata?.[key] as T | undefined;
}

function sortedTreeIds(nodes: SpatialNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...sortedTreeIds(node.children ?? [])]);
}

function hasNestedNodes(nodes: SpatialNode[]): boolean {
  return nodes.some((node) => (node.children?.length ?? 0) > 0 || hasNestedNodes(node.children ?? []));
}

function TreeItem({ node, collapsedIds, onToggle }: { node: SpatialNode; collapsedIds: Set<string>; onToggle: (id: string) => void }) {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);
  const lineNumber = metadataValue<number>(node, 'lineNumber');
  const reference = metadataValue<string>(node, 'reference');
  const csgLabel = node.csgExpressionId ? (node.csgConsumed ? `csg tool ${node.csgExpressionId}` : node.csgExpressionId) : undefined;

  return (
    <li className="dsl-tree-item">
      <div className="dsl-tree-row">
        {hasChildren ? (
          <button
            aria-expanded={!isCollapsed}
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${displayName(node)}`}
            className="dsl-tree-toggle"
            type="button"
            onClick={() => onToggle(node.id)}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span className="dsl-tree-spacer" aria-hidden="true" />
        )}

        <div className="dsl-tree-node-summary">
          <strong>{displayName(node)}</strong>
          <span>
            {node.renderable ? node.geometry.kind : 'group'} · {node.box.width} × {node.box.height} × {node.box.depth} at ({node.box.x},{' '}
            {node.box.y}, {node.box.z})
          </span>
        </div>

        <div className="dsl-tree-badges" aria-label="DSL node metadata">
          {lineNumber ? <em>line {lineNumber}</em> : null}
          {node.renderable ? null : <em>container</em>}
          {reference ? <em>ref {reference}</em> : null}
          {node.geometry.operation ? <em>operation {node.geometry.operation}</em> : null}
          {csgLabel ? <em>{csgLabel}</em> : null}
        </div>
      </div>

      {hasChildren && !isCollapsed ? (
        <ul className="dsl-tree-children">
          {children.map((child) => (
            <TreeItem key={child.id} node={child} collapsedIds={collapsedIds} onToggle={onToggle} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function DslTreeView({ document }: DslTreeViewProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const nodeIds = useMemo(() => sortedTreeIds(document.nodes), [document.nodes]);
  const hasCollapsibleNodes = useMemo(() => hasNestedNodes(document.nodes), [document.nodes]);

  function toggleNode(id: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function expandAll() {
    setCollapsedIds(new Set());
  }

  function collapseAll() {
    setCollapsedIds(new Set(nodeIds));
  }

  return (
    <section className="dsl-tree-view" aria-label="DSL declaration tree">
      <div className="section-heading-row">
        <h2>Definition tree</h2>
        {hasCollapsibleNodes ? (
          <div className="tree-actions" aria-label="Tree display controls">
            <button type="button" onClick={expandAll}>
              Expand all
            </button>
            <button type="button" onClick={collapseAll}>
              Collapse all
            </button>
          </div>
        ) : null}
      </div>

      {document.nodes.length === 0 ? (
        <p>No valid definitions yet.</p>
      ) : (
        <ul className="dsl-tree-root">
          {document.nodes.map((node) => (
            <TreeItem key={node.id} node={node} collapsedIds={collapsedIds} onToggle={toggleNode} />
          ))}
        </ul>
      )}
    </section>
  );
}
