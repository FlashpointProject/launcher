import { GameOrderReverse, Tag, TagCategory } from 'flashpoint-launcher';
import * as React from 'react';
import { ArrowKeyStepper, AutoSizer, List, ListRowProps } from 'react-virtualized';
import { findElementAncestor } from '../Util';
import { TagItemContainer } from './TagItemContainer';
import { TagListHeader } from './TagListHeader';
import { TagListItem } from './TagListItem';
/** A function that receives an HTML element. */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

const RENDERER_OVERSCAN = 15;

export type TagListProps = {
  /** All tags that will be shown in the list. */
  tags: Tag[];
  /** Tag category info */
  tagCategories: TagCategory[];
  /** Total number of tags there are. */
  tagsTotal: number;
  /** Currently selected tag (if any). */
  selectedTagId?: number;
  /** Height of each row in the list (in pixels). */
  rowHeight: number;
  /** Function that renders the elements to show instead of the grid if there are no games (render prop). */
  noRowsRenderer?: () => React.JSX.Element;
  /** Called when the user attempts to select a game. */
  onTagSelect: (tagId?: number) => void;
  // React-Virtualized pass-through props (their values are not used for anything other than updating the grid when changed)
  orderReverse?: GameOrderReverse;
  /** Function for getting a reference to grid element. Called whenever the reference could change. */
  listRef?: RefFunc<HTMLDivElement>;
  /** Whether this is usable */
  isLocked: boolean;
};

export function TagList(props: TagListProps) {
  const { onTagSelect, isLocked, selectedTagId, tags, tagsTotal, tagCategories, rowHeight } = props;

  const onSelect = (event: React.MouseEvent<HTMLDivElement>, tagId: number | undefined) => {
    if (onTagSelect && !isLocked) {
      onTagSelect(tagId);
    }
  };

  const findTagId = (element: EventTarget): number | undefined => {
    const tag = findElementAncestor(element as Element, target => TagListItem.isElement(target), true);
    if (tag) { return TagListItem.getId(tag); }
  };

  const rowRenderer = (props: ListRowProps): React.ReactNode => {
    const tag = tags[props.index];
    return tag ? (
      <TagListItem
        { ...props }
        key={props.key}
        tagCategories={tagCategories}
        isSelected={tag.id === selectedTagId}
        tag={tag} />
    ) : <div key={props.key} style={props.style} />;
  };

  return (
    <div className='tags-list-wrapper'>
      <TagListHeader />
      <TagItemContainer
        className='tag-browser__center-inner'
        onTagSelect={onSelect}
        findTagId={findTagId} >
        <AutoSizer>
          {({ width, height }) => {
            return (
              <ArrowKeyStepper
                mode='cells'
                isControlled={true}
                columnCount={1}
                rowCount={10} >
                {() => (
                  <List
                    className='tag-list simple-scroll'
                    width={width}
                    height={height}
                    rowHeight={rowHeight}
                    rowCount={tagsTotal || 0}
                    overscanRowCount={RENDERER_OVERSCAN}
                    rowRenderer={rowRenderer}
                    pass_selectedId={selectedTagId} />
                )}
              </ArrowKeyStepper>
            );
          }}
        </AutoSizer>
      </TagItemContainer>
    </div>
  );
}
