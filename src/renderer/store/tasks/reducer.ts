import { Task } from '@shared/interfaces';
import { Reducer } from 'redux';
import { TasksActions } from './types';

const initialState: Task[] = [];

const reducer: Reducer<Task[], TasksAction> = (state = initialState, action) => {

  switch (action.type) {
    case TasksActions.ADD_TASK: {
      if (state.findIndex(t => t.id === action.payload.id) !== -1) {
        log.error('Launcher', 'Illegal Action: addTask - ID Collision');
        return state;
      } else {
        return [ action.payload, ...state ];
      }
    }
    case TasksActions.SET_TASK: {
      const payload = action.payload;
      const newState = [ ...state ];
      const newTaskIdx = newState.findIndex(t => t.id === payload.taskId);
      if (newTaskIdx !== -1) {
        const newTask = { ...newState[newTaskIdx], ...payload.taskData };
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
