import { debounce as debounceBack, eventAggregator } from '@back/util/debounce';
import { debounce as debounceFront } from '@renderer/util/debounce';

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

  test('Debounce Back', () => {
    // Setup debounce func
    let lastNum = 0;
    const callbackFunc = jest.fn((num) => lastNum = num);
    const debounceFunc = debounceBack(callbackFunc, 100);
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

  test('Debounce Front', () => {
    // Setup debounce func
    let lastNum = 0;
    const callbackFunc = jest.fn((num) => lastNum = num);
    const debounceFunc = debounceFront(callbackFunc, 100);
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