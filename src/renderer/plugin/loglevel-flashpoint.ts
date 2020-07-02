import { SharedSocket } from '@shared/back/SharedSocket';
import { BackIn, LogEntryAddedData } from '@shared/back/types';
import { LogLevel } from '@shared/Log/interface';
import { RootLogger } from 'loglevel';

export function registerLogPlugin(log: RootLogger, socketServer: SharedSocket<WebSocket>) {
  if (!log || !log.getLogger) {
    throw new TypeError('Logger doesn\'t exist');
  }

  const originalFactory = log.methodFactory;
  log.methodFactory = function (methodName, logLevel, loggerName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);

    console.log(`${methodName} - ${logLevel} - ${loggerName}`);
    return function (message) {
      if (message.source && message.content) {
        socketServer.send<LogEntryAddedData>(BackIn.ADD_LOG, {
          source: message.source,
          content: message.content,
          logLevel: (<any>LogLevel)[methodName.toUpperCase()] || LogLevel.ERROR
        });
        rawMethod(message.content);
      } else {
        rawMethod(message);
      }
    };
  };
  log.setLevel(log.getLevel());
}
