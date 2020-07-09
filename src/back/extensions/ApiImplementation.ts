import { clearDisposable, dispose, newDisposable, registerDisposable } from '@back/util/lifecycle';
import { IExtensionManifest } from '@shared/extensions/interfaces';
import * as flashpoint from 'flashpoint';
import { Command, Registry } from './types';

export function createApiFactory(extManifest: IExtensionManifest, registry: Registry): typeof flashpoint {
  const commands: typeof flashpoint.commands = {
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

    commands: commands,

    // Disposable funcs
    dispose: dispose,
    clearDisposable: clearDisposable,
    registerDisposable: registerDisposable,
    newDisposable: newDisposable
  };
}
