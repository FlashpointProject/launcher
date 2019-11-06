import { ServerResponse } from '../game/interfaces';
import { BackIn } from './types';

export function sendRequest<T>(type: BackIn, data?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    window.External.back.send<ServerResponse>(type, data, response => {
      if (response.data) {
        if (response.data.success) { resolve(response.data.result); }
        else                       { reject(response.data.error);   }
      } else                       { reject(new Error('Response contained no data')); }
    });
  });
}
