import { ApiEmitter } from '@back/extensions/ApiEmitter';
import { SocketServer } from '@back/SocketServer';
import { BackOut } from '@shared/back/types';
import { LogFunc } from '@shared/interfaces';
import { LogLevel } from '@shared/Log/interface';
import { ILogEntry } from 'flashpoint-launcher';
import { LogFile } from './LogFile';

export function logFactory(logLevel: LogLevel, socketServer: SocketServer, addLog: (message: ILogEntry) => number, logFile: LogFile, verbose: boolean, apiEvent: ApiEmitter<ILogEntry>): LogFunc {
  return function (source: string, content: string): ILogEntry {
    const levelName: string = LogLevel[logLevel] || '?????';
    const formedLog: ILogEntry = {
      source: source,
      content: content,
      timestamp: Date.now(),
      logLevel: logLevel,
      lineCount: content.split('\n').length,
    };
    const index = addLog(formedLog);
    logFile.saveLog(formedLog);
    socketServer.broadcast(BackOut.LOG_ENTRY_ADDED, formedLog, index);
    apiEvent.fire(formedLog);
    if (verbose) { console.log(`${levelName.padEnd(5)} - ${Date.now()} - ${content}`); }
    return formedLog;
  };
}
