import * as path from 'path';
import { ExecMapping } from '@shared/interfaces';
import { parseVarStr, readJsonFile } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '@shared/utils/ObjectParser';

const { str } = Coerce;

/* Holds all Exec Mappings from execs file */
type ExecMappingFile = {
  execs: ExecMapping[];
}

/** Relative path to exec mappings file */
const filePath: string = 'execs.json';

/**
 * Load exec mapping file
 * @param filePath Path to execs.json
 */
export function loadExecMappingsFile(jsonFolder: string, onError?: (error: string) => void): Promise<ExecMapping[]> {
  return new Promise((resolve, reject) => {
    readJsonFile(path.join(jsonFolder, filePath), 'utf8')
    .then((json) => { resolve(parseExecMappingsFile(json, onError).execs); })
    .catch(reject);
  });
}

function parseExecMappingsFile(data: any, onError?: (error: string) => void) : ExecMappingFile {
  let parsed: ExecMappingFile = {
    execs: [],
  };
  const parser = new ObjectParser({
    input: data,
    onError: onError && ((e) => { onError(`Error while parsing Exec Mappings: ${e.toString()}`); })
  });
  parser.prop('execs').array(item => parsed.execs.push(parseExecMapping(item)));
  return parsed;
}

function parseExecMapping(parser: IObjectParserProp<any>) : ExecMapping {
  let parsed: ExecMapping = {
    win32: '',
    linux: undefined,
    darwin: undefined,
  };
  parser.prop('win32',  v => parsed.win32  = parseVarStr(str(v)));
  parser.prop('linux',  v => parsed.linux  = parseVarStr(str(v)), true);
  parser.prop('darwin', v => parsed.darwin = parseVarStr(str(v)), true);
  return parsed;
}
