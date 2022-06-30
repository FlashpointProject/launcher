import { DbHelper } from './DbHelper';
import * as TagManager from '@back/game/TagManager';
import { Tag } from '@database/entity/Tag';

describe('Tags', () => {
  beforeAll(async () => {
    await DbHelper.instance.setupTestDB();
  });

  afterAll(() => {
    DbHelper.instance.teardownTestDB();
  });

  it('create tag' , async () => {
    const tag = await TagManager.createTag('test', undefined, undefined);
    expect(tag).toBeTruthy();
    if (tag) {
      expect(tag.categoryId).toEqual(1);
      expect(tag.aliases[0].name).toEqual('test');
    }
  });

  it('find tag', async() => {
    const tag = await TagManager.findTag('test');
    expect(tag).toBeTruthy();
    if (tag) {
      expect(tag.categoryId).toEqual(1);
      expect(tag.aliases[0].name).toEqual('test');
    }
  });

  it('created default category', async () => {
    const tagCategories = await TagManager.findTagCategories();
    expect(tagCategories).toHaveLength(1);
    expect(tagCategories[0].id).toEqual(1);
    expect(tagCategories[0].name).toEqual('default');
    expect(tagCategories[0].color).toEqual('#FFFFFF');
  });

  it('create category', async () => {
    const newCategory = await TagManager.createTagCategory('testCategory', 'blue');
    expect(newCategory).toBeTruthy();
    if (newCategory) {
      expect(newCategory.id).toBe(2);
      expect(newCategory.name).toBe('testCategory');
      expect(newCategory.color).toEqual('blue');
    }
  });

  it('create tag with category', async () => {
    const tag = await TagManager.createTag('test2', 'testCategory', undefined);
    expect(tag).toBeTruthy();
    if (tag) {
      expect(tag.categoryId).toEqual(2);
      expect(tag.aliases[0].name).toEqual('test2');
    }
  });

  it('find tags', async () => {
    const tags = await TagManager.findTags();
    expect(tags).toHaveLength(2);
  });

  it('find tags by partial name', async () => {
    await TagManager.createTag('wontFindMe');
    const tags = await TagManager.findTags('test');
    expect(tags).toHaveLength(2);
  });
});
