export type InitArgs = Partial<{
  // Main mode
  'connect-remote': string;
  'host-remote': boolean;
  'back-only': boolean;

  // Flash mode
  /** If the application should start in "flash" mode. */
  'flash': boolean;
  /** Desired width of the window. */
  'width': number;
  /** Desired height of the window. */
  'height': number;
  /** Filename of the flash plugin file to use (without the file extension). */
  'plugin': string;
}>;

export type Init = {
  args: InitArgs;
  rest: string;
}
