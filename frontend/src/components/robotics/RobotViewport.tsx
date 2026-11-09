import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useAppStore } from '@/stores/appStore';
import { useRobotStore } from '@/stores/robotStore';
import { RobotArm } from './RobotArm';
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET } from './sceneConstants';
import { CameraResetter, FloorGrid, SceneLighting, WorldAxes } from './SceneHelpers';
import { ViewportOverlay } from './ViewportOverlay';

/**
 * Interactive 3D viewer. Uses `frameloop="demand"`: a frame is rendered only
 * when the scene changes or the camera moves, so an idle viewer costs nothing.
 */
export function RobotViewport() {
  const view = useAppStore((s) => s.view);
  const select = useRobotStore((s) => s.select);

  return (
    <div className="relative h-full w-full bg-ink-900" data-testid="viewport">
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{
          position: DEFAULT_CAMERA_POSITION,
          up: [0, 0, 1],
          fov: 40,
          near: 0.005,
          far: 200,
        }}
        onPointerMissed={() => select(null)}
        aria-label="3D robot viewport"
      >
        <color attach="background" args={['#0d1014']} />
        <SceneLighting />
        {view.showGrid && <FloorGrid />}
        {view.showAxes && <WorldAxes />}
        <RobotArm />
        <OrbitControls
          makeDefault
          target={DEFAULT_CAMERA_TARGET}
          enableDamping={false}
          minDistance={0.1}
          maxDistance={30}
        />
        <CameraResetter />
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport axisColors={['#e5484d', '#46a758', '#3e8ef7']} labelColor="#0d1014" />
        </GizmoHelper>
      </Canvas>
      <ViewportOverlay />
    </div>
  );
}
