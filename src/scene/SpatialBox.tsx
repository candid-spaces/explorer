import type { MeshStandardMaterialParameters } from 'three';
import type { DslBoxSpec, DslMaterialSpec } from '../dsl/types';
import type { SpatialNode } from '../model/SpatialNode';
import { boxToMeshTransform } from './coordinateMapping';
import { defaultBoxMaterial, unionHighlightMaterial } from './materials';

interface SpatialBoxProps {
  node: SpatialNode;
  box?: DslBoxSpec;
  materialSpec?: DslMaterialSpec;
}

export function SpatialBox({ node, box = node.worldBox, materialSpec = node.resolvedMaterial }: SpatialBoxProps) {
  const { position, dimensions } = boxToMeshTransform(box);
  const material: MeshStandardMaterialParameters = {
    ...defaultBoxMaterial,
    color: materialSpec.color ?? defaultBoxMaterial.color,
    metalness: materialSpec.metalness ?? defaultBoxMaterial.metalness,
    roughness: materialSpec.roughness ?? defaultBoxMaterial.roughness,
    ...(node.unionGroupId ? unionHighlightMaterial : {}),
  };

  return (
    <mesh castShadow receiveShadow position={position} userData={{ spatialNodeId: node.id, unionGroupId: node.unionGroupId }}>
      <boxGeometry args={dimensions} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}
