import { Task } from '@shared/interfaces';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: Task[] = [];

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    addTask(state: Task[], { payload }: PayloadAction<Task>) {
      const taskIdx = state.findIndex(t => t.id === payload.id);
      if (taskIdx > -1) {
        log.error('Launcher', 'Illegal Action: addTask - ID Collision');
        return;
      }
      state.push(payload);
    },
    setTask(state: Task[], { payload }: PayloadAction<Partial<Task>>) {
      if (payload.id) {
        const taskIdx = state.findIndex(t => t.id === payload.id);
        if (taskIdx > -1) {
          state[taskIdx] = {
            ...state[taskIdx],
            ...payload,
          };
        }
      }
    }
  },
});

export const { actions: tasksActions } = tasksSlice;
export const { addTask, setTask } = tasksSlice.actions;
export default tasksSlice.reducer;
