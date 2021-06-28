import { ILogEntry, LogLevel } from '@shared/Log/interface';
import { EventQueue } from './EventQueue';
import * as fs from 'fs';

/**
 * Saves Logged messages to a file
 */
export class LogFile {
  private _queue: EventQueue;
  private _active: boolean;

  constructor(private _filePath: string) {
    this._active = true;
    this._queue = new EventQueue();
  }

  public saveLog(formedLog: ILogEntry): void {
    if (this._active) {
      this._queue.push(() => {
        const date = new Date(formedLog.timestamp);
        const formedText = `[${LogLevel[formedLog.logLevel].padEnd(5)}] [${date.toLocaleString('en-GB')}]: (${formedLog.source}) - ${formedLog.content}\n`;
        fs.appendFile(this._filePath, formedText, err => {
          if (err) {
            // Disable file logger to prevent looping
            this._active = false;
            log.error('Launcher', `Cannot save log file, disabling file save - ${err}`);
          }
        });
      });
    }
  }
}
