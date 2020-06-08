import { IAppConfigData } from '@shared/config/interfaces';
import { IBackProcessInfo, INamedBackProcessInfo } from '@shared/interfaces';
import { parseVarStr, readJsonFile } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '@shared/utils/ObjectParser';
import * as path from 'path';
import { ServiceFileData } from './types';

const { str } = Coerce;

export namespace ServicesFile {
  /** Path to the background services file (relative to the flashpoint root folder) */
  const filePath: string = './services.json';
  /** Encoding used by background services file */
  const fileEncoding: string = 'utf8';

  /**
   * Read and parse the file asynchronously.
   * @param jsonFolder Path of the JSON folder.
   * @param onError Called for each error that occurs while parsing.
   */
  export function readFile(jsonFolder: string, config: IAppConfigData, onError?: (error: string) => void): Promise<ServiceFileData> {
    return new Promise((resolve, reject) => {
      readJsonFile(path.join(jsonFolder, filePath), fileEncoding)
      .then(json => resolve(parseServiceFileData(json, config, onError)))
      .catch(reject);
    });
  }

  function parseServiceFileData(data: any, config: IAppConfigData, onError?: (error: string) => void): ServiceFileData {
    let parsed: ServiceFileData = {
      server: [],
      start: [],
      stop: [],
      watch: [],
    };
    const parser = new ObjectParser({
      input: data,
      onError: onError && (e => { onError(`Error while parsing Services: ${e.toString()}`); })
    });
    parser.prop('server').array(item => parsed.server.push(parseNamedBackProcessInfo(item, config)));
    parser.prop('start').array(item => parsed.start.push(parseBackProcessInfo(item, config)));
    parser.prop('stop').array(item  => parsed.stop.push(parseBackProcessInfo(item, config)));
    parser.prop('watch').arrayRaw(item => parsed.watch.push(parseVarStr(str(item), config)));
    return parsed;
  }

  function parseNamedBackProcessInfo(parser: IObjectParserProp<any>, config: IAppConfigData): INamedBackProcessInfo {
    const backProcessInfo = parseBackProcessInfo(parser, config);
    const parsed: INamedBackProcessInfo = {
      ...backProcessInfo,
      name: '',
      mad4fp: false,
    };

    parser.prop('name',   v => parsed.name   = str(v));
    parser.prop('mad4fp', v => parsed.mad4fp = !!v);
    return parsed;
  }

  function parseBackProcessInfo(parser: IObjectParserProp<any>, config: IAppConfigData): IBackProcessInfo {
    let parsed: IBackProcessInfo = {
      path: '',
      filename: '',
      arguments: [],
      kill: false,
    };
    parser.prop('path',     v => parsed.path     = parseVarStr(str(v), config));
    parser.prop('filename', v => parsed.filename = parseVarStr(str(v), config));
    parser.prop('kill',     v => parsed.kill     = !!v, true);
    parser.prop('arguments').arrayRaw(item => parsed.arguments.push(parseVarStr(str(item), config)));
    return parsed;
  }
}
