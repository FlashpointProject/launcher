import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { downloadsActions } from '@renderer/store/downloads/slice';
import { RootState } from '@renderer/store/store';
import { Subtract } from '@shared/interfaces';
import { useDispatch } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

export type WithDownloadsProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

const mapStateToProps = (state: RootState) => ({
  downloads: state.downloads,
});

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    downloadsActions: bindActionCreators(downloadsActions, dispatch),
  };
}

export function withDownloads<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, WithDownloadsProps>) => {
    const state = useAppSelector(state => state);
    const dispatch = useDispatch();
    const stateProps = mapStateToProps(state);
    const dispatchProps = mapDispatchToProps(dispatch);
    return <Component
      {...stateProps}
      {...dispatchProps}
      {...props as P}/>;
  };
}
