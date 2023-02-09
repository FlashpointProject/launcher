import { Tag } from '@database/entity/Tag';
import { ConnectedRightTagsSidebar } from '@renderer/containers/ConnectedRightTagsSidebar';
import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { gameScaleSpan } from '@renderer/Util';
import { BackIn } from '@shared/back/types';
import { deepCopy } from '@shared/Util';
import * as React from 'react';
import { ResizableSidebar } from '../ResizableSidebar';
import { TagList } from '../TagList';

type OwnProps = {
}

export type TagsPageProps = OwnProps & WithTagCategoriesProps & WithPreferencesProps;

export type TagsPageState = {
  /** Currently selected tag ID */
  selectedTagId?: number;
  /** Whether we're editing a tag or not */
  isEditing: boolean;
  /** If changes are being made in the back, lock the page */
  isLocked: boolean;
  /** Current tag results */
  tags: Tag[];
  /** Original Tag */
  originalTag?: Tag;
  /** Current tag */
  currentTag?: Tag;
  /** Current total tag results  */
  tagsTotal: number;
}

export class TagsPage extends React.Component<TagsPageProps, TagsPageState> {

  constructor(props: TagsPageProps) {
    super(props);
    this.state = {
      isEditing: false,
      isLocked: false,
      tags: [],
      tagsTotal: 0
    };
  }

  componentDidMount() {
    window.Shared.back.request(BackIn.GET_TAGS, '', this.props.preferencesData.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !this.props.preferencesData.browsePageShowExtreme)))
    .then((data) => {
      if (data) { this.onTagsChange(data); }
    });
  }

  render() {
    const rowHeight = calcScale(40, this.props.preferencesData.browsePageGameScale);

    return (
      <div className='tags-page'>
        <div className='tags-page__browser'>
          <div className='tags-browser__center'>
            <TagList
              tags={this.state.tags}
              tagsTotal={this.state.tagsTotal}
              rowHeight={rowHeight}
              onTagSelect={this.onTagSelect}
              selectedTagId={this.state.selectedTagId}
              tagCategories={this.props.tagCategories}
              isLocked={this.state.isLocked} />
          </div>
          <ResizableSidebar
            hide={!!this.state.currentTag}
            divider='after'
            width={this.props.preferencesData.browsePageLeftSidebarWidth} >
            <ConnectedRightTagsSidebar
              currentTag={this.state.currentTag}
              isEditing={this.state.isEditing && !this.state.isLocked}
              isLocked={this.state.isLocked}
              onEditTag={this.onEditTag}
              onEditClick={this.onEditClick}
              onDiscardClick={this.onDiscardClick}
              onDeleteTag={this.deleteCurrentTag}
              onSaveTag={this.onSaveTag}
              onSetTag={this.onTagMerged}
              onLockEdit={this.onLockEdit}
              tagCategories={this.props.tagCategories} />
          </ResizableSidebar>
        </div>
      </div>
    );
  }

  onTagSelect = (tagId: number | undefined) => {
    this.setState({ selectedTagId: tagId });
    if (tagId) {
      this.updateCurrentTag(tagId);
    }
  };

  onTagsChange = (newTags: Tag[]) => {
    this.setState({ tags: newTags, tagsTotal: newTags.length });
    this.forceUpdate();
  };

  onEditClick = () => {
    this.setState({ isEditing: !this.state.isEditing });
  };

  onDiscardClick = () => {
    this.setState({
      currentTag: deepCopy(this.state.originalTag),
      isEditing: false
    });
  };

  onEditTag = (tag: Partial<Tag>) => {
    if (this.state.currentTag) {
      const newTag = {...deepCopy(this.state.currentTag), ...tag};
      this.setState({currentTag: newTag});
    }
  };

  onSaveTag = async () => {
    this.setState({
      isEditing: false,
      originalTag: deepCopy(this.state.currentTag)
    });
    if (this.state.currentTag) {
      // Update tag
      window.Shared.back.request(BackIn.SAVE_TAG, this.state.currentTag)
      .then((data) => {
        if (data) {
          const newTags = deepCopy(this.state.tags);
          for (const key in newTags) {
            const oldTag = newTags[key];
            if (oldTag && oldTag.id == data.id) {
              newTags[key] = data;
              break;
            }
          }
          this.setState({ tags: newTags, currentTag: data });
          window.Shared.back.send(BackIn.CLEANUP_TAG_ALIASES);
        }
      });
    }
  };

  onTagMerged = (tag: Tag) => {
    const newTags = deepCopy(this.state.tags);
    const newTagIndex = newTags.findIndex(t => t.id == this.state.selectedTagId);
    if (newTagIndex > -1) {
      newTags.splice(newTagIndex, 1);
    }
    this.setState({ tags: newTags }, () => {
      if (tag.id) { this.updateCurrentTag(tag.id); }
    });
  };

  onLockEdit = (locked: boolean) => {
    this.setState({ isLocked: locked });
  };

  updateCurrentTag = (tagId: number) => {
    window.Shared.back.request(BackIn.GET_TAG_BY_ID, tagId)
    .then((data) => {
      if (data) {
        const allTags = deepCopy(this.state.tags);
        const tagIndex = allTags.findIndex(t => t.id === tagId);
        if (tagIndex > -1) {
          allTags[tagIndex] = data;
        }
        this.setState({
          tags: allTags,
          selectedTagId: tagId,
          currentTag: data,
          originalTag: deepCopy(data)
        });
      }
    });
  };

  deleteCurrentTag = () => {
    if (this.state.selectedTagId) {
      console.log('DELETING');
      window.Shared.back.request(BackIn.DELETE_TAG, this.state.selectedTagId)
      .then((data) => {
        if (data && data.success) {
          const newTags = deepCopy(this.state.tags);
          const newTagIndex = newTags.findIndex(t => t.id == this.state.selectedTagId);
          if (newTagIndex > -1) {
            newTags.splice(newTagIndex, 1);
          }
          this.setState({ tags: newTags, currentTag: undefined });
          window.Shared.back.send(BackIn.CLEANUP_TAG_ALIASES);
        }
      });
    }
  };
}

function calcScale(defHeight: number, scale: number): number {
  return (defHeight + (scale - 0.5) * 2 * defHeight * gameScaleSpan) | 0;
}
