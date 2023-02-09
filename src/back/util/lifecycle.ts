/** A self-nesting type that allows one time disposable with an optional callback */
export type Disposable = {
  /** Children to dispose of in the future */
  toDispose: Disposable[];
  /** Whether this is already disposed */
  isDisposed: boolean;
  /** Callback to use when disposed */
  onDispose?: () => void;
}

/**
 * Dispose of a disposable and all its children
 *
 * @param disposable
 */
export function dispose(disposable: Disposable) {
  if (disposable.isDisposed) {
    return;
  }

  disposable.isDisposed = true;
  clearDisposable(disposable);
  if (disposable.onDispose) {
    disposable.onDispose();
  }
}

/**
 * Dispose of all a disposable's children but not itself
 *
 * @param disposable
 */
export function clearDisposable(disposable: Disposable) {
  disposable.toDispose.forEach(d => dispose(d));
  disposable.toDispose = [];
}

/**
 * Register a disposable to its parent. They must not be the same.
 *
 * @param parent
 * @param child
 */
export function registerDisposable(parent: Disposable, child: Disposable) {
  if (parent == child) {
    throw new Error('Cannot add disposable to itself!');
  }
  if (parent.isDisposed) {
    throw new Error('Cannot add disposable to already disposed parent!');
  }
  parent.toDispose.push(child);
}

/**
 * Creates Disposable data to fill a newly created Disposable type object
 *
 * @param onDispose
 */
export function newDisposable(onDispose?: () => void): Disposable {
  return {
    toDispose: [],
    isDisposed: false,
    onDispose: onDispose
  };
}
