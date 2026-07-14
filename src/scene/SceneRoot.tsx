import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { SpatialDocument } from '../model/SpatialDocument';
import { dimensionsFromNodes } from '../model/room';
import { CornerRoom } from './CornerRoom';
import { Lighting } from './Lighting';
import { ContentPrimitive } from './ContentPrimitive';
import { CsgPrimitive } from './CsgPrimitive';
import { SpatialPrimitive } from './SpatialPrimitive';
import { nodesForRoomSizing } from './roomSizing';
import { ObjectPovCamera } from './ObjectPovCamera';
import type { SpatialNode } from '../model/SpatialNode';

interface SceneRootProps {
  document: SpatialDocument;
  selectedNodeId?: string;
  onSelectNode?: (id: string | undefined) => void;
  navigationMode?: 'orbit' | 'object-pov';
  selectedNode?: SpatialNode;
}

export function SceneRoot({ document: spatialDocument, selectedNodeId, selectedNode, onSelectNode, navigationMode = 'orbit' }: SceneRootProps) {
  const roomDimensions = dimensionsFromNodes(nodesForRoomSizing(spatialDocument));
  const isObjectPov = navigationMode === 'object-pov' && selectedNode !== undefined;

  return (
    <Canvas
      className="scene-canvas"
      shadows
      gl={{ antialias: true }}
      onPointerMissed={() => {
        onSelectNode?.(undefined);
      }}
    >
      <color attach="background" args={['#151820']} />
      <PerspectiveCamera makeDefault position={[14, 11, 18]} fov={45} />
      <Lighting />
      <CornerRoom {...roomDimensions} />
      {spatialDocument.csgExpressions.map((expression) => (
        <CsgPrimitive
          key={expression.id}
          expression={expression}
          isSelected={expression.base.id === selectedNodeId}
          onSelect={onSelectNode}
        />
      ))}
      {spatialDocument.renderNodes.map((node) => (
        node.content?.kind ? (
          <ContentPrimitive key={node.id} isSelected={node.id === selectedNodeId} node={node} onSelect={onSelectNode} />
        ) : (
          <SpatialPrimitive key={node.id} isSelected={node.id === selectedNodeId} node={node} onSelect={onSelectNode} />
        )
      ))}
      {isObjectPov ? <ObjectPovCamera node={selectedNode} /> : <OrbitControls target={[6, 5, 4]} maxPolarAngle={Math.PI} />}
    </Canvas>
  );
}
