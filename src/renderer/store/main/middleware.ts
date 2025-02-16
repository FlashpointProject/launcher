import { isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import { startAppListening } from '@renderer/store/listenerMiddleware';
import { BackIn } from '@shared/back/types';
import { removePlaylistGame, RemovePlaylistGameAction, resolveDialog, ResolveDialogActionData } from './slice';
import store, { history } from '../store';
import { selectGame, selectPlaylist } from '../search/slice';
import { useView } from '@renderer/hooks/search';
import { getViewName } from '@renderer/Util';

export function addMainMiddleware() {
  // Send dialog state to event handlers after reducer has finished
  startAppListening({
    matcher: isAnyOf(resolveDialog),
    effect: async(action: PayloadAction<ResolveDialogActionData>, listenerApi)=> {
      const { main } = listenerApi.getState();
      if (main.lastResolvedDialog) {
        const dialog = main.lastResolvedDialog;
        window.Shared.back.send(BackIn.DIALOG_RESPONSE, dialog, action.payload.button);
        window.Shared.dialogResEvent.emit(dialog.id, dialog, action.payload.button);
      }
    }
  });

  startAppListening({
    matcher: isAnyOf(removePlaylistGame),
    effect: async(action: PayloadAction<RemovePlaylistGameAction>, listenerApi)=> {
      const { main } = listenerApi.getState();
      const playlist = main.playlists.find(p => p.id === action.payload.playlistId);
      if (playlist) {
        const viewId = getViewName(history.location.pathname);
        store.dispatch(selectPlaylist({
          view: viewId,
          playlist
        }));
        store.dispatch(selectGame({
          view: viewId,
          game: undefined
        }));
      }
    }
  });
}
