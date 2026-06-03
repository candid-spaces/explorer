import type { MeshStandardMaterialParameters } from 'three';
import type { SpatialGeometry } from '../model/geometry';
import type { SpatialNode } from '../model/SpatialNode';
import { defaultBoxMaterial, unionHighlightMaterial } from './materials';

interface SpatialPrimitiveProps {
  node: SpatialNode;
}

function PrimitiveGeometry({ geometry }: { geometry: SpatialGeometry }) {
  switch (geometry.kind) {
    case 'cylinder':
      return <cylinderGeometry args={[0.5, 0.5, 1, 48]} />;
    case 'cone':
      return <coneGeometry args={[0.5, 1, 48]} />;
    case 'sphere':
      return <sphereGeometry args={[0.5, 48, 24]} />;
    case 'box':
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}

export function SpatialPrimitive({ node }: SpatialPrimitiveProps) {
  const { position, dimensions } = node.geometry;
  const material: MeshStandardMaterialParameters = {
    ...defaultBoxMaterial,
    color: node.material.color ?? defaultBoxMaterial.color,
    metalness: node.material.metalness ?? defaultBoxMaterial.metalness,
    roughness: node.material.roughness ?? defaultBoxMaterial.roughness,
    ...(node.unionGroupId ? unionHighlightMaterial : {}),
  };

  return (
    <mesh
      castShadow
      receiveShadow
      position={position}
      scale={dimensions}
      userData={{ spatialNodeId: node.id, unionGroupId: node.unionGroupId, geometry: node.geometry.kind }}
    >
      <PrimitiveGeometry geometry={node.geometry} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}
