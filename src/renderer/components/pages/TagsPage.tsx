import { Tag } from '@database/entity/Tag';
import { ConnectedRightTagsSidebar } from '@renderer/containers/ConnectedRightTagsSidebar';
import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { TAGS } from '@renderer/interfaces';
import { findElementAncestor, gameScaleSpan } from '@renderer/Util';
import { BackIn, TagByIdData, TagByIdResponse, TagDeleteData, TagDeleteResponse, TagFindData, TagFindResponse, TagSaveData, TagSaveResponse } from '@shared/back/types';
import { deepCopy } from '@shared/Util';
import * as React from 'react';
import { ResizableSidebar } from '../ResizableSidebar';
import { TagList } from '../TagList';
import { TagListItem } from '../TagListItem';

type OwnProps = {
  tagScale: number;
}

export type TagsPageProps = OwnProps & WithTagCategoriesProps & WithPreferencesProps;

export type TagsPageState = {
  /** Currently selected tag ID */
  selectedTagId?: number;
  /** Whether we're editing a tag or not */
  isEditing: boolean;
  /** Current tag results */
  tags: TAGS;
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
      tags: [],
      tagsTotal: 0
    };
  }

  componentDidMount() {
    window.Shared.back.send<TagFindResponse, TagFindData>(BackIn.GET_TAGS, '', (res) => {
      if (res.data) {
        console.log(res.data);
        this.onTagsChange(res.data);
      }
    });
  }

  render() {
    const rowHeight = calcScale(40, this.props.tagScale);

    return (
      <div className='tags-page simple-scroll'>
        <div className='tags-page__browser'>
          <div className='tags-browser__center'>
            <TagList
              tags={this.state.tags}
              tagsTotal={this.state.tagsTotal}
              rowHeight={rowHeight}
              onTagSelect={this.onTagSelect}
              selectedTagId={this.state.selectedTagId}
              tagCategories={this.props.tagCategories} />
          </div>
          <ResizableSidebar
            hide={!!this.state.currentTag}
            divider='after'
            width={this.props.preferencesData.browsePageLeftSidebarWidth} >
            <ConnectedRightTagsSidebar
              currentTag={this.state.currentTag}
              isEditing={this.state.isEditing}
              onEditTag={this.onEditTag}
              onEditClick={this.onEditClick}
              onDiscardClick={this.onDiscardClick}
              onDeleteTag={this.deleteCurrentTag}
              onSaveTag={this.onSaveTag}
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
  }

  onTagsChange = (newTags: Tag[]) => {
    const tags = this.state.tags;
    for (let i = 0; i < newTags.length; i++) {
      tags[i] = newTags[i];
    }
    this.setState({ tags: tags, tagsTotal: newTags.length });
    this.forceUpdate();
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
      currentTag: deepCopy(this.state.originalTag),
      isEditing: false
    });
  }

  onEditTag = (tag: Partial<Tag>) => {
    if (this.state.currentTag) {
      const newTag = {...deepCopy(this.state.currentTag), ...tag};
      this.setState({currentTag: newTag});
    }
  }

  onSaveTag = async () => {
    this.setState({
      isEditing: false,
      originalTag: deepCopy(this.state.currentTag)
    });
    if (this.state.currentTag) {
      // Update tag
      window.Shared.back.send<TagSaveResponse, TagSaveData>(BackIn.SAVE_TAG, this.state.currentTag, (res) => {
        if (res.data) {
          const newTags = deepCopy(this.state.tags);
          for (let key in newTags) {
            const oldTag = newTags[key];
            if (oldTag && oldTag.id == res.data.id) {
              newTags[key] = res.data;
              break;
            }
          }
          this.setState({ tags: newTags, currentTag: res.data });
          window.Shared.back.send<any, any>(BackIn.CLEANUP_TAG_ALIASES, undefined);
        }
      });
    }
  }

  updateCurrentTag = (tagId: number) => {
    window.Shared.back.send<TagByIdResponse, TagByIdData>(BackIn.GET_TAG_BY_ID, tagId, (res) => {
      if (res.data) {
        this.setState({
          currentTag: res.data,
          originalTag: deepCopy(res.data)
        });
      }
    });
  }

  deleteCurrentTag = () => {
    if (this.state.selectedTagId) {
      console.log('DELETING');
      window.Shared.back.send<TagDeleteResponse, TagDeleteData>(BackIn.DELETE_TAG, this.state.selectedTagId, (res) => {
        if (res.data) {
          if (res.data.success) {
            const newTags = deepCopy(this.state.tags);
            for (let key in newTags) {
              const oldTag = newTags[key];
              if (oldTag && oldTag.id == res.data.id) {
                newTags[key] = undefined;
                break;
              }
            }
            this.setState({ tags: newTags, currentTag: undefined });
            window.Shared.back.send<any, any>(BackIn.CLEANUP_TAG_ALIASES, undefined);
          }
        }
      });
    }
  }
}

function calcScale(defHeight: number, scale: number): number {
  return (defHeight + (scale - 0.5) * 2 * defHeight * gameScaleSpan) | 0;
}