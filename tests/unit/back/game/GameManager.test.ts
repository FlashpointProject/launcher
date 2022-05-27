import * as GameManager from '@back/game/GameManager';
import { uuid } from '@back/util/uuid';
import { Game } from '@database/entity/Game';
import * as v8 from 'v8';
import { gameArray } from '../smallDB';
import { clearDB, createDefaultDB, setSmall_gameOnly } from '../TestDB';

// Only the keys of T that can't be null or undefined.
type DefinedKeysOf<T> = {
  [k in keyof T]-?: null extends T[k]
    ? never
    : undefined extends T[k]
      ? never
      : k;
}[keyof T];

// This will be a copy of the array that I can feel comfortable mutating. I want to leave gameArray clean.
let arrayCopy: Game[];

const formatLocal = (input: Game): Partial<Game> => {
  const partial = input as Partial<Game>;
  delete partial.placeholder;
  delete partial.updateTagsStr;
  return partial;
};
const formatLocalMany = (input: Game[]): Partial<Game>[] => {
  const partial = input as Partial<Game>[];
  partial.forEach((game) => {
    delete game.placeholder;
    delete game.updateTagsStr;
  });
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
/**
 * Filters and then sorts an array of Game objects.
 * @param array The array to filter and sort.
 * @param filterFunc The function that determines if an element should be left in by the filter.
 * @param sortColumn The column to sort the array on.
 * @param reverse Whether or not to sort the array backwards.
 * @returns The filtered and sorted array.
 */
const filterAndSort = (
  array: Game[],
  filterFunc: (game: Game) => boolean,
  sortColumn: DefinedKeysOf<Game>,
  reverse?: boolean
): Game[] => {
  const filtered = array.filter(filterFunc);
  const flip = reverse ? -1 : 1;
  filtered.sort((a: Game, b: Game) => {
    if (a[sortColumn] > b[sortColumn]) {
      return flip * 1;
    }
    if (a[sortColumn] < b[sortColumn]) {
      return flip * -1;
    }
    return 0;
  });
  return filtered;
};

beforeAll(async () => {
  await createDefaultDB();
});

/* ASSUMPTIONS MADE:
 * Each testing block will receive a clean database. Ensure that each testing block leaves a clean DB.
 */

describe('GameManager.findGame()', () => {
  beforeAll(async () => {
    await setSmall_gameOnly();
  });
  afterAll(async () => {
    await clearDB(Game);
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
    await setSmall_gameOnly();
  });
  afterEach(async () => {
    await clearDB(Game);
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
    await clearDB(Game);
    expect(await GameManager.countGames()).toBe(0);
  });
});

describe('GameManager.findGameRow()', () => {
  beforeAll(async () => {
    await setSmall_gameOnly();
  });
  afterAll(async () => {
    await clearDB(Game);
  });
  test('Valid game ID, orderBy title', async () => {
    // People on the internet say that this will be suboptimal. I don't care too much.
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'title'
    );
    expect(await GameManager.findGameRow(gameArray[3].id, 'title', 'ASC')).toBe(
      1 + filtered.findIndex((game: Game) => game.id === gameArray[3].id)
    );
  });
  test('Invalid game ID, orderBy title', async () => {
    expect(await GameManager.findGameRow(uuid(), 'title', 'ASC')).toBe(-1);
  });
  test('Reasonable game filter, orderBy title', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) =>
        game.originalDescription.includes('t') && game.parentGameId === null,
      'title'
    );
    expect(
      await GameManager.findGameRow(gameArray[0].id, 'title', 'ASC', {
        searchQuery: {
          genericBlacklist: [],
          genericWhitelist: [],
          blacklist: [],
          whitelist: [
            {
              field: 'originalDescription',
              value: 't',
            },
          ],
        },
      })
    )
    // Add one because row_number() is one-based, and JS arrays are zero-based.
    .toBe(1 + filtered.findIndex((game: Game) => game.id === gameArray[0].id));
  });
  test('Exclusive game filter, orderBy title', async () => {
    expect(
      await GameManager.findGameRow(gameArray[0].id, 'title', 'ASC', {
        searchQuery: {
          genericBlacklist: [],
          genericWhitelist: [],
          blacklist: [],
          whitelist: [
            {
              field: 'originalDescription',
              // Again, just a random string generator, essentially.
              value: uuid(),
            },
          ],
        },
      })
    ).toBe(-1);
  });
  test('Valid game ID, orderBy developer', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'developer'
    );
    expect(await GameManager.findGameRow(gameArray[0].id, 'developer', 'ASC'))
    // Add one because row_number() is one-based, and JS arrays are zero-based.
    .toBe(1 + filtered.findIndex((game: Game) => game.id === gameArray[0].id));
  });
  test('Invalid game filter', async () => {
    // Invalid game filters should be ignored.
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) =>
        game.originalDescription.includes('t') && game.parentGameId === null,
      'title'
    );
    expect(
      await GameManager.findGameRow(gameArray[0].id, 'title', 'ASC', {
        searchQuery: {
          genericBlacklist: [],
          genericWhitelist: [],
          blacklist: [],
          whitelist: [
            {
              field: uuid(),
              value: 't',
            },
            {
              field: 'originalDescription',
              value: 't',
            },
          ],
        },
      })
    ).toBe(1 + filtered.findIndex((game: Game) => game.id === gameArray[0].id));
  });
  test('Valid game ID, orderBy title reverse', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'title',
      true
    );
    expect(
      await GameManager.findGameRow(gameArray[3].id, 'title', 'DESC')
    ).toBe(1 + filtered.findIndex((game: Game) => game.id === gameArray[3].id));
  });
  test('Child game ID, orderBy title', async () => {
    expect(await GameManager.findGameRow(gameArray[1].id, 'title', 'ASC')).toBe(
      -1
    );
  });
  test('Valid game ID, orderBy title, with index before', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'title'
    );
    const indexPos = filtered.findIndex(
      (game: Game) => game.id === gameArray[5].id
    );
    const resultPos = filtered.findIndex(
      (game: Game) => game.id === gameArray[0].id
    );
    const diff = resultPos - indexPos;
    expect(
      await GameManager.findGameRow(
        gameArray[0].id,
        'title',
        'ASC',
        undefined,
        {
          orderVal: gameArray[5].title,
          title: gameArray[5].title,
          id: gameArray[5].id,
        }
      )
    ).toBe(diff > 0 ? diff : -1);
  });
  test('Valid game ID, orderBy title, with index after', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'title'
    );
    const indexPos = filtered.findIndex(
      (game: Game) => game.id === gameArray[4].id
    );
    const resultPos = filtered.findIndex(
      (game: Game) => game.id === gameArray[0].id
    );
    const diff = resultPos - indexPos;
    expect(
      await GameManager.findGameRow(
        gameArray[0].id,
        'title',
        'ASC',
        undefined,
        {
          orderVal: gameArray[4].title,
          title: gameArray[4].title,
          id: gameArray[4].id,
        }
      )
    ).toBe(diff > 0 ? diff : -1);
  });
  test('Valid game ID, orderBy title reverse, with index before', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'title',
      true
    );
    const indexPos = filtered.findIndex(
      (game: Game) => game.id === gameArray[4].id
    );
    const resultPos = filtered.findIndex(
      (game: Game) => game.id === gameArray[0].id
    );
    const diff = resultPos - indexPos;
    expect(
      await GameManager.findGameRow(
        gameArray[0].id,
        'title',
        'DESC',
        undefined,
        {
          orderVal: gameArray[4].title,
          title: gameArray[4].title,
          id: gameArray[4].id,
        }
      )
    ).toBe(diff > 0 ? diff : -1);
  });
  test('Valid game ID, orderBy title reverse, with index after', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'title',
      true
    );
    const indexPos = filtered.findIndex(
      (game: Game) => game.id === gameArray[5].id
    );
    const resultPos = filtered.findIndex(
      (game: Game) => game.id === gameArray[0].id
    );
    const diff = resultPos - indexPos;
    expect(
      await GameManager.findGameRow(
        gameArray[0].id,
        'title',
        'DESC',
        undefined,
        {
          orderVal: gameArray[5].title,
          title: gameArray[5].title,
          id: gameArray[5].id,
        }
      )
    ).toBe(diff > 0 ? diff : -1);
  });
});

describe('GameManager.findGamePageKeyset()', () => {
  beforeAll(async () => {
    await setSmall_gameOnly();
  });
  afterAll(async () => {
    await clearDB(Game);
  });
  test('No filters, orderby title, pagesize 1', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'title'
    );
    const result = await GameManager.findGamePageKeyset(
      {},
      'title',
      'ASC',
      undefined,
      1
    );
    for (const key in result.keyset) {
      expect([result.keyset[key]?.id, result.keyset[key]?.title]).toEqual([
        filtered[Number(key) - 2].id,
        filtered[Number(key) - 2].title,
      ]);
    }
    expect(result.total).toBe(filtered.length);
  });
  test('No filters, orderby title reverse, pagesize 1', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'title',
      true
    );
    const result = await GameManager.findGamePageKeyset(
      {},
      'title',
      'DESC',
      undefined,
      1
    );
    for (const key in result.keyset) {
      expect([result.keyset[key]?.id, result.keyset[key]?.title]).toEqual([
        filtered[Number(key) - 2].id,
        filtered[Number(key) - 2].title,
      ]);
    }
    expect(result.total).toBe(filtered.length);
  });
  test('No filters, orderby developer, pagesize 1', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'developer'
    );
    const result = await GameManager.findGamePageKeyset(
      {},
      'developer',
      'ASC',
      undefined,
      1
    );
    for (const key in result.keyset) {
      expect([result.keyset[key]?.id, result.keyset[key]?.title]).toEqual([
        filtered[Number(key) - 2].id,
        filtered[Number(key) - 2].title,
      ]);
    }
    expect(result.total).toBe(filtered.length);
  });
  test('Filter out UUID, orderby title, pagesize 1', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null && game.id !== gameArray[0].id,
      'title'
    );
    const result = await GameManager.findGamePageKeyset(
      {
        searchQuery: {
          genericBlacklist: [],
          genericWhitelist: [],
          blacklist: [
            {
              field: 'id',
              value: gameArray[0].id,
            },
          ],
          whitelist: [],
        },
      },
      'title',
      'ASC',
      undefined,
      1
    );
    for (const key in result.keyset) {
      expect([result.keyset[key]?.id, result.keyset[key]?.title]).toEqual([
        filtered[Number(key) - 2].id,
        filtered[Number(key) - 2].title,
      ]);
    }
    expect(result.total).toBe(filtered.length);
  });
  test('No filters, orderby title, pagesize 1, limit 3', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'title'
    );
    const result = await GameManager.findGamePageKeyset({}, 'title', 'ASC', 3, 1);
    for (const key in result.keyset) {
      expect([result.keyset[key]?.id, result.keyset[key]?.title]).toEqual([
        filtered[Number(key) - 2].id,
        filtered[Number(key) - 2].title,
      ]);
    }
    expect(result.total).toBe(3);
  });
  test('No filters, orderby title, pagesize 2', async () => {
    arrayCopy = v8.deserialize(
      v8.serialize(formatLocalMany(gameArray))
    ) as Game[];
    const filtered = filterAndSort(
      arrayCopy,
      (game: Game) => game.parentGameId === null,
      'title'
    );
    const result = await GameManager.findGamePageKeyset(
      {},
      'title',
      'ASC',
      undefined,
      2
    );
    for (const key in result.keyset) {
      expect([result.keyset[key]?.id, result.keyset[key]?.title]).toEqual([
        filtered[2 * (Number(key) - 2) + 1].id,
        filtered[2 * (Number(key) - 2) + 1].title,
      ]);
    }
    expect(result.total).toBe(filtered.length);
  });
});
