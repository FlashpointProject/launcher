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
