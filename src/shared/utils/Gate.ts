import { EventEmitter } from 'events';

export class Gate {
  public isOpen: boolean;
  private _listeners: EventEmitter;

  constructor() {
    this.isOpen = false;
    this._listeners = new EventEmitter();
  }

  async wait(): Promise<void> {
    if (!this.isOpen) {
      return new Promise<void>((resolve) => {
        this._listeners.once('done', resolve);
      });
    }
  }

  open() {
    this.isOpen = true;
    this._listeners.emit('done');
  }
}
