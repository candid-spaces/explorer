import type { SpatialDocument } from '../model/SpatialDocument';

interface ObjectListProps {
  document: SpatialDocument;
}

export function ObjectList({ document }: ObjectListProps) {
  return (
    <section className="object-list" aria-label="Parsed spatial objects">
      <h2>Objects</h2>
      {document.renderNodes.length === 0 && document.csgExpressions.length === 0 ? (
        <p>No valid objects yet.</p>
      ) : (
        <ul>
          {document.csgExpressions.map((expression) => (
            <li key={expression.id}>
              <strong>{expression.id}</strong>
              <span>
                {expression.base.geometry.kind} with {expression.operations.length} CSG operation{expression.operations.length === 1 ? '' : 's'}:{' '}
                {expression.operations.map((operation) => `${operation.op} ${operation.tool.geometry.kind}`).join(', ')}
              </span>
              <em>{expression.base.id}</em>
            </li>
          ))}
          {document.renderNodes.map((node) => (
            <li key={node.id}>
              <strong>{node.id}</strong>
              <span>
                {node.geometry.kind}{node.geometry.operation ? ` (${node.geometry.operation})` : ''}
                {node.geometry['box-radius'] !== undefined ? ` (box-radius: ${node.geometry['box-radius']})` : ''} bounding box: {node.box.width} ×{' '}
                {node.box.height} × {node.box.depth} at ({node.box.x}, {node.box.y}, {node.box.z}); rotation:{' '}
                {node.transform.rotation.map((radian) => Math.round((radian * 180) / Math.PI)).join(', ')}°
              </span>
              {node.unionGroupId ? <em>{node.unionGroupId}</em> : null}
              {node.csgExpressionId ? <em>{node.csgConsumed ? `tool for ${node.csgExpressionId}` : node.csgExpressionId}</em> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
