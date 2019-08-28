import { remote } from 'electron';
import * as path from 'path';
import { LangContainer, Language, autoCode } from '../../shared/lang/types';
import { deepCopy, readJsonFile, recursiveReplace } from '../../shared/Util';
import { EventQueue } from '../util/EventQueue';
import { FolderWatcher } from '../util/FolderWatcher';
import { getDefaultLocalization } from '../util/lang';
import { WrappedEventEmitter } from '../util/WrappedEventEmitter';

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
  on(event: 'listChanged', listener: (list: Language[]) => void): this;
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

  /** Default language (member names) to fall back on */
  private defaultLang: ILangStrings = {
    path: '',
    code: 'default',
    name: 'default',
    data: getDefaultLocalization(),
  };
  /** Auto Language for selection */


  constructor() {
    super();
    this.watcher.once('ready', () => {
      // Add event listeners for Watcher
      this.watcher.on('add',    this.onWatcherAdd);
      this.watcher.on('change', this.onWatcherChange);
      this.watcher.on('remove', this.onWatcherRemove);
      // Add initial files
      for (let filename of this.watcher.filenames) {
        this.onWatcherAdd(filename, '');
      }
    });
  }

  private onWatcherAdd = (filename: string, offsetPath: string): void => {
    this.itemsQueue.push(async () => {
      const fallback = window.External.preferences.getData().fallbackLanguage;
      const current = window.External.preferences.getData().currentLanguage;
      // Add or update the file item
      const fullPath = path.join(LangManager.folderPath, offsetPath, filename);
      const item = this.findOwner(fullPath);
      if (item) { // (Item already exists)
        item.data = await LangManager.readLangFile(fullPath, log);
        const index = this.items.findIndex(item => item.path === fullPath);
        this.items.splice(index, 1, item);
        // Only updated localization if a used language is changed
        if (item.code === current || item.code === fallback) {
          this.updateLocalization();
        }
      } else {
        // Check if it is a potential lang file
        if (filename.endsWith('.json')) {
          // Add item
          try {
            const data : any = await LangManager.readLangFile(fullPath, log);
            const item: ILangStrings = {
              path: fullPath,
              code: filename.split('.')[0], // Get name without extension
              name : data.name,
              data: data
            };
            this.items.push(item);
            log('Loaded ' + item.name + ' (' + item.code + '.json) language file.');
            // Only updated localization if a used language is added
            if (item.code === current || item.code === fallback) {
              this.updateLocalization();
            }
            this.emit('listChanged', this.createLangList());
          } catch (e) {
            log('Failed to load ' + filename + ' language file.');
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
        try {
          const data : any = await LangManager.readLangFile(fullPath, log);
          const index = this.items.findIndex(item => item.path === fullPath);
          const nameChanged = data.name !== item.name;

          item.name = data.name;
          item.data = data;
          this.items.splice(index, 1, item);

          if (item.code === current || item.code === fallback) {
            this.updateLocalization();
          }
          if (nameChanged) {
            this.emit('listChanged', this.createLangList());
          }

          log('Reloaded ' + item.name + ' (' + item.code + '.json) language file');
        } catch (e) {
          log('Failed to reload ' + item.name + ' (' + item.code + '.json) language file, keeping old data.');
        }
      });
    } else {
      this.itemsQueue.push(async () => {
        try {
          const data : any = await LangManager.readLangFile(fullPath, log);
          const item: ILangStrings = {
            path: fullPath,
            code: filename.split('.')[0], // Get name without extension
            name : data.name,
            data: data
          };
          this.items.push(item);
          log('Loaded ' + item.name + ' (' + item.code + '.json) language file.');
          // Only updated localization if a used language is added
          if (item.code === current || item.code === fallback) {
            this.updateLocalization();
          }
          this.emit('listChanged', this.createLangList());
        } catch (e) {
          log('Failed to load ' + filename + ' language file.');
        }
      });
    }
  }

  private onWatcherRemove = (filename: string, offsetPath: string): void => {
    const fullPath = path.join(LangManager.folderPath, offsetPath, filename);
    const item = this.findOwner(fullPath);
    if (item) {
      const index = this.items.indexOf(item);
      this.itemsQueue.push(async () => {
        this.items.splice(index, 1);
        this.emit('listChanged', this.createLangList());
        this.updateLocalization();
        log(item.name + ' language file (' + item.code + '.json) has been unloaded due to being moved or deleted.');
      });
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
   * Starts the watcher, forces current and fallback languages to be loaded
   */
  public async startWatcher() {
    let currentCode = window.External.preferences.getData().currentLanguage;
    if (currentCode === autoCode) {
      currentCode = remote.app.getLocaleCountryCode().toLowerCase();
    }
    try {
      const fullPath = path.join(LangManager.folderPath, currentCode + '.json');
      const data : any = await LangManager.readLangFile(fullPath, log);
      const item: ILangStrings = {
        path: fullPath,
        code: currentCode, // Get name without extension
        name : data.name,
        data: data
      };
      this.items.push(item);
      log('Loaded ' + item.name + ' (' + item.code + '.json) language file.');
    } catch (e) {
      log('Failed to load current language file - ' + currentCode + '.json');
    }

    let fallbackCode = window.External.preferences.getData().fallbackLanguage;
    try {
      const fullPath = path.join(LangManager.folderPath, fallbackCode + '.json');
      const data : any = await LangManager.readLangFile(fullPath, log);
      const item: ILangStrings = {
        path: fullPath,
        code: fallbackCode, // Get name without extension
        name : data.name,
        data: data
      };
      this.items.push(item);
      log('Loaded ' + item.name + ' (' + item.code + '.json) language file.');
    } catch (e) {
      log('Failed to load fallback language file - ' + fallbackCode + '.json');
    }

    this.watcher.watch(LangManager.folderPath);
  }

  /**
   * Emit a new copy of language data - 'update' event
   */
  public updateLocalization() {
    this.emit('update', this.buildLocalization() );
  }

  /** Create a list of all currently detected language files. */
  public createLangList(): Language[] {
    return this.items.map(item => ({
      code: item.code,
      name: item.name + ' (' + item.code + ')',
    }));
  }

  /**
   * Returns a new copy of language data
   */
  public buildLocalization() {
    // Get fallback language
    const fallbackLang = window.External.preferences.getData().fallbackLanguage;
    const fallback = this.items.find(item => item.code === fallbackLang);

    // Get current language
    const currentLang = window.External.preferences.getData().currentLanguage;
    let current: ILangStrings | undefined = this.items.find(item => item.code === currentLang);

    // 'auto' will get system language, fallback to en then default if missing / undetectable
    if (!current || current && current.code === autoCode) {
      const code = remote.app.getLocaleCountryCode().toLowerCase() || '';
      current = this.items.find(item => item.code === code);
    }

    // Combine all language container objects (by overwriting the default with the fallback and the current)
    const data = recursiveReplace(recursiveReplace(deepCopy(this.defaultLang.data), fallback && fallback.data), current && current.data);
    data.libraries = { // Allow libraries to add new properties (and not just overwrite the default)
      ...data.libraries,
      ...(fallback && fallback.data && fallback.data.libraries),
      ...(current && current.data && current.data.libraries)
    };
    return data;
  }
}

function log(content: string): void {
  window.External.log.addEntry({
    source: 'Language',
    content: content
  });
}
