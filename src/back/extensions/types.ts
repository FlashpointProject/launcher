import { ILogEntry } from '@shared/Log/interface';
import { Disposable, newDisposable } from '@back/util/lifecycle';

export namespace commands {
  interface ICommand {
    command: string;
    title: string;
  }

  export type Command = ICommand & Disposable;

  export function registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable {
    const c: Command = {
      command: command,
      title: 'what do',
      ...newDisposable()
    };
    return c;
  }
}

export type ExtensionData = {
  extId: string;
  enabled: boolean;
  subscriptions: Disposable[];
  logs: ILogEntry[];
  errors: Error[];
}
