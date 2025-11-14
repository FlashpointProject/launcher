import axios from 'axios';

export type ManagerExtensionInfo = {
  id: string;
  title: string;
  description: string;
  iconUrl?: string;
  newestVersion: string;
  availableVersions: string[];
  getDownloadUrl?: (version: string) => string,
  installed: boolean;
}

export async function loadExtIndexUrl(url: string): Promise<ManagerExtensionInfo[]> {
  const res = await axios.get(url);
  if (res.status >= 400) {
    throw res.statusText;
  }

  return res.data.map((ext: IndexExtensionInfo): ManagerExtensionInfo => ({
    id: ext.id,
    title: ext.title,
    description: ext.description,
    iconUrl: ext.iconUrl,
    newestVersion: ext.newestVersion,
    getDownloadUrl: (ext.repository && ext.artifactName) ? (version: string) => {
      return `${ext.repository}/releases/download/${version}/${ext.artifactName}`;
    } : undefined,
    availableVersions: ext.availableVersions,
    installed: false // Default to false, would need to check against installed extensions
  }));
}

export async function loadExtRepoRaw(url: string): Promise<ManagerExtensionInfo[]> {
  const mockData: ManagerExtensionInfo[] = [
    {
      id: 'mock-one',
      title: 'Mock Extension One',
      description: 'Mocked Extension',
      newestVersion: '',
      availableVersions: [],
      installed: false,
    },
    {
      id: 'mock-two',
      title: 'Mock Extension Two',
      description: 'Mocked Extension',
      newestVersion: '',
      availableVersions: [],
      installed: false,
    },
    {
      id: 'mock-three',
      title: 'Mock Extension Three',
      description: 'Mocked Extension',
      newestVersion: '',
      availableVersions: [],
      installed: false,
    },
    {
      id: 'mock-four',
      title: 'Mock Extension Four',
      description: 'Mocked Extension',
      newestVersion: '',
      availableVersions: [],
      installed: false,
    },
    {
      id: 'mock-five',
      title: 'Mock Extension Five',
      description: 'Mocked Extension',
      newestVersion: '',
      availableVersions: [],
      installed: false,
    },
  ];

  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockData);
    }, 500);
  });
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
