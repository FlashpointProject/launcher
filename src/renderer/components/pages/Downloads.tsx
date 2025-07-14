import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { ProgressBar } from '../ProgressComponents';
import { SimpleButton } from '../SimpleButton';
import { DownloaderStatus } from 'flashpoint-launcher';
import { setStatus } from '@renderer/store/downloads/slice';
import { BackIn } from '@shared/back/types';

export function DownloadsPage() {
  const dispatch = useAppDispatch();
  const downloaderState = useAppSelector((state) => state.downloads);
  const tasks = Object.values(downloaderState.tasks);
  const workersPerRow = Math.ceil(downloaderState.workers.length / 2);
  const topWorkers = downloaderState.workers.slice(0, workersPerRow);
  const bottomWorkers = downloaderState.workers.length > 1 ? downloaderState.workers.slice(workersPerRow) : [];

  const onToggleState = () => {
    const newState: DownloaderStatus = downloaderState.state === 'running' ? 'stopped' : 'running';
    dispatch(setStatus(newState));
  };

  const onAddMissingContent = () => {
    // Dispatch action to add all missing content for download
    window.Shared.back.send(BackIn.DOWNLOADER_ADD_MISSING_CONTENT);
  };

  const tasksDone = tasks.filter(t => t.status !== 'waiting' && t.status !== 'in_progress').length;

  return (
    <div className='downloads-page'>
      <div className='downloads-page__upper'>
        <div className='downloads-page__upper-left'>
          <div>
            {`Task completion: ${tasksDone} /  ${tasks.length}`}
          </div>
          <div>
            {`Failures: ${tasks.filter(t => t.status === 'failure').length}`}
          </div>
        </div>
        <div className='downloads-page__upper-right'>
          <SimpleButton
            value={downloaderState.state === 'running' ? 'Stop' : 'Resume'}
            disabled={tasksDone === tasks.length}
            onClick={onToggleState}/>
          <SimpleButton
            value={'Add All Missing Content'}
            onClick={onAddMissingContent}/>
        </div>
      </div>
      <div className='downloads-page__workers'>
        { topWorkers.length > 0 && (
          <div className='downloads-page__workers-row'>
            { topWorkers.map((worker, idx) => {
              const progressPercent = ((worker.step - 1) / worker.totalSteps) + worker.stepProgress;
              const isDone = worker.text === 'Done';
              return (
                <div className='downloads-page__workers-worker'>
                  <ProgressBar
                    progressData={{
                      key: `downloads-worker-top-${idx}`,
                      usePercentDone: true,
                      percentDone: progressPercent,
                      itemCount: 0,
                      totalItems: 0,
                      isDone,
                      text: worker.taskText,
                      secondaryText: worker.text,
                    }} />
                </div>
              );
            })}
          </div>
        )}
        { bottomWorkers.length > 0 && (
          <div className='downloads-page__workers-row'>
            { bottomWorkers.length !== topWorkers.length && (
              <div className='downloads-page__workers-spacer'/>
            )}
            { bottomWorkers.map((worker, idx) => {
              const progressPercent = ((worker.step - 1) / worker.totalSteps) + worker.stepProgress;
              const isDone = worker.text === 'Done';
              return (
                <div className='downloads-page__workers-worker'>
                  <ProgressBar
                    progressData={{
                      key: `downloads-worker-bottom-${idx}`,
                      usePercentDone: true,
                      percentDone: progressPercent,
                      itemCount: 0,
                      totalItems: 0,
                      isDone,
                      text: worker.taskText,
                      secondaryText: worker.text,
                    }} />
                </div>
              );
            })}
            { bottomWorkers.length !== topWorkers.length && (
              <div className='downloads-page__workers-spacer'/>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
