import { CurateActionType } from './enums';

export type Curation = {
  /** Name of this curations folder (inside the curate folder). */
  folder: string;
  meta: CurationMeta;
}

export type CurationMeta = {
  title: string;
  alternateTitles: string;
  // library: ???;
  series: string;
  developer: string;
  publisher: string;
  // tags: ???;
  playMode: string;
  status: string;
  version: string;
  releaseDate: string;
  language: string;
  source: string;
  // platform: ???;
  // applicationPath: ???;
  launchCommand: string;
  notes: string;
  originalDescription: string;
  curationNotes: string;
  extreme: boolean;
}

export type CurateState = {
  /** Loaded curations. */
  curations: Curation[];
  /** Index of the currently selected curation (-1 if none). */
  current: number;
}

export type CurateAction = {
  type: CurateActionType.CREATE_CURATION;
  folder: string;
} | {
  type: CurateActionType.SET_CURRENT_CURATION;
  index: number;
} | {
  type: CurateActionType.NEW_ADDAPP;
} | {
  type: CurateActionType.EDIT_CURATION_META;
  folder: string;
  property: keyof CurationMeta;
  value: CurationMeta[keyof CurationMeta];
}
