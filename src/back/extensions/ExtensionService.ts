import { Barrier } from '@back/util/async';
import { IAppConfigData } from '@shared/config/interfaces';
import { ExtensionsScanner } from './ExtensionsScanner';
import { IExtension, IExtensionService } from './interfaces';

export class ExtensionService implements IExtensionService {
  protected readonly _extensions: IExtension[];
  private readonly _extensionScanner: ExtensionsScanner;

  private readonly _installedExtensionsReady: Barrier;

  constructor(
    protected readonly _configData: IAppConfigData
  ) {
    this._extensionScanner = new ExtensionsScanner(_configData);
    this._extensions = [];
    this._installedExtensionsReady = new Barrier();
    this._init();
  }

  private async _init(): Promise<void> {
    await this._scanExtensions();
  }

  private async _scanExtensions(): Promise<void> {
    this._extensionScanner.startScanningExtensions();
    const exts = await this._extensionScanner.scannedExtensions;
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
}
