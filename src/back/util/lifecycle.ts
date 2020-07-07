export type Disposable = {
  toDispose: Disposable[];
  isDisposed: boolean;
  callback?: () => void;
}

export function dispose<T>(disposable: Disposable) {
  if (disposable.isDisposed) {
    return;
  }

  disposable.isDisposed = true;
  clearDisposable(disposable);
  if (disposable.callback) {
    disposable.callback();
  }
}

export function clearDisposable(disposable: Disposable) {
  disposable.toDispose.forEach(d => dispose(d));
  disposable.toDispose = [];
}

export function registerDisposable(parent: Disposable, child: Disposable) {
  if (parent == child) {
    throw new Error('Cannot add disposable to itself!');
  }
  if (parent.isDisposed) {
    throw new Error('Cannot add disposable to already disposed parent!');
  }
  parent.toDispose.push(child);
}

export function newDisposable(): Disposable {
  return {
    toDispose: [],
    isDisposed: false
  };
}
