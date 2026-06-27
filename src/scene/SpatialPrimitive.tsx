import { RoundedBoxGeometry } from '@react-three/drei';
import type { MeshPhysicalMaterialParameters, MeshStandardMaterialParameters } from 'three';
import type { SpatialGeometry } from '../model/geometry';
import { normalizedDslStrength, normalizedRoundedBoxRadius } from './primitiveGeometry';
import type { SpatialNode } from '../model/SpatialNode';
import { defaultBoxMaterial, unionHighlightMaterial } from './materials';
import { resolveMaterialTextures } from './textureRegistry';

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
    case 'box': {
      const radius = normalizedRoundedBoxRadius(geometry);

      if (radius > 0) {
        const puff = normalizedDslStrength(geometry.puff) ?? 0;

        return <RoundedBoxGeometry args={[1, 1, 1]} radius={radius} smoothness={8 + Math.round(puff * 8)} bevelSegments={4} />;
      }

      return <boxGeometry args={[1, 1, 1]} />;
    }
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}

function textureBumpScale(node: SpatialNode): number | undefined {
  const bumpStrength = normalizedDslStrength(node.material.textures?.bumpMap?.strength);

  return bumpStrength === undefined ? undefined : bumpStrength * 0.045;
}

export function materialParameters(node: SpatialNode): MeshPhysicalMaterialParameters {
  const textureParameters = resolveMaterialTextures(node.material);
  const bumpScale = textureBumpScale(node);

  return {
    ...defaultBoxMaterial,
    color: node.material.color ?? defaultBoxMaterial.color,
    metalness: node.material.metalness ?? defaultBoxMaterial.metalness,
    roughness: node.material.roughness ?? defaultBoxMaterial.roughness,
    ...textureParameters,
    ...(textureParameters.bumpMap && bumpScale !== undefined ? { bumpScale } : {}),
    ...(node.unionGroupId ? unionHighlightMaterial : {}),
  };
}

export function needsPhysicalMaterial(node: SpatialNode): boolean {
  return Boolean(node.material.textures?.normalMap);
}

export function SpatialPrimitive({ node }: SpatialPrimitiveProps) {
  const { position, rotation, scale } = node.transform;
  const material = materialParameters(node);

  return (
    <mesh
      castShadow
      receiveShadow
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{
        spatialNodeId: node.id,
        unionGroupId: node.unionGroupId,
        geometry: node.geometry.kind,
        rotation,
      }}
    >
      <PrimitiveGeometry geometry={node.geometry} />
      {needsPhysicalMaterial(node) ? (
        <meshPhysicalMaterial {...material} />
      ) : (
        <meshStandardMaterial {...(material as MeshStandardMaterialParameters)} />
      )}
    </mesh>
  );
}
