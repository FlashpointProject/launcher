import { BackState } from '@back/types';
import { BackOut } from '@shared/back/types';
import { DialogResponse, DialogStateTemplate } from 'flashpoint-launcher';
import { uuid } from './uuid';

export async function createNewDialog(state: BackState, template: DialogStateTemplate): Promise<string> {
  const code = uuid();
  return new Promise<string>((resolve) => {
    state.newDialogEvents.once(code, (dialogId: string) => {
      resolve(dialogId);
    });
    state.socketServer.broadcast(BackOut.NEW_DIALOG, template, code);
  });
}

export async function awaitDialog(state: BackState, dialogId: string): Promise<DialogResponse> {
  return new Promise<DialogResponse>((resolve) => {
    state.resolveDialogEvents.once(dialogId, (dialog, buttonIdx) => {
      resolve({
        dialog,
        buttonIdx
      });
    });
  });
}
