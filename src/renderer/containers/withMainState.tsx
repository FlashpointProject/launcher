import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { mainActions } from '@renderer/store/main/slice';
import { Subtract } from '@shared/interfaces';
import { MainState } from 'flashpoint-launcher-renderer';
import { useDispatch } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

type MainStateProps = {
  main: MainState
};

export type WithMainStateProps = MainStateProps & ReturnType<typeof mapDispatchToProps>;


function mapDispatchToProps(dispatch: Dispatch) {
  return {
    dispatch,
    setMainState: (state: Partial<MainState>) => dispatch(mainActions.setMainState(state)),
    mainActions: bindActionCreators(mainActions, dispatch),
  };
}

export function withMainState<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, WithMainStateProps>) => {
    const stateProps: MainStateProps = {
      main: useAppSelector(state => state.main)
    };
    const dispatch = useDispatch();
    const dispatchProps = mapDispatchToProps(dispatch);
    return <Component
      {...stateProps}
      {...dispatchProps}
      {...props as P}/>;
  };
}
