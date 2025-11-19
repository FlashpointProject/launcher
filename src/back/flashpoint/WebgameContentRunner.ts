import { downloadGameData } from '@back/download';
import { checkAndInstallPlatform, createLaunchInfoCommand, escapeArgsForShell, getContentEnvironment } from '@back/GameLauncher';
import { ManagedChildProcess } from '@back/ManagedChildProcess';
import { broadcastGameUpdate, createRawCommand } from '@back/responses';
import { BackState } from '@back/types';
import { awaitDialog } from '@back/util/dialog';
import { promiseSleep, removeService, runService } from '@back/util/misc';
import { BackOut, DownloadDetails } from '@shared/back/types';
import { ExecMapping } from '@shared/interfaces';
import { fixSlashes } from '@shared/Util';
import { getGameDataFilename, isGame } from '@shared/utils/misc';
import { ContentRunner, Game, GameData, GameLaunchInfo, LaunchInfo } from 'flashpoint-launcher';
import * as path from 'node:path';
import { fpDatabase, state } from '..';

export const webgameContentRunner: ContentRunner = {
  id: 'cr-webgames',
  name: 'Webgames Content Runner',
  canHandleGame: (game, isCuration) => {
    return isGame(game);
  },
  prepareGame: async (game, isCuration): Promise<GameLaunchInfo> => {
    if (!isGame(game)) {
      throw new Error('Not a game, cannot prepare');
    }
    // Make sure the platform is installed for the game
    await checkAndInstallPlatform(game.detailedPlatforms!, state, state.socketServer.showMessageBoxBack(state));

    await ensureGameDataDownloaded(state, game);
    const activeData = !isCuration ? (game.activeDataId ? await fpDatabase.findGameDataById(game.activeDataId) : null) : null;
    const metadataAppPath = activeData ? activeData.applicationPath : game.legacyApplicationPath;
    const parsedAppPath = getApplicationPath(metadataAppPath, state.execMappings, state.preferences.nativePlatforms.some(p => game.platforms.includes(p)));
    const appPathOverride = state.preferences.appPathOverrides.filter(a => a.enabled).find(a => a.path === parsedAppPath);
    const appPath = appPathOverride?.override || parsedAppPath;
    const metadataLaunchCommand = activeData ? activeData.launchCommand : game.legacyLaunchCommand;
    const gamePath = path.isAbsolute(appPath) ? fixSlashes(appPath) : fixSlashes(path.resolve(state.config.flashpointPath, appPath));
    const useWine: boolean = process.platform != 'win32' && gamePath.endsWith('.exe');
    const env = getContentEnvironment(
      state.config.flashpointPath,
      state.preferences.browserModeProxy,
      process.platform,
      true,
      state.pathVar
    );

    return {
      game,
      isCuration,
      activeData,
      launchInfo: {
        gamePath,
        gameArgs: [metadataLaunchCommand],
        useWine,
        env,
      },
    };
  },
  executeGame: async (gameLaunchInfo) => {
    // Run game as a service and register it
    const { game, launchInfo, activeData } = gameLaunchInfo;
    const metadataLaunchCommand = activeData ? activeData.launchCommand : game.legacyLaunchCommand;
    const managedProc = runGame(gameLaunchInfo);
    const command: string = createLaunchInfoCommand(launchInfo);
    log.info('Webgame CR', `Launch Game "${game.title}" (PID: ${managedProc.getPid()}) [\n`+
    `    applicationPath: "${launchInfo.gamePath}",\n`+
    `    launchCommand:   "${metadataLaunchCommand}",\n`+
    `    command:         "${command}" ]`);
  },
};

export async function downloadGameDataRes(state: BackState, gameData: GameData) {
  const onDetails = (details: DownloadDetails) => {
    state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_DETAILS, details);
  };
  const onProgress = (percent: number) => {
    // Sent to PLACEHOLDER download dialog on client
    state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT, percent);
  };
  state.socketServer.broadcast(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG);
  log.debug('Launcher', 'download res');
  try {
    await downloadGameData(gameData.id, state, state.downloadController.signal(), onProgress, onDetails);
  } finally {
    // Close PLACEHOLDER download dialog on client, cosmetic delay to look nice
    setTimeout(() => {
      state.socketServer.broadcast(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG);
    }, 250);
  }
}

export async function ensureGameDataDownloaded(state: BackState, game: Game) {
  const showDialogFunc = state.socketServer.showMessageBoxBack(state);
  if (game.activeDataId && game.gameData) {
    log.debug('Launcher', 'Found active game data');
    let gameData = game.gameData.find(gd => gd.id === game.activeDataId);
    if (gameData && !gameData.presentOnDisk) {
      // Game data is not downloaded, check if an old one was being used before
      const orderedGameData = [...game.gameData].sort((a, b) => a.dateAdded.localeCompare(b.dateAdded)).reverse();
      for (const oldGd of orderedGameData) {
        if (oldGd.presentOnDisk) {
          // Found existing game data, verify with the user that we should upgrade it
          const lcDifferent = oldGd.launchCommand !== gameData.launchCommand;
          if (lcDifferent) {
            const strings = state.languageContainer;
            const dialogId = showDialogFunc({
              largeMessage: true,
              message: `${strings.dialog.gameDataUpdateReadyLcDifferent}`,
              buttons: [strings.misc.yes, strings.misc.no],
              cancelId: 1,
            });
            const result = (await awaitDialog(state, dialogId)).buttonIdx;
            if (result === 1) {
              log.info('Game Launcher', 'User chose to keep using old game data');
              // Mark this as the new active game data
              game.activeDataId = oldGd.id;
              game.activeDataOnDisk = oldGd.presentOnDisk;
              await fpDatabase.saveGame(game);
              gameData = oldGd;
            } else {
              log.info('Game Launcher', 'Upgrading from old game data (lc changed)...');
            }
          } else {
            const strings = state.languageContainer;
            const dialogId = showDialogFunc({
              largeMessage: true,
              message: `${strings.dialog.gameDataUpdateReady}`,
              buttons: [strings.misc.yes, strings.misc.no],
              cancelId: 1,
            });
            const result = (await awaitDialog(state, dialogId)).buttonIdx;
            if (result === 1) {
              log.info('Game Launcher', 'User chose to keep using old game data');
              // Mark this as the new active game data
              game.activeDataId = oldGd.id;
              game.activeDataOnDisk = oldGd.presentOnDisk;
              await fpDatabase.saveGame(game);
              gameData = oldGd;
            } else {
              log.info('Game Launcher', 'Upgrading from old game data (lc same)...');
            }
          }
          break;
        }
      }
      if (!gameData.presentOnDisk) {
        // Make sure we didn't choose to swap game data during the user dialog above
        log.debug('Game Launcher', 'Downloading Game Data for ' + getGameDataFilename(gameData) || 'UNKNOWN');
        // Download GameData
        try {
          await downloadGameDataRes(state, gameData);
          gameData = (await fpDatabase.findGameDataById(gameData.id)) as GameData;
        } catch (error: any) {
          state.socketServer.broadcast(BackOut.OPEN_ALERT, error);
          log.info('Game Launcher', `Game Launch Aborted: ${error}`);
          return false;
        }
      }
      broadcastGameUpdate(state, game.id);
    }
  }
}

export async function configureServer(state: BackState, requestedServer?: string) {
  const configServer = state.serviceInfo ? state.serviceInfo.server.find(s => s.name === state.preferences.server) : undefined;
  if (configServer) {
    const server = state.services.get('server');
    if (!server || !('name' in server.info) || server.info.name !== configServer.name) {
      // Server is different, change now
      if (server) { await removeService(state, 'server'); }
      runService(state, 'server', 'Server', state.config.flashpointPath, { env: {
        ...process.env,
        'PATH': state.pathVar ?? process.env.PATH,
      } }, configServer);
      await promiseSleep(1500);
    }
  }
}


export function getApplicationPath(filePath: string, execMappings: ExecMapping[], native: boolean): string {
  const platform = process.platform;

  // Bat files won't work on Wine, force a .sh file on non-Windows platforms instead. Sh File may not exist.
  if (platform !== 'win32' && filePath.endsWith('.bat')) {
    return filePath.substring(0, filePath.length - 4) + '.sh';
  }

  // Skip mapping if on Windows
  if (platform !== 'win32') {
    for (let i = 0; i < execMappings.length; i++) {
      const mapping = execMappings[i];
      if (mapping.win32 === filePath) {
        switch (platform) {
          case 'linux':
            // If we are trying to run this game natively:
            if (native) {
              // Use the native binary (if configured.)
              return mapping.linux || mapping.win32;
            } else {
              // Otherwise, use the wine binary (if configured.)
              return mapping.wine || mapping.win32;
            }
          case 'darwin':
            // If we are trying to run this game natively:
            if (native) {
              // Use the native binary (if configured.)
              return mapping.darwin || mapping.win32;
            } else {
              // Otherwise, use the wine binary (if configured.)
              return mapping.darwine || mapping.win32;
            }
          default:
            return filePath;
        }
      }
    }
  }

  // No Native exec found, return Windows/XML application path
  return filePath;
}

function runGameService(state: BackState, launchInfo: LaunchInfo, id: string, name: string): ManagedChildProcess {
  console.log(launchInfo);
  const dirname = path.dirname(launchInfo.gamePath);
  // Keep file path relative to cwd
  const proc = runService(
    state,
    id,
    name,
    '',
    {
      detached: false,
      cwd: launchInfo.cwd,
      noshell: !!launchInfo.noshell,
      env: launchInfo.env
    },
    {
      path: dirname,
      filename: createRawCommand(launchInfo.gamePath, launchInfo.useWine, !!launchInfo.noshell),
      // Don't escape args if we're not using a shell.
      arguments: launchInfo.noshell
        ? typeof launchInfo.gameArgs == 'string'
          ? [launchInfo.gameArgs]
          : launchInfo.gameArgs
        : escapeArgsForShell(launchInfo.gameArgs),
      kill: true
    }
  );

  // Remove game service when it exits
  proc.on('change', () => {
    if (proc.getState() === 0) {
      removeService(state, proc.id);
    }
  });

  return proc;
}

function runGame(gameLaunchInfo: GameLaunchInfo): ManagedChildProcess {
  // Run game as a service and register it
  const id = `game.${gameLaunchInfo.game.id}`;
  const proc = runGameService(state, gameLaunchInfo.launchInfo, id, gameLaunchInfo.game.title);

  proc.on('change', () => {
    if (proc.getState() === 0) {
      // Update game playtime counter when process exits
      if (state.preferences.enablePlaytimeTracking) {
        const secondsPlayed = (Date.now() - proc.getStartTime()) / 1000;
        if (!state.preferences.enablePlaytimeTrackingExtreme) {
          const extremeTags = state.preferences.tagFilters.filter(t => t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
          const isExtreme = gameLaunchInfo.game.tags.findIndex(t => extremeTags.includes(t.trim())) !== -1;
          if (!isExtreme) {
            fpDatabase.addGamePlaytime(gameLaunchInfo.game.id, secondsPlayed)
            .catch(() => {
              /** Game probably doesn't exist */
            });
          }
        } else {
          fpDatabase.addGamePlaytime(gameLaunchInfo.game.id, secondsPlayed)
          .catch(() => {
            /** Game probably doesn't exist */
          });
        }
      }
    }
  });

  return proc;
}
