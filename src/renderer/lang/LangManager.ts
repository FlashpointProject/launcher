import { remote } from 'electron';
import { readFile } from 'fs-extra';
import * as path from 'path';
import { RecursivePartial } from '../../shared/interfaces';
import { autoCode, LangContainer, LangFile, LangFileContent } from '../../shared/lang';
import { deepCopy, recursiveReplace, tryParseJSON } from '../../shared/Util';
import { EventQueue } from '../util/EventQueue';
import { FolderWatcher } from '../util/FolderWatcher';
import { getDefaultLocalization } from '../util/lang';
import { WrappedEventEmitter } from '../util/WrappedEventEmitter';

export interface LangManager {
  /** Emitted when the language list has been changed (added / removed / renamed). */
  on(event: 'list-change', listener: (list: LangFile[]) => void): this;
  off(event: 'list-change', listener: (list: LangFile[]) => void): this;
  /** Emitted when the combined language container has been changed. */
  on(event: 'update', listener: (item: LangContainer) => void): this;
  off(event: 'update', listener: (item: LangContainer) => void): this;
  /** Emitted when the language manager is done initializing. */
  on(event: 'init', listener: () => void): this;
  off(event: 'init', listener: () => void): this;
}

export class LangManager extends WrappedEventEmitter {
  /** Watcher of the lang folder. */
  private watcher: FolderWatcher = new FolderWatcher();
  /** Event queue for editing the items array (prevents race conditions). */
  private itemsQueue: EventQueue = new EventQueue();
  /** All loaded language files in the language folder. */
  private _items: LangFile[] = [];
  /** All loaded language files in the language folder. */
  private _container: LangContainer | undefined;
  /** If all the files inside the language folder on startup have been loaded. */
  private initialized: boolean = false;

  public get items(): LangFile[] {
    return this._items;
  }

  public get container(): LangContainer {
    if (!this._container) { throw new Error('You must not access "container" before it has been initialized.'); }
    return this._container;
  }

  constructor() {
    super();
    this.watcher.once('ready', () => {
      // Add event listeners
      this.watcher.on('add',    this.onWatcherAdd);
      this.watcher.on('change', this.onWatcherChange);
      this.watcher.on('remove', this.onWatcherRemove);
      // Add initial files
      for (let filename of this.watcher.filenames) {
        this.onWatcherAdd(filename, '');
      }
      // Update initialization flag (after everything in the queue has executed)
      this.itemsQueue.push(() => {
        this.updateContainer();
        this.initialized = true;
        this.emit('init');
      });
    });
    // Watch the language folder
    this.watcher.watch(path.join(
      window.External.isDev
        ? remote.process.cwd()
        : path.dirname(remote.app.getPath('exe')),
      'lang'
    ));
  }

  /**
   * Returns a promise that resolves when this is initialized.
   * Returns undefined if this is already initialized.
   */
  public waitToInit(): Promise<undefined> | undefined {
    if (!this.initialized) {
      return new Promise(resolve => {
        this.once('init', () => { resolve(); });
      });
    }
  }

  private onWatcherAdd = (filename: string, offsetPath: string): void => {
    this.itemsQueue.push(async () => {
      if (!offsetPath) { // (Don't read files in nested folders)
        const item = this.findItem(filename);
        if (!item) {
          const data = await readLangFile(this.getItemPath(filename));
          if (typeof data !== 'number') { // (Not an error code)
            // Add item to array (and recreate the array)
            this._items = [
              ...this._items,
              {
                filename: filename,
                code: filename.split('.')[0].toLowerCase(),
                data: data,
              }
            ];
            // Log
            if (this.initialized) {
              log(`A language file has been added to the language folder (filename: "${filename}")`);
            }
            // Update combined language container
            if (this.initialized) {
              // @TODO Check if the language is either the current or fallback before
              //       updating, to reduce the amount of unnecessary updates.
              this.updateContainer();
            }
            // Emit event
            this.emit('list-change', this._items);
          } else {
            log(`Failed to load or parse language file (filename: "${filename}" error: "${LoadError[data]}")`);
          }
        } else {
          log(`Tried to add a language file that already exists (filename: "${filename}")`);
        }
      }
    });
  }

  private onWatcherRemove = (filename: string, offsetPath: string): void => {
    this.itemsQueue.push(async () => {
      const item = this.findItem(filename);
      if (item) {
        // Find and remove the item from the array (and recreate the array)
        const index = this._items.indexOf(item);
        this._items.splice(index, 1);
        this._items = [ ...this._items ];
        // Log
        if (this.initialized) {
          log(`A language file has been removed from the language folder (filename: "${filename}")`);
        }
        // Emit event
        this.emit('list-change', this._items);
        // Update container
        // @TODO Check if a related container changed (and only update if that happens)
        this.updateContainer();
      }
    });
  }

  private onWatcherChange = (filename: string, offsetPath: string): void => {
    this.itemsQueue.push(async () => {
      const item = this.findItem(filename);
      if (item) {
        const data = await readLangFile(this.getItemPath(filename));
        if (typeof data !== 'number') { // (Not an error code)
          // Update item data
          item.data = data;
          // Recreate the array
          this._items = [ ...this._items ];
          // Log
          if (this.initialized) {
            log(`A language file has been changed (filename: "${filename}")`);
          }
          // Emit event
          this.emit('list-change', this._items);
          // Update container
          // @TODO Check if a related container changed (and only update if that happens)
          this.updateContainer();
        } else {
          log(`Failed to load or parse language file (filename: "${filename}" error: "${LoadError[data]}")`);
        }
      }
    });
  }

  /**
   * Find which language item is associated with a filename in the language folder.
   * @param filename Filename to find the item of.
   */
  private findItem(filename: string): LangFile | undefined {
    return this._items.find(item => item.filename === filename);
  }

  /**
   * Get the absolute path of a file inside the language folder (or a path relative to it).
   * @param filename Filename of a file inside the language folder.
   */
  private getItemPath(filename: string): string {
    const folderPath = this.watcher.getFolder();
    if (!folderPath) { throw new Error('You must not use "getItemPath" before the watchers folder has been set.'); }
    return path.join(folderPath, filename);
  }

  /** Update the combined content container (by recreating it). */
  public updateContainer() {
    const preferences = window.External.preferences.data;
    const currentCode = preferences.currentLanguage;
    const fallbackCode = preferences.fallbackLanguage;
    // Update container
    this._container = this.createContainer(currentCode, fallbackCode);
    // Log
    if (this.initialized) {
      log(`The combined language container has been updated (current: "${currentCode}" fallback: "${fallbackCode}")`);
    }
    // Emit event
    this.emit('update', this.container);
  }

  /**
   * Create a language container by combining the default, fallback and current containers.
   * @param currentCode Code of the current language to use.
   * @param fallbackCode Code of the fallback language to use.
   */
  private createContainer(currentCode: string, fallbackCode: string) {
    // Get current language
    let current: LangFile | undefined;
    if (currentCode !== autoCode) { // (Specific language)
      current = this.items.find(item => item.code === currentCode);
    }
    if (!current) { // (Auto language)
      const code = remote.app.getLocaleCountryCode().toLowerCase() || '';
      current = this.items.find(item => item.code === code);
    }
    // Get fallback language
    const fallback = this.items.find(item => item.code === fallbackCode);
    // Combine all language container objects (by overwriting the default with the fallback and the current)
    const data = recursiveReplace(recursiveReplace(deepCopy(defaultLang), fallback && fallback.data), current && current.data);
    data.libraries = { // Allow libraries to add new properties (and not just overwrite the default)
      ...data.libraries,
      ...(fallback && fallback.data && fallback.data.libraries),
      ...(current && current.data && current.data.libraries)
    };
    data.upgrades = { // Allow libraries to add new properties (and not just overwrite the default)
      ...data.upgrades,
      ...(fallback && fallback.data && fallback.data.upgrades),
      ...(current && current.data && current.data.upgrades)
    };
    return data;
  }
}

/** Default language to fall back on. */
const defaultLang = getDefaultLocalization();

/**
 * Try to read and parse the contents of a language file.
 * An error code is returned for "expected" errors, all other errors are thrown as usual.
 * @param filepath Path of the file.
 */
function readLangFile(filepath: string): Promise<RecursivePartial<LangFileContent> | LoadError> {
  return new Promise(function(resolve, reject) {
    readFile(filepath, 'utf8', function(error, data) {
      // Relay "expected" errors
      if (error) {
        if (error.code === 'ENOENT') { return resolve(LoadError.FileNotFound); }
        if (error.code === 'EISDIR') { return resolve(LoadError.FileIsFolder); }
        return reject(error);
      }
      const lang = tryParseJSON(data);
      if (lang instanceof Error) { return resolve(LoadError.NotValidJSON); }
      // @TODO Verify that the file is properly formatted (type-wise)
      // Resolve
      resolve(JSON.parse(data));
    });
  });
}

/** Error code for when loading and parsing a language file. */
export enum LoadError {
  /** If the file was not found. */
  FileNotFound,
  /** If the file is actually a folder. */
  FileIsFolder,
  /** If the file does not contain a valid JSON string. */
  NotValidJSON,
}

function log(content: string): void {
  window.External.log.addEntry({
    source: 'Language',
    content: content
  });
}
