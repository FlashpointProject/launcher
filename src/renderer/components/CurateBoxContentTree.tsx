import { getPointer } from '@renderer/context/MenuContext';
import { useAppDispatch } from '@renderer/hooks/useAppSelector';
import { useContextMenu } from '@renderer/hooks/useContextMenu';
import { toggleContentNodeView } from '@renderer/store/curate/slice';
import { LangContext } from '@renderer/util/lang';
import { CURATIONS_FOLDER_WORKING } from '@shared/constants';
import { genFlatContentTree, sizeToString } from '@shared/Util';
import { ContentTree, FlatContentTreeNode } from 'flashpoint-launcher';
import * as path from 'path';
import React, { useContext } from 'react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import { MenuItemType } from './Menu';
import { OpenIcon } from './OpenIcon';

const RENDERER_OVERSCAN = 50;

export type CurateBoxContentTreeProps = {
  contentTree: ContentTree;
  launchPath?: string;
  folder: string;
};

export function CurateBoxContentTree(props: CurateBoxContentTreeProps) {
  const { folder, launchPath, contentTree } = props;
  const dispatch = useAppDispatch();
  const strings = useContext(LangContext);
  const flatTree = genFlatContentTree(contentTree);
  const { openMenu } = useContextMenu();

  const onContentTreeNodeMenuFactory = (node: FlatContentTreeNode) => (event: React.MouseEvent) => {
    console.log(node);
    const contextButtons: MenuItemType[] = [{
      type: 'button',
      label: strings.curate.contextCopyName,
      onClick: () => navigator.clipboard.writeText(node.name)
    }, {
      type: 'button',
      label: strings.curate.contextCopyPath,
      onClick: () => navigator.clipboard.writeText(node.tree.join(path.sep))
    }, {
      type: 'button',
      label: strings.curate.contextCopyAsURL,
      onClick: () => navigator.clipboard.writeText(encodeURI(`http://${node.tree.join('/')}`))
    }, {
      type: 'separator'
    }];
    const fullPath = path.join(window.Shared.config.fullFlashpointPath, CURATIONS_FOLDER_WORKING, folder, 'content', node.tree.join(path.sep));
    console.log(fullPath);
    if (window.electronAPI !== undefined) {
      if (node.nodeType === 'file') {
        contextButtons.push({
          type: 'button',
          label: strings.curate.contextShowInExplorer,
          onClick: () => window.electronAPI?.showItemInFolder(fullPath)
        });
      } else if (node.nodeType === 'directory') {
        contextButtons.push({
          type: 'button',
          label: strings.curate.contextOpenFolderInExplorer,
          onClick: () => window.electronAPI?.openExternal(fullPath)
        });
      }
    }
    openMenu({ items: contextButtons }, getPointer(event));
  };

  const onToggleContentNodeView = (tree: string[]) => {
    console.log('toggling ' + tree);
    dispatch(toggleContentNodeView({
      folder,
      tree
    }));
  };

  const ContentRow = (rowProps: ListRowProps) => {
    const node = flatTree[rowProps.index];
    if (node) {
      const depthDivs = [];
      for (let i = 0; i < node.depth; i++) {
        depthDivs.push(<div className='curate-box-content__depth' key={`${i}`} style={{ width: '1rem' }}/>);
      }

      const isLaunchPath = node.tree.join('/') === launchPath;

      switch (node.nodeType) {
        case 'directory': {
          return (
            <div
              key={rowProps.index}
              style={rowProps.style}
              onContextMenu={onContentTreeNodeMenuFactory(node)}
              className='curate-box-content__entry'>
              { node.depth > 0 && (
                depthDivs
              )}
              <div className='curate-box-content__entry-icon curate-box-content__entry-icon--collapse'
                onClick={() => onToggleContentNodeView(node.tree)} >
                <OpenIcon className={isLaunchPath ? 'curate-box-content__entry-icon--launch-path' : ''} icon={node.expanded ? 'chevron-bottom': 'chevron-right' }/>
              </div>
              <div>{node.name}</div>
            </div>
          );
        }
        case 'file': {
          return (
            <div
              key={rowProps.index}
              style={rowProps.style}
              onContextMenu={onContentTreeNodeMenuFactory(node)}
              className='curate-box-content__entry'>
              { node.depth > 0 && (
                depthDivs
              )}
              <OpenIcon className={`curate-box-content__entry-icon ${isLaunchPath ? 'curate-box-content__entry-icon--launch-path' : ''}`} icon='file'/>
              <div>{node.name} ({sizeToString(node.size || 0)})</div>
            </div>
          );
        }
      }
    } else {
      return (
        <div
          key={rowProps.index}>
          No Node Found?
        </div>
      );
    }
  };

  return (
    <AutoSizer>
      {({ width, height }) =>
        <List
          className='simple-scroll'
          width={width}
          height={height}
          rowHeight={16}
          rowCount={flatTree.length}
          overscanRowCount={RENDERER_OVERSCAN}
          rowRenderer={ContentRow}/>
      }
    </AutoSizer>
  );
}

