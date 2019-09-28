import * as path from 'path';
import { parseVarStr } from '../../main/Util';
import { readJsonFile } from '../../shared/Util';
import { IObjectParserProp, ObjectParser } from '../../shared/utils/ObjectParser';

export declare type ExecMapping = {
  /** Exec paths for Windows (required), Linux and Mac */
  win32: string;
  linux?: string;
  darwin?: string;
}

declare type ExecMappingFile = {
  execs: ExecMapping[];
}

/** Relative path to exec mappings file */
const filePath: string = 'execs.json';
/** File Encoding for exec mappings file */
const fileEncoding: string = 'utf8';

/**
 * Load exec mapping file
 * @param filePath Path to execs.json
 */
export function loadExecMappingsFile(jsonFolder: string, onError?: (error: string) => void): Promise<ExecMapping[]> {
  return new Promise((resolve, reject) => {
    readJsonFile(path.join(jsonFolder, filePath),
                  fileEncoding)
    .then((json) => { resolve(parseExecMappingsFile(json, onError).execs); })
    .catch(reject);
  });
}

function parseExecMappingsFile(data: any, onError?: (error: string) => void) : ExecMappingFile {
  let parsed: ExecMappingFile = {
    execs: []
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
    win32: ''
  };
  parser.prop('win32',     v => parsed.win32     = parseVarStr(str(v)));
  parser.prop('linux',     v => parsed.linux     = parseVarStr(str(v)), true);
  parser.prop('darwin',    v => parsed.darwin    = parseVarStr(str(v)), true);
  return parsed;
}

/** Coerce anything to a string. */
function str(str: any): string {
  return (str || '') + '';
}