import * as path from 'path';
import { readJsonFile } from '../Util';
import { ObjectParser, IObjectParserProp } from '../utils/ObjectParser';
import { IGameLibraryFile, IGameLibraryFileItem } from './interfaces';

/** Path to the game library file (relative to the flashpoint root folder) */
const filePath: string = './Data/libraries.json';
/** Encoding used by game library file */
const fileEncoding: string = 'utf8';

/** Read and parse a platform library file asynchronously */
export function readGameLibraryFile(flashpointFolder: string, onError?: (error: string) => void): Promise<IGameLibraryFile> {
  return new Promise((resolve, reject) => {
    readJsonFile(path.join(flashpointFolder, filePath), fileEncoding)
    .then(json => resolve(parseGameLibrary(json, onError)))
    .catch(reject);
  });
}

function parseGameLibrary(data: any, onError?: (error: string) => void): IGameLibraryFile {
  const parsed = createGameLibrary();
  const parser = new ObjectParser({
    input: data,
    onError: onError ? (error) => { onError(error.toString()); } : noop
  });
  parser.prop('libraries').array(item => parsed.libraries.push(parseLibrary(item)));
  return parsed;
}

function parseLibrary(parser: IObjectParserProp<any>): IGameLibraryFileItem {
  const parsed = createGameLibraryItem();
  parser.prop('title',   v => parsed.title   = v+'');
  parser.prop('route',   v => parsed.route   = v+'');
  parser.prop('prefix',  v => parsed.prefix  = v+'', true);
  parser.prop('default', v => parsed.default = !!v,  true);
  return parsed;
}

function createGameLibrary(): IGameLibraryFile {
  return {
    libraries: [],
  };
}

function createGameLibraryItem(): IGameLibraryFileItem {
  return {
    title: '',
    route: '',
    prefix: undefined,
    default: undefined,
  };
}

function noop() {}
