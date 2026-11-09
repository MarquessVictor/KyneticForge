import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRobotStore } from '@/stores/robotStore';
import { degToRad, radToDeg } from '@/utils/units';
import { JointControl } from './JointControl';

function renderJoint(index: 0 | 1 | 2) {
  const Wrapper = () => {
    const joint = useRobotStore((s) => s.robot.joints[index]);
    return <JointControl joint={joint} />;
  };
  return render(<Wrapper />);
}

const elbow = () => useRobotStore.getState().robot.joints[2];

beforeEach(() => {
  useRobotStore.getState().newScratch();
});

describe('<JointControl />', () => {
  it('shows the angle in degrees and the limits', () => {
    renderJoint(2);
    expect(screen.getByLabelText('Elbow angle')).toHaveValue('-75.00');
    expect(screen.getByText('min -150.0°')).toBeInTheDocument();
    expect(screen.getByText('max 150.0°')).toBeInTheDocument();
  });

  it('slider changes update the store in radians', () => {
    renderJoint(2);
    fireEvent.change(screen.getByLabelText('Elbow angle slider'), { target: { value: '45' } });
    expect(elbow().angle).toBeCloseTo(degToRad(45), 12);
  });

  it('typing a value commits on Enter', async () => {
    const user = userEvent.setup();
    renderJoint(2);
    const input = screen.getByLabelText('Elbow angle');
    await user.clear(input);
    await user.type(input, '12.5{Enter}');
    expect(radToDeg(elbow().angle)).toBeCloseTo(12.5, 10);
    expect(input).toHaveValue('12.50');
  });

  it('values outside the limits are clamped and flagged', async () => {
    const user = userEvent.setup();
    renderJoint(2);
    const input = screen.getByLabelText('Elbow angle');
    await user.clear(input);
    await user.type(input, '500{Enter}');
    expect(radToDeg(elbow().angle)).toBeCloseTo(150, 10);
    expect(screen.getByRole('alert')).toHaveTextContent('Limits: -150.0° to 150.0°');
  });

  it('rejects text that is not a number', async () => {
    const user = userEvent.setup();
    renderJoint(2);
    const input = screen.getByLabelText('Elbow angle');
    await user.clear(input);
    await user.type(input, 'abc{Enter}');
    expect(radToDeg(elbow().angle)).toBeCloseTo(-75, 10);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid number');
  });

  it('reset button returns the joint to home and is disabled at home', async () => {
    const user = userEvent.setup();
    renderJoint(2);
    const reset = screen.getByRole('button', { name: 'Reset Elbow to home' });
    expect(reset).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Elbow angle slider'), { target: { value: '0' } });
    expect(reset).toBeEnabled();
    await user.click(reset);
    expect(elbow().angle).toBe(elbow().homeAngle);
  });

  it('selects the joint when interacted with', async () => {
    const user = userEvent.setup();
    renderJoint(1);
    await user.click(screen.getByRole('button', { name: /^J2\s*Shoulder$/ }));
    expect(useRobotStore.getState().selected).toBe('j2');
  });
});
