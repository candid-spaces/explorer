import type { MeshStandardMaterialParameters } from 'three';
import type { SpatialNode } from '../model/SpatialNode';
import { boxToMeshTransform } from './coordinateMapping';
import { defaultBoxMaterial, unionHighlightMaterial } from './materials';

interface SpatialBoxProps {
  node: SpatialNode;
}

export function SpatialBox({ node }: SpatialBoxProps) {
  const { position, dimensions } = boxToMeshTransform(node.box);
  const material: MeshStandardMaterialParameters = {
    ...defaultBoxMaterial,
    color: node.material.color ?? defaultBoxMaterial.color,
    metalness: node.material.metalness ?? defaultBoxMaterial.metalness,
    roughness: node.material.roughness ?? defaultBoxMaterial.roughness,
    ...(node.unionGroupId ? unionHighlightMaterial : {}),
  };

  return (
    <mesh castShadow receiveShadow position={position} userData={{ spatialNodeId: node.id, unionGroupId: node.unionGroupId }}>
      <boxGeometry args={dimensions} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}
