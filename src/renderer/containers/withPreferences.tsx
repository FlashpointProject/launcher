import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { IAppPreferencesData } from '../../shared/preferences/IAppPreferencesData';
import { ApplicationState } from '../store';
import * as action from '../store/preferences/actions';

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
  updatePreferences: (data: Partial<IAppPreferencesData>) => action.updatePreferences(data)
}, dispatch);

export const withPreferences = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withPreferences('+name+')' }
);
