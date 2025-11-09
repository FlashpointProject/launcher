import { LeftSidebarItem } from 'flashpoint-launcher-renderer';
import { CheckBox, LeftSidebar, SimpleButton, StateWrapper } from 'flashpoint-launcher-renderer-ext/components';
import { useAppSelector } from 'flashpoint-launcher-renderer-ext/hooks';
import { setExtensionEnabled } from 'flashpoint-launcher-renderer-ext/utils';
import { useEffect, useState } from 'react';
import { List, RowComponentProps, useDynamicRowHeight } from 'react-window';
import { loadExtRepoRaw, ManagerExtensionInfo } from '../extensionLoader';

type ManagerPageSubsection = 'extensions' | 'support-packs' | 'utilities';

export default function ManagerPage() {
  const [subsection, setSubsection] = useState<ManagerPageSubsection>('extensions');

  const items: LeftSidebarItem[] = [
    {
      key: 'extensions',
      title: 'Extensions'
    },
    {
      key: 'support-packs',
      title: 'Support Packs'
    }, {
      key: 'utilities',
      title: 'Utilities'
    }
  ];

  return (
    <div className='manager-page'>
      <div className='manager-page-sidebar'>
        <div className='manager-page-sidebar-header'>Subsection</div>
        <div className='manager-page-sidebar-list'>
          <LeftSidebar
            items={items}
            selected={subsection}
            onSelect={(key) => setSubsection(key as ManagerPageSubsection)}
            rowHeight={24}/>
        </div>
      </div>
      <div className='manager-page-subsection-wrapper'>
        <StateWrapper show={subsection === 'extensions'}>
          <SubsectionExtensions/>
        </StateWrapper>
        <StateWrapper show={subsection === 'support-packs'}>
          <SubsectionSupportPacks/>
        </StateWrapper>
        <StateWrapper show={subsection === 'utilities'}>
          <SubsectionUtilities/>
        </StateWrapper>
      </div>
    </div>
  );
}

function SubsectionExtensions() {
  const [availableExtensions, setAvailableExtensions] = useState<ManagerExtensionInfo[]>([]);
  const installedExtensions = useAppSelector(state => state.main.extensions);
  const disabledExtensions = useAppSelector(state => state.preferences.disabledExtensions);

  useEffect(() => {
    loadExtRepoRaw('')
    .then((data) => {
      setAvailableExtensions(data);
    });
  });

  const extensionList: ManagerExtensionInfo[] = installedExtensions.map(ext => {
    return {
      id: ext.id,
      title: ext.displayName || ext.name,
      description: ext.description || 'No Description',
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

type ExtensionRowProps = {
  items: ManagerExtensionInfo[];
  disabledExtensions: string[];
}

function ExtensionRow({ items, disabledExtensions, index, style }: RowComponentProps<ExtensionRowProps>) {
  const { id, title, description, installed } = items[index];
  const enabled = !disabledExtensions.includes(id);
  let rowClassName = 'manager-extension-row';
  if (index % 2 === 0) { rowClassName += ' manager-extension-row--even'; }

  return <div className={rowClassName} style={style}>
    <div className='manager-extension-row-top'>
      <div className='manager-extension-row-title'>{title} - {`${id}`}</div>
      { installed && (
        <CheckBox
          onToggle={() => setExtensionEnabled(id, !enabled)}
          checked={enabled}/>
      )}
    </div>
    <div className='manager-extension-row-inner'>
      <div>{description}</div>
      <SimpleButton value={installed ? 'Remove' : 'Install'}/>
    </div>
  </div>;
}

function SubsectionSupportPacks() {
  return <div>Support Packs</div>;

}

function SubsectionUtilities() {
  return <div>Utilities</div>;
}
