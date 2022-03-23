import { Task } from '@shared/interfaces';
import { Reducer } from 'redux';
import { TasksActions } from './types';

const initialState: Task[] = [];

const reducer: Reducer<Task[], TasksAction> = (state = initialState, action) => {
  if (action.type.startsWith('@@task')) {
    log.debug('Launcher', `TASK ACTION:/n${JSON.stringify(action, undefined, 2)}`);
  }
  switch (action.type) {
    case TasksActions.ADD_TASK: {
      if (state.findIndex(t => t.id === action.payload.id) !== -1) {
        log.error('Launcher', 'Illegal Action: addTask - ID Collision');
        return state;
      } else {
        log.debug('Launcher', 'NEW TASK!');
        return [ ...state, action.payload ];
      }
    }
    case TasksActions.SET_TASK: {
      log.debug('Launcher', 'Adding I guesssss');
      const payload = action.payload;
      const newState = [ ...state ];
      const newTaskIdx = newState.findIndex(t => t.id === payload.taskId);
      log.debug('Launcher', 'Found task at idx ' + newTaskIdx);
      if (newTaskIdx !== -1) {
        const newTask = { ...newState[newTaskIdx], ...payload.taskData };
        log.debug('Launcher', `Updated task, RAW:/n ${JSON.stringify(payload.taskData, undefined, 2)}, MERGED:/n ${JSON.stringify(newTask, undefined, 2)}`);
        newState[newTaskIdx] = newTask;
      }
      return newState;
    }
    default: {
      return state;
    }
  }
};

export { reducer as tasksStateReducer };

type TasksAction = {
  type: TasksActions.ADD_TASK;
  payload: Task;
} | {
  type: TasksActions.SET_TASK;
  payload: {
    taskId: string;
    taskData: Partial<Task>;
  }
};
