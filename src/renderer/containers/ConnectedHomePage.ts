import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Subtract } from 'utility-types';
import { HomePage, HomePageProps } from '../components/pages/HomePage';
import * as searchActions from '../store/search/actions';
import { withLibrary, WithLibraryProps } from './withLibrary';
import { withSearch, WithSearchProps } from './withSearch';
import { withPreferences, WithPreferencesProps } from './withPreferences';

type DispatchToProps = {
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
};

export type ConnectedHomePageProps = Subtract<HomePageProps, DispatchToProps & WithPreferencesProps & WithLibraryProps & WithSearchProps>;

const mapDispatchToProps = (dispatch: Dispatch): DispatchToProps => bindActionCreators({
  clearSearch: () => searchActions.setQuery({ text: '' }),
}, dispatch);

export const ConnectedHomePage = withSearch(withLibrary(withPreferences(connect(
  undefined,
  mapDispatchToProps
)(HomePage))));
