import { configure, shallow, mount } from 'enzyme';
import * as Adapter from 'enzyme-adapter-react-16';
import * as React from 'react';
import { AutoProgressComponent, StatusBar, ProgressBar } from '@renderer/components/ProgressComponents';
import { ProgressData } from '@renderer/context/ProgressContext';
import toJson from 'enzyme-to-json';

configure({ adapter: new Adapter() });

describe('Progress Components', () => {
  test('Auto Select Component', () => {
    const mockDataStatus = createMockData();
    const componentStatus = shallow(
      <AutoProgressComponent progressData={mockDataStatus} wrapperClass={'TestSuccess'} />
    );
    expect(toJson(componentStatus)).toMatchSnapshot();

    const mockDataProgress = {...createMockData(), usePercentDone: true};
    const componentProgress = shallow(
      <AutoProgressComponent progressData={mockDataProgress} wrapperClass={'TestSuccess'} />
    );
    expect(toJson(componentProgress)).toMatchSnapshot();
  });

  test('Stop Render When Done', () => {
    const mockDataDone = {...createMockData(), isDone: true};
    const component = shallow(
      <AutoProgressComponent progressData={mockDataDone} wrapperClass={'TestSuccess'} />
    );
    expect(toJson(component)).toMatchSnapshot();
  });

  test('Status Bar Render', () => {
    const mockData = createMockData();
    const component = mount(
      <StatusBar progressData={mockData} wrapperClass={'TestSuccess'} />
    );
    expect(toJson(component)).toMatchSnapshot();
  });

  test('Progress Bar Render', () => {
    const mockData = createMockData();
    const component = mount(
      <ProgressBar progressData={mockData} wrapperClass={'TestSuccess'} />
    );
    expect(toJson(component)).toMatchSnapshot();
  });
});

function createMockData(): ProgressData {
  return {
    key: 'test',
    percentDone: 0,
    usePercentDone: false,
    isDone: false,
    text: 'TestSuccess',
    secondaryText: 'TestSuccess',
    itemCount: 0,
    totalItems: 0
  };
}