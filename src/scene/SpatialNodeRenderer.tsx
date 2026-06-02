import { Suspense } from 'react';
import type { SpatialDocument } from '../model/SpatialDocument';
import type { SpatialNode } from '../model/SpatialNode';
import { ImportedSpatialModel } from './ImportedSpatialModel';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import { SpatialBox } from './SpatialBox';

interface SpatialNodeRendererProps {
  node: SpatialNode;
  document: SpatialDocument;
}

export function SpatialNodeRenderer({ node, document }: SpatialNodeRendererProps) {
  const hasRenderableChildren = (node.children?.length ?? 0) > 0;
  const target = node.refTargetId ? document.nodeIndex.get(node.refTargetId) : undefined;

  return (
    <group userData={{ spatialNodeId: node.id, namespacePath: node.namespacePath }}>
      {node.directives.import ? (
        <ModelErrorBoundary key={node.directives.import} fallback={<SpatialBox node={node} />}>
          <Suspense fallback={<SpatialBox node={node} />}>
            <ImportedSpatialModel node={node} />
          </Suspense>
        </ModelErrorBoundary>
      ) : target && !target.children?.length ? (
        <SpatialBox node={node} materialSpec={target.resolvedMaterial} />
      ) : target ? (
        <SpatialBox node={node} materialSpec={target.resolvedMaterial} />
      ) : hasRenderableChildren ? null : (
        <SpatialBox node={node} />
      )}
      {(node.children ?? []).map((child) => (
        <SpatialNodeRenderer key={child.id} node={child} document={document} />
      ))}
    </group>
  );
}
