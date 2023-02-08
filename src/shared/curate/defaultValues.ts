/** Container of all default values for curation game meta. */
export type GameMetaDefaults = {
  /** Default application paths (ordered after each platform). */
  appPaths: { [platform: string]: string; };
  language: string;
  platform: string;
  playMode: string;
  status: string;
  library: string;
};
