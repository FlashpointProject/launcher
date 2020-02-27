import { Reducer } from 'redux';
import { TagCategoriesActions } from './types';
import { TagCategory } from '@database/entity/TagCategory';

const initialState: TagCategory[] = [];

const reducer: Reducer<TagCategory[]> = (state = initialState, action) => {
  switch (action.type) {
    case TagCategoriesActions.SET_TAG_CATEGORIES: {
      return action.payload;
    }
    default: {
      return state;
    }
  }
};

export { reducer as tagCategoriesReducer };
