import { TagCategory } from 'flashpoint-launcher';
import * as React from 'react';
import { List, RowComponentProps } from 'react-window';
import { findElementAncestor } from '../Util';
import { SizeProvider } from './SizeProvider';
import { TagCategoriesListHeader } from './TagCategoriesListHeader';
import { TagCategoriesListItem } from './TagCategoriesListItem';
import { TagItemContainer } from './TagItemContainer';
import { TagListItem } from './TagListItem';

export type TagCategoriesProps = {
  /** All tags that will be shown in the list. */
  categories: TagCategory[];
  /** Currently selected tag (if any). */
  selectedCategoryId?: number;
  /** Height of each row in the list (in pixels). */
  rowHeight: number;
  /** Called when the user attempts to select a game. */
  onCategorySelect: (tagId?: number) => void;
};

type RowProps = {
  categories: TagCategory[];
  selectedCategoryId?: number;
}

function CategoryRow(props: RowComponentProps<RowProps>) {
  const { index, categories, selectedCategoryId } = props;
  const category = categories[index];
  return (
    <TagCategoriesListItem
      { ...props }
      key={`${index}`}
      isSelected={category.id === selectedCategoryId}
      category={category} />
  );
}

export function TagCategoriesList(props: TagCategoriesProps) {
  const onTagSelect = (event: React.MouseEvent<HTMLDivElement>, tagId: number | undefined) => {
    if (props.onCategorySelect) {
      props.onCategorySelect(tagId);
    }
  };

  const findTagId = (element: EventTarget): number | undefined => {
    const tag = findElementAncestor(element as Element, target => TagListItem.isElement(target), true);
    if (tag) { return TagListItem.getId(tag); }
  };

  return (
    <div className='tags-list-wrapper'>
      <TagCategoriesListHeader />
      <TagItemContainer
        className='tag-browser__center-inner'
        onTagSelect={onTagSelect}
        findTagId={findTagId} >
        <SizeProvider height={props.rowHeight}>
          <List<RowProps>
            rowComponent={CategoryRow}
            rowCount={props.categories.length}
            rowProps={{
              categories: props.categories,
              selectedCategoryId: props.selectedCategoryId
            }}
            rowHeight={props.rowHeight}
            overscanCount={15}
          />
        </SizeProvider>
      </TagItemContainer>
    </div>
  );
}
