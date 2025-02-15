import { OpenIcon } from '@renderer/components/OpenIcon';
import { withMainState, WithMainStateProps } from '@renderer/containers/withMainState';
import { useMouse } from '@renderer/hooks/useMouse';
import { findElementAncestor, getPlatformIconURL } from '@renderer/Util';
import { compare } from '@shared/Util';
import { uuid } from '@shared/utils/uuid';
import { CurationState, DialogState } from 'flashpoint-launcher';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import * as curateActions from '@renderer/store/curate/slice';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { CurateGroup } from '@renderer/store/curate/slice';
import { createDialog } from '@renderer/store/main/slice';

const index_attr = 'data-index';

type OwnProps = {
  logoVersion: number;
  onCurationDrop: (event: React.DragEvent) => void;
}

type CuratePageLeftSidebarComponentProps = OwnProps & WithMainStateProps;

function CuratePageLeftSidebarComponent(props: CuratePageLeftSidebarComponentProps) {
  const [isHovering, setIsHovering] = React.useState(false);
  const [groupName, setGroupName] = React.useState('');
  const [draggedCuration, setDraggedCuration] = React.useState('');
  const [dragGroupTarget, setDragGroupTarget] = React.useState<string | undefined>(undefined);
  const curate = useAppSelector((state) => state.curate);
  const dispatch = useDispatch();

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
        dispatch(curateActions.setCurrentCuration({
          folder,
          ctrl: event.ctrlKey,
          shift: event.shiftKey
        }));
      }
    },
  }), [dispatch]);

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

  const onDragLeave = (): void => {
    if (isHovering) { setIsHovering(false); }
  };

  const sortedCurations = React.useMemo(() => {
    return [...curate.curations].sort((a, b) => {
      const groupCompare = compare(a.group, b.group);
      if (groupCompare == 0) {
        return compare(a.game.title || ('zzzzzzzz' + a.folder), b.game.title || ('zzzzzzzz' + a.folder));
      } else {
        return groupCompare;
      }
    });
  }, [curate.curations]);

  const renderCuration = React.useCallback((curation: CurationState) => {
    let className = '';
    const firstPlatform = (curation.game.platforms && curation.game.platforms.length > 0) ? curation.game.platforms[0].name : '';
    if (curate.selected.includes(curation.folder)) { className = 'curate-list-item--selected--secondary'; }
    if (curate.current === curation.folder)        { className = 'curate-list-item--selected';            }
    return (
      <div
        className={`curate-list-item ${className}`}
        key={curation.folder}
        draggable={true}
        onDragStart={() => setDraggedCuration(curation.folder)}
        onDragEnd={onCurationDragDrop}
        { ...{ [index_attr]: curation.folder } }>
        { curate.current === curation.folder && (
          <div className='curate-list-item__icon'>
            <OpenIcon icon='chevron-right' />
          </div>
        )}
        <div
          className='curate-list-item__icon'
          style={{ backgroundImage: `url('${getPlatformIconURL(firstPlatform, props.logoVersion)}')` }} />
        <p className='curate-list-item__title'>
          {curation.game.title || curation.folder}
        </p>
        { curation.alreadyImported && (
          <div className='curate-list-item__icon'>
            <OpenIcon icon='file' />
          </div>
        )}
        { curation.warnings.writtenWarnings.length > 0 && (
          <div className='curate-list-item__icon'>
            <OpenIcon icon='warning' className='curate-list-item__warning' />
          </div>
        )}
      </div>
    );
  }, [curate, draggedCuration, dragGroupTarget]);

  const onCurationDragDrop = React.useCallback(() => {
    if (draggedCuration !== '' && dragGroupTarget !== undefined) {
      dispatch(curateActions.changeGroup({
        folder: draggedCuration,
        group: dragGroupTarget
      }));
    }
    setDraggedCuration('');
    setDragGroupTarget(undefined);
  }, [draggedCuration, dragGroupTarget]);

  const renderCurationGroup = React.useCallback((group: CurateGroup, elems: JSX.Element[]) => {
    const collapsed = curate.collapsedGroups.includes(group.name);
    const pinned = curate.groups.findIndex(g => g.name === group.name) !== -1;
    return (
      <div
        key={group.name || 'No Group'}
        onDragOver={() => setDragGroupTarget(group.name)}
        className={`curate-list-group ${group.name === dragGroupTarget ? 'curate-list-group__hovered-curation' : ''}`}>
        <div
          className={'curate-list-group__header'}
          onDoubleClick={() => {
            dispatch(curateActions.setCurrentCurationGroup(group.name));
          }} >
          <div className={'curate-list-group__header-text'}>
            <div className={'curate-list-group__header-text--name'}>{group.name || 'No Group'}</div>
            <div className={'curate-list-group__header-text--counter'}>{`(${elems.length})`}</div>
          </div>
          { group.name !== '' && (
            <div
              onClick={() => dispatch(curateActions.toggleGroupPin(group))}
              className={`curate-list-group__header-pin ${pinned ? 'curate-list-group__header-pinned' : 'curate-list-group__header-unpinned'}`}>
              <OpenIcon icon={'pin'}/>
            </div>
          )}
          <div
            onClick={() => dispatch(curateActions.toggleGroupCollapse(group.name))}
            className={'curate-list-group__header-caret'}>
            <OpenIcon icon={collapsed ? 'caret-bottom' : 'caret-top'}/>
          </div>
        </div>
        {!collapsed && elems}
      </div>
    );
  }, [curate.collapsedGroups, curate.groups, dispatch, dragGroupTarget]);

  const curationsRender = React.useMemo(() => {
    if (sortedCurations.length === 0) {
      return [];
    }
    const matchGroup = (name: string) => {
      return curate.groups.find(g => g.name === name) || {
        name: name,
        icon: ''
      };
    };
    let stagingGroup: CurateGroup = matchGroup(sortedCurations[0].group);
    // Render all groups present on curations
    let stagingElems: JSX.Element[] = [];
    const groupRenders: Map<string, JSX.Element> = new Map();
    sortedCurations.forEach((cur) => {
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
    for (const g of curate.groups) {
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
  }, [curate, curate.groups, draggedCuration, dragGroupTarget]);

  const createNewGroup = React.useCallback(() => {
    // Open new group dialog
    const dialog: DialogState = {
      largeMessage: true,
      message: 'Group Name',
      cancelId: 1,
      buttons: ['Create', 'Cancel'],
      fields: [{
        type: 'string',
        name: 'groupName',
        value: ''
      }],
      id: uuid()
    };
    dispatch(createDialog(dialog));
    // Listen for dialog response
    window.Shared.dialogResEvent.once(dialog.id, (d: DialogState, res: number) => {
      if (res !== d.cancelId) {
        const field = d.fields && d.fields.find(f => f.name === 'groupName');
        if (field) {
          const exists = curate.groups.findIndex(g => g.name === field.value) > -1;
          if (!exists) {
            console.log('creating group...');
            dispatch(curateActions.createGroup({
              name: field.value as string,
              icon: '',
            }));
          }
        }
      }
    });
  }, [dispatch, curate.groups, setGroupName, groupName]);

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
          onClick={createNewGroup}>
          <div className='playlist-list-fake-item__inner'>
            <OpenIcon icon='plus' />
          </div>
          <div className='playlist-list-fake-item__inner'>
            <p className='playlist-list-fake-item__inner__title'>{'New Group'}</p>
          </div>
        </div>
      </div>
      {curationsRender}
    </div>
  );
}

function findAncestorRowIndex(element: Element): string | undefined {
  const ancestor = findElementAncestor(element, target => target.getAttribute(index_attr) !== null, true);
  if (!ancestor) { return undefined; }

  const index = ancestor.getAttribute(index_attr);
  if (index === null) { throw new Error('Failed to get attribute from ancestor!'); }

  return index;
}

export const CuratePageLeftSidebar = withMainState(CuratePageLeftSidebarComponent);
