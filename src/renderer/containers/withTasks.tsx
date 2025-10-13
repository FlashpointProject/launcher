import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { addTask, setTask } from '@renderer/store/tasks/slice';
import { Subtract, Task } from '@shared/interfaces';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

type TasksStateProps = {
  tasks: Task[]
};

export type WithTasksProps = TasksStateProps & ReturnType<typeof mapDispatchToProps>;

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    addTask: (task: Task) => dispatch(addTask(task)),
    setTask: (task: Partial<Task>) => dispatch(setTask(task)),
  };
}

export function withTasks<P>(Component: React.ComponentType<P>) {
  return (props: Subtract<P, WithTasksProps>) => {
    const stateProps: TasksStateProps = useAppSelector(state => ({
      tasks: state.tasks
    }));
    const dispatch = useDispatch();
    const dispatchProps = mapDispatchToProps(dispatch);
    return <Component
      {...stateProps}
      {...dispatchProps}
      {...props as P}/>;
  };
}
