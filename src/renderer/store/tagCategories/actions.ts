import { action } from 'typesafe-actions';
import { TagCategory } from '@database/entity/TagCategory';
import { TagCategoriesActions } from './types';

export const setTagCategories = (tagCategories: TagCategory[]) => action(TagCategoriesActions.SET_TAG_CATEGORIES, tagCategories);
