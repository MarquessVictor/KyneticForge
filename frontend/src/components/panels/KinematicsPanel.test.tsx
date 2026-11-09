import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/stores/appStore';
import { useRobotStore } from '@/stores/robotStore';
import { KinematicsPanel } from './KinematicsPanel';

beforeEach(() => {
  useRobotStore.getState().newScratch();
  useAppStore.getState().setMathView('simple');
});

describe('<KinematicsPanel />', () => {
  it('shows the computed end-effector position and follows joint changes', () => {
    render(<KinematicsPanel />);
    act(() => {
      const s = useRobotStore.getState();
      s.setJointAngle('j1', 0);
      s.setJointAngle('j2', 0);
      s.setJointAngle('j3', 0);
    });
    expect(screen.getByTestId('ee-x')).toHaveTextContent('0.7000');
    expect(screen.getByTestId('ee-y')).toHaveTextContent('0.0000');
    expect(screen.getByTestId('ee-z')).toHaveTextContent('0.3000');

    act(() => {
      useRobotStore.getState().setJointAngle('j2', Math.PI / 2);
    });
    expect(screen.getByTestId('ee-x')).toHaveTextContent('0.0000');
    expect(screen.getByTestId('ee-z')).toHaveTextContent('1.0000');
  });

  it('converts to the display unit', () => {
    render(<KinematicsPanel />);
    act(() => {
      const s = useRobotStore.getState();
      s.setJointAngle('j1', 0);
      s.setJointAngle('j2', 0);
      s.setJointAngle('j3', 0);
      s.setDisplayUnit('mm');
    });
    expect(screen.getByTestId('ee-x')).toHaveTextContent('700.0');
  });

  it('toggles between simple and detailed views', async () => {
    const user = userEvent.setup();
    render(<KinematicsPanel />);
    expect(screen.queryByText('T0→3')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'detailed' }));
    expect(screen.getByText('T0→3')).toBeInTheDocument();
    expect(screen.getByText('Denavit–Hartenberg table')).toBeInTheDocument();
  });
});
