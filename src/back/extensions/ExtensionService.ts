/* eslint-disable @typescript-eslint/no-var-requires */
import { Barrier } from '@back/util/async';
import { Disposable, dispose, newDisposable } from '@back/util/lifecycle';
import { TernarySearchTree } from '@back/util/map';
import { AppConfigData } from '@shared/config/interfaces';
import { ILogEntry } from '@shared/Log/interface';
import { Contributions, ExtensionContribution, IExtension } from '../../shared/extensions/interfaces';
import { scanExtensions, scanSystemExtensions } from './ExtensionsScanner';
import { getExtensionEntry, newExtLog } from './ExtensionUtils';
import { ExtensionContext, ExtensionData, ExtensionModule } from './types';

export class ExtensionService {
  /** Stores unchanging Extension data */
  protected readonly _extensions: IExtension[];
  /** Stores running Extension data (discarded on closure) */
  protected readonly _extensionData: Record<string, ExtensionData>;
  /** Cached extension path index, see getExtensionPathIndex */
  private _extensionPathIndex: Promise<TernarySearchTree<string, IExtension>> | null;

  /** Opens when _extensions is ready to be read from */
  public readonly installedExtensionsReady: Barrier;

  constructor(
    protected readonly _configData: AppConfigData,
    protected readonly _extensionPath: string,
    protected readonly _isDev: boolean,
  ) {
    this._extensions = [];
    this._extensionData = {};
    this.installedExtensionsReady = new Barrier();
    this._init();
  }

  private async _init(): Promise<void> {
    await this._scanExtensions();
  }

  private async _scanExtensions(): Promise<void> {
    const sysExts = await scanSystemExtensions(this._isDev);
    sysExts.forEach(e => this._extensions.push(e));
    const exts = await scanExtensions(this._configData, this._extensionPath);
    exts.forEach(e => this._extensions.push(e));
    this.installedExtensionsReady.open();
  }

  getExtensions(): Promise<IExtension[]> {
    return this.installedExtensionsReady.wait().then(() => {
      return this._extensions;
    });
  }

  getExtension(id: string): Promise<IExtension | undefined> {
    return this.installedExtensionsReady.wait().then(() => {
      return this._extensions.find(e => e.id === id);
    });
  }

  /**
   * Returns a list of all extension contributions of a particular type
   *
   * @param key Type of contribution to get
   * @returns All of this contribution type from all loaded extensions
   */
  getContributions<T extends keyof Contributions>(key: T): Promise<ExtensionContribution<T>[]> {
    return this.installedExtensionsReady.wait().then(() => {
      return this._extensions.reduce<ExtensionContribution<T>[]>((list, ext) => {
        list.push({
          key: key,
          extId: ext.id,
          value: ext.manifest.contributes ? ext.manifest.contributes[key] : []
        });
        return list;
      }, []);
    });
  }

  /** Build a search tree mapping extensions and their paths */
  public async getExtensionPathIndex(): Promise<TernarySearchTree<string, IExtension>> {
    return this.installedExtensionsReady.wait().then(() => {
      if (!this._extensionPathIndex) {
        const index = TernarySearchTree.forPaths<IExtension>();
        const extensions = this._extensions.map(ext => {
          if (!ext.manifest.main) {
            return undefined;
          }
          index.set(ext.extensionPath, ext);
        });
        this._extensionPathIndex = Promise.all(extensions).then(() => index);
        return index;
      }
      return this._extensionPathIndex;
    });
  }

  /**
   * Loads an extension (returns immediately if already loaded)
   *
   * @param extId ID of extension to load
   */
  public async loadExtension(extId: string): Promise<void> {
    return this.installedExtensionsReady.wait().then(() => {
      const ext = this._extensions.find(e => e.id === extId);
      if (ext) {
        return this._loadExtension(ext);
      } else {
        log.error('Extensions', `Tried to load extension but not found? (${extId})`);
      }
    });
  }

  private async _loadExtension(ext: IExtension) {
    const extData: ExtensionData = this._getExtensionData(ext.id);

    // Already loaded, exit early
    if (extData.enabled) {
      return;
    }

    try {
      // Import extension as module
      const entryPath = getExtensionEntry(ext);
      // Build context
      const context: ExtensionContext = {
        subscriptions: extData.subscriptions
      };
      if (entryPath) {
        const extModule: ExtensionModule = await import(entryPath);
        if (!extModule.activate) {
          throw new Error('No "activate" export found in extension module!');
        }
        // Activate extension
        try {
          await extModule.activate.apply(global, [context]);
        } catch (err: any) {
          throw new Error(`Error during extension activation: ${err}`);
        }
      }
      this._setSubscriptions(ext.id, context.subscriptions);
      this._enableExtension(ext.id);
      log.info('Extensions', `[${ext.manifest.displayName || ext.manifest.name}] Extension Loaded (${ext.id})`);
    } catch (err: any) {
      this.logExtension(ext.id, newExtLog(ext.manifest, err, log.error));
    }
  }

  public async unloadAll(): Promise<void> {
    if (this.installedExtensionsReady.isOpen()) {
      for (const ext of this._extensions) {
        await this._unloadExtension(ext);
      }
    }
  }

  public async unloadExtension(id: string): Promise<void> {
    if (this.installedExtensionsReady.isOpen()) {
      const ext = this._extensions.find(e => e.id == id);
      if (ext) {
        this._unloadExtension(ext);
      }
    }
  }

  private async _unloadExtension(ext: IExtension): Promise<void> {
    const extData = this._extensionData[ext.id];
    const entryPath = getExtensionEntry(ext);
    if (entryPath) {
      try {
        const extModule: ExtensionModule = await import(entryPath);
        if (extModule.deactivate) {
          try {
            await extModule.deactivate.apply(global);
          } catch (error) {
            log.error('Extensions', `[${ext.manifest.displayName || ext.manifest.name}] Error in deactivation function.\n${error}'`);
          }
        }
      } catch (error) {
        log.error('Extensions', `[${ext.manifest.displayName || ext.manifest.name}] Error importing entry path.\n${error}'`);
      }
    }
    // Dispose of all subscriptions the extension made
    dispose(extData.subscriptions);
    // Clear data
    delete this._extensionData[ext.id];
  }

  private _getExtensionData(extId: string): ExtensionData {
    return this._extensionData[extId] || {
      extId: extId,
      enabled: false,
      subscriptions: newDisposable(),
      logs: []
    };
  }

  /**
   * Copy an extensions subscriptions into its running data (usually from the context)
   *
   * @param extId ID of extension to set subscriptions for
   * @param subscriptions Subscriptions to set
   */
  private _setSubscriptions(extId: string, subscriptions: Disposable) {
    const data = this._getExtensionData(extId);
    // Dispose of old subscriptions
    dispose(data.subscriptions);
    data.subscriptions = subscriptions;
    this._extensionData[extId] = data;
  }

  /**
   * Push a log onto an extensions running data
   *
   * @param extId ID of extension triggering log
   * @param entry pre-filled Log Entry
   */
  public logExtension(extId: string, entry: ILogEntry) {
    const data = this._getExtensionData(extId);
    data.logs.push(entry);
    this._extensionData[extId] = data;
  }

  /**
   * Mark the extension as enabled in its running data
   *
   * @param extId ID of extension to enable
   */
  private _enableExtension(extId: string) {
    const data = this._getExtensionData(extId);
    data.enabled = true;
    this._extensionData[extId] = data;
  }
}
