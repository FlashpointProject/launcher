import { IAppConfigData } from '@shared/config/interfaces';
import { readJsonFile } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '@shared/utils/ObjectParser';
import * as fs from 'fs';
import * as path from 'path';
import { Contributions, DevScript, ExtensionType, ExtTheme, IExtension, IExtensionManifest, ILogoSet } from '../../shared/extensions/interfaces';

const { str } = Coerce;
const fsPromises = fs.promises;

/** Scans all extensions in System and User paths and returns them. */
export async function scanExtensions(configData: IAppConfigData): Promise<IExtension[]> {
  const result = new Map<string, IExtension>();

  // TODO: System extensions (?)

  // User extensions
  const userExtPath = path.join(configData.flashpointPath, configData.extensionsPath);
  await fs.promises.access(userExtPath, fs.constants.F_OK | fs.constants.R_OK)
  .then(() => {/** Folder exists */})
  .catch(() => fs.promises.mkdir(userExtPath));
  await fsPromises.readdir(userExtPath, { withFileTypes: true })
  .then((files) => {
    // Each folder inside is an Extension
    return Promise.all(files.filter(f => f.isDirectory()).map(async file => {
      const manifestPath = path.join(userExtPath, file.name, 'package.json');
      return fsPromises.stat(manifestPath)
      .then(async (stats) => {
        // Manifest file (package.json) exists, continue loading extension
        if (stats.isFile()) {
          await fsPromises.access(manifestPath);
          const ext = await parseExtension(manifestPath, ExtensionType.User);
          if (result.get(ext.id) !== undefined) {
            // An Extension with the same id has been registered earlier, latest read survives
            log.warn('Extensions', `Overriding Extension ${ext.id}`);
          }
          result.set(ext.id, ext);
        }
      })
      .catch(err => log.error('Extensions', `Error loading User extension "${file.name}"\n${err}`));
    }));
  });

  // Convert the map to an array and return
  const r: IExtension[] = [];
  result.forEach((ext) => {
    log.debug('Extensions', `Extension Scanned "${ext.manifest.displayName || ext.manifest.name}" (${ext.id})`);
    r.push(ext);
  });
  return r;
}

/** Returns the extensions ID given its author and name from its manifest */
function getExtensionID(author: string, name: string) {
  const fAuthor = author.toLowerCase().replace(' ', '-');
  if (name.includes(' ') || name.toLowerCase() !== name) {
    throw new Error('Extension names may not include uppercase or space characters!');
  }
  return `${fAuthor}.${name}`;
}

/** Parses an extension
 * @param extFilePath Path to the Extension Manifest (package.json)
 * @param type System or User extension
 * @returns Fully formed Extension
 */
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

/**
 * Parses the manifest file
 * @param data JSON data of manifest
 * @returns Parsed Manifest
 */
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
    logoSets: [],
    themes: [],
    devScripts: []
  };
  parser.prop('logoSets').array((item) => contributes.logoSets.push(parseLogoSet(item)));
  parser.prop('themes').array((item) => contributes.themes.push(parseTheme(item)));
  parser.prop('devScripts').array((item) => contributes.devScripts.push(parseDevScript(item)));
  return contributes;
}

function parseLogoSet(parser: IObjectParserProp<ILogoSet>): ILogoSet {
  const logoSet: ILogoSet = {
    id: '',
    name: '',
    path: '',
  };
  parser.prop('id',   v => logoSet.id   = str(v));
  parser.prop('name', v => logoSet.name = str(v));
  parser.prop('path', v => logoSet.path = str(v));
  return logoSet;
}

function parseTheme(parser: IObjectParserProp<ExtTheme>): ExtTheme {
  const theme: ExtTheme = {
    id: '',
    path: ''
  };
  parser.prop('id',      v => theme.id      = str(v));
  parser.prop('path',    v => theme.path    = str(v));
  parser.prop('logoSet', v => theme.logoSet = str(v), true);
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
