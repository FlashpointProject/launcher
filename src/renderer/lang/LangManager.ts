import { readJsonFile, stringifyJsonDataFile, recursiveReplace, deepCopy } from '../../shared/Util';
import { FolderWatcher } from '../util/FolderWatcher';
import { EventQueue } from '../util/EventQueue';
import * as path from 'path';
import { getDefaultLocalization } from '../util/lang';
import { WrappedEventEmitter } from '../util/WrappedEventEmitter';
import { LangContainer, Language } from '../../shared/lang/types';
import { remote } from 'electron';

export interface ILangStrings {
  /** Kept for the watcher to keep track of ownership */
  path: string;
  /** 2 letter language code */
  code: string;
  /** Name to display in language selection */
  name: string;
  /** List of localized strings as a JSON object */
  data: LangContainer;
}

export interface ILangSortedStrings {
  config: any;
  home: any;
}

export interface LangManager {
  /** Emitted when a new language has been added */
  on(event: 'add', listener: (item: Language[]) => void): this;
  /** Emitted when localized strings have been updated */
  on(event: 'update', listener: (item: LangContainer) => void): this;
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

  /** Default langugage (member names) to fall back on */
  private defaultLang: ILangStrings = { path: '', code: 'default', name: 'default', data: getDefaultLocalization() };
  /** Auto Language for selection */
  public static readonly autoCode : string = '<auto>';

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
      const fallback = window.External.preferences.getData().fallbackLanguage;
      const current = window.External.preferences.getData().currentLanguage;
      const fullPath = path.join(LangManager.folderPath, offsetPath, filename);
      const item = this.findOwner(fullPath);
      if (item) {
        this.updateLocalization();
      } else {
        // Check if it is a potential lang file
        if (filename.endsWith('.json')) {
          // Add item
          try {
            const data : any = await LangManager.readLangFile(fullPath, this.log.bind(this));
            const item: ILangStrings = {
              path: fullPath,
              code: filename.split('.')[0], // Get name without extension
              name : data.name,
              data: data
            };
            this.items.push(item);
            this.log('Loaded ' + item.code + ' language file.');
            // Only updated localization if a used language is added
            if (item.code === current || item.code === fallback) {
              this.updateLocalization();
            }
            this.updateLangList();
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
    const fallback = window.External.preferences.getData().fallbackLanguage;
    const current = window.External.preferences.getData().currentLanguage;
    if (item) {
      this.itemsQueue.push(async () => {
        const data : any = await LangManager.readLangFile(fullPath, this.log.bind(this));
        item.data = data;
        const index = this.items.findIndex(item => item.path === fullPath);
        this.items.splice(index, 1, item);
        // Only updated localization if a used language is changed
        if (item.code === current || item.code === fallback) {
          this.updateLocalization();
        }
      });
      this.log('Reloading ' + item.code + ' language file.');

    }
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

  /**
   * Update the list of selectable languages
   */
  private updateLangList() {
    this.emit('add', this.items.map(item => { return {code: item.code, name: item.name};}) );
  }

  /**
   * Emit a new copy of language data - 'update' event
   */
  public updateLocalization() {
    let fallback : ILangStrings | undefined = this.items.find(item => item.code === window.External.preferences.getData().fallbackLanguage);
    let current : ILangStrings | undefined = this.items.find(item => item.code === window.External.preferences.getData().currentLanguage);

    if (fallback === undefined) {
      fallback = this.defaultLang;
    }

    // 'auto' will get system language, fallback to en then default if missing / undetectable
    if (current === undefined || current.code === LangManager.autoCode) {
      let code : string = remote.app.getLocaleCountryCode().toLowerCase();
      console.log(code);
      if (code === '') {
        code = 'en';
      }

      current = this.items.find(item => item.code === code);
      if (current === undefined) {
        current = this.defaultLang;
      }
    }

    // Replace empty current with fallback, empty fallback with default
    this.emit('update', recursiveReplace(recursiveReplace(deepCopy(this.defaultLang.data), fallback.data), current.data) );
  }

  private log(content: string): void {
    window.External.log.addEntry({
      source: 'Lang',
      content: content
    });
  }
}

