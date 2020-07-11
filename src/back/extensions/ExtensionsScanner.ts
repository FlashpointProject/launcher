import { IAppConfigData } from '@shared/config/interfaces';
import { Coerce } from '@shared/utils/Coerce';
import { ObjectParser, IObjectParserProp } from '@shared/utils/ObjectParser';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionType, IExtension, IExtensionManifest, Contributions, Theme, DevScript } from '../../shared/extensions/interfaces';
import { readJsonFile } from '@shared/Util';

const { str } = Coerce;
const fsPromises = fs.promises;

export async function scanExtensions(configData: IAppConfigData): Promise<IExtension[]> {
  const result = new Map<string, IExtension>();

  // TODO: System extensions (?)

  // User extensions
  const userExtPath = path.join(configData.flashpointPath, configData.extensionsPath);
  await fsPromises.readdir(userExtPath, { withFileTypes: true })
  .then((files) => {
    return Promise.all(files.filter(f => f.isDirectory()).map(async file => {
      const manifestPath = path.join(userExtPath, file.name, 'package.json');
      return fsPromises.stat(manifestPath)
      .then(async (stats) => {
        if (stats.isFile()) {
          await fsPromises.access(manifestPath);
          const ext = await parseExtension(manifestPath, ExtensionType.User);
          if (result.get(ext.id) !== undefined) {
            log.warn('Extensions', `Overriding Extension ${ext.id}`);
          }
          result.set(ext.id, ext);
        }
      })
      .catch(err => log.error('Extensions', `Error loading User extension "${file.name}"\n${err}`));
    }));
  });

  const r: IExtension[] = [];
  result.forEach((ext) => {
    log.info('Extensions', `Extension Scanned "${ext.manifest.displayName || ext.manifest.name}" (${ext.id})`);
    r.push(ext);
  });
  return r;
}

function getExtensionID(author: string, name: string) {
  const fAuthor = author.toLowerCase().replace(' ', '-');
  if (name.includes(' ') || name.toLowerCase() !== name) {
    throw new Error('Extension names may not include uppercase or space characters!');
  }
  return `${fAuthor}.${name}`;
}

async function parseExtension(extFilePath: string, type: ExtensionType): Promise<IExtension> {
  const data = await readJsonFile(extFilePath);
  const manifest = await parseExtensionManifest(data);
  const ext: IExtension = {
    id: getExtensionID(manifest.author, manifest.name),
    type: type,
    manifest: manifest,
    extensionPath: path.dirname(extFilePath)
  };
  return ext;
}

async function parseExtensionManifest(data: any) {
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
  parser.prop('main',             v => parsed.main            = str(v), true);
  parsed.contributes = parseContributions(parser.prop('contributes'));
  return parsed;
}

function parseContributions(parser: IObjectParserProp<Contributions>): Contributions {
  const contributes: Contributions = {
    themes: [],
    devScripts: []
  };
  parser.prop('themes').array((item) => contributes.themes.push(parseTheme(item)));
  parser.prop('devScripts').array((item) => contributes.devScripts.push(parseDevScript(item)));
  return contributes;
}

function parseTheme(parser: IObjectParserProp<Theme>): Theme {
  const theme: Theme = {
    id: '',
    path: ''
  };
  parser.prop('id',   v => theme.id   = str(v));
  parser.prop('path', v => theme.path = str(v));
  return theme;
}

function parseDevScript(parser: IObjectParserProp<DevScript>): DevScript {
  const devScript: DevScript = {
    name: '',
    description: '',
    command: ''
  };
  parser.prop('name',        v => devScript.name        = str(v));
  parser.prop('description', v => devScript.description = str(v));
  parser.prop('command',     v => devScript.command     = str(v));
  return devScript;
}
