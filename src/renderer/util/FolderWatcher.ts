import * as fs from 'fs';
import { WrappedEventEmitter } from './WrappedEventEmitter';

export type ChangeEventType = 'rename' | 'change';

/** Wrapper around nodes file watcher. */
export interface FolderWatcher {
  /** Emitted after the folder has been set and all filenames has been fetched. */
  on(event: 'ready', listener: () => void): this;
  /** Emitted any time a file inside the folder has been changed. */
  on(event: 'change', listener: (eventType: ChangeEventType, filename: string) => void): this;
  /** Emitted when an file is added (or renamed to this). */
  on(event: 'add', listener: (filename: string) => void): this;
  /** Emtited when a file is removed (or renamed to something else). */
  on(event: 'remove', listener: (filename: string) => void): this;
  /** Emitted any time an uncaught error occurs. */
  on(event: 'error', listener: (error: Error) => void): this;
}

/** A watcher for a single folder. */
export class FolderWatcher extends WrappedEventEmitter {
  /** Node folder watcher that this is a wrapper around. */
  protected _watcher: fs.FSWatcher | undefined;
  /** The file names of all files in the folder. */
  protected _filenames: string[] = [];
  /** Path of the folder this is managing. */
  protected _folderPath: string | undefined;

  /** The file names of all files in the folder. */
  get filenames(): string[] {
    return this._filenames;
  }

  /** Path of the folder this is managing. */
  getFolder(): string | undefined {
    return this._folderPath;
  }

  constructor(folderPath?: string) {
    super();
    if (folderPath !== undefined) { this.setFolder(folderPath); }
  }

  /** Set the folder this should manage. */
  setFolder(folderPath: string): void {
    // Reset
    this.reset();
    // Set folder path
    this._folderPath = folderPath;
    // Check if the folder exists
    fs.stat(folderPath, (error, stats) => {
      if (error) { throw error; }
      // Make sure folder path is not invalid
      if (this._folderPath === undefined) { throw new Error(`Failed to setFolder. "folderPath" was unexpectedly set to undefined.`); }
      // Load the filenames of all files in the folder
      fs.readdir(this._folderPath, (error, files) => {
        if (error) { throw error; }
        this.setFilenames(files);
        this.emit('ready');
      });
      // Watch folder for changes
      this._watcher = fs.watch(this._folderPath, (eventType, filename) => {
        // Update filenames array
        if (eventType === 'rename') {
          const index = this._filenames.indexOf(filename);
          if (index === -1) { // (New file or existing file was renamed to this)
            this._filenames.push(filename);
            this.emit('add', filename);
          } else { // (Existing file was renamed from this)
            this._filenames.splice(index, 1);
            this.emit('remove', filename);
          }
        }
        // Emit
        this.emit('change', eventType, filename);
      });
      this._watcher.on('error', (error: Error) => {
        this.emit('error', error);
      });
    });
  }

  /** Reset the watcher. Returns it to the original state of a newly created folder watcher. */
  reset() {
    // Reset folder path
    if (this._folderPath !== undefined) {
      this._folderPath = undefined;
    }
    // Remove watcher
    if (this._watcher) {
      this._watcher.close();
      this._watcher = undefined;
    }
    // Clear array
    if (this._filenames.length > 0) {
      this._filenames.length = 0;
    }
  }

  /** Update the filenames array. */
  private setFilenames(filenames: string[]): void {
    // Update filenames array
    // (Updating this first makes the updated array available to the event listeners)
    const curFilenames = this.filenames;
    this._filenames = filenames;
    // Find all removed filenames (and emit about it)
    for (let i = 0; i < curFilenames.length; i++) {
      const filename = curFilenames[i];
      if (filenames.indexOf(filename) === -1) {
        this.emit('remove', filename);
      }
    }
    // Find all added filenames (and emit about it)
    for (let i = 0; i < filenames.length; i++) {
      const filename = filenames[i];
      if (curFilenames.indexOf(filename) === -1) {
        this.emit('add', filename);
      }
    }
  }
}
