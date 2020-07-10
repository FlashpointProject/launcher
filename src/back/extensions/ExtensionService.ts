/* eslint-disable @typescript-eslint/no-var-requires */
import { Barrier } from '@back/util/async';
import { Disposable, dispose, newDisposable } from '@back/util/lifecycle';
import { TernarySearchTree } from '@back/util/map';
import { IAppConfigData } from '@shared/config/interfaces';
import { ILogEntry } from '@shared/Log/interface';
import { Contributions, ExtensionContribution, IExtension } from '../../shared/extensions/interfaces';
import { scanExtensions } from './ExtensionsScanner';
import { getExtensionEntry, newExtLog } from './ExtensionUtils';
import { ExtensionContext, ExtensionData, ExtensionModule } from './types';

export class ExtensionService {
  /** Stores unchanging Extension data */
  protected readonly _extensions: IExtension[];
  /** Stores temporary runtime Extension data */
  protected readonly _extensionData: Record<string, ExtensionData>;
  /** Generated extension index */
  private _extensionPathIndex: Promise<TernarySearchTree<string, IExtension>> | null;

  /** Opens when _extensions is ready to be read */
  private readonly _installedExtensionsReady: Barrier;

  constructor(
    protected readonly _configData: IAppConfigData
  ) {
    this._extensions = [];
    this._extensionData = {};
    this._installedExtensionsReady = new Barrier();
    this._init();
  }

  private async _init(): Promise<void> {
    await this._scanExtensions();
  }

  private async _scanExtensions(): Promise<void> {
    const exts = await scanExtensions(this._configData);
    exts.forEach(e => this._extensions.push(e));
    this._installedExtensionsReady.open();
  }

  getExtensions(): Promise<IExtension[]> {
    return this._installedExtensionsReady.wait().then(() => {
      return this._extensions;
    });
  }

  getExtension(id: string): Promise<IExtension | undefined> {
    return this._installedExtensionsReady.wait().then(() => {
      return this._extensions.find(e => e.id === id);
    });
  }

  /** Returns a list of all extension contributions of a particular type */
  getContributions<T extends keyof Contributions>(key: T): Promise<ExtensionContribution<T>[]> {
    return this._installedExtensionsReady.wait().then(() => {
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

  /** Builds a tree mapping of Extensions paths and itself */
  public async getExtensionPathIndex(): Promise<TernarySearchTree<string, IExtension>> {
    return this._installedExtensionsReady.wait().then(() => {
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

  public async loadExtension(extId: string): Promise<void> {
    return this._installedExtensionsReady.wait().then(() => {
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
      const extModule: ExtensionModule = await import(entryPath);
      if (!extModule.activate) {
        throw new Error('No "activate" export found in extension module!');
      }
      // Build context
      const context: ExtensionContext = {
        subscriptions: extData.subscriptions
      };
      // Activate extension
      await Promise.resolve(extModule.activate.apply(global, [context]));
      this._setSubscriptions(ext.id, context.subscriptions);
      this._enableExtension(ext.id);
    } catch (err) {
      this.logExtension(ext.id, newExtLog(ext.manifest, err, log.error));
    }
  }

  private _getExtensionData(extId: string): ExtensionData {
    return this._extensionData[extId] || {
      extId: extId,
      enabled: false,
      subscriptions: newDisposable(),
      logs: []
    };
  }

  private _setSubscriptions(extId: string, subscriptions: Disposable) {
    const data = this._getExtensionData(extId);
    // Dispose of old subscriptions
    dispose(data.subscriptions);
    data.subscriptions = subscriptions;
    this._extensionData[extId] = data;
  }

  public logExtension(extId: string, entry: ILogEntry) {
    const data = this._getExtensionData(extId);
    data.logs.push(entry);
    this._extensionData[extId] = data;
  }

  private _enableExtension(extId: string) {
    const data = this._getExtensionData(extId);
    data.enabled = true;
    this._extensionData[extId] = data;
  }
}
