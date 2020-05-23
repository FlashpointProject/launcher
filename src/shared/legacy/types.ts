
export type Legacy_ErrorCopy = {
  columnNumber?: number;
  fileName?: string;
  lineNumber?: number;
  message: string;
  name: string;
  stack?: string;
}


export type Legacy_LoadPlatformError = Legacy_ErrorCopy & {
  /** File path of the platform file the error is related to. */
  filePath: string;
}