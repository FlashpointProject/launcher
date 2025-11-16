import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BackIn, BackInit } from '@shared/back/types';
import { createLangContainer } from '@shared/lang';
import { deepCopy, recursiveReplace } from '@shared/Util';
import { CreditsData, DialogFieldProps, DialogState, Game, GameMetadataSource, IExtensionDescription, IService, Playlist } from 'flashpoint-launcher';
import { CustomRoute, DisplaySettings, DisplaySettingsGameSidebarAction, DynamicPageProps, ExtConfigValueAction, ExtOrderable, MainState, UnrecoverableError } from 'flashpoint-launcher-renderer';

export const RANDOM_GAME_ROW_COUNT = 6;

type DisplaySettingsCallback = (prev: DisplaySettings) => DisplaySettings;
type ExtOrderablesCallback = (prev: ExtOrderable[]) => ExtOrderable[];

export type MetaUpdateAction = {
  id: string;
  total: number;
}

export type RemovePlaylistGameAction = {
  viewId: string;
  playlistId: string;
  gameId: string;
}

export type UpdateDialogFieldActionData = {
  id: string;
  field: Partial<DialogFieldProps>;
}

export type ResolveDialogActionData = {
  id: string;
  button: number;
}

const DEFAULT_DISPLAYS: DisplaySettings = {
  gameSidebar: {
    middle: [
      'game_alternateTitles',
      'game_tags',
      'game_series',
      'game_publisher',
      'game_source',
      'game_platforms',
      'game_playMode',
      'game_status',
      'game_version',
      'game_language',
      'game_ruffleSupport',
    ],
    bottom: [
      'game_dates',
      'game_playlistNotes',
      'game_notes',
      'game_originalDescription',
      'game_addApps',
      'game_legacyData'
    ],
  },
  gameList: {
    icons: [],
    columns: [
      {
        headerComponent: 'gameCol_header_platform',
        rowComponent: 'gameCol_row_platform',
        type: 'icon'
      },
      {
        headerComponent: 'gameCol_header_title',
        rowComponent: 'gameCol_row_title',
        type: 'normal',
        weight: 1.3
      },
      {
        headerComponent: 'gameCol_header_developer',
        rowComponent: 'gameCol_row_developer',
        type: 'normal',
        weight: 1
      },
      {
        headerComponent: 'gameCol_header_publisher',
        rowComponent: 'gameCol_row_publisher',
        type: 'normal',
        weight: 1
      }
    ]
  },
  homePage: [
    'homePage_updateFeed',
    'homePage_gotd',
    'homePage_quickStart',
    'homePage_notes',
    'homePage_randomGames',
    'homePage_extras'
  ],
  searchComponents: [],
  browseDisplays: {},
  customRoutes: [],
};

export function initialMainState(): MainState {
  return {
    gotdList: [],
    libraries: [],
    serverNames: [],
    mad4fpEnabled: false,
    playlists: [],
    playlistIconCache: {},
    suggestions: {
      platforms: [],
      playMode: [],
      status: [],
      applicationPath: [],
      tags: [],
      library: []
    },
    appPaths: {},
    loaded: {
      [BackInit.DATABASE_READY]: false,
      [BackInit.SERVICES]: false,
      [BackInit.DATABASE]: false,
      [BackInit.PLAYLISTS]: false,
      [BackInit.EXEC_MAPPINGS]: false,
      [BackInit.EXTENSIONS]: false
    },
    loadedAll: false,
    themeList: [],
    themeVersion: 0,
    systemThemeVersion: 0,
    logoSets: [],
    logoVersion: 0,
    gamesTotal: -1,
    randomGames: [],
    requestingRandomGames: false,
    shiftRandomGames: false,
    localeCode: 'en-us',
    devConsole: '',
    upgrades: [],
    gamesDoneLoading: false,
    upgradesDoneLoading: false,
    stopRender: false,
    creditsData: undefined,
    creditsDoneLoading: false,
    lang: createLangContainer(),
    langList: [],
    wasNewGameClicked: false,
    metaEditExporterOpen: false,
    metaEditExporterGameId: '',
    extensions: [],
    extConfig: {},
    extConfigs: [],
    contextButtons: [],
    services: [],
    downloadOpen: false,
    downloadPercent: 0,
    downloadSize: 0,
    downloadVerifying: false,
    socketOpen: true,
    isEditingGame: false,
    updateFeedMarkdown: '',
    metadataUpdate: {},
    busyGames: [],
    platformAppPaths: {},
    componentStatuses: [],
    quitting: false,
    openDialogs: [],
    displaySettings: deepCopy(DEFAULT_DISPLAYS),
    extOrderables: [],
  };
}

export const requestKeyset = createAsyncThunk(
  'search/requestKeyset',
  async (payload: ResolveDialogActionData, { getState, dispatch }) => {
    const state = getState() as { main: MainState };
    const dialogIdx = state.main.openDialogs.findIndex(d => d.id === payload.id);
    if (dialogIdx > -1) {
      const dialog = state.main.openDialogs.splice(dialogIdx, 1)[0];
      window.Shared.back.send(BackIn.DIALOG_RESPONSE, dialog, payload.button);
      window.Shared.dialogResEvent.emit(dialog.id, dialog, payload.button);
    }
  }
);

const mainSlice = createSlice({
  name: 'main',
  initialState: initialMainState(),
  reducers: {
    setMainState(state: MainState, { payload }: PayloadAction<Partial<MainState>>) {
      Object.assign(state, payload);
    },
    addLoaded(state: MainState, { payload }: PayloadAction<BackInit[]>) {
      for (const key of payload) {
        state.loaded[key] = true;
      }

      const values = Object.values(state.loaded);
      if (values.length === values.reduce((prev, cur) => prev + (cur ? 1 : 0), 0)) {
        if (window.electronAPI !== undefined) {
          const finishTime = Date.now();
          window.Shared.back.request(BackIn.GET_START_TIME)
          .then((startTime) => {
            console.log(`Finished loading in ${finishTime - startTime}ms`);
          });
        }
        state.loadedAll = true;
        // Ready to accept protocol, if available
        window.electronAPI?.protocolReady();
      }
    },
    setCredits(state: MainState, { payload }: PayloadAction<CreditsData>) {
      state.creditsData = payload;
      state.creditsDoneLoading = true;
    },
    stopRender(state: MainState) {
      state.stopRender = true;
    },
    shiftRandomGames(state: MainState) {
      if (state.randomGames.length >= (RANDOM_GAME_ROW_COUNT * 2)) {
        state.randomGames = state.randomGames.slice(RANDOM_GAME_ROW_COUNT);
      } else {
        state.shiftRandomGames = true;
      }
    },
    addRandomGames(state: MainState, { payload }: PayloadAction<Game[]>) {
      state.randomGames = [
        ...(
          state.shiftRandomGames
            ? state.randomGames.slice(RANDOM_GAME_ROW_COUNT)
            : state.randomGames
        ),
        ...payload
      ];

      state.requestingRandomGames = false;
      state.shiftRandomGames = false;
      state.gamesDoneLoading = true;
    },
    incrementLogoVersion(state: MainState) {
      state.logoVersion++;
    },
    markGameBusy(state: MainState, { payload }: PayloadAction<string>) {
      if (!state.busyGames.includes(payload)) {
        state.busyGames.push(payload);
      }
    },
    unmarkGameBusy(state: MainState, { payload }: PayloadAction<string>) {
      const idx = state.busyGames.findIndex(i => i === payload);
      if (idx > -1) {
        state.busyGames.splice(idx, 1);
      }
    },
    createDialog(state: MainState, { payload }: PayloadAction<DialogState>) {
      state.openDialogs.push(payload);
    },
    cancelDialog(state: MainState, { payload }: PayloadAction<string>) {
      const dialogIdx = state.openDialogs.findIndex(d => d.id === payload);
      if (dialogIdx > -1) {
        const dialog = state.openDialogs.splice(dialogIdx, 1)[0];
        window.Shared.back.send(BackIn.DIALOG_RESPONSE, dialog, dialog.cancelId || -1);
        setTimeout(() => window.Shared.dialogResEvent.emit(dialog.id, dialog, dialog.cancelId || -1), 100);
      }
    },
    resolveDialog(state: MainState, { payload }: PayloadAction<ResolveDialogActionData>) {
      const dialogIdx = state.openDialogs.findIndex(d => d.id === payload.id);
      if (dialogIdx > -1) {
        const dialog = state.openDialogs.splice(dialogIdx, 1)[0];
        state.lastResolvedDialog = dialog;
      }
    },
    updateDialog(state: MainState, { payload }: PayloadAction<Partial<DialogState>>) {
      if (!payload.id) {
        return;
      }

      const dialogIdx = state.openDialogs.findIndex(d => d.id === payload.id);
      if (dialogIdx > -1) {
        state.openDialogs[dialogIdx] = {
          ...state.openDialogs[dialogIdx],
          ...payload,
        };
      }
    },
    removePlaylistGame(state: MainState, { payload }: PayloadAction<RemovePlaylistGameAction>) {
      const playlist = state.playlists.find(p => p.id === payload.playlistId);
      if (playlist) {
        const gameIdx = playlist.games.findIndex(g => g.gameId === payload.gameId);
        if (gameIdx !== -1) {
          playlist.games.splice(gameIdx, 1);
        }
      }
    },
    updateDialogField(state: MainState, { payload }: PayloadAction<UpdateDialogFieldActionData>) {
      const dialog = state.openDialogs.find(d => d.id === payload.id);
      if (dialog && dialog.fields) {
        const fieldIdx = dialog.fields?.findIndex(f => f.name === payload.field.name);
        if (fieldIdx > -1) {
          dialog.fields[fieldIdx] = {
            ...dialog.fields[fieldIdx],
            ...payload.field
          } as DialogFieldProps; // Stupid type fix
        }
      }
    },
    openDynamicPage(state: MainState, { payload }: PayloadAction<DynamicPageProps>) {
      state.dynamicPage = payload;
    },
    changeService(state: MainState, { payload }: PayloadAction<IService>) {
      const service = state.services.find(s => s.id === payload.id);
      // Replace or insert new service
      if (service) {
        recursiveReplace(service, payload);
      } else {
        state.services.push(recursiveReplace({
          id: 'invalid',
          name: 'Invalid',
          state: 0,
          pid: -1,
          startTime: 0,
          info: {
            path: '',
            filename: '',
            arguments: [],
            kill: false,
          },
        }, payload));
      }
    },
    removeService(state: MainState, { payload }: PayloadAction<string>) {
      const serviceIdx = state.services.findIndex(s => s.id === payload);
      if (serviceIdx > -1) {
        state.services.splice(serviceIdx, 1);
      }
    },
    addCustomRoute(state: MainState, { payload }: PayloadAction<CustomRoute>) {
      const existingIdx = state.displaySettings.customRoutes.findIndex(r => r.path === payload.path);
      if (existingIdx === -1) {
        state.displaySettings.customRoutes.push(payload);
      }
    },
    removeCustomRoute(state: MainState, { payload }: PayloadAction<CustomRoute>) {
      const existingIdx = state.displaySettings.customRoutes.findIndex(r => r.path === payload.path);
      if (existingIdx >= 0) {
        state.displaySettings.customRoutes.splice(existingIdx);
      }
    },
    addGameSidebarComponent(state: MainState, { payload }: PayloadAction<DisplaySettingsGameSidebarAction>) {
      const section = state.displaySettings.gameSidebar[payload.section];
      const existingIdx = section.findIndex(r => r === payload.name);
      if (existingIdx === -1) {
        section.push(payload.name);
      }
    },
    removeGameSidebarComponent(state: MainState, { payload }: PayloadAction<DisplaySettingsGameSidebarAction>) {
      const section = state.displaySettings.gameSidebar[payload.section];
      const existingIdx = section.findIndex(r => r === payload.name);
      if (existingIdx !== -1) {
        section.splice(existingIdx, 1);
      }
    },
    setDisplaySettingsFromCallback(state: MainState, { payload }: PayloadAction<DisplaySettingsCallback>) {
      try {
        state.displaySettings = payload(state.displaySettings);
      } catch (err) {
        log.error('Launcher', `Error setting display settings from extension callback: ${err}`);
        alert(`Error setting display settings from extension callback: ${err}`);
      }
    },
    setExtOrderablesFromCallback(state: MainState, { payload }: PayloadAction<ExtOrderablesCallback>) {
      try {
        state.extOrderables = payload(state.extOrderables);
      } catch (err) {
        log.error('Launcher', `Error setting extension orderables from extension callback: ${err}`);
        alert(`Error setting extension orderables from extension callback: ${err}`);
      }
    },
    setUpdateInfo(state: MainState, { payload }: PayloadAction<MetaUpdateAction>) {
      state.metadataUpdate[payload.id] = {
        total: payload.total,
      };
    },
    updatePlaylist(state: MainState, { payload }: PayloadAction<Playlist>) {
      const playlistIdx = state.playlists.findIndex(p => p.id === payload.id);
      if (playlistIdx > -1) {
        state.playlists[playlistIdx] = payload;
      }
    },
    updateMetadataSource(state: MainState, { payload }: PayloadAction<GameMetadataSource>) {
      // TODO: Make metadata update info stored per source
      if (payload.id in state.metadataUpdate) {
        state.metadataUpdate[payload.id] = {
          total: 0
        };
      }
    },
    removeExtension(state: MainState, { payload }: PayloadAction<string>) {
      const existingIdx = state.extensions.findIndex(e => e.id === payload);
      if (existingIdx !== -1) {
        state.extensions.splice(existingIdx);
      }
    },
    addNewExtension(state: MainState, { payload }: PayloadAction<IExtensionDescription>) {
      const existingIdx = state.extensions.findIndex(e => e.id === payload.id);
      if (existingIdx === -1) {
        state.extensions.push(payload);
      } else {
        state.extensions[existingIdx] = payload;
      }
    },
    setUnrecoverableError(state: MainState, { payload }: PayloadAction<UnrecoverableError>) {
      console.error('Unrecoverable Error');
      console.error(payload);
      state.unrecoverableError = payload;
    },
    updateThemeCss(state: MainState) {
      state.themeVersion += 1;
    },
    updateSystemThemeCss(state: MainState) {
      state.systemThemeVersion += 1;
    },
    setExtConfigValue(state: MainState, { payload }: PayloadAction<ExtConfigValueAction>) {
      state.extConfig[payload.key] = payload.value;
    }
  },
});

export const { actions: mainActions } = mainSlice;
export const { setMainState,
  addLoaded,
  setCredits,
  stopRender,
  shiftRandomGames,
  addRandomGames,
  incrementLogoVersion,
  markGameBusy,
  unmarkGameBusy,
  createDialog,
  cancelDialog,
  resolveDialog,
  updateDialog,
  updateDialogField,
  removePlaylistGame,
  openDynamicPage,
  changeService,
  removeService,
  addCustomRoute,
  removeCustomRoute,
  addGameSidebarComponent,
  removeGameSidebarComponent,
  setDisplaySettingsFromCallback,
  setExtOrderablesFromCallback,
  setUpdateInfo,
  updatePlaylist,
  updateMetadataSource,
  removeExtension,
  addNewExtension,
  setUnrecoverableError,
  updateThemeCss,
  updateSystemThemeCss,
  setExtConfigValue,
} = mainSlice.actions;
export default mainSlice.reducer;

