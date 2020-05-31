import { padStart } from '../Util';
import { ILogEntry } from './interface';

export const timeChars = 11; // "[HH:MM:SS] "
const sourceChars = 19; // "Background Services" (sometimes used with +2 to add the length of ": ")

/** Create a HTML string of a number of entries */
export function stringifyLogEntries(entries: ILogEntry[], filter: { [key: string]: boolean } = {}): string {
  let str = '';
  let prevEntry: ILogEntry = { source: '', content: '', timestamp: 0 };
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    // Temp fix for array gaps
    if (entry) {
      const entryFilter = filter[entry.source];
      if (entryFilter === true || entryFilter === undefined) {
        str += `<span class="log__time-stamp">[${formatTime(new Date(entry.timestamp))}]</span> `;
        if (entry.source) {
          str += (!prevEntry || entry.source !== prevEntry.source) ?
                `<span class="log__source log__source--${getClassModifier(entry.source)}">${padStart(escapeHTML(entry.source), sourceChars)}:</span> ` :
                ' '.repeat(sourceChars + 2);
        }
        str += padLines(escapeHTML(entry.content), timeChars + sourceChars + 2);
        str += '\n';
      }
    }
    prevEntry = entry;
  }
  return str;
}

/** Create a HTML string of a number of entries */
export function stringifyLogEntriesRaw(entries: ILogEntry[], filter: { [key: string]: boolean } = {}): string {
  let str = '';
  let prevEntry: ILogEntry = { source: '', content: '', timestamp: 0 };
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const entryFilter = filter[entry.source];
    if (entryFilter === true || entryFilter === undefined) {
      str += `[${(new Date(entry.timestamp)).toLocaleString()}] `;
      if (entry.source) {
        str += (entry.source !== prevEntry.source) ?
              `${padStart(escapeHTML(entry.source), sourceChars)} | ` :
              ' '.repeat(sourceChars + 2);
      }
      str += padLines(entry.content, timeChars + sourceChars + 2);
      str += '\n';
    }
    prevEntry = entry;
  }
  return str;
}

/** Formats a date to a string in the format "HH:MM:SS" */
export function formatTime(date: Date): string {
  return (
    ('0'+date.getHours()  ).slice(-2)+':'+
    ('0'+date.getMinutes()).slice(-2)+':'+
    ('0'+date.getSeconds()).slice(-2)
  );
}

/** Mak a string safe to use as HTML content (only safe if used as "text" between tags, not inside a tag) */
export function escapeHTML(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Create a CSS class "modifier" name from the name of a log entry source
 * (it just makes it lower-case, only alphabetical characters and replaces all spaces with "-")
 */
function getClassModifier(source: string): string {
  return (
    source
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^a-z-]/gi, '') // (Only allow a-z and "-")
  );
}

/** Pad all lines (except for the first one) by a number of spaces */
export function padLines(text: string, padding: number): string {
  return text.replace(/\n/g, '\n'+' '.repeat(padding));
}
