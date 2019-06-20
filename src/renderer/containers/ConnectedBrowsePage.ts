import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Subtract } from 'utility-types';
import { BrowsePage, BrowsePageProps } from '../components/pages/BrowsePage';
import { ApplicationState } from '../store';
import { SearchQuery } from '../store/search';
import * as searchActions from '../store/search/actions';
import { withLibrary, WithLibraryProps } from './withLibrary';
import { withPreferences, WithPreferencesProps } from './withPreferences';

type StateToProps = {
  /** The most recent search query. */
  search: SearchQuery;
};

type DispatchToProps = {
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
};

export type ConnectedBrowsePageProps = Subtract<BrowsePageProps, StateToProps & DispatchToProps & WithPreferencesProps & WithLibraryProps>;

const mapStateToProps = ({ search }: ApplicationState): StateToProps => ({
  search: search.query,
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchToProps => bindActionCreators({
  clearSearch: () => searchActions.setQuery({ text: '' }),
}, dispatch);

export default withLibrary(withPreferences(connect(
  mapStateToProps,
  mapDispatchToProps
)(BrowsePage)));
