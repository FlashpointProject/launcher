import { AppConfigData } from '@shared/config/interfaces';
import { readJsonFile } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '@shared/utils/ObjectParser';
import * as fs from 'fs';
import * as path from 'path';
import { Application, ButtonContext, ContextButton, Contributions, DevScript, ExtensionType, ExtTheme, IExtension, IExtensionManifest, ILogoSet } from '../../shared/extensions/interfaces';

const { str, num } = Coerce;
const fsPromises = fs.promises;

/** Scans all extensions in System and User paths and returns them. */
export async function scanExtensions(configData: AppConfigData): Promise<IExtension[]> {
  const result = new Map<string, IExtension>();

  // TODO: System extensions (?)

  // User extensions
  const userExtPath = path.join(configData.flashpointPath, configData.extensionsPath);
  await fs.promises.access(userExtPath, fs.constants.F_OK | fs.constants.R_OK)
  .then(() => {/** Folder exists */})
  .catch(() => fs.promises.mkdir(userExtPath));
  await fsPromises.readdir(userExtPath)
  .then(filenames => {
    // Each folder inside is an Extension
    return Promise.all(filenames.map(async filename => {
      // Make sure it is a folder or symlink folder
      const stats = await fs.promises.stat(path.join(userExtPath, filename));
      if (!stats.isDirectory()) { return; }
      // Read Manifest
      const manifestPath = path.join(userExtPath, filename, 'package.json');
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
      .catch(err => log.error('Extensions', `Error loading User extension "${filename}"\n${err}`));
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
  parser.prop('contributes',      v => parsed.contributes     = parseContributions(parser.prop('contributes')), true);
  return parsed;
}

function parseContributions(parser: IObjectParserProp<Contributions>): Contributions {
  const contributes: Contributions = {
    logoSets: [],
    themes: [],
    devScripts: [],
    contextButtons: [],
    applications: [],
  };
  parser.prop('logoSets',       true).array(item => contributes.logoSets.push(parseLogoSet(item)));
  parser.prop('themes',         true).array(item => contributes.themes.push(parseTheme(item)));
  parser.prop('devScripts',     true).array(item => contributes.devScripts.push(parseDevScript(item)));
  parser.prop('contextButtons', true).array(item => contributes.contextButtons.push(parseContextButton(item)));
  parser.prop('applications',   true).array(item => contributes.applications.push(parseApplication(item)));
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

function parseContextButton(parser: IObjectParserProp<ContextButton>): ContextButton {
  const contextButton: ContextButton = {
    context: 'game',
    name: '',
    command: ''
  };
  parser.prop('context',     v => contextButton.context     = parseButtonContext(v));
  parser.prop('name',        v => contextButton.name        = str(v));
  parser.prop('command',     v => contextButton.command     = str(v));
  return contextButton;
}

function parseButtonContext(value: any): ButtonContext {
  // TODO : Validate
  return value;
}

function parseApplication(parser: IObjectParserProp<Application>): Application {
  const application: Application = {
    provides: [],
    arguments: [],
    name: '',
  };
  parser.prop('provides').arrayRaw((item) => application.provides.push(str(item)));
  parser.prop('name',    v => application.name    = str(v));
  parser.prop('command', v => application.command = str(v), true);
  parser.prop('arguments', true).arrayRaw(v => application.arguments.push(str(v)));
  parser.prop('path',    v => application.path    = str(v), true);
  parser.prop('url',     v => application.url    = str(v), true);
  const numDefined = num(!!application.command) + num(!!application.path) + num(!!application.url);
  if (numDefined !== 1) { throw new Error('Exactly one "path", "url" or "command" variable must be defined for an application, not both.'); }
  if (application.provides.length === 0) { throw new Error('Application must provide something. (Empty provides array)'); }
  return application;
}
