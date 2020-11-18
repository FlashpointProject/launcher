import { SocketClient } from '@shared/back/SocketClient';
import { BackIn } from '@shared/back/types';
import { LogFunc } from '@shared/interfaces';
import { LogLevel } from '@shared/Log/interface';

export function logFactory(logLevel: LogLevel, socketServer: SocketClient<WebSocket>): LogFunc {
  return function (source: string, content: string) {
    socketServer.send(BackIn.ADD_LOG, {
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
