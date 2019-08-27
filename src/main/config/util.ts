import { IAppConfigData } from '../../shared/config/interfaces';
import { deepCopy } from '../../shared/Util';
import { ObjectParser } from '../../shared/utils/ObjectParser';
import { parseVarStr } from '../Util';
import { ParseArgs } from '../background/types';
import { buildParseArgs } from '../Util';

type IConfigDataDefaults = {
  [key: string]: Readonly<IAppConfigData>;
};

/** Default config values used as a "base" for the different platform defaults. */
const configDataDefaultBase: Readonly<IAppConfigData> = Object.freeze({
  flashpointPath: '',
  imageFolderPath: 'Data/Images',
  logoFolderPath: 'Data/Logos',
  playlistFolderPath: 'Data/Playlists',
  jsonFolderPath: 'Data',
  themeFolderPath: 'Data/Themes',
  useCustomTitlebar: false,
  startServer: true,
  startRedirector: true,
  useFiddler: false,
  disableExtremeGames: false,
  showBrokenGames: false,
});

/**
 * Default config values for the different platforms.
 * All platforms not listed here use will use the base.
 */
const configDataDefaults: IConfigDataDefaults = {
  // Windows
  win32: Object.freeze(overwriteConfigData(
    deepCopy(configDataDefaultBase),
    { useCustomTitlebar: true, }
  )),
  // Linux
  linux: Object.freeze(overwriteConfigData(
    deepCopy(configDataDefaultBase),
    { useCustomTitlebar: false, }
  )),
  // ...
};

/**
 * Get the default config data for a specific platform.
 * @param platform Platform to get the defaults for.
 */
export function getDefaultConfigData(platform: NodeJS.Platform): IAppConfigData {
  return configDataDefaults[platform] || configDataDefaultBase;
}

/**
 * Overwrite a config data object with data from another object.
 * @param source Object to overwrite.
 * @param data Object with data to overwrite the source with.
 * @returns Source argument (not a copy).
 */
export function overwriteConfigData(
  source: IAppConfigData,
  data: Partial<IAppConfigData>,
  onError?: (error: string) => void
): IAppConfigData {
  const parseArgs : ParseArgs = buildParseArgs();
  const parser = new ObjectParser({
    input: data,
    onError: onError && (error => onError(`Error while parsing Config: ${error.toString()}`)),
  });
  parser.prop('flashpointPath',      v => source.flashpointPath      = parseVarStr(str(v), parseArgs));
  parser.prop('imageFolderPath',     v => source.imageFolderPath     = parseVarStr(str(v), parseArgs));
  parser.prop('logoFolderPath',      v => source.logoFolderPath      = parseVarStr(str(v), parseArgs));
  parser.prop('playlistFolderPath',  v => source.playlistFolderPath  = parseVarStr(str(v), parseArgs));
  parser.prop('jsonFolderPath',      v => source.jsonFolderPath      = parseVarStr(str(v), parseArgs));
  parser.prop('useCustomTitlebar',   v => source.useCustomTitlebar   = !!v);
  parser.prop('startServer',         v => source.startServer         = !!v);
  parser.prop('startRedirector',     v => source.startRedirector     = !!v);
  parser.prop('useFiddler',          v => source.useFiddler          = !!v);
  parser.prop('disableExtremeGames', v => source.disableExtremeGames = !!v);
  parser.prop('showBrokenGames',     v => source.showBrokenGames     = !!v);
  // Do some alterations
  source.flashpointPath = source.flashpointPath.replace(/\\/g, '/'); // (Clean path)
  // Return
  return source;
}

/** Coerce anything to a string. */
function str(str: any): string {
  return (str || '') + '';
}
