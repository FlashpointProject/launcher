import { ConnectedRightTagsSidebar } from '@renderer/containers/ConnectedRightTagsSidebar';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { BackIn } from '@shared/back/types';
import { calcScale, deepCopy } from '@shared/Util';
import { Tag } from 'flashpoint-launcher';
import * as React from 'react';
import { ResizableSidebar } from '../ResizableSidebar';
import { TagList } from '../TagList';

const categoryOrder = [
  'default',
  'genre',
  'theme',
  'meta',
  'presence',
  'warning',
  'copyright',
];

export function TagsPage() {
  const tagFilters = useAppSelector((state) => state.preferences.tagFilters);
  const scale = useAppSelector((state) => state.preferences.scaleValues.browse);
  const browsePageShowExtreme = useAppSelector((state) => state.preferences.browsePageShowExtreme);
  const browsePageLeftSidebarWidth = useAppSelector((state) => state.preferences.browsePageLeftSidebarWidth);
  const tagCategories = useAppSelector((state) => state.tagCategories);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [currentTag, setCurrentTag] = React.useState<Tag>();
  const [originalTag, setOriginalTag] = React.useState<Tag>();
  const [selectedTagId, setSelectedTagId] = React.useState<number>();
  const [isLocked, setIsLocked] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  const rowHeight = calcScale(30, scale);

  const updateCurrentTag = (tags: Tag[], tagId: number) => {
    window.Shared.back.request(BackIn.GET_TAG_BY_ID, tagId)
    .then((data) => {
      if (data) {
        console.log(data);
        const allTags = deepCopy(tags);
        const tagIndex = allTags.findIndex(t => t.id === tagId);
        if (tagIndex > -1) {
          allTags[tagIndex] = data;
        }
        setTags(allTags);
        setSelectedTagId(tagId);
        setCurrentTag(data);
        setOriginalTag(deepCopy(data));
      }
    });
  };

  const onTagSelect = (tagId: number | undefined) => {
    setSelectedTagId(tagId);
    if (tagId) {
      updateCurrentTag(tags, tagId);
    }
  };

  const onEditClick = () => {
    setIsEditing(!isEditing);
  };

  const onDiscardClick = () => {
    setCurrentTag(deepCopy(originalTag));
    setIsEditing(false);
  };

  const onEditTag = (tag: Partial<Tag>) => {
    if (currentTag) {
      const newTag = { ...deepCopy(currentTag), ...tag };
      setCurrentTag(newTag);
    }
  };

  const onSaveTag = async () => {
    setIsEditing(false);
    setOriginalTag(deepCopy(currentTag));
    if (currentTag) {
      // Update frontend early then send a request out to save to database
      const newTags = deepCopy(tags);
      const tagIdx = newTags.findIndex(t => t.id === currentTag.id);
      const oldTag = newTags[tagIdx];
      newTags[tagIdx] = currentTag;
      setTags(newTags);

      // Update tag
      window.Shared.back.request(BackIn.SAVE_TAG, currentTag)
      .catch((error) => {
        // Restore old tag if theres a failure
        newTags[tagIdx] = oldTag;
        setTags(newTags);
      });
    }
  };

  const onTagMerged = (tag: Tag) => {
    const newTags = deepCopy(tags);
    const newTagIndex = newTags.findIndex(t => t.id == selectedTagId);
    if (newTagIndex > -1) {
      newTags.splice(newTagIndex, 1);
    }
    setTags(newTags);
    updateCurrentTag(newTags, tag.id);
  };

  const onLockEdit = (locked: boolean) => {
    setIsLocked(locked);
  };

  const deleteCurrentTag = () => {
    if (selectedTagId !== undefined) {
      console.log('DELETING');
      const selectedTag = tags.find(t => t.id == selectedTagId);
      if (!selectedTag) {
        log.error('Launcher', 'Failed to delete tag, does not exist: ' + selectedTagId);
        return;
      }
      window.Shared.back.request(BackIn.DELETE_TAG, selectedTag.name)
      .then((data) => {
        const newTags = deepCopy(tags);
        const newTagIndex = newTags.findIndex(t => t.id == selectedTagId);
        if (newTagIndex > -1) {
          newTags.splice(newTagIndex, 1);
        }
        setTags(newTags);
        setCurrentTag(undefined);
      });
    }
  };

  React.useEffect(() => {
    window.Shared.back.request(BackIn.GET_TAGS, tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !browsePageShowExtreme)))
    .then((data) => {
      data.sort((a, b) => {
        const aCatOrder = a.category ? categoryOrder.indexOf(a.category) : 99999;
        const bCatOrder = b.category ? categoryOrder.indexOf(b.category) : 99999;

        if (aCatOrder === bCatOrder) {
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        } else {
          return aCatOrder - bCatOrder;
        }
      });
      if (data) { setTags(data); }
    });
  }, [browsePageShowExtreme, tagFilters]);

  return (
    <div className='tags-page'>
      <div className='tags-page__browser'>
        <div className='tags-browser__center'>
          <TagList
            tags={tags}
            tagsTotal={tags.length}
            rowHeight={rowHeight}
            onTagSelect={onTagSelect}
            selectedTagId={selectedTagId}
            tagCategories={tagCategories}
            isLocked={isLocked} />
        </div>
        <ResizableSidebar
          show={currentTag !== undefined}
          divider='after'
          width={browsePageLeftSidebarWidth} >
          <ConnectedRightTagsSidebar
            currentTag={currentTag}
            isEditing={isEditing && !isLocked}
            isLocked={isLocked}
            onEditTag={onEditTag}
            onEditClick={onEditClick}
            onDiscardClick={onDiscardClick}
            onDeleteTag={deleteCurrentTag}
            onSaveTag={onSaveTag}
            onSetTag={onTagMerged}
            onLockEdit={onLockEdit}
            tagCategories={tagCategories} />
        </ResizableSidebar>
      </div>
    </div>
  );
}
