import { isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import { startAppListening } from '@renderer/store/listenerMiddleware';
import { BackIn } from '@shared/back/types';
import { ExtConfigValueAction } from 'flashpoint-launcher-renderer';
import { selectGame, selectPlaylist } from '../search/slice';
import store from '../store';
import { addNewExtension, removeExtension, removePlaylistGame, RemovePlaylistGameAction, resolveDialog, ResolveDialogActionData, setExtConfigValue, setMainState } from './slice';

export function addMainMiddleware() {
  // Send dialog state to event handlers after reducer has finished
  startAppListening({
    matcher: isAnyOf(resolveDialog),
    effect: async (action: PayloadAction<ResolveDialogActionData>, listenerApi) => {
      const { main } = listenerApi.getState();
      if (main.lastResolvedDialog) {
        const dialog = main.lastResolvedDialog;
        window.Shared.back.send(BackIn.DIALOG_RESPONSE, dialog, action.payload.button);
        window.Shared.dialogResEvent.emit(dialog.id, dialog, action.payload.button);
      }
    }
  });

  startAppListening({
    matcher: isAnyOf(setExtConfigValue),
    effect: async ({ payload }: PayloadAction<ExtConfigValueAction>, _listenerApi) => {
      window.Shared.back.send(BackIn.SET_EXT_CONFIG_VALUE, payload.key, payload.value);
    }
  });

  startAppListening({
    matcher: isAnyOf(removeExtension, addNewExtension),
    effect: async () => {
      // Refetch extension contributions
      window.Shared.back.request(BackIn.GET_RENDERER_EXTENSION_INFO)
      .then((data) => {
        store.dispatch(setMainState(data));
      });
    }
  });

  startAppListening({
    matcher: isAnyOf(removePlaylistGame),
    effect: async (action: PayloadAction<RemovePlaylistGameAction>, listenerApi) => {
      const { main } = listenerApi.getState();
      const playlist = main.playlists.find(p => p.id === action.payload.playlistId);
      if (playlist) {
        store.dispatch(selectPlaylist({
          view: action.payload.viewId,
          playlist
        }));
        store.dispatch(selectGame({
          view: action.payload.viewId,
          game: undefined
        }));
      }
    }
  });
}
