import type { AxisName, DslGeometryKind } from '../dsl/types';
import type { SpatialNode } from '../model/SpatialNode';

interface SelectedNodeInspectorProps {
  node?: SpatialNode;
  canEdit: boolean;
  onClearSelection: () => void;
  onMove: (axis: AxisName, delta: number) => void;
  onResize: (axis: AxisName, delta: number) => void;
  onPropertyChange: (key: string, value: string) => void;
}

function metadataValue<T>(node: SpatialNode, key: string): T | undefined {
  return node.metadata?.[key] as T | undefined;
}

function displayName(node: SpatialNode): string {
  return node.namespacePath?.replace(/\/$/, '') || node.id;
}

const GEOMETRY_OPTIONS: DslGeometryKind[] = ['box', 'cylinder', 'cone', 'sphere'];

export function SelectedNodeInspector({
  node,
  canEdit,
  onClearSelection,
  onMove,
  onResize,
  onPropertyChange,
}: SelectedNodeInspectorProps) {
  if (!node) {
    return null;
  }

  const lineNumber = metadataValue<number>(node, 'lineNumber');
  const step = 1;
  const fineStep = 0.1;

  return (
    <section className="selected-node-inspector" aria-label="Selected scene object editor">
      <div className="section-heading-row">
        <div>
          <h2>Scene selection</h2>
          <p>{displayName(node)}</p>
        </div>
        <button type="button" onClick={onClearSelection}>
          Clear
        </button>
      </div>

      <dl>
        <div>
          <dt>DSL line</dt>
          <dd>{lineNumber ?? 'unknown'}</dd>
        </div>
        <div>
          <dt>Bounds</dt>
          <dd>
            {node.box.width} × {node.box.height} × {node.box.depth} at ({node.box.x}, {node.box.y}, {node.box.z})
          </dd>
        </div>
      </dl>

      {!canEdit ? <p className="inspector-warning">This selection cannot be rewritten as a single editable DSL declaration.</p> : null}

      <div className="inspector-grid" aria-label="Move selected object">
        <strong>Move</strong>
        {(['x', 'y', 'z'] as AxisName[]).map((axis) => (
          <span key={`move-${axis}`} className="inspector-control-row">
            <button type="button" disabled={!canEdit} onClick={() => onMove(axis, -step)}>
              -{axis.toUpperCase()}
            </button>
            <button type="button" disabled={!canEdit} onClick={() => onMove(axis, step)}>
              +{axis.toUpperCase()}
            </button>
            <button type="button" disabled={!canEdit} onClick={() => onMove(axis, fineStep)}>
              +{fineStep} {axis.toUpperCase()}
            </button>
          </span>
        ))}
      </div>

      <div className="inspector-grid" aria-label="Resize selected object">
        <strong>Resize</strong>
        {(['x', 'y', 'z'] as AxisName[]).map((axis) => (
          <span key={`resize-${axis}`} className="inspector-control-row">
            <button type="button" disabled={!canEdit} onClick={() => onResize(axis, -step)}>
              -{axis.toUpperCase()} size
            </button>
            <button type="button" disabled={!canEdit} onClick={() => onResize(axis, step)}>
              +{axis.toUpperCase()} size
            </button>
          </span>
        ))}
      </div>

      <div className="inspector-fields">
        <label>
          Geometry
          <select disabled={!canEdit} value={node.geometry.kind} onChange={(event) => onPropertyChange('geometry', event.target.value)}>
            {GEOMETRY_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
        <label>
          Color
          <input
            disabled={!canEdit}
            type="text"
            value={String(node.material.color ?? '')}
            placeholder="blue or 0x3366ff"
            onChange={(event) => onPropertyChange('color', event.target.value)}
          />
        </label>
        <label>
          Roughness
          <input
            disabled={!canEdit}
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={node.material.roughness ?? ''}
            onChange={(event) => onPropertyChange('roughness', event.target.value)}
          />
        </label>
        <label>
          Metalness
          <input
            disabled={!canEdit}
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={node.material.metalness ?? ''}
            onChange={(event) => onPropertyChange('metalness', event.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
