import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { RootState } from '@renderer/store/store';
import { addTask, setTask } from '@renderer/store/tasks/slice';
import { Task } from '@shared/interfaces';

const mapStateToProps = (state: RootState) => ({
  tasks: state.tasks,
});

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    addTask: (task: Task) => dispatch(addTask(task)),
    setTask: (task: Partial<Task>) => dispatch(setTask(task)),
  };
}

export type WithTasksProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

export const withTasks = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withTasks('+name+')' }
);
