import * as path from 'path';
import { FolderWatcher, ChangeEventType } from '../util/FolderWatcher';
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
  filename: string;
};

export interface ThemeManager {
  /** Emitted any time a file inside the theme folder has been changed (not renamed). */
  on(event: 'change', listener: (eventType: ChangeEventType, filename: string) => void ): this;
    /** Emitted when a theme is added (to the themes folder). */
    on(event: 'add', listener: (item: IThemeListItem) => void): this;
    /** Emitted when a theme is removed (from the themes folder). */
    on(event: 'remove', listener: (item: IThemeListItem) => void): this;
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
    this.watcher.on('add', this.onWatcherAdd);
    this.watcher.on('remove', this.onWatcherRemove);
    this.watcher.on('change', this.onWatcherChange);
    if (themeFolderPath !== undefined) { this.watch(themeFolderPath); }
  }

  /** Start watching the folder. */
  watch(themeFolderPath: string) {
    this.watcher.setFolder(themeFolderPath);
  }

  /**
   * Load a theme file inside the theme folder.
   * @param filename Filename of the theme file (inside the theme folder).
   */
  load(filename: string): Promise<ITheme | Theme.LoadError> {
    // Load theme
    return Theme.load(this.toAbsoluteThemePath(filename));
  }

  private onWatcherAdd = (filename: string): void => {
    this.itemsQueue.push(async () => {
      // Find entry file
      const entryPath = await Theme.getEntryPath(this.toAbsoluteThemePath(filename));
      console.log(this.toAbsoluteThemePath(filename), entryPath)
      if (entryPath !== undefined) {
        // Load theme data
        const theme = await Theme.load(entryPath);
        if (typeof theme !== 'number') {
          // Add item
          const item: IThemeListItem = {
            filename: filename,
            metaData: theme.metaData,
            entryPath: path.relative(this.getThemeFolder(), entryPath)
          };
          this.items.push(item);
          this.emit('add', item);
          console.log(item)
        }
      }
    });
  }

  private onWatcherRemove = (filename: string): void => {
    this.itemsQueue.push(async () => {
      // Find item and index
      let index: number = 0;
      let item: IThemeListItem | undefined = undefined;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const currentItem = this.items[i];
        if (currentItem.filename === filename) {
          index = i;
          item = currentItem;
          break;
        }
      }
      // Remove item
      if (item) {
        this.items.splice(index, 1);
        this.emit('remove', item);
      }
    });
  }
  
  private onWatcherChange = (eventType: ChangeEventType, filename: string): void => {
    // Relay event
    this.emit('change', eventType, filename);
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
