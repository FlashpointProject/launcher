import * as fs from 'fs';
import * as path from 'path';
import { eventAggregator } from './EventAggregator';
import { EventQueue } from './EventQueue';
import { WrappedEventEmitter } from './WrappedEventEmitter';

type IMap<K extends string | number, V> = { [key in K]: V; };

export type FolderWatcherOptions = {
  recursionDepth?: number;
}

export interface FolderWatcher {
  on  (event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  /** Emitted after the folder has been set and all filenames has been fetched (does NOT include contents of sub-folders). */
  on  (event: 'ready', listener: () => void): this;
  once(event: 'ready', listener: () => void): this;
  /** Emitted when a file has been changed (does NOT include "rename"). */
  on  (event: 'change', listener: (filename: string, offsetPath: string) => void): this;
  once(event: 'change', listener: (filename: string, offsetPath: string) => void): this;
  /** Emitted when an file is added (or renamed to this). */
  on  (event: 'add', listener: (filename: string, offsetPath: string) => void): this;
  once(event: 'add', listener: (filename: string, offsetPath: string) => void): this;
  /** Emitted when a file is removed (or renamed to something else). */
  on  (event: 'remove', listener: (filename: string, stats: fs.Stats, offsetPath: string) => void): this;
  once(event: 'remove', listener: (filename: string, stats: fs.Stats, offsetPath: string) => void): this;
  /** Emitted any time an uncaught error occurs. */
  on  (event: 'error', listener: (error: Error) => void): this;
  once(event: 'error', listener: (error: Error) => void): this;
}

/**
 * Watches a folder and it's child files/folders for changes.
 * Recursive watching is optional.
 * An instance of this can only be used to watch one folder once, you can not watch after aborting.
 * Wrapper around Node's file watcher.
 */
export class FolderWatcher extends WrappedEventEmitter {
  /** Node folder watcher that this is a wrapper around. */
  protected _watcher: fs.FSWatcher | undefined;
  /** Map of child files/folders of the watched folder (["filename"] = "file stats"). */
  protected _files: IMap<string, fs.Stats> = {};
  /** The file names of all files in the folder. */
  protected _filenames: string[] = [];
  /** Event queue for editing the files map and array. */
  protected _queue: EventQueue = new EventQueue();
  /** Path of the folder this is managing. */
  protected _folderPath: string | undefined;
  /** How deep this will recursively watch sub-folders (0 for no recursion, -1 for infinite recursion). */
  protected _recursionDepth: number = 0;
  /** Watchers for the sub-folders (empty if the recursion depth is 0) */
  protected _childWatchers: IMap<string, FolderWatcher> = {};
  /** If this is watching a folder. */
  protected _isWatching: boolean = false;
  /** Watcher of the "parent" folder (undefined if this is the root watcher). */
  protected _parentWatcher: FolderWatcher | undefined = undefined;
  /** Relative path from the root's folder to this' folder. It's an empty string for the root folder. */
  protected _pathOffset: string = '';

  /** The file names of all files in the folder. */
  get filenames(): string[] {
    return this._filenames;
  }

  /** The file stats of all files in the folder. */
  get files(): IMap<string, fs.Stats> {
    return this._files;
  }

  /** How deep this will recursively watch sub-folders (0 for no recursion, -1 for infinite recursion). */
  get recursionDepth(): number {
    return this._recursionDepth;
  }

  /** If this is watching a folder. */
  get isWatching(): boolean {
    return this.isWatching;
  }

  /** Path of the folder this is managing. */
  getFolder(): string | undefined {
    return this._folderPath;
  }

  /**
   * @param folderPath Path of the folder to watch.
   * @param recursionDepth Options.
   */
  constructor(folderPath?: string, opts?: FolderWatcherOptions) {
    super();
    if (folderPath !== undefined) { this.watch(folderPath, opts); }
  }

  /**
   * Set the folder this should watch.
   * If this is already watching a folder, it will immediately abort.
   * @param folderPath Path of the folder to watch.
   * @param recursionDepth Options.
   */
  watch(folderPath: string, opts?: FolderWatcherOptions): void {
    // Abort if already watching a folder.
    if (this._isWatching) { return; }
    this._isWatching = true;
    // Set values
    this._folderPath = folderPath;
    if (opts) {
      if (opts.recursionDepth !== undefined) { this._recursionDepth = opts.recursionDepth; }
    }
    // Check if the folder exists
    fs.stat(folderPath, (error, stats) => {
      if (error) {
        this.emit('error', error);
      } else if (this._folderPath === undefined) {
        this.emit('error', new Error('Failed to setFolder. "folderPath" was unexpectedly set to undefined.'));
      } else {
        // Load the filenames of all files in the folder
        fs.readdir(this._folderPath, (error, files) => {
          if (error) { this.emit('error', error); }
          else { this.onWatchedFolderRead(files); }
        });
        // Watch folder for changes
        this._watcher = fs.watch(
          this._folderPath, { persistent: false },
          eventAggregator(this.onWatcherChange.bind(this), { time: 25 })
        );
        fixFsWatcher(this._watcher); // (Fix a bug with node/electron)
        // Relay errors
        this._watcher.on('error', (error: Error) => {
          this.emit('error', error);
        });
      }
    });
  }

  /**
   * Abort watching the folder.
   * Note: You can NOT use this instance to watch a folder, you have to create a new instance for that.
   */
  abort() {
    // Close watcher
    if (this._watcher) {
      this._watcher.close();
    }
    // Abort sub-watchers
    for (let key in this._childWatchers) {
      this._childWatchers[key].abort();
    }
    this._childWatchers = {};
    // @TODO Clear the event queue and the currently executing event
  }

  getFile(filepath: string[]): fs.Stats | undefined {
    let folder: FolderWatcher | undefined = this;
    const length = filepath.length - 1;
    for (let i = 0; i < length; i++) {
      folder = folder._childWatchers[filepath[i]];
      if (!folder) { return undefined; }
    }
    return folder._files[filepath[length]];
  }

  /**
   * Update the filenames array.
   * @param filenames Array of filenames to replace the current array with.
   */
  protected setFilenames(filenames: string[]): void {
    // Update filenames array
    // (Updating this first makes the updated array available to the event listeners)
    const curFilenames = this.filenames;
    // Find all removed filenames (and emit about it)
    for (let i = 0; i < curFilenames.length; i++) {
      const filename = curFilenames[i];
      if (filenames.indexOf(filename) === -1) {
        this.removeFile(filename);
      }
    }
    // Find all added filenames (and emit about it)
    for (let i = 0; i < filenames.length; i++) {
      const filename = filenames[i];
      if (curFilenames.indexOf(filename) === -1) {
        this.addFile(filename);
      }
    }
  }

  /** Called when the watched folder is read. This happens once per "watch" call. */
  protected onWatchedFolderRead(files: string[]): void {
    // Set initial filenames
    this.setFilenames(files);
    // Emit event after all initial files as been added
    this._queue.push(() => { this.emit('ready'); });
  }

  /** Called when a child file is changed. */
  protected onWatcherChange(eventType: string, filename: string): void {
    // Update filenames array
    if (eventType === 'rename') {
      const index = this._filenames.indexOf(filename);
      if (index === -1) { // (New file or existing file was renamed to this)
        this.addFile(filename);
      } else { // (Existing file was renamed from this)
        this.removeFile(filename);
      }
    } else { // (Change)
      this.emit('change', filename, this._pathOffset);
    }
  }

  /**
   * Call this when a file has been added to the watched folder.
   * @param filename Filename of the added file.
   */
  protected addFile(filename: string): void {
    this._queue.push(new Promise<void>((resolve, reject) => {
      // Get the stats of the file, then add it to the map
      const filePath = path.join(this._folderPath || '', filename);
      fs.stat(filePath, (error, stats) => {
        if (error) {
          reject(error); // @TODO Retry a few times, depending on the error?
        } else {
          // Try recursively watch the file
          if (this._recursionDepth > 0 || this._recursionDepth === -1) {
            if (stats.isDirectory()) {
              // Create child watcher
              const childWatcher = new FolderWatcher(
                path.join(this._folderPath || '', filename), {
                  // Set the child's recursion depth to one less than its parent's (unless its already 0 or below)
                  recursionDepth: (this._recursionDepth <= 0) ? this._recursionDepth : (this._recursionDepth - 1)
                }
              );
              FolderWatcher.setAsChildWatcher(this, childWatcher, filename);
              // Relay it's events to this
              childWatcher.on('add',    this.emit.bind(this, 'add'));
              childWatcher.on('remove', this.emit.bind(this, 'remove'));
              childWatcher.on('change', this.emit.bind(this, 'change'));
              childWatcher.on('error',  this.emit.bind(this, 'error'));
              // Add it to map
              this._childWatchers[filename] = childWatcher;
            }
          }
          // Add the file
          this._filenames.push(filename);
          this._files[filename] = stats;
          this.emit('add', filename, this._pathOffset);
          resolve();
        }
      });
    }));
  }

  /**
   * Call this when a file has been removed from the watched folder.
   * @param filename Filename of the removed file.
   */
  protected removeFile(filename: string): void {
    this._queue.push(() => {
      // Remove from array
      const index = this._filenames.indexOf(filename);
      this._filenames.splice(index, 1);
      // Remove from map
      delete this._files[filename];
      // Remove child watcher
      const childWatcher = this._childWatchers[filename];
      if (childWatcher) {
        delete this._childWatchers[filename];
        childWatcher.abort();
      }
      // Emit
      this.emit('remove', filename, this._pathOffset);
    });
  }

  /**
   * Turn a watcher into a child watcher.
   * @param parentWatcher Watcher of the parent folder.
   * @param childWatcher Watcher of a folder inside the parent folder.
   * @param filename Filename of the folder the child watcher is watching.
   */
  protected static setAsChildWatcher(parentWatcher: FolderWatcher, childWatcher: FolderWatcher, filename: string): void {
    childWatcher._parentWatcher = parentWatcher;
    childWatcher._pathOffset = path.join(parentWatcher._pathOffset, filename);
  }
}

// Fix of FSWatcher "fs.js:1370".
// Note: For some reason the "onchange" is busted because it incorrectly uses "this".
//       Hopefully this is fixed in the newest version of node/electron.
function fixFsWatcher(watcher: fs.FSWatcher) {
  (watcher as any)._handle.onchange = (watcher as any)._handle.onchange.bind(watcher);
}
