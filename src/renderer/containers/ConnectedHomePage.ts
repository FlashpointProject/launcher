import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Subtract } from '@shared/interfaces';
import { HomePage, HomePageProps } from '../components/pages/HomePage';
import * as searchActions from '../store/search/actions';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { withSearch, WithSearchProps } from './withSearch';

type DispatchToProps = {
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
};

export type ConnectedHomePageProps = Subtract<HomePageProps, DispatchToProps & WithPreferencesProps & WithSearchProps>;

const mapDispatchToProps = (dispatch: Dispatch): DispatchToProps => bindActionCreators({
  clearSearch: () => searchActions.setQuery({ text: '' }),
}, dispatch);

export const ConnectedHomePage = withSearch(withPreferences(connect(
  undefined,
  mapDispatchToProps
)(HomePage)));
