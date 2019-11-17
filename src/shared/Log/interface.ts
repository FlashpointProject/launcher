/** A log entry _before_ it is added to the main log */
export type ILogPreEntry = {
  /** Name of the source of the log entry (name of what added the log entry) */
  source: string;
  /** Content of the log entry */
  content: string;
}

/** A log entry from the main log */
export type ILogEntry = ILogPreEntry & {
  /** Timestamp of when the entry was added to the main's log */
  timestamp: number;
}
