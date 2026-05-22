import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { setStatus } from '@renderer/store/downloads/slice';
import { DownloaderStatus } from 'flashpoint-launcher';
import { SimpleButton } from '../SimpleButton';

export function DownloadsPage() {
  const dispatch = useAppDispatch();
  const downloaderState = useAppSelector((state) => state.downloads);

  const onToggleState = () => {
    const newState: DownloaderStatus =
      downloaderState.state === 'running' ? 'stopped' : 'running';
    dispatch(setStatus(newState));
  };

  return (
    <div className='downloads-page'>
      <div className='downloads-page__upper'>
        <div className='downloads-page__upper-left'>
          <div>{`Task completion: ${downloaderState.done} /  ${downloaderState.total}`}</div>
          <div>
            {`Failures: ${downloaderState.failures}`}
          </div>
        </div>
        <div className='downloads-page__upper-right'>
          <SimpleButton
            value={downloaderState.state === 'running' ? 'Stop' : 'Resume'}
            disabled={downloaderState.done === downloaderState.total}
            onClick={onToggleState}
          />
          {/* <SimpleButton
            value={'Add All Missing Content'}
            onClick={onAddMissingContent}/> */}
        </div>
      </div>
      {downloaderState.workers.map((worker) => (
        <div key={worker.id} className='downloads-worker'>
          <div className='downloads-worker__header'>
            <span className='downloads-worker__id'>{`Worker ${worker.id}`}</span>
            <span className='downloads-worker__task'>{worker.taskText || 'Idle'}</span>
          </div>

          {/* Step progress bar */}
          <div className='downloads-worker__bar-container'>
            <div
              className='downloads-worker__bar-fill'
              style={{ width: `${Math.round(worker.stepProgress * 100)}%` }}
            />
          </div>
          <div className='downloads-worker__percent'>
            {`${Math.round(worker.stepProgress * 100)}%`}
          </div>
        </div>
      ))}
    </div>
  );
}
