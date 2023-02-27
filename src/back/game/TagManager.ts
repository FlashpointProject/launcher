import { SocketServer } from '@back/SocketServer';
import { BackState, ShowMessageBoxFunc } from '@back/types';
import { awaitDialog } from '@back/util/dialog';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { BackOut, MergeTagData, TagSuggestion } from '@shared/back/types';
import { chunkArray } from '@shared/utils/misc';
import { IsNull, Not, SelectQueryBuilder } from 'typeorm';
import { AppDataSource } from '..';
import * as GameManager from './GameManager';

export async function findTagCategories(): Promise<TagCategory[]> {
  return AppDataSource.getRepository(TagCategory).find();
}

export async function deleteTag(tagId: number, state: BackState, openDialog?: ShowMessageBoxFunc, skipWarn?: boolean): Promise<boolean> {
  const tagRepository = AppDataSource.getRepository(Tag);
  const tagAliasRepository = AppDataSource.getRepository(TagAlias);

  if (!skipWarn) {
    const gameCount = (await AppDataSource.createQueryBuilder()
    .select('COUNT(*)')
    .from('game_tags_tag', 'game_tag')
    .where('game_tag.tagId = :id', { id: tagId })
    .getRawOne())['COUNT(*)'];

    if (gameCount > 0 && openDialog) {
      const dialogId = await openDialog({
        largeMessage: true,
        message: `This tag will be removed from ${gameCount} games.\n\n Are you sure you want to delete this tag?`,
        buttons: ['Yes', 'No']
      });
      const res = (await awaitDialog(state, dialogId)).buttonIdx;
      if (res === 1) { return false; }
    }
  }

  await tagAliasRepository.delete({ tagId: tagId });
  await tagRepository.delete(tagId);
  return true;
}

export async function saveTag(tag: Tag): Promise<Tag> {
  const tagRepository = AppDataSource.getRepository(Tag);
  return tagRepository.save(tag);
}

export async function saveTagAlias(tagAlias: TagAlias): Promise<TagAlias> {
  const tagAliasRepository = AppDataSource.getRepository(TagAlias);
  return tagAliasRepository.save(tagAlias);
}

export async function findTags(name?: string, flatFilters?: string[]): Promise<Tag[]> {
  const tagRepository = AppDataSource.getRepository(Tag);
  const tagAliasRepostiory = AppDataSource.getRepository(TagAlias);
  const filterQuery = flatFilters ? getFilterIDsQuery(flatFilters) : undefined;


  let query = tagRepository.createQueryBuilder('tag')
  .leftJoinAndSelect('tag.aliases', 'alias')
  .leftJoinAndSelect('tag.primaryAlias', 'primaryAlias');

  if (name) {
    // Get exclusion
    const subQ = tagAliasRepostiory.createQueryBuilder('tag_alias')
    .select('tag_alias.tagId')
    .where('tag_alias.name NOT LIKE :name', { name: name + '%' });

    query = query.where(`tag.id NOT IN (${subQ.getQuery()})`)
    .setParameters(subQ.getParameters());
  }

  if (filterQuery) {
    query = query.andWhere(`tag.id NOT IN (${filterQuery.getQuery()})`)
    .setParameters(filterQuery.getParameters());
  }

  return query.orderBy('tag.categoryId ASC, primaryAlias.name', 'ASC')
  .getMany();
}

// @TODO : Localize
export async function mergeTags(mergeData: MergeTagData, openDialog: ShowMessageBoxFunc, state: BackState): Promise<Tag | null> {
  const mergeSorc = await findTag(mergeData.toMerge);
  const mergeDest = await findTag(mergeData.mergeInto);
  if (mergeDest && mergeSorc) {
    if (mergeDest.id !== mergeSorc.id) {
      // Confirm merge
      const dialogId = await openDialog({
        largeMessage: true,
        message: 'Merge ' + mergeSorc.primaryAlias.name + ' into ' + mergeData.mergeInto + '?',
        buttons: [ 'Yes', 'No', 'Cancel' ]
      });
      const res = (await awaitDialog(state, dialogId)).buttonIdx;
      if (res !== 0) {
        return null;
      }
      // Move names first
      if (mergeData.makeAlias) {
        for (const alias of mergeSorc.aliases) {
          mergeDest.aliases.push({ ...alias, tagId: mergeDest.id });
        }
      }
      // Move game tag references next
      const games = await GameManager.findGamesWithTag(mergeSorc);
      for (const game of games) {
        if (game.tags.findIndex(t => t.id === mergeDest.id) === -1) {
          game.tags.push(mergeDest);
        }
      }
      // Update games, delete source tag, then save dest tag
      await GameManager.updateGames(games);
      if (mergeSorc.id) {
        await deleteTag(mergeSorc.id, state, openDialog, true);
      }
      await saveTag(mergeDest);
    } else {
      openDialog({
        message: 'Cannot merge tag into itself!',
        buttons: [ 'Ok' ]
      });
    }
  } else {
    openDialog({
      message: 'No tag found for "' + mergeData.mergeInto + '"',
      buttons: [ 'Ok ' ]
    });
  }
  return mergeDest;
}

export async function cleanupTagAliases() {
  const tagAliasRepostiory = AppDataSource.getRepository(TagAlias);
  const q = tagAliasRepostiory.createQueryBuilder('tag_alias')
  .delete()
  .where('tag_alias.tagId IS NULL');
  return q.execute();
}

export async function findTag(name: string): Promise<Tag | null> {
  const tagRepository = AppDataSource.getRepository(Tag);
  const tagAliasRepostiory = AppDataSource.getRepository(TagAlias);

  const alias = await tagAliasRepostiory.findOne({
    where: [
      { name: name }
    ]
  });

  if (alias) {
    return tagRepository.findOne({
      where: [
        { id: alias.tagId }
      ]
    });
  }

  return null;
}

export async function findTagSuggestions(name: string, flatTagFilter: string[] = [], flatCatFilter: string[] = []): Promise<TagSuggestion[]> {
  const tagAliasRepostiory = AppDataSource.getRepository(TagAlias);
  const tagCategoryRepository = AppDataSource.getRepository(TagCategory);
  const tagCategories = (await Promise.all(flatCatFilter.map(async (cat) => tagCategoryRepository.findOne({ where: { name: cat }})))).filter(t => t !== undefined) as TagCategory[];
  const flatCatIds = tagCategories.map(tg => tg.id);
  const filterQuery = flatTagFilter.length > 0 ? getFilterIDsQuery(flatTagFilter) : undefined;

  let subQuery = tagAliasRepostiory.createQueryBuilder('tag_alias')
  .leftJoin(Tag, 'tag', 'tag_alias.tagId = tag.id')
  .select('tag.id, tag.categoryId, tag.primaryAliasId, tag_alias.name')
  .where('tag_alias.name like :partial', { partial: name + '%' })
  .andWhere('tag.categoryId NOT IN (:...flatCatIds)', { flatCatIds });
  if (filterQuery) {
    subQuery = subQuery.andWhere(`tag.id NOT IN (${filterQuery.getQuery()})`)
    .setParameters(filterQuery.getParameters());
  }
  subQuery = subQuery.limit(25);

  const tagAliases = await AppDataSource.createQueryBuilder()
  .select('sugg.id, sugg.categoryId, sugg.name, COUNT(game_tag.gameId) as gameCount, primary_alias.name as primaryName')
  .from(`(${ subQuery.getQuery() })`, 'sugg')
  .leftJoin(TagAlias, 'primary_alias', 'sugg.primaryAliasId = primary_alias.id')
  .leftJoin('game_tags_tag', 'game_tag', 'game_tag.tagId = sugg.id')
  .groupBy('sugg.name')
  .orderBy('COUNT(game_tag.gameId) DESC, sugg.name', 'ASC') // Hacky
  .setParameters(subQuery.getParameters())
  .getRawMany();

  const suggestions: TagSuggestion[] = tagAliases.map(ta => {
    const alias = ta.name != ta.primaryName ? ta.name : undefined;
    const primaryAlias = ta.primaryName;
    const tag = new Tag();
    tag.id = ta.id;
    tag.categoryId = ta.categoryId;
    tag.count = ta.gameCount;
    return { alias: alias, primaryAlias: primaryAlias, tag: tag };
  });

  return suggestions;

}

export async function findGameTags(gameId: string): Promise<Tag[] | undefined> {
  const tagRepository = AppDataSource.getRepository(Tag);

  const subQuery = AppDataSource.createQueryBuilder()
  .select('game_tag.tagId')
  .from('game_tags_tag', 'game_tag')
  .where('game_tag.gameId = :gameId', { gameId: gameId });

  const tags = await tagRepository.createQueryBuilder('tag')
  .leftJoinAndSelect('tag.primaryAlias', 'primaryAlias', 'primaryAlias.id = tag.primaryAliasId')
  .where(`tag.id IN (${subQuery.getQuery()})`)
  .orderBy('tag.categoryId DESC, primaryAlias.name', 'ASC')
  .setParameters(subQuery.getParameters())
  .getMany();

  return tags;
}

export async function createTag(name: string, categoryName?: string, aliases?: string[]): Promise<Tag | null> {
  const tagRepository = AppDataSource.getRepository(Tag);
  const tagAliasRepostiory = AppDataSource.getRepository(TagAlias);
  const tagCategoryRepository = AppDataSource.getRepository(TagCategory);
  let category: TagCategory | null = null;

  // If category is defined, find/make it
  if (categoryName) {
    category = await tagCategoryRepository.findOne({
      where: {
        name: categoryName
      }
    });
  }
  if (!category) {
    // No tag category name given, use default
    category = await tagCategoryRepository.findOne({
      where: {
        name: 'default'
      }
    });
    if (!category) {
      category = await createTagCategory('default', '#FFFFFF');
    }
  }

  const tagAliases: TagAlias[] = [];

  if (category) {
    // Create tag and alias
    const tag = tagRepository.create({ category: category });
    // Save the newly created tag, return it
    let savedTag = await tagRepository.save(tag);
    const tagAlias = tagAliasRepostiory.create();
    tagAlias.name = name;
    tagAlias.tagId = savedTag.id;
    if (aliases) {
      for (const a of aliases) {
        const tagAlias = tagAliasRepostiory.create();
        tagAlias.name = a;
        tagAlias.tagId = savedTag.id;
        tagAliases.push(await tagAliasRepostiory.save(tagAlias));
      }
    }
    savedTag.primaryAlias = tagAlias;
    savedTag = await tagRepository.save(savedTag);
    savedTag.aliases = [await tagAliasRepostiory.save(tagAlias), ...tagAliases];
    return savedTag;
  }

  return null;
}

export async function createTagCategory(name: string, color: string): Promise<TagCategory | null> {
  const tagCategoryRepository = AppDataSource.getRepository(TagCategory);

  const category = tagCategoryRepository.create({
    name: name,
    color: color
  });

  const tagCategory = await tagCategoryRepository.save(category);
  // @TODO : Tag category change events
  return tagCategory;
}

export async function saveTagCategory(tagCategory: TagCategory): Promise<TagCategory> {
  const tagCategoryRepository = AppDataSource.getRepository(TagCategory);
  const newCat = await tagCategoryRepository.save(tagCategory);
  return newCat;
}

export async function getTagCategoryById(categoryId: number): Promise<TagCategory | null> {
  const tagCategoryRepository = AppDataSource.getRepository(TagCategory);
  return tagCategoryRepository.findOneBy({ id: categoryId });
}

export async function getTagById(tagId: number): Promise<Tag | null> {
  const tagRepository = AppDataSource.getRepository(Tag);
  return tagRepository.findOneBy({ id: tagId});
}

export async function addAliasToTag(tagId: number, alias: string): Promise<Tag> {
  const tag = await getTagById(tagId);
  if (!tag) {
    throw 'Tag not found';
  }
  const existAliasTag = await findTag(alias);
  if (existAliasTag) {
    throw 'Alias already on another tag';
  }
  const tagAliasRepostiory = AppDataSource.getRepository(TagAlias);
  const newAlias = tagAliasRepostiory.create();
  newAlias.name = alias;
  newAlias.tagId = tagId;
  await tagAliasRepostiory.save(newAlias);
  const updatedTag = await getTagById(tagId);
  if (!updatedTag) {
    throw 'How did this throw?';
  }
  return updatedTag;
}

export async function fixPrimaryAliases(): Promise<number> {
  const tagRepository = AppDataSource.getRepository(Tag);
  let fixed = 0;

  const tags = await tagRepository.find({ where: [{ primaryAliasId: IsNull() }] });
  const tagChunks = chunkArray(tags, 2000);

  for (const chunk of tagChunks) {
    await AppDataSource.transaction(async transEntityManager => {
      for (const tag of chunk) {
        if (tag.aliases.length > 0) {
          tag.primaryAliasId = tag.aliases[0].id;
          await transEntityManager.save(tag);
          fixed++;
        }
      }
    });
  }

  return fixed;
}

export async function deleteTagCategory(tagCategoryId: number, openDialog: ShowMessageBoxFunc, state: BackState): Promise<boolean> {
  const tagCategoryRepository = AppDataSource.getRepository(TagCategory);
  const tagRepository = AppDataSource.getRepository(Tag);

  const attachedTags = await tagRepository.find({
    where: [
      { categoryId: tagCategoryId }
    ]
  });

  if (attachedTags.length > 0) {
    // Warn about moving tags
    const dialogId = await openDialog({
      message: `This tag category will be removed from ${attachedTags.length} tags.\n\n What do you want to do with the remaining tags?`,
      buttons: ['Move to Default Category', 'Delete Tags', 'Cancel']
    });
    const res = (await awaitDialog(state, dialogId)).buttonIdx;
    if (res == 2) { return false; }
    if (res == 1) {
      for (const tag of attachedTags) {
        if (tag.id) {
          await deleteTag(tag.id, state, openDialog, true);
        }
      }
    }
    if (res == 0) {
      // Find first category that isn't the one we're deleting
      let defaultCategory = await tagCategoryRepository.findOne({
        where: [
          { id: Not(tagCategoryId) }
        ]
      });
      if (!defaultCategory) {
        defaultCategory = await createTagCategory('default', '#FFFFFF');
      }

      if (defaultCategory) {
        for (const tag of attachedTags) {
          tag.categoryId = defaultCategory.id;
          await saveTag(tag);
        }
      }
    }
  }
  await tagCategoryRepository.delete(tagCategoryId);
  return true;
}

export async function sendTagCategories(socketServer: SocketServer) {
  const tagCategoryRepository = AppDataSource.getRepository(TagCategory);
  const cats = await tagCategoryRepository.find();
  socketServer.broadcast(BackOut.TAG_CATEGORIES_CHANGE, cats);
}

export function getFilterIDsQuery(flatFilters: string[]): SelectQueryBuilder<TagAlias> {
  const tagAliasRepostiory = AppDataSource.getRepository(TagAlias);
  return tagAliasRepostiory.createQueryBuilder('tag_alias')
  .select('tag_alias.tagId')
  .where('tag_alias.name IN (:...flatFilters)', { flatFilters });
}
