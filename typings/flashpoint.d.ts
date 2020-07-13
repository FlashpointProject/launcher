// Type definitions for flashpoint-launcher 9.0.0
// Project: Flashpoint Launcher https://github.com/FlashpointProject/launcher
// Definitions by: Flashpoint Project https://github.com/FlashpointProject

declare module 'flashpoint' {

  /** Version of the Flashpoint Launcher */
  export const version: string;

  /** Log functions to properly pass messages to the Logs Page. Automatically fills with Extension name. */
  export namespace log {
    export const trace: (message: string) => void;
    export const debug: (message: string) => void;
    export const info:  (message: string) => void;
    export const warn:  (message: string) => void;
    export const error: (message: string) => void;
  }

  export namespace commands {
    /**
     * Register a command to be called by name later
     * @param command Name of the command
     * @param callback Function to run when called
     * @returns Disposable to register to context.subscriptions
     */
    export function registerCommand(command: string, callback: (...args: any[]) => any): Disposable;
  }

  /** A self-nesting type that allows one time disposable with an optional callback */
  export type Disposable = {
    /** Children to dispose of in the future */
    toDispose: Disposable[];
    /** Whether this is already disposed */
    isDisposed: boolean;
    /** Callback to use when disposed */
    onDispose?: () => void;
  }

  /** Dispose of a disposable and all its children */
  export function dispose<T>(disposable: Disposable): void;
  /** Dispose of all a disposable;s children but not itself */
  export function clearDisposable(disposable: Disposable): void;
  /** Register a disposable to its parent. They must not be the same. */
  export function registerDisposable(parent: Disposable, child: Disposable): void;
  /** Creates Disposable data to fill a newly created Disposable type object */
  export function newDisposable(callback?: () => void): Disposable;

  export type ExtensionContext = {
    /** Put all extension disposables on here with registerDisposable */
    subscriptions: Disposable;
  };
}
