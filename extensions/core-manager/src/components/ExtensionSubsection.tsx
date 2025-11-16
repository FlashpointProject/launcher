import { DropdownStringRowProps } from 'flashpoint-launcher-renderer';
import { CheckBox, Dropdown, DropdownStringRow, SimpleButton } from 'flashpoint-launcher-renderer-ext/components';
import { useAppSelector } from 'flashpoint-launcher-renderer-ext/hooks';
import { getExtensionFileURL, runCommand, setExtensionEnabled } from 'flashpoint-launcher-renderer-ext/utils';
import { useEffect, useState } from 'react';
import { DownloadExtCommand, UninstallExtCommand } from '../commands';
import { loadExtIndexUrl, ManagerExtensionInfo, ManagerExtensionRemoteInfo } from '../extensionLoader';
import { selectRepoUrls } from '../select';

export type ExtensionRowProps = {
  ext: ManagerExtensionInfo;
  index: number;
  disabled: boolean;
}

export function ExtensionSubsection() {
  const [remoteExtensions, setRemoteExtensions] = useState<ManagerExtensionRemoteInfo[]>([]);
  const installedExtensions = useAppSelector(state => state.main.extensions);
  const repoUrlsRaw = useAppSelector(selectRepoUrls);
  console.log(installedExtensions);
  const disabledExtensions = useAppSelector(state => state.preferences.disabledExtensions);

  useEffect(() => {
    const repoUrls = repoUrlsRaw
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    Promise.all(repoUrls.map(loadExtIndexUrl))
    .then((responses) => {
      const data = responses.reduce((prev, cur) => prev.concat(cur), []);
      setRemoteExtensions(data);
    });
  }, [repoUrlsRaw]);

  const extensionList: ManagerExtensionInfo[] = installedExtensions.map(ext => {
    return {
      id: ext.id,
      local: {
        title: ext.displayName || ext.name,
        author: ext.author,
        description: ext.description || 'No Description',
        installedVersion: ext.version,
        iconUrl: ext.icon ? getExtensionFileURL(ext.id, ext.icon) : undefined,
      }
    } satisfies ManagerExtensionInfo;
  });

  for (const ext of remoteExtensions) {
    const existingIdx = extensionList.findIndex(e => e.id === ext.id);
    if (existingIdx === -1) {
      extensionList.push({
        id: ext.id,
        remote: ext
      });
    } else {
      extensionList[existingIdx].remote = ext;
    }
  }

  extensionList.sort((a, b) => (a.local?.title || a.remote?.title || '???').localeCompare(b.local?.title || b.remote?.title || '???'));

  return <div className='manager-page-subsection'>
    <div className='manager-page-subsection-header'>Extensions</div>
    <div className='manager-page-subsection-list simple-scroll'>
      { extensionList.length > 0 ? extensionList.map((ext, index) => {
        return (
          <ExtensionRow
            ext={ext}
            index={index}
            disabled={disabledExtensions.includes(ext.id)}/>
        );
      }) : <div>Loading...</div>}
    </div>
  </div>;
}

export function ExtensionRow({ ext, disabled, index }: ExtensionRowProps) {
  const [userSelectedVersion, setUserSelectedVersion] = useState<string>();
  const [busy, setBusy] = useState(false);
  const enabled = !disabled;
  let rowClassName = 'manager-extension-row';
  if (index % 2 === 0) { rowClassName += ' manager-extension-row--even'; }

  const selectedVersion = (userSelectedVersion && ext.remote?.availableVersions.includes(userSelectedVersion)) ?
    userSelectedVersion :
    (ext.local?.installedVersion || ext.remote?.newestVersion || '???');

  const { title, description, iconUrl } = getExtDetails(ext);

  return <div className={rowClassName}>
    <div className='manager-extension-row-icon'>
      { iconUrl && (
        <img src={iconUrl}/>
      ) }
    </div>
    <div className='manager-extension-row-content'>
      <div className='manager-extension-row-top'>
        <div className='manager-extension-row-title'>{title} - {`${ext.id}`}</div>
        { !busy && (
          <>
            { ext.local && (
              <CheckBox
                onToggle={() => setExtensionEnabled(ext.id, !enabled)}
                checked={enabled}/>
            )}
          </>
        )}
      </div>
      <div className='manager-extension-row-inner'>
        <div>{description}</div>
        { !busy ? (
          <div className='manager-extension-row-buttons'>
            { ext.remote && (
              <Dropdown<DropdownStringRowProps>
                text={`Ver: ${selectedVersion}`}
                rowCount={ext.remote.availableVersions.length}
                rowProps={{
                  items: ext.remote.availableVersions,
                  onSelect: (index) => setUserSelectedVersion(ext.remote!.availableVersions[index])
                }}
                rowRenderer={DropdownStringRow}
              />
            )}
            { ext.local && (
              <SimpleButton value={'Remove'} onClick={() => {
                setBusy(true);
                runCommand(UninstallExtCommand, ext.id)
                .catch((error) => {
                  const errorString =  `Failed to uninstall extension: ${error}`;
                  alert(errorString);
                  log.error('Manager', errorString);
                })
                .finally(() => setBusy(false));
              }}/>
            )}
            { ext.remote !== undefined && (
              <SimpleButton value={ext.local ? 'Update' : 'Install'} onClick={() => {
                setBusy(true);
                runCommand(DownloadExtCommand, ext.id, ext.remote!.getDownloadUrl(selectedVersion))
                .catch((error) => {
                  const errorString =  `Failed to download and install extension: ${error}`;
                  alert(errorString);
                  log.error('Manager', errorString);
                })
                .finally(() => setBusy(false));
              }}/>
            )}
          </div>
        ) : <div>Busy...</div> }
      </div>
    </div>
  </div>;
}

type ExtDetails = {
  author: string,
  title: string;
  description: string;
  iconUrl?: string;
}

function getExtDetails(ext: ManagerExtensionInfo): ExtDetails {
  return {
    author: ext.remote?.author || ext.local?.author || '???',
    title: ext.remote?.title || ext.local?.title || '???',
    description: ext.remote?.description || ext.local?.description || '???',
    iconUrl: ext.local?.iconUrl || ext.remote?.iconUrl,
  };
}
