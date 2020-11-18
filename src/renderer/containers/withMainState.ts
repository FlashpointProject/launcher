import { ApplicationState } from '@renderer/store';
import { MainActionType } from '@renderer/store/main/enums';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { MainAction, MainState } from '../store/main/types';

export type WithMainStateProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>

const mapStateToProps = (state: ApplicationState) => ({
  main: state.main,
});

function mapDispatchToProps(dispatch: Dispatch<MainAction>) {
  return {
    dispatchMain: dispatch,
    setMainState: <K extends keyof MainState>(state: Pick<MainState, K> | MainState): MainAction => dispatch({
      type: MainActionType.SET_STATE,
      payload: state,
    }),
  };
}

export const withMainState = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withMainState('+name+')' }
);
