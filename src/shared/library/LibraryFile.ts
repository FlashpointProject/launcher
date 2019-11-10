import * as path from 'path';
import { readJsonFile } from '../Util';
import { IObjectParserProp, ObjectParser } from '../utils/ObjectParser';
import { GameLibraryFile, GameLibraryFileItem } from './types';

export namespace LibraryFile {
  /** Path to the game library file (relative to the flashpoint root folder) */
  const filePath: string = './libraries.json';
  /** Encoding used by game library file */
  const fileEncoding: string = 'utf8';

  /**
   * Read and parse the file asynchronously.
   * @param jsonFolder Path of the JSON folder.
   * @param onError Called for each error that occurs while parsing.
   */
  export function readFile(jsonFolder: string, onError?: (error: string) => void): Promise<GameLibraryFile> {
    return new Promise((resolve, reject) => {
      readJsonFile(path.join(jsonFolder, filePath), fileEncoding)
      .then(json => resolve(parseGameLibrary(json, onError)))
      .catch(reject);
    });
  }

}

function parseGameLibrary(data: any, onError?: (error: string) => void): GameLibraryFile {
  const parsed: GameLibraryFile = {
    libraries: [],
  };
  const parser = new ObjectParser({
    input: data,
    onError: onError && (e => { onError(`Error while parsing Game Library: ${e.toString()}`); })
  });
  parser.prop('libraries').array(item => parsed.libraries.push(parseLibrary(item)));
  return parsed;
}

function parseLibrary(parser: IObjectParserProp<any>): GameLibraryFileItem {
  const parsed: GameLibraryFileItem = {
    title: '',
    route: '',
    prefix: undefined,
    default: undefined,
  };
  parser.prop('title',   v => parsed.title   = v+'');
  parser.prop('route',   v => parsed.route   = v+'');
  parser.prop('prefix',  v => parsed.prefix  = v+'', true);
  parser.prop('default', v => parsed.default = !!v,  true);
  return parsed;
}
