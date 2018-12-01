import { ipcRenderer, IpcMessageEvent } from 'electron';
import { EventEmitter } from 'events';
import { LogChannel } from './LogCommon';

export declare interface LogRendererApi {
  /** @TODO Write this comment */
  on(event: 'change', listener: (log: this) => void): this;
  emit(event: 'change', log: this): boolean;
}

/** API for the log used by the renderer process */
export class LogRendererApi extends EventEmitter {
  public entries: string[] = [];
  private _nextAddEntryMsgId: number = 0;

  constructor() {
    super();
    this.onRefreshEntries = this.onRefreshEntries.bind(this);
  }

  bindListeners() {
    ipcRenderer.on(LogChannel.refreshEntriesReply, this.onRefreshEntries);
  }

  unbinbListeners() {
    ipcRenderer.removeListener(LogChannel.refreshEntriesReply, this.onRefreshEntries);
  }
  
  public addEntry(data: string): void {
    // Send the entry data (& message id)
    ipcRenderer.send(LogChannel.addEntry, data);
  }
  
  public addEntryTracked(data: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      // Pick a unique id for this message
      const sentMsgId = this._nextAddEntryMsgId++;
      // Send the entry data (& message id)
      ipcRenderer.send(LogChannel.addEntry, data, sentMsgId);
      // Add listener for the response
      const listener = (msgId: number) => {
        if (msgId === sentMsgId) {
          console.log('addEntry done!', msgId);
          ipcRenderer.removeListener(LogChannel.addEntryReply, listener);
          resolve(sentMsgId);
        }
      };
      ipcRenderer.on(LogChannel.addEntryReply, listener);
    });
  }

  public refreshEntries(): void {
    ipcRenderer.send(LogChannel.refreshEntries, this.entries.length);
  }

  private onRefreshEntries(event: IpcMessageEvent, start: number, entries: string[]): void {
    // Add new entries
    for (let i = 0; i <= entries.length; i++) {
      this.entries[start + i] = entries[i];
    }
    // Emit event
    this.emit('change', this);
  }
}
