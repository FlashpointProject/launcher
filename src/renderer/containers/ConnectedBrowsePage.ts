import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Subtract } from '@shared/interfaces';
import { BrowsePage, BrowsePageProps } from '../components/pages/BrowsePage';
import { ApplicationState } from '../store';
import { SearchQuery } from '../store/search';
import * as searchActions from '../store/search/actions';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { WithTagCategoriesProps, withTagCategories } from './withTagCategories';

type StateToProps = {
  /** The most recent search query. */
  search: SearchQuery;
};

type DispatchToProps = {
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
};

export type ConnectedBrowsePageProps = Subtract<BrowsePageProps, StateToProps & DispatchToProps & WithPreferencesProps & WithTagCategoriesProps>;

const mapStateToProps = ({ search }: ApplicationState): StateToProps => ({
  search: search.query,
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchToProps => bindActionCreators({
  clearSearch: () => searchActions.setQuery({ text: '' }),
}, dispatch);

export default withTagCategories(withPreferences(connect(
  mapStateToProps,
  mapDispatchToProps
)(BrowsePage)));
