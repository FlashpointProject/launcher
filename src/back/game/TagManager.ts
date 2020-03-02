import { OpenDialogFunc } from '@back/types';
import { chunkArray } from '@back/util/misc';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { TagSuggestion } from '@shared/back/types';
import { getManager, Like } from 'typeorm';

export namespace TagManager {

  export async function findTagCategories(): Promise<TagCategory[]> {
    return getManager().getRepository(TagCategory).find();
  }

  export async function deleteTag(tagId: number, openDialog: OpenDialogFunc): Promise<boolean> {
    const tagRepository = getManager().getRepository(Tag);
    const tagAliasRepository = getManager().getRepository(TagAlias);

    const gameCount = (await getManager().createQueryBuilder()
      .select('COUNT(*)')
      .from('game_tags_tag', 'game_tag')
      .where('game_tag.tagId = :id', { id: tagId })
      .getRawOne())['COUNT(*)'];

    if (gameCount > 0) {
      const res = await openDialog({
        title: 'Deletion Warning',
        message: `This tag will be removed from ${gameCount} games.\n\n Are you sure you want to delete this tag?`,
        buttons: ['Yes', 'No']
      });
      if (res === 1) { return false; }
    }
    // Delete game relations
    await getManager().createQueryBuilder()
      .delete()
      .from('game_tags_tag')
      .where('game_tags_tag.tagId = :id', { id: tagId })
      .execute();
    // Delete tag aliases
    await tagAliasRepository.delete({ tagId: tagId });
    await tagRepository.delete(tagId);
    return true;
  }

  export async function saveTag(tag: Tag): Promise<Tag> {
    const tagRepository = getManager().getRepository(Tag);
    return tagRepository.save(tag);
  }

  export async function findTags(name: string): Promise<Tag[]> {
    const tagRepository = getManager().getRepository(Tag);
    const tagAliasRepostiory = getManager().getRepository(TagAlias);

    const aliases = await tagAliasRepostiory.find({
      where: [
        { name: Like(name + '%') }
      ],
    });

    console.log(name);
    console.log(aliases);

    return tagRepository.createQueryBuilder('tag')
      .leftJoinAndSelect('tag.aliases', 'alias')
      .leftJoinAndSelect('tag.primaryAlias', 'primaryAlias')
      .whereInIds(aliases.map(a => a.tagId))
      .orderBy('tag.categoryId DESC, primaryAlias.name', 'ASC')
      .getMany();
  }

  export async function cleanupTagAliases() {
    const tagAliasRepostiory = getManager().getRepository(TagAlias);
    const q = tagAliasRepostiory.createQueryBuilder('tag_alias')
      .delete()
      .where('tag_alias.tagId IS NULL');
    return q.execute();
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
      .where('tag_alias.name like :partial', { partial: name + '%' })
      .limit(25);

    const tagAliases = await getManager().createQueryBuilder()
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
    const tagRepository = getManager().getRepository(Tag);

    const subQuery = getManager().createQueryBuilder()
      .select('game_tag.tagId')
      .from('game_tags_tag', 'game_tag')
      .where('game_tag.gameId = :gameId', { gameId: gameId });

    const tags = await tagRepository.createQueryBuilder('tag')
      .leftJoinAndSelect('tag.primaryAlias', 'primaryAlias', 'primaryAlias.id = tag.primaryAliasId')
      .where(`tag.id IN (${subQuery.getQuery()})`)
      .orderBy('tag.categoryId DESC, primaryAlias.name', 'ASC')
      .setParameters(subQuery.getParameters())
      .getMany();

    console.log(tags);

    return tags;
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

    const tagCategory = await tagCategoryRepository.save(category);
    // @TODO : Tag category change events
    return tagCategory;
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