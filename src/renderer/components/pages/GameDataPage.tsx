import { ReactNode, useCallback, useMemo, useState } from "react";
import { OpenIcon } from "../OpenIcon";
import { FpfssUser } from "@shared/back/types";
import { ArrowKeyStepper, AutoSizer, List, ListRowProps } from "react-virtualized-reactv17";
import { sizeToString } from "@shared/Util";

type SearchType = 'hash' | 'path';

type IndexMatch = {
  crc32: string;
  md5: string;
  sha1: string;
  sha256: string;
  path: string;
  size: number;
  date_added: string;
  game_id: string;
}

type IndexGame = {
  id: string;
  date_added: string;
  platform_name: string;
  title: string;
}

type IndexHashResponse = {
  data: IndexMatch[];
  games: IndexGame[];
  hash: string;
  type: 'crc32' | 'md5' | 'sha1' | 'sha256';
}

type IndexPathResponse = {
  data: IndexMatch[];
  games: IndexGame[];
  paths: string[];
}

type IndexContentTree = {
  root: IndexContentTreeDirectory
}

type IndexContentTreeDirectory = {
  kind: 'dir';
  expanded: boolean;
  path: string;
  directories: {
    [key: string]: IndexContentTreeDirectory;
  };
  files: IndexContentTreeFile[];
}

type IndexContentTreeFile = {
  kind: 'file';
  match: IndexMatch;
}

type IndexTableRow = {
  depth: number;
  node: IndexContentTreeDirectory | IndexContentTreeFile;
}

export type GameDataPageProps = {
  performFpfssAction: (cb: (user: FpfssUser) => any) => void;
}

export function GameDataPage(props: GameDataPageProps) {
  const [searchValue, setSearchValue] = useState('');
  const [order, setOrder] = useState<SearchType>('path');
  const [contentTree, setContentTree] = useState<IndexContentTree | null>(null);
  const [renderKey, setRenderKey] = useState(0);

  const tableRows = useMemo(() => {
    console.log('rerendered table row');
    if (contentTree === null) {
      return null;
    } else {
      return getIndexTableRows(contentTree.root);
    }
  }, [contentTree, renderKey]);
  console.log('rows');
  console.log(tableRows);

  const performSearch = () => {
    props.performFpfssAction(async (user) => {
      if (order === 'hash') {
        const url = `https://fpfss.unstable.life/api/index/hash/${searchValue}`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'User-Agent': 'Flashpoint Launcher',
            'Accept': 'application/json',
          },
        })
        if (res.ok) {
          const data: IndexHashResponse = await res.json();
          console.log('set tree');
          setContentTree(createContentTree(data.data, data.games));
        } else {
          alert(`Error: ${res.statusText}s`);
        }
      } else {
        const url = 'https://fpfss.unstable.life/api/index/path';
        const body = {
          path: searchValue
        };
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'User-Agent': 'Flashpoint Launcher',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data: IndexPathResponse = await res.json();
          console.log('set tree');
          setContentTree(createContentTree(data.data, data.games));
        } else {
          alert(`Error: ${res.statusText}s`);
        }
      }
    })
  };

  const onClickNode = useCallback((node: IndexContentTreeDirectory | IndexContentTreeFile) => {
    console.log('clicked');
    if (node.kind === 'dir') {
      node.expanded = !node.expanded;
      setContentTree(contentTree);
      setRenderKey(renderKey + 1);
    }
  }, [contentTree, renderKey]);

  return (
    <div className="gdb-container">
      {/* Main Content Area */}
      <div className="gdb-content">
        {/* Header */}
        <div className="search-bar">
          <div className="search-bar-icon">
            <OpenIcon icon='magnifying-glass' />
          </div>
          <input
            className="search-bar-text-input"
            placeholder="Search..."
            value={searchValue}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                performSearch();
              }
            }}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <select
            className='search-selector search-bar-order-dropdown'
            value={order}
            onChange={(event) => setOrder(event.target.value as SearchType)}>
            <option value='hash'>Hash Compare</option>
            <option value='path'>Path Compare</option>
          </select>
        </div>

        {/* Results Label */}
        <div className="gdb-content-main">
          <div className="results">
            <span>{`{num} Results: {Search Value}`}</span>
          </div>

          {/* Scrollable Content Tree */}
          <div className="gdb-table-container">
            {tableRows ? (
              <AutoSizer>
                {({ width, height }) => {
                  return (
                    <ArrowKeyStepper
                      columnCount={1}
                      rowCount={1}
                    >
                      {({ onSectionRendered }) => (
                        <List
                          className='simple-scroll'
                          width={width}
                          height={height}
                          rowHeight={20}
                          overscanRowCount={15}
                          rowRenderer={(cellProps) => rowRenderer(cellProps, tableRows, onClickNode)}
                          rowCount={tableRows.length} />
                      )}
                    </ArrowKeyStepper>
                  );
                }}
              </AutoSizer>

            ) : ''}
          </div>
        </div>
      </div>

      {/* Utilities Sidebar */}
      <div className="gdb-sidebar">
        <div>
          sup
        </div>
      </div>
    </div>
  );
}

function rowRenderer(
  cellProps: ListRowProps,
  indexTree: IndexTableRow[] | null,
  onClickNode: (node: IndexContentTreeDirectory | IndexContentTreeFile) => void,
): ReactNode {
  if (indexTree === null) {
    return <div></div>
  }

  const row = indexTree[cellProps.index];
  const node = row.node;
  const depthDivs = [];
  for (let i = 0; i < row.depth; i++) {
    depthDivs.push(
      <div
        key={`depth-${i}`}
        className='curate-box-content__depth'
        style={{ width: '1rem' }} />
    )
  }
  return (
    <div
      className='gdb-table-row'
      style={cellProps.style}>
      {depthDivs}
      <div
        key={`${cellProps.index}`}
        onClick={() => onClickNode(node)}
        className='gdb-table-row-content'>
        {node.kind === 'dir' ? (
          <>
            <OpenIcon
              icon={node.expanded ? 'chevron-bottom' : 'chevron-right'}
            />
            <div>{node.path}</div>
          </>
        ) : (
          <>
            <OpenIcon
              className='curate-box-content__entry-icon'
              icon='file' />
            <div>{(() => {
              const pathSlice = node.match.path.split('/');
              const name = pathSlice[pathSlice.length - 1];
              const sizeStr = sizeToString(node.match.size);
              return `${name} (${sizeStr})`;
            })()}</div>
          </>
        )}
      </div>
    </div>
  )
}

function getIndexTableRows(node: IndexContentTreeDirectory, depth: number = -1): IndexTableRow[] {
  let rows: IndexTableRow[] = [];

  for (const dir of Object.values(node.directories)) {
    rows.push({
      depth: depth + 1,
      node: dir
    });
    if (dir.expanded) {
      rows = rows.concat(getIndexTableRows(dir, depth + 1));
    }
  }

  if (node.expanded) {
    for (const file of node.files) {
      rows.push({
        depth: depth + 1,
        node: file,
      });
    }
  }

  return rows;
}

function createContentTree(data: IndexMatch[], games: IndexGame[]): IndexContentTree {
  const rootNode: IndexContentTreeDirectory = {
    kind: 'dir',
    expanded: true,
    path: '',
    directories: {},
    files: [],
  };

  for (const match of data) {
    // Find parent in root if possible
    let curNode = rootNode;
    const parts = match.path.split('/');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i < parts.length - 1) {
        // Directory
        if (!curNode.directories[part]) {
          curNode.directories[part] = {
            kind: 'dir',
            expanded: true,
            path: part,
            directories: {},
            files: [],
          }
        }
        curNode = curNode.directories[part];
      } else {
        // File
        curNode.files.push({
          kind: 'file',
          match,
        })
      }
    }
  }

  return {
    root: rootNode
  }
}