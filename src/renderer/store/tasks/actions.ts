import { Task } from '@shared/interfaces';
import { action } from 'typesafe-actions';
import { TasksActions } from './types';

export const addTask = (task: Task) => action(TasksActions.ADD_TASK, task);
export const setTask = (taskId: string, taskData: Partial<Task>) => action(TasksActions.SET_TASK, { taskId, taskData });
