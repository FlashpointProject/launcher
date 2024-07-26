/** Renderer side dialog response emitter (event code = dialog id) */
import { EventEmitter } from 'stream';

export const dialogResEvent: EventEmitter = new EventEmitter();
