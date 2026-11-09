import { lazy, Suspense, useEffect } from 'react';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { useBackendVerification } from '@/hooks/useBackendVerification';
import { useRobotStore } from '@/stores/robotStore';
import { EventLog } from '../panels/EventLog';
import { GeometryPanel } from '../panels/GeometryPanel';
import { JointControlsPanel } from '../panels/JointControlsPanel';
import { KinematicsPanel } from '../panels/KinematicsPanel';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { RobotTree } from '../panels/RobotTree';
import { TopBar } from './TopBar';

// The 3D stack (three.js + R3F + drei) is the heaviest dependency; load it as its own chunk.
const RobotViewport = lazy(() =>
  import('../robotics/RobotViewport').then((m) => ({ default: m.RobotViewport })),
);

function ViewportFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-ink-900 text-xs text-ink-400">
      Loading 3D viewport…
    </div>
  );
}

/**
 * Main workbench layout:
 *   top bar / [left: hierarchy + properties] [center: 3D] [right: joints + math] / bottom: events
 * Below the `lg` breakpoint the side panels stack under the viewport.
 */
export function AppShell() {
  useBackendHealth();
  useBackendVerification();

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useRobotStore.getState().dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside
          className="order-2 shrink-0 border-ink-700 bg-ink-900 lg:order-1 lg:w-72 lg:overflow-y-auto lg:border-r"
          aria-label="Robot structure"
        >
          <RobotTree />
          <PropertiesPanel />
          <GeometryPanel />
        </aside>

        <main className="order-1 flex min-h-[55vh] min-w-0 flex-1 flex-col lg:order-2 lg:min-h-0">
          <div className="min-h-0 flex-1">
            <Suspense fallback={<ViewportFallback />}>
              <RobotViewport />
            </Suspense>
          </div>
          <div className="hidden h-36 shrink-0 border-t border-ink-700 bg-ink-900 lg:block">
            <EventLog />
          </div>
        </main>

        <aside
          className="order-3 shrink-0 border-ink-700 bg-ink-900 lg:w-[22rem] lg:overflow-y-auto lg:border-l"
          aria-label="Joint control and kinematics"
        >
          <JointControlsPanel />
          <KinematicsPanel />
        </aside>

        <div className="order-4 h-48 shrink-0 border-t border-ink-700 bg-ink-900 lg:hidden">
          <EventLog />
        </div>
      </div>
    </div>
  );
}
