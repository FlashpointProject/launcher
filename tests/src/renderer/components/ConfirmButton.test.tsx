import { ConfirmButton } from '@renderer/components/ConfirmButton';
import { configure, shallow } from 'enzyme';
import * as Adapter from 'enzyme-adapter-react-16';
import * as React from 'react';

configure({ adapter: new Adapter() });

describe('Confirm Button', () => {
  test('Confirm Click', () => {
    // Setup component
    const mockCallback = jest.fn();
    const component = shallow(
      <ConfirmButton
        onConfirm={mockCallback}
        >EXAMPLE</ConfirmButton>
    );
    // Click twice to confirm
    component.simulate('click');
    expect(mockCallback).not.toHaveBeenCalled();
    component.simulate('click');
    expect(mockCallback).toHaveBeenCalled();
  });

  test('Skip Confirm Click', () => {
    // Setup component
    const mockCallback = jest.fn();
    const component = shallow(
      <ConfirmButton
        onConfirm={mockCallback}
        skipConfirm={true}
        >EXAMPLE</ConfirmButton>
    );
    // Click twice to confirm
    component.simulate('click');
    expect(mockCallback).toHaveBeenCalled();
  });

  test('Confirm Reset (Mouse Left)', () => {
    // Setup component
    const mockCallback = jest.fn();
    const component = shallow(
      <ConfirmButton
        onConfirm={mockCallback}
        >EXAMPLE</ConfirmButton>
    );
    // Click twice to confirm
    component.simulate('click');
    expect(component.state('showConfirm')).toBeTruthy();
    component.simulate('mouseleave');
    expect(component.state('showConfirm')).toBeFalsy();
  });
});