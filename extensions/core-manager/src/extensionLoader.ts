export type ManagerExtensionInfo = {
  id: string;
  title: string;
  description: string;
  installed: boolean;
}

export async function loadExtRepoRaw(url: string): Promise<ManagerExtensionInfo[]> {
  const mockData: ManagerExtensionInfo[] = [
    {
      id: 'mock-one',
      title: 'Mock Extension One',
      description: 'Mocked Extension',
      installed: false,
    },
    {
      id: 'mock-two',
      title: 'Mock Extension Two',
      description: 'Mocked Extension',
      installed: false,
    },
    {
      id: 'mock-three',
      title: 'Mock Extension Three',
      description: 'Mocked Extension',
      installed: false,
    },
    {
      id: 'mock-four',
      title: 'Mock Extension Four',
      description: 'Mocked Extension',
      installed: false,
    },
    {
      id: 'mock-five',
      title: 'Mock Extension Five',
      description: 'Mocked Extension',
      installed: false,
    }
  ];

  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockData);
    }, 500);
  });
}
