export type InitArgs = {
  'connect-remote'?: string;
  'host-remote'?: boolean;
  'back-only'?: boolean;
  'browser-mode-url'?: string;
  'browser-mode-host'?: string;
  'browser-mode'?: boolean;
  'browser-mode-port'?: string; // Keep as string from parseArgs
  'logger'?: boolean;
  'width'?: string; // Keep as string from parseArgs
  'height'?: string; // Keep as string from parseArgs
  'plugin'?: string;
  'verbose'?: boolean;
};

export type Init = {
  args: InitArgs;
  rest: string;
  protocol?: string;
}
