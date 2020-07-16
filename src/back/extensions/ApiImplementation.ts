import { ApiEmittersState } from '@back/types';
import { clearDisposable, dispose, newDisposable, registerDisposable } from '@back/util/lifecycle';
import { IExtensionManifest } from '@shared/extensions/interfaces';
import { ILogEntry } from '@shared/Log/interface';
import * as flashpoint from 'flashpoint';
import { newExtLog } from './ExtensionUtils';
import { Command, Registry } from './types';

/**
 * Create a Flashpoint API implementation specific to an extension, used during module load interception
 * @param extManifest Manifest of the caller
 * @param registry Registry to register commands etc to
 * @param addExtLog Function to add an Extensions log to the Logs page
 * @param version Version of the Flashpoint Launcher
 * @returns API Implementation specific to the caller
 */
export function createApiFactory(extManifest: IExtensionManifest, registry: Registry, addExtLog: (log: ILogEntry) => void, version: string, apiEmitters: ApiEmittersState): typeof flashpoint {
  // Log Namespace
  const extLog: typeof flashpoint.log = {
    trace: (message: string) => addExtLog(newExtLog(extManifest, message, log.trace)),
    debug: (message: string) => addExtLog(newExtLog(extManifest, message, log.debug)),
    info:  (message: string) => addExtLog(newExtLog(extManifest, message, log.info)),
    warn:  (message: string) => addExtLog(newExtLog(extManifest, message, log.warn)),
    error: (message: string) => addExtLog(newExtLog(extManifest, message, log.error))
  };

  // Commands Namespace
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
      log.debug('Extensions', `Command "${command}" registered by "${extManifest.displayName || extManifest.name}"`);
      return c;
    }
  };

  const extGames: typeof flashpoint.games = {
    onDidLaunchGame: apiEmitters.games.onDidLaunchGame.event
  };

  // Create API Module to give to caller
  return <typeof flashpoint>{
    // General information
    version: version,
    extManifest: extManifest,

    // Namespaces
    log: extLog,
    commands: extCommands,
    games: extGames,

    // Disposable funcs
    dispose: dispose,
    clearDisposable: clearDisposable,
    registerDisposable: registerDisposable,
    newDisposable: newDisposable

    // Note - Types are defined in the decleration file, not here
  };
}
