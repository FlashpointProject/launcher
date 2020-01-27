import { SimpleButton } from '@renderer/components/SimpleButton';
import { configure, shallow } from 'enzyme';
import * as Adapter from 'enzyme-adapter-react-16';
import * as React from 'react';

configure({ adapter: new Adapter() });

describe('Simple Button', () => {
  test('No ClassName Addition', () => {
    const component = shallow(
      <SimpleButton>EXAMPLE</SimpleButton>
    );
    expect(component.hasClass('simple-button')).toBeTruthy();
  });

  test('ClassName Addition', () => {
    const component = shallow(
      <SimpleButton className='test-class'>EXAMPLE</SimpleButton>
    );
    expect(component.hasClass('simple-button')).toBeTruthy();
    expect(component.hasClass('test-class')).toBeTruthy();
  });
});