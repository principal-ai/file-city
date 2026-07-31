/**
 * CityLights - Shared lighting rig for FileCity3D
 *
 * Provides ambient, hemisphere, and directional lighting for the city scene.
 * Extracted from CityScene so multiple CityContent instances share one set
 * of lights in a multi-city layout.
 */
export interface CityLightsProps {
  citySize: number;
}

export function CityLights({ citySize }: CityLightsProps) {
  return (
    <>
      <ambientLight intensity={1.2} />
      <hemisphereLight args={['#ddeeff', '#667788', 0.8]} position={[0, citySize, 0]} />
      <directionalLight
        position={[citySize, citySize * 1.5, citySize * 0.5]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight
        position={[-citySize * 0.5, citySize * 0.8, -citySize * 0.5]}
        intensity={1}
      />
      <directionalLight position={[citySize * 0.3, citySize, citySize]} intensity={0.6} />
    </>
  );
}
