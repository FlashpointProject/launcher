import { ConnectedRightTagCategoriesSidebar } from '@renderer/containers/ConnectedRightTagsCategoriesSidebar';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { BackIn } from '@shared/back/types';
import { calcScale, deepCopy, getRandomHexColor } from '@shared/Util';
import { TagCategory } from 'flashpoint-launcher';
import { useState } from 'react';
import { ResizableSidebar } from '../ResizableSidebar';
import { SimpleButton } from '../SimpleButton';
import { TagCategoriesList } from '../TagCategoriesList';

export function TagCategoriesPage() {
  const allStrings = useLocalization();
  const strings = allStrings.tags;
  const tagCategories = useAppSelector((state) => state.tagCategories);
  const scale = useAppSelector(state => state.preferences.scaleValues.browse);
  const browsePageLeftSidebarWidth = useAppSelector(state => state.preferences.browsePageLeftSidebarWidth);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>();
  const [currentCategory, setCurrentCategory] = useState<TagCategory>();
  const [originalCategory, setOriginalCategory] = useState<TagCategory>();

  const onEditClick = () => {
    setIsEditing(!isEditing);
  };

  const onDiscardClick = () => {
    setCurrentCategory(deepCopy(originalCategory));
    setIsEditing(false);
  };

  const onEditCategory = (category: Partial<TagCategory>) => {
    if (currentCategory) {
      const newCategory = { ...deepCopy(currentCategory), ...category };
      setCurrentCategory(newCategory);
    }
  };

  const onSaveCategory = async () => {
    setIsEditing(false);
    setOriginalCategory(deepCopy(currentCategory));
    if (currentCategory !== undefined) {
      // Update tag
      window.Shared.back.request(BackIn.SAVE_TAG_CATEGORY, currentCategory)
      .then(data => {
        if (data) {
          setCurrentCategory(data);
        }
      });
    }
  };

  const createNewCategory = () => {
    const name = 'New Category ' + tagCategories.reduce((big, cur) => {
      if (cur.id > big.id) {
        return cur;
      }
      return big;
    }).id;
    if (tagCategories.findIndex(t => t.name == name) == -1) {
      // Tag category shouldn't exist, safe to call
      const newCat: TagCategory = {
        id: -1,
        name,
        color: getRandomHexColor()
      };
      window.Shared.back.send(BackIn.SAVE_TAG_CATEGORY, newCat);
    }
  };

  const onCategorySelect = (categoryId: number | undefined) => {
    setSelectedCategoryId(categoryId);
    if (categoryId) {
      window.Shared.back.request(BackIn.GET_TAG_CATEGORY_BY_ID, categoryId)
      .then((data) => {
        if (data) {
          setCurrentCategory(data);
          setOriginalCategory(deepCopy(data));
        }
      });
    }
  };

  const deleteCurrentCategory = () => {
    if (selectedCategoryId) {
      console.log('DELETING');
      window.Shared.back.request(BackIn.DELETE_TAG_CATEGORY, selectedCategoryId)
      .then(success => {
        if (success) {
          setSelectedCategoryId(undefined);
          setCurrentCategory(undefined);
        }
      });
    }
  };

  const rowHeight = calcScale(20, 40, scale);

  return (
    <div className='tags-page'>
      <div className='tags-page__browser'>
        <div className='tags-browser__center'>
          <TagCategoriesList
            categories={tagCategories}
            rowHeight={rowHeight}
            onCategorySelect={onCategorySelect}
            selectedCategoryId={selectedCategoryId} />
          <SimpleButton
            className='tag-category__new-button'
            onClick={createNewCategory}
            value={strings.newCategory}/>
        </div>
        <ResizableSidebar
          show={currentCategory !== undefined}
          divider='after'
          width={browsePageLeftSidebarWidth} >
          <ConnectedRightTagCategoriesSidebar
            currentCategory={currentCategory}
            isEditing={isEditing}
            onEditCategory={onEditCategory}
            onEditClick={onEditClick}
            onDiscardClick={onDiscardClick}
            onDeleteCategory={deleteCurrentCategory}
            onSaveCategory={onSaveCategory} />
        </ResizableSidebar>
      </div>
    </div>
  );
}
