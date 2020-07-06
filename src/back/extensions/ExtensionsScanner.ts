import { IAppConfigData } from '@shared/config/interfaces';
import { Coerce } from '@shared/utils/Coerce';
import { ObjectParser } from '@shared/utils/ObjectParser';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionType, IExtension, IExtensionManifest } from './interfaces';
import { readJsonFile } from '@shared/Util';

const { str } = Coerce;

const fsPromises = fs.promises;

export class ExtensionsScanner {
  public readonly scannedExtensions: Promise<IExtension[]>;
  private _scannedExtensionsResolve!: (result: IExtension[]) => void;
  private _scannedExtensionsReject!: (err: any) => void;

  constructor(
    protected readonly _configData: IAppConfigData
  ) {
    this.scannedExtensions = new Promise<IExtension[]>((resolve, reject) => {
      this._scannedExtensionsResolve = resolve;
      this._scannedExtensionsReject = reject;
    });
  }

  public async startScanningExtensions(): Promise<void> {
    try {
      const result = new Map<string, IExtension>();

      // Load extensions here

      // User extensions
      const userExtPath = path.join(this._configData.flashpointPath, this._configData.extensionsPath);
      await fsPromises.readdir(userExtPath, { withFileTypes: true })
      .then((files) => {
        return Promise.all(files.filter(f => f.isDirectory()).map(async file => {
          const manifestPath = path.join(userExtPath, file.name, 'package.json');
          return fsPromises.stat(manifestPath)
          .then(async (stats) => {
            if (stats.isFile()) {
              await fsPromises.access(manifestPath);
              const ext = await this._parseExtension(manifestPath, ExtensionType.User);
              if (result.get(ext.id) !== undefined) {
                // log.warn('Extensions', `Overriding Extension ${ext.id}`);
              }
              result.set(ext.id, ext);
            }
          });
        }));
      });

      const r: IExtension[] = [];
      result.forEach((ext) => r.push(ext));
      this._scannedExtensionsResolve(r);
    } catch (error) {
      this._scannedExtensionsReject(error);
    }
  }

  private _parseExtension(extFilePath: string, type: ExtensionType): Promise<IExtension> {
    return readJsonFile(extFilePath)
    .then((data) => {
      const manifest = this._parseExtensionManifest(data);
      const ext: IExtension = {
        id: `${manifest.author}.${manifest.name}`,
        type: type,
        manifest: manifest,
        extensionPath: path.dirname(extFilePath)
      };
      return ext;
    });
  }

  private _parseExtensionManifest(data: any) {
    const parsed: IExtensionManifest = {
      name: '',
      author: '',
      version: '',
      launcherVersion: ''
    };
    const parser = new ObjectParser({
      input: data
    });
    parser.prop('name',             v => parsed.name            = str(v));
    parser.prop('displayName',      v => parsed.displayName     = str(v), true);
    parser.prop('author',           v => parsed.author          = str(v));
    parser.prop('version',          v => parsed.version         = str(v));
    parser.prop('launcherVersion',  v => parsed.launcherVersion = str(v));
    parser.prop('description',      v => parsed.description     = str(v), true);
    parser.prop('icon',             v => parsed.icon            = str(v), true);
    return parsed;
  }
}
