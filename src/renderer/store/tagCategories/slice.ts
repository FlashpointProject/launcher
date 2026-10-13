import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TagCategory } from 'flashpoint-launcher';
import { RootState } from 'flashpoint-launcher-renderer';

const initialState: RootState['tagCategories'] = [];

const tagCategoriesSlice = createSlice({
  name: 'tagCategories',
  initialState,
  reducers: {
    setTagCategories(state: TagCategory[], { payload }: PayloadAction<TagCategory[]>) {
      return payload;
    }
  },
});

export const { actions: tagCategoriesActions } = tagCategoriesSlice;
export const { setTagCategories } = tagCategoriesSlice.actions;

export default tagCategoriesSlice.reducer;

