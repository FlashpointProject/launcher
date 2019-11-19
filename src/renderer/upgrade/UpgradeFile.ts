import * as path from 'path';
import { readJsonFile } from '../../shared/Util';
import { Coerce } from '../../shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '../../shared/utils/ObjectParser';
import { UpgradeStage } from './types';
import { UpgradeStageState } from '../interfaces';
import { uuid } from '../uuid';

const { str } = Coerce;

export namespace UpgradeFile {
  const filePath: string = './upgrade.json';
  const fileEncoding: string = 'utf8';

  /**
   * Read and parse the file asynchronously.
   * @param jsonFolder Path of the JSON folder.
   * @param onError Called for each error that occurs while parsing.
   */
  export function readFile(jsonFolder: string, onError?: (error: string) => void): Promise<UpgradeStage[]> {
    return new Promise((resolve, reject) => {
      readJsonFile(path.join(jsonFolder, filePath), fileEncoding)
      .then(json => resolve(parseFile(json, onError)))
      .catch(reject);
    });
  }

  function parseFile(data: any, onError?: (error: string) => void): UpgradeStage[] {
    const parser = new ObjectParser({
      input: data,
      onError: onError && (e => { onError(`Error while parsing Upgrades: ${e.toString()}`); })
    });
    const stages: UpgradeStage[] = [];
    for (let key in data) {
      stages.push(parseUpgradeStage(parser.prop(key)));
    }
    return stages;
  }

  function parseUpgradeStage(parser: IObjectParserProp<any>): UpgradeStage {
    const parsed: UpgradeStage = {
      id: uuid(),
      title: '',
      description: '',
      verify_files: [],
      verify_md5: [],
      sources: [],
      sources_md5: '',
      deletePaths: [],
      keepPaths: [],
      launcherUpgrade: false,
      state: newUpgradeStageState()
    };
    parser.prop('title',            v => parsed.title            = str(v));
    parser.prop('description',      v => parsed.description      = str(v));
    parser.prop('verify_files',     v => parsed.verify_files     = strArr(v));
    parser.prop('verify_md5',       v => parsed.verify_md5       = strArr(v));
    parser.prop('sources',          v => parsed.sources          = strArr(v));
    parser.prop('sources_md5',      v => parsed.sources_md5      = str(v));
    parser.prop('deletePaths',      v => parsed.deletePaths      = strArr(v));
    parser.prop('keepPaths',        v => parsed.keepPaths        = strArr(v));
    parser.prop('launcherUpgrade',  v => parsed.launcherUpgrade  = !!v);
    return parsed;
  }
}

function newUpgradeStageState(): UpgradeStageState {
  return {
    alreadyInstalled: false,
    checksDone: false,
    isInstalling: false,
    isInstallationComplete: false,
    installProgressNote: '',
    upToDate: false
  };
}

function strArr(value: any): string[] {
  return (Array.isArray(value))
    ? Array.prototype.map.call(value, item => str(item)) as string[]
    : [];
}
