import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { SimpleButton } from 'flashpoint-launcher-renderer-ext/components';
import { useAppSelector } from 'flashpoint-launcher-renderer-ext/hooks';
import { runCommand } from 'flashpoint-launcher-renderer-ext/utils';
import { useEffect, useState } from 'react';
import { ReadInstalledComponents, UpdateComponentCommand } from '../commands';
import { selectComponentRootUrls } from '../select';

export function ComponentSubsection() {
  const [remoteInfo, setRemoteInfo] = useState<ManagerComponentRemoteInfo[]>([]);
  const [installedInfo, setInstalledInfo] = useState<ManagerInstalledComponentInfo[]>([]);
  const remoteComponentUrlsRaw = useAppSelector(selectComponentRootUrls);

  useEffect(() => {
    readInstalledComponents()
    .then((data) => {
      setInstalledInfo(data);
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
  for (const remote of remoteInfo) {
    const existingIdx = componentList.findIndex(c => c.id === remote.id);
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
  const [busy, setBusy] = useState(false);
  console.log(comp);

  const title = comp.remote ? comp.remote.title : comp.id;

  let rowClassName = 'manager-extension-row';
  if (index % 2 === 0) { rowClassName += ' manager-extension-row--even'; }
  
  return (
    <div className={rowClassName}>
      <div className='manager-extension-row-content'>
        <div className='manager-extension-row-top'>
          <div className='manager-extension-row-title'>{title}</div>
        </div>
        <div className='manager-extension-row-inner'>
          <div>{comp.remote?.description}</div>
          <div className='manager-extension-row-buttons'>
          { comp.canUpdate && (
            <SimpleButton
              value={comp.installed ? 'Update' : 'Install'}
              onClick={() => {
                setBusy(true);
                runCommand(UpdateComponentCommand, comp)
                .catch((error) => {
                  const errorString =  `Failed to install component: ${error}`;
                  alert(errorString);
                  log.error('Manager', errorString);
                })
              }} /> 
            )}
            { (!comp.canUpdate && comp.remote !== undefined) && (
              <div><i>Up to Date</i></div>
            ) }
          </div>
        </div>
      </div>
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
    console.log(data);

    function processCategory(category: any, parentId: string = '') {
      const categoryId = parentId ? `${parentId}-${category['@_id']}` : category['@_id'];
      
      // Process nested categories
      if (category.category) {
        const categories = Array.isArray(category.category) ? category.category : [category.category];
        categories.forEach((cat: any) => processCategory(cat, categoryId));
      }
      
      // Process components in this category
      if (category.component) {
        const comps = Array.isArray(category.component) ? category.component : [category.component];
        comps.forEach((comp: any) => {
          const componentId = `${categoryId}-${comp['@_id']}`;
          const baseUrl = data.list['@_url'] || indexUrl.substring(0, indexUrl.lastIndexOf('/') + 1);
          
          components.push({
            id: componentId,
            title: comp['@_title'] || '',
            description: comp['@_description'] || '',
            dateModified: comp['@_date-modified'] || '',
            downloadSize: parseInt(comp['@_download-size']) || 0,
            installSize: parseInt(comp['@_install-size']) || 0,
            path: comp['@_path'] || '',
            hash: comp['@_hash'] || '',
            downloadUrl: `${baseUrl}${componentId}.zip`
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

  console.log(components);

  return components;
}

export type ComponentRowProps = {
  comp: ManagerComponent;
  index: number;
}