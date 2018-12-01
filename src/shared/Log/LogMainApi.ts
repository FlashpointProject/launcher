import { ipcMain, IpcMessageEvent } from 'electron';
import { LogChannel } from './LogCommon';

type SendFunc = (channel: string , ...rest: any[]) => boolean;

/** API for the log used by the main process */
export class LogMainApi {
  private entries: string[] = [];
  /** Function that sends a message to the renderer through the IPC */
  private sendToRenderer: SendFunc;

  constructor(sendToRenderer: SendFunc) {
    this.sendToRenderer = sendToRenderer;
    this.onAddEntry = this.onAddEntry.bind(this);
    this.onRefreshEntries = this.onRefreshEntries.bind(this);
  }

  bindListeners() {
    ipcMain.on(LogChannel.addEntry, this.onAddEntry);
    ipcMain.on(LogChannel.refreshEntries, this.onRefreshEntries);
  }

  unbinbListeners() {
    ipcMain.removeListener(LogChannel.addEntry, this.onAddEntry);
    ipcMain.removeListener(LogChannel.refreshEntries, this.onRefreshEntries);
  }

  public addEntry(data: string) {
    // Format entry
    const entry = `[${formatTime(new Date())}] ${data}`;
    // Add entry
    this.entries.push(entry);
    // Send the entry to the renderer
    this.sendToRenderer(
      LogChannel.refreshEntriesReply,
      this.entries.length - 1,
      [ entry ]
    );
  }

  private onAddEntry(event: IpcMessageEvent, data: string, msgId?: number) {
    this.addEntry(data);
    // Reply if it's a tracked message
    if (msgId !== undefined) {
      event.sender.send(LogChannel.addEntryReply, msgId);
    }
  }

  private onRefreshEntries(event: IpcMessageEvent, length: number) {
    event.sender.send(
      LogChannel.refreshEntriesReply,
      length,
      this.entries.slice(length)
    );
  }
}

/** Formats a date to a string in the format HH:MM:SS */
function formatTime(date: Date): string {
  return (
    ('0'+date.getHours()  ).slice(-2)+':'+
    ('0'+date.getMinutes()).slice(-2)+':'+
    ('0'+date.getSeconds()).slice(-2)
  );
}
