import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { useAppSelector } from 'flashpoint-launcher-renderer-ext/hooks';
import fs from 'fs';
import path from 'path';
import { useEffect, useState } from 'react';
import { selectComponentRootUrls } from '../select';

export function ComponentSubsection() {
  const [remoteInfo, setRemoteInfo] = useState<ManagerComponentRemoteInfo[]>([]);
  const [installedInfo, setInstalledInfo] = useState<Record<string, ManagerInstalledComponentInfo>>({});
  const [ready, setReady] = useState(false);
  const componentsPath = useAppSelector(state => path.join(state.main.config.flashpointPath, 'Components'));
  const remoteComponentUrlsRaw = useAppSelector(selectComponentRootUrls);

  useEffect(() => {
    readInstalledComponents(componentsPath)
    .then((data) => {
      setInstalledInfo(data);
      setReady(true);
    })
  }, [componentsPath]);

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

  const componentList: Record<string, ManagerComponent> = {};
  if (ready) {
    for (const key in installedInfo) {
      componentList[key] = {
        installed: installedInfo[key],
        canUpdate: false,
        updateDiff: 0,
      };
    }
    for (const remote of remoteInfo) {
      const comp = componentList[remote.id];
      if (comp) {
        comp.remote = remote;
        const installedSize = comp.installed ? comp.installed.size : 0;
        const installedHash = comp.installed ? comp.installed.hash : '';
        if (installedHash.toLowerCase() !== remote.hash.toLowerCase()) {
          comp.canUpdate = true;
          comp.updateDiff = installedSize - remote.installSize;
        }
      } else {
        componentList[remote.id] = {
          remote,
          canUpdate: true,
          updateDiff: remote.installSize
        }
      }
    }
  }

}

async function readInstalledComponents(componentsPath: string): Promise<Record<string, ManagerInstalledComponentInfo>> { 
  await fs.promises.mkdir(componentsPath, { recursive: true });
  const files = await fs.promises.readdir(componentsPath);
  const components: Record<string, ManagerInstalledComponentInfo> = {};
  for (const file of files) {
    try {
      const filePath = path.join(componentsPath, file);
      const content = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
      const lines = content.split('\n');
      const [hash, size] = lines[0].split(' ');
      if (hash.length !== 8) {
        throw 'Hash length invalid';
      }
      components[file] = {
        size: parseInt(size),
        hash,
        fileCount: lines.length - 1
      };
    } catch (err) {
      log.error('Manager', 'Failed to read component: ' + file);
    }
  }
  return components;
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

type ManagerComponent = {
  installed?: ManagerInstalledComponentInfo;
  remote?: ManagerComponentRemoteInfo;
  canUpdate: boolean;
  updateDiff: number;
}

type ManagerInstalledComponentInfo = {
  size: number;
  hash: string;
  fileCount: number;
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