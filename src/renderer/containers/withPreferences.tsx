import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { IAppPreferencesData } from '../../shared/preferences/IAppPreferencesData';
import { ApplicationState } from '../store';
import * as action from '../store/preferences/actions';

type StateToProps = {
  /** Current preference data. */
  readonly preferencesData: Readonly<IAppPreferencesData>;
};

type DispatchToProps = {
  /** Update the entire, or parts of the, preference data object. */
  readonly updatePreferences: (data: Partial<IAppPreferencesData>) => void;
};

export type WithPreferencesProps = StateToProps & DispatchToProps;

const mapStateToProps = ({ preferences }: ApplicationState): StateToProps => ({
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
