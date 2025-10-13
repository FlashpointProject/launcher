import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { fpfssActions } from '@renderer/store/fpfss/slice';
import { FpfssState } from '@shared/back/types';
import { Subtract } from '@shared/interfaces';
import { useDispatch } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

type FpfssStateProps = {
  fpfss: FpfssState
};

export type WithFpfssProps = FpfssStateProps & ReturnType<typeof mapDispatchToProps>;

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    fpfssActions: bindActionCreators(fpfssActions, dispatch),
  };
}

export function withFpfss<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, WithFpfssProps>) => {
    const dispatch = useDispatch();
    const stateProps: FpfssStateProps = useAppSelector(state => ({
      fpfss: state.fpfss
    }));
    const dispatchProps = mapDispatchToProps(dispatch);
    return <Component
      {...stateProps}
      {...dispatchProps}
      {...props as P}/>;
  };
}
