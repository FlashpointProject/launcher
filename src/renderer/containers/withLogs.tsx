import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { logsActions, LogsState } from '@renderer/store/logs/slice';
import { Subtract } from '@shared/interfaces';
import { useDispatch } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

type LogsStateProps = {
  logs: LogsState
};

export type WithLogsProps = LogsStateProps & ReturnType<typeof mapDispatchToProps>;

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    logsActions: bindActionCreators(logsActions, dispatch),
  };
}

export function withLogs<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, WithLogsProps>) => {
    const stateProps: LogsStateProps = useAppSelector(state => ({
      logs: state.logs
    }));
    const dispatch = useDispatch();
    const dispatchProps = mapDispatchToProps(dispatch);
    return <Component
      {...stateProps}
      {...dispatchProps}
      {...props as P}/>;
  };
}
