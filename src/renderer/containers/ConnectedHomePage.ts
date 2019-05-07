import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Subtract } from 'utility-types';
import { HomePage, IHomePageProps } from '../components/pages/HomePage';
import * as searchActions from '../store/search/actions';
import { withLibrary, WithLibraryProps } from './withLibrary';
import { withSearch, WithSearchProps } from './withSearch';
import { withPreferences, WithPreferencesProps } from './withPreferences';

interface IDispatchToProps {
  clearSearch: () => void;
}

export type IConnectedHomePageProps = Subtract<IHomePageProps, IDispatchToProps & WithPreferencesProps & WithLibraryProps & WithSearchProps>;

const mapDispatchToProps = (dispatch: Dispatch): IDispatchToProps => bindActionCreators({
  clearSearch: () => searchActions.setQuery({ text: '' }),
}, dispatch);

export const ConnectedHomePage = withSearch(withLibrary(withPreferences(connect(
  undefined,
  mapDispatchToProps
)(HomePage))));
