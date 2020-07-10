import { clearDisposable, dispose, newDisposable, registerDisposable } from '@back/util/lifecycle';
import { IExtensionManifest } from '@shared/extensions/interfaces';
import * as flashpoint from 'flashpoint';
import { Command, Registry } from './types';
import { ILogEntry } from '@shared/Log/interface';
import { newExtLog } from './ExtensionUtils';

export function createApiFactory(extManifest: IExtensionManifest, registry: Registry, addExtLog: (log: ILogEntry) => void): typeof flashpoint {
  const extLog: typeof flashpoint.log = {
    trace: (message: string) => addExtLog(newExtLog(extManifest, message, log.trace)),
    debug: (message: string) => addExtLog(newExtLog(extManifest, message, log.debug)),
    info:  (message: string) => addExtLog(newExtLog(extManifest, message, log.info)),
    warn:  (message: string) => addExtLog(newExtLog(extManifest, message, log.warn)),
    error: (message: string) => addExtLog(newExtLog(extManifest, message, log.error))
  };

  const extCommands: typeof flashpoint.commands = {
    registerCommand: (command: string, callback: <T>(...args: any[]) => T | Promise<T>) => {
      const c: Command = {
        command: command,
        callback: callback,
        ...newDisposable(() => {
          // Unregister command when disposed
          registry.commands.delete(command);
        })
      };
      // Error if command is about to be overridden
      if (registry.commands.has(command)) {
        throw new Error(`Could not register "${command}" because it already exists!`);
      }
      // Register command
      registry.commands.set(command, c);
      return c;
    }
  };

  return <typeof flashpoint>{
    // General information
    version: '9.0.2', // TODO: Implement
    extManifest: extManifest,

    log: extLog,
    commands: extCommands,

    // Disposable funcs
    dispose: dispose,
    clearDisposable: clearDisposable,
    registerDisposable: registerDisposable,
    newDisposable: newDisposable
  };
}
