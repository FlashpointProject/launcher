import { delayedThrottle, delayedThrottleAsync, throttle } from '@shared/utils/throttle';

describe('Throttle Utils', () => {
  beforeAll(async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
  });

  it('throttle', () => {
    const cb = jest.fn();
    const throttledFunc = throttle(cb, 100);
    // First call
    throttledFunc();
    expect(cb).toBeCalledTimes(1);

    // Second call - Too early, throttle
    throttledFunc();
    expect(cb).toBeCalledTimes(1);

    // Throttle expired, will now run again
    jest.runAllTimers();
    throttledFunc();
    expect(cb).toBeCalledTimes(2);
  });

  const delayedThrottleTestFactory = (delayedThrottle: (callback: () => any, time:number) => any) => {
    return () => {
      const cb = jest.fn();
      const delayedThrottleFunc = delayedThrottle(cb, 100);

      // First call, wait 100ms to run
      delayedThrottleFunc(cb);
      expect(cb).toBeCalledTimes(0);
      jest.runAllTimers();
      expect(cb).toBeCalledTimes(1);

      // 2 calls at once, only latest should call, first ignored
      delayedThrottleFunc(cb);
      delayedThrottleFunc(cb);
      expect(cb).toBeCalledTimes(1);
      jest.runAllTimers();
      expect(cb).toBeCalledTimes(2);
    };
  };

  it('delayedThrottle', delayedThrottleTestFactory(delayedThrottle));

  it('delayedThrottleAsync', delayedThrottleTestFactory(delayedThrottleAsync));
});
