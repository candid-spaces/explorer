export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#fff7e8', '#586070', 0.85]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        intensity={2.1}
        position={[10, 16, 9]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-12}
      />
    </>
  );
}
