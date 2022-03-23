import { Task } from '@shared/interfaces';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ApplicationState } from '../store';
import * as tasksActions from '../store/tasks/actions';

type StateToProps = {
  readonly tasks: Task[];
};

type DispatchToProps = {
  /** Called when the Tasks change */
  addTask: (task: Task) => void;
  setTask: (taskId: string, task: Partial<Task>) => void;
};

export type WithTasksProps = StateToProps & DispatchToProps;

const mapStateToProps = ({ tasks }: ApplicationState): StateToProps => ({
  tasks: tasks,
});

const mapDispatchToProps = (dispatch: Dispatch) => bindActionCreators({
  addTask: (task: Task) => tasksActions.addTask(task),
  setTask: (taskId: string, taskData: Partial<Task>) => tasksActions.setTask(taskId, taskData),
}, dispatch);

export const withTasks = connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { getDisplayName: name => 'withTasks('+name+')' }
);
