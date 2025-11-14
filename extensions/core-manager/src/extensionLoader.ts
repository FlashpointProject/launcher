import axios from 'axios';

type ManagerExtensionCommonInfo = {
  title: string;
  author: string;
  description: string;
  iconUrl?: string;
}

export type ManagerExtensionRemoteInfo = ManagerExtensionCommonInfo & {
  id: string;
  newestVersion: string;
  availableVersions: string[];
  getDownloadUrl: (version: string) => string,
}

export type ManagerExtensionLocalInfo = ManagerExtensionCommonInfo & {
  installedVersion: string;
};

export type ManagerExtensionInfo = {
  id: string;
  local?: ManagerExtensionLocalInfo;
  remote?: ManagerExtensionRemoteInfo;
}

export async function loadExtIndexUrl(url: string): Promise<ManagerExtensionRemoteInfo[]> {
  const res = await axios.get(url);
  if (res.status >= 400) {
    throw res.statusText;
  }

  return res.data.map((ext: IndexExtensionInfo): ManagerExtensionRemoteInfo => ({
    id: ext.id,
    title: ext.title,
    author: ext.author,
    description: ext.description,
    iconUrl: ext.iconUrl,
    newestVersion: ext.newestVersion,
    getDownloadUrl: (version: string) => {
      return `${ext.repository}/releases/download/${version}/${ext.artifactName}`;
    },
    availableVersions: ext.availableVersions,
  }));
}

type IndexExtPackageInfo = {
  id: string;
  author: string;
  title: string;
  description: string;
  newestVersion: string;
  repository: string;
  iconUrl?: string;
  artifactName: string;
}

type IndexExtensionInfo = IndexExtPackageInfo & {
  availableVersions: string[];
}
