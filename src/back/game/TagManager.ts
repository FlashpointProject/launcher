import { Tag } from '@database/entity/Tag';
import { getManager } from 'typeorm';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { TagSuggestion } from '@shared/back/types';
import { chunkArray } from '@back/util/misc';

export namespace TagManager {

  export async function findTagCategories(): Promise<TagCategory[]> {
    return getManager().getRepository(TagCategory).find();
  }

  export async function findTag(name: string): Promise<Tag | undefined> {
    const tagRepository = getManager().getRepository(Tag);
    const tagAliasRepostiory = getManager().getRepository(TagAlias);

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
  }

  export async function findTagSuggestions(name: string): Promise<TagSuggestion[]> {
    const tagAliasRepostiory = getManager().getRepository(TagAlias);

    const subQuery = tagAliasRepostiory.createQueryBuilder('tag_alias')
      .leftJoin(Tag, 'tag', 'tag_alias.tagId = tag.id')
      .select('tag.id, tag.categoryId, tag.primaryAliasId, tag_alias.name')
      .where('tag_alias.name like :partial', { partial: name + '%' });

    const tagAliases = await getManager().createQueryBuilder()
      .select('sugg.id, sugg.categoryId, sugg.name, primary_alias.name as primaryName')
      .from(`(${ subQuery.getQuery() })`, 'sugg')
      .leftJoin(TagAlias, 'primary_alias', 'sugg.primaryAliasId = primary_alias.id')
      .orderBy('sugg.name')
      .setParameters(subQuery.getParameters())
      .getRawMany();

    const suggestions: TagSuggestion[] = tagAliases.map(ta => {
      const alias = ta.name != ta.primaryName ? ta.name : undefined;
      const primaryAlias = ta.primaryName;
      const tag = new Tag();
      tag.id = ta.id;
      tag.category = ta.categoryId;
      return { alias: alias, primaryAlias: primaryAlias, tag: tag };
    });

    console.log(tagAliases);

    return suggestions;

  }

  export async function findGameTags(gameId: string): Promise<Tag[] | undefined> {
    const tagRepository = getManager().getRepository(Tag);

    const tagIds = await getManager().createQueryBuilder()
      .select('game_tag.tagId')
      .from('game_tag_tags', 'game_tag')
      .where('game_tag.gameId = :gameId', { gameId: gameId })
      .getRawMany();

    console.log(tagIds);

    return await tagRepository.findByIds(tagIds);
  }

  export async function createTag(name: string): Promise<Tag | undefined> {
    const tagRepository = getManager().getRepository(Tag);
    const tagAliasRepostiory = getManager().getRepository(TagAlias);
    const tagCategoryRepository = getManager().getRepository(TagCategory);

    let defaultCategory = await tagCategoryRepository.findOne();
    if (!defaultCategory) {
        defaultCategory = await createTagCategory('default', '#FFFFFF');
    }

    if (defaultCategory) {
      // Create tag and alias
      const tag = tagRepository.create({ category: defaultCategory });
      // Save the newly created tag, return it
      let savedTag = await tagRepository.save(tag);
      const tagAlias = tagAliasRepostiory.create();
      tagAlias.name = name;
      tagAlias.tagId = savedTag.id;
      savedTag.primaryAlias = tagAlias;
      savedTag = await tagRepository.save(savedTag);
      savedTag.aliases = [await tagAliasRepostiory.save(tagAlias)];
      return savedTag;
    }
  }

  export async function createTagCategory(name: string, color: string): Promise<TagCategory | undefined> {
    const tagCategoryRepository = getManager().getRepository(TagCategory);

    const category = tagCategoryRepository.create({
      name: name,
      color: color
    });
    return tagCategoryRepository.save(category);
  }

  export async function getTagById(tagId: number): Promise<Tag | undefined> {
    const tagRepository = getManager().getRepository(Tag);
    return tagRepository.findOne(tagId);
  }

  export async function fixPrimaryAliases(): Promise<number> {
    const tagRepository = getManager().getRepository(Tag);
    let fixed = 0;

    const tags = await tagRepository.find({ where: [{ primaryAliasId: null }] });
    const tagChunks = chunkArray(tags, 2000);

    for (let chunk of tagChunks) {
      await getManager().transaction(async transEntityManager => {
        for (let tag of chunk) {
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
}