import { TagCategory } from '@database/entity/TagCategory';
import { ConnectedRightTagCategoriesSidebar } from '@renderer/containers/ConnectedRightTagsCategoriesSidebar';
import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { findElementAncestor, gameScaleSpan } from '@renderer/Util';
import { LangContext } from '@renderer/util/lang';
import { BackIn } from '@shared/back/types';
import { LangContainer } from '@shared/lang';
import { deepCopy, getRandomHexColor } from '@shared/Util';
import * as React from 'react';
import { ResizableSidebar } from '../ResizableSidebar';
import { SimpleButton } from '../SimpleButton';
import { TagCategoriesList } from '../TagCategoriesList';
import { TagListItem } from '../TagListItem';

type OwnProps = {
}

export type TagCategoriesPageProps = OwnProps & WithTagCategoriesProps & WithPreferencesProps;

export type TagCategoriesPageState = {
  /** Copy of working category */
  currentCategory?: TagCategory;
  /** Original copy of working category */
  originalCategory?: TagCategory;
  /** Currently selected tag ID */
  selectedCategoryId?: number;
  /** Whether we're editing a tag or not */
  isEditing: boolean;
}

export interface TagCategoriesPage {
  context: LangContainer;
}

export class TagCategoriesPage extends React.Component<TagCategoriesPageProps, TagCategoriesPageState> {


  constructor(props: TagCategoriesPageProps) {
    super(props);
    this.state = {
      isEditing: false
    };
  }

  render() {
    const rowHeight = calcScale(40, this.props.preferencesData.browsePageGameScale);
    const strings = this.context.tags;

    return (
      <div className='tags-page'>
        <div className='tags-page__browser'>
          <div className='tags-browser__center'>
            <TagCategoriesList
              categories={this.props.tagCategories}
              categoriesTotal={this.props.tagCategories.length}
              rowHeight={rowHeight}
              onCategorySelect={this.onCategorySelect}
              selectedCategoryId={this.state.selectedCategoryId} />
            <SimpleButton
              className='tag-category__new-button'
              onClick={this.createNewCategory}
              value={strings.newCategory}/>
          </div>
          <ResizableSidebar
            hide={!!this.state.currentCategory}
            divider='after'
            width={this.props.preferencesData.browsePageLeftSidebarWidth} >
            <ConnectedRightTagCategoriesSidebar
              currentCategory={this.state.currentCategory}
              isEditing={this.state.isEditing}
              onEditCategory={this.onEditCategory}
              onEditClick={this.onEditClick}
              onDiscardClick={this.onDiscardClick}
              onDeleteCategory={this.deleteCurrentCategory}
              onSaveCategory={this.onSaveCategory} />
          </ResizableSidebar>
        </div>
      </div>
    );
  }

  onCategorySelect = (categoryId: number | undefined) => {
    this.setState({ selectedCategoryId: categoryId });
    if (categoryId) {
      this.updateCurrentCategory(categoryId);
    }
  }

  /** Find a tag's ID. */
  findTagId = (element: EventTarget): number | undefined => {
    const tag = findElementAncestor(element as Element, target => TagListItem.isElement(target), true);
    if (tag) { return TagListItem.getId(tag); }
  }

  onEditClick = () => {
    this.setState({ isEditing: !this.state.isEditing });
  }

  onDiscardClick = () => {
    this.setState({
      currentCategory: deepCopy(this.state.originalCategory),
      isEditing: false
    });
  }

  onEditCategory = (category: Partial<TagCategory>) => {
    if (this.state.currentCategory) {
      const newCategory = {...deepCopy(this.state.currentCategory), ...category};
      this.setState({ currentCategory: newCategory });
    }
  }

  onSaveCategory = async () => {
    this.setState({
      isEditing: false,
      originalCategory: deepCopy(this.state.currentCategory)
    });
    if (this.state.currentCategory) {
      // Update tag
      window.Shared.back.request(BackIn.SAVE_TAG_CATEGORY, this.state.currentCategory)
      .then(data => {
        if (data) {
          this.setState({ currentCategory: data });
        }
      });
    }
  }

  createNewCategory = () => {
    const name = 'New Category ' + this.props.tagCategories.reduce((big, cur) => {
      if (cur.id > big.id) {
        return cur;
      }
      return big;
    }).id;
    if (this.props.tagCategories.findIndex(t => t.name == name) == -1) {
      // Tag category shouldn't exist, safe to call
      const newCat = new TagCategory();
      newCat.name = name;
      newCat.color = getRandomHexColor();
      newCat.tags = [];

      window.Shared.back.send(BackIn.SAVE_TAG_CATEGORY, newCat);
    }
  }

  updateCurrentCategory = (categoryId: number) => {
    window.Shared.back.request(BackIn.GET_TAG_CATEGORY_BY_ID, categoryId)
    .then((data) => {
      if (data) {
        this.setState({
          currentCategory: data,
          originalCategory: deepCopy(data)
        });
      }
    });
  }

  deleteCurrentCategory = () => {
    if (this.state.selectedCategoryId) {
      console.log('DELETING');
      window.Shared.back.request(BackIn.DELETE_TAG_CATEGORY, this.state.selectedCategoryId)
      .then((data) => {
        if (data && data.success) {
          this.setState({ selectedCategoryId: undefined, currentCategory: undefined });
        }
      });
    }
  }

  static contextType = LangContext;
}

function calcScale(defHeight: number, scale: number): number {
  return (defHeight + (scale - 0.5) * 2 * defHeight * gameScaleSpan) | 0;
}
