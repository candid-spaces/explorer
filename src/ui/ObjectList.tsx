import type { SpatialDocument } from '../model/SpatialDocument';
import type { SpatialNode } from '../model/SpatialNode';

interface ObjectListProps {
  document: SpatialDocument;
}

export function ObjectList({ document }: ObjectListProps) {
  return (
    <section className="object-list" aria-label="Parsed spatial objects">
      <h2>Objects</h2>
      {document.nodes.length === 0 ? (
        <p>No valid objects yet.</p>
      ) : (
        <ul>
          {document.nodes.map((node) => (
            <ObjectListNode key={node.id} node={node} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ObjectListNode({ node }: { node: SpatialNode }) {
  return (
    <li>
      <strong>{node.namespacePath ?? node.id}</strong>
      <span>
        local {formatBox(node.localBox)} → world {formatBox(node.worldBox)}
      </span>
      {node.directives.import ? <em>import {node.directives.import}</em> : null}
      {node.refTargetPath ? <em>ref {node.refTargetPath}</em> : null}
      {node.unionGroupId ? <em>{node.unionGroupId}</em> : null}
      {(node.children?.length ?? 0) > 0 ? (
        <ul>
          {node.children?.map((child) => (
            <ObjectListNode key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function formatBox(box: SpatialNode['worldBox']): string {
  return `${box.width} × ${box.height} × ${box.depth} at (${box.x}, ${box.y}, ${box.z})`;
}
