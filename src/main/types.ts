export type InitArgs = Partial<{
  // Main mode
  'connect-remote': string;
  'host-remote': boolean;
  'back-only': boolean;

  // Browser mode
  /** If the application should start in "browser mode". */
  'browser_mode': boolean;
  /** URL that browser mode should open */
  'browser_url': string;
  /** Desired width of the window. */
  'width': number;
  /** Desired height of the window. */
  'height': number;
  /** Filename of the flash plugin file to use (without the file extension). */
  'plugin': string;
  /** Whether to enable verbose printing */
  'verbose': boolean;
}>;

export type Init = {
  args: InitArgs;
  rest: string;
}
