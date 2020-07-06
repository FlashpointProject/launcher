import { IExtensionService, IExtension } from './interfaces';
import { ExtensionsScanner } from './ExtensionsScanner';
import { IAppConfigData } from '@shared/config/interfaces';

export class ExtensionService implements IExtensionService {
  protected readonly _extensions: IExtension[];
  private readonly _extensionScanner: ExtensionsScanner;

  constructor(
    protected readonly _configData: IAppConfigData
  ) {
    this._extensionScanner = new ExtensionsScanner(_configData);
    this._extensions = [];
  }

  public async init(): Promise<void> {
    await this._scanExtensions();
  }

  private async _scanExtensions(): Promise<void> {
    this._extensionScanner.startScanningExtensions();
    const exts = await this._extensionScanner.scannedExtensions;
    exts.forEach(e => this._extensions.push(e));
  }

  getExtensions(): IExtension[] {
    return this._extensions;
  }

  getExtension(id: string): IExtension | undefined {
    return this._extensions.find(e => e.id === id);
  }
}
