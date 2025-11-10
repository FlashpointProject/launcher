import { LeftSidebarItem } from 'flashpoint-launcher-renderer';
import { LeftSidebar, StateWrapper } from 'flashpoint-launcher-renderer-ext/components';
import { useState } from 'react';
import { ExtensionSubsection } from './ExtensionSubsection';

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
          <ExtensionSubsection/>
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

function SubsectionSupportPacks() {
  return <div>Support Packs</div>;

}

function SubsectionUtilities() {
  return <div>Utilities</div>;
}
