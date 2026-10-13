import { BackClient } from '@back/SocketServer';
import { BackState } from '@back/types';
import { BackOut } from '@shared/back/types';
import { DialogResponse, DialogState, DialogStateTemplate } from 'flashpoint-launcher';
import { uuid } from './uuid';

export function createNewDialog(state: BackState, template: DialogStateTemplate, client?: BackClient): string {
  const dialog: DialogState = {
    ...template,
    id: uuid()
  };
  if (client) {
    state.socketServer.send(client, BackOut.NEW_DIALOG, dialog);
  } else {
    state.socketServer.broadcast(BackOut.NEW_DIALOG, dialog);
  }
  return dialog.id;
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
