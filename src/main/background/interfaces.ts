import { IBackProcessInfo } from '../../shared/background/interfaces';

export interface IBackProcessInfoFile {
  redirector?: IBackProcessInfo;
  fiddler?: IBackProcessInfo;
  server?: IBackProcessInfo;
  /** Processes to run before the launcher starts */
  start: IBackProcessInfo[];
  /** Processes to run when the launcher closes */
  stop: IBackProcessInfo[];
}
