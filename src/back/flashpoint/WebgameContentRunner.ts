import { GameLauncher } from '@back/GameLauncher';
import { awaitDialog } from '@back/util/dialog';
import { promiseSleep, removeService, runService } from '@back/util/misc';
import { BackOut, DownloadDetails } from '@shared/back/types';
import { getGameDataFilename, isGame } from '@shared/utils/misc';
import { Content, ContentRunner, Game, GameData } from 'flashpoint-launcher';
import * as path from 'path';
import * as fs from 'fs';
import { fpDatabase, state } from '..';
import { changeServerFactory, getProviders, runAddAppFactory, runGameFactory } from '@back/responses';
import { BackState } from '@back/types';
import { downloadGameData } from '@back/download';

export const webgameContentRunenr: ContentRunner = {
  id: 'cr-webgames',
  name: 'Webgames Content Runner',
  runContent: async (game: Game | Content, opts?: any) => {
    // Check for Flashpoint specific field
    if (isGame(game)) {
      // Make sure Server is set to configured server - Curations may have changed it
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

      // If it has GameData, make sure it's present
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
                const dialogId = await state.socketServer.showMessageBoxBack(state)({
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
                const dialogId = await state.socketServer.showMessageBoxBack(state)({
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
        }

        // Make sure it has a path set, check the default location if it does not then save it back
        if (gameData && !gameData.path) {
          const realPath = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath, `${gameData.gameId}-${(new Date(gameData.dateAdded)).getTime()}.zip`);
          if (fs.existsSync(realPath)) {
            gameData.path = realPath;
            gameData.presentOnDisk = true;
            game.activeDataOnDisk = true;
            await fpDatabase.saveGameData(gameData);
            await fpDatabase.saveGame(game);
          }
        }
      }
      // Game config
      // const configs = await GameManager.findGameConfigs(game.id, state.registry.middlewares);
      // const activeConfig = configs.find(c => c.id === game.activeGameConfigId);
      // if (game.activeGameConfigId && activeConfig === undefined) {
      //   throw 'Could not load game config despite one being selected?';
      // }
      const activeConfig = null;
      // Launch game
      await GameLauncher.launchGame({
        game,
        fpPath: path.resolve(state.config.flashpointPath),
        htdocsPath: state.preferences.htdocsFolderPath,
        dataPacksFolderPath: state.preferences.dataPacksFolderPath,
        sevenZipPath: state.sevenZipPath,
        native: state.preferences.nativePlatforms.some(p => game.platforms.includes(p)),
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        appPathOverrides: state.preferences.appPathOverrides,
        providers: await getProviders(state),
        proxy: state.preferences.browserModeProxy,
        openDialog: state.socketServer.showMessageBoxBack(state),
        openExternal: state.socketServer.openExternal(),
        runGame: runGameFactory(state),
        runAddApp: runAddAppFactory(state),
        envPATH: state.pathVar,
        changeServer: changeServerFactory(state),
        activeConfig: activeConfig ? activeConfig : null,
        state,
        autoClearWininetCache: state.preferences.autoClearWininetCache,
        override: null,
      },
      state.apiEmitters.games.onWillLaunchGame.fireableFactory(state, undefined, 'Error during game launch api event'), false);
      await state.apiEmitters.games.onDidLaunchGame.fireAlert(state, game, undefined, 'Error from post game launch api event');

    }

    return false;
  }
};

async function downloadGameDataRes(state: BackState, gameData: GameData) {
  const onDetails = (details: DownloadDetails) => {
    state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_DETAILS, details);
  };
  const onProgress = (percent: number) => {
    // Sent to PLACEHOLDER download dialog on client
    state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT, percent);
  };
  state.socketServer.broadcast(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG);
  try {
    await downloadGameData(gameData.id, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath), state.preferences.gameDataSources, state.downloadController.signal(), onProgress, onDetails);
  } finally {
    // Close PLACEHOLDER download dialog on client, cosmetic delay to look nice
    setTimeout(() => {
      state.socketServer.broadcast(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG);
    }, 250);
  }
}
