import { Game } from '@database/entity/Game';
import { Tag } from '@database/entity/Tag';
import { Coerce } from '@shared/utils/Coerce';
import { ObjectParser } from '@shared/utils/ObjectParser';
import * as axiosImport from 'axios';
import { TagManager } from './game/TagManager';

const { str } = Coerce;
const userAgentHeader = { 'User-Agent': 'Flashpoint Launcher 8.0.0' };

export namespace MetadataServerApi {
  const axios = axiosImport.default;

  export async function getUpdatedGames(host: string, lastSync: number): Promise<SyncableGames> {
    const syncGames: Game[] = [];
    let syncedCount: number = 0;
    // Get games modified after the last sync
    const mainUrl = host + `/games?modifiedAfter=${lastSync}`;

    let response = await axios.get(mainUrl, { headers: userAgentHeader });
    const gameCount = response.data.count;
    const success = response.data.success;

    if (success) {
      // Process results in pages
      while (syncedCount < gameCount) {
        for (const gameData of response.data.data) {
          syncedCount++;
          try {
            syncGames.push(await parseGame(gameData));
          } catch (error) {
            console.error(error);
          }
        }
        response = await axios.get(mainUrl + `&offset=${syncedCount}&limit=50`, { headers: userAgentHeader });
      }
    } else {
      throw new Error(`Metadata Fetch Failed - Status ${response.status} - ${response.statusText}\n\n${response.data}`);
    }

    return { games: syncGames, total: gameCount, successes: syncGames.length };
  }
}

export type SyncableGames = {
  games: Game[];
  total: number;
  successes: number;
}

// data - JSON response
async function parseGame(data: any, onError?: (error: string) => void): Promise<Game> {
  let parsed = new Game();
  const parser = new ObjectParser({
    input: data,
    onError: onError && (e => { onError(`Error while parsing Game from Metadata Host Response: ${e.toString()}`); })
  });

  parser.prop('id',                   v => parsed.id                  = str(v));
  parser.prop('title',                v => parsed.title               = str(v));
  parser.prop('alternate_titles',     v => parsed.alternateTitles     = str(v));
  parser.prop('series',               v => parsed.series              = str(v));
  parser.prop('developer',            v => parsed.developer           = str(v));
  parser.prop('publisher',            v => parsed.id                  = str(v));
  parser.prop('release_date',         v => parsed.releaseDate         = str(v));
  parser.prop('library',              v => parsed.library             = str(v));
  parser.prop('platform',             v => parsed.platform            = str(v));
  parser.prop('extreme',              v => parsed.extreme             = !!v);
  parser.prop('broken',               v => parsed.broken              = !!v);
  parser.prop('play_mode',            v => parsed.playMode            = str(v));
  parser.prop('status',               v => parsed.status              = str(v));
  parser.prop('notes',                v => parsed.notes               = str(v));
  parser.prop('original_description', v => parsed.originalDescription = str(v));
  parser.prop('source',               v => parsed.source              = str(v));
  parser.prop('application_path',     v => parsed.applicationPath     = str(v));
  parser.prop('launch_command',       v => parsed.launchCommand       = str(v));
  parser.prop('date_added',           v => parsed.dateAdded           = (new Date(num(v))).toISOString());
  parser.prop('date_modified',        v => parsed.dateModified        = (new Date(num(v))).toISOString());
  parser.prop('version',              v => parsed.version             = str(v));
  parser.prop('languages',            v => parsed.language            = str(v));
  parser.prop('parent_id',            v => parsed.parentGameId        = str(v));

  // Temporary
  if (data.tags) {
    parsed.tags = await parseTagsString(str(data.tags));
  }

  return parsed;
}

async function parseTagsString(data: string): Promise<Tag[]> {
  const tags: Tag[] = (await Promise.all(data.split(';').map(async tagStr => {
    let tag = await TagManager.findTag(tagStr);
    if (!tag) {
      // Tag doesn't exist, make a new one
      tag = await TagManager.createTag(tagStr);
    }
    return tag;
  }))).filter(t => typeof t != 'undefined') as Tag[]; // Filter out undefineds then force type

  return tags.filter((t, i) => tags.findIndex(t2 => t2.id === t.id) === i); // Remove dupes
}

function num(data: any): number {
  const num = Number(data);
  if (isNaN(num)) {
    throw new Error('Game validation failed.');
  }
  return num;
}