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

  export namespace games {
    /** Event fired when a game launches, returns the launched game */
    export const onDidLaunchGame: Event<Game>;
  }

  export type Game = {
    /** ID of the game (unique identifier) */
    id: string;
    /** ID of the game which owns this game */
    parentGameId?: string;
    /** Full title of the game */
    title: string;
    /** Any alternate titles to match against search */
    alternateTitles: string;
    /** Game series the game belongs to (empty string if none) */
    series: string;
    /** Name of the developer(s) of the game (developer names are separated by ',') */
    developer: string;
    /** Name of the publisher of the game */
    publisher: string;
    /** Date-time of when the game was added to collection */
    dateAdded: string;
    /** Date-time of when the game was added to collection */
    dateModified: string;
    /** Platform the game runs on (Flash, HTML5, Shockwave etc.) */
    platform: string;
    /** If the game is "broken" or not */
    broken: boolean;
    /** Game is not suitable for children */
    extreme: boolean;
    /** If the game is single player or multiplayer, and if the multiplayer is cooperative or not */
    playMode: string;
    /** How playable the game is */
    status: string;
    /** Information that could be useful for the player (of varying importance) */
    notes: string;
    /** List of tags attached to the game */
    tags: string[];
    /** Source if the game files, either full URL or the name of the website */
    source: string;
    /** Path to the application that runs the game */
    applicationPath: string;
    /** Command line argument(s) passed to the application to launch the game */
    launchCommand: string;
    /** Date of when the game was released */
    releaseDate: string;
    /** Version of the game */
    version: string;
    /** Original description of the game (probably given by the game's creator or publisher) */
    originalDescription: string;
    /** The language(s) the game is in */
    language: string;
    /** Library this game belongs to */
    library: string;
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

  export interface Event<T> {
    /**
		 * A function that represents an event to which you subscribe by calling it with
		 * a listener function as argument.
		 *
		 * @param listener The listener function will be called when the event happens.
		 * @param thisArgs The `this`-argument which will be used when calling the event listener.
		 * @param disposables An array to which a [disposable](#Disposable) will be added.
		 * @return A disposable which unsubscribes the event listener.
		 */
    (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable): Disposable;
  }
}
