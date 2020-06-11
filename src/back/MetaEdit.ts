import { Game } from '@database/entity/Game';
import { Tag } from '@database/entity/Tag';
import { ImportMetaEditResult, MetaEditGameNotFound } from '@shared/back/types';
import { ChangedMeta, MetaChange, MetaChangeBase, MetaEditFile, MetaEditMeta, MetaEditMetaMap, stringifyMetaValue } from '@shared/MetaEdit';
import { readJsonFile, shallowStrictEquals } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '@shared/utils/ObjectParser';
import * as fs from 'fs';
import * as path from 'path';
import { GameManager } from './game/GameManager';
import { TagManager } from './game/TagManager';
import { OpenDialogFunc } from './types';
import { copyError } from './util/misc';

const { str, strToBool } = Coerce;

export function parseMetaEdit(data: any, onError?: (error: string) => void): MetaEditFile {
  const parser = new ObjectParser({
    input: data,
    onError: onError && ((e) => { onError(`Error while parsing Exec Mappings: ${e.toString()}`); })
  });

  const parsed: MetaEditFile = {
    metas: [],
    launcherVersion: '',
  };

  parser.prop('metas').array(v => parsed.metas.push(parseMetaEditMeta(v)));
  parser.prop('launcherVersion', v => parsed.launcherVersion = str(v));

  return parsed;
}

function parseMetaEditMeta(parser: IObjectParserProp<any>) : MetaEditMeta {
  const parsed: MetaEditMeta = {
    id: '',
  };

  parser.prop('id',                  v => parsed.id                  = str(v));
  parser.prop('title',               v => parsed.title               = str(v), true);
  parser.prop('alternateTitles',     v => parsed.alternateTitles     = str(v), true);
  parser.prop('series',              v => parsed.series              = str(v), true);
  parser.prop('developer',           v => parsed.developer           = str(v), true);
  parser.prop('publisher',           v => parsed.publisher           = str(v), true);
  parser.prop('platform',            v => parsed.platform            = str(v), true);
  parser.prop('broken',              v => parsed.broken              = strToBool(v + ''), true);
  parser.prop('extreme',             v => parsed.extreme             = strToBool(v + ''), true);
  parser.prop('playMode',            v => parsed.playMode            = str(v), true);
  parser.prop('status',              v => parsed.status              = str(v), true);
  parser.prop('notes',               v => parsed.notes               = str(v), true);
  parser.prop('source',              v => parsed.source              = str(v), true);
  parser.prop('applicationPath',     v => parsed.applicationPath     = str(v), true);
  parser.prop('launchCommand',       v => parsed.launchCommand       = str(v), true);
  parser.prop('releaseDate',         v => parsed.releaseDate         = str(v), true);
  parser.prop('version',             v => parsed.version             = str(v), true);
  parser.prop('originalDescription', v => parsed.originalDescription = str(v), true);
  parser.prop('language',            v => parsed.language            = str(v), true);
  parser.prop('library',             v => parsed.library             = str(v), true);

  parser.prop('tags', v => parsed.tags = (v !== undefined) ? [] : undefined, true).arrayRaw(v => {
    if (!parsed.tags) { throw new Error('"parsed.tags" is missing (bug)'); }
    parsed.tags.push(str(v));
  });

  return parsed;
}

type LoadedMetaEditFile = {
  filename: string;
  mtime: number;
  content: MetaEditFile;
}

/** Collection of combined metas (one per game). */
type CombinedMetaRecord = {
  [game_id in string]?: CombinedMetas;
}

/** Combination of all changes made to a single game from multiple meta edits. */
type CombinedMetas = {
  [property_name in keyof MetaEditMetaMap]?: MetaChangeBase<property_name>[];
}

/**
 * Import all meta edits from a folder.
 * @param fullMetaEditsFolderPath Path to load meta edit files from.
 */
export async function importAllMetaEdits(fullMetaEditsFolderPath: string, openDialog: OpenDialogFunc): Promise<ImportMetaEditResult> {
  const errors: Error[] = [];

  // Load all meta edit files
  const files: LoadedMetaEditFile[] = [];
  try {
    const filenames = await fs.promises.readdir(fullMetaEditsFolderPath);

    for (const filename of filenames) {
      try {
        const fullFilename = path.join(fullMetaEditsFolderPath, filename);

        const stats = await fs.promises.stat(fullFilename);

        const raw = await readJsonFile(fullFilename);
        const parsed = parseMetaEdit(raw);

        files.push({
          filename: filename,
          mtime: stats.mtimeMs,
          content: parsed,
        });
      } catch (error) { errors.push(error); }
    }
  } catch (error) { errors.push(error); }

  // Abort if any file failed to load
  if (errors.length > 0) {
    return {
      aborted: true,
      errors: errors,
    };
  }

  // Order meta edits
  files.sort((a, b) => a.mtime - b.mtime); // Oldest first

  // Combine edits from all meta edits
  const combinedMetas: CombinedMetaRecord = {};
  for (const file of files) {
    for (const meta of file.content.metas) {
      let combined = combinedMetas[meta.id];
      if (!combined) {
        combined = combinedMetas[meta.id] = {};
      }

      const keys = Object.keys(meta) as (keyof typeof meta)[];
      for (const key of keys) {
        if (key !== 'id') { // (ID is for identification, not to be modified)
          let values = combined[key];
          if (!values) {
            values = combined[key] = [];
          }

          const metaValue = meta[key];
          const isDuplicate = values.some((val: MetaChangeBase<keyof MetaEditMetaMap>) => (
            (val.value === metaValue) ||
            (Array.isArray(val.value) && Array.isArray(metaValue) && shallowStrictEquals(val.value, metaValue)) // tags
          ));

          if (!isDuplicate) { // Only store unique values
            values.push({
              filename: file.filename,
              value: meta[key] as any, // Good luck getting this typesafe
            });
          }
        }
      }
    }
  }
  const combinedMetasKeys = Object.keys(combinedMetas);

  // Find games (& check for missing games)
  const games: Partial<Record<string, Game>> = {};
  const notFound: MetaEditGameNotFound[] = [];
  for (let id of combinedMetasKeys) {
    const game = await GameManager.findGame(id);

    if (game) {
      games[id] = await GameManager.findGame(id);
    } else { // Game not found
      const combined = combinedMetas[id];
      if (!combined) { throw new Error(`Failed to check for collisions. "combined meta" is missing (id: "${id}") (bug)`); }

      // List all filenames that edits the game
      const filenames: string[] = [];
      const keys = Object.keys(combined) as (keyof typeof combined)[];
      for (const property of keys) {
        const values = combined[property];
        if (!values || !values[0]) { throw new Error(`Failed to note missing game. "values" is missing (id: "${id}", property: "${property}") (bug)`); }

        for (const edit of values) {
          if (filenames.indexOf(edit.filename) === -1) {
            filenames.push(edit.filename);
          }
        }
      }

      notFound.push({
        filenames: filenames,
        id: id,
      });
    }
  }

  // Check for collisions
  // (Remove all duplicate values for each property of each game)
  for (const id of combinedMetasKeys) {
    const combined = combinedMetas[id];
    if (!combined) { throw new Error(`Failed to check for collisions. "combined meta" is missing (id: "${id}") (bug)`); }

    const game = games[id];
    if (!game) { continue; } // Skip missing games

    const keys = Object.keys(combined) as (keyof typeof combined)[];
    for (const property of keys) {
      const values = combined[property];
      if (!values) { throw new Error(`Failed to check for collisions. "values" is missing (id: "${id}", property: "${property}") (bug)`); }

      if (values.length > 1) { // Collision
        const buttonIndex = await openDialog({
          type: 'question',
          title: 'Meta Edit Collision!',
          message: `${values.length} meta edits wants to change the same property.`,
          detail: (
            `Title: ${game.title}\n`+
            `ID: ${id}\n\n`+
            `Property: ${property}\n`+
            `Current Value: ${`${stringifyMetaValue(game[property])}`}\n\n`+
            'Select the value to apply:'
          ),
          buttons: [
            ...(values as MetaChangeBase<keyof MetaEditMetaMap>[]).map(v => stringifyMetaValue(v.value)),
            'Abort Import',
          ],
          cancelId: values.length,
        });

        if (buttonIndex === values.length) { // Abort clicked
          return { aborted: true };
        } else { // Value selected
          // Swap the place of the selected and the first item
          const selectedValue = values[buttonIndex];
          const firstValue = values[0];
          values[buttonIndex] = firstValue;
          values[0] = selectedValue;
        }
      }
    }
  }

  // Discard all values that are identical to the current values
  const changedMetas: ChangedMeta[] = [];
  for (let id of combinedMetasKeys) {
    const combined = combinedMetas[id];
    if (!combined) { throw new Error(`Failed to GIDDY UP PARTNER. "combined meta" is missing (id: "${id}") (bug)`); }

    const game = games[id];
    if (!game) { continue; } // Skip missing games

    const changedMeta: ChangedMeta = {
      id: id,
      title: game.title,
      apply: [],
      discard: [],
    };
    changedMetas.push(changedMeta);

    const keys = Object.keys(combined) as (keyof typeof combined)[];
    for (let property of keys) {
      const values = combined[property];
      if (!values || !values[0]) { throw new Error(`Failed to GIDDY UP PARTNER. "values" is missing (id: "${id}", property: "${property}") (bug)`); }

      // First value
      const change: MetaChange<typeof property> = {
        ...values[0],
        property,
        prevValue: (property === 'tags')
          ? game.tags.map(tag => tag.primaryAlias.name)
          : game[property],
      };

      if (property === 'tags') {
        const tags = values[0].value;
        if (!Array.isArray(tags)) { throw new Error(`Failed to GIDDY UP PARTNER. "tags" is not an array (id: "${id}", value: "${tags}") (bug)`); }

        if ((game.tags.length === tags.length) && game.tags.every((tag, i) => tag.primaryAlias.name === tags[i])) {
          changedMeta.discard.push(change);
        } else {
          changedMeta.apply.push(change);
        }
      } else {
        if (game[property] === values[0].value) {
          changedMeta.discard.push(change);
        } else {
          changedMeta.apply.push(change);
        }
      }

      // All other values (rejected configs)
      for (let i = 1; i < values.length; i++) {
        if (property === 'tags') {
          if (!Array.isArray(values[i].value)) { throw new Error(`Failed to GIDDY UP PARTNER. "tags" is not an array (id: "${id}", value: "${values[i].value}") (bug)`); }
        }

        changedMeta.discard.push({
          ...values[i],
          property,
          prevValue: (property === 'tags')
            ? game.tags.map(tag => tag.primaryAlias.name)
            : game[property],
        });
      }
    }
  }

  // Apply changes
  for (const changedMeta of changedMetas) {
    const game = games[changedMeta.id];
    if (!game) { throw new Error(`Failed to apply change. Game is not found (id: "${changedMeta.id}") (bug)`); }

    for (const change of changedMeta.apply) {
      if (change.property === 'tags') {
        const tags = change.value;
        if (!Array.isArray(tags)) { throw new Error(`Failed to apply change. Tags is not an array (id: "${changedMeta.id}", typeof tags: "${typeof tags}") (bug)`); }

        // Replace all tags of the game
        const newTags: Tag[] = [];
        for (const tagName of tags) {
          let tag = await TagManager.findTag(tagName);
          if (!tag) { tag = await TagManager.createTag(tagName); }
          if (!tag) { throw new Error(`Failed to apply change. Failed to find and create tag for game (tag: "${tagName}").`); }
          newTags.push(tag);
        }
        game.tags = newTags;
      } else {
        try {
          paranoidSetGameProperty(game, change.property, change.value);
        } catch (error) {
          const e = copyError(error);
          e.message = e.message + ` (id: ${changedMeta.id}) (bug)`;
          errors.push(e);
        }
      }
    }

    GameManager.updateGame(game);
  }

  return {
    aborted: false,
    changedMetas: changedMetas,
    gameNotFound: notFound,
    errors: errors,
  };
}

/**
 * Set the value of a games property (only some properties are supported).
 * Throws an error if the property is not allowed or the value is of the incorrect type.
 */
function paranoidSetGameProperty(game: Game, property: unknown, value: unknown): void {
  const errorPrefix = 'Failed to set game property.';

  if (typeof property !== 'string') { throw new Error(`${errorPrefix} Property is not a string (typeof property: ${typeof property}).`); }

  switch (property) {
    default:
      throw new Error(`${errorPrefix} Property "${property}" is not allowed.`);

    // Boolean
    case 'broken':
    case 'extreme':
      if (typeof value !== 'boolean') { throw new Error(`${errorPrefix} Value is not a boolean (typeof value: "${typeof value}", property: "${property}").`); }
      game[property] = value;
      break;

    // String
    case 'title':
    case 'alternateTitles':
    case 'series':
    case 'developer':
    case 'publisher':
    case 'platform':
    case 'playMode':
    case 'status':
    case 'notes':
    case 'source':
    case 'applicationPath':
    case 'launchCommand':
    case 'releaseDate':
    case 'version':
    case 'originalDescription':
    case 'language':
    case 'library':
      if (typeof value !== 'string') { throw new Error(`${errorPrefix} Value is not a string (typeof value: "${typeof value}", property: "${property}").`); }
      game[property] = value;
      break;
  }
}
