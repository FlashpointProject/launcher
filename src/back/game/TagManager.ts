import { Tag } from '@database/entity/Tag';
import { getManager } from 'typeorm';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { TagSuggestion } from '@shared/back/types';
import { Game } from '@database/entity/Game';

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

    const tagAliases = await tagAliasRepostiory.createQueryBuilder('tag_alias')
      .leftJoinAndSelect(Tag, 'tag', 'tag_alias.tagId = tag.id')
      .select('tag.id, tag.categoryId, tag_alias.name')
      .where('tag_alias.name like :partial', { partial: name + '%' })
      .orderBy('tag_alias.name')
      .getRawMany();

    const suggestions: TagSuggestion[] = tagAliases.map(ta => {
      const tag = new Tag();
      tag.id = ta.id;
      tag.category = ta.categoryId;
      return { alias: ta.name, tag: tag };
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
      const savedTag = await tagRepository.save(tag);
      const tagAlias = tagAliasRepostiory.create();
      tagAlias.name = name;
      tagAlias.tagId = savedTag.id;
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
}