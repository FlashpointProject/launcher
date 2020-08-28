import { clearDisposable, dispose, newDisposable, registerDisposable } from '@back/util/lifecycle';

describe('Lifecycle', () => {
  test('Register Disposables', () => {
    const dispA = newDisposable();
    const dispB = newDisposable();
    const dispC = newDisposable();

    registerDisposable(dispA, dispB);
    registerDisposable(dispB, dispC);

    expect(dispA.toDispose[0]).toEqual(dispB);
    expect(dispA.toDispose[0].toDispose[0]).toEqual(dispC);
  });

  test('Prevent Self Registration', () => {
    const dispA = newDisposable();

    expect(() => registerDisposable(dispA, dispA)).toThrow();
  });

  test('Clear Disposable', () => {
    const callbackFunc = jest.fn();
    const dispA = newDisposable(callbackFunc);
    const dispB = newDisposable(callbackFunc);

    registerDisposable(dispA, dispB);
    clearDisposable(dispA);

    expect(dispA.isDisposed).toBeFalsy();
    expect(dispB.isDisposed).toBeTruthy();
    expect(callbackFunc).toHaveBeenCalledTimes(1);
  });

  test('Disposable Chain Reaction', () => {
    const callbackFunc = jest.fn();
    const dispA = newDisposable(callbackFunc);
    const dispB = newDisposable(callbackFunc);
    const dispC = newDisposable(callbackFunc);

    registerDisposable(dispA, dispB);
    registerDisposable(dispB, dispC);

    dispose(dispA);

    expect(dispA.isDisposed).toBeTruthy();
    expect(dispB.isDisposed).toBeTruthy();
    expect(dispC.isDisposed).toBeTruthy();
    expect(callbackFunc).toHaveBeenCalledTimes(3);
  });
});
