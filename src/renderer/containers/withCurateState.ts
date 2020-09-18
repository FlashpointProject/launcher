import { ApplicationState } from '@renderer/store';
import { CurateAction } from '@renderer/store/curate/types';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

export type WithCurateStateProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>

const mapStateToProps = (state: ApplicationState) => ({
  curate: state.curate,
});

function mapDispatchToProps(dispatch: Dispatch<CurateAction>) {
  return {
    dispatchCurate: dispatch,
  };
}

export const withCurateState = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withCurateState('+name+')' }
);
