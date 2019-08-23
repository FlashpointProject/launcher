import { readJsonFile, stringifyJsonDataFile } from '../../shared/Util';
import { FolderWatcher } from '../util/FolderWatcher';
import { EventQueue } from '../util/EventQueue';
import * as path from 'path';
import { WrappedEventEmitter } from '../util/WrappedEventEmitter';
import { getDefaultLocalization } from '../util/lang';
import { ILocalization } from '../../shared/lang/interfaces';

export interface ILangStrings {
  /** Kept for the watcher to keep track of ownership */
  path: string;
  /** Language the localized strings are in */
  language: string;
  /** List of localized strings as a JSON object */
  data: any;
}

export interface ILangSortedStrings {
  config: any;
  home: any;
}

export interface LangManager {
  /** Emitted when a lang file has been added/changed and localization needs updated */
  on(event: 'update', listener: () => void): this;
}

export class LangManager extends WrappedEventEmitter {
  /** Path to the lang folder relative to the launcher */
  private static folderPath: string = path.resolve('lang');
  /** Encoding used by lang files. */
  private static fileEncoding: string = 'utf8';

  /** Watcher of the lang folder. */
  private watcher: FolderWatcher = new FolderWatcher();
  /** Event queue for editing the items array. */
  private itemsQueue: EventQueue = new EventQueue();
  /** All loaded localized strings */
  private items: ILangStrings[] = [];

  /** Exposed LocalizedStrings for each page */
  public strings: ILocalization = getDefaultLocalization();

  constructor() {
    super();
    this.watcher.once('ready', () => {
      // Add event listeners for Watcher
      this.watcher.on('add',    this.onWatcherAdd);
      this.watcher.on('change', this.onWatcherChange);
      // Add initial files
      for (let filename of this.watcher.filenames) {
        this.onWatcherAdd(filename, '');
      }
    });
    this.watcher.watch(LangManager.folderPath);
  }

  private onWatcherAdd = (filename: string, offsetPath: string): void => {
    this.itemsQueue.push(async () => {
      const fullPath = path.join(LangManager.folderPath, offsetPath, filename);
      const item = this.findOwner(fullPath);
      if (item) {
        this.updateLocalization();
        this.emit('update');
      } else {
        // Check if it is a potential lang file
        if (filename.endsWith('.json')) {
          // Add item
          try {
            const data : any = await LangManager.readLangFile(fullPath, this.log.bind(this) );
            const item: ILangStrings = {
              path: fullPath,
              language: filename.split('.')[0], // Get name without extension
              data: data
            };
            this.items.push(item);
            this.log('Loaded ' + item.language + ' language file.');
            this.updateLocalization();
          } catch (e) {
            this.log('Failed to load ' + filename + ' language file.');
          }
        }
      }
    });
  }

  private onWatcherChange = (filename: string, offsetPath: string): void => {
    // Emit a change if the file is owned by a theme
    const fullPath = path.join(LangManager.folderPath, offsetPath, filename);
    const item = this.findOwner(fullPath);
    if (item) {
      this.itemsQueue.push(async () => {
        const data : any = await LangManager.readLangFile(fullPath, this.log.bind(this));
        item.data = data;
        const index = this.items.findIndex(item => item.path === fullPath);
        this.items.splice(index, 1, item);
        this.updateLocalization();
        this.emit('update');
      });
      this.log('Reloading ' + item.language + ' language file.');

    }
    console.log(this.items);
  }


  /**
   * Read and parse the data of a lang file asynchronously.
   * @param onError Called for each error that occurs while parsing.
   */
  public static readLangFile(path: string, onError?: (error: string) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      readJsonFile(path, LangManager.fileEncoding)
      .then(json => resolve(json))
      .catch(reject);
    });
  }

  /**
   * Find the ILangStrings object a file belongs to.
   * @param fullPath Path to the lang file
   */
  private findOwner(fullPath: string): ILangStrings | undefined {
    return this.items.find(item => item.path === fullPath);
  }

  private log(content: string): void {
    window.External.log.addEntry({
      source: 'Lang',
      content: content
    });
  }

  private updateLocalization() {
    let sortedStrings = {config: {}, home: {}};

    this.items.forEach( (item) => {
      try { sortedStrings.config = { ...{ [item.language]: item.data.config }, ...sortedStrings.config };  } catch (e) { this.log(e); }
      try { sortedStrings.home = { ...{ [item.language]: item.data.home }, ...sortedStrings.home };  } catch (e) { this.log(e); }
    });

    this.strings.config.setContent(sortedStrings.config);

    console.log(this.strings);
  }
}

