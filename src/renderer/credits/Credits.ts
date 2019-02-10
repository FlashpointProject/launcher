import * as path from 'path';
import { ICreditsData, ICreditsDataProfile } from './interfaces';
import { ObjectParser, IObjectParserProp } from '../../shared/utils/ObjectParser';
import { readJsonFile } from '../../shared/Util';

const creditsFilePath: string = './Data/credits.json';
const creditsFileEncoding: string = 'utf8';

export function readCreditsFile(flashpointFolder: string, onError?: (error: string) => void): Promise<ICreditsData> {
  return new Promise((resolve, reject) => {
    readJsonFile(path.join(flashpointFolder, creditsFilePath), 
                 creditsFileEncoding)
    .then(json => resolve(parseCreditsData(json, onError)))
    .catch(reject);
  });
}

function createEmptyCreditsData(): ICreditsData {
  return {
    profiles: []
  };
}

function createEmptyCreditsDataProfile(): ICreditsDataProfile {
  return {
    title: '',
    roles: [],
    note: undefined,
    icon: undefined
  };
}

function parseCreditsData(data: any, onError?: (error: string) => void): ICreditsData {
  const parsed: ICreditsData = createEmptyCreditsData();
  const parser = new ObjectParser({
    input: data,
    onError: onError ? (error => onError(`Error while parsing Credits: ${error.toString()}`)) : noop
  });
  parser.prop('profiles').array(item => parsed.profiles.push(parseProfile(item)));
  // Return
  return parsed;
}

function parseProfile(parser: IObjectParserProp<any>): ICreditsDataProfile {
  const parsed = createEmptyCreditsDataProfile();
  parser.prop('title', v => parsed.title = str(v));
  parser.prop('icon',  v => parsed.icon  = str(v), true);
  parser.prop('note',  v => parsed.note  = str(v), true);
  parser.prop('roles').arrayRaw(role => parsed.roles.push(str(role)));
  return parsed;
}

function num(n: any): number {
  return parseFloat(n) || 0;
}

function str(str: any): string {
  return (str || '') + '';
}

function strOpt<T extends string>(text: any, options: T[], defaultOption: T): T {
  text = str(text);
  for (let option of options) {
    if (text === option) { return text; }
  }
  return defaultOption;
}

function noop() {}
