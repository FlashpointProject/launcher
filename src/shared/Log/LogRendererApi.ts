import { IpcMessageEvent, ipcRenderer } from 'electron';
import { EventEmitter } from 'events';
import { ILogEntry, ILogPreEntry } from './interface';
import { LogChannel, stringifyLogEntries } from './LogCommon';

export declare interface LogRendererApi {
  /** @TODO Write this comment */
  on(event: 'change', listener: (log: this) => void): this;
  emit(event: 'change', log: this): boolean;
}

/** API for the log used by the renderer process */
export class LogRendererApi extends EventEmitter {
  public entries: ILogEntry[] = [];
  private _nextAddEntryMsgId: number = 0;

  constructor() {
    super();
  }

  bindListeners() {
    ipcRenderer.on(LogChannel.refreshEntriesReply, this.onRefreshEntries);
    ipcRenderer.on(LogChannel.removeEntriesReply, this.onRemoveEntries);
  }

  unbindListeners() {
    ipcRenderer.removeListener(LogChannel.refreshEntriesReply, this.onRefreshEntries);
    ipcRenderer.removeListener(LogChannel.removeEntriesReply, this.onRemoveEntries);
  }
  
  public addEntry(preEntry: ILogPreEntry): void {
    // Send the entry data (& message id)
    ipcRenderer.send(LogChannel.addEntry, preEntry);
  }
  
  public addEntryTracked(preEntry: ILogPreEntry): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      // Pick a unique id for this message
      const sentMsgId = this._nextAddEntryMsgId++;
      // Send the entry data (& message id)
      ipcRenderer.send(LogChannel.addEntry, preEntry, sentMsgId);
      // Add listener for the response
      const listener = (msgId: number) => {
        if (msgId === sentMsgId) {
          ipcRenderer.removeListener(LogChannel.addEntryReply, listener);
          resolve(sentMsgId);
        }
      };
      ipcRenderer.on(LogChannel.addEntryReply, listener);
    });
  }

  public refreshEntries(): void {
    ipcRenderer.send(LogChannel.refreshEntries, 0);
  }
  
  public clearEntries(): void {
    // (Remove all entries between index 0 and the index of the latest entry)
    ipcRenderer.send(LogChannel.removeEntries, 0, this.entries.length);
  }

  public stringifyEntries(): string {
    return stringifyLogEntries(this.entries);
  }

  private onRefreshEntries = (event: IpcMessageEvent, start: number, entries: ILogEntry[]): void => {
    // Add new entries
    for (let i = 0; i < entries.length; i++) {
      this.entries[start + i] = entries[i];
    }
    // Emit event
    this.emit('change', this);
  }

  private onRemoveEntries = (event: IpcMessageEvent, first: number, last: number): void => {
    // Remove entries
    this.entries.splice(first, last);
    // Emit event
    this.emit('change', this);
  }
}
