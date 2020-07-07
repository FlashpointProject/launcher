import { SharedSocket } from '@shared/back/SharedSocket';
import { BackIn, LogEntryAddedData } from '@shared/back/types';
import { LogFunc } from '@shared/interfaces';
import { LogLevel } from '@shared/Log/interface';

export function logFactory(logLevel: LogLevel, socketServer: SharedSocket<WebSocket>): LogFunc {
  return function (source: string, content: string) {
    socketServer.send<LogEntryAddedData>(BackIn.ADD_LOG, {
      source: source,
      content: content,
      logLevel: logLevel
    });
    // @TODO : Log Frontend Console
    // @TODO : Send this from back somehow instead
    return {
      source: source,
      content: content,
      timestamp: Date.now(),
      logLevel: logLevel
    };
  };
}
