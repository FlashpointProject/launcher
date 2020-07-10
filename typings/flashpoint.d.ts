// Type definitions for flashpoint-launcher 9.0.0
// Project: Flashpoint Launcher https://github.com/FlashpointProject/launcher
// Definitions by: Flashpoint Project https://github.com/FlashpointProject

declare module 'flashpoint' {

  /** Version of the Flashpoint Launcher */
  export const version: string;
  export const extManifest: IExtensionManifest;

  /** Log functions to properly pass to the Logs Page */
  export type ExtensionLogFunc = (message: string) => void;
  export namespace log {
    export const trace: ExtensionLogFunc;
    export const debug: ExtensionLogFunc;
    export const info:  ExtensionLogFunc;
    export const warn:  ExtensionLogFunc;
    export const error: ExtensionLogFunc;
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

  export type Disposable = {
    toDispose: Disposable[];
    isDisposed: boolean;
    callback?: () => void;
  };

  /** Disposes of itself and all its children */
  export function dispose<T>(disposable: Disposable): void;
  /** Disposes of all its children but not itself */
  export function clearDisposable(disposable: Disposable): void;
  /** Register a disposable to its parent (usually context.subscriptions) */
  export function registerDisposable(parent: Disposable, child: Disposable): void;
  /** Create a new disposable with optional callback - Should be registered afterwards! */
  export function newDisposable(callback?: () => void): Disposable;

  export type ExtensionContext = {
    /** Put all extension disposables on here with registerDisposable */
    subscriptions: Disposable;
  };

  export type DevScript = {
    name: string;
    description: string;
    command: string;
  }

  export type Theme = {
    folder: string;
  }

  export type Contributions = {
    themes: Theme[]; // TODO Implement
    devScripts: DevScript[];
  }

  export interface IExtensionManifest {
    name: string;
    displayName?: string;
    author: string;
    version: string;
    launcherVersion: string;
    description?: string;
    icon?: string;
    main?: string;
    contributes?: Contributions;
  }
}
