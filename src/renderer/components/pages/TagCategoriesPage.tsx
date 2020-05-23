import { TagCategory } from '@database/entity/TagCategory';
import { ConnectedRightTagCategoriesSidebar } from '@renderer/containers/ConnectedRightTagsCategoriesSidebar';
import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { findElementAncestor, gameScaleSpan } from '@renderer/Util';
import { LangContext } from '@renderer/util/lang';
import { BackIn, TagCategoryByIdData, TagCategoryByIdResponse, TagCategoryDeleteData, TagCategoryDeleteResponse, TagCategorySaveData, TagCategorySaveResponse, WrappedResponse } from '@shared/back/types';
import { LangContainer } from '@shared/lang';
import { deepCopy, getRandomHexColor } from '@shared/Util';
import * as React from 'react';
import { ResizableSidebar } from '../ResizableSidebar';
import { SimpleButton } from '../SimpleButton';
import { TagCategoriesList } from '../TagCategoriesList';
import { TagListItem } from '../TagListItem';


type OwnProps = {
  tagScale: number;
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
  /** Current total tag results  */
  categoriesTotal: number;
}

export interface TagCategoriesPage {
  context: LangContainer;
}

export class TagCategoriesPage extends React.Component<TagCategoriesPageProps, TagCategoriesPageState> {


  constructor(props: TagCategoriesPageProps) {
    super(props);
    this.state = {
      isEditing: false,
      categoriesTotal: 0
    };
  }

  render() {
    const rowHeight = calcScale(40, this.props.tagScale);
    const strings = this.context.tags;

    return (
      <div className='tags-page simple-scroll'>
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
      saveTagCategory(this.state.currentCategory, (res) => {
        if (res.data) {
          this.setState({ currentCategory: res.data });
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
      saveTagCategory(newCat);
    }
  }

  updateCurrentCategory = (categoryId: number) => {
    window.Shared.back.send<TagCategoryByIdResponse, TagCategoryByIdData>(BackIn.GET_TAG_CATEGORY_BY_ID, categoryId, (res) => {
      if (res.data) {
        this.setState({
          currentCategory: res.data,
          originalCategory: deepCopy(res.data)
        });
      }
    });
  }

  deleteCurrentCategory = () => {
    if (this.state.selectedCategoryId) {
      console.log('DELETING');
      window.Shared.back.send<TagCategoryDeleteResponse, TagCategoryDeleteData>(BackIn.DELETE_TAG_CATEGORY, this.state.selectedCategoryId, (res) => {
        if (res.data) {
          if (res.data.success) {
            this.setState({ selectedCategoryId: undefined, currentCategory: undefined });
          }
        }
      });
    }
  }

  static contextType = LangContext;
}

function calcScale(defHeight: number, scale: number): number {
  return (defHeight + (scale - 0.5) * 2 * defHeight * gameScaleSpan) | 0;
}

function saveTagCategory(tagCategory: TagCategory, callback?: (res: WrappedResponse<TagCategorySaveResponse>) => void) {
  window.Shared.back.send<TagCategorySaveResponse, TagCategorySaveData>(BackIn.SAVE_TAG_CATEGORY, tagCategory, callback);
}