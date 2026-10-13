import { BackIn } from '@shared/back/types';
import { ws } from 'msw';

// Create WebSocket link
const chat = ws.link('ws://localhost:8080');
const startTime = Date.now();

export const mockBackHandlers: Record<BackIn, any> = {
  [BackIn.GET_START_TIME]: () => {
    return startTime;
  },
  [BackIn.UNKNOWN]: undefined,
  [BackIn.INIT_LISTEN]: undefined,
  [BackIn.GET_SUGGESTIONS]: undefined,
  [BackIn.GET_GAMES_TOTAL]: undefined,
  [BackIn.SET_LOCALE]: undefined,
  [BackIn.GET_EXEC]: undefined,
  [BackIn.SAVE_GAMES]: undefined,
  [BackIn.SAVE_GAME]: undefined,
  [BackIn.DELETE_GAME_CONFIG]: undefined,
  [BackIn.GET_GAME]: undefined,
  [BackIn.GET_GAMES_GAME_DATA]: undefined,
  [BackIn.GET_GAME_DATA]: undefined,
  [BackIn.DELETE_GAME_DATA]: undefined,
  [BackIn.IMPORT_GAME_DATA]: undefined,
  [BackIn.DOWNLOAD_GAME_DATA]: undefined,
  [BackIn.UNINSTALL_GAME_DATA]: undefined,
  [BackIn.SAVE_GAME_DATAS]: undefined,
  [BackIn.GET_SOURCES]: undefined,
  [BackIn.GET_ALL_GAMES]: undefined,
  [BackIn.RANDOM_GAMES]: undefined,
  [BackIn.LAUNCH_GAME]: undefined,
  [BackIn.DELETE_GAME]: undefined,
  [BackIn.DUPLICATE_GAME]: undefined,
  [BackIn.EXPORT_GAME]: undefined,
  [BackIn.GET_VALID_MIDDLEWARE]: undefined,
  [BackIn.LAUNCH_ADDAPP]: undefined,
  [BackIn.SAVE_IMAGE]: undefined,
  [BackIn.DELETE_IMAGE]: undefined,
  [BackIn.ADD_LOG]: undefined,
  [BackIn.SERVICE_ACTION]: undefined,
  [BackIn.DUPLICATE_PLAYLIST]: undefined,
  [BackIn.IMPORT_PLAYLIST]: undefined,
  [BackIn.EXPORT_PLAYLIST]: undefined,
  [BackIn.DOWNLOAD_PLAYLIST_CONTENTS]: undefined,
  [BackIn.GET_PLAYLISTS]: undefined,
  [BackIn.GET_PLAYLIST]: undefined,
  [BackIn.SAVE_PLAYLIST]: undefined,
  [BackIn.DELETE_PLAYLIST]: undefined,
  [BackIn.DELETE_ALL_PLAYLISTS]: undefined,
  [BackIn.GET_PLAYLIST_GAME]: undefined,
  [BackIn.ADD_PLAYLIST_GAME]: undefined,
  [BackIn.SAVE_PLAYLIST_GAME]: undefined,
  [BackIn.DELETE_PLAYLIST_GAME]: undefined,
  [BackIn.RAISE_PLAYLIST_GAME]: undefined,
  [BackIn.SAVE_LEGACY_PLATFORM]: undefined,
  [BackIn.LAUNCH_CURATION]: undefined,
  [BackIn.LAUNCH_CURATION_ADDAPP]: undefined,
  [BackIn.QUIT]: undefined,
  [BackIn.DOWNLOAD_PLAYLIST]: undefined,
  [BackIn.GET_OR_CREATE_TAG]: undefined,
  [BackIn.GET_OR_CREATE_PLATFORM]: undefined,
  [BackIn.GET_TAG_SUGGESTIONS]: undefined,
  [BackIn.GET_PLATFORM_SUGGESTIONS]: undefined,
  [BackIn.GET_TAG_BY_ID]: undefined,
  [BackIn.GET_PLATFORM_BY_ID]: undefined,
  [BackIn.GET_TAGS]: undefined,
  [BackIn.GET_TAG]: undefined,
  [BackIn.SAVE_TAG]: undefined,
  [BackIn.DELETE_TAG]: undefined,
  [BackIn.MERGE_TAGS]: undefined,
  [BackIn.EXPORT_TAGS]: undefined,
  [BackIn.EXPORT_DATABASE]: undefined,
  [BackIn.IMPORT_TAGS]: undefined,
  [BackIn.NUKE_TAGS]: undefined,
  [BackIn.SAVE_TAG_CATEGORY]: undefined,
  [BackIn.GET_TAG_CATEGORY_BY_ID]: undefined,
  [BackIn.DELETE_TAG_CATEGORY]: undefined,
  [BackIn.GET_DISTINCT_DEVELOPERS]: undefined,
  [BackIn.GET_DISTINCT_PUBLISHERS]: undefined,
  [BackIn.GET_DISTINCT_SERIES]: undefined,
  [BackIn.PARSE_QUERY_DATA]: undefined,
  [BackIn.BROWSE_ALL_RESULTS]: undefined,
  [BackIn.BROWSE_VIEW_PAGE]: undefined,
  [BackIn.BROWSE_VIEW_FIRST_PAGE]: undefined,
  [BackIn.BROWSE_VIEW_KEYSET]: undefined,
  [BackIn.GET_RENDERER_INIT_DATA]: undefined,
  [BackIn.GET_RENDERER_LOADED_DATA]: undefined,
  [BackIn.GET_RENDERER_EXTENSION_INFO]: undefined,
  [BackIn.GET_MAIN_INIT_DATA]: undefined,
  [BackIn.GET_LOGGER_INIT_DATA]: undefined,
  [BackIn.UPDATE_CONFIG]: undefined,
  [BackIn.UPDATE_PREFERENCES]: undefined,
  [BackIn.SET_EXTENSION_ENABLED]: undefined,
  [BackIn.IMPORT_METADATA]: undefined,
  [BackIn.SYNC_TAGGED]: undefined,
  [BackIn.SYNC_ALL]: undefined,
  [BackIn.EXPORT_META_EDIT]: undefined,
  [BackIn.IMPORT_META_EDITS]: undefined,
  [BackIn.RUN_COMMAND]: undefined,
  [BackIn.DOWNLOAD_EXTENSION]: undefined,
  [BackIn.GET_MIDDLEWARE_CONFIG_SCHEMAS]: undefined,
  [BackIn.GET_MIDDLEWARE_DEFAULT_CONFIG]: undefined,
  [BackIn.CHECK_MIDDLEWARE_VERSION_VALIDITY]: undefined,
  [BackIn.FPFSS_OPEN_CURATION]: undefined,
  [BackIn.CURATE_LOAD_ARCHIVES]: undefined,
  [BackIn.CURATE_GET_LIST]: undefined,
  [BackIn.CURATE_SYNC_CURATIONS]: undefined,
  [BackIn.CURATE_REQUEST_CONTENT]: undefined,
  [BackIn.CURATE_EDIT_REMOVE_IMAGE]: undefined,
  [BackIn.CURATE_DELETE]: undefined,
  [BackIn.CURATE_IMPORT]: undefined,
  [BackIn.CURATE_CREATE_CURATION]: undefined,
  [BackIn.CURATE_EXPORT]: undefined,
  [BackIn.CURATE_EXPORT_DATA_PACK]: undefined,
  [BackIn.CURATE_FROM_GAME]: undefined,
  [BackIn.CURATE_REFRESH_CONTENT]: undefined,
  [BackIn.CURATE_GEN_WARNINGS]: undefined,
  [BackIn.CURATE_DUPLICATE]: undefined,
  [BackIn.CURATE_SCAN_NEW_CURATIONS]: undefined,
  [BackIn.CURATE_GET_TEMPLATES]: undefined,
  [BackIn.CURATE_CREATE_TEMPLATE_FROM_CURATION]: undefined,
  [BackIn.OPEN_LOGS_WINDOW]: undefined,
  [BackIn.UPLOAD_LOG]: undefined,
  [BackIn.SET_EXT_CONFIG_VALUE]: undefined,
  [BackIn.FETCH_DIAGNOSTICS]: undefined,
  [BackIn.OPEN_FLASHPOINT_MANAGER]: undefined,
  [BackIn.CANCEL_DOWNLOAD]: undefined,
  [BackIn.DELETE_ALL_IMAGES]: undefined,
  [BackIn.OPTIMIZE_DATABASE]: undefined,
  [BackIn.CLEAR_WININET_CACHE]: undefined,
  [BackIn.PRE_UPDATE_INFO]: undefined,
  [BackIn.CLEAR_PLAYTIME_TRACKING]: undefined,
  [BackIn.CLEAR_PLAYTIME_TRACKING_BY_ID]: undefined,
  [BackIn.KEEP_ALIVE]: undefined,
  [BackIn.PREP_RELOAD_WINDOW]: undefined,
  [BackIn.IS_FLASHPOINT_PATH_VALID]: undefined,
  [BackIn.DIALOG_RESPONSE]: undefined,
  [BackIn.DOWNLOADER_GET_STATE]: undefined,
  [BackIn.DOWNLOADER_SET_STATUS]: undefined,
  [BackIn.DOWNLOADER_ADD_MISSING_CONTENT]: undefined,
  [BackIn.TEST_RECONNECTIONS]: undefined,
  [BackIn.UPDATE_GAME_FROM_SOURCE]: undefined,
};

export const handlers = [
  // Handle connection
  chat.addEventListener('connection', ({ client }) => {
    console.log('MSW: Client connected');
    let authenticated = false;

    // Handle authentication
    client.addEventListener('message', (event) => {
      const data = event.data;

      if (!authenticated) {
        authenticated = true;
        client.send('auth successful');
        return;
      }

      try {
        const message = JSON.parse(data as string);

        if ('type' in message && 'id' in message) {
          const handler = mockBackHandlers[message.type as BackIn];

          if (handler) {
            // Call the mock handler with the args
            const result = handler(...(message.args || []));

            client.send(JSON.stringify({
              id: message.id,
              result
            }));
          } else {
            console.warn(`MSW: API Call not mocked: ${BackIn[message.type]}`);
            client.send(JSON.stringify({
              id: message.id,
              error: `API Call not mocked: ${BackIn[message.type]}`
            }));
          }
        }
      } catch (err) {
        console.error('MSW: Error handling message', err);
      }
    });
  })
];
