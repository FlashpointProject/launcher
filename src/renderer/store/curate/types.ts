import { Tag } from '@database/entity/Tag';
import { AddAppCurationMeta, CurationMeta, CurationState } from '@shared/curate/types';
import { CurateActionType } from './enums';

export type CurateState = {
  /** Loaded curations. */
  curations: CurationState[];
  /** Folder of the currently selected curation (-1 if none). */
  current: string;
}

export type AddAppType = 'normal' | 'extras' | 'message';

export type CurateAction = {
  type: CurateActionType.CREATE_CURATION;
  folder: string;
} | {
  type: CurateActionType.SET_CURRENT_CURATION;
  folder: string;
} | {
  type: CurateActionType.NEW_ADDAPP;
  folder: string;
  addAppType: AddAppType;
} | {
  type: CurateActionType.EDIT_CURATION_META;
  folder: string;
  property: keyof CurationMeta;
  value: CurationMeta[keyof CurationMeta];
} | {
  type: CurateActionType.SET_ALL_CURATIONS;
  curations: CurationState[];
} | {
  type: CurateActionType.APPLY_DELTA;
  added?: CurationState[];
  removed?: string[];
} | {
  type: CurateActionType.ADD_TAG;
  folder: string;
  tag: Tag;
} | {
  type: CurateActionType.REMOVE_TAG;
  folder: string;
  tagId: number;
} | {
  type: CurateActionType.EDIT_ADDAPP;
  folder: string;
  key: string;
  property: keyof AddAppCurationMeta;
  value: string;
} | {
  type: CurateActionType.REMOVE_ADDAPP;
  folder: string;
  key: string;
}
