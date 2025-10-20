import { Task } from '@shared/interfaces';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type TaskState = {
  tasks: Task[];
  taskBarOpen: boolean;
}

const initialState: TaskState = {
  tasks: [],
  taskBarOpen: false
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTaskBarOpen(state: TaskState, { payload }: PayloadAction<boolean>) {
      state.taskBarOpen = payload;
    },
    addTask(state: TaskState, { payload }: PayloadAction<Task>) {
      const taskIdx = state.tasks.findIndex(t => t.id === payload.id);
      if (taskIdx > -1) {
        log.error('Launcher', 'Illegal Action: addTask - ID Collision');
        return;
      }
      state.tasks.push(payload);
      // Open task bar for first task
      if (state.tasks.length === 1) {
        state.taskBarOpen = true;
      }
    },
    setTask(state: TaskState, { payload }: PayloadAction<Partial<Task>>) {
      if (payload.id) {
        const taskIdx = state.tasks.findIndex(t => t.id === payload.id);
        if (taskIdx > -1) {
          state.tasks[taskIdx] = {
            ...state.tasks[taskIdx],
            ...payload,
          };
        }
      }
    }
  },
});

export const { actions: tasksActions } = tasksSlice;
export const { addTask, setTask, setTaskBarOpen } = tasksSlice.actions;
export default tasksSlice.reducer;
