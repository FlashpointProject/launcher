import * as path from 'path';
import { IBackProcessInfo } from '../../shared/service/interfaces';
import { readJsonFile } from '../../shared/Util';
import { IObjectParserProp, ObjectParser } from '../../shared/utils/ObjectParser';
import { parseVarStr } from '../Util';
import { IBackProcessInfoFile } from './interfaces';

export class BackgroundServicesFile {
  /** Path to the background services file (relative to the flashpoint root folder) */
  private static filePath: string = './services.json';
  /** Encoding used by background services file */
  private static fileEncoding: string = 'utf8';

  /** Read and parse the file asynchronously */
  public static readFile(jsonFolder: string, onError?: (error: string) => void): Promise<IBackProcessInfoFile> {
    return new Promise((resolve, reject) => {
      readJsonFile(path.join(jsonFolder, BackgroundServicesFile.filePath),
                   BackgroundServicesFile.fileEncoding)
      .then(json => resolve(parseBackProcessInfoFile(json, onError)))
      .catch(reject);
    });
  }
}

function parseBackProcessInfoFile(data: any, onError?: (error: string) => void): IBackProcessInfoFile {
  let parsed: IBackProcessInfoFile = {
    redirector: undefined,
    fiddler: undefined,
    server: undefined,
    start: [],
    stop: [],
  };
  const parser = new ObjectParser({
    input: data,
    onError: onError && ((e) => { onError(`Error while parsing Services: ${e.toString()}`); })
  });
  parsed.redirector = parseBackProcessInfo(parser.prop('redirector'));
  parsed.fiddler    = parseBackProcessInfo(parser.prop('fiddler'));
  parsed.server     = parseBackProcessInfo(parser.prop('server'));
  parser.prop('start').array(item => parsed.start.push(parseBackProcessInfo(item)));
  parser.prop('stop').array(item  => parsed.stop.push(parseBackProcessInfo(item)));
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
  parser.prop('arguments').arrayRaw(item => parsed.arguments.push(parseVarStr(item)));
  return parsed;
}

/** Coerce anything to a string. */
function str(str: any): string {
  return (str || '') + '';
}
