type ManagerComponent = {
  id: string;
  installed?: ManagerInstalledComponentInfo;
  remote?: ManagerComponentRemoteInfo;
  canUpdate: boolean;
  updateDiff: number;
}

type ManagerInstalledComponentInfo = {
  id: string;
  size: number;
  hash: string;
  fileCount: number;
  files: string[];
}

type ManagerComponentRemoteInfo = {
  id: string;
  title: string;
  description: string;
  dateModified: string;
  downloadSize: number;
  installSize: number;
  path: string;
  hash: string;
  downloadUrl: string;
}