import { ObjectParser } from '../utils/ObjectParser';
import { IService, ProcessAction, ProcessState, ServiceableProcess } from './interfaces';

export function getDefaultServiceData(): IService {
  return ({
    identifier: 'invalid',
    name: 'invalid',
    state: ProcessState.STOPPED,
    pid: -1,
    startTime: 0
  });
}

/** Perform an action on a given serviceable process */
export function doProcessAction(process: ServiceableProcess, action: ProcessAction) {
  switch (action) {
    case ProcessAction.START:
      process.spawn();
      break;
    case ProcessAction.STOP:
      process.kill();
      break;
    case ProcessAction.RESTART:
      process.restart();
      break;
    default:
      console.warn('Unhandled Process Action');
  }
}

export function overwriteServiceData(
  source: IService,
  data: Partial<IService>,
  onError?: (error: string) => void
): IService {
  const parser = new ObjectParser({
    input: data,
    onError: onError && (error => onError(`Error while parsing Service: ${error.toString()}`)),
  });
  parser.prop('identifier',          v => source.identifier = str(v));
  parser.prop('name',                v => source.name       = str(v));
  parser.prop('pid',                 v => source.pid        = num(v));
  parser.prop('startTime',           v => source.startTime  = num(v));
  parser.prop('state',               v => source.state      = state(v));
  parser.prop('info',                v => source.info       = v);

  // Return
  return source;
}

/** Coerce anything to a string. */
function str(str: any): string {
  return (str || '') + '';
}

/** Give a -1 for broken num */
function num(num: number | undefined): number {
  return (num || -1);
}

function state(state: ProcessState | undefined): number {
  return (state || ProcessState.STOPPED);
}