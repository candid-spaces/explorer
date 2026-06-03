import type { SpatialDocument } from '../model/SpatialDocument';

interface ObjectListProps {
  document: SpatialDocument;
}

export function ObjectList({ document }: ObjectListProps) {
  return (
    <section className="object-list" aria-label="Parsed spatial objects">
      <h2>Objects</h2>
      {document.renderNodes.length === 0 ? (
        <p>No valid objects yet.</p>
      ) : (
        <ul>
          {document.renderNodes.map((node) => (
            <li key={node.id}>
              <strong>{node.id}</strong>
              <span>
                {node.geometry.kind} bounding box: {node.box.width} × {node.box.height} × {node.box.depth} at ({node.box.x},{' '}
                {node.box.y}, {node.box.z}); rotation: {node.transform.rotation.map((radian) => Math.round((radian * 180) / Math.PI)).join(', ')}°
              </span>
              {node.unionGroupId ? <em>{node.unionGroupId}</em> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
