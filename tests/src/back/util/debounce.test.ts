import { debounce } from '@shared/utils/debounce';
import { eventAggregator } from '@back/util/EventAggregator';

jest.useFakeTimers();

describe('Debounce Related Utils', () => {
  test('Event Aggregator', () => {
    // Setup event aggregator func
    const lastNum: number[] = [];
    const callbackFunc = jest.fn((num) => lastNum.push(num));
    const aggregateFunc = eventAggregator(callbackFunc, {time: 100});
    // Call '2' twice to test uniqueness
    aggregateFunc(1);
    aggregateFunc(2);
    aggregateFunc(2);
    aggregateFunc(3);
    // Wait for timers
    expect(callbackFunc).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(callbackFunc).toHaveBeenCalledTimes(3);
    expect(lastNum).toEqual([1,2,3]);
  });

  test('Debounce', () => {
    // Setup debounce func
    let lastNum = 0;
    const callbackFunc = jest.fn((num) => lastNum = num);
    const debounceFunc = debounce(callbackFunc, 100);
    // Call 3 times, execute once
    debounceFunc(1);
    debounceFunc(2);
    debounceFunc(3);
    // Wait for timers
    expect(callbackFunc).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(callbackFunc).toHaveBeenCalledTimes(1);
    expect(lastNum).toBe(3);
  });
});