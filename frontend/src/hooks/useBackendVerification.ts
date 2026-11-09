import { useEffect } from 'react';
import { forwardKinematics } from '@/features/kinematics/forwardKinematics';
import { compareWithReference, VERIFICATION_TOLERANCE } from '@/features/kinematics/verification';
import { ApiError } from '@/services/apiClient';
import { kinematicsApi } from '@/services/kinematicsApi';
import { useAppStore } from '@/stores/appStore';
import { log } from '@/stores/logStore';
import { useRobotStore } from '@/stores/robotStore';

const DEBOUNCE_MS = 400;

/**
 * Cross-checks the real-time TypeScript kinematics against the NumPy reference
 * on the backend. Runs once the pose has been stable for DEBOUNCE_MS — never per
 * animation frame — and cancels in-flight requests when the pose changes.
 */
export function useBackendVerification(): void {
  const geometry = useRobotStore((s) => s.robot.geometry);
  const joints = useRobotStore((s) => s.robot.joints);
  const backendStatus = useAppStore((s) => s.backendStatus);
  const setVerification = useAppStore((s) => s.setVerification);

  useEffect(() => {
    if (backendStatus !== 'online') {
      setVerification({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setVerification({ status: 'pending' });

    const timer = window.setTimeout(async () => {
      const angles: [number, number, number] = [joints[0].angle, joints[1].angle, joints[2].angle];
      try {
        const reference = await kinematicsApi.forward(
          geometry,
          angles,
          joints.map((j) => ({ minAngle: j.minAngle, maxAngle: j.maxAngle })),
          controller.signal,
        );
        const deviation = compareWithReference(forwardKinematics(geometry, angles), reference);
        const checkedAt = Date.now();
        if (deviation <= VERIFICATION_TOLERANCE) {
          setVerification({ status: 'verified', maxDeviation: deviation, checkedAt });
        } else {
          setVerification({ status: 'mismatch', maxDeviation: deviation, checkedAt });
          log.error(
            `Kinematics mismatch with backend reference: max deviation ${deviation.toExponential(2)}`,
          );
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof ApiError ? err.describe() : String(err);
        setVerification({ status: 'error', message });
        log.error(`Reference kinematics check failed: ${message}`);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [geometry, joints, backendStatus, setVerification]);
}
