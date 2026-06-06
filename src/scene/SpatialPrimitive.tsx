import { RoundedBoxGeometry } from '@react-three/drei';
import type { MeshPhysicalMaterialParameters, MeshStandardMaterialParameters } from 'three';
import type { SpatialGeometry } from '../model/geometry';
import type { SpatialNode } from '../model/SpatialNode';
import { defaultBoxMaterial, unionHighlightMaterial } from './materials';
import { bumpTexturePreset, fabricTexturePreset } from './materialTexturePresets';

interface SpatialPrimitiveProps {
  node: SpatialNode;
}

const COMPACT_STRENGTH_MAX = 5;

function normalizedDslStrength(value?: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Math.min(Math.max(value, 0), COMPACT_STRENGTH_MAX) / COMPACT_STRENGTH_MAX;
}

function normalizedRoundedBoxRadius(geometry: SpatialGeometry): number {
  const radius = geometry['box-radius'] ?? 0;
  const puff = normalizedDslStrength(geometry.puff) ?? 0;

  if (radius <= 0 && puff <= 0) {
    return 0;
  }

  const smallestDimension = Math.min(...geometry.dimensions);

  if (smallestDimension <= 0) {
    return 0;
  }

  const puffRadius = puff * smallestDimension * 0.28;
  const clampedRadius = Math.min(Math.max(radius, puffRadius), smallestDimension / 2);

  return clampedRadius / smallestDimension;
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

function materialParameters(node: SpatialNode): MeshPhysicalMaterialParameters {
  const fabric = normalizedDslStrength(node.material.fabric) ?? 0;
  const sheen = normalizedDslStrength(node.material.sheen) ?? (fabric > 0 ? fabric * 0.65 : undefined);
  const clearcoat = normalizedDslStrength(node.material.clearcoat);
  const bump = normalizedDslStrength(node.material.bump);
  const fabricMap = fabricTexturePreset(node.material.fabric);
  const bumpMap = bumpTexturePreset(node.material.bump, node.material.fabric);

  return {
    ...defaultBoxMaterial,
    color: node.material.color ?? defaultBoxMaterial.color,
    metalness: node.material.metalness ?? defaultBoxMaterial.metalness,
    roughness: node.material.roughness ?? (fabric > 0 ? Math.max(defaultBoxMaterial.roughness ?? 0, 0.74) : defaultBoxMaterial.roughness),
    ...(fabricMap ? { roughnessMap: fabricMap } : {}),
    ...(bumpMap ? { bumpMap, bumpScale: (bump ?? fabric * 0.4) * 0.045 } : {}),
    ...(sheen === undefined ? {} : { sheen, sheenRoughness: Math.max(node.material.roughness ?? 0.75, 0.55) }),
    ...(clearcoat === undefined ? {} : { clearcoat, clearcoatRoughness: Math.max(0.03, 1 - clearcoat) * 0.35 }),
    ...(node.unionGroupId ? unionHighlightMaterial : {}),
  };
}

function needsPhysicalMaterial(node: SpatialNode): boolean {
  return node.material.fabric !== undefined || node.material.sheen !== undefined || node.material.clearcoat !== undefined;
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
