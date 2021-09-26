import {compare} from '@back/util/strings';
import {useMouse} from '@renderer/hooks/useMouse';
import {CurateGroup, CurateState} from '@renderer/store/curate/types';
import {findElementAncestor, getPlatformIconURL} from '@renderer/Util';
import {CurationState} from '@shared/curate/types';
import * as React from 'react';
import {OpenIcon} from '@renderer/components/OpenIcon';
import {FloatingContainer} from '@renderer/components/FloatingContainer';
import {InputField} from '@renderer/components/InputField';
import {SimpleButton} from '@renderer/components/SimpleButton';

const index_attr = 'data-index';

export type CuratePageLeftSidebarProps = {
  curate: CurateState;
  logoVersion: number;
  onCurationSelect: (folder: string, ctrl?: boolean, shift?: boolean) => void;
  onCurationDrop: (event: React.DragEvent<Element>) => void;
  onToggleGroupCollapse: (group: string) => void;
  onToggleGroupPin: (group: CurateGroup) => void;
  createNewGroup: (group: string) => void;
  moveCurationToGroup: (folder: string, group: string) => void;
}

export function CuratePageLeftSidebar(props: CuratePageLeftSidebarProps) {
  const [isHovering, setIsHovering] = React.useState(false);
  const [newGroupOpen, setNewGroupOpen] = React.useState(false);
  const [groupName, setGroupName] = React.useState('');
  const [draggedCuration, setDraggedCuration] = React.useState('');
  const [dragGroupTarget, setDragGroupTarget] = React.useState<string | undefined>(undefined);

  const [onListMouseDown, onListMouseUp] = useMouse<string>(() => ({
    chain_delay: 500,
    find_id: (event) => {
      let index: string | undefined;
      try { index = findAncestorRowIndex(event.target as Element); }
      catch (error) { console.error(error); }
      return index;
    },
    on_click: (event, folder, clicks) => {
      if (event.button === 0 && clicks === 1) { // Single left click
        props.onCurationSelect(folder, event.ctrlKey, event.shiftKey);
      }
    },
  }));

  const onDragOver = (event: React.DragEvent): void => {
    const types = event.dataTransfer.types;
    if (types.length === 1 && types[0] === 'Files') {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsHovering(true);
    }
  };

  const onDrop = (event: React.DragEvent): void => {
    if (isHovering) { setIsHovering(false); }
    props.onCurationDrop(event);
  };

  const onDragLeave = (event: React.DragEvent): void => {
    if (isHovering) { setIsHovering(false); }
  };

  const sortedCurations = React.useMemo(() => {
    return props.curate.curations.sort((a, b) => {
      const groupCompare = compare(a.group, b.group);
      if (groupCompare == 0) {
        return compare(a.game.title || ('zzzzzzzz' + a.folder), b.game.title || ('zzzzzzzz' + a.folder));
      } else {
        return groupCompare;
      }
    });
  }, [props.curate.curations]);

  const renderCuration = React.useCallback((curation: CurationState) => {
    let className = '';
    if (props.curate.selected.includes(curation.folder)) { className = 'curate-list-item--selected--secondary'; }
    if (props.curate.current === curation.folder)        { className = 'curate-list-item--selected';            }
    return (
      <div
        className={`curate-list-item ${className}`}
        key={curation.folder}
        draggable={true}
        onDragStart={() => setDraggedCuration(curation.folder)}
        onDragEnd={onCurationDragDrop}
        { ...{ [index_attr]: curation.folder } }>
        <div
          className='curate-list-item__icon'
          style={{ backgroundImage: `url('${getPlatformIconURL('Flash'/* curation.meta.platform*/, props.logoVersion)}')` }} />
        <p className='curate-list-item__title'>
          {curation.game.title || curation.folder}
        </p>
      </div>
    );
  }, [props.curate, draggedCuration, dragGroupTarget]);

  const onCurationDragDrop = React.useCallback((event) => {
    if (draggedCuration !== '' && dragGroupTarget !== undefined) {
      props.moveCurationToGroup(draggedCuration, dragGroupTarget);
    }
    setDraggedCuration('');
    setDragGroupTarget(undefined);
  }, [draggedCuration, dragGroupTarget]);

  const renderCurationGroup = React.useCallback((group: CurateGroup, elems: JSX.Element[]) => {
    const collapsed = props.curate.collapsedGroups.includes(group.name);
    const pinned = props.curate.groups.findIndex(g => g.name === group.name) !== -1;
    return (
      <div
        key={group.name || 'No Group'}
        onDragOver={() => setDragGroupTarget(group.name)}
        className={`curate-list-group ${group.name === dragGroupTarget ? 'curate-list-group__hovered-curation' : ''}`}>
        <div className={'curate-list-group__header'}>
          <div className={'curate-list-group__header-text'}>{group.name || 'No Group'}</div>
          { group.name !== '' && (
            <div
              onClick={() => props.onToggleGroupPin(group)}
              className={`curate-list-group__header-pin ${pinned ? 'curate-list-group__header-pinned' : 'curate-list-group__header-unpinned'}`}>
              <OpenIcon icon={'pin'}/>
            </div>
          )}
          <div
            onClick={() => props.onToggleGroupCollapse(group.name)}
            className={'curate-list-group__header-caret'}>
            <OpenIcon icon={collapsed ? 'caret-bottom' : 'caret-top'}/>
          </div>
        </div>
        {!collapsed && elems}
      </div>
    );
  }, [props.curate.collapsedGroups, props.curate.groups, props.onToggleGroupCollapse, dragGroupTarget]);

  const curationsRender = React.useMemo(() => {
    if (sortedCurations.length === 0) {
      return [];
    }
    const matchGroup = (name: string) => {
      return props.curate.groups.find(g => g.name === name) || {
        name: name,
        icon: ''
      };
    };
    let stagingGroup: CurateGroup = matchGroup(sortedCurations[0].group);
    // Render all groups present on curations
    let stagingElems: JSX.Element[] = [];
    const groupRenders: Map<string, JSX.Element> = new Map();
    sortedCurations.forEach((cur, idx, arr) => {
      if (stagingGroup.name !== cur.group) {
        // New group, flush and set up new group
        groupRenders.set(stagingGroup.name, renderCurationGroup(stagingGroup, stagingElems));
        stagingElems = [];
        stagingGroup = matchGroup(cur.group);
      }
      stagingElems.push(renderCuration(cur));
    });
    // Push last group
    if (stagingElems.length > 0) {
      groupRenders.set(stagingGroup.name, renderCurationGroup(stagingGroup, stagingElems));
    }
    // Find any persistant groups that are missing and make renders
    for (const g of props.curate.groups) {
      if (!groupRenders.has(g.name)) {
        groupRenders.set(g.name, renderCurationGroup(g, []));
      }
    }
    return Array.from(groupRenders.entries()).sort((a, b) => {
      if (a[0] === '' && b[0] !== '') {
        return -1;
      }
      if (b[0] === '' && a[0] !== '') {
        return 1;
      }
      return compare(a[0], b[0]);
    }).reduce<JSX.Element[]>((prev, cur) => prev.concat([cur[1]]), []);
  }, [props.curate, props.curate.groups, draggedCuration, dragGroupTarget]);

  const openGroupEdit = React.useCallback(() => {
    setNewGroupOpen(true);
  }, [setNewGroupOpen]);

  const createNewGroup = React.useCallback(() => {
    if (!!props.curate.groups.find(g => g.name === groupName) || groupName === '' || groupName === 'No Group') {
      alert('Group already exists.');
    } else {
      props.createNewGroup(groupName);
      setNewGroupOpen(false);
      setGroupName('');
    }
  }, [props.createNewGroup, props.curate.groups, setGroupName, groupName]);

  return (
    <div
      className={`curate-page__left simple-scroll ${isHovering ? 'curate-page__left--hover' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseDown={onListMouseDown}
      onMouseUp={onListMouseUp}>
      <div className="playlist-list-fake-item-buttons">
        <div
          className='playlist-list-fake-item'
          onClick={openGroupEdit}>
          <div className='playlist-list-fake-item__inner'>
            <OpenIcon icon='plus' />
          </div>
          <div className='playlist-list-fake-item__inner'>
            <p className='playlist-list-fake-item__inner__title'>{'New Group'}</p>
          </div>
        </div>
      </div>
      {curationsRender}
      { newGroupOpen && (
        <FloatingContainer>
          <InputField
            editable={true}
            text={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={'Group Name'} />
          <SimpleButton
            onClick={createNewGroup}
            value={'Create'}/>
        </FloatingContainer>
      )}
    </div>
  );
}

function findAncestorRowIndex(element: Element): string | undefined {
  const ancestor = findElementAncestor(element, target => target.getAttribute(index_attr) !== null, true);
  if (!ancestor) { return undefined; }

  const index = ancestor.getAttribute(index_attr);
  if (typeof index !== 'string') { throw new Error('Failed to get attribute from ancestor!'); }

  return (index as any) + '';
}
