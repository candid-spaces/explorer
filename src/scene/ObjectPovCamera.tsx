import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Euler, Quaternion, Vector3 } from 'three';
import type { SpatialNode } from '../model/SpatialNode';
import type { SpatialTransform } from '../model/transform';

interface ObjectPovCameraProps {
  node: SpatialNode;
}

const SCENE_CANVAS_SELECTOR = '.scene-canvas';
const POINTER_TILT_RADIANS_PER_PIXEL = 0.004;
const MIN_PITCH = -Math.PI / 2 + 0.08;
const MAX_PITCH = Math.PI / 2 - 0.08;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function viewTransformForNode(node: SpatialNode): SpatialTransform {
  return node.worldTransform ?? node.transform;
}

function eyeOffsetForNode(node: SpatialNode): Vector3 {
  const height = Math.max(0.1, node.bounds.maxY - node.bounds.minY);
  const width = Math.max(0.1, node.bounds.maxX - node.bounds.minX);
  const depth = Math.max(0.1, node.bounds.maxZ - node.bounds.minZ);
  const forwardClearance = Math.min(Math.max(Math.min(width, depth) * 0.08, 0.05), 0.35);

  return new Vector3(0, height * 0.18, -forwardClearance);
}

export function ObjectPovCamera({ node }: ObjectPovCameraProps) {
  const { camera, gl } = useThree();
  const tilt = useRef({ yaw: 0, pitch: 0 });
  const activePointerId = useRef<number | undefined>(undefined);
  const previousPointer = useRef({ x: 0, y: 0 });
  const scratch = useMemo(() => ({
    baseEuler: new Euler(0, 0, 0, 'XYZ'),
    baseQuaternion: new Quaternion(),
    tiltEuler: new Euler(0, 0, 0, 'YXZ'),
    tiltQuaternion: new Quaternion(),
    eyeOffset: new Vector3(),
    position: new Vector3(),
  }), []);

  useEffect(() => {
    tilt.current = { yaw: 0, pitch: 0 };
  }, [node.id]);

  useEffect(() => {
    const domElement = gl.domElement;

    function isScenePointer(event: PointerEvent): boolean {
      return event.target instanceof Element && event.target.closest(SCENE_CANVAS_SELECTOR) === domElement;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!isScenePointer(event)) {
        return;
      }

      activePointerId.current = event.pointerId;
      previousPointer.current = { x: event.clientX, y: event.clientY };
      domElement.setPointerCapture(event.pointerId);
      event.preventDefault();
    }

    function handlePointerMove(event: PointerEvent) {
      if (activePointerId.current !== event.pointerId) {
        return;
      }

      const nextX = event.clientX;
      const nextY = event.clientY;
      const deltaX = nextX - previousPointer.current.x;
      const deltaY = nextY - previousPointer.current.y;

      tilt.current.yaw -= deltaX * POINTER_TILT_RADIANS_PER_PIXEL;
      tilt.current.pitch = clamp(
        tilt.current.pitch - deltaY * POINTER_TILT_RADIANS_PER_PIXEL,
        MIN_PITCH,
        MAX_PITCH,
      );
      previousPointer.current = { x: nextX, y: nextY };
      event.preventDefault();
    }

    function handlePointerUp(event: PointerEvent) {
      if (activePointerId.current !== event.pointerId) {
        return;
      }

      activePointerId.current = undefined;
      if (domElement.hasPointerCapture(event.pointerId)) {
        domElement.releasePointerCapture(event.pointerId);
      }
    }

    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerup', handlePointerUp);
    domElement.addEventListener('pointercancel', handlePointerUp);

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', handlePointerUp);
      domElement.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [gl.domElement]);

  useFrame(() => {
    const transform = viewTransformForNode(node);
    const { baseEuler, baseQuaternion, eyeOffset, position, tiltEuler, tiltQuaternion } = scratch;

    baseEuler.set(...transform.rotation, 'XYZ');
    baseQuaternion.setFromEuler(baseEuler);
    tiltEuler.set(tilt.current.pitch, tilt.current.yaw, 0, 'YXZ');
    tiltQuaternion.setFromEuler(tiltEuler);

    eyeOffset.copy(eyeOffsetForNode(node)).applyQuaternion(baseQuaternion);
    position.set(...transform.position).add(eyeOffset);

    camera.position.copy(position);
    camera.quaternion.copy(baseQuaternion).multiply(tiltQuaternion);
    camera.updateProjectionMatrix();
  });

  return null;
}
