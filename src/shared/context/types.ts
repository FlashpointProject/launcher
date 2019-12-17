/** Meta data of a curation. */
export type EditCurationMeta = {
  // Game fields
  title?: string;
  series?: string;
  developer?: string;
  publisher?: string;
  status?: string;
  extreme?: string;
  genre?: string;
  source?: string;
  launchCommand?: string;
  library?: string;
  notes?: string;
  authorNotes?: string;
  platform?: string;
  applicationPath?: string;
  playMode?: string;
  releaseDate?: string;
  version?: string;
  originalDescription?: string;
  language?: string;
}

/** Meta data of an additional application curation. */
export type EditAddAppCurationMeta = {
  heading?: string;
  applicationPath?: string;
  launchCommand?: string;
}
