import * as path from 'path';
import { readJsonFile } from '../../shared/Util';
import { Coerce } from '../../shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '../../shared/utils/ObjectParser';
import { CreditsData, CreditsDataProfile } from './types';

const { str } = Coerce;

export namespace CreditsFile {
  const filePath: string = './credits.json';
  const fileEncoding: string = 'utf8';

  /**
   * Read and parse the file asynchronously.
   * @param jsonFolder Path of the JSON folder.
   * @param onError Called for each error that occurs while parsing.
   */
  export function readFile(jsonFolder: string, onError?: (error: string) => void): Promise<CreditsData> {
    return new Promise((resolve, reject) => {
      readJsonFile(path.join(jsonFolder, filePath), fileEncoding)
      .then(json => resolve(parseCreditsData(json, onError)))
      .catch(reject);
    });
  }

  function parseCreditsData(data: any, onError?: (error: string) => void): CreditsData {
    const parsed: CreditsData = {
      profiles: []
    };
    const parser = new ObjectParser({
      input: data,
      onError: onError && (e => onError(`Error while parsing Credits: ${e.toString()}`))
    });
    parser.prop('profiles').array(item => parsed.profiles.push(parseProfile(item)));
    return parsed;
  }

  function parseProfile(parser: IObjectParserProp<any>): CreditsDataProfile {
    const parsed: CreditsDataProfile = {
      title: '',
      roles: [],
      note: undefined,
      icon: undefined
    };
    parser.prop('title', v => parsed.title = str(v));
    parser.prop('icon',  v => parsed.icon  = str(v), true);
    parser.prop('note',  v => parsed.note  = str(v), true);
    parser.prop('roles', true).arrayRaw(role => parsed.roles.push(str(role)));
    return parsed;
  }
}
