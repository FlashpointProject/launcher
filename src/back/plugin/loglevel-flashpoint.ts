import { SocketServer } from '@back/SocketServer';
import { BackOut, LogEntryAddedData } from '@shared/back/types';
import { ILogEntry, LogLevel } from '@shared/Log/interface';

export function logFactory(logLevel: LogLevel, socketServer: SocketServer, addLog: (message: ILogEntry) => number) {
  return function (source: string, content: string) {
    const levelName: string = LogLevel[logLevel] || '?????';
    const formedLog: ILogEntry = {
      source: source,
      content: content,
      timestamp: Date.now(),
      logLevel: logLevel
    };
    const index = addLog(formedLog);
    socketServer.broadcast<LogEntryAddedData>({
      id: '',
      type: BackOut.LOG_ENTRY_ADDED,
      data: {
        entry: formedLog,
        index: index,
      }
    });
    console.log(`${levelName.padEnd(5)} - ${Date.now()} - ${content}`);
  };
}
