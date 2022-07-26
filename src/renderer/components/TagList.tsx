import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import { GameOrderReverse } from 'flashpoint-launcher';
import * as React from 'react';
import { ArrowKeyStepper, AutoSizer, List, ListRowProps } from 'react-virtualized-reactv17';
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
  noRowsRenderer?: () => JSX.Element;
  /** Called when the user attempts to select a game. */
  onTagSelect: (tagId?: number) => void;
  // React-Virtualized pass-through props (their values are not used for anything other than updating the grid when changed)
  orderReverse?: GameOrderReverse;
  /** Function for getting a reference to grid element. Called whenever the reference could change. */
  listRef?: RefFunc<HTMLDivElement>;
  /** Whether this is usable */
  isLocked: boolean;
};

/** A list of rows, where each rows displays a game. */
export class TagList extends React.Component<TagListProps> {
  private _wrapper: React.RefObject<HTMLDivElement> = React.createRef();
  /** Currently displayed games. */
  currentTags: Tag[] | undefined = undefined;

  componentDidMount(): void {
    this.updateCssVars();
  }

  componentDidUpdate(): void {
    this.updateCssVars();
  }

  render() {
    const tags = this.props.tags || [];
    // @HACK: Check if the tags array changed
    // (This will cause the re-rendering of all cells any time the tags prop uses a different reference)
    const tagsChanged = tags !== this.currentTags;
    if (tagsChanged) { this.currentTags = tags; }
    // Render
    return (
      <div className='tags-list-wrapper'
        ref={this._wrapper}>
        <TagListHeader />
        <TagItemContainer
          className='tag-browser__center-inner'
          onTagSelect={this.onTagSelect}
          findTagId={this.findTagId} >
          <AutoSizer>
            {({ width, height }) => {
              return (
                <ArrowKeyStepper
                  mode='cells'
                  isControlled={true}
                  columnCount={1}
                  rowCount={10} >
                  {({ onSectionRendered, scrollToRow }) => (
                    <List
                      className='tag-list simple-scroll'
                      width={width}
                      height={height}
                      rowHeight={this.props.rowHeight}
                      rowCount={this.props.tagsTotal || 0}
                      overscanRowCount={RENDERER_OVERSCAN}
                      rowRenderer={this.rowRenderer}
                      pass_tagsChanged={tagsChanged}
                      pass_selectedId={this.props.selectedTagId} />
                  )}
                </ArrowKeyStepper>
              );
            }}
          </AutoSizer>
        </TagItemContainer>
      </div>
    );
  }

  onTagSelect = (event: React.MouseEvent<HTMLDivElement>, tagId: number | undefined) => {
    if (this.props.onTagSelect && !this.props.isLocked) {
      this.props.onTagSelect(tagId);
    }
  }

  /** Find a tag's ID. */
  findTagId = (element: EventTarget): number | undefined => {
    const tag = findElementAncestor(element as Element, target => TagListItem.isElement(target), true);
    if (tag) { return TagListItem.getId(tag); }
  }

  rowRenderer = (props: ListRowProps): React.ReactNode => {
    const { tags, selectedTagId } = this.props;
    const tag = tags[props.index];
    return tag ? (
      <TagListItem
        { ...props }
        key={props.key}
        tagCategories={this.props.tagCategories}
        isSelected={tag.id === selectedTagId}
        tag={tag} />
    ) : <div key={props.key} style={props.style} />;
  }

  /** Update CSS Variables */
  updateCssVars() {
    const ref = this._wrapper.current;
    if (!ref) { throw new Error('Browse Page wrapper div not found'); }
    ref.style.setProperty('--height', this.props.rowHeight+'');
  }
}
