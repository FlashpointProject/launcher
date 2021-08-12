import { Tag } from '@database/entity/Tag';
import { EditCurationMeta } from '@shared/curate/OLD_types';
import { AddAppCurationMeta, CurationMeta, CurationState, CurationWarnings } from '@shared/curate/types';
import { CurateActionType } from './enums';

export type CurateGroup = {
  name: string;
  icon: string;
}

export type CurateState = {
  /** Persistant Group Names */
  groups: CurateGroup[];
  /** Collapsed curation groups */
  collapsedGroups: string[];
  /** Loaded curations. */
  curations: CurationState[];
  /** Folder of the currently selected curation (-1 if none). */
  current: string;
  /** List of curations that are selected */
  selected: string[];
  /** Last curation that was clicked */
  lastSelected: string;
}

export type AddAppType = 'normal' | 'extras' | 'message';

export type CurateAction = {
  type: CurateActionType.CREATE_CURATION;
  folder: string;
  meta?: EditCurationMeta;
} | {
  type: CurateActionType.SET_CURRENT_CURATION;
  folder: string;
  ctrl?: boolean;
  shift?: boolean;
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
} | {
  type: CurateActionType.SET_WARNINGS;
  folder: string;
  warnings: CurationWarnings;
} | {
  type: CurateActionType.IMPORT;
  folders: string[];
  saveCuration: boolean;
} | {
  type: CurateActionType.SET_LOCK;
  folders: string[];
  locked: boolean;
} | {
  type: CurateActionType.DELETE;
  folders: string[];
} | {
  type: CurateActionType.EXPORT;
  folders: string[];
} | {
  type: CurateActionType.TOGGLE_CONTENT_NODE_VIEW;
  folder: string;
  tree: string[];
} | {
  type: CurateActionType.TOGGLE_GROUP_COLLAPSE;
  group: string;
} | {
  type: CurateActionType.NEW_PERSISTANT_GROUP;
  name: string;
  icon: string;
} | {
  type: CurateActionType.CHANGE_GROUP;
  folder: string;
  group: string;
} | {
  type: CurateActionType.TOGGLE_GROUP_PIN;
  group: CurateGroup;
}
