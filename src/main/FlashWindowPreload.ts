import { FlashInitChannel, FlashInitData } from '@shared/IPC';
import * as electron from 'electron';

const data: FlashInitData = electron.ipcRenderer.sendSync(FlashInitChannel);

document.addEventListener('DOMContentLoaded', () => {
  const object = document.createElement('object');

  object.setAttribute('type', 'application/x-shockwave-flash');
  object.setAttribute('data', data.entry);

  object.appendChild(createParam('allowscriptaccess', 'always'));
  object.appendChild(createParam('allowfullscreen', 'true'));
  object.appendChild(createParam('allowfullscreeninteractive', 'true'));
  object.appendChild(createParam('allownetworkingmode', 'all'));
  object.appendChild(createParam('wmode', 'direct'));

  document.body.appendChild(object);
});

function createParam(name: string, value: string): HTMLParamElement {
  const param = document.createElement('param');
  param.setAttribute('name', name);
  param.setAttribute('value', value);
  return param;
}
