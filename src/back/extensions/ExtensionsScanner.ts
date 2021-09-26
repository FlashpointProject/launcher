import { AppConfigData } from '@shared/config/interfaces';
import { EditCurationMeta } from '@shared/curate/OLD_types';
import { readJsonFile } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '@shared/utils/ObjectParser';
import * as fs from 'fs';
import * as path from 'path';
import { Application, ButtonContext, ContextButton, Contributions, CurationTemplate, DevScript, ExtConfiguration, ExtConfigurationProp, ExtensionType, ExtTheme, IExtension, IExtensionManifest, ILogoSet } from '../../shared/extensions/interfaces';

const { str, num } = Coerce;
const fsPromises = fs.promises;

/** Scans all extensions in System and User paths and returns them. */
export async function scanExtensions(configData: AppConfigData, extensionPath: string): Promise<IExtension[]> {
  const result = new Map<string, IExtension>();

  // TODO: System extensions (?)

  // User extensions
  const userExtPath = path.resolve(extensionPath);
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
            log.warn('Extensions', `Overriding Extension ${ext.id} with extension at "${path.join(userExtPath, filename)}"`);
          }
          result.set(ext.id, ext);
        }
      })
      .catch(err => log.error('Extensions', `Error loading User extension at "${filename}"\n${err}`));
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
    extensionPath: path.resolve(path.dirname(extFilePath))
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
    configuration: [],
    curationTemplates: [],
  };
  parser.prop('logoSets',          true).array(item => contributes.logoSets.push(parseLogoSet(item)));
  parser.prop('themes',            true).array(item => contributes.themes.push(parseTheme(item)));
  parser.prop('devScripts',        true).array(item => contributes.devScripts.push(parseDevScript(item)));
  parser.prop('contextButtons',    true).array(item => contributes.contextButtons.push(parseContextButton(item)));
  parser.prop('applications',      true).array(item => contributes.applications.push(parseApplication(item)));
  parser.prop('configuration',     true).array(item => contributes.configuration.push(parseConfiguration(item)));
  parser.prop('curationTemplates', true).array(item => contributes.curationTemplates.push(parseCurationTemplate(item)));
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
  parser.prop('context',           v => contextButton.context           = parseButtonContext(v));
  parser.prop('name',              v => contextButton.name              = str(v));
  parser.prop('command',           v => contextButton.command           = str(v));
  parser.prop('runWithNoCuration', v => contextButton.runWithNoCuration = !!v, true);
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

function parseConfiguration(parser: IObjectParserProp<ExtConfiguration>): ExtConfiguration {
  const configuration: ExtConfiguration = {
    title: '',
    properties: {}
  };

  parser.prop('title', v => configuration.title = str(v));
  parser.prop('properties').map((item, key) => configuration.properties[key] = parseConfigurationProperty(item));

  return configuration;
}

function parseCurationTemplate(parser: IObjectParserProp<CurationTemplate>): CurationTemplate {
  const curationTemplate: CurationTemplate = {
    name: '',
    logo: '',
    meta: {}
  };

  parser.prop('name', v => curationTemplate.name = str(v));
  parser.prop('logo', v => curationTemplate.logo = str(v));
  curationTemplate.meta = parseCurationMeta(parser.prop('meta'));

  // @TODO reuse code

  return curationTemplate;
}

function parseCurationMeta(parser: IObjectParserProp<EditCurationMeta>): EditCurationMeta {
  const parsed: EditCurationMeta = {};

  parser.prop('notes',                v => parsed.notes               = str(v));
  parser.prop('applicationPath',      v => parsed.applicationPath     = str(v));
  parser.prop('curationNotes',        v => parsed.curationNotes       = str(v));
  parser.prop('developer',            v => parsed.developer           = arrayStr(v));
  parser.prop('extreme',              v => parsed.extreme             = str(v).toLowerCase() === 'yes' ? true : false);
  parser.prop('language',             v => parsed.language            = arrayStr(v));
  parser.prop('launchCommand',        v => parsed.launchCommand       = str(v));
  parser.prop('originalDescription',  v => parsed.originalDescription = str(v));
  parser.prop('playMode',             v => parsed.playMode            = arrayStr(v));
  parser.prop('platform',             v => parsed.platform            = str(v));
  parser.prop('publisher',            v => parsed.publisher           = arrayStr(v));
  parser.prop('releaseDate',          v => parsed.releaseDate         = str(v));
  parser.prop('series',               v => parsed.series              = str(v));
  parser.prop('source',               v => parsed.source              = str(v));
  parser.prop('status',               v => parsed.status              = str(v));
  parser.prop('title',                v => parsed.title               = str(v));
  parser.prop('alternateTitles',      v => parsed.alternateTitles     = arrayStr(v));
  parser.prop('version',              v => parsed.version             = str(v));
  parser.prop('library',              v => parsed.library             = str(v).toLowerCase()); // must be lower case

  return parsed;
}

function parseConfigurationProperty(parser: IObjectParserProp<ExtConfigurationProp>): ExtConfigurationProp {
  const prop: ExtConfigurationProp = {
    title: '',
    type: 'object',
    default: {},
    enum: [],
    description: '',
  };

  parser.prop('title',       v => prop.title       = str(v));
  parser.prop('type',        v => prop.type        = toPropType(v));
  parser.prop('description', v => prop.description = str(v));
  parser.prop('default',     v => prop.default     = v, true);
  parser.prop('command',     v => prop.command     = str(v), true);
  parser.prop('enum', true).arrayRaw(item => prop.enum.push(item));

  return prop;
}

function toPropType(v: any): ExtConfigurationProp['type'] {
  if (v === 'object' || v === 'string' || v === 'boolean' || v === 'number' || v === 'button') {
    return v;
  } else {
    throw new Error('Configuration prop type is not valid. (string, object, number or boolean)');
  }
}

// Coerce an object into a sensible string
function arrayStr(rawStr: any): string {
  if (Array.isArray(rawStr)) {
    // Convert lists to ; separated strings
    return rawStr.join('; ');
  }
  return str(rawStr);
}
