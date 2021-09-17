import { SocketServer } from '@back/SocketServer';
import { BackOut } from '@shared/back/types';
import { LogFunc } from '@shared/interfaces';
import { ILogEntry, LogLevel } from '@shared/Log/interface';
import { LogFile } from './LogFile';
import { ApiEmitter } from '@back/extensions/ApiEmitter';

export function logFactory(logLevel: LogLevel, socketServer: SocketServer, addLog: (message: ILogEntry) => number, logFile: LogFile, verbose: boolean, apiEvent: ApiEmitter<ILogEntry>): LogFunc {
  return function (source: string, content: string): ILogEntry {
    const levelName: string = LogLevel[logLevel] || '?????';
    const formedLog: ILogEntry = {
      source: source,
      content: content,
      timestamp: Date.now(),
      logLevel: logLevel
    };
    const index = addLog(formedLog);
    logFile.saveLog(formedLog);
    socketServer.broadcast(BackOut.LOG_ENTRY_ADDED, formedLog, index);
    apiEvent.fire(formedLog);
    if (verbose) { console.log(`${levelName.padEnd(5)} - ${Date.now()} - ${content}`); }
    return formedLog;
  };
}
