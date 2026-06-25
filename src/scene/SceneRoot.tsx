import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { SpatialDocument } from '../model/SpatialDocument';
import { dimensionsFromNodes } from '../model/room';
import { CornerRoom } from './CornerRoom';
import { Lighting } from './Lighting';
import { ContentPrimitive } from './ContentPrimitive';
import { SpatialPrimitive } from './SpatialPrimitive';

interface SceneRootProps {
  document: SpatialDocument;
}

export function SceneRoot({ document }: SceneRootProps) {
  const roomDimensions = dimensionsFromNodes(document.renderNodes);

  return (
    <Canvas className="scene-canvas" shadows gl={{ antialias: true }}>
      <color attach="background" args={['#151820']} />
      <PerspectiveCamera makeDefault position={[14, 11, 18]} fov={45} />
      <Lighting />
      <CornerRoom {...roomDimensions} />
      {document.renderNodes.map((node) => (
        node.content?.kind ? <ContentPrimitive key={node.id} node={node} /> : <SpatialPrimitive key={node.id} node={node} />
      ))}
      <OrbitControls target={[6, 5, 4]} maxPolarAngle={Math.PI / 2.02} />
    </Canvas>
  );
}
