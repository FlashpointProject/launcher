import { ILogEntry } from "./interface";

/** Channel names used by the log api in the Electron IPC */
export enum LogChannel {
  /** Send an entry from the (renderer -> main) */
  addEntry = 'log-add-entry',
  /**
   * Reply from the main, confirming that the entry was added
   * (main -> renderer)
   */
  addEntryReply = 'log-add-entry-reply',

  /**
   * Send a request to get all entries after a specified index
   * (renderer -> main)
  */
  refreshEntries = 'log-refresh-entries',
  /**
   * Reply from the main, contains a number entries and the index they all come after
   * (main -> renderer)
   */
  refreshEntriesReply = 'log-refresh-entries-reply',
}

/** Create a HTML string of a number of entries */
export function stringifyLogEntries(entries: ILogEntry[]): string {
  let str = '';
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    str += `<span class="log__time-stamp">[${formatTime(new Date(entry.timestamp))}]</span> `;
    if (entry.source) { str += `<span class="log__source log__source--${getClassModifier(entry.source)}">${escapeHTML(entry.source)}:</span> `; }
    str += escapeHTML(entry.content);
    str += '\n';
  }
  return str;
}

/** Formats a date to a string in the format HH:MM:SS */
function formatTime(date: Date): string {
  return (
    ('0'+date.getHours()  ).slice(-2)+':'+
    ('0'+date.getMinutes()).slice(-2)+':'+
    ('0'+date.getSeconds()).slice(-2)
  );
}

function escapeHTML(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * 
 */
function getClassModifier(source: string): string {
  return (
    source
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^a-z\-]/gi, '') // (Only allow a-z and "-")
  );
}
