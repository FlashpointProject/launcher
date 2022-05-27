import { Game } from '@database/entity/Game';
import { GameData } from '@database/entity/GameData';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { Source } from '@database/entity/Source';
import { SourceData } from '@database/entity/SourceData';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { Initial1593172736527 } from '@database/migration/1593172736527-Initial';
import { AddExtremeToPlaylist1599706152407 } from '@database/migration/1599706152407-AddExtremeToPlaylist';
import { GameData1611753257950 } from '@database/migration/1611753257950-GameData';
import { SourceDataUrlPath1612434225789 } from '@database/migration/1612434225789-SourceData_UrlPath';
import { SourceFileURL1612435692266 } from '@database/migration/1612435692266-Source_FileURL';
import { SourceFileCount1612436426353 } from '@database/migration/1612436426353-SourceFileCount';
import { GameTagsStr1613571078561 } from '@database/migration/1613571078561-GameTagsStr';
import { GameDataParams1619885915109 } from '@database/migration/1619885915109-GameDataParams';
import { ChildCurations1648251821422 } from '@database/migration/1648251821422-ChildCurations';
import {
  ConnectionOptions,
  createConnection,
  getConnectionManager,
  getManager
} from 'typeorm';
import { gameArray as gameArray_small } from './smallDB';

const entities = [
  Game,
  Playlist,
  PlaylistGame,
  Tag,
  TagAlias,
  TagCategory,
  GameData,
  Source,
  SourceData,
];
type entityType = typeof entities[number];

export async function createDefaultDB(path = ':memory:') {
  if (!getConnectionManager().has('default')) {
    const options: ConnectionOptions = {
      type: 'sqlite',
      database: path,
      entities: entities,
      migrations: [
        Initial1593172736527,
        AddExtremeToPlaylist1599706152407,
        GameData1611753257950,
        SourceDataUrlPath1612434225789,
        SourceFileURL1612435692266,
        SourceFileCount1612436426353,
        GameTagsStr1613571078561,
        GameDataParams1619885915109,
        ChildCurations1648251821422,
      ],
    };
    const connection = await createConnection(options);
    // TypeORM forces on but breaks Playlist Game links to unimported games
    await connection.query('PRAGMA foreign_keys=off;');
    await connection.runMigrations();
  }
}

export async function clearDB(entity: entityType) {
  await getManager().getRepository(entity).clear();
}

// TODO make this do Playlist, etc. instead of just Game.
export async function setSmall_gameOnly() {
  await getManager().getRepository(Game).save(gameArray_small);
}