import { CurateActionType } from './enums';
import { CurateAction, CurateState } from './types';

export function curateStateReducer(state: CurateState = createInitialState(), action: CurateAction): CurateState {
  switch (action.type) {
    default:
      return state;

    case CurateActionType.CREATE_CURATION:
      return {
        ...state,
        curations: [
          ...state.curations,
          {
          }
        ],
      };

    case CurateActionType.SET_CURRENT_CURATION:
      return {
        ...state,
      };

    case CurateActionType.NEW_ADDAPP:
      return {
        ...state,
      };

    case CurateActionType.EDIT_CURATION_META:
      return {
        ...state,
      };
  }
}

function createInitialState(): CurateState {
  return {
    curations: [],
    current: -1,
  };
}
