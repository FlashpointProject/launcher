import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { RootState } from '@renderer/store/store';
import { setTagCategories } from '@renderer/store/tagCategories/slice';
import { TagCategory } from 'flashpoint-launcher';

const mapStateToProps = (state: RootState) => ({
  tagCategories: state.tagCategories,
});

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    setTagCategories: (tagCats: TagCategory[]) => dispatch(setTagCategories(tagCats)),
  };
}

export type WithTagCategoriesProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

export const withTagCategories = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withTagCategories('+name+')' }
);
