import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { useAppSelector } from 'flashpoint-launcher-renderer-ext/hooks';
import { runCommand } from 'flashpoint-launcher-renderer-ext/utils';
import { useEffect, useState } from 'react';
import { ReadInstalledComponents } from '../commands';
import { selectComponentRootUrls } from '../select';

export function ComponentSubsection() {
  const [remoteInfo, setRemoteInfo] = useState<ManagerComponentRemoteInfo[]>([]);
  const [installedInfo, setInstalledInfo] = useState<ManagerInstalledComponentInfo[]>([]);
  const [ready, setReady] = useState(false);
  const remoteComponentUrlsRaw = useAppSelector(selectComponentRootUrls);

  useEffect(() => {
    readInstalledComponents()
    .then((data) => {
      setInstalledInfo(data);
      setReady(true);
    })
  }, []);

  useEffect(() => {
    const repoUrls = remoteComponentUrlsRaw
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    Promise.all(repoUrls.map(getRemoteFromIndex))
    .then((responses) => {
      const data = responses.reduce((prev, cur) => prev.concat(cur), []);
      setRemoteInfo(data);
    })
  }, [remoteComponentUrlsRaw]);

  const componentList: ManagerComponent[] = installedInfo.map(comp => {
    return {
      id: comp.id,
      installed: comp,
      canUpdate: false,
      updateDiff: 0
    }
  });
  if (ready) {
    for (const remote of remoteInfo) {
      const existingIdx = componentList.findIndex(c => c.id === c.id);
      if (existingIdx === -1) {
        componentList.push({
          id: remote.id,
          remote,
          canUpdate: true,
          updateDiff: remote.installSize
        });
      } else {
        const comp = componentList[existingIdx];
        comp.remote = remote;
        const installedSize = comp.installed ? comp.installed.size : 0;
        const installedHash = comp.installed ? comp.installed.hash : '';
        if (installedHash.toLowerCase() !== remote.hash.toLowerCase()) {
          comp.canUpdate = true;
          comp.updateDiff = installedSize - remote.installSize;
        }
      }
    }
  }

  return <div className='manager-page-subsection'>
    <div className='manager-page-subsection-header'>Components</div>
    <div className='manager-page-subsection-list simple-scroll'>
      { componentList.length > 0 ? componentList.map((comp, index) => {
        return (
          <ComponentRow
            comp={comp}
            index={index} />
        );
      }) : <div>Loading...</div>}
    </div>
  </div>;
}

function ComponentRow({ comp, index }: ComponentRowProps) {
  return (
    <div className='manager-component-row'>
      {comp.id}
    </div>
  );
}

async function readInstalledComponents(): Promise<ManagerInstalledComponentInfo[]> { 
  return runCommand(ReadInstalledComponents);
}

async function getRemoteFromIndex(indexUrl: string): Promise<ManagerComponentRemoteInfo[]> {
  const components: ManagerComponentRemoteInfo[] = [];
  const parser = new XMLParser({
    ignoreAttributes: false
  });

  const res = await axios.get(indexUrl);
  if (res.status < 300) {
    const data = parser.parse(res.data);

    function processCategory(category: any, parentId: string = '') {
      const categoryId = parentId ? `${parentId}-${category.id}` : category.id;
      
      // Process nested categories
      if (category.category) {
        const categories = Array.isArray(category.category) ? category.category : [category.category];
        categories.forEach((cat: any) => processCategory(cat, categoryId));
      }
      
      // Process components in this category
      if (category.component) {
        const comps = Array.isArray(category.component) ? category.component : [category.component];
        comps.forEach((comp: any) => {
          const componentId = `${categoryId}-${comp.id}`;
          const baseUrl = data.list.url || indexUrl.substring(0, indexUrl.lastIndexOf('/') + 1);
          
          components.push({
            id: componentId,
            title: comp.title || '',
            description: comp.description || '',
            dateModified: comp['date-modified'] || '',
            downloadSize: parseInt(comp['download-size']) || 0,
            installSize: parseInt(comp['install-size']) || 0,
            path: comp.path || '',
            hash: comp.hash || '',
            downloadUrl: `${baseUrl}${componentId}.7z`
          });
        });
      }
    }

    if (data.list && data.list.category) {
      const rootCategories = Array.isArray(data.list.category) ? data.list.category : [data.list.category];
      rootCategories.forEach((cat: any) => processCategory(cat));
    }
  } else {
    throw 'Bad status code: ' + res.status;
  }

  return components;
}

export type ComponentRowProps = {
  comp: ManagerComponent;
  index: number;
}