import { debounce } from '@shared/utils/debounce';
import * as chokidar from 'chokidar';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { WrappedEventEmitter } from './WrappedEventEmitter';

type IMap<K extends string | number, V> = { [key in K]: V; };

export type FolderWatcherOptions = {
  recursionDepth?: number;
  changeDebounce?: number;
}

export interface FolderWatcher {
  on  (event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  /** Emitted after the folder has been set and all filenames has been fetched. */
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
 * Watches a folder and its child files/folders for changes using chokidar.
 * Recursive watching is optional.
 * An instance of this can only be used to watch one folder once, you can not watch after aborting.
 */
export class FolderWatcher extends WrappedEventEmitter {
  /** Chokidar watcher instance. */
  protected _watcher: chokidar.FSWatcher | undefined;
  /** Map of child files/folders of the watched folder (["filename"] = "file stats"). */
  protected _files: IMap<string, fs.Stats> = {};
  /** The file names of all files in the folder. */
  protected _filenames: string[] = [];
  /** Path of the folder this is managing. */
  protected _folderPath: string | undefined;
  /** How deep this will recursively watch sub-folders (0 for no recursion, -1 for infinite recursion). */
  protected _recursionDepth = 0;
  /** How long to wait to only trigger a single change emit */
  protected _changeDebounce: number | undefined;
  /** If this is watching a folder. */
  protected _isWatching = false;
  /** Relative path from the root's folder to this' folder. */
  protected _pathOffset = '';

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
    return this._isWatching;
  }

  /** Path of the folder this is managing. */
  getFolder(): string | undefined {
    return this._folderPath;
  }

  /**
   * @param folderPath Path of the folder to watch.
   * @param opts Folder watcher options
   */
  constructor(folderPath?: string, opts?: FolderWatcherOptions) {
    super();
    if (folderPath !== undefined) { this.watch(folderPath, opts); }
  }

  /**
   * Set the folder this should watch.
   * If this is already watching a folder, it will immediately abort.
   *
   * @param folderPath Path of the folder to watch.
   * @param opts Folder watcher options
   */
  watch(folderPath: string, opts?: FolderWatcherOptions): void {
    // Abort if already watching a folder.
    if (this._isWatching) { return; }
    this._isWatching = true;

    // Set values
    this._folderPath = folderPath;
    if (opts?.recursionDepth !== undefined) {
      this._recursionDepth = opts.recursionDepth;
    }
    if (opts?.changeDebounce !== undefined) {
      this._changeDebounce = opts.changeDebounce;
    }

    // Calculate depth for chokidar
    const depth = this._recursionDepth === -1
      ? undefined  // Infinite recursion
      : this._recursionDepth;

    // Create chokidar watcher
    this._watcher = chokidar.watch(folderPath, {
      persistent: false,
      ignoreInitial: false,
      depth: depth,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 25
      }
    });

    // Handle initial add events
    this._watcher.on('add', (filePath: string, stats?: fs.Stats) => {
      const relativePath = path.relative(folderPath, filePath);
      const filename = path.basename(filePath);
      const offsetPath = path.dirname(relativePath);

      if (stats) {
        this._files[filename] = stats;
        if (!this._filenames.includes(filename)) {
          this._filenames.push(filename);
        }
        this.emit('add', filename, offsetPath === '.' ? '' : offsetPath);
      }
    });

    // Handle add directory events
    this._watcher.on('addDir', (filePath: string, stats?: fs.Stats) => {
      if (filePath === folderPath) { return; } // Skip the root folder itself

      const relativePath = path.relative(folderPath, filePath);
      const filename = path.basename(filePath);
      const offsetPath = path.dirname(relativePath);

      if (stats) {
        this._files[filename] = stats;
        if (!this._filenames.includes(filename)) {
          this._filenames.push(filename);
        }
        this.emit('add', filename, offsetPath === '.' ? '' : offsetPath);
      }
    });

    const onChange = (filePath: string) => {
      const relativePath = path.relative(folderPath, filePath);
      const filename = path.basename(filePath);
      const offsetPath = path.dirname(relativePath);

      this.emit('change', filename, offsetPath === '.' ? '' : offsetPath);
    };
    const onChangeWrapped = this._changeDebounce !== undefined ?
      debounce(onChange, this._changeDebounce):
      onChange;

    // Handle change events
    this._watcher.on('change', onChangeWrapped);

    // Handle unlink (remove) events
    this._watcher.on('unlink', (filePath: string) => {
      const relativePath = path.relative(folderPath, filePath);
      const filename = path.basename(filePath);
      const offsetPath = path.dirname(relativePath);

      const stats = this._files[filename];
      const index = this._filenames.indexOf(filename);

      if (index !== -1) {
        this._filenames.splice(index, 1);
      }
      delete this._files[filename];

      if (stats) {
        this.emit('remove', filename, stats, offsetPath === '.' ? '' : offsetPath);
      }
    });

    // Handle unlink directory events
    this._watcher.on('unlinkDir', (filePath: string) => {
      if (filePath === folderPath) { return; }

      const relativePath = path.relative(folderPath, filePath);
      const filename = path.basename(filePath);
      const offsetPath = path.dirname(relativePath);

      const stats = this._files[filename];
      const index = this._filenames.indexOf(filename);

      if (index !== -1) {
        this._filenames.splice(index, 1);
      }
      delete this._files[filename];

      if (stats) {
        this.emit('remove', filename, stats, offsetPath === '.' ? '' : offsetPath);
      }
    });

    // Handle ready event
    this._watcher.on('ready', () => {
      this.emit('ready');
    });

    // Handle errors
    this._watcher.on('error', (error: any) => {
      this.emit('error', error);
    });
  }

  /**
   * Abort watching the folder.
   * Note: You can NOT use this instance to watch a folder, you have to create a new instance for that.
   */
  async abort(): Promise<void> {
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = undefined;
    }
    this._isWatching = false;
    this._files = {};
    this._filenames = [];
  }

  getFile(filepath: string[]): fs.Stats | undefined {
    const filename = filepath[filepath.length - 1];
    return this._files[filename];
  }
}
