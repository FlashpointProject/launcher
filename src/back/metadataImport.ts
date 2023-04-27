import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { GameData } from '@database/entity/GameData';
import { Platform } from '@database/entity/Platform';
import { PlatformAlias } from '@database/entity/PlatformAlias';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { AppDataSource } from '.';
import { findGameData } from './game/GameDataManager';
import { findPlatform, findPlatformAlias, findTagAlias } from './game/TagManager';
import { MetadataGame, MetadataPlatform, MetadataTag, MetadataPlatformAlias, MetadataTagAlias, MetadataCategory } from './types';

export async function importGames(games: MetadataGame[]): Promise<void> {
  await AppDataSource.transaction(async transEntityManager => {
    for (const game of games) {
      let activeDataOnDisk = false;
      // Save add apps
      for (const addApp of game.addApps) {
        await transEntityManager.save(AdditionalApp, {
          ...addApp,
          waitForExit: !!addApp.waitForExit,
          autoRunBefore: !!addApp.autoRunBefore
        });
      }

      // Save game data
      const existingDataArr = await findGameData(game.id);
      for (const gameData of game.gameData) {
        const existingData = existingDataArr.find(d => d.sha256.toLowerCase() === gameData.sha256.toLowerCase());
        if (existingData) {
          // Data exists, if active then update number for when we save later
          if (game.activeDataId == gameData.id && game.activeDataId !== existingData.id) {
            game.activeDataId = existingData.id;
            activeDataOnDisk = existingData.presentOnDisk;
          }
        } else {
          await transEntityManager.insert(GameData, {
            ...gameData,
            id: undefined
          });
          if (game.activeDataId === gameData.id) {
            // Update id now that we've inserted
            const insertedGameData = await transEntityManager.findOne(GameData, { where: { gameId: game.id, sha256: gameData.sha256 }});
            if (insertedGameData) {
              game.activeDataId = insertedGameData.id;
            } else {
              throw 'Inserted game data but could not find afterwards?';
            }
          }
        }
      }

      // Wipe platform relations
      await transEntityManager.query('DELETE FROM game_platforms_platform WHERE gameId = ?', [game.id]);
      // Save platform relations
      for (const platform of game.platforms) {
        try {
          await transEntityManager.query('INSERT INTO game_platforms_platform (gameId, platformId) VALUES (?, ?)', [game.id, platform]);
        } catch (err) {
          console.log('platform relation error: ' + err);
        }
      }

      // Wipe tag relations
      await transEntityManager.query('DELETE FROM game_tags_tag WHERE gameId = ?', [game.id]);
      // Save tag relations
      for (const tag of game.tags) {
        try {
          await transEntityManager.query('INSERT INTO game_tags_tag (gameId, tagId) VALUES (?, ?)', [game.id, tag]);
        } catch (err) {
          console.log('tag relation error: ' + err);
        }
      }

      // Save game
      await transEntityManager.save(Game, {
        ...objectWithoutProperties(game, ['tags', 'platforms', 'addApps', 'gameData', 'activeDataOnDisk']),
        activeDataOnDisk,
        placeholder: false
      });
    }
  });
}

export async function importTags(tags: MetadataTag[]): Promise<void> {
  await AppDataSource.transaction(async transEntityManager => {
    // Ensure all aliases exist
    const allAliases = tags.reduce<MetadataTagAlias[]>((prev, cur) => prev.concat(cur.tagAliases), []);
    for (const alias of allAliases) {
      const existingAlias = await findTagAlias(alias.name);
      if (existingAlias) {
        // Update tag id if different
        if (existingAlias.tagId !== alias.tagId) {
          await transEntityManager.save(TagAlias, {
            ...existingAlias,
            tagId: alias.tagId
          });
        }
      } else {
        // Insert alias if missing
        await transEntityManager.save(TagAlias, {
          name: alias.name,
          tagId: alias.tagId,
        });
      }
    }

    // Insert and replace tags
    for (const tag of tags) {
      const name = tag.tagAliases.find(t => t.id === tag.id)?.name || '';
      const existing = await findPlatform(name);
      if (existing) {
        continue;
      } else {
        try {
          await transEntityManager.save(Tag, {
            id: tag.id,
            primaryAliasId: tag.primaryAliasId,
            categoryId: tag.categoryId,
            description: tag.description || ''
          });
        } catch (err) {
          console.log('tag sync error: ' + err);
        }
      }
    }
  });
}

export async function importTagCategories(cats: MetadataCategory[]): Promise<void> {
  await AppDataSource.transaction(async transEntityManager => {
    for (const cat of cats) {
      await transEntityManager.save(TagCategory, {
        ...cat
      });
    }
  });
}

export async function importPlatforms(platforms: MetadataPlatform[]): Promise<void> {
  await AppDataSource.transaction(async transEntityManager => {
    console.log('ensuring aliases');
    // Ensure all aliases exist
    const allAliases = platforms.reduce<MetadataPlatformAlias[]>((prev, cur) => prev.concat(cur.platformAliases), []);
    for (const alias of allAliases) {
      const existingAlias = await findPlatformAlias(alias.name);
      if (existingAlias) {
        // Update platform id if different
        if (existingAlias.platformId !== alias.platformId) {
          await transEntityManager.save(PlatformAlias, {
            ...existingAlias,
            platformId: alias.platformId
          });
        }
      } else {
        // Insert alias if missing
        await transEntityManager.save(PlatformAlias, {
          name: alias.name,
          platformId: alias.platformId,
        });
      }
    }

    console.log('replacing platforms');

    // Insert and replace platforms
    for (const platform of platforms) {
      const name = platform.platformAliases.find(p => p.id === platform.id)?.name || '';
      const existing = await findPlatform(name);
      if (existing) {
        continue;
      } else {
        try {
          await transEntityManager.save(Platform, {
            id: platform.id,
            primaryAliasId: platform.primaryAliasId,
            description: platform.description || ''
          });
        } catch (err) {
          console.log('platform sync error: ' + err);
        }
      }
    }
  });
}

function objectWithoutProperties(obj: any, keys: string[]) {
  const target: any = {};
  for (const i in obj) {
    if (keys.indexOf(i) >= 0) { continue; }
    if (!Object.prototype.hasOwnProperty.call(obj, i)) { continue; }
    target[i] = obj[i];
  }
  return target;
}
