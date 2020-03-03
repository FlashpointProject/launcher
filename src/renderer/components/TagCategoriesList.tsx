import { TagCategory } from '@database/entity/TagCategory';
import { GameOrderReverse } from '@shared/order/interfaces';
import * as React from 'react';
import { ArrowKeyStepper, AutoSizer, List, ListRowProps } from 'react-virtualized';
import { findElementAncestor } from '../Util';
import { TagItemContainer } from './TagItemContainer';
import { TagListHeader } from './TagListHeader';
import { TagListItem } from './TagListItem';
import { TagCategoriesListItem } from './TagCategoriesListItem';
import { TagCategoriesListHeader } from './TagCategoriesListHeader';
/** A function that receives an HTML element. */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

const RENDERER_OVERSCAN = 15;
const BACK_OVERSCAN = 100;

export type TagCategoriesProps = {
  /** All tags that will be shown in the list. */
  categories: TagCategory[];
  /** Total number of tags there are. */
  categoriesTotal: number;
  /** Currently selected tag (if any). */
  selectedCategoryId?: number;
  /** Height of each row in the list (in pixels). */
  rowHeight: number;
  /** Function that renders the elements to show instead of the grid if there are no games (render prop). */
  noRowsRenderer?: () => JSX.Element;
  /** Called when the user attempts to select a game. */
  onCategorySelect: (tagId?: number) => void;
  // React-Virtualized pass-through props (their values are not used for anything other than updating the grid when changed)
  orderReverse?: GameOrderReverse;
  /** Function for getting a reference to grid element. Called whenever the reference could change. */
  listRef?: RefFunc<HTMLDivElement>;
};

/** A list of rows, where each rows displays a game. */
export class TagCategoriesList extends React.Component<TagCategoriesProps> {
  private _wrapper: React.RefObject<HTMLDivElement> = React.createRef();
  /** Currently displayed games. */
  currentCategories: TagCategory[] | undefined = undefined;

  componentDidMount(): void {
    this.updateCssVars();
  }

  componentDidUpdate(): void {
    this.updateCssVars();
  }

  render() {
    const categories = this.props.categories || [];
    // @HACK: Check if the tags array changed
    // (This will cause the re-rendering of all cells any time the tags prop uses a different reference)
    const tagsChanged = categories !== this.currentCategories;
    if (tagsChanged) { this.currentCategories = categories; }
    // Render
    return (
      <div className='tags-list-wrapper'
        ref={this._wrapper}>
        <TagCategoriesListHeader />
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
                      rowCount={this.props.categoriesTotal || 0}
                      overscanRowCount={RENDERER_OVERSCAN}
                      rowRenderer={this.rowRenderer}
                      pass_tagsChanged={tagsChanged}
                      pass_selectedId={this.props.selectedCategoryId} />
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
    if (this.props.onCategorySelect) {
      this.props.onCategorySelect(tagId);
    }
  }

  /** Find a tag's ID. */
  findTagId = (element: EventTarget): number | undefined => {
    const tag = findElementAncestor(element as Element, target => TagListItem.isElement(target), true);
    if (tag) { return TagListItem.getId(tag); }
  }

  rowRenderer = (props: ListRowProps): React.ReactNode => {
    const { categories, selectedCategoryId } = this.props;
    const category = categories[props.index];
    return category ? (
      <TagCategoriesListItem
        { ...props }
        key={props.key}
        isSelected={category.id === selectedCategoryId}
        category={category} />
    ) : <div key={props.key} style={props.style} />;
  }

  /** Update CSS Variables */
  updateCssVars() {
    const ref = this._wrapper.current;
    if (!ref) { throw new Error('Browse Page wrapper div not found'); }
    ref.style.setProperty('--height', this.props.rowHeight+'');
  }
}
