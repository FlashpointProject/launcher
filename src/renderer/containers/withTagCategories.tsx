import { TagCategory } from '@database/entity/TagCategory';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ApplicationState } from '../store';
import * as tagCategoriesActions from '../store/tagCategories/actions';

type StateToProps = {
  /** Tag Categories Info */
  readonly tagCategories: TagCategory[];
};

type DispatchToProps = {
  /** Called when the Tag Categories change */
  setTagCategories: (tagCategories: TagCategory[]) => void;
};

export type WithTagCategoriesProps = StateToProps & DispatchToProps;

const mapStateToProps = ({ tagCategories }: ApplicationState): StateToProps => ({
  tagCategories: tagCategories,
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  setTagCategories: (tagCategories: TagCategory[]) => tagCategoriesActions.setTagCategories(tagCategories),
}, dispatch);

export const withTagCategories = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withTagCategories('+name+')' }
);
