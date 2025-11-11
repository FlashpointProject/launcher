import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { setStatus } from '@renderer/store/downloads/slice';
import { calcScale } from '@shared/Util';
import { DownloaderStatus, DownloadTask } from 'flashpoint-launcher';
import AutoSizer from 'react-virtualized-auto-sizer';
import { List, RowComponentProps } from 'react-window';
import { SimpleButton } from '../SimpleButton';
import { SizeProvider } from '../SizeProvider';

type RowProps = {
  tasks: DownloadTask[];
};

function DownloadRow({ tasks, index, style }: RowComponentProps<RowProps>) {
  const task = tasks[index];
  return (
    <div className='game-list-item' style={style}>
      <div className='game-list-item__field'>{task.game.title}</div>
    </div>
  );
}

export function DownloadsPage() {
  const dispatch = useAppDispatch();
  const downloaderState = useAppSelector((state) => state.downloads);
  const scale = useAppSelector((state) => state.preferences.scaleValues.browse);
  const tasks = Object.values(downloaderState.tasks);
  const rowHeight: number = calcScale(30, scale);

  const onToggleState = () => {
    const newState: DownloaderStatus =
      downloaderState.state === 'running' ? 'stopped' : 'running';
    dispatch(setStatus(newState));
  };

  const tasksDone = tasks.filter(
    (t) => t.status !== 'waiting' && t.status !== 'in_progress',
  ).length;

  return (
    <div className='downloads-page'>
      <div className='downloads-page__upper'>
        <div className='downloads-page__upper-left'>
          <div>{`Task completion: ${tasksDone} /  ${tasks.length}`}</div>
          <div>
            {`Failures: ${tasks.filter((t) => t.status === 'failure').length}`}
          </div>
        </div>
        <div className='downloads-page__upper-right'>
          <SimpleButton
            value={downloaderState.state === 'running' ? 'Stop' : 'Resume'}
            disabled={tasksDone === tasks.length}
            onClick={onToggleState}
          />
          {/* <SimpleButton
            value={'Add All Missing Content'}
            onClick={onAddMissingContent}/> */}
        </div>
      </div>
      <SizeProvider height={rowHeight}>
        <div className='downloads-page__data'>
          <div className='game-list-header'>
            <div className='game-list-header-column'>Downloads</div>
          </div>
          <div className='downloads-page__data-content'>
            <AutoSizer disableWidth>
              {({ height }) => {
                return (
                  <List<RowProps>
                    className='game-list simple-scroll'
                    style={{ height, maxHeight: undefined }}
                    rowHeight={rowHeight}
                    rowComponent={DownloadRow}
                    rowProps={{
                      tasks,
                    }}
                    rowCount={tasks.length}
                    overscanCount={15}
                  />
                );
              }}
            </AutoSizer>
          </div>
        </div>
      </SizeProvider>
    </div>
  );
}
