import { Tag } from '@database/entity/Tag';

/** Game properties that can be partially exported/imported. */
export type MetaEditMetaMap = Partial<{
  title: string;
  alternateTitles: string;
  series: string;
  developer: string;
  publisher: string;
  platform: string;
  broken: boolean;
  extreme: boolean;
  playMode: string;
  status: string;
  notes: string;
  tags: string[];
  source: string;
  applicationPath: string;
  launchCommand: string;
  releaseDate: string;
  version: string;
  originalDescription: string;
  language: string;
  library: string;
}>

/** Flags of which game properties to export. */
export type MetaEditFlags = {
  [key in keyof MetaEditMetaMap]: boolean;
}

/** Data stored in a meta edit file. */
export type MetaEditFile = {
  /** Metas of games (one meta per game). */
  metas: MetaEditMeta[];
  /**
   * Version of the launcher that exported the meta edit.
   * Could be used to parse or apply the meta edit differently in case something changes in a later version.
   */
  launcherVersion: string;
}

/** Partial game meta in a meta edit. */
export type MetaEditMeta = MetaEditMetaMap & {
  /** ID of the game. */
  id: string;
}

export type MetaChangeBase<property_name extends keyof MetaEditMetaMap> = {
  /** The new value. */
  value: MetaEditMetaMap[property_name];
  /** Name of the file the change originated from. */
  filename: string;
}

export type MetaChange<T extends keyof MetaEditMetaMap> = MetaChangeBase<T> & {
  /** The property being changed. */
  property: T;
  /** The previous value. */
  prevValue: MetaEditMetaMap[T];
}

export type ChangedMeta = {
  /** ID of the game. */
  id: string;
  /** Title of the game. */
  title: string;
  /** Changes to apply to the games meta. */
  apply: MetaChange<keyof MetaEditMetaMap>[];
  /** Changes that have been discarded. */
  discard: MetaChange<keyof MetaEditMetaMap>[];
}

export function stringifyMetaValue(value: string | string[] | Tag[] | boolean | undefined): string {
  if (Array.isArray(value)) {
    if (value.length > 0) {
      const stringArray = (typeof value[0] === 'string')
        ? (value as string[])
        : (value as Tag[]).map(v => v.primaryAlias.name);

      return `[ ${stringArray.map(v => `"${v}"`).join(', ')} ]`;
    } else {
      return '[ empty array ]';
    }
  }

  switch (typeof value) {
    case 'string':
      return `"${value}"`;

    case 'boolean':
      return value ? 'true' : 'false';

    case 'undefined':
      return 'undefined';
  }
}
