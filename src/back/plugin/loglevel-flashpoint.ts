import { SocketServer } from '@back/SocketServer';
import { BackOut, LogEntryAddedData } from '@shared/back/types';
import { ILogEntry, LogLevel } from '@shared/Log/interface';
import { RootLogger } from 'loglevel';

export function registerLogPlugin(log: RootLogger, socketServer: SocketServer, addLog: (message: ILogEntry) => number) {
  if (!log || !log.getLogger) {
    throw new TypeError('Logger doesn\'t exist');
  }

  const originalFactory = log.methodFactory;
  log.methodFactory = function (methodName, logLevel, loggerName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);

    return function (message) {
      if (message.source && message.content) {
        const levelName: string = message.logLevel ? LogLevel[message.logLevel] || '?????' : methodName.toUpperCase();
        const formedLog: ILogEntry = {
          source: message.source,
          content: message.content,
          timestamp: Date.now(),
          logLevel: message.logLevel || (<any>LogLevel)[methodName.toUpperCase()] || LogLevel.ERROR
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
        rawMethod(`${levelName.padEnd(5)} - ${Date.now()} - ${message.content}`);
      } else {
        rawMethod(message);
      }
    };
  };
  log.setLevel(log.getLevel());
}
