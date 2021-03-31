import { Tag } from '@database/entity/Tag';
import { CurationMeta, LoadedCuration } from '@shared/curate/types';
import { CurateActionType } from './enums';

export type CurateState = {
  /** Loaded curations. */
  curations: LoadedCuration[];
  /** Folder of the currently selected curation (-1 if none). */
  current: string;
}

export type CurateAction = {
  type: CurateActionType.CREATE_CURATION;
  folder: string;
} | {
  type: CurateActionType.SET_CURRENT_CURATION;
  folder: string;
} | {
  type: CurateActionType.NEW_ADDAPP;
} | {
  type: CurateActionType.EDIT_CURATION_META;
  folder: string;
  property: keyof CurationMeta;
  value: CurationMeta[keyof CurationMeta];
} | {
  type: CurateActionType.SET_ALL_CURATIONS;
  curations: LoadedCuration[];
} | {
  type: CurateActionType.APPLY_DELTA;
  added?: LoadedCuration[];
  removed?: string[];
} | {
  type: CurateActionType.ADD_TAG;
  folder: string;
  tag: Tag;
} | {
  type: CurateActionType.REMOVE_TAG;
  folder: string;
  tagName: string;
}
