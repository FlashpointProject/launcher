import { Disposable } from '@back/util/lifecycle';
import { ILogEntry } from '@shared/Log/interface';

export type ExtensionData = {
  extId: string;
  enabled: boolean;
  subscriptions: Disposable;
  logs: ILogEntry[];
  errors: Error[];
}

export type ExtensionLogFunc = (message: string) => void

export type ExtensionContext = {
  subscriptions: Disposable,
  log: {
    trace: ExtensionLogFunc;
    debug: ExtensionLogFunc;
    info:  ExtensionLogFunc;
    warn:  ExtensionLogFunc;
    error: ExtensionLogFunc;
  }
}

export type ExtensionModule = {
  activate?: (context: ExtensionContext) => void;
  deactivate?: (context: ExtensionContext) => void;
}

export type Registry = {
  commands: Map<string, Command>;
}

export interface ICommand {
  command: string;
  callback: (...any: any[]) => any;
}

export type Command = ICommand & Disposable;
