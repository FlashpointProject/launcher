import { withTasks, WithTasksProps } from '@renderer/containers/withTasks';
import * as React from 'react';
import { FancyAnimation } from './FancyAnimation';
import { OpenIcon } from './OpenIcon';

type OwnProps = {
  open: boolean;
  onToggleOpen: () => void;
};

export type TaskBarProps = OwnProps & WithTasksProps;

// Title bar of the window (the top-most part of the window).
function TaskBarInternal(props: TaskBarProps) {
  const tasksRender = props.tasks.length == 0 ? (<div className='task-bar-empty'>No Tasks</div>) : props.tasks.map(task => {
    const { progress, finished } = task;
    return (
      <div className='task'
        key={task.id}>
        <div className='task--upper'>
          <div className='task-name'>{task.name}</div>
          <div className='task-progress-bar'>
            {progress != undefined && (
              <FancyAnimation
                normalRender={() => (
                  <div className={`task-progress-bar--fill ${task.error ? 'task-progress-bar--error' : ''}`} style={{ width: (finished ? 100 : progress * 100) + '%' }}>
                    {task.finished ? (
                      'Finished'
                    ) : (
                      progress ? (progress * 100).toFixed(1) + '%' : 'Working...'
                    )}
                  </div>
                )}
                fancyRender={() => (
                  <div className={`task-progress-bar--fill task-progress-bar--fill-animated ${task.error ? 'task-progress-bar--error' : ''}`} style={{ width: (finished ? 100 : progress * 100) + '%' }}>
                    {task.finished ? (
                      'Finished'
                    ) : (
                      progress ? (progress * 100).toFixed(2) + '%' : 'Working...'
                    )}
                  </div>
                )}/>
            )}
          </div>
        </div>
        <div className='task--lower'>
          <div className='task-status'>{task.error || task.status}</div>
        </div>
      </div>
    );
  });

  return (
    <>
      <div
        onClick={props.onToggleOpen}
        className='task-bar--header'>
        <div className='task-bar--header-chevron'>
          <OpenIcon icon={ props.open ? 'chevron-bottom' : 'chevron-top' } />
        </div>
      </div>
      { props.open && (
        <div className='task-bar simple-scroll'>
          { tasksRender }
        </div>
      ) }
    </>
  );
}

export const TaskBar = withTasks(TaskBarInternal);
