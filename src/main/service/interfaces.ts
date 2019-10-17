import { IBackProcessInfo } from '../../shared/service/interfaces';

export type ServiceFileData = {
  redirector?: IBackProcessInfo;
  fiddler?: IBackProcessInfo;
  server?: IBackProcessInfo;
  /** Processes to run before the launcher starts. */
  start: IBackProcessInfo[];
  /** Processes to run when the launcher closes. */
  stop: IBackProcessInfo[];
};
