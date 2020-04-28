import * as path from 'path';
import { IBackProcessInfo } from '@shared/interfaces';
import { parseVarStr, readJsonFile } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '@shared/utils/ObjectParser';

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
  export function readFile(jsonFolder: string, onError?: (error: string) => void): Promise<ServiceFileData> {
    return new Promise((resolve, reject) => {
      readJsonFile(path.join(jsonFolder, filePath), fileEncoding)
      .then(json => resolve(parseServiceFileData(json, onError)))
      .catch(reject);
    });
  }

  function parseServiceFileData(data: any, onError?: (error: string) => void): ServiceFileData {
    let parsed: ServiceFileData = {
      redirector: undefined,
      fiddler: undefined,
      server: undefined,
      start: [],
      stop: [],
    };
    const parser = new ObjectParser({
      input: data,
      onError: onError && (e => { onError(`Error while parsing Services: ${e.toString()}`); })
    });
    parsed.fiddler    = parseBackProcessInfo(parser.prop('fiddler', true));
    parsed.redirector = parseBackProcessInfo(parser.prop('redirector', true));
    parsed.server     = parseBackProcessInfo(parser.prop('server', true));
    parser.prop('start', true).array(item => parsed.start.push(parseBackProcessInfo(item)));
    parser.prop('stop', true).array(item  => parsed.stop.push(parseBackProcessInfo(item)));
    return parsed;
  }

  function parseBackProcessInfo(parser: IObjectParserProp<any>): IBackProcessInfo {
    let parsed: IBackProcessInfo = {
      path: '',
      filename: '',
      arguments: [],
      kill: false,
    };
    parser.prop('path',     v => parsed.path     = parseVarStr(str(v)));
    parser.prop('filename', v => parsed.filename = parseVarStr(str(v)));
    parser.prop('kill',     v => parsed.kill     = !!v, true);
    parser.prop('arguments').arrayRaw(item => parsed.arguments.push(parseVarStr(str(item))));
    return parsed;
  }
}

export type ServiceFileData = {
  redirector?: IBackProcessInfo;
  fiddler?: IBackProcessInfo;
  server?: IBackProcessInfo;
  /** Processes to run before the launcher starts. */
  start: IBackProcessInfo[];
  /** Processes to run when the launcher closes. */
  stop: IBackProcessInfo[];
}
