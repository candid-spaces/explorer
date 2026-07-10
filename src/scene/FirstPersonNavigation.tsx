import { useEffect, useMemo, useRef } from 'react';
import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

interface FirstPersonNavigationProps {
  enabled: boolean;
  onPointerLockChange?: (isLocked: boolean) => void;
}

type MovementKey = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down' | 'fast';

const BASE_SPEED_UNITS_PER_SECOND = 5.5;
const FAST_SPEED_MULTIPLIER = 2.2;
const POINTER_LOCK_SELECTOR = '.scene-canvas';

function movementKeyForEvent(event: KeyboardEvent): MovementKey | undefined {
  switch (event.code) {
    case 'KeyW':
      return 'forward';
    case 'KeyS':
      return 'backward';
    case 'KeyA':
      return 'left';
    case 'KeyD':
      return 'right';
    case 'Space':
      return 'up';
    case 'ControlLeft':
    case 'ControlRight':
      return 'down';
    case 'ShiftLeft':
    case 'ShiftRight':
      return 'fast';
    default:
      return undefined;
  }
}

export function FirstPersonNavigation({ enabled, onPointerLockChange }: FirstPersonNavigationProps) {
  const { camera } = useThree();
  const pressedKeys = useRef<Set<MovementKey>>(new Set());
  const isLocked = useRef(false);
  const scratch = useMemo(() => ({
    forward: new Vector3(),
    right: new Vector3(),
    direction: new Vector3(),
    up: new Vector3(0, 1, 0),
  }), []);

  useEffect(() => {
    if (!enabled) {
      pressedKeys.current.clear();
      isLocked.current = false;
      onPointerLockChange?.(false);
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const movementKey = movementKeyForEvent(event);

      if (!movementKey) {
        return;
      }

      pressedKeys.current.add(movementKey);

      if (movementKey === 'up' || movementKey === 'down') {
        event.preventDefault();
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      const movementKey = movementKeyForEvent(event);

      if (!movementKey) {
        return;
      }

      pressedKeys.current.delete(movementKey);
    }

    function handleBlur() {
      pressedKeys.current.clear();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      pressedKeys.current.clear();
    };
  }, [enabled, onPointerLockChange]);

  useFrame((_, delta) => {
    if (!enabled || !isLocked.current || pressedKeys.current.size === 0) {
      return;
    }

    const keys = pressedKeys.current;
    const { forward, right, direction, up } = scratch;

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    right.copy(forward).cross(up).normalize();
    direction.set(0, 0, 0);

    if (keys.has('forward')) direction.add(forward);
    if (keys.has('backward')) direction.sub(forward);
    if (keys.has('right')) direction.add(right);
    if (keys.has('left')) direction.sub(right);
    if (keys.has('up')) direction.y += 1;
    if (keys.has('down')) direction.y -= 1;

    if (direction.lengthSq() === 0) {
      return;
    }

    const speed = BASE_SPEED_UNITS_PER_SECOND * (keys.has('fast') ? FAST_SPEED_MULTIPLIER : 1);
    camera.position.addScaledVector(direction.normalize(), speed * delta);
  });

  if (!enabled) {
    return null;
  }

  return (
    <PointerLockControls
      selector={POINTER_LOCK_SELECTOR}
      onLock={() => {
        isLocked.current = true;
        onPointerLockChange?.(true);
      }}
      onUnlock={() => {
        isLocked.current = false;
        pressedKeys.current.clear();
        onPointerLockChange?.(false);
      }}
    />
  );
}
