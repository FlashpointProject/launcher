import * as path from 'path';
import { FolderWatcher } from '../util/FolderWatcher';
import { WrappedEventEmitter } from '../util/WrappedEventEmitter';
import { Theme, ITheme, IThemeMetaData } from './Theme';
import { EventQueue } from '../util/EventQueue';

export type IThemeListItem = {
  /** The meta data of the theme. */
  metaData: IThemeMetaData;
  /** Path to the entry file (relative to the theme folder). */
  entryPath: string;
  /**
   * File or folder name of the theme (relative to the theme folder).
   * Format: X in "\X" or "\X\theme.css"
   */
  basename: string;
};

export interface ThemeManager {
  /** Emitted when a theme is added (to the themes folder). */
  on(event: 'add', listener: (item: IThemeListItem) => void): this;
  /** Emitted when a theme is removed (from the themes folder). */
  on(event: 'remove', listener: (item: IThemeListItem) => void): this;
  /** Emitted when a theme file, or a file inside a theme folder, is changed. */
  on(event: 'change', listener: (item: IThemeListItem) => void ): this;
}

/** Watches a theme folder. */
export class ThemeManager extends WrappedEventEmitter {
  /** Watcher of the themes folder. */
  private watcher: FolderWatcher = new FolderWatcher();
  /** Event queue for editing the items array. */
  private itemsQueue: EventQueue = new EventQueue();
  /** Items in the themes folder. */
  public items: IThemeListItem[] = [];

  /** Filenames of all files in the themes folder. */
  get filenames(): string[] { return this.watcher.filenames; }
  /** Path of the folder this is managing. */
  get folderPath(): string | undefined { return this.watcher.getFolder(); }

  constructor(themeFolderPath: string) {
    super();
    this.watcher.once('ready', () => {
      // Add event listeners
      this.watcher.on('add',    this.onWatcherAdd);
      this.watcher.on('remove', this.onWatcherRemove);
      this.watcher.on('change', this.onWatcherChange);
      // Add initial files
      for (let filename of this.watcher.filenames) {
        this.onWatcherAdd(filename, '');
      }
    });
    if (themeFolderPath !== undefined) { this.watch(themeFolderPath); }
  }

  /** Start watching the folder. */
  watch(themeFolderPath: string) {
    this.watcher.watch(themeFolderPath, { recursionDepth: -1 });
  }

  /**
   * Load a theme file inside the theme folder.
   * @param filename Filename of the theme file (inside the theme folder).
   */
  load(filename: string): Promise<ITheme | Theme.LoadError> {
    // Load theme
    return Theme.load(this.toAbsoluteThemePath(filename));
  }

  private onWatcherAdd = (filename: string, offsetPath: string): void => {
    this.itemsQueue.push(async () => {
      const item = this.findOwner(filename, offsetPath);
      if (item) { // (File belongs to an existing theme)
        this.emit('change', item);
      } else {
        // Check if it is a potential entry file
        // (If it is inside the "Theme folder" or is exactly one folder deep and has the entry filename)
        const folderName = getFirstName(offsetPath);
        if (offsetPath === '' || (offsetPath === folderName && filename === Theme.entryFilename)) { // (It is not more than 1 folder deep)
          // Load theme data
          const entryPath = this.toAbsoluteThemePath(path.join(offsetPath, filename));
          const theme = await Theme.load(entryPath);
          if (typeof theme !== 'number') {
            // Add item
            const item: IThemeListItem = {
              basename: folderName || filename,
              metaData: theme.metaData,
              entryPath: path.relative(this.getThemeFolder(), entryPath)
            };
            this.items.push(item);
            this.emit('add', item);
          }
        }
      }
    });
  }

  private onWatcherRemove = (filename: string, offsetPath: string): void => {
    this.itemsQueue.push(async () => {
      const item = this.findOwner(filename, offsetPath);
      if (item) {
        if (item.entryPath === path.join(offsetPath, filename)) { // (Entry file was removed)
          // Remove the theme
          this.items.splice(this.items.indexOf(item), 1);
          this.emit('remove', item);
        } else { // (Non-entry file was removed)
          this.emit('change', item);
        }
      }
    });
  }
  
  private onWatcherChange = (filename: string, offsetPath: string): void => {
    // Emit a change if the file is owned by a theme
    const theme = this.findOwner(filename, offsetPath);
    if (theme) { this.emit('change', theme); }
  }

  /**
   * Find the theme a file belongs to.
   * @param filename Filename of the file to find the owner of.
   * @param offsetPath Offset path of the folder the file is in (relative to the theme folder).
   */
  private findOwner(filename: string, offsetPath: string): IThemeListItem | undefined {
    const folderName = getFirstName(offsetPath);
    if (folderName) { // (Sub-folder)
      return this.items.find(item => item.basename === folderName);
    } else { // (Theme folder)
      return this.items.find(item => item.entryPath === filename);
    }
  }

  /** Try to get the theme folder path. */
  private getThemeFolder(): string {
    // Get theme folder path
    const folderPath = this.watcher.getFolder();
    if (folderPath === undefined) { throw new Error('Failed to get theme folder path. No theme folder has been set.'); }
    return folderPath;
  }

  /** Convert a path relative to the theme folder into an absolute path */
  private toAbsoluteThemePath(filename: string): string {
    return path.isAbsolute(filename) ? filename : path.join(this.getThemeFolder(), filename);
  }
}

/**
 * Get the name of the first file/folder in the path.
 * Example: ("themes/cool_theme/cool.css") => "themes"
 * @param filepath Path to get the first name from.
 * @returns The first name in the path (or an empty string if no name was found).
 */
const getFirstName = (function() {
  // Matches all characters before the first separator
  const regex = new RegExp(`[^\\${path.sep}]*`);
  // Return function
  return function getFirstName(filepath: string): string {
    const result = regex.exec(filepath);
    return (result && result[0]) || '';
  };
})();
