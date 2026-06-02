import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { Box3, Group, Vector3 } from 'three';
import type { SpatialNode } from '../model/SpatialNode';
import { boxToMeshTransform } from './coordinateMapping';

interface ImportedSpatialModelProps {
  node: SpatialNode;
}

export function ImportedSpatialModel({ node }: ImportedSpatialModelProps) {
  const importPath = node.directives.import ?? '';
  const gltf = useGLTF(resolveImportUrl(importPath));
  const { position, dimensions } = boxToMeshTransform(node.worldBox);
  const fittedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const bounds = new Box3().setFromObject(clone);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const safeSize = new Vector3(size.x || 1, size.y || 1, size.z || 1);
    const scale = new Vector3(dimensions[0] / safeSize.x, dimensions[1] / safeSize.y, dimensions[2] / safeSize.z);
    const group = new Group();

    clone.position.sub(center);
    group.scale.copy(scale);
    group.add(clone);

    return group;
  }, [dimensions, gltf.scene]);

  return <primitive object={fittedScene} position={position} userData={{ spatialNodeId: node.id, importPath }} />;
}

function resolveImportUrl(importPath: string): string {
  if (importPath.startsWith('/') || importPath.startsWith('http://') || importPath.startsWith('https://')) {
    return importPath;
  }

  return `/models/${importPath}`;
}
