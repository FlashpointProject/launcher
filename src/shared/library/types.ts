export type GameLibraryFile = {
  libraries: GameLibraryFileItem[];
};

export type GameLibraryFileItem = {
  /** Title of the library */
  title: string;
  /** Used to create the URL to the library (this must be unique) */
  route: string;
  /**
   * Prefix of the platforms that are part of this library
   * (This will be ignored if "default" is set to true)
   */
  prefix?: string;
  /**
   * If this library should contain all platforms that doesn't fit any prefix
   * (No more than one library should be default)
   */
  default?: boolean;
};
