import { withTasks, WithTasksProps } from '@renderer/containers/withTasks';
import * as React from 'react';
import { FancyAnimation } from './FancyAnimation';

type OwnProps = {

};

export type TaskBarProps = OwnProps & WithTasksProps;

/** Title bar of the window (the top-most part of the window). */
function taskBar(props: TaskBarProps) {
  const tasksRender = React.useMemo(() => {
    return props.tasks.length == 0 ? 'No Tasks' : props.tasks.map(task => {
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
                    <div className={`task-progress-bar--fill ${task.error ? 'task-progress-bar--error' : ''}`} style={{width: (finished ? 100 : progress * 100) + '%'}}>
                      {task.finished ? (
                        'Finished'
                      ) : (
                        progress ? (progress * 100).toFixed(1) + '%' : 'Working...'
                      )}
                    </div>
                  )}
                  fancyRender={() => (
                    <div className={`task-progress-bar--fill task-progress-bar--fill-animated ${task.error ? 'task-progress-bar--error' : ''}`} style={{width: (finished ? 100 : progress * 100) + '%'}}>
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
  }, [props.tasks]);

  return (
    <div className='task-bar simple-scroll'>
      {tasksRender}
    </div>
  );
}

export const TaskBar = withTasks(taskBar);
