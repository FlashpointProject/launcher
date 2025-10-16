import { DialogState, DialogStateTemplate } from 'flashpoint-launcher';
import { AppDispatch } from './store/store';
import { uuid } from '@shared/utils/uuid';
import { createDialog } from './store/main/slice';

export function createNewDialog(dispatch: AppDispatch, template: DialogStateTemplate): string {
  const id = uuid();

  dispatch(createDialog({
    id,
    ...template,
  }));

  return id;
}

type DialogStateRes = {
  dialog: DialogState,
  button: number
};

export function resolveNewDialog(dispatch: AppDispatch, template: DialogStateTemplate): Promise<DialogStateRes> {
  const id = uuid();

  dispatch(createDialog({
    id,
    ...template,
  }));
  const response = new Promise<DialogStateRes>((resolve) => {
    window.Shared.dialogResEvent.once(id, (dialog: DialogState, button: number) => {
      resolve({
        dialog,
        button
      });
    });
  });

  return response;
}

