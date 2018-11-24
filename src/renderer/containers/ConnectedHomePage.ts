import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Subtract } from 'utility-types';
import { withPreferences, WithPreferencesProps } from './withPreferences';
import { HomePage, IHomePageProps } from '../components/pages/HomePage';
import * as searchActions from '../store/search/actions';

interface IDispatchToProps {
  clearSearch: () => void;
}

export type IConnectedHomePageProps = Subtract<IHomePageProps, IDispatchToProps & WithPreferencesProps>;

const mapDispatchToProps = (dispatch: Dispatch): IDispatchToProps => bindActionCreators({
  clearSearch: () => searchActions.setQuery({ text: '' }),
}, dispatch);

export const ConnectedHomePage = withPreferences(connect(
  undefined,
  mapDispatchToProps
)(HomePage));
