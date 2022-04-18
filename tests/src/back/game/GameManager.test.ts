import * as GameManager from '@back/game/GameManager';
import { uuid } from '@back/util/uuid';
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
  getConnection,
  getManager
} from 'typeorm';
import { gameArray } from './exampleDB';

const formatLocal = (input: Game): Partial<Game> => {
  const partial: Partial<Game> = input;
  delete partial.placeholder;
  delete partial.updateTagsStr;
  return partial;
};
const formatDB = (input?: Game): Game | undefined => {
  if (input) {
    input.dateAdded = new Date(input.dateAdded).toISOString();
  }
  return input;
};
const formatDBMany = (input?: Game[]): Partial<Game>[] | undefined => {
  if (input) {
    input.forEach((game) => {
      // TODO It seems the types aren't quite right? This conversion *should* be unnecessary, but here we are?
      game.dateAdded = new Date(game.dateAdded).toISOString();
    });
  }
  return input;
};

beforeAll(async () => {
  const options: ConnectionOptions = {
    type: 'sqlite',
    database: ':memory:',
    entities: [
      Game,
      Playlist,
      PlaylistGame,
      Tag,
      TagAlias,
      TagCategory,
      GameData,
      Source,
      SourceData,
    ],
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
});

afterAll(async () => {
  await getConnection().close();
});

/* ASSUMPTIONS MADE:
 * Each testing block will receive a clean database. Ensure that each testing block leaves a clean DB.
 */

describe('GameManager.findGame()', () => {
  beforeAll(async () => {
    await getManager().getRepository(Game).save(gameArray);
  });
  afterAll(async () => {
    await getManager().getRepository(Game).clear();
  });
  test('Find game by UUID', async () => {
    expect(
      formatDB(await GameManager.findGame(gameArray[0].id, undefined, true))
    ).toEqual(formatLocal(gameArray[0]));
  });
  test('Dont find game by UUID', async () => {
    // Generate a new UUID and try to fetch it. Should fail.
    expect(formatDB(await GameManager.findGame(uuid()))).toBeUndefined();
  });
  test('Find game by property', async () => {
    expect(
      formatDB(
        await GameManager.findGame(
          undefined,
          { where: { title: gameArray[0].title } },
          true
        )
      )
    ).toEqual(formatLocal(gameArray[0]));
  });
  test('Dont find game by property', async () => {
    // At this point, I'm just using uuid() as a random string generator.
    expect(
      formatDB(
        await GameManager.findGame(undefined, { where: { title: uuid() } })
      )
    ).toBeUndefined();
  });
  test('Find game including children', async () => {
    expect(
      formatDBMany((await GameManager.findGame(gameArray[0].id))?.children)
    ).toEqual([formatLocal(gameArray[1])]);
  });
  test('Find game excluding children', async () => {
    expect(
      formatDBMany(
        (await GameManager.findGame(gameArray[0].id, undefined, true))?.children
      )
    ).toBeUndefined();
  });
  test('Find game lacking children', async () => {
    expect(
      formatDBMany((await GameManager.findGame(gameArray[1].id))?.children)
    ).toBeUndefined();
  });
});

describe('GameManager.countGames()', () => {
  beforeEach(async () => {
    await getManager().getRepository(Game).save(gameArray);
  });
  afterEach(async () => {
    await getManager().getRepository(Game).clear();
  });
  test('Count games', async () => {
    // Count the number of games that have a null parentGameId.
    let count = 0;
    gameArray.forEach((game) => {
      if (!game.parentGameId) {
        count++;
      }
    });
    expect(await GameManager.countGames()).toBe(count);
  });
  test('Count zero games', async () => {
    getManager().getRepository(Game).clear();
    expect(await GameManager.countGames()).toBe(0);
  });
});
