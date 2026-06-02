import { floorMaterial, wallMaterial } from './materials';

const ROOM_SIZE = 28;
const WALL_HEIGHT = 18;

export function CornerRoom() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[ROOM_SIZE / 2, 0, ROOM_SIZE / 2]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial {...floorMaterial} />
      </mesh>

      <mesh receiveShadow position={[ROOM_SIZE / 2, WALL_HEIGHT / 2, 0]}>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial {...wallMaterial} />
      </mesh>

      <mesh receiveShadow rotation={[0, Math.PI / 2, 0]} position={[0, WALL_HEIGHT / 2, ROOM_SIZE / 2]}>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial {...wallMaterial} color="#cfc8bc" />
      </mesh>

      <gridHelper args={[ROOM_SIZE, ROOM_SIZE, '#ffffff', '#ffffff']} position={[ROOM_SIZE / 2, 0.01, ROOM_SIZE / 2]} />
    </group>
  );
}
