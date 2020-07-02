import { BackIn, LogEntryAddedData } from '@shared/back/types';
import { LogLevel } from '@shared/Log/interface';
import { SharedSocket } from '@shared/back/SharedSocket';

export function logFactory(logLevel: LogLevel, socketServer: SharedSocket<WebSocket>) {
  return function (source: string, content: string) {
    socketServer.send<LogEntryAddedData>(BackIn.ADD_LOG, {
      source: source,
      content: content,
      logLevel: logLevel
    });
    // @TODO : Log Frontend Console
  };
}
