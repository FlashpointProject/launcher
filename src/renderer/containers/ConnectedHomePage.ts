import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Subtract } from 'utility-types';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { HomePage, IHomePageProps } from '../components/pages/HomePage';
import * as searchActions from '../store/search/actions';
import { withLibrary, WithLibraryProps } from './withLibrary';

interface IDispatchToProps {
  clearSearch: () => void;
}

export type IConnectedHomePageProps = Subtract<IHomePageProps, IDispatchToProps & WithPreferencesProps & WithLibraryProps>;

const mapDispatchToProps = (dispatch: Dispatch): IDispatchToProps => bindActionCreators({
  clearSearch: () => searchActions.setQuery({ text: '' }),
}, dispatch);

export const ConnectedHomePage = withLibrary(withPreferences(connect(
  undefined,
  mapDispatchToProps
)(HomePage)));
