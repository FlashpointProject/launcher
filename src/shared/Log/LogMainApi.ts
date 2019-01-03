import { ipcMain, IpcMessageEvent } from 'electron';
import { LogChannel } from './LogCommon';
import { ILogEntry, ILogPreEntry } from './interface';
import { deepCopy } from '../Util';

type SendFunc = (channel: string , ...rest: any[]) => boolean;

/** API for the log used by the main process */
export class LogMainApi {
  private entries: ILogEntry[] = [];
  /** Function that sends a message to the renderer through the IPC */
  private sendToRenderer: SendFunc;

  constructor(sendToRenderer: SendFunc) {
    this.sendToRenderer = sendToRenderer;
  }

  bindListeners() {
    ipcMain.on(LogChannel.addEntry, this.onAddEntry);
    ipcMain.on(LogChannel.refreshEntries, this.onRefreshEntries);
    ipcMain.on(LogChannel.removeEntries, this.onRemoveEntries);
  }

  unbindListeners() {
    ipcMain.removeListener(LogChannel.addEntry, this.onAddEntry);
    ipcMain.removeListener(LogChannel.refreshEntries, this.onRefreshEntries);
    ipcMain.removeListener(LogChannel.removeEntries, this.onRemoveEntries);
  }

  public addEntry(preEntry: ILogPreEntry) {
    // Format entry
    const entry = Object.assign(
      deepCopy(preEntry),
      { timestamp: Date.now() }
    );
    // Add entry
    this.entries.push(entry);
    // Send the entry to the renderer
    this.sendToRenderer(
      LogChannel.refreshEntriesReply,
      this.entries.length - 1,
      [ entry ]
    );
  }

  private onAddEntry = (event: IpcMessageEvent, entry: ILogPreEntry, msgId?: number) => {
    this.addEntry(entry);
    // Reply if it's a tracked message
    if (msgId !== undefined) {
      event.sender.send(LogChannel.addEntryReply, msgId);
    }
  }

  private onRefreshEntries = (event: IpcMessageEvent, length: number) => {
    event.sender.send(
      LogChannel.refreshEntriesReply,
      length,
      this.entries.slice(length)
    );
  }

  private onRemoveEntries = (event: IpcMessageEvent, first: number, last: number) => {
    // Remove the entries
    this.entries.splice(first, last);
    // Respond
    event.sender.send(
      LogChannel.removeEntriesReply,
      first,
      last
    );
  }
}
