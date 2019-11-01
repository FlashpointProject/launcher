export interface LoadPlatformError extends Error {
  /** File path of the platform file the error is related to. */
  filePath: string;
}