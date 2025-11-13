import { CheckBox, SimpleButton } from 'flashpoint-launcher-renderer-ext/components';
import { useAppSelector } from 'flashpoint-launcher-renderer-ext/hooks';
import { getExtensionFileURL, runCommand, setExtensionEnabled } from 'flashpoint-launcher-renderer-ext/utils';
import { useEffect, useState } from 'react';
import { List, RowComponentProps, useDynamicRowHeight } from 'react-window';
import { DownloadExtCommand, UninstallExtCommand } from '../commands';
import { loadExtIndexUrl, ManagerExtensionInfo } from '../extensionLoader';

export type ExtensionRowProps = {
  items: ManagerExtensionInfo[];
  disabledExtensions: string[];
}

export function ExtensionSubsection() {
  const [availableExtensions, setAvailableExtensions] = useState<ManagerExtensionInfo[]>([]);
  const installedExtensions = useAppSelector(state => state.main.extensions);
  console.log(installedExtensions);
  const disabledExtensions = useAppSelector(state => state.preferences.disabledExtensions);

  useEffect(() => {
    console.log('loading ext');
    loadExtIndexUrl('https://raw.githubusercontent.com/FlashpointProject/FlashpointExtensionIndex/refs/heads/main/extindex.json')
    .then((data) => {
      setAvailableExtensions(data);
    });
  }, []);

  const extensionList: ManagerExtensionInfo[] = installedExtensions.map(ext => {
    return {
      id: ext.id,
      title: ext.displayName || ext.name,
      description: ext.description || 'No Description',
      newestVersion: ext.version,
      iconUrl: ext.icon ? getExtensionFileURL(ext.id, ext.icon) : undefined,
      installed: true
    } satisfies ManagerExtensionInfo;
  });
  for (const ext of availableExtensions) {
    const existingIdx = installedExtensions.findIndex(e => e.id === ext.id);
    if (existingIdx === -1) {
      extensionList.push(ext);
    }
  }

  extensionList.sort((a, b) => a.title.localeCompare(b.title));

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 24
  });

  return <div className='manager-page-subsection'>
    <div className='manager-page-subsection-header'>Extensions</div>
    { extensionList !== undefined ? (
      <List<ExtensionRowProps>
        className='simple-scroll'
        rowComponent={ExtensionRow}
        rowCount={extensionList.length}
        rowProps={{
          items: extensionList,
          disabledExtensions,
        }}
        rowHeight={rowHeight}/>
    ) : (
      <div>Loading...</div>
    )}
  </div>;
}

export function ExtensionRow({ items, disabledExtensions, index, style }: RowComponentProps<ExtensionRowProps>) {
  const { id, title, description, installed, newestVersion, iconUrl, getDownloadUrl } = items[index];
  const [busy, setBusy] = useState(false);
  const canInstall = getDownloadUrl !== undefined;
  const enabled = !disabledExtensions.includes(id);
  let rowClassName = 'manager-extension-row';
  if (index % 2 === 0) { rowClassName += ' manager-extension-row--even'; }

  return <div className={rowClassName} style={style}>
    <div className='manager-extension-row-icon'>
      { iconUrl && (
        <img src={iconUrl}/>
      ) }
    </div>
    <div className='manager-extension-row-content'>
      <div className='manager-extension-row-top'>
        <div className='manager-extension-row-title'>{title} - {`${id}`}</div>
        { !busy && (
          <>
            { installed && (
              <CheckBox
                onToggle={() => setExtensionEnabled(id, !enabled)}
                checked={enabled}/>
            )}
          </>
        )}
      </div>
      <div className='manager-extension-row-inner'>
        <div>{description}</div>
        { !busy ? (
          <>
            { installed && (
              <SimpleButton value={'Remove'} onClick={() => {
                setBusy(true);
                runCommand(UninstallExtCommand, id)
                .catch((error) => {
                  const errorString =  `Failed to uninstall extension: ${error}`;
                  alert(errorString);
                  log.error('Manager', errorString);
                })
                .finally(() => setBusy(false));
              }}/>
            )}
            { canInstall && (
              <SimpleButton value={'Install'} onClick={() => {
                setBusy(true);
                runCommand(DownloadExtCommand, getDownloadUrl(newestVersion))
                .catch((error) => {
                  const errorString =  `Failed to download and install extension: ${error}`;
                  alert(errorString);
                  log.error('Manager', errorString);
                })
                .finally(() => setBusy(false));
              }}/>
            )}
          </>
        ) : <div>Busy...</div> }
      </div>
    </div>
  </div>;
}
