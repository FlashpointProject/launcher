import { action } from 'typesafe-actions';
import { TagCategoriesActions } from './types';
import { TagCategory } from 'flashpoint-launcher';

export const setTagCategories = (tagCategories: TagCategory[]) => action(TagCategoriesActions.SET_TAG_CATEGORIES, tagCategories);
