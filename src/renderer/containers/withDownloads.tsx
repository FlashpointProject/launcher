import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { downloadsActions } from '@renderer/store/downloads/slice';
import { Subtract } from '@shared/interfaces';
import { DownloaderState } from 'flashpoint-launcher';
import { useDispatch } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

type DownloadStateProps = {
  downloads: DownloaderState
};

export type WithDownloadsProps = DownloadStateProps & ReturnType<typeof mapDispatchToProps>;

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    downloadsActions: bindActionCreators(downloadsActions, dispatch),
  };
}

export function withDownloads<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, WithDownloadsProps>) => {
    const dispatch = useDispatch();
    const stateProps: DownloadStateProps = {
      downloads: useAppSelector(state => state.downloads)
    };
    const dispatchProps = mapDispatchToProps(dispatch);
    return <Component
      {...stateProps}
      {...dispatchProps}
      {...props as P}/>;
  };
}
