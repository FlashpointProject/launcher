import { BackIn } from '@shared/back/types';
import { CurateActionType } from './enums';
import { CurateState } from './types';

export const curationSyncMiddleware = (store: any) => (next: any) => (action: any) => {
  next(action);
  switch (action.type) {
    case CurateActionType.EDIT_CURATION_META:
    case CurateActionType.ADD_TAG:
    case CurateActionType.REMOVE_TAG: {
      const state: CurateState = store.getState().curate;
      const modifiedCuration = state.curations.find(c => c.folder === action.folder);
      if (modifiedCuration) {
        window.Shared.back.request(BackIn.CURATE_SYNC_CURATIONS, [modifiedCuration]);
        log.debug('Curate', `Sync Requirable Action Performed: ${action.type}`);
      } else {
        log.error('Curate', `Action performed but no curation found? ${JSON.stringify(action)}`);
      }
      break;
    }
    default:
      break;
  }
};
