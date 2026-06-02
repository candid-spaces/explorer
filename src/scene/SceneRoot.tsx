import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { SpatialDocument } from '../model/SpatialDocument';
import { CornerRoom } from './CornerRoom';
import { Lighting } from './Lighting';
import { SpatialNodeRenderer } from './SpatialNodeRenderer';

interface SceneRootProps {
  document: SpatialDocument;
}

export function SceneRoot({ document }: SceneRootProps) {
  return (
    <Canvas className="scene-canvas" shadows gl={{ antialias: true }}>
      <color attach="background" args={['#151820']} />
      <PerspectiveCamera makeDefault position={[14, 11, 18]} fov={45} />
      <Lighting />
      <CornerRoom />
      {document.nodes.map((node) => (
        <SpatialNodeRenderer key={node.id} node={node} document={document} />
      ))}
      <OrbitControls target={[6, 5, 4]} maxPolarAngle={Math.PI / 2.02} />
    </Canvas>
  );
}
