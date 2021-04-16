import { compare } from '@back/util/strings';
import { useMouse } from '@renderer/hooks/useMouse';
import { CurateState } from '@renderer/store/curate/types';
import { findElementAncestor, getPlatformIconURL } from '@renderer/Util';
import * as React from 'react';

const index_attr = 'data-index';

export type CuratePageLeftSidebarProps = {
  curate: CurateState;
  logoVersion: number;
  onCurationClick: (folder: string) => void;
  onCurationDrop: (event: React.DragEvent<Element>) => void;
}

export function CuratePageLeftSidebar(props: CuratePageLeftSidebarProps) {
  const [isHovering, setIsHovering] = React.useState(false);

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
        props.onCurationClick(folder);
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

  return (
    <div
      className={`curate-page__left simple-scroll ${isHovering ? 'curate-page__left--hover' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseDown={onListMouseDown}
      onMouseUp={onListMouseUp}>
      {props.curate.curations.sort((a,b) => compare(a.game.title || `ZZZZZ_${a.folder}`, b.game.title || `ZZZZZ_${b.folder}`)).map((curation, index) => (
        <div
          className={
            'curate-list-item'+
          ((curation.folder === props.curate.current) ? ' curate-list-item--selected' : '')
          }
          key={curation.folder}
          { ...{ [index_attr]: curation.folder } }>
          <div
            className='curate-list-item__icon'
            style={{ backgroundImage: `url('${getPlatformIconURL('Flash'/* curation.meta.platform*/, props.logoVersion)}')` }} />
          <p className='curate-list-item__title'>
            {curation.game.title || curation.folder}
          </p>
        </div>
      ))}
    </div>
  );
}

function findAncestorRowIndex(element: Element): string | undefined {
  const ancestor = findElementAncestor(element, target => target.getAttribute(index_attr) !== null, true);
  if (!ancestor) { return undefined; }

  const index = ancestor.getAttribute(index_attr);
  if (typeof index !== 'string') { throw new Error('Failed to get attribute from ancestor!'); }

  const index_str = (index as any) + ''; // Coerce to number

  return index_str;
}
