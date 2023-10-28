import { AppConfigData, AppExtConfigData } from '@shared/config/interfaces';
import { deepCopy, fixSlashes, parseVarStr } from '@shared/Util';
import * as Coerce from '@shared/utils/Coerce';
import { ObjectParser } from '@shared/utils/ObjectParser';

const { num, str } = Coerce;

type IConfigDataDefaults = {
  [key: string]: Readonly<AppConfigData>;
};

/** Default config values used as a "base" for the different platform defaults. */
const configDataDefaultBase: Readonly<AppConfigData> = Object.freeze({
  flashpointPath: '',
  useCustomTitlebar: false,
  startServer: true,
  backPortMin: 12001,
  backPortMax: 12100,
  imagesPortMin: 12101,
  imagesPortMax: 12200,
  logsBaseUrl: 'https://logs.unstable.life/',
  updatesEnabled: true,
  gotdUrl: 'https://download.unstable.life/gotd.json',
  gotdShowAll: false,
  middlewareOverridePath: 'Legacy/middleware_overrides/',
  precacheDatabase: false,
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
 *
 * @param platform Platform to get the defaults for.
 */
export function getDefaultConfigData(platform: NodeJS.Platform): AppConfigData {
  return configDataDefaults[platform] || configDataDefaultBase;
}

/**
 * Overwrite a config data object with data from another object.
 *
 * @param source Object to overwrite.
 * @param data Object with data to overwrite the source with.
 * @param onError Called when an error occurs
 * @returns Source argument (not a copy).
 */
export function overwriteConfigData(
  source: AppConfigData,
  data: Partial<AppConfigData>,
  onError?: (error: string) => void
): AppConfigData {
  const parser = new ObjectParser({
    input: data,
    onError: onError && (e => onError(`Error while parsing Config: ${e.toString()}`)),
  });
  parser.prop('flashpointPath',         v => source.flashpointPath         = parseVarStr(str(v)));
  parser.prop('useCustomTitlebar',      v => source.useCustomTitlebar      = !!v);
  parser.prop('startServer',            v => source.startServer            = !!v);
  parser.prop('backPortMin',            v => source.backPortMin            = num(v));
  parser.prop('backPortMax',            v => source.backPortMax            = num(v));
  parser.prop('imagesPortMin',          v => source.imagesPortMin          = num(v));
  parser.prop('imagesPortMax',          v => source.imagesPortMax          = num(v));
  parser.prop('logsBaseUrl',            v => source.logsBaseUrl            = parseVarStr(str(v)));
  parser.prop('updatesEnabled',         v => source.updatesEnabled         = !!v);
  parser.prop('gotdUrl',                v => source.gotdUrl                = str(v));
  parser.prop('gotdShowAll',            v => source.gotdShowAll            = !!v);
  parser.prop('middlewareOverridePath', v => source.middlewareOverridePath = str(v));
  parser.prop('precacheDatabase',       v => source.precacheDatabase       = !!v);
  // Do some alterations
  source.flashpointPath = fixSlashes(source.flashpointPath); // (Clean path)
  // Return
  return source;
}

/**
 * Overwrite a config data object with data from another object.
 *
 * @param source Object to overwrite.
 * @param data Object with data to overwrite the source with.
 * @returns Source argument (not a copy).
 */
export function overwriteExtConfigData(
  source: AppExtConfigData,
  data: any
): AppExtConfigData {
  for (const key in data) {
    source[key] = data[key];
  }

  // Return
  return source;
}
