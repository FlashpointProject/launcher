export enum BackIn {
  /** Load the preferences from the file. */
  LOAD_PREFERENCES,
  /** Get the full preferences object. */
  GET_PREFERENCES,
  /** Update any number of preferences. */
  UPDATE_PREFERENCES,
}

export enum BackOut {
  LOAD_PREFERENCES_RESPONSE,
  GET_PREFERENCES_RESPONSE,
  UPDATE_PREFERENCES_RESPONSE,
}

export type BackInitArgs = {
  port: number;
  /** Path to the preferences file. */
  preferencesPath: string;
}
