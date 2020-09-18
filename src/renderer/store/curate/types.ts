import { CurateActionType } from './enums';

export type Curation = {
  
}

export type CurateState = {
  /** Loaded curations. */
  curations: Curation[];
  /** Index of the currently selected curation (-1 if none). */
  current: number;
}

export type CurateAction = {
  type: CurateActionType.CREATE_CURATION;
} | {
  type: CurateActionType.SET_CURRENT_CURATION;
} | {
  type: CurateActionType.NEW_ADDAPP;
} | {
  type: CurateActionType.EDIT_CURATION_META;
  payload: {

  };
}
