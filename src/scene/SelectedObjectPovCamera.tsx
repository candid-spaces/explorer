import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Euler, Quaternion, Vector3 } from 'three';
import type { SpatialNode } from '../model/SpatialNode';
import type { SpatialTransform } from '../model/transform';

const CAMERA_FORWARD = new Vector3(0, 0, -1);
const DEFAULT_SURFACE_MARGIN = 0.25;

export interface SelectedObjectPov {
  position: [number, number, number];
  rotation: [number, number, number];
}

export function selectedObjectPovFromTransform(
  transform: SpatialTransform,
  surfaceMargin = DEFAULT_SURFACE_MARGIN,
): SelectedObjectPov {
  const rotation = new Euler(...transform.rotation, 'XYZ');
  const orientation = new Quaternion().setFromEuler(rotation);
  const forward = CAMERA_FORWARD.clone().applyQuaternion(orientation).normalize();
  const depth = Math.abs(transform.scale[2]);
  const position = new Vector3(...transform.position).addScaledVector(forward, depth / 2 + surfaceMargin);

  return {
    position: [position.x, position.y, position.z],
    rotation: transform.rotation,
  };
}

interface SelectedObjectPovCameraProps {
  selectedNode?: SpatialNode;
}

export function SelectedObjectPovCamera({ selectedNode }: SelectedObjectPovCameraProps) {
  const { camera } = useThree();
  const transform = selectedNode?.worldTransform ?? selectedNode?.transform;

  useEffect(() => {
    if (!transform) {
      return;
    }

    const pov = selectedObjectPovFromTransform(transform);

    camera.position.set(...pov.position);
    camera.rotation.set(...pov.rotation, 'XYZ');
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }, [camera, transform]);

  return null;
}
