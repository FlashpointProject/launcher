import { Barrier } from '@back/util/async';
import { IAppConfigData } from '@shared/config/interfaces';
import { scanExtensions  } from './ExtensionsScanner';
import { IExtension, Contributions, ExtensionContribution } from '../../shared/extensions/interfaces';
import { ExtensionData } from './types';
import { getExtensionEntry } from './ExtensionUtils';

export class ExtensionService {
  /** Stores unchanging Extension data */
  protected readonly _extensions: IExtension[];
  /** Stores temporary runtime Extension data */
  protected readonly _extensionData: Record<string, ExtensionData>;

  /** Opens when _extensions is ready to be read */
  private readonly _installedExtensionsReady: Barrier;

  constructor(
    protected readonly _configData: IAppConfigData
  ) {
    this._extensions = [];
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
          value: ext.manifest.contributes[key]
        });
        return list;
      }, []);
    });
  }

  private _loadExtension(ext: IExtension) {
    const extData: ExtensionData = this._getExtensionData(ext);

    // Already loaded, exit early
    if (extData.enabled) {
      return;
    }

    const entryPath = getExtensionEntry(ext);

    extData.enabled = true;
    this._extensionData[ext.id] = extData;
  }

  private _getExtensionData(ext: IExtension) {
    return this._extensionData[ext.id] || {
      extId: ext.id,
      enabled: false,
      subscriptions: [],
      logs: [],
      errors: []
    };
  }
}
