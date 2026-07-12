import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { AxisName, DslGeometryKind } from '../dsl/types';
import type { SpatialNode } from '../model/SpatialNode';

interface SelectedNodeInspectorProps {
  node?: SpatialNode;
  canEdit: boolean;
  selectionPath?: SpatialNode[];
  onClearSelection: () => void;
  onMove: (axis: AxisName, delta: number) => void;
  onResize: (axis: AxisName, delta: number) => void;
  onRotate: (axis: AxisName, deltaDegrees: number) => void;
  onPathNodeSelect: (id: string) => void;
  onPropertyChange: (key: string, value: string) => void;
  onSelectNode: (id: string) => void;
}

function metadataValue<T>(node: SpatialNode, key: string): T | undefined {
  return node.metadata?.[key] as T | undefined;
}

function displayName(node: SpatialNode): string {
  return node.namespacePath?.replace(/\/$/, '') || node.id;
}

const GEOMETRY_OPTIONS: DslGeometryKind[] = ['box', 'cylinder', 'cone', 'sphere'];

interface InspectorPosition {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

function clampedInspectorPosition(x: number, y: number, width: number, height: number): InspectorPosition {
  const margin = 16;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);

  return {
    x: Math.min(Math.max(margin, x), maxX),
    y: Math.min(Math.max(margin, y), maxY),
  };
}

export function SelectedNodeInspector({
  node,
  canEdit,
  selectionPath = [],
  onClearSelection,
  onMove,
  onResize,
  onRotate,
  onPathNodeSelect,
  onPropertyChange,
  onSelectNode,
}: SelectedNodeInspectorProps) {
  const inspectorRef = useRef<HTMLElement>(null);
  const dragStateRef = useRef<DragState | undefined>(undefined);
  const [position, setPosition] = useState<InspectorPosition | undefined>();

  const handleDragStart = useCallback((event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, input, select, textarea, a')) {
      return;
    }

    const inspector = inspectorRef.current;

    if (!inspector) {
      return;
    }

    const rect = inspector.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setPosition(clampedInspectorPosition(rect.left, rect.top, rect.width, rect.height));
    inspector.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, []);

  const handleDragMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    const inspector = inspectorRef.current;

    if (!dragState || !inspector || event.pointerId !== dragState.pointerId) {
      return;
    }

    const rect = inspector.getBoundingClientRect();
    setPosition(clampedInspectorPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY, rect.width, rect.height));
  }, []);

  const handleDragEnd = useCallback((event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    const inspector = inspectorRef.current;

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    dragStateRef.current = undefined;

    if (inspector?.hasPointerCapture(event.pointerId)) {
      inspector.releasePointerCapture(event.pointerId);
    }
  }, []);

  if (!node) {
    return null;
  }

  const lineNumber = metadataValue<number>(node, 'lineNumber');
  const unitStep = 1;
  const centiunitStep = 0.01;
  const movementSteps = [
    { label: '1u', value: unitStep },
    { label: '1c', value: centiunitStep },
  ];
  const rotationSteps = [
    { label: '1°', value: unitStep },
    { label: '0.01°', value: centiunitStep },
  ];
  const childNodes = node.children ?? [];
  const inspectorStyle: CSSProperties | undefined = position
    ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
    : undefined;

  return (
    <section
      ref={inspectorRef}
      className="selected-node-inspector"
      style={inspectorStyle}
      aria-label="Selected scene object editor"
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onPointerCancel={handleDragEnd}
    >
      <div
        className="section-heading-row inspector-drag-handle"
        title="Drag to move object selection pane"
        onPointerDown={handleDragStart}
      >
        <div>
          <h2>Object selection</h2>
          <p>{displayName(node)}</p>
        </div>
        <button type="button" onClick={onClearSelection}>
          Clear
        </button>
      </div>

      <dl>
        <div>
          <dt>Declaration line</dt>
          <dd>{lineNumber ?? 'unknown'}</dd>
        </div>
        <div>
          <dt>Bounds</dt>
          <dd>
            {node.box.width} × {node.box.height} × {node.box.depth} at ({node.box.x}, {node.box.y}, {node.box.z})
          </dd>
        </div>
      </dl>

      {selectionPath.length > 1 ? (
        <nav className="inspector-selection-path" aria-label="Selection hierarchy">
          <strong>Hierarchy</strong>
          <ol>
            {selectionPath.map((pathNode) => (
              <li key={pathNode.id}>
                <button
                  type="button"
                  aria-current={pathNode.id === node.id ? 'true' : undefined}
                  onClick={() => onPathNodeSelect(pathNode.id)}
                >
                  {displayName(pathNode)}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {childNodes.length > 0 ? (
        <section className="inspector-child-list" aria-label="Child selections">
          <strong>Child elements</strong>
          <ul>
            {childNodes.map((child) => (
              <li key={child.id}>
                <button type="button" onClick={() => onSelectNode(child.id)}>
                  {displayName(child)}
                </button>
                <span>
                  {child.renderable ? child.geometry.kind : 'group'}
                  {child.geometry.operation ? ` · ${child.geometry.operation}` : ''}
                  {child.csgConsumed ? ' · csg tool' : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!canEdit ? <p className="inspector-warning">This selection cannot be rewritten as a single editable spatial declaration.</p> : null}

      <div className="inspector-grid" aria-label="Move selected object">
        <strong>Move</strong>
        {(['x', 'y', 'z'] as AxisName[]).map((axis) => (
          <span key={`move-${axis}`} className="inspector-control-row">
            {movementSteps.map(({ label, value }) => (
              <button key={`move-${axis}-minus-${label}`} type="button" disabled={!canEdit} onClick={() => onMove(axis, -value)}>
                -{label} {axis.toUpperCase()}
              </button>
            ))}
            {movementSteps.map(({ label, value }) => (
              <button key={`move-${axis}-plus-${label}`} type="button" disabled={!canEdit} onClick={() => onMove(axis, value)}>
                +{label} {axis.toUpperCase()}
              </button>
            ))}
          </span>
        ))}
      </div>

      <div className="inspector-grid" aria-label="Resize selected object">
        <strong>Resize</strong>
        {(['x', 'y', 'z'] as AxisName[]).map((axis) => (
          <span key={`resize-${axis}`} className="inspector-control-row">
            {movementSteps.map(({ label, value }) => (
              <button key={`resize-${axis}-minus-${label}`} type="button" disabled={!canEdit} onClick={() => onResize(axis, -value)}>
                -{label} {axis.toUpperCase()} size
              </button>
            ))}
            {movementSteps.map(({ label, value }) => (
              <button key={`resize-${axis}-plus-${label}`} type="button" disabled={!canEdit} onClick={() => onResize(axis, value)}>
                +{label} {axis.toUpperCase()} size
              </button>
            ))}
          </span>
        ))}
      </div>

      <div className="inspector-grid" aria-label="Rotate selected object">
        <strong>Rotate</strong>
        {(['x', 'y', 'z'] as AxisName[]).map((axis) => (
          <span key={`rotate-${axis}`} className="inspector-control-row">
            {rotationSteps.map(({ label, value }) => (
              <button key={`rotate-${axis}-minus-${label}`} type="button" disabled={!canEdit} onClick={() => onRotate(axis, -value)}>
                -{label} {axis.toUpperCase()}
              </button>
            ))}
            {rotationSteps.map(({ label, value }) => (
              <button key={`rotate-${axis}-plus-${label}`} type="button" disabled={!canEdit} onClick={() => onRotate(axis, value)}>
                +{label} {axis.toUpperCase()}
              </button>
            ))}
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
