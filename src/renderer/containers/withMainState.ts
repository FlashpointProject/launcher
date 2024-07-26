import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { RootState } from '@renderer/store/store';
import { mainActions, MainState } from '@renderer/store/main/slice';

export type WithMainStateProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

const mapStateToProps = (state: RootState) => ({
  main: state.main,
});

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    dispatch,
    setMainState: (state: Partial<MainState>) => dispatch(mainActions.setMainState(state)),
    mainActions: bindActionCreators(mainActions, dispatch),
  };
}

export const withMainState = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withMainState('+name+')' }
);
