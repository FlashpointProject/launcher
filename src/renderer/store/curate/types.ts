import { Tag } from '@database/entity/Tag';
import { EditCurationMeta } from '@shared/curate/OLD_types';
import { AddAppCurationMeta, ContentTree, CurationMeta } from '@shared/curate/types';
import { CurationState, CurationWarnings, Platform } from 'flashpoint-launcher';
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
  type: CurateActionType.REGEN_UUID;
  folder: string;
} | {
  type: CurateActionType.SET_CURRENT_CURATION;
  folder: string;
  ctrl?: boolean;
  shift?: boolean;
} | {
  type: CurateActionType.SET_CURRENT_CURATION_GROUP;
  group: string;
} | {
  type: CurateActionType.SET_SELECTED_CURATIONS;
  folders: string[];
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
  type: CurateActionType.ADD_PLATFORM;
  folder: string;
  platform: Platform;
} | {
  type: CurateActionType.REMOVE_TAG;
  folder: string;
  tagId: number;
} | {
  type: CurateActionType.REMOVE_PLATFORM;
  folder: string;
  platformId: number;
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
  taskId?: string;
} | {
  type: CurateActionType.SET_LOCK;
  folders: string[];
  locked: boolean;
} | {
  type: CurateActionType.DELETE;
  folders: string[];
  taskId?: string;
} | {
  type: CurateActionType.EXPORT_DATA_PACK;
  folders: string[];
  taskId?: string;
} | {
  type: CurateActionType.EXPORT;
  folders: string[];
  taskId?: string;
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
} | {
  type: CurateActionType.SET_CONTENTS;
  folder: string;
  contents: ContentTree;
}
