import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { ApplicationState } from '../store';
import { IAppPreferencesData } from '../../shared/preferences/IAppPreferencesData';
import * as searchActions from '../store/preferences/actions';

interface IStateToProps {
  readonly preferencesData: Readonly<IAppPreferencesData>;
}

interface IDispatchToProps {
  readonly updatePreferences: (data: Partial<IAppPreferencesData>) => void;
}

export type WithPreferencesProps = IStateToProps & IDispatchToProps;

const mapStateToProps = ({ preferences }: ApplicationState): IStateToProps => ({
  preferencesData: preferences.data,
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  updatePreferences: (data: Partial<IAppPreferencesData>) => searchActions.updatePreferences(data)
}, dispatch);

export const withPreferences = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withPreferences('+name+')' }
);
