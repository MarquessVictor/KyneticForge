import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { REFERENCE } from '@/test/fixtures';
import { forwardKinematics } from './forwardKinematics';
import { applyLocalTransform, toThreeMatrix } from './sceneTransforms';

/**
 * Integration between the math and the renderer: builds the same nested group
 * hierarchy as <RobotArm/> and checks that Three.js world positions equal the
 * backend reference for every fixture case.
 */
function buildChain(localTransforms: readonly (readonly number[])[]) {
  const world = new Group();
  const frames: Group[] = [];
  let parent: Group = world;
  for (const m of localTransforms) {
    const g = new Group();
    applyLocalTransform(g, m);
    parent.add(g);
    frames.push(g);
    parent = g;
  }
  world.updateMatrixWorld(true);
  return frames;
}

describe('scene graph ↔ kinematics consistency', () => {
  it('toThreeMatrix keeps row-major element order', () => {
    const m = Array.from({ length: 16 }, (_, i) => i);
    const t = toThreeMatrix(m);
    // Three stores column-major internally: element (row 0, col 3) is index 12.
    expect(t.elements[12]).toBe(3);
    expect(t.elements[1]).toBe(4);
  });

  it('applyLocalTransform disables automatic matrix composition', () => {
    const g = new Group();
    applyLocalTransform(
      g,
      forwardKinematics(REFERENCE.defaultRobot.geometry, [0.1, 0.2, 0.3]).localTransforms[0],
    );
    expect(g.matrixAutoUpdate).toBe(false);
    g.position.set(5, 5, 5); // must be ignored
    g.updateMatrixWorld(true);
    expect(new Vector3().setFromMatrixPosition(g.matrixWorld).x).not.toBe(5);
  });

  it.each(REFERENCE.cases.map((c) => [c.name, c] as const))(
    'rendered frame origins match the reference: %s',
    (_name, c) => {
      const fk = forwardKinematics(c.geometry, c.jointAngles);
      const frames = buildChain(fk.localTransforms);
      frames.forEach((frame, i) => {
        const p = new Vector3().setFromMatrixPosition(frame.matrixWorld);
        const expected = c.expected.frames[i]!.slice(0, 3).map((row) => row[3]!);
        expect(p.x).toBeCloseTo(expected[0]!, 9);
        expect(p.y).toBeCloseTo(expected[1]!, 9);
        expect(p.z).toBeCloseTo(expected[2]!, 9);
      });
      const tcp = new Vector3().setFromMatrixPosition(frames[2]!.matrixWorld);
      expect(tcp.toArray()).toEqual(
        c.expected.endEffectorPosition.map((v) => expect.closeTo(v, 9) as unknown as number),
      );
    },
  );
});
