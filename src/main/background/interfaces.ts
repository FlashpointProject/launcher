export interface IBackProcessInfoFile {
  redirector?: IBackProcessInfo;
  fiddler?: IBackProcessInfo;
  server?: IBackProcessInfo;
  /** Processes to run before the launcher starts */
  start: IBackProcessInfo[];
  /** Processes to run when the launcher closes */
  stop: IBackProcessInfo[];
}

export interface IBackProcessInfo {
  /** Path of the file (relative to the Flashpoint root) */
  path: string;
  /** Name of the file to execute */
  filename: string;
  /** Arguments to pass to the process */
  arguments: string[];
}
